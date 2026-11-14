import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser } from '../store/authSlice';
import type { RootState, AppDispatch } from '../store/store';
import { pageVariants } from '../animations/variants';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Button, Input } from '../components/ui';
import toast from 'react-hot-toast';
import styles from './Auth.module.css';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [showPw, setShowPw] = useState(false);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading } = useSelector((state: RootState) => state.auth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    const result = await dispatch(registerUser(form));
    if (registerUser.fulfilled.match(result)) {
      toast.success('Account created');
      navigate('/chat');
    } else {
      const errorMsg = result.payload as string || 'Registration failed';
      toast.error(errorMsg);
      console.error('Registration error:', errorMsg);
    }
  };

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value });

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
            <h1 className={styles.authTitle}>Create your account</h1>
          </div>

          <form onSubmit={handleSubmit} className={styles.authForm}>
            <Input
              type="text"
              label="Full Name"
              value={form.name}
              onChange={update('name')}
              placeholder="Your full name"
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

            <Input
              type="tel"
              label="Phone (Optional)"
              value={form.phone}
              onChange={update('phone')}
              placeholder="+91 98765 43210"
            />

            <div style={{ position: 'relative' }}>
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
            </div>

            <Button type="submit" loading={loading} size="lg" style={{ width: '100%' }}>
              {loading ? 'Creating account...' : (
                <>Sign Up <ArrowRight size={18} strokeWidth={1.5} /></>
              )}
            </Button>
          </form>

          <div className={styles.authFooter}>
            <p>
              Already have an account?{' '}
              <Link to="/login" className={styles.authLink}>
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
