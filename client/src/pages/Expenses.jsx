import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import DetailPanel from '../components/DetailPanel';
import SkeletonTable from '../components/SkeletonTable';
import EmptyState from '../components/EmptyState';
import TableRow from '../components/TableRow';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';
import { DollarSign, Plus, Edit, Trash, X, MoreHorizontal } from '../components/Icons';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../api/expenses';

const CATEGORIES = ['rent', 'bills', 'supplies', 'other'];
const CAT_VARIANT = { rent: 'blue', bills: 'orange', supplies: 'yellow', other: 'gray' };
const emptyForm = { date: new Date().toISOString().slice(0, 10), category: 'other', description: '', amount: '' };

export default function Expenses() {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading]   = useState(true);

  const [panelOpen, setPanelOpen] = useState(true);
  const [selected, setSelected]   = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [menuPos, setMenuPos]           = useState({ top: 0, right: 0 });
  const actionMenuRef = useRef(null);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    function handler(e) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) setActionMenuId(null);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await getExpenses();
      setExpenses(res.data || []);
    } catch { setExpenses([]); }
    finally { setLoading(false); }
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(exp) {
    setEditing(exp);
    setForm({
      date: exp.date?.slice(0, 10) || '',
      category: exp.category || 'other',
      description: exp.description || '',
      amount: exp.amount ?? '',
    });
    setFormError('');
    setShowModal(true);
    setActionMenuId(null);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.amount || isNaN(Number(form.amount))) { setFormError(t('common.error')); return; }
    setSaving(true);
    try {
      const payload = { ...form, amount: Number(form.amount) };
      if (editing) {
        const res = await updateExpense(editing.id, payload);
        setExpenses(prev => prev.map(x => x.id === editing.id ? res.data : x));
        if (selected?.id === editing.id) setSelected(res.data);
      } else {
        const res = await createExpense(payload);
        setExpenses(prev => [res.data, ...prev]);
      }
      setShowModal(false);
      success(t('common.saved'));
    } catch { toastError(t('common.error')); }
    finally { setSaving(false); }
  }

  async function handleDelete(exp) {
    try {
      await deleteExpense(exp.id);
      setExpenses(prev => prev.filter(x => x.id !== exp.id));
      if (selected?.id === exp.id) setSelected(null);
      setDeleteTarget(null);
      success(t('common.deleted'));
    } catch { toastError(t('common.error')); }
  }

  const now = new Date();
  const totalMonth = expenses
    .filter(e => { const d = new Date(e.date); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); })
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalAll = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  const catTotals = CATEGORIES.map(c => ({
    cat: c,
    total: expenses.filter(e => e.category === c).reduce((s, e) => s + Number(e.amount || 0), 0),
  })).filter(x => x.total > 0);

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div className="breadcrumb">
            <span className="breadcrumb-current">{t('expenses.title')}</span>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} /> {t('expenses.add')}
          </button>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}>
              <DollarSign size={20} />
            </div>
            <div className="stat-card-label">{t('expenses.total_month')}</div>
            <div className="stat-card-value">{totalMonth.toLocaleString()}</div>
            <div className="stat-card-sub">DA ce mois</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}>
              <DollarSign size={20} />
            </div>
            <div className="stat-card-label">{t('expenses.total_all')}</div>
            <div className="stat-card-value">{totalAll.toLocaleString()}</div>
            <div className="stat-card-sub">DA total</div>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <div className="table-toolbar">
            <span className="table-title">{t('expenses.title')}</span>
            <Badge variant="blue">{expenses.length}</Badge>
          </div>

          {loading ? (
            <SkeletonTable rows={5} cols={5} />
          ) : expenses.length === 0 ? (
            <EmptyState
              title={t('common.no_data')}
              sub={t('common.no_data')}
              action={t('expenses.add')}
              onAction={openAdd}
            />
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t('expenses.date')}</th>
                  <th>{t('expenses.category')}</th>
                  <th>{t('expenses.description')}</th>
                  <th>{t('expenses.amount')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp, idx) => (
                  <TableRow key={exp.id} index={idx} onClick={() => setSelected(exp)}>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{exp.date?.slice(0, 10)}</td>
                    <td>
                      <Badge variant={CAT_VARIANT[exp.category] || 'gray'}>
                        {t(`expenses.cat_${exp.category}`)}
                      </Badge>
                    </td>
                    <td style={{ maxWidth: 260 }}>{exp.description || '—'}</td>
                    <td style={{ fontWeight: 600 }}>{Number(exp.amount || 0).toLocaleString()} DA</td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="row-actions" ref={actionMenuId === exp.id ? actionMenuRef : null}>
                        <button className="action-btn" onClick={e => {
                          if (actionMenuId === exp.id) { setActionMenuId(null); return; }
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                          setActionMenuId(exp.id);
                        }}>
                          <MoreHorizontal size={16} />
                        </button>
                        {actionMenuId === exp.id && (
                          <div className="dropdown-menu" style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}>
                            <button className="dropdown-item" onClick={() => openEdit(exp)}>
                              <Edit size={14} /> {t('common.edit')}
                            </button>
                            <div className="dropdown-divider" />
                            <button className="dropdown-item danger" onClick={() => { setDeleteTarget(exp); setActionMenuId(null); }}>
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
        title={t('expenses.title')}
        placeholder={
          <div className="panel-placeholder">
            <div className="panel-placeholder-icon"><DollarSign size={36} color="var(--text-light)" /></div>
            <p className="panel-placeholder-hint">{t('common.click_row_hint')}</p>
            <div className="panel-section" style={{ marginTop: 16 }}>
              <div className="panel-section-title">Résumé</div>
              <div className="panel-row">
                <span className="panel-row-label">{t('expenses.total_month')}</span>
                <span className="panel-row-value">{totalMonth.toLocaleString()} DA</span>
              </div>
              <div className="panel-row">
                <span className="panel-row-label">{t('expenses.total_all')}</span>
                <span className="panel-row-value">{totalAll.toLocaleString()} DA</span>
              </div>
              {catTotals.map(({ cat, total }) => (
                <div key={cat} className="panel-row">
                  <span className="panel-row-label">{t(`expenses.cat_${cat}`)}</span>
                  <Badge variant={CAT_VARIANT[cat] || 'gray'}>{total.toLocaleString()} DA</Badge>
                </div>
              ))}
            </div>
          </div>
        }
      >
        {selected && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 0' }}>
              <div style={{
                width: 44, height: 44, borderRadius: 'var(--r)',
                background: 'var(--red-soft)', color: 'var(--red)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <DollarSign size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{Number(selected.amount || 0).toLocaleString()} DA</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selected.date?.slice(0, 10)}</div>
              </div>
            </div>

            <div className="panel-section">
              <div className="panel-section-title">{t('common.actions')}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(selected)}>
                  <Edit size={14} /> {t('common.edit')}
                </button>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }}
                  onClick={() => setDeleteTarget(selected)}>
                  <Trash size={14} /> {t('common.delete')}
                </button>
              </div>
            </div>

            <div className="panel-section">
              <div className="panel-section-title">Détails</div>
              <div className="panel-row">
                <span className="panel-row-label">{t('expenses.category')}</span>
                <Badge variant={CAT_VARIANT[selected.category] || 'gray'}>
                  {t(`expenses.cat_${selected.category}`)}
                </Badge>
              </div>
              <div className="panel-row">
                <span className="panel-row-label">{t('expenses.description')}</span>
                <span className="panel-row-value">{selected.description || '—'}</span>
              </div>
              <div className="panel-row">
                <span className="panel-row-label">{t('expenses.amount')}</span>
                <span className="panel-row-value" style={{ fontWeight: 700 }}>
                  {Number(selected.amount || 0).toLocaleString()} DA
                </span>
              </div>
              <div className="panel-row">
                <span className="panel-row-label">{t('expenses.date')}</span>
                <span className="panel-row-value">{selected.date?.slice(0, 10)}</span>
              </div>
            </div>
          </>
        )}
      </DetailPanel>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editing ? t('common.edit') : t('expenses.add')}</span>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            {formError && <div className="error-msg" style={{ marginBottom: 12 }}>{formError}</div>}
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">{t('expenses.date')}</label>
                  <input type="date" className="form-input" required value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('expenses.category')}</label>
                  <select className="form-input" value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{t(`expenses.cat_${c}`)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('expenses.description')}</label>
                  <input type="text" className="form-input" value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('expenses.amount')}</label>
                  <input type="number" className="form-input" required min="0" step="0.01"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className={`btn btn-primary${saving ? ' btn-loading' : ''}`} disabled={saving}>
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          message={`Supprimer cette dépense de ${Number(deleteTarget.amount || 0).toLocaleString()} DA ?`}
          confirmLabel={t('common.delete')}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </Layout>
  );
}
