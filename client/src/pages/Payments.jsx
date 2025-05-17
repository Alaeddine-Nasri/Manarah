import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import StatsCard from '../components/StatsCard';
import Badge from '../components/Badge';
import DetailPanel from '../components/DetailPanel';
import SkeletonTable from '../components/SkeletonTable';
import EmptyState from '../components/EmptyState';
import TableRow from '../components/TableRow';
import { useToast } from '../context/ToastContext';
import useFlashRow from '../hooks/useFlashRow';
import { DollarSign, Plus, MoreHorizontal, Trash, TrendingUp, X, Download } from '../components/Icons';
import ConfirmModal from '../components/ConfirmModal';
import { exportPaymentsPdf, exportReceiptPdf } from '../api/export';
import { getPayments, getPaymentsSummary, getPreviewSplit, createPayment, deletePayment, consumeSession } from '../api/payments';
import { getStudents } from '../api/students';
import { getTeachers } from '../api/teachers';
import api from '../api/axios';

const TYPE_LABELS = {
  pack: 'type_pack',
  per_session: 'type_per_session',
  monthly: 'type_monthly',
  yearly: 'type_yearly',
  custom: 'type_custom',
};

const TYPE_VARIANTS = {
  pack: 'blue',
  per_session: 'gray',
  monthly: 'green',
  yearly: 'yellow',
  custom: 'orange',
};

const STATUS_VARIANTS = { current: 'green', due_soon: 'orange', overdue: 'red' };

function sessionProgress(p) {
  const paid = p.sessions_paid || 0;
  const total = p.sessions_count || 1;
  const remaining = p.remaining ?? (total - paid);
  const pct = Math.min(100, (paid / total) * 100);
  return { paid, total, pct, remaining };
}

const currentMonth = () => new Date().toISOString().slice(0, 7);

const emptyForm = {
  student_id: '', teacher_id: '', module_id: '',
  amount: '', type: 'pack', sessions_count: '4',
};

export default function Payments() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { success, error: toastError } = useToast();
  const [flashId, triggerFlash] = useFlashRow();

  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({ total_collected: 0, total_teacher: 0, total_school: 0 });

  const [filterMonth, setFilterMonth] = useState(currentMonth());
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [selected, setSelected] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [split, setSplit] = useState(null); // { teacher_amount, rate_per_session }
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [actionMenuId, setActionMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => { loadMeta(); }, []);

  useEffect(() => { loadPayments(); loadSummary(); }, [filterMonth, filterTeacher, filterStatus]);

  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setActionMenuId(null);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Recompute split preview when teacher / sessions_count / module changes
  useEffect(() => {
    if (!form.teacher_id) { setSplit(null); return; }
    const params = { teacher_id: form.teacher_id, sessions_count: form.sessions_count || 1 };
    if (form.module_id) params.module_id = form.module_id;
    getPreviewSplit(params)
      .then(r => setSplit(r.data))
      .catch(() => setSplit(null));
  }, [form.teacher_id, form.module_id, form.sessions_count]);

  async function loadMeta() {
    try {
      const [sRes, tRes, mRes] = await Promise.all([
        getStudents(),
        getTeachers(),
        api.get('/modules'),
      ]);
      setStudents(sRes.data || []);
      setTeachers(tRes.data || []);
      setModules(mRes.data || []);
    } catch { /* ignore */ }
  }

  async function loadPayments() {
    setLoading(true);
    try {
      const params = {};
      if (filterMonth)   params.month      = filterMonth;
      if (filterTeacher) params.teacher_id = filterTeacher;
      if (filterStatus)  params.status     = filterStatus;
      const res = await getPayments(params);
      setPayments(res.data || []);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadSummary() {
    if (!isAdmin) return;
    try {
      const res = await getPaymentsSummary(filterMonth || currentMonth());
      setSummary(res.data);
    } catch { /* ignore */ }
  }

  function openAdd() {
    setForm(emptyForm);
    setFormError('');
    setSplit(null);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.student_id || !form.amount) {
      setFormError(t('common.error'));
      return;
    }
    setSaving(true);
    try {
      const res = await createPayment({
        student_id:     Number(form.student_id),
        teacher_id:     form.teacher_id ? Number(form.teacher_id) : null,
        module_id:      form.module_id  ? Number(form.module_id)  : null,
        amount:         parseFloat(form.amount),
        type:           form.type,
        sessions_count: parseInt(form.sessions_count, 10) || 4,
      });
      setModalOpen(false);
      success(t('payments.add') + ' ✓');
      const savedId = res.data?.id;
      if (savedId) triggerFlash(savedId);
      await loadPayments();
      await loadSummary();
    } catch {
      setFormError(t('common.error'));
      toastError(t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    try {
      await deletePayment(id);
      if (selected?.id === id) setSelected(null);
      success(t('common.deleted'));
      await loadPayments();
      await loadSummary();
    } catch { toastError(t('common.error')); }
    setActionMenuId(null);
  }

  async function handleConsume(payment) {
    try {
      const res = await consumeSession(payment.id);
      setSelected(res.data);
      loadPayments();
    } catch { /* ignore */ }
  }

  // Modules filtered by selected teacher (if teacher has assignments data, otherwise show all)
  const teacherModules = form.teacher_id
    ? modules.filter(m => {
        const teacher = teachers.find(t => String(t.id) === String(form.teacher_id));
        if (!teacher || !teacher.assignments?.length) return true; // fallback: show all
        return teacher.assignments.some(a => a.module_id === m.id);
      })
    : modules;

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div className="breadcrumb">
            <span className="breadcrumb-current">{t('payments.title')}</span>
          </div>
          <div className="page-actions">
            <button className="btn btn-outline" onClick={() => exportPaymentsPdf({ month: filterMonth, teacher_id: filterTeacher || undefined, status: filterStatus || undefined })}>
              <Download size={15} /> {t('common.export_pdf')}
            </button>
            <button className="btn btn-primary" onClick={openAdd}>
              <Plus size={16} /> {t('payments.add')}
            </button>
          </div>
        </div>

        {/* Stats — admin only */}
        {isAdmin && (
          <div className="cards-row">
            <StatsCard icon={<DollarSign size={20} />} label={t('payments.total_revenue')} value={`${(summary.total_collected || 0).toFixed(0)} DA`} color="green" />
            <StatsCard icon={<TrendingUp size={20} />} label={t('payments.school_share')} value={`${(summary.total_school || 0).toFixed(0)} DA`} color="blue" />
            <StatsCard icon={<DollarSign size={20} />} label={t('payments.teacher_share')} value={`${(summary.total_teacher || 0).toFixed(0)} DA`} color="orange" />
          </div>
        )}

        {/* Filters */}
        <div className="filter-bar" style={{ marginBottom: 16 }}>
          <input
            type="month"
            className="form-input"
            style={{ width: 160 }}
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
          />
          <select
            className="form-input"
            style={{ width: 200 }}
            value={filterTeacher}
            onChange={e => setFilterTeacher(e.target.value)}
          >
            <option value="">{t('sessions.filter_teacher')}</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select
            className="form-input"
            style={{ width: 160 }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">{t('payments.filter_status')}</option>
            <option value="current">{t('payments.status_current')}</option>
            <option value="due_soon">{t('payments.status_due_soon')}</option>
            <option value="overdue">{t('payments.status_overdue')}</option>
          </select>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <div className="table-toolbar">
            <span className="table-title">{t('payments.title')}</span>
            <Badge variant="blue">{payments.length}</Badge>
          </div>
          {loading ? (
            <SkeletonTable rows={5} cols={9} />
          ) : payments.length === 0 ? (
            <EmptyState
              title={t('common.no_data')}
              sub={filterMonth || filterTeacher || filterStatus ? t('common.try_clear_filters') : t('payments.add')}
              action={t('payments.add')}
              onAction={openAdd}
            />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t('payments.student')}</th>
                  <th>{t('payments.teacher')}</th>
                  <th>{t('payments.module')}</th>
                  <th>{t('payments.amount')}</th>
                  <th>{t('payments.type')}</th>
                  <th>{t('payments.sessions')}</th>
                  <th>{t('payments.status')}</th>
                  <th>{t('common.created_at')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, idx) => {
                  const { paid, total, pct, remaining } = sessionProgress(p);
                  const status = p.status || 'current';
                  return (
                    <TableRow key={p.id} index={idx} flash={flashId === p.id} onClick={() => { setSelected(p); setPanelOpen(true); }}>
                      <td style={{ fontWeight: 500 }}>{p.student_name || '—'}</td>
                      <td className="text-muted">{p.teacher_name || '—'}</td>
                      <td className="text-muted">{p.module_name || '—'}</td>
                      <td style={{ fontWeight: 600 }}>{p.amount} DA</td>
                      <td>
                        <Badge variant={TYPE_VARIANTS[p.type] || 'gray'}>
                          {t(`payments.${TYPE_LABELS[p.type] || 'type_pack'}`)}
                        </Badge>
                      </td>
                      <td>
                        <div style={{ minWidth: 100 }}>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                            {paid}/{total} — {remaining} {t('payments.remaining')}
                          </div>
                          <div style={{ height: 5, background: 'var(--border-light)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--green)' : 'var(--primary)', borderRadius: 3, transition: 'width 0.4s' }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge variant={STATUS_VARIANTS[status] || 'gray'}>
                          {t(`payments.status_${status}`, { defaultValue: status })}
                        </Badge>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="row-actions">
                          <button
                            className="action-btn"
                            onClick={e => {
                              if (actionMenuId === p.id) { setActionMenuId(null); return; }
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                              setActionMenuId(p.id);
                            }}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        </div>
                      </td>
                    </TableRow>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Floating action menu */}
        {actionMenuId && (
          <div
            ref={menuRef}
            className="dropdown-menu"
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 100 }}
          >
            <button className="dropdown-item" onClick={() => { exportReceiptPdf(actionMenuId); setActionMenuId(null); }}>
              <Download size={14} /> {t('common.download_receipt')}
            </button>
            <button className="dropdown-item danger" onClick={() => { setDeleteTargetId(actionMenuId); setActionMenuId(null); }}>
              <Trash size={14} /> {t('common.delete')}
            </button>
          </div>
        )}
      </div>

      {/* Detail Panel */}
      <DetailPanel
        open={panelOpen}
        onToggle={() => setPanelOpen(v => !v)}
        title={t('payments.detail_title')}
        placeholder={
          <div className="panel-placeholder">
            <div className="panel-placeholder-icon">
              <DollarSign size={36} color="var(--text-light)" />
            </div>
            <p className="panel-placeholder-hint">{t('common.click_row_hint')}</p>
            {isAdmin && (
              <div className="panel-section" style={{ marginTop: 16 }}>
                <div className="panel-section-title">{filterMonth || t('payments.filter_month')}</div>
                <div className="panel-row">
                  <span className="panel-row-label">{t('payments.total_revenue')}</span>
                  <span className="panel-row-value">{(summary.total_collected || 0).toFixed(0)} DA</span>
                </div>
                <div className="panel-row">
                  <span className="panel-row-label">{t('payments.school_share')}</span>
                  <span className="panel-row-value">{(summary.total_school || 0).toFixed(0)} DA</span>
                </div>
                <div className="panel-row">
                  <span className="panel-row-label">{t('payments.teacher_share')}</span>
                  <span className="panel-row-value">{(summary.total_teacher || 0).toFixed(0)} DA</span>
                </div>
              </div>
            )}
          </div>
        }
      >
        {selected && (() => {
          const { paid, total, pct, remaining } = sessionProgress(selected);
          const status = selected.status || 'current';
          return (
            <>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                <Badge variant={TYPE_VARIANTS[selected.type] || 'gray'}>
                  {t(`payments.${TYPE_LABELS[selected.type] || 'type_pack'}`)}
                </Badge>
                <Badge variant={STATUS_VARIANTS[status] || 'gray'}>
                  {t(`payments.status_${status}`, { defaultValue: status })}
                </Badge>
              </div>

              <div className="panel-section">
                <div className="panel-section-title">{t('common.actions')}</div>
                <button
                  className="btn btn-primary btn-sm"
                  disabled={remaining === 0}
                  onClick={() => handleConsume(selected)}
                >
                  {t('payments.consume_session')}
                </button>
              </div>

              <div className="panel-section">
                <div className="panel-section-title">{t('payments.sessions')}</div>
                <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                  {paid}/{total} — {remaining} {t('payments.remaining')}
                </div>
                <div style={{ height: 8, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? 'var(--green)' : 'var(--primary)', borderRadius: 4 }} />
                </div>
              </div>

              <div className="panel-section">
                <div className="panel-section-title">{t('payments.detail_title')}</div>
                <div className="panel-row">
                  <span className="panel-row-label">{t('payments.student')}</span>
                  <span className="panel-row-value">{selected.student_name || '—'}</span>
                </div>
                <div className="panel-row">
                  <span className="panel-row-label">{t('payments.teacher')}</span>
                  <span className="panel-row-value">{selected.teacher_name || '—'}</span>
                </div>
                <div className="panel-row">
                  <span className="panel-row-label">{t('payments.module')}</span>
                  <span className="panel-row-value">{selected.module_name || '—'}</span>
                </div>
                <div className="panel-row">
                  <span className="panel-row-label">{t('payments.amount')}</span>
                  <span className="panel-row-value" style={{ fontWeight: 600 }}>{selected.amount} DA</span>
                </div>
                <div className="panel-row">
                  <span className="panel-row-label">{t('payments.school_share')}</span>
                  <span className="panel-row-value">{selected.school_amount ?? '—'} DA</span>
                </div>
                <div className="panel-row">
                  <span className="panel-row-label">{t('payments.teacher_share')}</span>
                  <span className="panel-row-value">{selected.teacher_amount ?? '—'} DA</span>
                </div>
                <div className="panel-row">
                  <span className="panel-row-label">{t('common.created_at')}</span>
                  <span className="panel-row-value">{selected.created_at ? new Date(selected.created_at).toLocaleDateString() : '—'}</span>
                </div>
              </div>
            </>
          );
        })()}
      </DetailPanel>

      {/* Delete confirmation */}
      {deleteTargetId && (
        <ConfirmModal
          message="Supprimer ce paiement ?"
          confirmLabel={t('common.delete')}
          onConfirm={() => { handleDelete(deleteTargetId); setDeleteTargetId(null); }}
          onCancel={() => setDeleteTargetId(null)}
        />
      )}

      {/* Add modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{t('payments.add')}</span>
              <button className="topbar-btn" onClick={() => setModalOpen(false)}><X size={16} /></button>
            </div>
            {formError && <div className="error-msg" style={{ marginBottom: 12 }}>{formError}</div>}

            <div className="form-group">
              <label className="form-label">{t('payments.student')}</label>
              <select className="form-input" value={form.student_id} onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))}>
                <option value="">{t('payments.select_student')}</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t('payments.teacher')}</label>
                <select
                  className="form-input"
                  value={form.teacher_id}
                  onChange={e => setForm(p => ({ ...p, teacher_id: e.target.value, module_id: '' }))}
                >
                  <option value="">{t('payments.select_teacher')}</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('payments.module')}</label>
                <select className="form-input" value={form.module_id} onChange={e => setForm(p => ({ ...p, module_id: e.target.value }))}>
                  <option value="">{t('payments.select_module')}</option>
                  {teacherModules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">{t('payments.type')}</label>
                <select className="form-input" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{t(`payments.${v}`)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{t('payments.sessions_count')}</label>
                <input
                  type="number"
                  className="form-input"
                  value={form.sessions_count}
                  onChange={e => setForm(p => ({ ...p, sessions_count: e.target.value }))}
                  min="1"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('payments.amount')} (DA)</label>
              <input
                type="number"
                className="form-input"
                value={form.amount}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                min="0"
                step="100"
              />
            </div>

            {/* Split preview */}
            {split && form.amount && (
              <div className="split-preview">
                <div className="split-preview-row">
                  <span>{t('payments.teacher_gets')}</span>
                  <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{split.teacher_amount.toFixed(0)} DA</span>
                </div>
                <div className="split-preview-row">
                  <span>{t('payments.school_keeps')}</span>
                  <span style={{ fontWeight: 600, color: 'var(--green)' }}>{Math.max(0, parseFloat(form.amount || 0) - split.teacher_amount).toFixed(0)} DA</span>
                </div>
                <div className="split-preview-note">
                  {t('payments.rate_per_session')}: {split.rate_per_session.toFixed(0)} DA
                </div>
              </div>
            )}

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</button>
              <button className={`btn btn-primary${saving ? ' btn-loading' : ''}`} onClick={handleSave} disabled={saving}>
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
