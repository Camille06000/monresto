import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { LogOut, Globe2, Building2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useStore } from '../../store/useStore';

const languages = [
  { code: 'fr', label: 'FR' },
  { code: 'th', label: 'TH' },
  { code: 'en', label: 'EN' }
];

export function Header() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { language, setLanguage, currentRestaurant } = useStore();

  const changeLang = (code: string) => {
    i18n.changeLanguage(code);
    setLanguage(code as any);
  };

  return (
    <header className="sticky top-0 z-20 bg-[#0b1220]/80 backdrop-blur-xl border-b border-white/10 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={() => navigate('/restaurant')}
          className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl sm:rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-primary text-sm sm:text-base hover:bg-primary/30 transition-colors"
          title={t('restaurant.switch')}
        >
          {currentRestaurant?.name.slice(0, 2).toUpperCase() || <Building2 size={18} />}
        </button>
        <div className="hidden sm:block">
          <p className="text-sm text-gray-300">{currentRestaurant?.name || t('restaurant.noRestaurant')}</p>
          <p className="font-semibold text-white text-lg leading-tight">{t('app.title')}</p>
        </div>
        <p className="sm:hidden font-semibold text-white text-base truncate max-w-[120px]">
          {currentRestaurant?.name || t('app.title')}
        </p>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1 sm:gap-2 glass px-2 py-1 rounded-lg sm:rounded-xl">
          <Globe2 size={16} className="text-primary sm:w-[18px] sm:h-[18px]" />
          <select
            className="bg-transparent text-white text-xs sm:text-sm focus:outline-none w-8 sm:w-auto"
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
          className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-white bg-white/10 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl hover:bg-white/20"
        >
          <LogOut size={14} className="sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">{t('app.logout')}</span>
        </button>
      </div>
    </header>
  );
}
