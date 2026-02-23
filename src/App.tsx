import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { RequireRestaurant } from './components/layout/RequireRestaurant';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
import { DeliveryAlertProvider } from './components/DeliveryAlertProvider';
import { useOnlineSync } from './hooks/useOnlineSync';
import { queryClient } from './lib/queryClient';

// Lazy load pages for code-splitting
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const RestaurantSelect = lazy(() => import('./pages/RestaurantSelect').then((m) => ({ default: m.RestaurantSelect })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Purchases = lazy(() => import('./pages/Purchases').then((m) => ({ default: m.Purchases })));
const Sales = lazy(() => import('./pages/Sales').then((m) => ({ default: m.Sales })));
const Stock = lazy(() => import('./pages/Stock').then((m) => ({ default: m.Stock })));
const Dishes = lazy(() => import('./pages/Dishes').then((m) => ({ default: m.Dishes })));
const Products = lazy(() => import('./pages/Products').then((m) => ({ default: m.Products })));
const Analytics = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.Analytics })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const FixedCharges = lazy(() => import('./pages/FixedCharges').then((m) => ({ default: m.FixedCharges })));
const DailyReport = lazy(() => import('./pages/DailyReport').then((m) => ({ default: m.DailyReport })));
const AuthCallback = lazy(() => import('./pages/AuthCallback').then((m) => ({ default: m.AuthCallback })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then((m) => ({ default: m.ResetPassword })));
const Suppliers = lazy(() => import('./pages/Suppliers').then((m) => ({ default: m.Suppliers })));
const CustomerMenu = lazy(() => import('./pages/CustomerMenu').then((m) => ({ default: m.CustomerMenu })));
const KitchenDashboard = lazy(() => import('./pages/KitchenDashboard').then((m) => ({ default: m.KitchenDashboard })));
const DeliveryDashboard = lazy(() => import('./pages/DeliveryDashboard').then((m) => ({ default: m.DeliveryDashboard })));
const DriverView = lazy(() => import('./pages/DriverView').then((m) => ({ default: m.DriverView })));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );
}

function AppInner() {
  // Auto-sync pending offline orders when back online
  useOnlineSync();

  return (
    <>
      <OfflineIndicator />
      <BrowserRouter>
        <DeliveryAlertProvider />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/menu/:slug" element={<CustomerMenu />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<RequireRestaurant />}>
                <Route path="/restaurant" element={<RestaurantSelect />} />
                <Route element={<Layout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/purchases" element={<Purchases />} />
                  <Route path="/sales" element={<Sales />} />
                  <Route path="/stock" element={<Stock />} />
                  <Route path="/dishes" element={<Dishes />} />
                  <Route path="/products" element={<Products />} />
                  <Route path="/suppliers" element={<Suppliers />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/fixed-charges" element={<FixedCharges />} />
                  <Route path="/daily-report" element={<DailyReport />} />
                  <Route path="/kitchen" element={<KitchenDashboard />} />
                  <Route path="/delivery" element={<DeliveryDashboard />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>
            </Route>
            {/* Driver view: protected but no restaurant sidebar layout */}
            <Route element={<ProtectedRoute />}>
              <Route path="/driver" element={<DriverView />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster position="top-right" />
      <PWAUpdatePrompt />
      <ReactQueryDevtools initialIsOpen={false} />
    </>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInner />
    </QueryClientProvider>
  );
}
