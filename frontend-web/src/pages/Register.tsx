import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser } from '../store/authSlice';
import type { RootState, AppDispatch } from '../store/store';
import { pageVariants } from '../animations/variants';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Sun, Moon } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { useTheme } from '../utils/theme';
import toast from 'react-hot-toast';
import styles from './Auth.module.css';

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', gstin: '' });
  const [showPw, setShowPw] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading } = useSelector((state: RootState) => state.auth);
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.name.trim().length < 2) {
      toast.error('Name must be at least 2 characters');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (form.gstin.trim() && !GSTIN_REGEX.test(form.gstin.trim().toUpperCase())) {
      toast.error('GSTIN must be a valid 15-character GSTIN or left blank');
      return;
    }

    const result = await dispatch(
      registerUser({
        ...form,
        gstin: form.gstin.trim().toUpperCase() || undefined,
      })
    );
    if (registerUser.fulfilled.match(result)) {
      toast.success('Account created');
      navigate('/chat');
    } else {
      toast.error((result.payload as string) || 'Registration failed');
    }
  };

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = field === 'gstin' ? e.target.value.toUpperCase() : e.target.value;
    setForm({ ...form, [field]: val });
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
              <h1 className={styles.authTitle}>Create your account</h1>
              <p className={styles.authSubtitle}>
                Start querying CBIC statutes and verifying GST compliance.
              </p>
            </div>

            <form onSubmit={handleSubmit} className={styles.authForm}>
              <Input
                type="text"
                label="Full Name"
                value={form.name}
                onChange={update('name')}
                placeholder="CA Priya Sharma"
                required
              />

              <Input
                type="email"
                label="Email"
                value={form.email}
                onChange={update('email')}
                placeholder="you@company.com"
                required
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Input
                  type="tel"
                  label="Phone (Optional)"
                  value={form.phone}
                  onChange={update('phone')}
                  placeholder="+91 98765 43210"
                />
                <Input
                  type="text"
                  label="GSTIN (Optional)"
                  value={form.gstin}
                  onChange={update('gstin')}
                  placeholder="27AAAPL1234C1ZV"
                  maxLength={15}
                />
              </div>

              <div className={styles.passwordField}>
                <Input
                  type={showPw ? 'text' : 'password'}
                  label="Password"
                  value={form.password}
                  onChange={update('password')}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className={styles.passwordToggle}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
                </button>
                <div className={styles.hint}>Minimum 6 characters required</div>
              </div>

              <Button type="submit" loading={loading} size="lg" style={{ width: '100%', marginTop: 4 }}>
                {loading ? 'Creating account...' : (
                  <>Create Free Account <ArrowRight size={18} strokeWidth={1.5} /></>
                )}
              </Button>
            </form>

            <div className={styles.authFooter}>
              <p>
                Already have an account?{' '}
                <Link to="/login" className={styles.authLink}>
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
