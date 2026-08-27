/**
 * TaxSathi AI — Main App Component
 * React Router + AnimatePresence + Providers
 */

import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { store } from './store/store';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import Tools from './pages/Tools';
import Profile from './pages/Profile';

// Admin pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import KnowledgeBase from './pages/admin/KnowledgeBase';
import ActivityTracker from './pages/admin/ActivityTracker';
import SecurityPanel from './pages/admin/SecurityPanel';
import AppSettings from './pages/admin/AppSettings';

// Components
import Navbar from './components/Shared/Navbar';
import Sidebar from './components/Shared/Sidebar';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 5 * 60 * 1000 },
  },
});

// Protected Route wrapper
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

// Animated routes
function AnimatedRoutes() {
  const location = useLocation();
  const isAuthPage = ['/login', '/register', '/admin/login', '/'].includes(location.pathname);
  const isAdminPage = location.pathname.startsWith('/admin') && location.pathname !== '/admin/login';
  const isAppPage = !isAuthPage && !isAdminPage;

  return (
    <>
      {isAppPage && <Navbar />}
      {isAppPage && <Sidebar />}

      <div className={isAppPage ? 'app-main' : ''} style={!isAppPage ? { flex: 1, width: '100%' } : {}}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected User Routes */}
            <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
            <Route path="/tools" element={<ProtectedRoute><Tools /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
            <Route path="/admin/knowledge-base" element={<AdminRoute><KnowledgeBase /></AdminRoute>} />
            <Route path="/admin/activity" element={<AdminRoute><ActivityTracker /></AdminRoute>} />
            <Route path="/admin/security" element={<AdminRoute><SecurityPanel /></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AppSettings /></AdminRoute>} />
          </Routes>
        </AnimatePresence>
      </div>
    </>
  );
}

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="app-layout">
            <AnimatedRoutes />
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1e293b',
                color: '#f1f5f9',
                border: '1px solid rgba(148, 163, 184, 0.1)',
                borderRadius: '10px',
                fontSize: '0.9rem',
              },
              success: { iconTheme: { primary: '#34d399', secondary: '#0f172a' } },
              error: { iconTheme: { primary: '#f87171', secondary: '#0f172a' } },
            }}
          />
        </Router>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
