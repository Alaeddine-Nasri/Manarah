import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import StatsCard from '../components/StatsCard';
import Badge from '../components/Badge';
import SkeletonTable from '../components/SkeletonTable';
import { Calendar, DollarSign, Clock } from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getTeacherSessions, getTeacherPayments, getTeacherSummary } from '../api/teacherPortal';
import { exportPaymentsPdf } from '../api/export';
import { changePassword } from '../api/auth';

function fmtDA(n) { return `${(n ?? 0).toLocaleString()} DA`; }
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const TABS = ['sessions', 'payments', 'past', 'info'];

export default function TeacherPortal() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [tab, setTab] = useState('sessions');

  // data
  const [summary, setSummary]   = useState(null);
  const [sessions, setSessions] = useState([]);
  const [payments, setPayments] = useState([]);
  const [payTotal, setPayTotal] = useState(0);
  const [loading, setLoading]   = useState(true);
  const [exporting, setExporting] = useState(false);

  const [payLimit, setPayLimit] = useState(20);

  // password form
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getTeacherSummary().catch(() => ({ data: null })),
      getTeacherSessions().catch(() => ({ data: [] })),
      getTeacherPayments().catch(() => ({ data: { payments: [], total: 0 } })),
    ]).then(([s, sess, pay]) => {
      setSummary(s.data);
      setSessions(sess.data || []);
      const payData = pay.data || {};
      setPayments(payData.payments || []);
      setPayTotal(payData.total || 0);
    }).finally(() => setLoading(false));
  }, []);

  const upcomingSessions = sessions.filter(s => s.date >= today);
  const pastSessions     = [...sessions.filter(s => s.date < today)].reverse();

  async function handleExport() {
    setExporting(true);
    try { await exportPaymentsPdf(); } catch { /* ignore */ } finally { setExporting(false); }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError('');
    setPwSuccess(false);
    if (pwForm.next !== pwForm.confirm) { setPwError('Les mots de passe ne correspondent pas'); return; }
    if (pwForm.next.length < 6) { setPwError('Minimum 6 caractères'); return; }
    setPwSaving(true);
    try {
      await changePassword(pwForm.current, pwForm.next);
      setPwSuccess(true);
      setPwForm({ current: '', next: '', confirm: '' });
      success('Mot de passe modifié avec succès');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erreur';
      setPwError(msg);
      toastError(msg);
    } finally { setPwSaving(false); }
  }

  function paymentStatusVariant(p) {
    const remaining = (p.sessions_count || 0) - (p.sessions_paid || 0);
    if (remaining <= 0) return 'red';
    if (remaining <= 2) return 'yellow';
    return 'green';
  }

  const SessionRow = ({ s, past }) => (
    <tr>
      <td style={{ fontWeight: past ? 400 : 500, color: past ? 'var(--text-muted)' : undefined, fontSize: past ? 13 : undefined }}>{s.date}</td>
      <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={14} color="var(--text-light)" />
          {s.start_time?.slice(0, 5)} – {s.end_time?.slice(0, 5)}
        </div>
      </td>
      <td>{s.module_name || '—'}</td>
      <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
        {s.level_name} › {s.year_name} › {s.group_name}
      </td>
      {!past && (
        <td>
          <Badge variant={s.attendance_open ? 'green' : 'gray'}>
            {s.attendance_open ? t('sessions.attendance_open') : t('sessions.attendance_closed')}
          </Badge>
        </td>
      )}
    </tr>
  );

  return (
    <Layout>
      <div className="page">
        {/* Header */}
        <div className="page-header">
          <div className="breadcrumb">
            <span className="breadcrumb-current">
              {user?.name} — {t('teacher_portal.title')}
            </span>
          </div>
          <div className="page-actions">
            <button
              className={`btn btn-ghost btn-sm${exporting ? ' btn-loading' : ''}`}
              onClick={handleExport}
              disabled={exporting}
            >
              {exporting ? t('common.loading') : t('common.export_pdf')}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="cards-row">
          <StatsCard
            icon={<Calendar size={20} />}
            label={t('teacher_portal.upcoming_count')}
            value={loading ? '…' : summary?.upcoming_sessions ?? 0}
            color="blue"
          />
          <StatsCard
            icon={<DollarSign size={20} />}
            label={t('teacher_portal.month_earnings')}
            value={loading ? '…' : fmtDA(summary?.month_earnings)}
            color="green"
          />
          <StatsCard
            icon={<DollarSign size={20} />}
            label={t('teacher_portal.last_month_earnings')}
            value={loading ? '…' : fmtDA(summary?.last_month_earnings)}
            color="yellow"
          />
          <StatsCard
            icon={<DollarSign size={20} />}
            label={t('teacher_portal.total_earnings')}
            value={loading ? '…' : fmtDA(summary?.total_earnings)}
            color="purple"
          />
        </div>

        {/* Tabs */}
        <div className="tab-bar" style={{ marginBottom: 20 }}>
          <button className={`tab-btn${tab === 'sessions' ? ' active' : ''}`} onClick={() => setTab('sessions')}>
            Accueil
            {!loading && upcomingSessions.length > 0 && <Badge variant="blue">{upcomingSessions.length}</Badge>}
          </button>
          <button className={`tab-btn${tab === 'payments' ? ' active' : ''}`} onClick={() => setTab('payments')}>
            {t('teacher_portal.my_payments')}
            {!loading && payments.length > 0 && <Badge variant="green">{payments.length}</Badge>}
          </button>
          <button className={`tab-btn${tab === 'past' ? ' active' : ''}`} onClick={() => setTab('past')}>
            {t('teacher_portal.past')}
            {!loading && pastSessions.length > 0 && <Badge variant="gray">{pastSessions.length}</Badge>}
          </button>
          <button className={`tab-btn${tab === 'info' ? ' active' : ''}`} onClick={() => setTab('info')}>
            {t('teacher_portal.info_tab')}
          </button>
        </div>

        {/* ── Tab: Upcoming sessions ── */}
        {tab === 'sessions' && (
          <div className="table-wrap">
            <div className="table-toolbar">
              <span className="table-title">{t('teacher_portal.upcoming')}</span>
              <Badge variant="blue">{upcomingSessions.length}</Badge>
            </div>
            {loading ? (
              <SkeletonTable rows={4} cols={5} />
            ) : upcomingSessions.length === 0 ? (
              <div className="table-empty">{t('common.no_data')}</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>{t('sessions.date')}</th>
                    <th>{t('sessions.time')}</th>
                    <th>{t('sessions.module')}</th>
                    <th>{t('sessions.group')}</th>
                    <th>{t('attendance.title')}</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingSessions.slice(0, 30).map(s => (
                    <SessionRow key={s.id} s={s} past={false} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Tab: Payments ── */}
        {tab === 'payments' && (
          <div className="table-wrap">
            <div className="table-toolbar">
              <span className="table-title">{t('teacher_portal.my_payments')}</span>
              <Badge variant="green">{fmtDA(payTotal)}</Badge>
            </div>
            {loading ? (
              <SkeletonTable rows={6} cols={6} />
            ) : payments.length === 0 ? (
              <div className="table-empty">{t('common.no_data')}</div>
            ) : (
              <>
                <table>
                  <thead>
                    <tr>
                      <th>{t('payments.student')}</th>
                      <th>{t('payments.module')}</th>
                      <th>{t('payments.amount')}</th>
                      <th>{t('payments.teacher_share')}</th>
                      <th>{t('payments.sessions')}</th>
                      <th>{t('common.created_at')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.slice(0, payLimit).map(p => (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 500 }}>{p.student_name}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{p.module_name || '—'}</td>
                        <td><Badge variant="blue">{fmtDA(p.amount)}</Badge></td>
                        <td><Badge variant="green">{fmtDA(p.teacher_amount)}</Badge></td>
                        <td>
                          <Badge variant={paymentStatusVariant(p)}>
                            {p.sessions_paid || 0}/{p.sessions_count || 0}
                          </Badge>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDate(p.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {payments.length > payLimit && (
                  <div style={{ textAlign: 'center', padding: '12px 0' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => setPayLimit(l => l + 20)}>
                      Charger plus ({payments.length - payLimit} restants)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Tab: Past sessions ── */}
        {tab === 'past' && (
          <div className="table-wrap">
            <div className="table-toolbar">
              <span className="table-title">{t('teacher_portal.past')}</span>
              <Badge variant="gray">{pastSessions.length}</Badge>
            </div>
            {loading ? (
              <SkeletonTable rows={4} cols={4} />
            ) : pastSessions.length === 0 ? (
              <div className="table-empty">{t('common.no_data')}</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>{t('sessions.date')}</th>
                    <th>{t('sessions.time')}</th>
                    <th>{t('sessions.module')}</th>
                    <th>{t('sessions.group')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pastSessions.map(s => (
                    <SessionRow key={s.id} s={s} past={true} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── Tab: Info + change password ── */}
        {tab === 'info' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Profile info */}
            <div className="table-wrap">
              <div className="table-toolbar">
                <span className="table-title">{t('teacher_portal.my_profile')}</span>
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div className="student-avatar" style={{ width: 48, height: 48, fontSize: 20, flexShrink: 0 }}>
                    {user?.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{user?.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.email}</div>
                    <div style={{ marginTop: 4 }}>
                      <Badge variant="purple">Enseignant</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Change password */}
            <div className="table-wrap" style={{ maxWidth: 480 }}>
              <div className="table-toolbar">
                <span className="table-title">Changer le mot de passe</span>
              </div>
              <form onSubmit={handleChangePassword} style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {pwError && <div className="error-msg">{pwError}</div>}
                {pwSuccess && (
                  <div style={{ color: 'var(--green)', fontSize: 13, background: 'rgba(34,197,94,.1)', padding: '8px 12px', borderRadius: 6 }}>
                    Mot de passe modifié avec succès.
                  </div>
                )}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Mot de passe actuel</label>
                  <input type="password" className="form-input" required
                    value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Nouveau mot de passe</label>
                  <input type="password" className="form-input" required minLength={6}
                    value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Confirmer le nouveau mot de passe</label>
                  <input type="password" className="form-input" required
                    value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
                </div>
                <div>
                  <button type="submit" className={`btn btn-primary${pwSaving ? ' btn-loading' : ''}`} disabled={pwSaving}>
                    {pwSaving ? '' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
