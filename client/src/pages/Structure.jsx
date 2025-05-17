import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import { Plus, Edit, Trash, Check, X, Calendar } from '../components/Icons';
import {
  getLevels,
  createLevel, updateLevel, deleteLevel,
  createYear, updateYear, deleteYear,
  createGroup, updateGroup, deleteGroup,
  getGroupStudents, addStudentToGroup, removeStudentFromGroup,
} from '../api/levels';
import { getModules, createModule, updateModule, deleteModule } from '../api/modules';
import { getTeachers } from '../api/teachers';
import { getSessions, createSession } from '../api/sessions';

const LEVEL_TYPES = ['primary', 'middle', 'secondary', 'workshop'];
const TYPE_VARIANT = { primary: 'blue', middle: 'green', secondary: 'orange', workshop: 'gray' };

// ── tiny inline editable row helpers ──────────────────────────

function PanelRow({ label, selected, onSelect, onEdit, onDelete, badge }) {
  return (
    <div
      className={`struct-row${selected ? ' selected' : ''}`}
      onClick={onSelect}
    >
      <span className="struct-row-label">{label}</span>
      {badge}
      <div className="struct-row-actions" onClick={e => e.stopPropagation()}>
        <button className="btn btn-ghost btn-sm" onClick={onEdit}><Edit size={13} /></button>
        <button className="btn btn-ghost btn-sm" onClick={onDelete}><Trash size={13} /></button>
      </div>
    </div>
  );
}

function InlineForm({ value, onChange, onSave, onCancel, placeholder, extra }) {
  return (
    <form
      className="struct-inline-form"
      onSubmit={e => { e.preventDefault(); onSave(); }}
    >
      <input
        autoFocus
        className="form-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ flex: 1 }}
      />
      {extra}
      <button type="submit" className="btn btn-primary btn-sm"><Check size={13} /></button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>✕</button>
    </form>
  );
}

// ── Module row for the modules tab ────────────────────────────

function ModuleRow({ mod, levels, onEdit, onDelete }) {
  const { t } = useTranslation();
  return (
    <tr>
      <td style={{ fontWeight: 500 }}>{mod.name}</td>
      <td>{mod.level_name || '—'}</td>
      <td>{mod.year_name || '—'}</td>
      <td>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(mod)}><Edit size={13} /></button>
          <button className="btn btn-ghost btn-sm" onClick={() => onDelete(mod.id)}><Trash size={13} /></button>
        </div>
      </td>
    </tr>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function Structure() {
  const { t } = useTranslation();

  // tab
  const [tab, setTab] = useState('structure');

  // tree data
  const [levels, setLevels] = useState([]);
  const [selLevel, setSelLevel] = useState(null);
  const [selYear, setSelYear] = useState(null);

  // inline add/edit state per panel
  const [addingLevel, setAddingLevel] = useState(false);
  const [newLevel, setNewLevel] = useState({ name: '', type: 'primary' });
  const [editLevel, setEditLevel] = useState(null); // { id, name, type }

  const [addingYear, setAddingYear] = useState(false);
  const [newYearName, setNewYearName] = useState('');
  const [editYear, setEditYear] = useState(null);

  // group modal (add/edit)
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({ name: '', module_id: '', teacher_id: '' });

  // group detail (inline below panels)
  const [selGroup, setSelGroup] = useState(null);
  const [groupStudents, setGroupStudents] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [groupDetailLoading, setGroupDetailLoading] = useState(false);
  const [addStudentId, setAddStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  // group sessions
  const [groupSessions, setGroupSessions] = useState([]);
  const [groupSessionsLoading, setGroupSessionsLoading] = useState(false);

  // add session modal
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionForm, setSessionForm] = useState({ date: '', start_time: '08:00', end_time: '09:30', module_id: '', teacher_id: '' });

  // modules tab
  const [modules, setModules] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [showModModal, setShowModModal] = useState(false);
  const [editMod, setEditMod] = useState(null);
  const [modForm, setModForm] = useState({ name: '', level_id: '', year_id: '' });

  useEffect(() => { loadLevels(); loadTeachers(); loadModules(); }, []);
  useEffect(() => { if (tab === 'modules') loadModules(); }, [tab]);

  async function loadLevels(keepSelection = true) {
    try {
      const res = await getLevels();
      const list = res.data || [];
      setLevels(list);

      if (keepSelection && selLevel) {
        // refresh existing selection
        const updLevel = list.find(l => l.id === selLevel.id);
        setSelLevel(updLevel || list[0] || null);
        if (selYear && updLevel) {
          const updYear = updLevel.years?.find(y => y.id === selYear.id);
          setSelYear(updYear || null);
          if (selGroup && updYear) {
            const updGroup = updYear.groups?.find(g => g.id === selGroup.id);
            if (updGroup) setSelGroup(updGroup); // refresh next_session_date etc.
          }
        }
      } else if (!selLevel && list.length > 0) {
        // Auto-select first level → first year → first group (by next session)
        const firstLevel = list[0];
        setSelLevel(firstLevel);
        const firstYear = firstLevel.years?.[0] ?? null;
        setSelYear(firstYear);
        if (firstYear?.groups?.length > 0) {
          const sortedGroups = [...firstYear.groups].sort((a, b) => {
            if (a.next_session_date && b.next_session_date) return a.next_session_date.localeCompare(b.next_session_date);
            if (a.next_session_date) return -1;
            if (b.next_session_date) return 1;
            return a.name.localeCompare(b.name);
          });
          openGroupDetail(sortedGroups[0]);
        }
      }
    } catch { setLevels([]); }
  }

  async function loadModules() {
    try { const res = await getModules(); setModules(res.data || []); }
    catch { setModules([]); }
  }

  async function loadTeachers() {
    try { const res = await getTeachers(); setTeachers(res.data || []); }
    catch { setTeachers([]); }
  }

  // ── Levels ──
  async function handleAddLevel() {
    if (!newLevel.name.trim()) return;
    await createLevel({ name: newLevel.name.trim(), type: newLevel.type });
    setAddingLevel(false); setNewLevel({ name: '', type: 'primary' }); loadLevels();
  }

  async function handleUpdateLevel() {
    if (!editLevel?.name.trim()) return;
    await updateLevel(editLevel.id, { name: editLevel.name, type: editLevel.type });
    setEditLevel(null); loadLevels();
  }

  async function handleDeleteLevel(id) {
    await deleteLevel(id);
    if (selLevel?.id === id) { setSelLevel(null); setSelYear(null); }
    loadLevels();
  }

  // ── Years ──
  async function handleAddYear() {
    if (!newYearName.trim() || !selLevel) return;
    await createYear(selLevel.id, { name: newYearName.trim() });
    setAddingYear(false); setNewYearName(''); loadLevels();
  }

  async function handleUpdateYear() {
    if (!editYear?.name.trim()) return;
    await updateYear(editYear.id, { name: editYear.name });
    setEditYear(null); loadLevels();
  }

  async function handleDeleteYear(id) {
    await deleteYear(id);
    if (selYear?.id === id) setSelYear(null);
    loadLevels();
  }

  // ── Groups ──
  function openAddGroup() {
    setEditGroup(null);
    setGroupForm({ name: '', module_id: '', teacher_id: '' });
    setShowGroupModal(true);
  }

  function openEditGroup(gr) {
    setEditGroup(gr);
    setGroupForm({ name: gr.name, module_id: gr.module_id ?? '', teacher_id: gr.teacher_id ?? '' });
    setShowGroupModal(true);
  }

  async function handleSaveGroup(e) {
    e.preventDefault();
    if (!groupForm.name.trim()) return;
    const payload = {
      name: groupForm.name.trim(),
      module_id: groupForm.module_id || null,
      teacher_id: groupForm.teacher_id || null,
    };
    if (editGroup) {
      await updateGroup(editGroup.id, payload);
    } else {
      await createGroup(selYear.id, payload);
    }
    setShowGroupModal(false);
    loadLevels();
  }

  async function handleDeleteGroup(id) {
    await deleteGroup(id);
    if (selGroup?.id === id) setSelGroup(null);
    loadLevels();
  }

  async function openGroupDetail(gr) {
    setSelGroup(gr);
    setAddStudentId('');
    setStudentSearch('');
    setGroupDetailLoading(true);
    setGroupSessionsLoading(true);
    try {
      const [studRes, sessRes] = await Promise.all([
        getGroupStudents(gr.id),
        getSessions({ group_id: gr.id }),
      ]);
      setGroupStudents(studRes.data.students || []);
      setAvailableStudents(studRes.data.available || []);
      setGroupSessions((sessRes.data || []).sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time)));
    } catch {
      setGroupStudents([]); setAvailableStudents([]); setGroupSessions([]);
    } finally {
      setGroupDetailLoading(false);
      setGroupSessionsLoading(false);
    }
  }

  async function handleAddStudent(studentId) {
    const id = studentId || addStudentId;
    if (!id || !selGroup) return;
    await addStudentToGroup(selGroup.id, Number(id));
    setAddStudentId('');
    setStudentSearch('');
    const res = await getGroupStudents(selGroup.id);
    setGroupStudents(res.data.students || []);
    setAvailableStudents(res.data.available || []);
    loadLevels();
  }

  async function handleRemoveStudent(studentId) {
    await removeStudentFromGroup(selGroup.id, studentId);
    const res = await getGroupStudents(selGroup.id);
    setGroupStudents(res.data.students || []);
    setAvailableStudents(res.data.available || []);
    loadLevels();
  }

  function openAddSession() {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    setSessionForm({
      date: dateStr,
      start_time: '08:00',
      end_time: '09:30',
      module_id: selGroup?.module_id || '',
      teacher_id: selGroup?.teacher_id || '',
    });
    setShowSessionModal(true);
  }

  async function handleSaveSession(e) {
    e.preventDefault();
    if (!selGroup) return;
    await createSession({
      group_id: selGroup.id,
      module_id: Number(sessionForm.module_id),
      teacher_id: Number(sessionForm.teacher_id),
      date: sessionForm.date,
      start_time: sessionForm.start_time,
      end_time: sessionForm.end_time,
      type: 'one_time',
    });
    setShowSessionModal(false);
    const sessRes = await getSessions({ group_id: selGroup.id });
    setGroupSessions((sessRes.data || []).sort((a, b) => (a.date + a.start_time).localeCompare(b.date + b.start_time)));
  }

  // ── Modules ──
  function openAddMod() {
    setEditMod(null);
    setModForm({ name: '', level_id: '', year_id: '' });
    setShowModModal(true);
  }

  function openEditMod(mod) {
    setEditMod(mod);
    setModForm({ name: mod.name, level_id: mod.level_id ?? '', year_id: mod.year_id ?? '' });
    setShowModModal(true);
  }

  async function handleSaveMod(e) {
    e.preventDefault();
    const payload = {
      name: modForm.name,
      level_id: modForm.level_id || null,
      year_id: modForm.year_id || null,
    };
    if (editMod) {
      await updateModule(editMod.id, payload);
    } else {
      await createModule(payload);
    }
    setShowModModal(false);
    loadModules();
  }

  async function handleDeleteMod(id) {
    await deleteModule(id);
    loadModules();
  }

  // years of selected level
  const years = selLevel?.years || [];
  // groups of selected year
  const groups = [...(selYear?.groups || [])].sort((a, b) => {
    if (a.next_session_date && b.next_session_date) return a.next_session_date.localeCompare(b.next_session_date);
    if (a.next_session_date) return -1;
    if (b.next_session_date) return 1;
    return a.name.localeCompare(b.name);
  });

  // years for the module form filtered by selected level
  const modLevelYears = modForm.level_id
    ? (levels.find(l => l.id === Number(modForm.level_id))?.years || [])
    : [];

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div className="breadcrumb">
            <span className="breadcrumb-current">{t('structure.title')}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="struct-tabs">
          <button
            className={`struct-tab${tab === 'structure' ? ' active' : ''}`}
            onClick={() => setTab('structure')}
          >
            {t('structure.levels')}
          </button>
          <button
            className={`struct-tab${tab === 'modules' ? ' active' : ''}`}
            onClick={() => setTab('modules')}
          >
            {t('structure.modules')}
          </button>
        </div>

        {/* ── Structure tab: 3-panel ── */}
        {tab === 'structure' && (
          <div className="struct-panels">

            {/* Panel 1 — Levels */}
            <div className="struct-panel">
              <div className="struct-panel-header">
                <span className="struct-panel-title">{t('structure.levels')}</span>
                <button className="btn btn-primary btn-sm" onClick={() => { setAddingLevel(true); setEditLevel(null); }}>
                  <Plus size={13} />
                </button>
              </div>

              {addingLevel && (
                <InlineForm
                  value={newLevel.name}
                  onChange={name => setNewLevel(f => ({ ...f, name }))}
                  onSave={handleAddLevel}
                  onCancel={() => setAddingLevel(false)}
                  placeholder={t('structure.level_name')}
                  extra={
                    <select
                      className="form-input"
                      style={{ width: 120 }}
                      value={newLevel.type}
                      onChange={e => setNewLevel(f => ({ ...f, type: e.target.value }))}
                    >
                      {LEVEL_TYPES.map(tp => (
                        <option key={tp} value={tp}>{t(`structure.type_${tp}`)}</option>
                      ))}
                    </select>
                  }
                />
              )}

              <div className="struct-list">
                {levels.length === 0 && <div className="struct-empty">{t('common.no_data')}</div>}
                {levels.map(lv => (
                  editLevel?.id === lv.id ? (
                    <InlineForm
                      key={lv.id}
                      value={editLevel.name}
                      onChange={name => setEditLevel(f => ({ ...f, name }))}
                      onSave={handleUpdateLevel}
                      onCancel={() => setEditLevel(null)}
                      placeholder={t('structure.level_name')}
                      extra={
                        <select
                          className="form-input"
                          style={{ width: 120 }}
                          value={editLevel.type}
                          onChange={e => setEditLevel(f => ({ ...f, type: e.target.value }))}
                        >
                          {LEVEL_TYPES.map(tp => (
                            <option key={tp} value={tp}>{t(`structure.type_${tp}`)}</option>
                          ))}
                        </select>
                      }
                    />
                  ) : (
                    <PanelRow
                      key={lv.id}
                      label={lv.name}
                      selected={selLevel?.id === lv.id}
                      onSelect={() => { setSelLevel(lv); setSelYear(null); }}
                      onEdit={() => { setEditLevel({ id: lv.id, name: lv.name, type: lv.type }); setAddingLevel(false); }}
                      onDelete={() => handleDeleteLevel(lv.id)}
                      badge={<Badge variant={TYPE_VARIANT[lv.type] || 'gray'}>{t(`structure.type_${lv.type}`)}</Badge>}
                    />
                  )
                ))}
              </div>
            </div>

            {/* Panel 2 — Years */}
            <div className="struct-panel">
              <div className="struct-panel-header">
                <span className="struct-panel-title">{t('structure.years')}</span>
                {selLevel && (
                  <button className="btn btn-primary btn-sm" onClick={() => { setAddingYear(true); setEditYear(null); }}>
                    <Plus size={13} />
                  </button>
                )}
              </div>

              {!selLevel && <div className="struct-empty">{t('structure.no_years')}</div>}

              {selLevel && addingYear && (
                <InlineForm
                  value={newYearName}
                  onChange={setNewYearName}
                  onSave={handleAddYear}
                  onCancel={() => setAddingYear(false)}
                  placeholder={t('structure.year_name')}
                />
              )}

              {selLevel && (
                <div className="struct-list">
                  {years.length === 0 && !addingYear && <div className="struct-empty">{t('common.no_data')}</div>}
                  {years.map(yr => (
                    editYear?.id === yr.id ? (
                      <InlineForm
                        key={yr.id}
                        value={editYear.name}
                        onChange={name => setEditYear(f => ({ ...f, name }))}
                        onSave={handleUpdateYear}
                        onCancel={() => setEditYear(null)}
                        placeholder={t('structure.year_name')}
                      />
                    ) : (
                      <PanelRow
                        key={yr.id}
                        label={yr.name}
                        selected={selYear?.id === yr.id}
                        onSelect={() => setSelYear(yr)}
                        onEdit={() => { setEditYear({ id: yr.id, name: yr.name }); setAddingYear(false); }}
                        onDelete={() => handleDeleteYear(yr.id)}
                        badge={yr.student_count > 0 ? <Badge variant="gray">{yr.student_count}</Badge> : null}
                      />
                    )
                  ))}
                </div>
              )}
            </div>

            {/* Panel 3 — Groups */}
            <div className="struct-panel">
              <div className="struct-panel-header">
                <span className="struct-panel-title">{t('structure.groups')}</span>
                {selYear && (
                  <button className="btn btn-primary btn-sm" onClick={openAddGroup}>
                    <Plus size={13} />
                  </button>
                )}
              </div>

              {!selYear && <div className="struct-empty">{t('structure.no_groups')}</div>}

              {selYear && (
                <div className="struct-list">
                  {groups.length === 0 && <div className="struct-empty">{t('common.no_data')}</div>}
                  {groups.map(gr => (
                    <PanelRow
                      key={gr.id}
                      label={
                        <span>
                          {gr.name}
                          {gr.next_session_date && (
                            <span style={{ display:'block', fontSize:11, color:'var(--primary)', fontWeight:400, marginTop:1 }}>
                              {new Date(gr.next_session_date + 'T00:00:00').toLocaleDateString('fr-DZ', { weekday:'short', day:'numeric', month:'short' })}
                            </span>
                          )}
                        </span>
                      }
                      selected={selGroup?.id === gr.id}
                      onSelect={() => openGroupDetail(gr)}
                      onEdit={() => openEditGroup(gr)}
                      onDelete={() => handleDeleteGroup(gr.id)}
                      badge={
                        <span style={{ display:'flex', gap:4, alignItems:'center', flexShrink:0 }}>
                          {gr.module_name && <Badge variant="blue">{gr.module_name}</Badge>}
                          {gr.student_count > 0 && <Badge variant="gray">{gr.student_count}</Badge>}
                        </span>
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Group detail cards (inline, below panels) ── */}
        {tab === 'structure' && selGroup && (() => {
          const todayStr = new Date().toISOString().slice(0,10);
          const pastSessions = groupSessions.filter(s => s.date < todayStr).slice(-3);
          const upcomingSessions = groupSessions.filter(s => s.date >= todayStr).slice(0, 3);
          const displayedSessions = [...pastSessions, ...upcomingSessions];
          const searchedStudents = studentSearch.trim()
            ? availableStudents.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()))
            : availableStudents;

          return (
            <div className="struct-detail-row">

              {/* Card 1 — Students */}
              <div className="struct-detail-card">
                <div className="struct-panel-header">
                  <div>
                    <div className="struct-panel-title">{selGroup.name}</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:1 }}>
                      {selGroup.module_name && `${selGroup.module_name} · `}{selGroup.teacher_name || 'Aucun enseignant'}
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {!groupDetailLoading && (
                      <span className="struct-student-count">{groupStudents.length} élèves</span>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => openEditGroup(selGroup)}><Edit size={13} /></button>
                  </div>
                </div>

                {/* Search to add */}
                {availableStudents.length > 0 && (
                  <div className="struct-add-student-wrap">
                    <div className="struct-add-student-input-wrap">
                      <Plus size={14} style={{ color:'var(--text-muted)', flexShrink:0 }} />
                      <input
                        className="struct-add-student-input"
                        placeholder="Rechercher un élève à ajouter…"
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                      />
                      {studentSearch && (
                        <button className="btn btn-ghost btn-sm" style={{ padding:'0 4px' }} onClick={() => setStudentSearch('')}>
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    {studentSearch && (
                      <div className="struct-add-student-results">
                        {searchedStudents.length === 0 ? (
                          <div className="struct-add-student-empty">Aucun résultat</div>
                        ) : (
                          searchedStudents.slice(0, 8).map(s => (
                            <button key={s.id} className="struct-add-student-result" onClick={() => handleAddStudent(s.id)}>
                              <span className="struct-stud-avatar">{s.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</span>
                              <span>{s.name}</span>
                              <Plus size={13} style={{ marginLeft:'auto', color:'var(--primary)', flexShrink:0 }} />
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Student list */}
                <div className="struct-detail-list">
                  {groupDetailLoading ? (
                    <div className="struct-empty">Chargement…</div>
                  ) : groupStudents.length === 0 ? (
                    <div className="struct-empty">Aucun élève dans ce groupe</div>
                  ) : (
                    groupStudents.map(s => (
                      <div key={s.id} className="struct-detail-student-row">
                        <span className="struct-stud-avatar">{s.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.name}</div>
                          {s.phone && <div style={{ fontSize:12, color:'var(--text-muted)' }}>{s.phone}</div>}
                        </div>
                        <button className="btn btn-ghost btn-sm struct-remove-btn"
                          onClick={() => handleRemoveStudent(s.id)} title="Retirer du groupe">
                          <X size={13} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Card 2 — Sessions */}
              <div className="struct-detail-card">
                <div className="struct-panel-header">
                  <div>
                    <div className="struct-panel-title">Séances à venir</div>
                    {selGroup.next_session_date && (
                      <div style={{ fontSize:12, color:'var(--primary)', marginTop:1, fontWeight:500 }}>
                        Prochaine : {new Date(selGroup.next_session_date + 'T00:00:00').toLocaleDateString('fr-DZ', { weekday:'short', day:'numeric', month:'short' })}
                      </div>
                    )}
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={openAddSession}>
                    <Plus size={13} /> Ajouter
                  </button>
                </div>

                <div className="struct-detail-list">
                  {groupSessionsLoading ? (
                    <div className="struct-empty">Chargement…</div>
                  ) : displayedSessions.length === 0 ? (
                    <div className="struct-empty">Aucune séance planifiée</div>
                  ) : (
                    <>
                      {pastSessions.length > 0 && upcomingSessions.length > 0 && (
                        <div className="struct-session-divider">— {upcomingSessions.length} à venir · {pastSessions.length} passées —</div>
                      )}
                      {displayedSessions.map(s => {
                        const isPast = s.date < todayStr;
                        const isToday = s.date === todayStr;
                        return (
                          <div key={s.id} className={`struct-detail-session-row${isPast ? ' past' : ''}${isToday ? ' today' : ''}`}>
                            <div className="struct-detail-session-left">
                              <div className="struct-session-dot" style={{ background: isPast ? 'var(--border)' : isToday ? 'var(--primary)' : 'var(--green)' }} />
                              <div>
                                <div style={{ fontSize:13, fontWeight:600 }}>
                                  {new Date(s.date + 'T00:00:00').toLocaleDateString('fr-DZ', { weekday:'short', day:'numeric', month:'short' })}
                                  {isToday && <Badge variant="blue" style={{ marginLeft:6 }}>Aujourd'hui</Badge>}
                                </div>
                                <div style={{ fontSize:12, color:'var(--text-muted)' }}>{s.teacher_name}</div>
                              </div>
                            </div>
                            <div className="struct-session-time">
                              {s.start_time?.slice(0,5)}<span style={{ color:'var(--text-muted)' }}>–</span>{s.end_time?.slice(0,5)}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>

            </div>
          );
        })()}

        {/* ── Modules tab ── */}
        {tab === 'modules' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button className="btn btn-primary" onClick={openAddMod}>
                <Plus size={16} /> {t('structure.add_module')}
              </button>
            </div>
            <div className="table-wrap">
              <div className="table-toolbar">
                <span className="table-title">{t('structure.modules')}</span>
              </div>
              {modules.length === 0 ? (
                <div className="table-empty">{t('common.no_data')}</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>{t('structure.module_name')}</th>
                      <th>{t('structure.level')}</th>
                      <th>{t('structure.year')}</th>
                      <th>{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map(mod => (
                      <ModuleRow
                        key={mod.id}
                        mod={mod}
                        levels={levels}
                        onEdit={openEditMod}
                        onDelete={handleDeleteMod}
                      />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>

      {/* Session add modal */}
      {showSessionModal && (
        <div className="modal-overlay" onClick={() => setShowSessionModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Ajouter une séance — {selGroup?.name}</span>
              <button className="btn btn-ghost" onClick={() => setShowSessionModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveSession}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input type="date" className="form-input" required
                    value={sessionForm.date}
                    onChange={e => setSessionForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <div className="form-group">
                    <label className="form-label">Début</label>
                    <input type="time" className="form-input" required
                      value={sessionForm.start_time}
                      onChange={e => setSessionForm(f => ({ ...f, start_time: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fin</label>
                    <input type="time" className="form-input" required
                      value={sessionForm.end_time}
                      onChange={e => setSessionForm(f => ({ ...f, end_time: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('structure.module_name')}</label>
                  <select className="form-input" required value={sessionForm.module_id}
                    onChange={e => setSessionForm(f => ({ ...f, module_id: e.target.value }))}>
                    <option value="">— choisir —</option>
                    {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('nav.teachers')}</label>
                  <select className="form-input" required value={sessionForm.teacher_id}
                    onChange={e => setSessionForm(f => ({ ...f, teacher_id: e.target.value }))}>
                    <option value="">— choisir —</option>
                    {teachers.map(tc => <option key={tc.id} value={tc.id}>{tc.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowSessionModal(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary">{t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group add/edit modal */}
      {showGroupModal && (
        <div className="modal-overlay" onClick={() => setShowGroupModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editGroup ? t('common.edit') : t('structure.add_group')}</span>
              <button className="btn btn-ghost" onClick={() => setShowGroupModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveGroup}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">{t('structure.group_name')}</label>
                  <input type="text" className="form-input" required
                    value={groupForm.name}
                    onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('structure.module_name')}</label>
                  <select className="form-input" value={groupForm.module_id}
                    onChange={e => setGroupForm(f => ({ ...f, module_id: e.target.value }))}>
                    <option value="">— aucun —</option>
                    {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('nav.teachers')}</label>
                  <select className="form-input" value={groupForm.teacher_id}
                    onChange={e => setGroupForm(f => ({ ...f, teacher_id: e.target.value }))}>
                    <option value="">— aucun —</option>
                    {teachers.map(tc => <option key={tc.id} value={tc.id}>{tc.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowGroupModal(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary">{t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Module modal */}
      {showModModal && (
        <div className="modal-overlay" onClick={() => setShowModModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editMod ? t('common.edit') : t('structure.add_module')}
              </h3>
              <button className="btn btn-ghost" onClick={() => setShowModModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveMod}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">{t('structure.module_name')}</label>
                  <input
                    type="text"
                    className="form-input"
                    required
                    value={modForm.name}
                    onChange={e => setModForm(f => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('structure.level')}</label>
                  <select
                    className="form-input"
                    value={modForm.level_id}
                    onChange={e => setModForm(f => ({ ...f, level_id: e.target.value, year_id: '' }))}
                  >
                    <option value="">{t('common.all')}</option>
                    {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('structure.year')}</label>
                  <select
                    className="form-input"
                    value={modForm.year_id}
                    onChange={e => setModForm(f => ({ ...f, year_id: e.target.value }))}
                    disabled={!modForm.level_id}
                  >
                    <option value="">{t('common.all')}</option>
                    {modLevelYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModModal(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary">{t('common.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
