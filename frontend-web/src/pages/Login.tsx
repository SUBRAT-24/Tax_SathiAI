import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../store/authSlice';
import type { RootState, AppDispatch } from '../store/store';
import { pageVariants } from '../animations/variants';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Button, Input } from '../components/ui';
import toast from 'react-hot-toast';
import styles from './Auth.module.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading } = useSelector((state: RootState) => state.auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(loginUser({ email, password }));
    if (loginUser.fulfilled.match(result)) {
      toast.success('Welcome back');
      navigate('/chat');
    } else {
      toast.error(result.payload as string || 'Login failed');
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
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <div className={styles.authHeader}>
            <Link to="/" className={styles.authLogo}>
              <span className={styles.authLogoText}>TaxSathi</span>
              <span className={styles.authLogoRupee}>₹</span>
            </Link>
            <h1 className={styles.authTitle}>Log in to your account</h1>
          </div>

          <form onSubmit={handleSubmit} className={styles.authForm}>
            <Input
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />

            <div style={{ position: 'relative' }}>
              <Input
                type={showPw ? 'text' : 'password'}
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
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

            <Button type="submit" loading={loading} size="lg" style={{ width: '100%' }}>
              {loading ? 'Signing in...' : (
                <>Log In <ArrowRight size={18} strokeWidth={1.5} /></>
              )}
            </Button>
          </form>

          <div className={styles.authFooter}>
            <p>
              Don't have an account?{' '}
              <Link to="/register" className={styles.authLink}>
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
