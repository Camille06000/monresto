import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute() {
  const { profile, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-white">
        <Loader2 className="animate-spin mr-2" />
        {t('common.loading')}
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
