import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, Outlet, ScrollRestoration, useLocation } from 'react-router-dom';
import { useSessionBootstrap } from './api/session';
import {
  AdminPageSkeleton,
  CartSkeleton,
  CategoriesSkeleton,
  DashboardSkeleton,
  DetailPanelsSkeleton,
  FormSkeleton,
  OrderListSkeleton,
  PageSkeleton,
  ProductDetailSkeleton,
} from './components/Skeletons';
import { RouteError } from './components/RouteError';
import { StoreLayout } from './layouts/StoreLayout';
import HomePage from './pages/HomePage';
import { useAuth } from './store/auth';

function page(load: () => Promise<{ default: ComponentType }>, fallback: ReactNode = <PageSkeleton />) {
  const Component = lazy(load);
  return (
    <Suspense fallback={fallback}>
      <Component />
    </Suspense>
  );
}

function RequireAuth({ admin = false }: { admin?: boolean }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return admin ? <div className="p-4 md:p-6"><DashboardSkeleton /></div> : <PageSkeleton />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  return <Outlet />;
}

function Root() {
  useSessionBootstrap();
  return (
    <>
      <Outlet />
      <ScrollRestoration />
    </>
  );
}

const routes = [
  {
    element: <StoreLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/categories', element: page(() => import('./pages/CategoriesPage'), <CategoriesSkeleton />) },
      { path: '/products', element: page(() => import('./pages/ProductsPage')) },
      { path: '/products/:slug', element: page(() => import('./pages/ProductDetailPage'), <ProductDetailSkeleton />) },
      { path: '/cart', element: page(() => import('./pages/CartPage'), <CartSkeleton />) },
      { path: '/track', element: page(() => import('./pages/TrackOrderPage')) },
      { path: '/login', element: page(() => import('./pages/LoginPage')) },
      { path: '/register', element: page(() => import('./pages/RegisterPage')) },
      { path: '/forgot-password', element: page(() => import('./pages/ForgotPasswordPage')) },
      { path: '/reset-password', element: page(() => import('./pages/ResetPasswordPage')) },
      { path: '/policies/:slug', element: page(() => import('./pages/PolicyPage')) },
      {
        element: <RequireAuth />,
        children: [
          { path: '/checkout', element: page(() => import('./pages/CheckoutPage'), <CartSkeleton />) },
          { path: '/wishlist', element: page(() => import('./pages/WishlistPage')) },
          { path: '/account', element: page(() => import('./pages/account/ProfilePage')) },
          { path: '/account/orders', element: page(() => import('./pages/account/OrdersPage'), <OrderListSkeleton />) },
          { path: '/account/orders/:id', element: page(() => import('./pages/account/OrderDetailPage'), <DetailPanelsSkeleton />) },
        ],
      },
      { path: '*', element: page(() => import('./pages/NotFoundPage')) },
    ],
  },
  {
    path: '/admin',
    element: <RequireAuth admin />,
    children: [
      {
        element: page(() => import('./layouts/AdminLayout'), <div className="p-4 md:p-6"><DashboardSkeleton /></div>),
        children: [
          { index: true, element: page(() => import('./pages/admin/DashboardPage'), <DashboardSkeleton />) },
          { path: 'products', element: page(() => import('./pages/admin/ProductsPage'), <AdminPageSkeleton stats={6} />) },
          { path: 'products/:id', element: page(() => import('./pages/admin/ProductFormPage'), <FormSkeleton sections={3} className="w-full" />) },
          { path: 'categories', element: page(() => import('./pages/admin/CategoriesPage'), <AdminPageSkeleton stats={6} />) },
          { path: 'categories/:id', element: page(() => import('./pages/admin/CategoryFormPage'), <FormSkeleton className="w-full" />) },
          { path: 'orders', element: page(() => import('./pages/admin/OrdersPage'), <AdminPageSkeleton stats={8} />) },
          { path: 'orders/:id', element: page(() => import('./pages/admin/OrderDetailPage'), <DetailPanelsSkeleton className="" />) },
          { path: 'coupons', element: page(() => import('./pages/admin/CouponsPage'), <AdminPageSkeleton stats={6} />) },
          { path: 'coupons/:id', element: page(() => import('./pages/admin/CouponFormPage'), <FormSkeleton className="w-full" />) },
          { path: 'content', element: page(() => import('./pages/admin/ContentPage'), <AdminPageSkeleton stats={3} />) },
          { path: 'content/:id', element: page(() => import('./pages/admin/BannerFormPage'), <FormSkeleton className="w-full" />) },
          { path: 'users', element: page(() => import('./pages/admin/UsersPage'), <AdminPageSkeleton stats={6} />) },
          { path: 'users/:id', element: page(() => import('./pages/admin/UserFormPage'), <FormSkeleton className="w-full" />) },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter([
  { element: <Root />, errorElement: <RouteError />, children: routes },
]);
