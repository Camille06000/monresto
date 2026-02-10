import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { getPasswordStrength } from '../../lib/schemas';

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { t } = useTranslation();
  const { score, checks } = getPasswordStrength(password);

  const getStrengthColor = () => {
    if (score <= 1) return 'bg-red-500';
    if (score === 2) return 'bg-orange-500';
    if (score === 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = () => {
    if (score <= 1) return t('validation.strengthWeak');
    if (score === 2) return t('validation.strengthFair');
    if (score === 3) return t('validation.strengthGood');
    return t('validation.strengthStrong');
  };

  const criteria = [
    { key: 'length', label: t('validation.passwordMin'), met: checks.length },
    { key: 'uppercase', label: t('validation.passwordUppercase'), met: checks.uppercase },
    { key: 'number', label: t('validation.passwordNumber'), met: checks.number },
  ];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Barre de progression */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getStrengthColor()}`}
            style={{ width: `${(score / 4) * 100}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 min-w-[60px]">{getStrengthLabel()}</span>
      </div>

      {/* Criteres */}
      <div className="grid grid-cols-1 gap-1">
        {criteria.map((criterion) => (
          <div
            key={criterion.key}
            className={`flex items-center gap-2 text-xs ${
              criterion.met ? 'text-green-400' : 'text-gray-500'
            }`}
          >
            {criterion.met ? (
              <Check size={12} className="text-green-400" />
            ) : (
              <X size={12} className="text-gray-500" />
            )}
            <span>{criterion.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
