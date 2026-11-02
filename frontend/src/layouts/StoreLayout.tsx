import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { Footer } from './Footer';
import { Header } from './Header';

export function StoreLayout() {
  useEffect(() => {
    document.title = 'Dali | Everything in One Basket';
  }, []);
  return (
    <div className="flex min-h-screen flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-2">
        Skip to content
      </a>
      <Header />
      <main id="main" className="flex-1 overflow-x-clip">
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
