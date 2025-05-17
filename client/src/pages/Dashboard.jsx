import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import { useTheme } from '../context/ThemeContext';
import { Users, Calendar, DollarSign, TrendingUp, BookOpen } from '../components/Icons';
import {
  getDashboardStats, getDashboardRevenue,
  getDashboardAttendance, getDashboardActivity,
} from '../api/dashboard';
import { loadDemoData } from '../api/demo';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const CDN_CHARTJS = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';

function loadChartJs(cb) {
  if (window.Chart) { cb(window.Chart); return; }
  const s = document.createElement('script');
  s.src = CDN_CHARTJS;
  s.onload = () => cb(window.Chart);
  document.head.appendChild(s);
}

function shortMonth(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString(undefined, { month: 'short' });
}

// ── Mini SVG Sparkline ─────────────────────────────────────────────────
function Sparkline({ data = [], color = '#4f6ef7', width = 80, height = 36 }) {
  if (data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const last = pts.split(' ').at(-1);
  const [lx, ly] = last.split(',');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display:'block', overflow:'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${pts} ${width},${height}`}
        fill={`url(#sg-${color.replace('#','')})`}
      />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="3" fill={color} />
    </svg>
  );
}

// ── Ring Gauge ─────────────────────────────────────────────────────────
function RingGauge({ pct = 0, color = '#4f6ef7', size = 88 }) {
  const r = 34, cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(100, pct) / 100 * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="7" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="7"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
      <text x={cx} y={cy - 4} dominantBaseline="middle" textAnchor="middle"
        style={{ fontSize: 14, fontWeight: 700, fill: 'var(--text)' }}>{pct}%</text>
      <text x={cx} y={cy + 12} dominantBaseline="middle" textAnchor="middle"
        style={{ fontSize: 9, fill: 'var(--text-muted)' }}>ce mois</text>
    </svg>
  );
}

// ── Trend pill ─────────────────────────────────────────────────────────
function Trend({ value }) {
  if (value == null) return null;
  const pos = value >= 0;
  return (
    <span className={`dash-trend${pos ? ' pos' : ' neg'}`}>
      {pos ? '▲' : '▼'} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

// ── Big stat card ──────────────────────────────────────────────────────
const BIG_CARD_COLORS = {
  blue:   { bg:'var(--primary-soft)', fg:'var(--primary)' },
  green:  { bg:'var(--green-soft)',   fg:'var(--green)' },
  orange: { bg:'var(--orange-soft)',  fg:'var(--orange)' },
  red:    { bg:'var(--red-soft)',     fg:'var(--red)' },
  purple: { bg:'rgba(124,58,237,0.1)', fg:'#7c3aed' },
  teal:   { bg:'rgba(13,148,136,0.1)', fg:'#0d9488' },
};

function BigCard({ icon, label, value, sub, color, trend, sparkData, sparkColor }) {
  const { bg, fg } = BIG_CARD_COLORS[color] || BIG_CARD_COLORS.blue;
  return (
    <div className="dash-bigcard">
      <div className="dash-bigcard-top">
        <div className="dash-bigcard-icon" style={{ background: bg, color: fg }}>{icon}</div>
        <Trend value={trend} />
      </div>
      <div className="dash-bigcard-value">{value}</div>
      <div className="dash-bigcard-label">{label}</div>
      {sub && <div className="dash-bigcard-sub">{sub}</div>}
      {sparkData?.length > 1 && (
        <div className="dash-bigcard-spark">
          <Sparkline data={sparkData} color={sparkColor || fg} width={90} height={32} />
        </div>
      )}
    </div>
  );
}

// ── Progress row (teachers/groups list) ───────────────────────────────
function ProgressRow({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="dash-progress-row">
      <div className="dash-progress-labels">
        <span className="dash-progress-name">
          <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:color, marginRight:6, flexShrink:0 }} />
          {label}
        </span>
        <span className="dash-progress-val">{value} séances</span>
      </div>
      <div className="dash-progress-track">
        <div className="dash-progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { success, error: toastError } = useToast();
  const [demoLoading, setDemoLoading] = useState(false);

  const [stats, setStats]       = useState(null);
  const [revenue, setRevenue]   = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [activity, setActivity] = useState({ payments: [], sessions: [] });
  const [loading, setLoading]   = useState(true);

  const revenueRef  = useRef(null);
  const attendRef   = useRef(null);
  const revenueChart  = useRef(null);
  const attendChart   = useRef(null);

  useEffect(() => {
    Promise.all([
      getDashboardStats().catch(() => ({ data: null })),
      getDashboardRevenue().catch(() => ({ data: [] })),
      getDashboardAttendance().catch(() => ({ data: [] })),
      getDashboardActivity().catch(() => ({ data: { payments: [], sessions: [] } })),
    ]).then(([s, r, a, act]) => {
      setStats(s.data);
      setRevenue(r.data || []);
      setAttendance(a.data || []);
      setActivity(act.data || { payments: [], sessions: [] });
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!revenue.length && !attendance.length) return;
    const cs = getComputedStyle(document.documentElement);
    const tickColor = cs.getPropertyValue('--text-muted').trim() || (theme === 'dark' ? '#9ca3af' : '#6b7280');
    loadChartJs((Chart) => {
      // Revenue bar chart
      if (revenue.length > 0 && revenueRef.current) {
        revenueChart.current?.destroy();
        const ctx = revenueRef.current.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 0, 220);
        grad.addColorStop(0, 'rgba(79,110,247,0.5)');
        grad.addColorStop(1, 'rgba(79,110,247,0.03)');
        revenueChart.current = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: revenue.map(r => shortMonth(r.month)),
            datasets: [{
              data: revenue.map(r => r.total),
              backgroundColor: grad,
              borderColor: '#4f6ef7',
              borderWidth: 0,
              borderRadius: 8,
              borderSkipped: false,
              hoverBackgroundColor: '#4f6ef7',
            }],
          },
          options: {
            animation: false,
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: {
              backgroundColor: 'var(--surface)', titleColor: 'var(--text)',
              bodyColor: 'var(--text-muted)', borderColor: 'var(--border)', borderWidth: 1,
              callbacks: { label: ctx => `${(ctx.raw/1000).toFixed(1)}k DA` },
            }},
            scales: {
              x: { grid: { display: false }, border: { display: false },
                   ticks: { color: tickColor, font: { size: 11 } } },
              y: { beginAtZero: true, border: { display: false },
                   grid: { display: false },
                   ticks: { color: tickColor, font: { size: 11 },
                            callback: v => `${(v/1000).toFixed(0)}k` } },
            },
          },
        });
      }

      // Attendance line chart
      if (attendance.length > 0 && attendRef.current) {
        attendChart.current?.destroy();
        const ctx2 = attendRef.current.getContext('2d');
        const grad2 = ctx2.createLinearGradient(0, 0, 0, 200);
        grad2.addColorStop(0, 'rgba(16,185,129,0.3)');
        grad2.addColorStop(1, 'rgba(16,185,129,0.0)');
        attendChart.current = new Chart(ctx2, {
          type: 'line',
          data: {
            labels: attendance.map(a => shortMonth(a.month)),
            datasets: [{
              data: attendance.map(a => a.rate),
              borderColor: '#10b981',
              backgroundColor: grad2,
              tension: 0.45, fill: true,
              pointBackgroundColor: '#fff',
              pointBorderColor: '#10b981',
              pointBorderWidth: 2,
              pointRadius: 4,
              pointHoverRadius: 6,
            }],
          },
          options: {
            animation: false,
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: {
              backgroundColor: 'var(--surface)', titleColor: 'var(--text)',
              bodyColor: 'var(--text-muted)', borderColor: 'var(--border)', borderWidth: 1,
              callbacks: { label: ctx => `${ctx.raw}%` },
            }},
            scales: {
              x: { grid: { display: false }, border: { display: false },
                   ticks: { color: tickColor, font: { size: 11 } } },
              y: { beginAtZero: true, max: 100, border: { display: false },
                   grid: { display: false },
                   ticks: { color: tickColor, font: { size: 11 },
                            callback: v => `${v}%` } },
            },
          },
        });
      }
    });
    return () => { revenueChart.current?.destroy(); attendChart.current?.destroy(); };
  }, [revenue, attendance, theme]);

  const fmt    = n => (n ?? 0).toLocaleString();
  const fmtDA  = n => `${fmt(n)} DA`;
  const fmtDate = iso => iso ? new Date(iso).toLocaleDateString(undefined, { day:'numeric', month:'short' }) : '—';

  // Compute trends from revenue array
  const revTrend = revenue.length >= 2
    ? (() => {
        const last = revenue.at(-1).total, prev = revenue.at(-2).total;
        return prev > 0 ? ((last - prev) / prev * 100) : null;
      })() : null;
  const attTrend = attendance.length >= 2
    ? (() => {
        const last = attendance.at(-1).rate, prev = attendance.at(-2).rate;
        return prev > 0 ? (last - prev) : null;
      })() : null;

  const revSparkData = revenue.map(r => r.total);
  const attSparkData = attendance.map(a => a.rate);

  const teacherColors = ['#4f6ef7','#10b981','#f59e0b','#ef4444'];

  // Teacher session counts from recent activity
  const { topTeachers, maxCount } = useMemo(() => {
    const counts = {};
    activity.sessions.forEach(s => {
      counts[s.teacher_name] = (counts[s.teacher_name] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return { topTeachers: top, maxCount: top[0]?.[1] || 1 };
  }, [activity.sessions]);

  async function handleLoadDemo() {
    setDemoLoading(true);
    try {
      await loadDemoData();
      success('Données de démonstration chargées avec succès');
      const [s, r, a, act] = await Promise.all([
        getDashboardStats().catch(() => ({ data: null })),
        getDashboardRevenue().catch(() => ({ data: [] })),
        getDashboardAttendance().catch(() => ({ data: [] })),
        getDashboardActivity().catch(() => ({ data: { payments: [], sessions: [] } })),
      ]);
      setStats(s.data);
      setRevenue(r.data || []);
      setAttendance(a.data || []);
      setActivity(act.data || { payments: [], sessions: [] });
    } catch { toastError('Erreur lors du chargement des données'); }
    finally { setDemoLoading(false); }
  }

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div className="breadcrumb">
            <span className="breadcrumb-current">{t('nav.dashboard')}</span>
          </div>
          {user?.role === 'admin' && (
            <div className="page-actions">
              <button className={`btn btn-ghost btn-sm${demoLoading ? ' btn-loading' : ''}`}
                onClick={handleLoadDemo} disabled={demoLoading}>
                {demoLoading ? '' : 'Charger données démo'}
              </button>
            </div>
          )}
        </div>

        {/* ── Top stat cards ── */}
        <div className="dash-top-cards">
          <BigCard
            icon={<Users size={18} />} color="blue"
            label={t('dashboard.total_students')}
            value={loading ? '…' : fmt(stats?.total_students)}
            sub={`${fmt(stats?.active_students ?? 0)} actifs`}
            trend={null}
          />
          <BigCard
            icon={<BookOpen size={18} />} color="purple"
            label={t('dashboard.total_teachers')}
            value={loading ? '…' : fmt(stats?.total_teachers)}
          />
          <BigCard
            icon={<Calendar size={18} />} color="orange"
            label={t('dashboard.sessions_today')}
            value={loading ? '…' : fmt(stats?.sessions_today)}
            sub={`${fmt(stats?.pending_payments ?? 0)} paiements en attente`}
          />
          <BigCard
            icon={<TrendingUp size={18} />} color="green"
            label={t('dashboard.monthly_revenue')}
            value={loading ? '…' : fmtDA(stats?.revenue_this_month)}
            trend={revTrend}
            sparkData={revSparkData}
            sparkColor="#10b981"
          />
        </div>

        {/* ── Main bento row ── */}
        <div className="dash-bento">

          {/* Revenue chart */}
          <div className="dash-card dash-card-chart">
            <div className="dash-card-header">
              <div>
                <div className="dash-card-title">{t('dashboard.revenue_chart')}</div>
                <div className="dash-card-sub">Derniers {revenue.length} mois</div>
              </div>
              <Trend value={revTrend} />
            </div>
            <div className="dash-chart-area">
              {revenue.length === 0 && !loading
                ? <div className="table-empty">{t('common.no_data')}</div>
                : <canvas ref={revenueRef} />}
            </div>
          </div>

          {/* Attendance gauge */}
          <div className="dash-card dash-card-gauge">
            <div className="dash-card-header">
              <div>
                <div className="dash-card-title">{t('dashboard.attendance_rate')}</div>
                <div className="dash-card-sub">Ce mois</div>
              </div>
              <Trend value={attTrend} />
            </div>
            <div style={{ display:'flex', justifyContent:'center', padding:'12px 0' }}>
              <RingGauge pct={stats?.attendance_rate_this_month ?? 0} color="#10b981" />
            </div>
            <div className="dash-card-chart-wrap">
              <div style={{ height: 90, position:'relative' }}>
                {attSparkData.length > 1 && !loading && (
                  <canvas ref={attendRef} />
                )}
              </div>
            </div>
          </div>

          {/* Top teachers */}
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-title">Activité enseignants</div>
            </div>
            {topTeachers.length === 0 ? (
              <div className="table-empty" style={{ padding:'24px 0', fontSize:13 }}>{t('common.no_data')}</div>
            ) : (
              <div style={{ padding:'4px 0' }}>
                {topTeachers.map(([name, count], i) => (
                  <ProgressRow key={name} label={name} value={count} max={maxCount} color={teacherColors[i]} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Activity tables ── */}
        <div className="dash-activity">
          {/* Recent payments */}
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-title">{t('dashboard.recent_payments')}</div>
            </div>
            {activity.payments.length === 0 ? (
              <div className="table-empty">{t('common.no_data')}</div>
            ) : (
              <div className="dash-list">
                {activity.payments.map(p => (
                  <div key={p.id} className="dash-list-row">
                    <div className="dash-list-avatar" style={{ background:'var(--green-soft)', color:'var(--green)' }}>
                      <DollarSign size={14} />
                    </div>
                    <div className="dash-list-info">
                      <div className="dash-list-name">{p.student_name}</div>
                      <div className="dash-list-sub">{p.module_name || '—'}</div>
                    </div>
                    <div className="dash-list-right">
                      <div className="dash-list-amount">{fmtDA(p.amount)}</div>
                      <div className="dash-list-date">{fmtDate(p.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent sessions */}
          <div className="dash-card">
            <div className="dash-card-header">
              <div className="dash-card-title">{t('dashboard.recent_sessions')}</div>
            </div>
            {activity.sessions.length === 0 ? (
              <div className="table-empty">{t('common.no_data')}</div>
            ) : (
              <div className="dash-list">
                {activity.sessions.map((s, i) => (
                  <div key={s.id} className="dash-list-row">
                    <div className="dash-list-avatar"
                      style={{ background: `${teacherColors[i % 4]}22`, color: teacherColors[i % 4] }}>
                      <Calendar size={14} />
                    </div>
                    <div className="dash-list-info">
                      <div className="dash-list-name">{s.teacher_name}</div>
                      <div className="dash-list-sub">{s.module_name} · {s.group_name}</div>
                    </div>
                    <div className="dash-list-right">
                      <div className="dash-list-date">{fmtDate(s.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
