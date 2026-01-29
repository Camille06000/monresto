import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

type LoginForm = { email: string; password: string };

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn, signingIn, profile } = useAuth();
  const { register, handleSubmit, formState } = useForm<LoginForm>({
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (profile) navigate('/');
  }, [profile, navigate]);

  const onSubmit = async (values: LoginForm) => {
    try {
      await signIn(values);
    } catch (error: any) {
      toast.error(error.message ?? 'Login failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1220] to-[#0f172a] flex items-center justify-center px-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6">
          <p className="text-sm text-gray-400">{t('login.subtitle')}</p>
          <h1 className="text-2xl font-bold text-white">{t('login.title')}</h1>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <Input
            label={t('login.email')}
            type="email"
            placeholder="admin@monresto.com"
            {...register('email', { required: t('forms.required') })}
            error={formState.errors.email?.message}
          />
          <Input
            label={t('login.password')}
            type="password"
            placeholder="••••••••"
            {...register('password', { required: t('forms.required') })}
            error={formState.errors.password?.message}
          />
          <Button type="submit" variant="primary" block disabled={signingIn}>
            {signingIn ? t('login.loading') : t('login.submit')}
          </Button>
        </form>
      </div>
    </div>
  );
}
