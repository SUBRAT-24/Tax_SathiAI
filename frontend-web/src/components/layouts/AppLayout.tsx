import { useState, type ReactNode } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  MessageSquare,
  LayoutDashboard,
  FileText,
  Wrench,
  User,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  Plus,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { RootState } from '../../store/store';
import { logout } from '../../store/authSlice';
import { clearMessages } from '../../store/chatSlice';
import { useTheme } from '../../utils/theme';
import { Button } from '../ui';
import styles from './AppLayout.module.css';

const navItems = [
  { path: '/chat', icon: MessageSquare, label: 'AI Tax Assistant' },
  { path: '/dashboard', icon: LayoutDashboard, label: 'Compliance Dashboard' },
  { path: '/tools', icon: Wrench, label: 'GST Statutory Tools' },
  { path: '/documents', icon: FileText, label: 'Documents Vault' },
  { path: '/profile', icon: User, label: 'Profile & Security' },
];

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleNewChat = () => {
    dispatch(clearMessages());
    setSidebarOpen(false);
    navigate('/chat');
  };

  return (
    <div className={styles.layout}>
      {/* Mobile Top Bar */}
      <header className={styles.mobileTopBar}>
        <Link to="/dashboard" className={styles.logoBrand}>
          <div className={styles.logoMark}>₹</div>
          <div>
            <div className={styles.logoText}>TaxSathi</div>
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
          <Link to="/" className={styles.logoBrand}>
            <div className={styles.logoMark}>₹</div>
            <div>
              <div className={styles.logoText}>TaxSathi AI</div>
              <div className={styles.logoSub}>Statutory Ledger</div>
            </div>
          </Link>
        </div>

        <div style={{ padding: '12px 16px 4px' }}>
          <Button
            variant="primary"
            size="sm"
            onClick={handleNewChat}
            style={{ width: '100%' }}
          >
            <Plus size={16} /> New Statutory Query
          </Button>
        </div>

        <nav className={styles.nav} aria-label="Main navigation">
          <div className={styles.navSectionLabel}>Workspace</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.active : ''}`
                }
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={18} strokeWidth={1.75} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className={styles.sidebarFooter}>
          <Link
            to="/profile"
            className={styles.userCard}
            onClick={() => setSidebarOpen(false)}
          >
            <div className={styles.userAvatar}>
              {(user?.name?.charAt(0) || 'T').toUpperCase()}
            </div>
            <div className={styles.userMeta}>
              <div className={styles.userName}>{user?.name || 'Taxpayer Account'}</div>
              <div className={styles.userSub}>
                {user?.gstin || user?.email || 'Manage profile'}
              </div>
            </div>
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
              title="Sign Out"
            >
              <LogOut size={15} strokeWidth={1.75} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
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

      {/* Main content */}
      <main className={styles.main}>{children}</main>
    </div>
  );
}
