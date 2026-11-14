import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { Button, Input, Card } from '../components/ui';
import { pageVariants } from '../animations/variants';
import styles from './Profile.module.css';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function Profile() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    pan: '',
    gstin: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        pan: user.pan || '',
        gstin: user.gstin || ''
      });
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Only send changed fields
    const changes: any = {};
    if (form.name !== user?.name) changes.name = form.name;
    if (form.phone !== user?.phone) changes.phone = form.phone;
    if (form.pan !== user?.pan) changes.pan = form.pan;
    if (form.gstin !== user?.gstin) changes.gstin = form.gstin;

    if (Object.keys(changes).length === 0) {
      toast('No changes to save');
      setLoading(false);
      return;
    }

    try {
      await api.patch('/users/me', changes);
      toast.success('Profile updated');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setLoading(false);
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
      <h1 className={styles.title}>Profile</h1>

      <Card className={styles.card}>
        <form onSubmit={handleSave} className={styles.form}>
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />

          <Input
            label="Email"
            type="email"
            value={form.email}
            disabled
          />

          <Input
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />

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
            placeholder="22AAAAA0000A1Z5"
            maxLength={15}
          />

          <Button type="submit" loading={loading}>
            Save Changes
          </Button>
        </form>
      </Card>
    </motion.div>
  );
}
