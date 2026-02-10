import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../lib/schemas';

export function ForgotPassword() {
  const { t } = useTranslation();
  const { requestPasswordReset, requestingPasswordReset } = useAuth();
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    try {
      await requestPasswordReset(values.email);
      setSentEmail(values.email);
      setEmailSent(true);
      toast.success(t('auth.resetLinkSent'));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('alerts.error');
      toast.error(message);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen bg-[#0b1220] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t('auth.checkEmail')}</h1>
          <p className="text-gray-400">
            {t('auth.resetLinkSentTo', { email: sentEmail })}
          </p>
          <div className="space-y-3">
            <Button
              variant="secondary"
              block
              onClick={() => {
                setEmailSent(false);
                form.reset();
              }}
            >
              {t('auth.sendAgain')}
            </Button>
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-primary hover:text-primary/80 transition-colors"
            >
              <ArrowLeft size={16} />
              {t('auth.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1220] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center mb-4">
            <Mail size={32} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t('auth.forgotPassword')}</h1>
          <p className="text-gray-400 mt-2">{t('auth.forgotPasswordDescription')}</p>
        </div>

        {/* Form */}
        <div className="glass rounded-2xl p-6">
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <Input
              label={t('login.email')}
              type="email"
              placeholder="email@example.com"
              {...form.register('email')}
              error={form.formState.errors.email?.message ? t(form.formState.errors.email.message) : undefined}
              autoFocus
            />

            <Button
              type="submit"
              variant="primary"
              block
              disabled={requestingPasswordReset}
            >
              {requestingPasswordReset ? t('common.loading') : t('auth.sendResetLink')}
            </Button>
          </form>
        </div>

        {/* Back to login */}
        <div className="text-center">
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            {t('auth.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}
