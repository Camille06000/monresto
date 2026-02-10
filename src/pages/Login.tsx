import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { PasswordStrength } from '../components/ui/PasswordStrength';
import {
  loginSchema,
  registerSchema,
  type LoginFormValues,
  type RegisterFormValues,
} from '../lib/schemas';

type FormMode = 'login' | 'register';

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn, signingIn, signUp, signingUp, profile } = useAuth();
  const [mode, setMode] = useState<FormMode>('login');

  const isRegister = mode === 'register';

  // Formulaire login
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Formulaire register
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', fullName: '' },
  });

  const password = registerForm.watch('password');

  useEffect(() => {
    if (profile) navigate('/');
  }, [profile, navigate]);

  const onLoginSubmit = async (values: LoginFormValues) => {
    try {
      await signIn(values);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('alerts.error');
      // Detecter si email non confirme
      if (message.toLowerCase().includes('email not confirmed')) {
        toast.error(t('auth.emailNotConfirmed'));
      } else {
        toast.error(message);
      }
    }
  };

  const onRegisterSubmit = async (values: RegisterFormValues) => {
    try {
      await signUp(values);
      toast.success(t('login.registered'));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t('alerts.error');
      toast.error(message);
    }
  };

  const toggleMode = () => {
    setMode(isRegister ? 'login' : 'register');
    loginForm.reset();
    registerForm.reset();
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

        {isRegister ? (
          // Formulaire d'inscription
          <form className="space-y-4" onSubmit={registerForm.handleSubmit(onRegisterSubmit)}>
            <Input
              label={t('login.fullName')}
              type="text"
              placeholder="Jean Dupont"
              {...registerForm.register('fullName')}
              error={
                registerForm.formState.errors.fullName?.message
                  ? t(registerForm.formState.errors.fullName.message)
                  : undefined
              }
              autoFocus
            />
            <Input
              label={t('login.email')}
              type="email"
              placeholder="email@example.com"
              {...registerForm.register('email')}
              error={
                registerForm.formState.errors.email?.message
                  ? t(registerForm.formState.errors.email.message)
                  : undefined
              }
            />
            <div>
              <Input
                label={t('login.password')}
                type="password"
                placeholder="********"
                {...registerForm.register('password')}
                error={
                  registerForm.formState.errors.password?.message
                    ? t(registerForm.formState.errors.password.message)
                    : undefined
                }
              />
              <PasswordStrength password={password} />
            </div>
            <Button type="submit" variant="primary" block disabled={isLoading}>
              {isLoading ? t('login.loading') : t('login.registerSubmit')}
            </Button>
          </form>
        ) : (
          // Formulaire de connexion
          <form className="space-y-4" onSubmit={loginForm.handleSubmit(onLoginSubmit)}>
            <Input
              label={t('login.email')}
              type="email"
              placeholder="email@example.com"
              {...loginForm.register('email')}
              error={
                loginForm.formState.errors.email?.message
                  ? t(loginForm.formState.errors.email.message)
                  : undefined
              }
              autoFocus
            />
            <Input
              label={t('login.password')}
              type="password"
              placeholder="********"
              {...loginForm.register('password')}
              error={
                loginForm.formState.errors.password?.message
                  ? t(loginForm.formState.errors.password.message)
                  : undefined
              }
            />

            {/* Lien mot de passe oublie */}
            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <Button type="submit" variant="primary" block disabled={isLoading}>
              {isLoading ? t('login.loading') : t('login.submit')}
            </Button>
          </form>
        )}

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
