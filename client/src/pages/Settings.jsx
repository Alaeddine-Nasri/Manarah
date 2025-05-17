import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../components/Layout';
import Badge from '../components/Badge';
import { Moon, Sun, Globe, Plus, Trash, Key } from '../components/Icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getUsers, createUser, updateUserRole, setUserPassword, removeUser } from '../api/users';
import { getSchoolInfo, updateSchoolInfo } from '../api/schools';

const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
];

const ROLE_LABELS = { admin: 'Administrateur', staff: 'Personnel', teacher: 'Enseignant' };
const ROLE_VARIANTS = { admin: 'blue', staff: 'gray', teacher: 'purple' };

const emptyUserForm = { name: '', email: '', password: '', role: 'staff' };

export default function Settings() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [showAddUser, setShowAddUser] = useState(false);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [savingUser, setSavingUser] = useState(false);
  const [userError, setUserError] = useState('');

  // password modal
  const [pwTarget, setPwTarget] = useState(null); // { id, name }
  const [pwValue, setPwValue] = useState('');
  const [pwShow, setPwShow] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');

  const isAdmin = user?.role === 'admin';

  // school info
  const [school, setSchool] = useState(null);
  const [schoolEdit, setSchoolEdit] = useState(false);
  const [schoolForm, setSchoolForm] = useState({ name: '', location: '' });
  const [schoolSaving, setSchoolSaving] = useState(false);

  useEffect(() => {
    if (isAdmin) { loadUsers(); loadSchool(); }
  }, [isAdmin]);

  async function loadSchool() {
    try {
      const res = await getSchoolInfo();
      setSchool(res.data);
      setSchoolForm({ name: res.data.name || '', location: res.data.location || '' });
    } catch (err) {
      console.error('loadSchool error:', err);
    }
  }

  async function handleSchoolSave(e) {
    e.preventDefault();
    setSchoolSaving(true);
    try {
      await updateSchoolInfo(schoolForm);
      setSchool(prev => ({ ...prev, ...schoolForm }));
      setSchoolEdit(false);
    } catch { /* ignore */ }
    finally { setSchoolSaving(false); }
  }

  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const res = await getUsers();
      setUsers(res.data || []);
    } catch {
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function handleAddUser(e) {
    e.preventDefault();
    setUserError('');
    setSavingUser(true);
    try {
      const res = await createUser(userForm);
      setUsers(prev => [...prev, res.data]);
      setShowAddUser(false);
      setUserForm(emptyUserForm);
    } catch (err) {
      setUserError(err.response?.data?.message || t('common.error'));
    } finally {
      setSavingUser(false);
    }
  }

  async function handleRoleChange(id, role) {
    try {
      await updateUserRole(id, role);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    } catch { /* ignore */ }
  }

  function openPwModal(u) {
    setPwTarget(u);
    setPwValue('teacher123');
    setPwShow(true);
    setPwError('');
  }

  async function handleSetPassword(e) {
    e.preventDefault();
    if (pwValue.length < 6) { setPwError('Minimum 6 caractères'); return; }
    setPwSaving(true);
    setPwError('');
    try {
      await setUserPassword(pwTarget.id, pwValue);
      setPwTarget(null);
    } catch (err) {
      setPwError(err.response?.data?.message || 'Erreur');
    } finally {
      setPwSaving(false);
    }
  }

  async function handleRemoveUser(id) {
    if (!window.confirm(t('common.confirm_delete'))) return;
    try {
      await removeUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch { /* ignore */ }
  }

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <div className="breadcrumb">
            <span className="breadcrumb-current">{t('settings.title')}</span>
          </div>
        </div>

        {/* Appearance */}
        <div className="settings-section">
          <h2 className="settings-section-title">{t('settings.appearance')}</h2>
          <div className="settings-theme-cards">
            <button
              className={`theme-card ${theme === 'light' ? 'active' : ''}`}
              onClick={() => theme !== 'light' && toggleTheme()}
            >
              <Sun size={22} />
              <span>{t('settings.light_mode')}</span>
            </button>
            <button
              className={`theme-card ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => theme !== 'dark' && toggleTheme()}
            >
              <Moon size={22} />
              <span>{t('settings.dark_mode')}</span>
            </button>
          </div>
        </div>

        {/* Language */}
        <div className="settings-section">
          <h2 className="settings-section-title">
            <Globe size={16} style={{ marginInlineEnd: 6 }} />
            {t('settings.language')}
          </h2>
          <div className="settings-lang-btns">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                className={`btn ${i18n.language === lang.code ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => i18n.changeLanguage(lang.code)}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Profile */}
        <div className="settings-section">
          <h2 className="settings-section-title">{t('settings.profile')}</h2>
          <div className="settings-profile-card">
            <div className="student-avatar" style={{ width: 48, height: 48, fontSize: 18, flexShrink: 0 }}>
              {user?.name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>{user?.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user?.email}</div>
              <div style={{ marginTop: 6 }}>
                <Badge variant={user?.role === 'admin' ? 'blue' : 'gray'}>
                  {ROLE_LABELS[user?.role] || user?.role}
                </Badge>
                {user?.school_name && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginInlineStart: 8 }}>
                    {user.school_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* School Info (admin only) */}
        {isAdmin && school && (
          <div className="settings-section">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
              <h2 className="settings-section-title" style={{ marginBottom:0 }}>Mon école</h2>
              {!schoolEdit && (
                <button className="btn btn-ghost btn-sm" onClick={() => setSchoolEdit(true)}>Modifier</button>
              )}
            </div>

            {schoolEdit ? (
              <form onSubmit={handleSchoolSave}>
                <div className="form-group">
                  <label className="form-label">Nom de l'école</label>
                  <input className="form-input" value={schoolForm.name}
                    onChange={e => setSchoolForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Localisation</label>
                  <input className="form-input" placeholder="Ville, Wilaya…" value={schoolForm.location}
                    onChange={e => setSchoolForm(f => ({ ...f, location: e.target.value }))} />
                </div>
                <div style={{ display:'flex', gap:8, marginTop:12 }}>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={schoolSaving}>
                    {schoolSaving ? '…' : 'Enregistrer'}
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSchoolEdit(false)}>
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
                {/* School card */}
                <div style={{
                  flex:1, minWidth:220,
                  background:'linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%)',
                  borderRadius:'var(--r-lg)', padding:'20px 24px', color:'#fff',
                  display:'flex', flexDirection:'column', gap:6,
                }}>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:1, opacity:.75, textTransform:'uppercase' }}>
                    École
                  </div>
                  <div style={{ fontSize:20, fontWeight:800, lineHeight:1.2 }}>{school.name}</div>
                  {school.location && (
                    <div style={{ fontSize:13, opacity:.85, marginTop:2 }}>📍 {school.location}</div>
                  )}
                  <div style={{ fontSize:11, opacity:.65, marginTop:4 }}>Code : {school.code}</div>
                </div>

                {/* Stats */}
                <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                  {[
                    { label:'Élèves', value: school.student_count, color:'var(--green)', bg:'var(--green-soft)' },
                    { label:'Enseignants', value: school.teacher_count, color:'var(--primary)', bg:'var(--primary-soft)' },
                    { label:'Groupes', value: school.group_count, color:'var(--orange)', bg:'var(--orange-soft)' },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} style={{
                      background: bg, borderRadius:'var(--r)', padding:'14px 18px',
                      display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                      minWidth:90,
                    }}>
                      <span style={{ fontSize:24, fontWeight:800, color }}>{value}</span>
                      <span style={{ fontSize:11, color, fontWeight:600 }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* School Users (admin only) */}
        {isAdmin && (
          <div className="settings-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 className="settings-section-title" style={{ marginBottom: 0 }}>
                {t('settings.school_users')}
              </h2>
              <button className="btn btn-primary btn-sm" onClick={() => { setShowAddUser(true); setUserError(''); setUserForm(emptyUserForm); }}>
                <Plus size={14} /> {t('settings.add_user')}
              </button>
            </div>

            <div className="table-wrap" style={{ marginTop: 0 }}>
              {loadingUsers ? (
                <div className="table-empty">{t('common.loading')}</div>
              ) : users.length === 0 ? (
                <div className="table-empty">{t('common.no_data')}</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>{t('settings.name')}</th>
                      <th>{t('settings.email')}</th>
                      <th>{t('settings.role')}</th>
                      <th>{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="student-avatar" style={{ width: 32, height: 32, fontSize: 13, flexShrink: 0 }}>
                              {u.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            {u.name}
                          </div>
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{u.email}</td>
                        <td>
                          {u.id === user?.id || u.role === 'teacher' ? (
                            <Badge variant={ROLE_VARIANTS[u.role] || 'gray'}>
                              {ROLE_LABELS[u.role] || u.role}
                            </Badge>
                          ) : (
                            <select
                              className="form-input"
                              style={{ padding: '4px 8px', height: 'auto', fontSize: 13 }}
                              value={u.role}
                              onChange={e => handleRoleChange(u.id, e.target.value)}
                            >
                              <option value="admin">{t('settings.role_admin')}</option>
                              <option value="staff">{t('settings.role_staff')}</option>
                              <option value="teacher">{t('settings.role_teacher')}</option>
                            </select>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => openPwModal(u)}
                              title="Définir le mot de passe"
                            >
                              <Key size={14} />
                            </button>
                            {u.id !== user?.id && (
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleRemoveUser(u.id)}
                                title={t('common.delete')}
                              >
                                <Trash size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddUser && (
        <div className="modal-overlay" onClick={() => setShowAddUser(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{t('settings.add_user')}</h3>
              <button className="btn btn-ghost" onClick={() => setShowAddUser(false)}>✕</button>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="modal-body">
                {userError && (
                  <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{userError}</div>
                )}
                <div className="form-group">
                  <label className="form-label">{t('settings.name')}</label>
                  <input type="text" className="form-input" required
                    value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('settings.email')}</label>
                  <input type="email" className="form-input" required
                    value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('settings.password')}</label>
                  <input type="password" className="form-input" required
                    value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('settings.role')}</label>
                  <select className="form-input" value={userForm.role}
                    onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="staff">{t('settings.role_staff')}</option>
                    <option value="admin">{t('settings.role_admin')}</option>
                    <option value="teacher">{t('settings.role_teacher')}</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddUser(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingUser}>
                  {savingUser ? t('common.loading') : t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Set Password Modal */}
      {pwTarget && (
        <div className="modal-overlay" onClick={() => setPwTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h3 className="modal-title">Définir le mot de passe</h3>
              <button className="btn btn-ghost" onClick={() => setPwTarget(null)}>✕</button>
            </div>
            <form onSubmit={handleSetPassword}>
              <div className="modal-body">
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                  {pwTarget.name} — {pwTarget.email}
                </div>
                {pwError && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10 }}>{pwError}</div>}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Nouveau mot de passe</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={pwShow ? 'text' : 'password'}
                      className="form-input"
                      required
                      minLength={6}
                      value={pwValue}
                      onChange={e => setPwValue(e.target.value)}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setPwShow(v => !v)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}
                    >
                      {pwShow ? 'Masquer' : 'Afficher'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setPwTarget(null)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={pwSaving}>
                  {pwSaving ? t('common.loading') : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
