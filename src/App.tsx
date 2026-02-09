import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { Layout } from './components/layout/Layout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Lazy load pages for code-splitting
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/purchases" element={<Purchases />} />
                <Route path="/sales" element={<Sales />} />
                <Route path="/stock" element={<Stock />} />
                <Route path="/dishes" element={<Dishes />} />
                <Route path="/products" element={<Products />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/fixed-charges" element={<FixedCharges />} />
                <Route path="/daily-report" element={<DailyReport />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster position="top-right" />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
