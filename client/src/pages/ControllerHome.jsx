import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import DetailPanel from '../components/DetailPanel';
import { Calendar, Students, QrCode, Check } from '../components/Icons';
import { getSessions } from '../api/sessions';
import { getStudents } from '../api/students';
import { getPayments } from '../api/payments';
import api from '../api/axios';

const PAYMENT_STATUS_VARIANTS = { current: 'green', due_soon: 'orange', overdue: 'red' };

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/* ── Card shell ─────────────────────────────────────── */
function HomeCard({ title, icon, children }) {
  return (
    <div className="ctrl-card">
      <div className="ctrl-card-header">
        {icon}
        <span className="ctrl-card-title">{title}</span>
      </div>
      <div className="ctrl-card-body">{children}</div>
    </div>
  );
}

/* ── Card 1: Planning (placeholder) ─────────────────── */
function PlanningCard({ t }) {
  return (
    <HomeCard title={t('controller.planning')} icon={<Calendar size={18} color="var(--text-muted)" />}>
      <div className="ctrl-placeholder">
        <Calendar size={40} color="var(--border)" />
        <p>{t('controller.coming_soon')}</p>
      </div>
    </HomeCard>
  );
}

/* ── Card 2: Students with sessions in next 2h ───────── */
function StudentsCard({ t }) {
  const [sessions, setSessions] = useState([]);
  const [filterSession, setFilterSession] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [studentPayments, setStudentPayments] = useState([]);

  useEffect(() => {
    const today = todayStr();
    getSessions({ date: today }).then(r => {
      const list = r.data || [];
      // sessions starting within next 2 hours
      const now = new Date();
      const upcoming = list.filter(s => {
        const [h, m] = (s.start_time || '00:00').split(':').map(Number);
        const start = new Date(today);
        start.setHours(h, m, 0, 0);
        const diff = (start - now) / 60000; // minutes
        return diff > -120 && diff < 120; // within ±2h
      });
      setSessions(upcoming);
      if (upcoming.length > 0) setFilterSession(String(upcoming[0].id));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!filterSession) { setStudents([]); return; }
    const session = sessions.find(s => String(s.id) === filterSession);
    if (!session?.group_id) { setStudents([]); return; }
    getStudents({ group_id: session.group_id, status: 'active' }).then(r => {
      setStudents(r.data || []);
    }).catch(() => setStudents([]));
  }, [filterSession, sessions]);

  async function openStudent(student) {
    setSelectedStudent(student);
    setPanelOpen(true);
    try {
      const res = await getPayments({ student_id: student.id });
      setStudentPayments(res.data || []);
    } catch { setStudentPayments([]); }
  }

  return (
    <>
      <HomeCard title={t('controller.students_card')} icon={<Students size={18} color="var(--primary)" />}>
        <select
          className="form-input"
          style={{ marginBottom: 12, fontSize: 13 }}
          value={filterSession}
          onChange={e => setFilterSession(e.target.value)}
        >
          <option value="">{t('controller.all_sessions')}</option>
          {sessions.map(s => (
            <option key={s.id} value={s.id}>
              {s.start_time?.slice(0, 5)} — {s.module_name || '?'} ({s.group_name || '?'})
            </option>
          ))}
        </select>

        {students.length === 0 ? (
          <div className="ctrl-empty">{t('common.no_data')}</div>
        ) : (
          <div className="ctrl-student-list">
            {students.map(s => {
              const pmts = [];
              const overdue = pmts.some(p => p.status === 'overdue');
              return (
                <button key={s.id} className="ctrl-student-row" onClick={() => openStudent(s)}>
                  <div className="ctrl-student-info">
                    <span className="ctrl-student-name">{s.name}</span>
                    <span className="ctrl-student-group">{s.group_name}</span>
                  </div>
                  {overdue && <Badge variant="red">!</Badge>}
                </button>
              );
            })}
          </div>
        )}
      </HomeCard>

      <DetailPanel open={panelOpen} onClose={() => setPanelOpen(false)} title={t('students.profile')}>
        {selectedStudent && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{selectedStudent.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selectedStudent.group_name}</div>
            </div>
            <div className="panel-section">
              <div className="panel-section-title">{t('nav.payments')}</div>
              {studentPayments.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('common.no_data')}</div>
              ) : studentPayments.map(p => (
                <div key={p.id} className="panel-row">
                  <span className="panel-row-label">{p.module_name}</span>
                  <Badge variant={PAYMENT_STATUS_VARIANTS[p.status] || 'gray'}>
                    {t(`payments.status_${p.status}`)}
                  </Badge>
                </div>
              ))}
            </div>
          </>
        )}
      </DetailPanel>
    </>
  );
}

/* ── Card 3: Last scan ──────────────────────────────── */
function LastScanCard({ t }) {
  const [scan, setScan] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);
  const timerRef = useRef(null);

  function poll() {
    api.get('/attendance/last-scan').then(r => {
      const s = r.data.scan;
      if (!s) return;
      // check if scan is within last 60s
      const age = (Date.now() - new Date(s.scanned_at)) / 1000;
      if (age < 60) {
        setScan(s);
        setElapsed(Math.floor(age));
      } else {
        setScan(null);
      }
    }).catch(() => {});
  }

  useEffect(() => {
    poll();
    intervalRef.current = setInterval(poll, 5000);
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        if (prev >= 59) { setScan(null); return 0; }
        return prev + 1;
      });
    }, 1000);
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(timerRef.current);
    };
  }, []);

  return (
    <HomeCard title={t('controller.last_scan')} icon={<QrCode size={18} color="var(--primary)" />}>
      {!scan ? (
        <div className="ctrl-placeholder">
          <QrCode size={40} color="var(--border)" />
          <p>{t('controller.waiting_scan')}</p>
        </div>
      ) : (
        <div className="ctrl-scan-result">
          <div className="ctrl-scan-avatar">
            {(scan.student_name?.[0] || '?').toUpperCase()}
          </div>
          <div className="ctrl-scan-name">{scan.student_name}</div>
          <Badge variant="green">
            <Check size={12} /> {t('attendance.present')}
          </Badge>
          <div className="ctrl-scan-time">
            {new Date(scan.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="ctrl-scan-fade" style={{ '--pct': `${((60 - elapsed) / 60) * 100}%` }} />
        </div>
      )}
    </HomeCard>
  );
}

/* ── Main page ──────────────────────────────────────── */
export default function ControllerHome() {
  const { t } = useTranslation();

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div className="breadcrumb">
            <span className="breadcrumb-current">{t('controller.title')}</span>
          </div>
        </div>

        <div className="ctrl-grid">
          <PlanningCard t={t} />
          <StudentsCard t={t} />
          <LastScanCard t={t} />
        </div>
      </div>
    </Layout>
  );
}
