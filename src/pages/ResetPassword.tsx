import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { KeyRound, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { PasswordStrength } from '../components/ui/PasswordStrength';
import { resetPasswordSchema, type ResetPasswordFormValues } from '../lib/schemas';

export function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { updatePassword, updatingPassword } = useAuth();
  const [success, setSuccess] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const password = form.watch('password');

  const onSubmit = async (values: ResetPasswordFormValues) => {
    try {
      await updatePassword(values.password);
      setSuccess(true);
      toast.success(t('auth.passwordUpdated'));
      // Rediriger vers login après 2 secondes
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('alerts.error');
      toast.error(message);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0b1220] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="mx-auto h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t('auth.passwordUpdated')}</h1>
          <p className="text-gray-400">{t('auth.redirecting')}</p>
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
            <KeyRound size={32} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t('auth.resetPassword')}</h1>
          <p className="text-gray-400 mt-2">{t('auth.resetPasswordDescription')}</p>
        </div>

        {/* Form */}
        <div className="glass rounded-2xl p-6">
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div>
              <Input
                label={t('auth.newPassword')}
                type="password"
                placeholder="********"
                {...form.register('password')}
                error={form.formState.errors.password?.message ? t(form.formState.errors.password.message) : undefined}
                autoFocus
              />
              <PasswordStrength password={password} />
            </div>

            <Input
              label={t('auth.confirmPassword')}
              type="password"
              placeholder="********"
              {...form.register('confirmPassword')}
              error={form.formState.errors.confirmPassword?.message ? t(form.formState.errors.confirmPassword.message) : undefined}
            />

            <Button
              type="submit"
              variant="primary"
              block
              disabled={updatingPassword}
            >
              {updatingPassword ? t('common.loading') : t('auth.updatePassword')}
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
