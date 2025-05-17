import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Lighthouse, Moon, Sun, ChevronRight, AlertCircle } from '../components/Icons';
import Badge from '../components/Badge';

export default function Login() {
  const navigate = useNavigate();
  const { login, selectSchool } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [schools, setSchools] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data.requires_school_selection) {
        setSchools(data.schools);
      } else {
        if (data.user.teacher_id) {
          navigate('/teacher');
        } else {
          navigate(data.user.role === 'admin' ? '/' : '/home');
        }
      }
    } catch {
      setError(t('auth.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSchool = async (school_id) => {
    setError('');
    setLoading(true);
    try {
      const data = await selectSchool(email, password, school_id);
      if (data.user.teacher_id) {
        navigate('/teacher');
      } else {
        navigate(data.user.role === 'admin' ? '/' : '/home');
      }
    } catch {
      setError(t('auth.error'));
    } finally {
      setLoading(false);
    }
  };

  const roleVariant = (role) => {
    if (role === 'admin') return 'blue';
    return 'gray';
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Theme toggle top right */}
        <button
          className="topbar-btn login-theme-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Logo */}
        <div className="login-logo">
          <Lighthouse size={32} color="var(--primary)" />
          <span>{t('app.name')}</span>
        </div>

        {!schools ? (
          <>
            <h1 className="login-title">{t('auth.welcome_back')}</h1>
            <p className="login-subtitle">{t('auth.login')}</p>

            {error && (
              <div className="error-msg">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={16} color="var(--red)" />
                  {error}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">{t('auth.email')}</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="you@example.com"
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('auth.password')}</label>
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={loading}
                style={{ justifyContent: 'center', marginTop: 8 }}
              >
                {loading ? t('common.loading') : t('auth.submit')}
              </button>
            </form>
          </>
        ) : (
          <div className="school-picker-overlay">
            <div className="school-picker-header">
              <div className="login-logo" style={{ marginBottom: 0 }}>
                <Lighthouse size={28} color="var(--primary)" />
                <span>{t('app.name')}</span>
              </div>
              <button className="topbar-btn" onClick={toggleTheme} aria-label="Toggle theme">
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            </div>

            <div className="school-picker-body">
              <h1 className="login-title" style={{ textAlign: 'center', marginBottom: 6 }}>
                {t('auth.select_school')}
              </h1>
              <p className="login-subtitle" style={{ textAlign: 'center', marginBottom: 32 }}>{email}</p>

              {error && (
                <div className="error-msg" style={{ maxWidth: 480, margin: '0 auto 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={16} color="var(--red)" /> {error}
                  </div>
                </div>
              )}

              <div className="school-cards">
                {schools.map(school => (
                  <button
                    key={school.id}
                    className="school-card"
                    onClick={() => handleSelectSchool(school.id)}
                    disabled={loading}
                  >
                    <div className="school-card-icon">
                      {(school.name[0] || '?').toUpperCase()}
                    </div>
                    <div className="school-card-info">
                      <div className="school-card-name">{school.name}</div>
                      {school.code && (
                        <div className="school-card-code">{school.code}</div>
                      )}
                    </div>
                    <Badge variant={roleVariant(school.role)}>
                      {school.role === 'admin' ? t('settings.role_admin') : t('settings.role_staff')}
                    </Badge>
                    <ChevronRight size={16} color="var(--text-muted)" />
                  </button>
                ))}
              </div>

              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 28, display: 'flex', margin: '28px auto 0' }}
                onClick={() => { setSchools(null); setError(''); }}
              >
                ← {t('common.cancel')}
              </button>

              <div className="login-footer" style={{ maxWidth: 480, margin: '20px auto 0' }}>
                {['fr', 'ar', 'en'].map(lang => (
                  <button
                    key={lang}
                    className={`btn btn-sm ${i18n.language === lang ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => i18n.changeLanguage(lang)}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Language switcher footer */}
        <div className="login-footer">
          {['fr', 'ar', 'en'].map(lang => (
            <button
              key={lang}
              className={`btn btn-sm ${i18n.language === lang ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => i18n.changeLanguage(lang)}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
