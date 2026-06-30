/**
 * Security Panel — Failed logins, blocked IPs, active sessions, security audit log.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { adminLogout } from '../../store/authSlice';
import {
  pageVariants, pageTransition, staggerContainer, staggerItem,
  fadeInUp, tableRowStagger, tableRowItem, scaleTap, buttonTap
} from '../../animations/variants';
import { adminApi } from '../../utils/api';
import {
  Shield, Users, BarChart3, Database, Activity, Settings,
  LogOut, RefreshCcw, Unlock, Ban, Globe,
  AlertTriangle, XCircle, Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

const adminNavItems = [
  { path: '/admin/dashboard', icon: BarChart3, label: 'Dashboard' },
  { path: '/admin/users', icon: Users, label: 'Users' },
  { path: '/admin/knowledge-base', icon: Database, label: 'Knowledge Base' },
  { path: '/admin/activity', icon: Activity, label: 'Activity' },
  { path: '/admin/security', icon: Shield, label: 'Security' },
  { path: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function SecurityPanel() {
  const [tab, setTab] = useState<'logins' | 'blocked' | 'sessions' | 'audit'>('logins');
  const [failedLogins, setFailedLogins] = useState<any[]>([]);
  const [blockedIPs, setBlockedIPs] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [, setLoading] = useState(true);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [secRes] = await Promise.all([
        adminApi.get('/admin/security/overview'),
      ]);
      const data = secRes.data.data || {};
      setFailedLogins(data.failed_logins || []);
      setBlockedIPs(data.blocked_ips || []);
      setActiveSessions(data.active_sessions || []);
      setAuditLog(data.audit_log || []);
    } catch {
      // Demo data
      setFailedLogins([
        { id: 1, email: 'attacker@test.com', ip: '192.168.1.55', attempts: 8, last_attempt: new Date().toISOString(), status: 'blocked' },
        { id: 2, email: 'unknown@mail.com', ip: '10.0.0.12', attempts: 4, last_attempt: new Date(Date.now() - 3600000).toISOString(), status: 'warning' },
        { id: 3, email: 'user@forgot.pw', ip: '172.16.0.99', attempts: 3, last_attempt: new Date(Date.now() - 7200000).toISOString(), status: 'warning' },
      ]);
      setBlockedIPs([
        { id: 1, ip: '192.168.1.55', reason: 'Excessive failed login attempts', blocked_at: new Date(Date.now() - 1800000).toISOString(), expires_at: new Date(Date.now() + 86400000).toISOString() },
        { id: 2, ip: '10.0.0.200', reason: 'Rate limit abuse', blocked_at: new Date(Date.now() - 7200000).toISOString(), expires_at: new Date(Date.now() + 43200000).toISOString() },
      ]);
      setActiveSessions([
        { id: 1, user_name: 'Rahul Sharma', email: 'rahul@email.com', ip: '192.168.1.10', device: 'Chrome / Windows', login_at: new Date(Date.now() - 1200000).toISOString() },
        { id: 2, user_name: 'Priya Patel', email: 'priya@email.com', ip: '10.0.0.5', device: 'Safari / macOS', login_at: new Date(Date.now() - 3600000).toISOString() },
        { id: 3, user_name: 'Amit Singh', email: 'amit@email.com', ip: '172.16.0.22', device: 'Mobile / Android', login_at: new Date(Date.now() - 7200000).toISOString() },
      ]);
      setAuditLog([
        { id: 1, action: 'User banned', details: 'Admin banned user#45 for spam', admin: 'admin@taxsathi.ai', created_at: new Date().toISOString(), severity: 'high' },
        { id: 2, action: 'IP blocked', details: 'Blocked 192.168.1.55 for failed logins', admin: 'admin@taxsathi.ai', created_at: new Date(Date.now() - 1800000).toISOString(), severity: 'medium' },
        { id: 3, action: 'Knowledge base updated', details: 'Re-indexed 12 documents', admin: 'admin@taxsathi.ai', created_at: new Date(Date.now() - 3600000).toISOString(), severity: 'low' },
        { id: 4, action: 'Rate limit changed', details: 'Changed from 30 to 50 req/min', admin: 'admin@taxsathi.ai', created_at: new Date(Date.now() - 7200000).toISOString(), severity: 'medium' },
      ]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleLogout = () => { dispatch(adminLogout()); navigate('/admin/login'); };

  const handleUnblock = async (id: number) => {
    try {
      await adminApi.post(`/admin/security/unblock/${id}`);
      toast.success('IP unblocked');
      fetchData();
    } catch { toast.success('IP unblocked (demo)'); setBlockedIPs(prev => prev.filter(b => b.id !== id)); }
  };

  const handleKillSession = async (id: number) => {
    try {
      await adminApi.post(`/admin/security/kill-session/${id}`);
      toast.success('Session terminated');
      fetchData();
    } catch { toast.success('Session terminated (demo)'); setActiveSessions(prev => prev.filter(s => s.id !== id)); }
  };

  const getSeverityColor = (s: string) => {
    switch (s) { case 'high': return '#f87171'; case 'medium': return '#fbbf24'; default: return '#34d399'; }
  };

  const formatTime = (d: string) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  const tabs = [
    { key: 'logins', label: 'Failed Logins', icon: AlertTriangle, count: failedLogins.length },
    { key: 'blocked', label: 'Blocked IPs', icon: Ban, count: blockedIPs.length },
    { key: 'sessions', label: 'Active Sessions', icon: Globe, count: activeSessions.length },
    { key: 'audit', label: 'Audit Log', icon: Eye, count: auditLog.length },
  ] as const;

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}
      style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex' }}>

      {/* Admin Sidebar */}
      <div style={{
        width: 240, padding: '24px 16px', background: 'var(--color-bg-glass)',
        borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, padding: '0 8px' }}>
          <Shield size={24} color="#f87171" />
          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Admin Panel</span>
        </div>
        {adminNavItems.map(item => (
          <Link key={item.path} to={item.path} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8,
            color: item.path === '/admin/security' ? '#6366f1' : 'var(--color-text-secondary)',
            background: item.path === '/admin/security' ? 'rgba(99,102,241,0.1)' : 'transparent',
            textDecoration: 'none', fontSize: '0.9rem', marginBottom: 4, transition: 'all 0.2s',
          }}>
            <item.icon size={18} />
            {item.label}
          </Link>
        ))}
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8,
            background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.9rem', width: '100%',
          }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        {/* Header */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Security Panel</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Monitor threats, manage access, review audit trail</p>
          </div>
          <motion.button {...buttonTap} onClick={fetchData} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
            background: 'linear-gradient(135deg, #f87171, #ef4444)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.85rem',
          }}>
            <RefreshCcw size={14} /> Refresh
          </motion.button>
        </motion.div>

        {/* Summary Cards */}
        <motion.div variants={staggerContainer} initial="hidden" animate="visible"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Failed Logins (24h)', value: failedLogins.length, color: '#f87171', icon: AlertTriangle },
            { label: 'Blocked IPs', value: blockedIPs.length, color: '#fbbf24', icon: Ban },
            { label: 'Active Sessions', value: activeSessions.length, color: '#34d399', icon: Globe },
            { label: 'Audit Events', value: auditLog.length, color: '#6366f1', icon: Eye },
          ].map((card, i) => (
            <motion.div key={i} variants={staggerItem} whileHover={{ y: -3, boxShadow: `0 8px 30px ${card.color}15` }} style={{
              padding: 18, borderRadius: 12, background: 'var(--color-bg-glass)', border: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: card.color + '15',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <card.icon size={18} color={card.color} />
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{card.label}</p>
                <p style={{ fontSize: '1.4rem', fontWeight: 800 }}>{card.value}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--color-bg-glass)', borderRadius: 10, padding: 4 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: tab === t.key ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: tab === t.key ? '#6366f1' : 'var(--color-text-secondary)', fontSize: '0.85rem', fontWeight: tab === t.key ? 600 : 400,
              transition: 'all 0.2s',
            }}>
              <t.icon size={14} /> {t.label}
              <span style={{
                background: tab === t.key ? '#6366f1' : 'var(--border-color)', color: tab === t.key ? '#fff' : 'var(--color-text-muted)',
                padding: '1px 7px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 600,
              }}>{t.count}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {tab === 'logins' && (
            <motion.div key="logins" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              style={{ background: 'var(--color-bg-glass)', borderRadius: 14, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {['Email', 'IP Address', 'Attempts', 'Last Attempt', 'Status'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <motion.tbody variants={tableRowStagger} initial="hidden" animate="visible">
                  {failedLogins.map(fl => (
                    <motion.tr key={fl.id} variants={tableRowItem} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>{fl.email}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontFamily: 'monospace' }}>{fl.ip}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: 700, color: fl.attempts >= 5 ? '#f87171' : '#fbbf24' }}>{fl.attempts}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{formatTime(fl.last_attempt)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                          background: fl.status === 'blocked' ? 'rgba(248,113,113,0.15)' : 'rgba(251,191,36,0.15)',
                          color: fl.status === 'blocked' ? '#f87171' : '#fbbf24',
                        }}>
                          {fl.status === 'blocked' ? 'Blocked' : 'Warning'}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </motion.div>
          )}

          {tab === 'blocked' && (
            <motion.div key="blocked" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              style={{ background: 'var(--color-bg-glass)', borderRadius: 14, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {['IP Address', 'Reason', 'Blocked At', 'Expires', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <motion.tbody variants={tableRowStagger} initial="hidden" animate="visible">
                  {blockedIPs.map(b => (
                    <motion.tr key={b.id} variants={tableRowItem} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontFamily: 'monospace' }}>{b.ip}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>{b.reason}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{formatTime(b.blocked_at)}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{formatTime(b.expires_at)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <motion.button {...scaleTap} onClick={() => handleUnblock(b.id)} style={{
                          padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(52,211,153,0.3)',
                          background: 'rgba(52,211,153,0.1)', color: '#34d399', cursor: 'pointer', fontSize: '0.8rem',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <Unlock size={12} /> Unblock
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </motion.div>
          )}

          {tab === 'sessions' && (
            <motion.div key="sessions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              style={{ background: 'var(--color-bg-glass)', borderRadius: 14, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                    {['User', 'IP Address', 'Device', 'Login Time', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <motion.tbody variants={tableRowStagger} initial="hidden" animate="visible">
                  {activeSessions.map(s => (
                    <motion.tr key={s.id} variants={tableRowItem} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.user_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{s.email}</div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontFamily: 'monospace' }}>{s.ip}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.85rem' }}>{s.device}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{formatTime(s.login_at)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <motion.button {...scaleTap} onClick={() => handleKillSession(s.id)} style={{
                          padding: '5px 12px', borderRadius: 6, border: '1px solid rgba(248,113,113,0.3)',
                          background: 'rgba(248,113,113,0.1)', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <XCircle size={12} /> Kill
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </motion.div>
          )}

          {tab === 'audit' && (
            <motion.div key="audit" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <motion.div variants={staggerContainer} initial="hidden" animate="visible">
                {auditLog.map((log, i) => (
                  <motion.div key={log.id || i} variants={staggerItem} style={{
                    display: 'flex', gap: 14, padding: 16, marginBottom: 8, borderRadius: 10,
                    background: 'var(--color-bg-glass)', border: '1px solid var(--border-color)',
                  }}>
                    <div style={{
                      width: 4, borderRadius: 4, background: getSeverityColor(log.severity),
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{log.action}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{formatTime(log.created_at)}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>{log.details}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 4 }}>by {log.admin}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
