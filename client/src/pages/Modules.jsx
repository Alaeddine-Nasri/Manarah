import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';

export default function Modules() {
  const { t } = useTranslation();

  return (
    <div>
      <Navbar />
      <main>
        <h1>{t('modules.title')}</h1>
      </main>
    </div>
  );
}
