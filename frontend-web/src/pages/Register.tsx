/**
 * Register Page — Multi-field registration with animations.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser } from '../store/authSlice';
import type { RootState, AppDispatch } from '../store/store';
import { pageVariants, pageTransition, fadeInUp, buttonTap } from '../animations/variants';
import { Sparkles, Mail, Lock, User, Phone, ArrowRight, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [showPw, setShowPw] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading } = useSelector((state: RootState) => state.auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(registerUser(form));
    if (registerUser.fulfilled.match(result)) {
      toast.success('Account created!');
      navigate('/chat');
    } else {
      toast.error(result.payload as string || 'Registration failed');
    }
  };

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value });

  return (
    <motion.div
      variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}
      style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.1) 0%, var(--color-bg-primary) 60%)',
        padding: 20,
      }}
    >
      <motion.div variants={fadeInUp} initial="hidden" animate="visible" style={{
        width: '100%', maxWidth: 440, padding: 40,
        background: 'var(--color-bg-glass)', backdropFilter: 'blur(30px)',
        borderRadius: 'var(--border-radius-xl)', border: '1px solid rgba(148,163,184,0.1)',
        boxShadow: 'var(--shadow-xl)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            style={{
              width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px',
              background: 'var(--gradient-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Sparkles size={26} color="white" />
          </motion.div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>Create Account</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Start your GST compliance journey</p>
        </div>

        <form onSubmit={handleSubmit}>
          {[
            { key: 'name', label: 'Full Name', icon: User, type: 'text', placeholder: 'John Doe' },
            { key: 'email', label: 'Email', icon: Mail, type: 'email', placeholder: 'your@email.com' },
            { key: 'phone', label: 'Phone (Optional)', icon: Phone, type: 'tel', placeholder: '+91 98765 43210' },
          ].map((field, i) => {
            const Icon = field.icon;
            return (
              <motion.div
                key={field.key}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                style={{ marginBottom: 16 }}
              >
                <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 6, display: 'block' }}>
                  {field.label}
                </label>
                <div style={{ position: 'relative' }}>
                  <Icon size={18} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--color-text-muted)' }} />
                  <input
                    type={field.type}
                    value={form[field.key as keyof typeof form]}
                    onChange={update(field.key)}
                    placeholder={field.placeholder}
                    required={field.key !== 'phone'}
                    className="input"
                    style={{ paddingLeft: 42 }}
                  />
                </div>
              </motion.div>
            );
          })}

          <motion.div
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            style={{ marginBottom: 24 }}
          >
            <label style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 6, display: 'block' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 14, top: 12, color: 'var(--color-text-muted)' }} />
              <input
                type={showPw ? 'text' : 'password'} value={form.password}
                onChange={update('password')} placeholder="Min 6 characters"
                required minLength={6} className="input"
                style={{ paddingLeft: 42, paddingRight: 42 }}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{
                position: 'absolute', right: 12, top: 10, background: 'transparent', color: 'var(--color-text-muted)',
              }}>
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </motion.div>

          <motion.button {...buttonTap} type="submit" disabled={loading}
            className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '0.95rem' }}>
            {loading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                style={{ width: 20, height: 20, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} />
            ) : (
              <>Create Account <ArrowRight size={16} /></>
            )}
          </motion.button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
