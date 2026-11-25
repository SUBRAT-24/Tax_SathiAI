import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { adminLogin } from '../../store/authSlice';
import type { RootState, AppDispatch } from '../../store/store';
import { pageVariants } from '../../animations/variants';
import { Shield, ArrowRight, ArrowLeft, Eye, EyeOff, Sun, Moon } from 'lucide-react';
import { Button, Input } from '../../components/ui';
import { useTheme } from '../../utils/theme';
import toast from 'react-hot-toast';
import styles from '../Auth.module.css';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading } = useSelector((state: RootState) => state.auth);
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(adminLogin({ email, password }));
    if (adminLogin.fulfilled.match(result)) {
      toast.success('Admin access granted');
      navigate('/admin/dashboard');
    } else {
      toast.error((result.payload as string) || 'Invalid admin credentials');
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
          <ArrowLeft size={16} /> Back to public portal
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
          <div className={styles.authCard} style={{ borderColor: 'rgba(179, 38, 30, 0.35)' }}>
            <div className={styles.authHeader}>
              <div
                className={styles.authLogoMark}
                style={{ background: 'var(--danger)', margin: '0 auto 12px', width: 46, height: 46 }}
              >
                <Shield size={22} />
              </div>
              <h1 className={styles.authTitle}>Admin Control Console</h1>
              <p className={styles.authSubtitle}>Restricted access — authorized administrators only</p>
            </div>

            <form onSubmit={handleSubmit} className={styles.authForm}>
              <Input
                type="email"
                label="Admin Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@taxsathi.ai"
                required
              />

              <div className={styles.passwordField}>
                <Input
                  type={showPw ? 'text' : 'password'}
                  label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  required
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

              <Button
                type="submit"
                variant="danger"
                loading={loading}
                size="lg"
                style={{ width: '100%', marginTop: 6 }}
              >
                {loading ? 'Verifying...' : (
                  <>Access Admin Console <ArrowRight size={17} /></>
                )}
              </Button>
            </form>

            <div className={styles.authFooter}>
              <p>
                Looking for user workspace?{' '}
                <Link to="/login" className={styles.authLink}>
                  User Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
