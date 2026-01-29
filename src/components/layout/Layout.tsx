import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

export function Layout() {
  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      <div className="flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          <Header />
          <main className="flex-1 px-4 py-4 pb-24 lg:pb-8 max-w-6xl mx-auto w-full">
            <Outlet />
          </main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
