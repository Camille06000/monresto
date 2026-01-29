import { useTranslation } from 'react-i18next';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { useStore } from '../store/useStore';
import i18n from '../i18n';

const languages = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'th', label: 'ไทย' },
];

export function Settings() {
  const { t } = useTranslation();
  const { language, setLanguage } = useStore();

  const changeLang = (code: string) => {
    i18n.changeLanguage(code);
    setLanguage(code as any);
  };

  return (
    <div className="space-y-4 pb-16">
      <div>
        <p className="text-sm text-gray-400">{t('settings.title')}</p>
        <h1 className="text-2xl font-bold text-white">{t('settings.title')}</h1>
      </div>

      <Card title={t('settings.language')}>
        <Select value={language} onChange={(e) => changeLang(e.target.value)}>
          {languages.map((lng) => (
            <option key={lng.code} value={lng.code} className="text-black">
              {lng.label}
            </option>
          ))}
        </Select>
      </Card>
    </div>
  );
}
