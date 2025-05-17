import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
  Lighthouse, Dashboard, Students, Teachers, Sessions,
  Attendance, Payments, Expenses, Settings, Layers, Payroll, History, BookOpen, LogOut
} from './Icons';

const NAV_ITEMS = [
  { path: '/sessions',   icon: Sessions,    key: 'sessions' },
  { path: '/dashboard',  icon: Dashboard,   key: 'dashboard',  adminOnly: true },
  { path: '/students',   icon: Students,    key: 'students' },
  { path: '/teachers',   icon: Teachers,    key: 'teachers' },
  { path: '/structure',  icon: Layers,      key: 'structure' },
  { path: '/attendance', icon: Attendance,  key: 'attendance' },
  { path: '/payments',   icon: Payments,    key: 'payments' },
  { path: '/payroll',    icon: Payroll,     key: 'payroll' },
  { path: '/expenses',   icon: Expenses,    key: 'expenses',   adminOnly: true },
  { path: '/audit-log',  icon: History,     key: 'audit',      adminOnly: true },
];

export default function Sidebar() {
  const location = useLocation();
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isTeacher = !!user?.teacher_id;

  const isActive = (path) => {
    if (path === '/home' || path === '/teacher') return location.pathname === path;
    if (path === '/sessions') return location.pathname === '/' || location.pathname === '/sessions';
    return location.pathname.startsWith(path);
  };

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const visibleItems = NAV_ITEMS.filter(item => !item.adminOnly || isAdmin);

  // Teacher-only simplified sidebar
  if (isTeacher) {
    return (
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Lighthouse size={28} color="var(--primary)" />
          <span>{t('app.name')}</span>
        </div>

        <div className="sidebar-section">
          <Link
            to="/teacher"
            className={`nav-item${isActive('/teacher') ? ' active' : ''}`}
          >
            <Dashboard size={18} />
            <span>{t('teacher_portal.title')}</span>
          </Link>
        </div>

        <div className="sidebar-bottom">
          {user && (
            <div className="sidebar-user" style={{ marginTop: 8 }}>
              <div className="sidebar-user-info">
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--primary-soft)', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 12, flexShrink: 0,
                }}>
                  {initials}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="sidebar-user-name">{user.name}</div>
                  <div className="sidebar-user-school">{user.school_name}</div>
                </div>
              </div>
              <button
                onClick={logout}
                className="nav-item sidebar-logout"
                title={t('nav.logout')}
              >
                <LogOut size={18} />
                <span>{t('nav.logout')}</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Lighthouse size={28} color="var(--primary)" />
        <span>{t('app.name')}</span>
      </div>

      <div className="sidebar-section">
        {visibleItems.map(({ path, icon: Icon, key }) => (
          <Link
            key={path}
            to={path}
            className={`nav-item${isActive(path) ? ' active' : ''}`}
          >
            <Icon size={18} />
            <span>{t(`nav.${key}`)}</span>
          </Link>
        ))}
      </div>

      <div className="sidebar-bottom">
        <Link
          to="/manual"
          className={`nav-item${isActive('/manual') ? ' active' : ''}`}
        >
          <BookOpen size={18} />
          <span>{t('nav.manual')}</span>
        </Link>
        <Link
          to="/settings"
          className={`nav-item${isActive('/settings') ? ' active' : ''}`}
        >
          <Settings size={18} />
          <span>{t('nav.settings')}</span>
        </Link>

        {user && (
          <div className="sidebar-user" style={{ marginTop: 8 }}>
            <div className="sidebar-user-info">
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--primary-soft)', color: 'var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 12, flexShrink: 0,
              }}>
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="sidebar-user-name">{user.name}</div>
                <div className="sidebar-user-school">{user.school_name}</div>
              </div>
            </div>
            <button
              onClick={logout}
              className="nav-item sidebar-logout"
              title={t('nav.logout')}
            >
              <LogOut size={18} />
              <span>{t('nav.logout')}</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
