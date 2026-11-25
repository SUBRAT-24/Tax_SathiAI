import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  RefreshCcw,
  Ban,
  Globe,
  AlertTriangle,
  Eye,
  LogOut,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../utils/api';
import { Card, Button, Badge, Table, Input, Modal } from '../../components/ui';
import { pageVariants } from '../../animations/variants';
import styles from './Admin.module.css';

export default function SecurityPanel() {
  const [tab, setTab] = useState<'logins' | 'sessions' | 'audit'>('logins');
  const [failedLogins, setFailedLogins] = useState<any[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [blockOpen, setBlockOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({ ip_address: '', reason: '', hours: '24' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [failRes, sessRes, logRes] = await Promise.all([
        adminApi.get('/admin/security/failed-logins', { params: { hours: 24 } }),
        adminApi.get('/admin/security/active-sessions'),
        adminApi.get('/admin/security/logs', { params: { limit: 50 } }),
      ]);
      setFailedLogins(failRes.data?.data || []);
      setActiveSessions(sessRes.data?.data || []);
      setAuditLog(logRes.data?.data || []);
    } catch {
      toast.error('Failed to load security logs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleForceLogout = async (userId: number) => {
    try {
      await adminApi.post(`/admin/security/force-logout/${userId}`);
      toast.success('User sessions invalidated');
      fetchData();
    } catch {
      toast.error('Force logout failed');
    }
  };

  const handleBlockIP = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.post('/admin/security/block-ip', {
        ip_address: blockForm.ip_address.trim(),
        reason: blockForm.reason.trim() || 'Blocked by administrator',
        hours: blockForm.hours ? Number(blockForm.hours) : undefined,
      });
      toast.success(`IP ${blockForm.ip_address} blocked`);
      setBlockOpen(false);
      setBlockForm({ ip_address: '', reason: '', hours: '24' });
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to block IP');
    }
  };

  const formatTime = (d?: string) =>
    d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

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
          <div className={styles.kicker}>Threat &amp; Access Control</div>
          <h1 className={styles.title}>Security &amp; Audit</h1>
          <p className={styles.subtitle}>Monitor failed logins, active sessions, security logs, and IP blocks.</p>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" size="sm" onClick={fetchData} loading={loading}>
            <RefreshCcw size={14} /> Refresh
          </Button>
          <Button variant="danger" size="sm" onClick={() => setBlockOpen(true)}>
            <Ban size={14} /> Block IP
          </Button>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <Card className={styles.statCard} shadow>
          <div>
            <div className={styles.statLabel}>Failed Logins (24h)</div>
            <div className={styles.statValue}>{failedLogins.length}</div>
          </div>
          <div className={styles.statIcon} style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
            <AlertTriangle size={18} />
          </div>
        </Card>
        <Card className={styles.statCard} shadow>
          <div>
            <div className={styles.statLabel}>Active Sessions (30m)</div>
            <div className={styles.statValue}>{activeSessions.length}</div>
          </div>
          <div className={styles.statIcon} style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <Globe size={18} />
          </div>
        </Card>
        <Card className={styles.statCard} shadow>
          <div>
            <div className={styles.statLabel}>Security Audit Events</div>
            <div className={styles.statValue}>{auditLog.length}</div>
          </div>
          <div className={styles.statIcon} style={{ background: 'var(--info-soft)', color: 'var(--info)' }}>
            <Eye size={18} />
          </div>
        </Card>
      </div>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'logins' ? styles.tabActive : ''}`}
          onClick={() => setTab('logins')}
        >
          <AlertTriangle size={15} /> Failed Logins ({failedLogins.length})
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'sessions' ? styles.tabActive : ''}`}
          onClick={() => setTab('sessions')}
        >
          <Globe size={15} /> Active Sessions ({activeSessions.length})
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'audit' ? styles.tabActive : ''}`}
          onClick={() => setTab('audit')}
        >
          <Shield size={15} /> Audit Log ({auditLog.length})
        </button>
      </div>

      <Card className={styles.card} shadow>
        {tab === 'logins' && (
          <Table>
            <thead>
              <tr>
                <th>Details</th>
                <th>IP Address</th>
                <th>Severity</th>
                <th>Timestamp</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {failedLogins.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>
                    No failed login attempts in the last 24 hours.
                  </td>
                </tr>
              ) : (
                failedLogins.map((fl) => (
                  <tr key={fl.id}>
                    <td>{fl.details?.email || fl.details?.type || 'Login failure'}</td>
                    <td className="tabular">{fl.ip_address || '—'}</td>
                    <td>
                      <Badge variant={fl.severity === 'high' ? 'danger' : 'warning'}>{fl.severity}</Badge>
                    </td>
                    <td className="tabular" style={{ color: 'var(--muted)', fontSize: 'var(--text-xs)' }}>
                      {formatTime(fl.timestamp)}
                    </td>
                    <td>
                      {fl.ip_address && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setBlockForm({ ip_address: fl.ip_address, reason: 'Failed login brute force', hours: '24' });
                            setBlockOpen(true);
                          }}
                        >
                          Block IP
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}

        {tab === 'sessions' && (
          <Table>
            <thead>
              <tr>
                <th>User</th>
                <th>IP Address</th>
                <th>Device</th>
                <th>Last Activity</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {activeSessions.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>
                    No active user sessions in the last 30 minutes.
                  </td>
                </tr>
              ) : (
                activeSessions.map((s, idx) => (
                  <tr key={`${s.user_id}-${idx}`}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>{s.email}</div>
                    </td>
                    <td className="tabular">{s.ip_address || '—'}</td>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>{s.device || 'Unknown'}</td>
                    <td className="tabular" style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
                      {formatTime(s.last_activity)}
                    </td>
                    <td>
                      <Button variant="danger" size="sm" onClick={() => handleForceLogout(s.user_id)}>
                        <LogOut size={13} /> Force Logout
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}

        {tab === 'audit' && (
          <Table>
            <thead>
              <tr>
                <th>Event</th>
                <th>IP Address</th>
                <th>Severity</th>
                <th>Details</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>
                    No security audit events recorded.
                  </td>
                </tr>
              ) : (
                auditLog.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontWeight: 600 }}>{log.event_type}</td>
                    <td className="tabular">{log.ip_address || '—'}</td>
                    <td>
                      <Badge
                        variant={
                          log.severity === 'high' ? 'danger' : log.severity === 'medium' ? 'warning' : 'success'
                        }
                      >
                        {log.severity}
                      </Badge>
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
                      {JSON.stringify(log.details || {})}
                    </td>
                    <td className="tabular" style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
                      {formatTime(log.timestamp)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal isOpen={blockOpen} onClose={() => setBlockOpen(false)} title="Block IP Address" size="small">
        <form onSubmit={handleBlockIP} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input
            label="IP Address"
            value={blockForm.ip_address}
            onChange={(e) => setBlockForm({ ...blockForm, ip_address: e.target.value })}
            placeholder="192.168.1.50"
            required
          />
          <Input
            label="Reason"
            value={blockForm.reason}
            onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
            placeholder="Brute force login attempts"
          />
          <Input
            label="Duration (Hours)"
            type="number"
            min="1"
            value={blockForm.hours}
            onChange={(e) => setBlockForm({ ...blockForm, hours: e.target.value })}
          />
          <Button type="submit" variant="danger" style={{ marginTop: 4 }}>
            Confirm IP Block
          </Button>
        </form>
      </Modal>
    </motion.div>
  );
}
