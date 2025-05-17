import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import StatsCard from '../components/StatsCard';
import Badge from '../components/Badge';
import DetailPanel from '../components/DetailPanel';
import SkeletonTable from '../components/SkeletonTable';
import EmptyState from '../components/EmptyState';
import TableRow from '../components/TableRow';
import { useToast } from '../context/ToastContext';
import useFlashRow from '../hooks/useFlashRow';
import { Users, Plus, Edit, Trash, MoreHorizontal, X, DollarSign, Percent } from '../components/Icons';
import ConfirmModal from '../components/ConfirmModal';
import {
  getTeachers, createTeacher, updateTeacher, deleteTeacher,
  getTeacherAccount, createTeacherAccount, resetTeacherPassword,
} from '../api/teachers';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const emptyForm = {
  name: '', email: '', phone: '', revenue_percentage: 70,
};

export default function Teachers() {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const [flashId, triggerFlash] = useFlashRow();

  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const actionMenuRef = useRef(null);

  // teacher account section
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null); // { account, teacher_email }
  const [accountLoading, setAccountLoading] = useState(false);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    function handleClick(e) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) setActionMenuId(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await getTeachers();
      setTeachers(res.data || []);
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }

  const totalModules = teachers.reduce((sum, t) => sum + (t.assignments?.length || 0), 0);

  function openAdd() {
    setEditTarget(null); setForm(emptyForm); setFormError(''); setModalOpen(true);
  }

  function openEdit(teacher) {
    setEditTarget(teacher);
    setForm({
      name: teacher.name || '',
      email: teacher.email || '',
      phone: teacher.phone || '',
      revenue_percentage: teacher.revenue_percentage ?? 70,
    });
    setFormError(''); setModalOpen(true); setActionMenuId(null);
  }

  async function openPanel(teacher) {
    setSelected(teacher);
    setSelectedAccount(null);
    setAccountLoading(true);
    try {
      const res = await getTeacherAccount(teacher.id);
      setSelectedAccount(res.data);
    } catch { setSelectedAccount(null); }
    finally { setAccountLoading(false); }
  }

  async function handleCreateAccount(teacher) {
    try {
      await createTeacherAccount(teacher.id);
      success('Compte créé — mot de passe: teacher123');
      const res = await getTeacherAccount(teacher.id);
      setSelectedAccount(res.data);
    } catch (e) { toastError(e?.response?.data?.message || t('common.error')); }
  }

  async function handleResetPassword(teacher) {
    try {
      await resetTeacherPassword(teacher.id);
      success('Mot de passe réinitialisé à "teacher123"');
    } catch { toastError(t('common.error')); }
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError(t('common.error')); return; }
    setSaving(true);
    try {
      const payload = { ...form, revenue_percentage: Number(form.revenue_percentage) };
      let savedId;
      if (editTarget) {
        await updateTeacher(editTarget.id, payload);
        savedId = editTarget.id;
      } else {
        const res = await createTeacher(payload);
        savedId = res.data?.id;
      }
      setModalOpen(false);
      success(editTarget ? t('common.saved') : t('teachers.add') + ' ✓');
      if (savedId) triggerFlash(savedId);
      await loadData();
    } catch {
      setFormError(t('common.error'));
      toastError(t('common.error'));
    }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    try {
      await deleteTeacher(id);
      setDeleteTarget(null);
      if (selected?.id === id) setSelected(null);
      success(t('common.deleted'));
      await loadData();
    } catch { toastError(t('common.error')); }
  }

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div className="breadcrumb">
            <span className="breadcrumb-current">{t('teachers.title')}</span>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} /> {t('teachers.add')}
          </button>
        </div>

        <div className="cards-row">
          <StatsCard icon={<Users size={20} />} label={t('teachers.total')} value={teachers.length} color="blue" />
          <StatsCard icon={<DollarSign size={20} />} label={t('teachers.modules_count')} value={totalModules} color="green" />
        </div>

        <div className="table-wrap">
          <div className="table-toolbar">
            <span className="table-title">{t('teachers.title')}</span>
          </div>
          {loading ? (
            <SkeletonTable rows={4} cols={6} />
          ) : teachers.length === 0 ? (
            <EmptyState
              title={t('common.no_data')}
              sub={t('teachers.add_first')}
              action={t('teachers.add')}
              onAction={openAdd}
            />
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ maxWidth: 160 }}>{t('teachers.name')}</th>
                  <th>{t('teachers.email')}</th>
                  <th>{t('teachers.phone')}</th>
                  <th>{t('teachers.revenue_pct')}</th>
                  <th>{t('teachers.modules_count')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher, idx) => (
                  <TableRow key={teacher.id} index={idx} flash={flashId === teacher.id} onClick={() => openPanel(teacher)}>
                    <td style={{ maxWidth: 160 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                          background: 'var(--green-soft)', color: 'var(--green)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: 12,
                        }}>
                          {getInitials(teacher.name)}
                        </div>
                        <span style={{ fontWeight: 500, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {teacher.name}
                        </span>
                      </div>
                    </td>
                    <td className="text-muted" style={{ fontSize: 13 }}>{teacher.email || '—'}</td>
                    <td className="text-muted" style={{ fontSize: 13 }}>{teacher.phone || '—'}</td>
                    <td>
                      <Badge variant="blue">{teacher.revenue_percentage ?? 70}%</Badge>
                    </td>
                    <td>
                      {teacher.assignments?.length > 0
                        ? <Badge variant="blue">{teacher.assignments.length}</Badge>
                        : <Badge variant="gray">0</Badge>
                      }
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="row-actions" ref={actionMenuId === teacher.id ? actionMenuRef : null}>
                        <button
                          className="action-btn"
                          onClick={e => {
                            if (actionMenuId === teacher.id) { setActionMenuId(null); return; }
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                            setActionMenuId(teacher.id);
                          }}
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {actionMenuId === teacher.id && (
                          <div className="dropdown-menu" style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}>
                            <button className="dropdown-item" onClick={() => openEdit(teacher)}>
                              <Edit size={14} /> {t('common.edit')}
                            </button>
                            <div className="dropdown-divider" />
                            <button className="dropdown-item danger" onClick={() => { setDeleteTarget(teacher); setActionMenuId(null); }}>
                              <Trash size={14} /> {t('common.delete')}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </TableRow>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail panel */}
      <DetailPanel
        open={panelOpen}
        onToggle={() => setPanelOpen(v => !v)}
        title={t('teachers.profile')}
        placeholder={
          <div className="panel-placeholder">
            <div className="panel-placeholder-icon">
              <Users size={36} color="var(--text-light)" />
            </div>
            <p className="panel-placeholder-hint">{t('common.click_row_hint')}</p>
            <div className="panel-section" style={{ marginTop: 16 }}>
              <div className="panel-section-title">{t('teachers.title')}</div>
              <div className="panel-row">
                <span className="panel-row-label">{t('teachers.total')}</span>
                <span className="panel-row-value">{teachers.length}</span>
              </div>
              <div className="panel-row">
                <span className="panel-row-label">{t('teachers.modules_count')}</span>
                <span className="panel-row-value">{totalModules}</span>
              </div>
            </div>
          </div>
        }
      >
        {selected && (
          <>
            <div className="panel-avatar" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>
              {getInitials(selected.name)}
            </div>
            <div className="panel-name">{selected.name}</div>
            <div className="panel-sub">{selected.email}</div>

            <div className="panel-section">
              <div className="panel-section-title">{t('common.actions')}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(selected)}>
                  <Edit size={14} /> {t('teachers.edit')}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(selected)}>
                  <Trash size={14} /> {t('teachers.delete')}
                </button>
              </div>
            </div>

            <div className="panel-section">
              <div className="panel-section-title">{t('teachers.profile')}</div>
              {[
                { label: t('teachers.phone'), value: selected.phone || '—' },
                { label: t('teachers.revenue_pct'), value: `${selected.revenue_percentage ?? 70}%` },
              ].map(({ label, value }) => (
                <div className="panel-row" key={label}>
                  <span className="panel-row-label">{label}</span>
                  <span className="panel-row-value">{value}</span>
                </div>
              ))}
            </div>

            {selected.assignments?.length > 0 && (
              <div className="panel-section">
                <div className="panel-section-title">{t('teachers.assignments')}</div>
                {selected.assignments.map((a, i) => (
                  <div className="panel-row" key={i}>
                    <span className="panel-row-label">{a.module_name || a.module?.name}</span>
                    <span className="panel-row-value">
                      {a.level_name || a.level?.name}{a.year_name ? ` · ${a.year_name}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {selected.rate_overrides?.length > 0 && (
              <div className="panel-section">
                <div className="panel-section-title">{t('teachers.rate_overrides')}</div>
                {selected.rate_overrides.map((r, i) => (
                  <div className="panel-row" key={i}>
                    <span className="panel-row-label">{r.module_name || r.module?.name}</span>
                    <span className="panel-row-value">{r.rate} DA</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Compte enseignant (collapsible) ── */}
            <div className="panel-section" style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
              <button
                className="teacher-account-toggle"
                onClick={() => setAccountsOpen(v => !v)}
              >
                <span style={{ fontWeight: 600, fontSize: 13 }}>Compte enseignant</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto', marginRight: 6 }}>
                  {selectedAccount?.account ? selectedAccount.account.email : (selectedAccount?.teacher_email ? 'Non créé' : '—')}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{accountsOpen ? '▲' : '▼'}</span>
              </button>

              {accountsOpen && (
                <div style={{ marginTop: 10 }}>
                  {accountLoading ? (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chargement…</div>
                  ) : selectedAccount?.account ? (
                    <>
                      <div className="panel-row">
                        <span className="panel-row-label">Email de connexion</span>
                        <span className="panel-row-value" style={{ fontSize: 12 }}>{selectedAccount.account.email}</span>
                      </div>
                      <div className="panel-row">
                        <span className="panel-row-label">Rôle</span>
                        <span className="panel-row-value">
                          <span style={{ background: 'var(--primary-soft)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                            Enseignant
                          </span>
                        </span>
                      </div>
                      <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}
                        onClick={() => handleResetPassword(selected)}>
                        Réinitialiser le mot de passe
                      </button>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        Réinitialisé à «&nbsp;teacher123&nbsp;»
                      </div>
                    </>
                  ) : (
                    <>
                      {selectedAccount?.teacher_email ? (
                        <button className="btn btn-primary btn-sm" onClick={() => handleCreateAccount(selected)}>
                          Créer le compte
                        </button>
                      ) : (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                          Ajoutez un email à cet enseignant pour créer son compte.
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </DetailPanel>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editTarget ? t('teachers.edit') : t('teachers.add')}</span>
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}><X size={16} /></button>
            </div>
            {formError && <div className="error-msg">{formError}</div>}
            <div className="modal-body">
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">{t('teachers.name')} *</label>
                  <input className="form-input" placeholder={t('teachers.name')} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('teachers.email')}</label>
                  <input className="form-input" type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('teachers.phone')}</label>
                  <input className="form-input" placeholder="0xxx xxx xxx" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    {t('teachers.revenue_pct')} — <strong>{form.revenue_percentage}%</strong>
                  </label>
                  <input
                    type="range" min="50" max="95" step="5"
                    value={form.revenue_percentage}
                    onChange={e => setForm(p => ({ ...p, revenue_percentage: Number(e.target.value) }))}
                    style={{ width: '100%', accentColor: 'var(--primary)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    <span>50%</span><span>70%</span><span>95%</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>{t('common.cancel')}</button>
              <button className={`btn btn-primary${saving ? ' btn-loading' : ''}`} onClick={handleSave} disabled={saving}>
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`Supprimer ${deleteTarget.name} ?`}
          confirmLabel={t('common.delete')}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </Layout>
  );
}
