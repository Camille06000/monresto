import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

type AuthForm = { email: string; password: string; fullName?: string };

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn, signingIn, signUp, signingUp, profile } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const { register, handleSubmit, formState, reset } = useForm<AuthForm>({
    defaultValues: { email: '', password: '', fullName: '' },
  });

  useEffect(() => {
    if (profile) navigate('/');
  }, [profile, navigate]);

  const onSubmit = async (values: AuthForm) => {
    try {
      if (isRegister) {
        await signUp(values);
        toast.success(t('login.registered'));
      } else {
        await signIn(values);
      }
    } catch (error: any) {
      toast.error(error.message ?? t('alerts.error'));
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    reset();
  };

  const isLoading = signingIn || signingUp;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b1220] to-[#0f172a] flex items-center justify-center px-4">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6">
          <p className="text-sm text-gray-400">
            {isRegister ? t('login.registerSubtitle') : t('login.subtitle')}
          </p>
          <h1 className="text-2xl font-bold text-white">
            {isRegister ? t('login.registerTitle') : t('login.title')}
          </h1>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {isRegister && (
            <Input
              label={t('login.fullName')}
              type="text"
              placeholder="Jean Dupont"
              {...register('fullName')}
              error={formState.errors.fullName?.message}
            />
          )}
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
            {...register('password', {
              required: t('forms.required'),
              minLength: isRegister ? { value: 6, message: t('login.passwordMinLength') } : undefined
            })}
            error={formState.errors.password?.message}
          />
          <Button type="submit" variant="primary" block disabled={isLoading}>
            {isLoading
              ? t('login.loading')
              : isRegister
              ? t('login.registerSubmit')
              : t('login.submit')}
          </Button>
        </form>
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={toggleMode}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            {isRegister ? t('login.hasAccount') : t('login.noAccount')}
          </button>
        </div>
      </div>
    </div>
  );
}
