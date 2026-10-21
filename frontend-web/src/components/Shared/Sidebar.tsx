/**
 * Sidebar — Left sidebar with navigation links.
 */

import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MessageSquare, LayoutDashboard, FileText, Wrench,
  User, Sparkles, Shield
} from 'lucide-react';

const navItems = [
  { path: '/chat', icon: MessageSquare, label: 'AI Chat' },
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/documents', icon: FileText, label: 'Documents' },
  { path: '/tools', icon: Wrench, label: 'GST Tools' },
  { path: '/profile', icon: User, label: 'Profile' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <motion.aside
      initial={{ x: -280 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: 260,
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid var(--border-color)',
        padding: '20px 12px',
        zIndex: 250,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px', marginBottom: 32,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'var(--gradient-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={20} color="white" />
        </div>
        <div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            <span className="gradient-text">TaxSathi</span> <span style={{ color: 'var(--color-accent)' }}>AI</span>
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: -2 }}>
            GST & Tax Assistant
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, position: 'relative' }}>
        {navItems.map((item, i) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{ position: 'relative', marginBottom: 6 }}
            >
              <NavLink
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 14px',
                  borderRadius: 'var(--border-radius-md)',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  background: 'transparent',
                  textDecoration: 'none',
                  position: 'relative',
                  zIndex: 2,
                  transition: 'color 0.15s ease',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(99, 102, 241, 0.14)',
                      borderRadius: 'var(--border-radius-md)',
                      borderLeft: '3px solid var(--color-primary)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      zIndex: -1,
                      boxShadow: '0 0 16px rgba(99, 102, 241, 0.12)',
                    }}
                  />
                )}
                <Icon size={18} style={{ color: isActive ? 'var(--color-primary-light)' : 'inherit' }} />
                <span>{item.label}</span>
              </NavLink>
            </motion.div>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div style={{
        padding: '16px 12px',
        borderTop: '1px solid var(--border-color)',
      }}>
        <div style={{
          padding: '14px',
          background: 'rgba(99, 102, 241, 0.08)',
          borderRadius: 'var(--border-radius-md)',
          border: '1px solid rgba(99, 102, 241, 0.15)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary-light)',
            marginBottom: 6,
          }}>
            <Shield size={14} />
            Need Help?
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
            Ask our AI about any GST query. Get instant, cited answers.
          </p>
        </div>
      </div>
    </motion.aside>
  );
}
