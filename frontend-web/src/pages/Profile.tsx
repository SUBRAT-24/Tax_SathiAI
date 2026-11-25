import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { Sun, Moon, Save, KeyRound, ShieldCheck } from 'lucide-react';
import type { RootState, AppDispatch } from '../store/store';
import { fetchUser, setUser } from '../store/authSlice';
import { Button, Input, Card, Badge } from '../components/ui';
import { pageVariants } from '../animations/variants';
import { useTheme } from '../utils/theme';
import styles from './Profile.module.css';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function Profile() {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { theme, toggleTheme } = useTheme();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    pan: '',
    gstin: '',
  });
  const [saving, setSaving] = useState(false);

  const [pwForm, setPwForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    if (!user) {
      dispatch(fetchUser());
    }
  }, [user, dispatch]);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        pan: user.pan || '',
        gstin: user.gstin || '',
      });
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const changes: Record<string, string> = {};
    if (form.name !== (user?.name || '')) changes.name = form.name.trim();
    if (form.phone !== (user?.phone || '')) changes.phone = form.phone.trim();
    if (form.pan !== (user?.pan || '')) changes.pan = form.pan.trim().toUpperCase();
    if (form.gstin !== (user?.gstin || '')) changes.gstin = form.gstin.trim().toUpperCase();

    if (Object.keys(changes).length === 0) {
      toast('No changes to save');
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.put('/auth/me', changes);
      if (data.data) {
        dispatch(setUser(data.data));
      } else {
        dispatch(fetchUser());
      }
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.new_password.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }

    setChangingPw(true);
    try {
      await api.post('/auth/change-password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      toast.success('Password updated');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Password update failed');
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <motion.div
      className={styles.profile}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className={styles.kicker}>Account &amp; Entity Details</div>
      <h1 className={styles.title}>Profile &amp; Security</h1>

      <Card className={styles.summaryCard} shadow>
        <div className={styles.summaryLeft}>
          <div className={styles.avatar}>
            {(user?.name?.charAt(0) || 'T').toUpperCase()}
          </div>
          <div>
            <div className={styles.userName}>{user?.name || 'Taxpayer Account'}</div>
            <div className={styles.userMeta}>
              {user?.email}
              {user?.created_at
                ? ` · Member since ${new Date(user.created_at).toLocaleDateString('en-IN')}`
                : ''}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Badge variant={user?.gstin ? 'success' : 'warning'}>
            <ShieldCheck size={12} /> {user?.gstin ? 'GSTIN Linked' : 'GSTIN Missing'}
          </Badge>
          <Badge variant="default">{(user?.role || 'user').toUpperCase()}</Badge>
        </div>
      </Card>

      <div className={styles.grid}>
        <Card className={styles.card} shadow>
          <h2 className={styles.cardTitle}>Taxpayer Details</h2>
          <form onSubmit={handleSave} className={styles.form}>
            <Input
              label="Full Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            <Input
              label="Email Address"
              type="email"
              value={form.email}
              disabled
            />

            <Input
              label="Phone Number"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />

            <div className={styles.row2}>
              <Input
                label="PAN"
                value={form.pan}
                onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
                placeholder="ABCDE1234F"
                maxLength={10}
              />

              <Input
                label="GSTIN"
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                placeholder="27AAAPL1234C1ZV"
                maxLength={15}
              />
            </div>

            <Button type="submit" loading={saving} style={{ marginTop: 6 }}>
              <Save size={15} /> Save Profile Changes
            </Button>
          </form>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Card className={styles.card} shadow>
            <h2 className={styles.cardTitle}>Change Password</h2>
            <form onSubmit={handleChangePassword} className={styles.form}>
              <Input
                type="password"
                label="Current Password"
                value={pwForm.current_password}
                onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                required
              />
              <Input
                type="password"
                label="New Password"
                value={pwForm.new_password}
                onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                minLength={6}
                required
              />
              <Input
                type="password"
                label="Confirm New Password"
                value={pwForm.confirm_password}
                onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                minLength={6}
                required
              />
              <Button type="submit" variant="secondary" loading={changingPw} style={{ marginTop: 4 }}>
                <KeyRound size={15} /> Update Password
              </Button>
            </form>
          </Card>

          <Card className={styles.card} shadow>
            <h2 className={styles.cardTitle}>Appearance</h2>
            <div className={styles.prefRow}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                  {theme === 'light' ? 'Archival Paper (Light)' : 'Obsidian Ledger (Dark)'}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
                  Switch workspace contrast theme
                </div>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={toggleTheme}>
                {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
                {theme === 'light' ? 'Dark' : 'Light'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
