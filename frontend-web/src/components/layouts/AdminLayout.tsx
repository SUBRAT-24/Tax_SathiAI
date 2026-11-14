import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Users, Settings, Shield, BarChart3, Activity } from 'lucide-react';
import styles from './AppLayout.module.css';

const adminNavItems = [
  { path: '/admin/users', icon: Users, label: 'Users' },
  { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/admin/security', icon: Shield, label: 'Security' },
  { path: '/admin/activity', icon: Activity, label: 'Activity' },
  { path: '/admin/settings', icon: Settings, label: 'Settings' },
];

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <span className={styles.logoText}>TaxSathi Admin</span>
        </div>
        <nav className={styles.nav}>
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => 
                  `${styles.navLink} ${isActive ? styles.active : ''}`
                }
              >
                <Icon size={18} strokeWidth={1.5} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className={styles.main}>{children}</main>
    </div>
  );
}
