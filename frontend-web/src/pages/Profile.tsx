/**
 * Profile Page — User profile with editable fields and change password.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { fetchUser } from '../store/authSlice';
import { pageVariants, pageTransition, fadeInUp, buttonTap } from '../animations/variants';
import { User, Phone, Shield, Key, Save, Calendar } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();
  const [form, setForm] = useState({ name: '', phone: '', gstin: '', pan: '' });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', phone: user.phone || '', gstin: user.gstin || '', pan: '' });
    }
  }, [user]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.put('/auth/me', form);
      dispatch(fetchUser());
      toast.success('Profile updated');
    } catch { toast.error('Update failed'); }
    setSaving(false);
  };

  const changePassword = async () => {
    if (!pwForm.current_password || !pwForm.new_password) return;
    try {
      await api.post('/auth/change-password', pwForm);
      toast.success('Password changed');
      setPwForm({ current_password: '', new_password: '' });
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed');
    }
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
      <motion.h1 variants={fadeInUp} initial="hidden" animate="visible"
        style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 32 }}>Profile</motion.h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 900 }}>
        {/* Profile Info */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" style={{
          padding: 28, borderRadius: 'var(--border-radius-lg)', background: 'var(--color-bg-glass)',
          backdropFilter: 'blur(20px)', border: '1px solid var(--border-color)',
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={20} color="var(--color-primary)" /> Personal Info
          </h2>
          {[
            { key: 'name', label: 'Full Name', icon: User, type: 'text' },
            { key: 'phone', label: 'Phone', icon: Phone, type: 'tel' },
            { key: 'gstin', label: 'GSTIN', icon: Shield, type: 'text' },
            { key: 'pan', label: 'PAN', icon: Shield, type: 'text' },
          ].map((field) => (
            <div key={field.key} style={{ marginBottom: 16 }}>
              <label style={{ fontSize: '0.83rem', color: 'var(--color-text-secondary)', marginBottom: 6, display: 'block' }}>
                {field.label}
              </label>
              <input className="input" type={field.type}
                value={form[field.key as keyof typeof form]}
                onChange={e => setForm({...form, [field.key]: e.target.value})}
                placeholder={field.label} />
            </div>
          ))}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.83rem', color: 'var(--color-text-secondary)', marginBottom: 6, display: 'block' }}>Email</label>
            <input className="input" type="email" value={user?.email || ''} disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          </div>
          <motion.button {...buttonTap} onClick={saveProfile} disabled={saving}
            className="btn btn-primary" style={{ width: '100%' }}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
          </motion.button>
        </motion.div>

        {/* Change Password */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" transition={{ delay: 0.1 }} style={{
          padding: 28, borderRadius: 'var(--border-radius-lg)', background: 'var(--color-bg-glass)',
          backdropFilter: 'blur(20px)', border: '1px solid var(--border-color)', height: 'fit-content',
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key size={20} color="var(--color-warning)" /> Change Password
          </h2>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: '0.83rem', color: 'var(--color-text-secondary)', marginBottom: 6, display: 'block' }}>Current Password</label>
            <input className="input" type="password" value={pwForm.current_password}
              onChange={e => setPwForm({...pwForm, current_password: e.target.value})} placeholder="••••••••" />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: '0.83rem', color: 'var(--color-text-secondary)', marginBottom: 6, display: 'block' }}>New Password</label>
            <input className="input" type="password" value={pwForm.new_password}
              onChange={e => setPwForm({...pwForm, new_password: e.target.value})} placeholder="Min 6 characters" />
          </div>
          <motion.button {...buttonTap} onClick={changePassword} className="btn btn-secondary" style={{ width: '100%' }}>
            <Key size={16} /> Change Password
          </motion.button>

          {/* Account info */}
          <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Account Details</h3>
            <div style={{ fontSize: '0.83rem', color: 'var(--color-text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Calendar size={14} /> Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Shield size={14} /> Role: {user?.role || 'user'}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
