import { useTranslation } from 'react-i18next';
import { LogOut, Globe2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useStore } from '../../store/useStore';

const languages = [
  { code: 'fr', label: 'FR' },
  { code: 'th', label: 'TH' },
  { code: 'en', label: 'EN' }
];

export function Header() {
  const { t, i18n } = useTranslation();
  const { signOut } = useAuth();
  const { language, setLanguage } = useStore();

  const changeLang = (code: string) => {
    i18n.changeLanguage(code);
    setLanguage(code as any);
  };

  return (
    <header className="sticky top-0 z-20 bg-[#0b1220]/80 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-primary">
          {t('app.title').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="text-sm text-gray-300">{t('app.tagline')}</p>
          <p className="font-semibold text-white text-lg leading-tight">{t('app.title')}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 glass px-2 py-1 rounded-xl">
          <Globe2 size={18} className="text-primary" />
          <select
            className="bg-transparent text-white text-sm focus:outline-none"
            value={language}
            onChange={(e) => changeLang(e.target.value)}
          >
            {languages.map((lng) => (
              <option key={lng.code} value={lng.code} className="text-black">
                {lng.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-2 text-sm text-white bg-white/10 px-3 py-2 rounded-xl hover:bg-white/20"
        >
          <LogOut size={16} />
          {t('app.logout')}
        </button>
      </div>
    </header>
  );
}
