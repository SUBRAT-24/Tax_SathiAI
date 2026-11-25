import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  KeyRound,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../utils/api';
import { Card, Button, Badge, Table, Modal, Input } from '../../components/ui';
import { pageVariants } from '../../animations/variants';
import styles from './Admin.module.css';

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Modals
  const [addOpen, setAddOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', phone: '', gstin: '' });

  const [resetUser, setResetUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');

  const [inspectUser, setInspectUser] = useState<any>(null);
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [userInterests, setUserInterests] = useState<any[]>([]);

  const fetchUsers = useCallback(() => {
    adminApi
      .get('/admin/users', { params: { page, limit: 15, search: search || undefined } })
      .then((r) => {
        setUsers(r.data.data?.users || []);
        setTotal(r.data.data?.total || 0);
      })
      .catch(() => toast.error('Failed to load users'));
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleBan = async (userId: number) => {
    try {
      await adminApi.post(`/admin/users/${userId}/ban`, { reason: 'Banned by admin' });
      toast.success('User banned');
      fetchUsers();
    } catch {
      toast.error('Ban failed');
    }
  };

  const handleUnban = async (userId: number) => {
    try {
      await adminApi.post(`/admin/users/${userId}/unban`);
      toast.success('User unbanned');
      fetchUsers();
    } catch {
      toast.error('Unban failed');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.post('/admin/users', {
        ...newUser,
        phone: newUser.phone || undefined,
        gstin: newUser.gstin || undefined,
      });
      toast.success('User created');
      setAddOpen(false);
      setNewUser({ name: '', email: '', password: '', phone: '', gstin: '' });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    try {
      await adminApi.post(`/admin/users/${resetUser.id}/reset-password`, {
        new_password: newPassword,
      });
      toast.success(`Password reset for ${resetUser.email}`);
      setResetUser(null);
      setNewPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Password reset failed');
    }
  };

  const openInspector = async (u: any) => {
    setInspectUser(u);
    setUserActivity([]);
    setUserInterests([]);
    try {
      const [detailRes, actRes, intRes] = await Promise.all([
        adminApi.get(`/admin/users/${u.id}`),
        adminApi.get(`/admin/users/${u.id}/activity`, { params: { limit: 15 } }),
        adminApi.get(`/admin/users/${u.id}/interests`),
      ]);
      setInspectUser(detailRes.data?.data || u);
      setUserActivity(actRes.data?.data || []);
      setUserInterests(intRes.data?.data || []);
    } catch {
      // Keep basic user details
    }
  };

  const handleExport = async () => {
    try {
      const response = await adminApi.get('/admin/users/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'taxsathi_users.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV exported');
    } catch {
      toast.error('Export failed');
    }
  };

  return (
    <motion.div
      className={styles.page}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className={styles.header}>
        <div>
          <div className={styles.kicker}>Directory</div>
          <h1 className={styles.title}>User Management</h1>
          <p className={styles.subtitle}>Manage taxpayer accounts, inspect query interests, and export records.</p>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <Download size={15} /> Export CSV
          </Button>
          <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus size={15} /> Add User
          </Button>
        </div>
      </div>

      <div className={styles.searchBar}>
        <div className={styles.searchWrap}>
          <Search size={15} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by name, email, or GSTIN..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className={styles.searchInput}
          />
        </div>
      </div>

      <Card className={styles.card} shadow>
        <Table>
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>GSTIN</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 28 }}>
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 600 }}>{user.name}</td>
                  <td style={{ color: 'var(--muted)' }}>{user.email}</td>
                  <td className="tabular">{user.gstin || '—'}</td>
                  <td>
                    {user.is_banned ? (
                      <Badge variant="danger">Banned</Badge>
                    ) : user.is_active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="warning">Inactive</Badge>
                    )}
                  </td>
                  <td className="tabular" style={{ color: 'var(--muted)', fontSize: 'var(--text-xs)' }}>
                    {user.last_login ? new Date(user.last_login).toLocaleDateString('en-IN') : 'Never'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button variant="ghost" size="sm" onClick={() => openInspector(user)} title="Inspect user">
                        <Eye size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setResetUser(user);
                          setNewPassword('');
                        }}
                        title="Reset password"
                      >
                        <KeyRound size={14} />
                      </Button>
                      {user.is_banned ? (
                        <Button variant="secondary" size="sm" onClick={() => handleUnban(user.id)}>
                          Unban
                        </Button>
                      ) : (
                        <Button variant="danger" size="sm" onClick={() => handleBan(user.id)}>
                          Ban
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>

        <div className={styles.pagination}>
          <span>
            Showing {total === 0 ? 0 : (page - 1) * 15 + 1}–{Math.min(page * 15, total)} of {total}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <Button
              variant="secondary"
              size="sm"
              iconOnly
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              iconOnly
              onClick={() => setPage(page + 1)}
              disabled={page * 15 >= total}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Add User Modal */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Create User Account" size="small">
        <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input
            label="Full Name"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
            required
          />
          <Input
            type="email"
            label="Email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            required
          />
          <Input
            type="password"
            label="Initial Password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
            minLength={6}
            required
          />
          <Input
            label="GSTIN (Optional)"
            value={newUser.gstin}
            onChange={(e) => setNewUser({ ...newUser, gstin: e.target.value.toUpperCase() })}
            maxLength={15}
          />
          <Button type="submit" style={{ marginTop: 6 }}>Create User</Button>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={resetUser !== null}
        onClose={() => setResetUser(null)}
        title={`Reset Password — ${resetUser?.name || ''}`}
        size="small"
      >
        <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input
            type="password"
            label="New Password (min 6 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            required
          />
          <Button type="submit" variant="danger">Confirm Password Reset</Button>
        </form>
      </Modal>

      {/* User Inspector Modal */}
      <Modal
        isOpen={inspectUser !== null}
        onClose={() => setInspectUser(null)}
        title={inspectUser?.name || 'User Details'}
        size="medium"
      >
        {inspectUser && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge variant="default">{inspectUser.email}</Badge>
              {inspectUser.gstin && <Badge variant="info">GSTIN: {inspectUser.gstin}</Badge>}
              <Badge variant="success">Queries: {inspectUser.stats?.total_queries ?? 0}</Badge>
            </div>

            {userInterests.length > 0 && (
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: 6 }}>
                  TOP QUERY TOPICS
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {userInterests.map((int, idx) => (
                    <Badge key={idx} variant="info">
                      {int.topic} ({int.query_count})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: 6 }}>
                RECENT ACTIVITY
              </div>
              {userActivity.length === 0 ? (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>No recorded activity.</p>
              ) : (
                <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                  {userActivity.map((a) => (
                    <div key={a.id} className={styles.listRow}>
                      <div>
                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>{a.action_type}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>{a.description}</div>
                      </div>
                      <span className="tabular" style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                        {a.timestamp ? new Date(a.timestamp).toLocaleString('en-IN') : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
