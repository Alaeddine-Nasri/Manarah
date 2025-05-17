import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import StatsCard from '../components/StatsCard';
import Badge from '../components/Badge';
import DetailPanel from '../components/DetailPanel';
import ConfirmModal from '../components/ConfirmModal';
import SkeletonTable from '../components/SkeletonTable';
import EmptyState from '../components/EmptyState';
import TableRow from '../components/TableRow';
import { useToast } from '../context/ToastContext';
import useFlashRow from '../hooks/useFlashRow';
import { Users, Plus, Edit, Trash, MoreHorizontal, X, Download, CreditCard } from '../components/Icons';
import { exportStudentsPdf } from '../api/export';
import {
  getStudents, createStudent, updateStudent, deleteStudent,
  promoteStudent, transferStudent, setStudentStatus, uploadStudentPhoto,
} from '../api/students';
import { getLevels } from '../api/levels';
import { getPayments } from '../api/payments';
import QRImage from '../components/QRImage';
import { printStudentQR, printAllQR } from '../utils/printQR';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const PAYMENT_STATUS_VARIANTS = { current: 'green', due_soon: 'orange', overdue: 'red' };
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function statusVariant(status) {
  if (status === 'active') return 'green';
  if (status === 'suspended') return 'orange';
  if (status === 'archived') return 'gray';
  return 'gray';
}

function SessionsPill({ remaining }) {
  const n = Number(remaining) || 0;
  const variant = n >= 3 ? 'green' : n >= 1 ? 'orange' : 'red';
  return <Badge variant={variant}>{n}</Badge>;
}

const emptyForm = {
  name: '', email: '', phone: '', parent_phone: '',
  level_id: '', year_id: '', group_ids: [], birth_date: '', status: 'active',
};

const STATUSES = ['active', 'suspended', 'archived'];

export default function Students() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [flashId, triggerFlash] = useFlashRow();

  const [students, setStudents] = useState([]);
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterLevel, setFilterLevel] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [studentPayments, setStudentPayments] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const actionMenuRef = useRef(null);

  const [promoteTarget, setPromoteTarget] = useState(null);
  const [promoteYearId, setPromoteYearId] = useState('');
  const [transferTarget, setTransferTarget] = useState(null);
  const [transferGroupId, setTransferGroupId] = useState('');
  const [statusTarget, setStatusTarget] = useState(null);
  const [pendingStatus, setPendingStatus] = useState('');
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  const [photoFile, setPhotoFile] = useState(null);
  const photoInputRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    function handleClick(e) {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setActionMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [sRes, lRes] = await Promise.all([getStudents(), getLevels()]);
      setStudents(sRes.data || []);
      setLevels(lRes.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  async function reloadAndSync(studentId) {
    const [sRes, lRes] = await Promise.all([getStudents(), getLevels()]);
    const list = sRes.data || [];
    setStudents(list);
    setLevels(lRes.data || []);
    if (studentId) {
      const updated = list.find(s => s.id === studentId);
      if (updated) setSelected(updated);
    }
  }

  // ── Cascading dropdowns (form) ──────────────────────────────
  const selectedLevel = levels.find(l => String(l.id) === String(form.level_id));
  const formYears = selectedLevel?.years || [];
  const selectedYear = formYears.find(y => String(y.id) === String(form.year_id));
  const formGroups = selectedYear?.groups || [];

  // ── Filter cascades ─────────────────────────────────────────
  const filterLevelObj = levels.find(l => String(l.id) === String(filterLevel));
  const filterYears = filterLevelObj?.years || [];
  const filterYearObj = filterYears.find(y => String(y.id) === String(filterYear));
  const filterGroups = filterYearObj?.groups || [];

  // ── Filtered list ───────────────────────────────────────────
  const filtered = students.filter(s => {
    if (filterLevel && String(s.level_id) !== String(filterLevel)) return false;
    if (filterYear && String(s.year_id) !== String(filterYear)) return false;
    if (filterGroup) {
      const groupIds = s.group_names ? s.group_names.split(',').map(x => x.trim()) : [];
      // s doesn't have group_ids in the list — use the fact that group_name might match
      // Actually use s.group_id for simple check or we use group_names
      if (String(s.group_id) !== String(filterGroup)) return false;
    }
    if (filterStatus && s.status !== filterStatus) return false;
    if (search && !s.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalActive = students.filter(s => s.status === 'active').length;
  const totalSuspended = students.filter(s => s.status === 'suspended').length;

  // ── Add / Edit ──────────────────────────────────────────────
  function openAdd() {
    setEditTarget(null); setForm(emptyForm); setPhotoFile(null); setFormError(''); setModalOpen(true);
  }

  function openEdit(student) {
    setEditTarget(student);
    setForm({
      name: student.name || '', email: student.email || '',
      phone: student.phone || '', parent_phone: student.parent_phone || '',
      level_id: String(student.level_id || ''), year_id: String(student.year_id || ''),
      group_ids: student.group_ids || (student.group_id ? [student.group_id] : []),
      birth_date: student.birth_date || '', status: student.status || 'active',
    });
    setPhotoFile(null); setFormError(''); setModalOpen(true); setActionMenuId(null);
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError(t('students.name') + ' ' + t('common.required')); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        group_ids: form.group_ids.map(Number).filter(Boolean),
        group_id: form.group_ids[0] || null,
        birth_date: form.birth_date || null,
      };
      let savedId;
      if (editTarget) {
        await updateStudent(editTarget.id, payload);
        savedId = editTarget.id;
      } else {
        const res = await createStudent(payload);
        savedId = res.data?.id;
      }
      if (photoFile && savedId) {
        await uploadStudentPhoto(savedId, photoFile);
      }
      setModalOpen(false);
      success(editTarget ? t('common.saved') : t('students.add') + ' ✓');
      if (savedId) triggerFlash(savedId);
      await loadData();
    } catch {
      setFormError(t('common.error'));
      toastError(t('common.error'));
    }
    finally { setSaving(false); }
  }

  function handleFormChange(field, value) {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'level_id') { next.year_id = ''; next.group_ids = []; }
      if (field === 'year_id') { next.group_ids = []; }
      return next;
    });
  }

  function toggleGroup(gid) {
    const id = Number(gid);
    setForm(prev => {
      const ids = prev.group_ids.map(Number);
      return {
        ...prev,
        group_ids: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id],
      };
    });
  }

  // ── Delete ──────────────────────────────────────────────────
  async function handleDelete(id) {
    try {
      await deleteStudent(id);
      setDeleteTarget(null);
      if (selected?.id === id) setSelected(null);
      success(t('common.deleted'));
      await loadData();
    } catch { toastError(t('common.error')); }
  }

  // ── Promote ─────────────────────────────────────────────────
  function openPromote(student) {
    setPromoteTarget(student);
    const lvl = levels.find(l => l.id === student.level_id);
    const years = lvl?.years || [];
    const idx = years.findIndex(y => y.id === student.year_id);
    const nextYear = years[idx + 1];
    setPromoteYearId(nextYear ? String(nextYear.id) : (years[0] ? String(years[0].id) : ''));
    setActionMenuId(null);
  }

  async function handlePromote() {
    if (!promoteYearId) return;
    await promoteStudent(promoteTarget.id, Number(promoteYearId));
    setPromoteTarget(null);
    await reloadAndSync(promoteTarget.id);
  }

  // ── Transfer group ──────────────────────────────────────────
  function openTransfer(student) {
    setTransferTarget(student);
    setTransferGroupId(String(student.group_id || ''));
    setActionMenuId(null);
  }

  async function handleTransfer() {
    if (!transferGroupId) return;
    await transferStudent(transferTarget.id, Number(transferGroupId));
    setTransferTarget(null);
    await reloadAndSync(transferTarget.id);
  }

  // ── Status ──────────────────────────────────────────────────
  function openStatus(student) {
    setStatusTarget(student);
    setPendingStatus(student.status);
    setConfirmArchive(false); setConfirmSuspend(false); setActionMenuId(null);
  }

  async function handleSetStatus() {
    if (pendingStatus === 'archived' && !confirmArchive) { setConfirmArchive(true); return; }
    if (pendingStatus === 'suspended' && !confirmSuspend) { setConfirmSuspend(true); return; }
    await setStudentStatus(statusTarget.id, pendingStatus);
    setStatusTarget(null); setConfirmArchive(false); setConfirmSuspend(false);
    await reloadAndSync(statusTarget.id);
  }

  // ── Helpers ─────────────────────────────────────────────────
  const levelName = id => levels.find(l => l.id === id)?.name || '—';
  const yearName = (levelId, yearId) =>
    levels.find(l => l.id === levelId)?.years?.find(y => y.id === yearId)?.name || '—';

  const promoteLevelYears = promoteTarget
    ? (levels.find(l => l.id === promoteTarget.level_id)?.years || [])
    : [];
  const isLastYear = promoteTarget && (() => {
    const yrs = promoteLevelYears;
    const idx = yrs.findIndex(y => y.id === promoteTarget.year_id);
    return idx === yrs.length - 1 && idx >= 0;
  })();

  const transferYearGroups = transferTarget
    ? (levels.find(l => l.id === transferTarget.level_id)?.years?.find(y => y.id === transferTarget.year_id)?.groups || [])
    : [];

  function openPanel(student) {
    setSelected(student);
    setStudentPayments([]);
    getPayments({ student_id: student.id })
      .then(r => setStudentPayments(r.data || []))
      .catch(() => setStudentPayments([]));
  }

  function openPayments(e, student) {
    e.stopPropagation();
    openPanel(student);
  }

  const activeFilters = { level_id: filterLevel || undefined, year_id: filterYear || undefined, status: filterStatus || undefined };

  return (
    <Layout>
      <div className="page">
        {/* Header */}
        <div className="page-header">
          <div className="breadcrumb">
            <span className="breadcrumb-current">{t('students.title')}</span>
          </div>
          <button className="btn btn-ghost" onClick={() => printAllQR(filtered, user?.school_name)}>
            {t('students.print_all_qr')}
          </button>
          <button className="btn btn-outline" onClick={() => exportStudentsPdf(activeFilters)}>
            <Download size={15} /> {t('common.export_pdf')}
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={16} /> {t('students.add')}
          </button>
        </div>

        {/* Stats */}
        <div className="cards-row">
          <StatsCard icon={<Users size={20} />} label={t('students.total')} value={students.length} color="blue" />
          <StatsCard icon={<Users size={20} />} label={t('students.active')} value={totalActive} color="green" />
          <StatsCard icon={<Users size={20} />} label={t('students.suspended')} value={totalSuspended} color="orange" />
        </div>

        {/* Filter bar */}
        <div className="filter-bar">
          <input
            className="form-input" style={{ maxWidth: 220 }}
            placeholder={t('students.search')} value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="form-select" style={{ maxWidth: 160 }} value={filterLevel} onChange={e => { setFilterLevel(e.target.value); setFilterYear(''); setFilterGroup(''); }}>
            <option value="">{t('students.filter_level')}</option>
            {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          {filterLevel && (
            <select className="form-select" style={{ maxWidth: 160 }} value={filterYear} onChange={e => { setFilterYear(e.target.value); setFilterGroup(''); }}>
              <option value="">{t('students.year')}</option>
              {filterYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
            </select>
          )}
          {filterYear && filterGroups.length > 0 && (
            <select className="form-select" style={{ maxWidth: 160 }} value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
              <option value="">{t('students.group')}</option>
              {filterGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}
          <select className="form-select" style={{ maxWidth: 160 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">{t('students.filter_status')}</option>
            {STATUSES.map(s => <option key={s} value={s}>{t(`students.status_${s}`)}</option>)}
          </select>
          {(search || filterLevel || filterYear || filterGroup || filterStatus) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterLevel(''); setFilterYear(''); setFilterGroup(''); setFilterStatus(''); }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Table */}
        <div className="table-wrap">
          <div className="table-toolbar">
            <span className="table-title">{t('students.title')}</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} {t('students.total').toLowerCase()}</span>
          </div>
          {loading ? (
            <SkeletonTable rows={5} cols={6} />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={t('common.no_data')}
              sub={search || filterLevel || filterStatus ? t('common.try_clear_filters') : t('students.add_first')}
              action={!search && !filterLevel && !filterStatus ? t('students.add') : undefined}
              onAction={!search && !filterLevel && !filterStatus ? openAdd : undefined}
            />
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ maxWidth: 160 }}>{t('students.name')}</th>
                  <th>{t('students.level')}</th>
                  <th>{t('students.group')}</th>
                  <th>{t('students.status')}</th>
                  <th>{t('students.sessions_remaining')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => (
                  <TableRow key={s.id} index={idx} flash={flashId === s.id} onClick={() => openPanel(s)} style={{ cursor: 'pointer' }}>
                    <td style={{ maxWidth: 160 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                          background: s.photo_url ? 'transparent' : 'var(--primary-soft)',
                          overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {s.photo_url
                            ? <img src={`${API_BASE}${s.photo_url}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 12 }}>{getInitials(s.name)}</span>
                          }
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 500, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.group_names || s.group_name || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: 13 }}>{levelName(s.level_id)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{yearName(s.level_id, s.year_id)}</div>
                    </td>
                    <td style={{ fontSize: 13 }}>{s.group_names || s.group_name || '—'}</td>
                    <td>
                      <Badge variant={statusVariant(s.status)}>
                        {t(`students.status_${s.status}`)}
                      </Badge>
                    </td>
                    <td>
                      <SessionsPill remaining={s.sessions_remaining} />
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={e => openPayments(e, s)}
                          title={t('nav.payments')}
                        >
                          <CreditCard size={14} /> {t('nav.payments')}
                        </button>
                        <div className="row-actions" ref={actionMenuId === s.id ? actionMenuRef : null}>
                          <button
                            className="action-btn"
                            onClick={(e) => {
                              if (actionMenuId === s.id) { setActionMenuId(null); return; }
                              const rect = e.currentTarget.getBoundingClientRect();
                              setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                              setActionMenuId(s.id);
                            }}
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          {actionMenuId === s.id && (
                            <div className="dropdown-menu" style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}>
                              <button className="dropdown-item" onClick={() => openEdit(s)}>
                                <Edit size={14} /> {t('students.edit')}
                              </button>
                              <button className="dropdown-item" onClick={() => openPromote(s)}>
                                ↑ {t('students.promote')}
                              </button>
                              <button className="dropdown-item" onClick={() => openTransfer(s)}>
                                ⇄ {t('students.transfer')}
                              </button>
                              <button className="dropdown-item" onClick={() => openStatus(s)}>
                                ● {t('students.change_status')}
                              </button>
                              <div className="dropdown-divider" />
                              <button className="dropdown-item danger" onClick={() => { setDeleteTarget(s); setActionMenuId(null); }}>
                                <Trash size={14} /> {t('students.delete')}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </TableRow>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Detail panel ─────────────────────────────────────── */}
      <DetailPanel
        open={panelOpen}
        onToggle={() => setPanelOpen(v => !v)}
        title={t('students.profile')}
        placeholder={
          <div className="panel-placeholder">
            <div className="panel-placeholder-icon">
              <Users size={36} color="var(--text-light)" />
            </div>
            <p className="panel-placeholder-hint">{t('common.click_row_hint')}</p>
            <div className="panel-section" style={{ marginTop: 16 }}>
              <div className="panel-section-title">{t('students.title')}</div>
              <div className="panel-row">
                <span className="panel-row-label">{t('students.total')}</span>
                <span className="panel-row-value">{students.length}</span>
              </div>
              <div className="panel-row">
                <span className="panel-row-label">{t('students.active')}</span>
                <Badge variant="green">{totalActive}</Badge>
              </div>
              <div className="panel-row">
                <span className="panel-row-label">{t('students.suspended')}</span>
                <Badge variant="orange">{totalSuspended}</Badge>
              </div>
            </div>
          </div>
        }
      >
        {selected && (
          <>
            {selected.photo_url ? (
              <div style={{ width: 72, height: 72, borderRadius: '50%', margin: '0 auto 8px', overflow: 'hidden' }}>
                <img src={`${API_BASE}${selected.photo_url}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div className="panel-avatar">{getInitials(selected.name)}</div>
            )}
            <div className="panel-name">{selected.name}</div>
            <div className="panel-sub">
              <Badge variant={statusVariant(selected.status)}>
                {t(`students.status_${selected.status}`)}
              </Badge>
            </div>

            <div className="panel-section">
              <div className="panel-section-title">{t('common.actions')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => openEdit(selected)}>
                    <Edit size={14} /> {t('students.edit')}
                  </button>
                  <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => setDeleteTarget(selected)}>
                    <Trash size={14} /> {t('students.delete')}
                  </button>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => openPromote(selected)}>↑ {t('students.promote')}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => openTransfer(selected)}>⇄ {t('students.transfer')}</button>
                <button className="btn btn-ghost btn-sm" onClick={() => openStatus(selected)}>● {t('students.change_status')}</button>
              </div>
            </div>

            {studentPayments.length > 0 && (() => {
              const hasOverdue = studentPayments.some(p => p.status === 'overdue');
              return (
                <div className="panel-section">
                  <div className="panel-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{t('payments.title')}</span>
                    {hasOverdue && <Badge variant="red">⚠ {t('payments.status_overdue')}</Badge>}
                  </div>
                  {studentPayments.map(p => (
                    <div key={p.id} className="panel-row">
                      <span className="panel-row-label" style={{ fontSize: 13 }}>
                        {p.module_name || '—'}
                        <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400 }}>{p.sessions_paid}/{p.sessions_count}</span>
                      </span>
                      <Badge variant={PAYMENT_STATUS_VARIANTS[p.status] || 'gray'}>
                        {t(`payments.status_${p.status}`, { defaultValue: p.status })}
                      </Badge>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="panel-section">
              <div className="panel-section-title">{t('students.profile')}</div>
              {[
                { label: t('students.email'), value: selected.email || '—' },
                { label: t('students.phone'), value: selected.phone || '—' },
                { label: t('students.parent_phone'), value: selected.parent_phone || '—' },
                { label: t('students.birth_date'), value: selected.birth_date || '—' },
                { label: t('students.level'), value: levelName(selected.level_id) },
                { label: t('students.year'), value: yearName(selected.level_id, selected.year_id) },
                { label: t('students.group'), value: selected.group_names || selected.group_name || '—' },
                { label: t('students.created'), value: selected.created_at?.slice(0, 10) || '—' },
              ].map(({ label, value }) => (
                <div className="panel-row" key={label}>
                  <span className="panel-row-label">{label}</span>
                  <span className="panel-row-value">{value}</span>
                </div>
              ))}
              {selected.qr_code && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '12px 0' }}>
                  <QRImage value={selected.qr_code} size={160} />
                  <button className="btn btn-ghost btn-sm" onClick={() => printStudentQR(selected, user?.school_name)}>
                    {t('students.print_qr')}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </DetailPanel>

      {/* ── Add / Edit modal ─────────────────────────────────── */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editTarget ? t('students.edit') : t('students.add')}</span>
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}><X size={16} /></button>
            </div>
            {formError && <div style={{ color: 'var(--red)', fontSize: 13, padding: '0 0 12px' }}>{formError}</div>}
            <div className="modal-body">
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">{t('students.name')} *</label>
                  <input className="form-input" placeholder={t('students.name')} value={form.name} onChange={e => handleFormChange('name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('students.email')}</label>
                  <input className="form-input" type="email" placeholder="email@example.com" value={form.email} onChange={e => handleFormChange('email', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('students.phone')}</label>
                  <input className="form-input" placeholder="0xxx xxx xxx" value={form.phone} onChange={e => handleFormChange('phone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('students.parent_phone')}</label>
                  <input className="form-input" placeholder="0xxx xxx xxx" value={form.parent_phone} onChange={e => handleFormChange('parent_phone', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('students.birth_date')}</label>
                  <input className="form-input" type="date" value={form.birth_date} onChange={e => handleFormChange('birth_date', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('students.photo')}</label>
                  <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => setPhotoFile(e.target.files[0] || null)} />
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => photoInputRef.current?.click()}>
                      {photoFile ? photoFile.name : t('students.choose_photo')}
                    </button>
                    {photoFile && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPhotoFile(null)}><X size={12} /></button>}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('students.level')}</label>
                  <select className="form-select" value={form.level_id} onChange={e => handleFormChange('level_id', e.target.value)}>
                    <option value="">{t('common.none')}</option>
                    {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('students.year')}</label>
                  <select className="form-select" value={form.year_id} onChange={e => handleFormChange('year_id', e.target.value)} disabled={!form.level_id}>
                    <option value="">{t('common.none')}</option>
                    {formYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </div>
                <div className="form-group form-group-full">
                  <label className="form-label">{t('students.groups')}</label>
                  {formGroups.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{form.year_id ? t('common.no_data') : t('students.select_year_first')}</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {formGroups.map(g => {
                        const checked = form.group_ids.map(Number).includes(g.id);
                        return (
                          <label key={g.id} style={{
                            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                            padding: '6px 12px', borderRadius: 'var(--r)',
                            border: '1px solid', borderColor: checked ? 'var(--primary)' : 'var(--border)',
                            background: checked ? 'var(--primary-soft)' : 'transparent',
                            fontSize: 13,
                          }}>
                            <input type="checkbox" checked={checked} onChange={() => toggleGroup(g.id)} style={{ display: 'none' }} />
                            {g.name}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">{t('students.status')}</label>
                  <select className="form-select" value={form.status} onChange={e => handleFormChange('status', e.target.value)}>
                    {STATUSES.map(s => <option key={s} value={s}>{t(`students.status_${s}`)}</option>)}
                  </select>
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

      {/* ── Delete confirm ───────────────────────────────────── */}
      {deleteTarget && (
        <ConfirmModal
          message={`Supprimer ${deleteTarget.name} ? Cette action est irréversible.`}
          confirmLabel={t('common.delete')}
          onConfirm={() => handleDelete(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── Promote modal ────────────────────────────────────── */}
      {promoteTarget && (
        <div className="modal-overlay" onClick={() => setPromoteTarget(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{t('students.promote_title')}</span>
              <button className="btn btn-ghost" onClick={() => setPromoteTarget(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 0 }}>{promoteTarget.name}</p>
              {isLastYear && (
                <div style={{ background: 'var(--orange-soft)', color: 'var(--orange)', borderRadius: 'var(--r)', padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>
                  ⚠ {t('students.promote_warn')}
                </div>
              )}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">{t('students.year')}</label>
                <select className="form-input" value={promoteYearId} onChange={e => setPromoteYearId(e.target.value)}>
                  <option value="">{t('common.all')}</option>
                  {promoteLevelYears.map(y => (
                    <option key={y.id} value={y.id}>{y.name}{y.id === promoteTarget.year_id ? ` (actuelle)` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setPromoteTarget(null)}>{t('common.cancel')}</button>
              <button className="btn btn-primary" onClick={handlePromote} disabled={!promoteYearId}>{t('students.promote')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Transfer group modal ─────────────────────────────── */}
      {transferTarget && (
        <div className="modal-overlay" onClick={() => setTransferTarget(null)}>
          <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{t('students.transfer_title')}</span>
              <button className="btn btn-ghost" onClick={() => setTransferTarget(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 0 }}>{transferTarget.name}</p>
              {transferYearGroups.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('students.no_groups_year')}</p>
              ) : (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">{t('students.group')}</label>
                  <select className="form-input" value={transferGroupId} onChange={e => setTransferGroupId(e.target.value)}>
                    <option value="">{t('common.all')}</option>
                    {transferYearGroups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}{g.id === transferTarget.group_id ? ' ✓' : ''}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setTransferTarget(null)}>{t('common.cancel')}</button>
              <button className="btn btn-primary" onClick={handleTransfer} disabled={!transferGroupId || transferYearGroups.length === 0}>{t('students.transfer')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change status modal ──────────────────────────────── */}
      {statusTarget && (
        <div className="modal-overlay" onClick={() => { setStatusTarget(null); setConfirmArchive(false); setConfirmSuspend(false); }}>
          <div className="modal" style={{ maxWidth: 360 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{t('students.change_status')}</span>
              <button className="btn btn-ghost" onClick={() => { setStatusTarget(null); setConfirmArchive(false); setConfirmSuspend(false); }}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 0 }}>{statusTarget.name}</p>
              {confirmArchive ? (
                <div style={{ background: 'var(--red-soft)', color: 'var(--red)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 13 }}>
                  ⚠ {t('students.confirm_archive')}
                </div>
              ) : confirmSuspend ? (
                <div style={{ background: 'var(--orange-soft)', color: 'var(--orange)', borderRadius: 'var(--r)', padding: '10px 14px', fontSize: 13 }}>
                  ⚠ Suspendre {statusTarget.name} ?
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {STATUSES.map(s => (
                    <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 12px', borderRadius: 'var(--r-sm)', border: '1px solid', borderColor: pendingStatus === s ? 'var(--primary)' : 'var(--border)', background: pendingStatus === s ? 'var(--primary-soft)' : 'transparent' }}>
                      <input type="radio" name="status" value={s} checked={pendingStatus === s} onChange={() => setPendingStatus(s)} />
                      <Badge variant={statusVariant(s)}>{t(`students.status_${s}`)}</Badge>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer">
              {(confirmArchive || confirmSuspend) ? (
                <>
                  <button className="btn btn-ghost" onClick={() => { setConfirmArchive(false); setConfirmSuspend(false); }}>{t('common.cancel')}</button>
                  <button className={`btn ${confirmArchive ? 'btn-danger' : 'btn-primary'}`} onClick={handleSetStatus}>{t('common.yes')}</button>
                </>
              ) : (
                <>
                  <button className="btn btn-ghost" onClick={() => setStatusTarget(null)}>{t('common.cancel')}</button>
                  <button className="btn btn-primary" onClick={handleSetStatus} disabled={pendingStatus === statusTarget.status}>{t('common.save')}</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
