import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../store/authSlice';
import type { RootState, AppDispatch } from '../store/store';
import { pageVariants } from '../animations/variants';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Sun, Moon } from 'lucide-react';
import { Button, Input, Modal } from '../components/ui';
import { useTheme } from '../utils/theme';
import api from '../utils/api';
import toast from 'react-hot-toast';
import styles from './Auth.module.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  // Forgot / Reset password modal state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading } = useSelector((state: RootState) => state.auth);
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(loginUser({ email, password }));
    if (loginUser.fulfilled.match(result)) {
      toast.success('Welcome back to TaxSathi');
      navigate('/chat');
    } else {
      toast.error((result.payload as string) || 'Login failed');
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetBusy(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email: resetEmail });
      if (data.data?.reset_token) {
        setResetToken(data.data.reset_token);
        toast.success('Reset token generated. Enter your new password below.');
      } else {
        toast.success('If the email exists, reset instructions have been issued.');
      }
      setResetStep('confirm');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Could not initiate password reset');
    } finally {
      setResetBusy(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setResetBusy(true);
    try {
      await api.post('/auth/reset-password', { token: resetToken, new_password: newPassword });
      toast.success('Password reset successful. You can now log in.');
      setForgotOpen(false);
      setResetStep('request');
      setResetToken('');
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Password reset failed');
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <motion.div
      className={styles.authPage}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className={styles.topBar}>
        <Link to="/" className={styles.backLink}>
          <ArrowLeft size={16} /> Back to home
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          className={styles.themeBtn}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>

      <div className={styles.authCenter}>
        <div className={styles.authContainer}>
          <div className={styles.authCard}>
            <div className={styles.authHeader}>
              <Link to="/" className={styles.authLogo}>
                <div className={styles.authLogoMark}>₹</div>
                <span className={styles.authLogoText}>TaxSathi AI</span>
              </Link>
              <h1 className={styles.authTitle}>Sign in to your ledger</h1>
              <p className={styles.authSubtitle}>
                Access your statutory AI sessions, compliance score, and GST tools.
              </p>
            </div>

            <form onSubmit={handleSubmit} className={styles.authForm}>
              <Input
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
              />

              <div className={styles.passwordField}>
                <Input
                  type={showPw ? 'text' : 'password'}
                  label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className={styles.passwordToggle}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                </button>
              </div>

              <div className={styles.formRow}>
                <button
                  type="button"
                  className={styles.forgotLink}
                  onClick={() => {
                    setResetEmail(email);
                    setResetStep('request');
                    setForgotOpen(true);
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <Button type="submit" loading={loading} size="lg" style={{ width: '100%', marginTop: 4 }}>
                {loading ? 'Signing in...' : (
                  <>Sign In <ArrowRight size={18} strokeWidth={1.5} /></>
                )}
              </Button>
            </form>

            <div className={styles.authFooter}>
              <p>
                New to TaxSathi?{' '}
                <Link to="/register" className={styles.authLink}>
                  Create free account
                </Link>
              </p>
              <p>
                <Link to="/admin/login" className={styles.authLink} style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                  Administrator Console →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title={resetStep === 'request' ? 'Reset Password' : 'Set New Password'}
        size="small"
      >
        {resetStep === 'request' ? (
          <form onSubmit={handleRequestReset} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
              Enter your registered email address to request a password reset token.
            </p>
            <Input
              type="email"
              label="Account Email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
            <Button type="submit" loading={resetBusy} style={{ width: '100%' }}>
              Request Reset Token
            </Button>
          </form>
        ) : (
          <form onSubmit={handleConfirmReset} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input
              label="Reset Token"
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              placeholder="Paste reset token"
              required
            />
            <Input
              type="password"
              label="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="button" variant="secondary" onClick={() => setResetStep('request')}>
                Back
              </Button>
              <Button type="submit" loading={resetBusy} style={{ flex: 1 }}>
                Update Password
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </motion.div>
  );
}
