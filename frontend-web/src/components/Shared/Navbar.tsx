/**
 * Navbar — Top navigation bar with scroll-hide effect.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store/store';
import { logout } from '../../store/authSlice';
import { navbarVariants, scaleTap } from '../../animations/variants';
import {
  Bell, Search, LogOut, User, ChevronDown
} from 'lucide-react';

export default function Navbar() {
  const [hidden, setHidden] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { scrollY } = useScroll();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user } = useSelector((state: RootState) => state.auth);

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const previous = scrollY.getPrevious() ?? 0;
    setHidden(latest > previous && latest > 100);
  });

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <motion.nav
      variants={navbarVariants}
      animate={hidden ? 'hidden' : 'visible'}
      style={{
        position: 'fixed',
        top: 0,
        left: 260,
        right: 0,
        height: 70,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: 'rgba(10, 14, 26, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
      }}
    >
      {/* Search */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius-md)',
        padding: '8px 16px',
        width: 400,
      }}>
        <Search size={18} color="var(--color-text-muted)" />
        <input
          type="text"
          placeholder="Search queries, documents..."
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-primary)',
            width: '100%',
            fontSize: '0.9rem',
          }}
        />
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Notifications */}
        <motion.button {...scaleTap} className="btn-icon" style={{ position: 'relative' }}>
          <Bell size={20} />
          <span style={{
            position: 'absolute', top: -2, right: -2, width: 8, height: 8,
            background: 'var(--color-error)', borderRadius: '50%',
          }} />
        </motion.button>

        {/* Profile dropdown */}
        <div style={{ position: 'relative' }}>
          <motion.button
            {...scaleTap}
            onClick={() => setShowProfile(!showProfile)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--color-surface)', padding: '6px 12px',
              borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)',
              color: 'var(--color-text-primary)',
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--gradient-primary)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem',
              fontWeight: 700, color: 'white',
            }}>
              {user?.name?.charAt(0) || 'U'}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{user?.name || 'User'}</span>
            <ChevronDown size={14} />
          </motion.button>

          {showProfile && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              style={{
                position: 'absolute', right: 0, top: 48, width: 200,
                background: 'var(--color-bg-tertiary)', borderRadius: 'var(--border-radius-md)',
                border: '1px solid var(--border-color)', padding: 8, zIndex: 300,
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              <Link to="/profile" style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                borderRadius: 6, color: 'var(--color-text-secondary)',
                fontSize: '0.85rem',
              }} onClick={() => setShowProfile(false)}>
                <User size={16} /> Profile
              </Link>
              <button onClick={handleLogout} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                borderRadius: 6, color: 'var(--color-error)', width: '100%',
                fontSize: '0.85rem', background: 'transparent',
              }}>
                <LogOut size={16} /> Logout
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
