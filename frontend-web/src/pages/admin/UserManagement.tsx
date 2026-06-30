/**
 * User Management — Searchable, sortable user table with ban/unban, detail view.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { adminLogout } from '../../store/authSlice';
import {
  pageVariants, pageTransition, tableRowStagger, tableRowItem,
  fadeInUp, scaleTap
} from '../../animations/variants';
import { adminApi } from '../../utils/api';
import {
  Users, Search, Download,
  ChevronLeft, ChevronRight, Shield, BarChart3, Database,
  LogOut
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const fetchUsers = () => {
    adminApi.get('/admin/users', { params: { page, limit: 15, search: search || undefined } })
      .then(r => { setUsers(r.data.data?.users || []); setTotal(r.data.data?.total || 0); })
      .catch(() => {});
  };

  useEffect(() => { fetchUsers(); }, [page, search]);

  const handleBan = async (userId: number) => {
    try {
      await adminApi.post(`/admin/users/${userId}/ban`, { reason: 'Banned by admin' });
      toast.success('User banned');
      fetchUsers();
    } catch { toast.error('Failed'); }
  };

  const handleUnban = async (userId: number) => {
    try {
      await adminApi.post(`/admin/users/${userId}/unban`);
      toast.success('User unbanned');
      fetchUsers();
    } catch { toast.error('Failed'); }
  };

  const handleExport = async () => {
    try {
      const response = await adminApi.get('/admin/users/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', 'taxsathi_users.csv');
      document.body.appendChild(link); link.click(); link.remove();
      toast.success('CSV exported');
    } catch { toast.error('Export failed'); }
  };

  const adminNavItems = [
    { path: '/admin/dashboard', icon: BarChart3, label: 'Dashboard' },
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/knowledge-base', icon: Database, label: 'Knowledge Base' },
  ];

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}
      style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Admin Sidebar */}
      <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        style={{
          width: 260, padding: '20px 12px', position: 'fixed', top: 0, bottom: 0,
          background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(20px)',
          borderRight: '1px solid var(--border-color)', zIndex: 250, display: 'flex', flexDirection: 'column',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 32 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #dc2626, #f87171)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={20} color="white" />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 800 }}>Admin Panel</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>TaxSathi AI</div>
          </div>
        </div>
        <nav style={{ flex: 1 }}>
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = window.location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                borderRadius: 10, marginBottom: 4, fontSize: '0.9rem', textDecoration: 'none',
                fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                background: isActive ? 'rgba(220,38,38,0.1)' : 'transparent', borderLeft: isActive ? '3px solid #dc2626' : '3px solid transparent',
              }}><Icon size={18} /> {item.label}</Link>
            );
          })}
        </nav>
        <button onClick={() => { dispatch(adminLogout()); navigate('/admin/login'); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, color: 'var(--color-error)', background: 'transparent', fontSize: '0.9rem', width: '100%' }}>
          <LogOut size={18} /> Logout
        </button>
      </motion.aside>

      <div style={{ flex: 1, marginLeft: 260, padding: 32 }}>
        <motion.div variants={fadeInUp} initial="hidden" animate="visible"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>
            <span style={{ color: 'var(--color-error)' }}>User</span> Management
          </h1>
          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button {...scaleTap} onClick={handleExport} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
              <Download size={16} /> Export CSV
            </motion.button>
          </div>
        </motion.div>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
          background: 'var(--color-surface)', border: '1px solid var(--border-color)',
          borderRadius: 10, marginBottom: 20,
        }}>
          <Search size={18} color="var(--color-text-muted)" />
          <input type="text" placeholder="Search by name, email, or GSTIN..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--color-text-primary)', fontSize: '0.9rem', outline: 'none' }} />
        </div>

        {/* Table */}
        <div style={{
          background: 'var(--color-bg-glass)', backdropFilter: 'blur(20px)',
          borderRadius: 14, border: '1px solid var(--border-color)', overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                {['Name', 'Email', 'GSTIN', 'Status', 'Last Login', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '14px 16px', textAlign: 'left', fontSize: '0.8rem',
                    color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <motion.tbody variants={tableRowStagger} initial="hidden" animate="visible">
              {users.map((user) => (
                <motion.tr key={user.id} variants={tableRowItem}
                  whileHover={{ backgroundColor: 'rgba(99,102,241,0.03)' }}
                  style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'white',
                      }}>{user.name?.charAt(0)}</div>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>{user.email}</td>
                  <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{user.gstin || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {user.is_banned ? (
                      <span className="badge badge-error">Banned</span>
                    ) : user.is_active ? (
                      <span className="badge badge-success">Active</span>
                    ) : (
                      <span className="badge badge-warning">Inactive</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.83rem', color: 'var(--color-text-muted)' }}>
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {user.is_banned ? (
                        <motion.button {...scaleTap} onClick={() => handleUnban(user.id)}
                          style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(52,211,153,0.1)', color: 'var(--color-success)', fontSize: '0.78rem', fontWeight: 600 }}>
                          Unban
                        </motion.button>
                      ) : (
                        <motion.button {...scaleTap} onClick={() => handleBan(user.id)}
                          style={{ padding: '4px 10px', borderRadius: 6, background: 'rgba(248,113,113,0.1)', color: 'var(--color-error)', fontSize: '0.78rem', fontWeight: 600 }}>
                          Ban
                        </motion.button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>

          {/* Pagination */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 16px', borderTop: '1px solid var(--border-color)',
          }}>
            <span style={{ fontSize: '0.83rem', color: 'var(--color-text-muted)' }}>
              Showing {((page - 1) * 15) + 1}-{Math.min(page * 15, total)} of {total}
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              <motion.button {...scaleTap} onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1} className="btn-icon"><ChevronLeft size={18} /></motion.button>
              <motion.button {...scaleTap} onClick={() => setPage(page + 1)}
                disabled={page * 15 >= total} className="btn-icon"><ChevronRight size={18} /></motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
