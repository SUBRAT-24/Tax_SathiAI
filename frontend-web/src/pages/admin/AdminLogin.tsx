/**
 * Admin Login — Separate admin login page (no registration).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { adminLogin } from '../../store/authSlice';
import type { RootState, AppDispatch } from '../../store/store';
import { pageVariants, pageTransition, fadeInUp, buttonTap } from '../../animations/variants';
import { Shield, Mail, Lock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading } = useSelector((state: RootState) => state.auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(adminLogin({ email, password }));
    if (adminLogin.fulfilled.match(result)) {
      toast.success('Admin access granted');
      navigate('/admin/dashboard');
    } else {
      toast.error(result.payload as string || 'Invalid credentials');
    }
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}
      style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(220,38,38,0.08) 0%, var(--color-bg-primary) 60%)',
        padding: 20,
      }}>
      <motion.div variants={fadeInUp} initial="hidden" animate="visible" style={{
        width: '100%', maxWidth: 420, padding: 40, background: 'var(--color-bg-glass)',
        backdropFilter: 'blur(30px)', borderRadius: 'var(--border-radius-xl)',
        border: '1px solid rgba(220,38,38,0.15)', boxShadow: 'var(--shadow-xl)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            style={{
              width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #dc2626, #f87171)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <Shield size={26} color="white" />
          </motion.div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>Admin Access</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Restricted — authorized personnel only</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 6, display: 'block' }}>Admin Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--color-text-muted)' }} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="admin@taxsathi.ai" required className="input" style={{ paddingLeft: 42 }} />
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 6, display: 'block' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--color-text-muted)' }} />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required className="input" style={{ paddingLeft: 42 }} />
            </div>
          </div>
          <motion.button {...buttonTap} type="submit" disabled={loading} className="btn"
            style={{
              width: '100%', padding: 12, fontSize: '0.95rem',
              background: 'linear-gradient(135deg, #dc2626, #f87171)', color: 'white',
            }}>
            {loading ? 'Verifying...' : <>Access Admin Panel <ArrowRight size={16} /></>}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
}
