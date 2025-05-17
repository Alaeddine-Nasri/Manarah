import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav>
      <div>
        <span>{t('app.name')}</span>
        <div>
          <Link to="/">{t('nav.dashboard')}</Link>
          <Link to="/students">{t('nav.students')}</Link>
          <Link to="/teachers">{t('nav.teachers')}</Link>
          <Link to="/modules">{t('nav.modules')}</Link>
          <Link to="/sessions">{t('nav.sessions')}</Link>
          <Link to="/payments">{t('nav.payments')}</Link>
          <Link to="/attendance">{t('nav.attendance')}</Link>
        </div>
        <div>
          <select value={i18n.language} onChange={(e) => i18n.changeLanguage(e.target.value)}>
            <option value="fr">FR</option>
            <option value="ar">AR</option>
            <option value="en">EN</option>
          </select>
          <button onClick={handleLogout}>{t('nav.logout')}</button>
        </div>
      </div>
    </nav>
  );
}
