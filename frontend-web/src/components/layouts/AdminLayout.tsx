import { useState, type ReactNode } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  BarChart3,
  Users,
  Database,
  Activity,
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  ArrowUpRight,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { adminLogout } from '../../store/authSlice';
import { useTheme } from '../../utils/theme';
import { Button } from '../ui';
import styles from './AppLayout.module.css';

const adminNavItems = [
  { path: '/admin/dashboard', icon: BarChart3, label: 'Overview & Analytics' },
  { path: '/admin/users', icon: Users, label: 'User Management' },
  { path: '/admin/knowledge-base', icon: Database, label: 'Knowledge Base' },
  { path: '/admin/activity', icon: Activity, label: 'Activity & Heatmap' },
  { path: '/admin/security', icon: Shield, label: 'Security & Audit' },
  { path: '/admin/settings', icon: Settings, label: 'App Settings' },
];

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    dispatch(adminLogout());
    navigate('/admin/login');
  };

  return (
    <div className={styles.layout}>
      {/* Mobile Top Bar */}
      <header className={styles.mobileTopBar}>
        <Link to="/admin/dashboard" className={styles.logoBrand}>
          <div className={`${styles.logoMark} ${styles.logoMarkAdmin}`}>
            <Shield size={18} />
          </div>
          <div>
            <div className={styles.logoText}>TaxSathi Admin</div>
          </div>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={toggleTheme}
            className={styles.themeToggleBtn}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <Button
            variant="secondary"
            size="sm"
            className={styles.mobileMenuButton}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            iconOnly
            aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </Button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
        <div className={styles.logo}>
          <Link to="/admin/dashboard" className={styles.logoBrand}>
            <div className={`${styles.logoMark} ${styles.logoMarkAdmin}`}>
              <Shield size={18} />
            </div>
            <div>
              <div className={styles.logoText}>TaxSathi Admin</div>
              <div className={styles.logoSub}>Control Console</div>
            </div>
          </Link>
        </div>

        <nav className={styles.nav} aria-label="Admin navigation">
          <div className={styles.navSectionLabel}>Administration</div>
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `${styles.navLink} ${styles.navLinkAdmin} ${isActive ? styles.active : ''}`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={18} strokeWidth={1.75} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link
            to="/"
            className={styles.themeToggleBtn}
            style={{ justifyContent: 'space-between', textDecoration: 'none' }}
          >
            <span>Public Portal</span>
            <ArrowUpRight size={14} />
          </Link>
          <div className={styles.footerActions}>
            <button
              type="button"
              onClick={toggleTheme}
              className={styles.themeToggleBtn}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className={styles.logoutButton}
              title="Admin Logout"
            >
              <LogOut size={15} strokeWidth={1.75} />
              <span>Admin Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
