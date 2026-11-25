/**
 * TaxSathi AI — Main App Component
 * React Router + AnimatePresence + Theme/User Hydration + Providers
 */

import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { store, type AppDispatch } from './store/store';
import { fetchUser } from './store/authSlice';
import { applyTheme, getInitialTheme } from './utils/theme';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Tools from './pages/Tools';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

// Admin pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import KnowledgeBase from './pages/admin/KnowledgeBase';
import ActivityTracker from './pages/admin/ActivityTracker';
import SecurityPanel from './pages/admin/SecurityPanel';
import AppSettings from './pages/admin/AppSettings';

// Layouts
import { AppLayout, AdminLayout } from './components/layouts';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 5 * 60 * 1000 },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuth = !!localStorage.getItem('access_token');
  if (!isAuth) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const isAdmin = !!localStorage.getItem('admin_token');
  if (!isAdmin) return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}

function AppBootstrap() {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    applyTheme(getInitialTheme());
    if (localStorage.getItem('access_token')) {
      dispatch(fetchUser());
    }
  }, [dispatch]);

  return null;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected User Routes */}
        <Route path="/chat" element={<ProtectedRoute><AppLayout><Chat /></AppLayout></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><AppLayout><Documents /></AppLayout></ProtectedRoute>} />
        <Route path="/tools" element={<ProtectedRoute><AppLayout><Tools /></AppLayout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<AdminRoute><AdminLayout><AdminDashboard /></AdminLayout></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminLayout><UserManagement /></AdminLayout></AdminRoute>} />
        <Route path="/admin/knowledge-base" element={<AdminRoute><AdminLayout><KnowledgeBase /></AdminLayout></AdminRoute>} />
        <Route path="/admin/activity" element={<AdminRoute><AdminLayout><ActivityTracker /></AdminLayout></AdminRoute>} />
        <Route path="/admin/security" element={<AdminRoute><AdminLayout><SecurityPanel /></AdminLayout></AdminRoute>} />
        <Route path="/admin/settings" element={<AdminRoute><AdminLayout><AppSettings /></AdminLayout></AdminRoute>} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AppBootstrap />
          <AnimatedRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--surface)',
                color: 'var(--ink)',
                border: '1px solid var(--rule)',
                borderRadius: 'var(--radius)',
                fontSize: 'var(--text-sm)',
                boxShadow: 'var(--shadow-popover)',
              },
              success: { iconTheme: { primary: 'var(--accent)', secondary: 'var(--surface)' } },
              error: { iconTheme: { primary: 'var(--danger)', secondary: 'var(--surface)' } },
            }}
          />
        </Router>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
