import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Search, Bell, Moon, Sun, DollarSign, Users, Clock, X } from './Icons';
import { getNotifications, markRead, markAllRead, deleteNotification } from '../api/notifications';

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60000);
  const h    = Math.floor(min / 60);
  const d    = Math.floor(h / 24);
  if (d > 0)  return `il y a ${d}j`;
  if (h > 0)  return `il y a ${h}h`;
  if (min > 0) return `il y a ${min} min`;
  return 'à l\'instant';
}

function NotifIcon({ type }) {
  if (type === 'payment_reminder') return <DollarSign size={14} color="var(--orange)" />;
  if (type === 'absence_alert')    return <Users size={14} color="var(--red)" />;
  return <Clock size={14} color="var(--primary)" />;
}

export default function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const [notifs, setNotifs]     = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [bellShaking, setBellShaking] = useState(false);
  const [badgeKey, setBadgeKey] = useState(0);
  const panelRef  = useRef(null);
  const bellRef   = useRef(null);
  const prevUnread = useRef(0);

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const unread = notifs.filter(n => !n.read).length;

  async function load() {
    try {
      const res = await getNotifications();
      const list = res.data || [];
      setNotifs(list);
      const newUnread = list.filter(n => !n.read).length;
      if (newUnread > prevUnread.current) {
        setBellShaking(true);
        setBadgeKey(k => k + 1);
        setTimeout(() => setBellShaking(false), 600);
      }
      prevUnread.current = newUnread;
    } catch { /* ignore */ }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    function handler(e) {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        bellRef.current  && !bellRef.current.contains(e.target)
      ) {
        setPanelOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function handleMarkRead(id) {
    await markRead(id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: 1 } : n));
  }

  async function handleMarkAll() {
    await markAllRead();
    setNotifs(prev => prev.map(n => ({ ...n, read: 1 })));
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    await deleteNotification(id);
    setNotifs(prev => prev.filter(n => n.id !== id));
  }

  return (
    <header className="topbar">
      {/* Search */}
      <div className="topbar-search">
        <Search size={16} color="var(--text-light)" />
        <input
          type="text"
          placeholder={t('common.search') + '...'}
          aria-label="Search"
        />
      </div>

      {/* Actions */}
      <div className="topbar-actions">
        {/* Language switcher */}
        <select
          className="topbar-lang"
          value={i18n.language}
          onChange={e => i18n.changeLanguage(e.target.value)}
          aria-label="Language"
        >
          <option value="fr">FR</option>
          <option value="ar">AR</option>
          <option value="en">EN</option>
        </select>

        {/* Theme toggle */}
        <button
          className="topbar-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Notification bell */}
        <div className="notif-wrap">
          <button
            ref={bellRef}
            className={`topbar-btn${bellShaking ? ' bell-shake' : ''}`}
            aria-label="Notifications"
            onClick={() => setPanelOpen(o => !o)}
          >
            <Bell size={18} />
            {unread > 0 && (
              <span key={badgeKey} className="notif-badge">{unread > 9 ? '9+' : unread}</span>
            )}
          </button>

          {panelOpen && (
            <div ref={panelRef} className="notif-panel">
              <div className="notif-panel-header">
                <span className="notif-panel-title">{t('notifications.title')}</span>
                {unread > 0 && (
                  <button className="notif-mark-all" onClick={handleMarkAll}>
                    {t('notifications.mark_all_read')}
                  </button>
                )}
              </div>

              {notifs.length === 0 ? (
                <div className="notif-empty">{t('notifications.empty')}</div>
              ) : (
                <div className="notif-list">
                  {notifs.map(n => (
                    <div
                      key={n.id}
                      className={`notif-item${n.read ? '' : ' notif-item--unread'}`}
                      onClick={() => !n.read && handleMarkRead(n.id)}
                    >
                      <div className="notif-icon">
                        <NotifIcon type={n.type} />
                      </div>
                      <div className="notif-body">
                        <p className="notif-message">{n.message}</p>
                        <span className="notif-time">{timeAgo(n.created_at)}</span>
                      </div>
                      <button
                        className="notif-dismiss"
                        onClick={e => handleDelete(n.id, e)}
                        title="Supprimer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User avatar */}
        <div className="topbar-avatar" title={user?.name}>
          {initials}
        </div>
      </div>
    </header>
  );
}
