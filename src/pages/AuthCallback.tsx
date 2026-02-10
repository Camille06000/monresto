import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';

type CallbackStatus = 'loading' | 'success' | 'error';
type CallbackType = 'confirmation' | 'recovery' | 'unknown';

export function AuthCallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [callbackType, setCallbackType] = useState<CallbackType>('unknown');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase gère automatiquement le hash fragment
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        // Vérifier le type de callback via les paramètres URL
        const type = searchParams.get('type');
        const errorDescription = searchParams.get('error_description');

        if (errorDescription) {
          setErrorMessage(errorDescription);
          setStatus('error');
          return;
        }

        if (type === 'recovery') {
          setCallbackType('recovery');
          // Rediriger vers la page de reset password
          if (data.session) {
            navigate('/auth/reset-password');
            return;
          }
        } else if (type === 'signup' || type === 'email_change') {
          setCallbackType('confirmation');
        }

        if (data.session) {
          setStatus('success');
          // Attendre un peu puis rediriger
          setTimeout(() => {
            navigate('/');
          }, 2000);
        } else {
          // Pas de session mais pas d'erreur - probablement une confirmation réussie
          setStatus('success');
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setErrorMessage(err instanceof Error ? err.message : 'Unknown error');
        setStatus('error');
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-[#0b1220] flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {status === 'loading' && (
          <div className="space-y-4">
            <Loader2 size={48} className="animate-spin text-primary mx-auto" />
            <p className="text-gray-400">{t('common.loading')}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <CheckCircle size={32} className="text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              {callbackType === 'confirmation'
                ? t('auth.emailConfirmed')
                : callbackType === 'recovery'
                ? t('auth.redirecting')
                : t('alerts.success')}
            </h1>
            <p className="text-gray-400">{t('auth.redirecting')}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <XCircle size={32} className="text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">{t('alerts.error')}</h1>
            <p className="text-gray-400">{errorMessage || t('auth.callbackError')}</p>
            <Button variant="primary" onClick={() => navigate('/login')}>
              {t('auth.backToLogin')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
