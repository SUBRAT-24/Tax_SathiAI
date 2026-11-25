import { Fragment, useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Users,
  BarChart3,
  RefreshCcw,
  Clock,
  MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../utils/api';
import { Card, Button, Select, Badge } from '../../components/ui';
import { pageVariants } from '../../animations/variants';
import styles from './Admin.module.css';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ActivityTracker() {
  const [heatmap, setHeatmap] = useState<number[][]>(DAYS.map(() => HOURS.map(() => 0)));
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [topQuestions, setTopQuestions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [heatRes, topRes, qRes, usersRes] = await Promise.all([
        adminApi.get('/admin/analytics/usage-heatmap', { params: { days: 30 } }),
        adminApi.get('/admin/analytics/top-users', { params: { limit: 8 } }),
        adminApi.get('/admin/analytics/queries', { params: { days: 30 } }),
        adminApi.get('/admin/users', { params: { page: 1, limit: 50 } }),
      ]);

      const grid = DAYS.map(() => HOURS.map(() => 0));
      for (const cell of heatRes.data?.data || []) {
        if (grid[cell.day] && typeof cell.hour === 'number') {
          grid[cell.day][cell.hour] = cell.count || 0;
        }
      }
      setHeatmap(grid);
      const tUsers = topRes.data?.data || [];
      setTopUsers(tUsers);
      setTopQuestions(qRes.data?.data?.top_questions || []);
      const uList = usersRes.data?.data?.users || [];
      setUsers(uList);

      if (!selectedUserId && (tUsers[0]?.user_id || uList[0]?.id)) {
        setSelectedUserId(String(tUsers[0]?.user_id || uList[0]?.id));
      }
    } catch {
      toast.error('Failed to load activity analytics');
    } finally {
      setLoading(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (!selectedUserId) return;
    adminApi
      .get(`/admin/users/${selectedUserId}/activity`, { params: { limit: 30 } })
      .then((r) => setActivities(r.data?.data || []))
      .catch(() => setActivities([]));
  }, [selectedUserId]);

  const maxCount = Math.max(1, ...heatmap.flat());
  const getHeatBg = (count: number) => {
    if (count === 0) return 'var(--surface-subtle)';
    const ratio = count / maxCount;
    if (ratio < 0.25) return 'rgba(15, 92, 77, 0.22)';
    if (ratio < 0.5) return 'rgba(15, 92, 77, 0.45)';
    if (ratio < 0.75) return 'rgba(15, 92, 77, 0.7)';
    return 'var(--accent)';
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
          <div className={styles.kicker}>Usage Telemetry</div>
          <h1 className={styles.title}>Activity &amp; Heatmap</h1>
          <p className={styles.subtitle}>30-day hourly activity distribution, top users, and per-user timelines.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchOverview} loading={loading}>
          <RefreshCcw size={14} /> Refresh
        </Button>
      </div>

      <div className={styles.grid2}>
        <Card className={styles.card} shadow>
          <h2 className={styles.cardTitle}>
            <span><BarChart3 size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Usage Heatmap (30d)</span>
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <div className={styles.heatmapGrid}>
              <div />
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="tabular"
                  style={{ fontSize: '0.62rem', color: 'var(--muted)', textAlign: 'center' }}
                >
                  {h % 4 === 0 ? `${h}h` : ''}
                </div>
              ))}
              {DAYS.map((day, di) => (
                <Fragment key={day}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 500 }}>{day}</div>
                  {HOURS.map((hi) => {
                    const val = heatmap[di]?.[hi] || 0;
                    return (
                      <div
                        key={`${day}-${hi}`}
                        className={styles.heatCell}
                        style={{ background: getHeatBg(val), border: '1px solid var(--rule)' }}
                        title={`${day} ${hi}:00 — ${val} events`}
                      />
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </Card>

        <Card className={styles.card} shadow>
          <h2 className={styles.cardTitle}>
            <span><Users size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Most Active Users</span>
          </h2>
          {topUsers.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>No user activity recorded yet.</p>
          ) : (
            topUsers.map((u, idx) => (
              <div
                key={u.user_id || idx}
                className={styles.listRow}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedUserId(String(u.user_id))}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                    #{idx + 1} {u.name}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>{u.email}</div>
                </div>
                <Badge variant="info">{u.activity_count} events</Badge>
              </div>
            ))
          )}
        </Card>
      </div>

      <div className={styles.gridEqual}>
        <Card className={styles.card} shadow>
          <h2 className={styles.cardTitle}>
            <span><Activity size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> User Activity Timeline</span>
          </h2>
          <div style={{ marginBottom: 14 }}>
            <Select
              label="Inspect User"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              options={
                users.length > 0
                  ? users.map((u) => ({ value: String(u.id), label: `${u.name} (${u.email})` }))
                  : [{ value: '', label: 'No users available' }]
              }
            />
          </div>

          {activities.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>No activity logs for this user.</p>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {activities.map((a) => (
                <div key={a.id} className={styles.listRow}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Badge variant="default">{a.action_type}</Badge>
                      {a.ip_address && (
                        <span className="tabular" style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                          {a.ip_address}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink)', marginTop: 4 }}>
                      {a.description}
                    </div>
                  </div>
                  <span className="tabular" style={{ fontSize: '0.7rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    <Clock size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {a.timestamp ? new Date(a.timestamp).toLocaleString('en-IN') : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className={styles.card} shadow>
          <h2 className={styles.cardTitle}>
            <span><MessageSquare size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Frequently Asked Queries</span>
          </h2>
          {topQuestions.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>No queries logged in the last 30 days.</p>
          ) : (
            topQuestions.map((q, idx) => (
              <div key={idx} className={styles.listRow}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--ink)' }}>{q.question}</span>
                <Badge variant="default">{q.count}×</Badge>
              </div>
            ))
          )}
        </Card>
      </div>
    </motion.div>
  );
}
