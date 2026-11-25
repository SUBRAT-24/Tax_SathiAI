import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Users,
  MessageSquare,
  FileText,
  Shield,
  TrendingUp,
  Activity,
  Database,
  ArrowRight,
} from 'lucide-react';
import { adminApi } from '../../utils/api';
import { Card, Skeleton } from '../../components/ui';
import { pageVariants } from '../../animations/variants';
import styles from './Admin.module.css';

export default function AdminDashboard() {
  const [overview, setOverview] = useState<any>(null);
  const [queryAnalytics, setQueryAnalytics] = useState<any>(null);
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [ovRes, qRes, topRes] = await Promise.all([
          adminApi.get('/admin/analytics/overview'),
          adminApi.get('/admin/analytics/queries', { params: { days: 30 } }),
          adminApi.get('/admin/analytics/top-users', { params: { limit: 5 } }),
        ]);
        if (!active) return;
        setOverview(ovRes.data?.data || {});
        setQueryAnalytics(qRes.data?.data || {});
        setTopUsers(topRes.data?.data || []);
      } catch {
        // Leave partial
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const statCards = [
    {
      label: 'Total Users',
      value: overview?.total_users ?? 0,
      sub: `${overview?.new_users_today ?? 0} joined today`,
      icon: Users,
      bg: 'var(--accent-soft)',
      color: 'var(--accent)',
    },
    {
      label: 'Daily Active Users',
      value: overview?.dau ?? 0,
      sub: `${overview?.active_users_30d ?? 0} in last 30d`,
      icon: Activity,
      bg: 'var(--info-soft)',
      color: 'var(--info)',
    },
    {
      label: 'Total Queries',
      value: overview?.total_queries ?? 0,
      icon: MessageSquare,
      bg: 'var(--accent-soft)',
      color: 'var(--accent)',
    },
    {
      label: 'Avg Grounding',
      value: `${Math.round((overview?.avg_confidence || 0) * 100)}%`,
      icon: TrendingUp,
      bg: 'var(--warn-soft)',
      color: 'var(--warn)',
    },
    {
      label: 'KB Documents',
      value: overview?.total_kb_documents ?? 0,
      icon: FileText,
      bg: 'var(--info-soft)',
      color: 'var(--info)',
    },
    {
      label: 'Positive Feedback',
      value: `${Math.round((overview?.feedback_positive_ratio || 0) * 100)}%`,
      icon: Shield,
      bg: 'var(--accent-soft)',
      color: 'var(--accent)',
    },
  ];

  const dailyVolume = queryAnalytics?.daily_volume || [];
  const intentDist = queryAnalytics?.intent_distribution || [];

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
          <div className={styles.kicker}>Platform Telemetry</div>
          <h1 className={styles.title}>Admin Overview</h1>
          <p className={styles.subtitle}>
            User engagement, RAG confidence metrics, and statutory knowledge base health.
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className={styles.statsGrid}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} variant="card" style={{ height: 96 }} />)
          : statCards.map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label} className={styles.statCard} shadow>
                  <div>
                    <div className={styles.statLabel}>{s.label}</div>
                    <div className={styles.statValue}>{s.value}</div>
                    {s.sub && <div className={styles.statSub}>{s.sub}</div>}
                  </div>
                  <div className={styles.statIcon} style={{ background: s.bg, color: s.color }}>
                    <Icon size={19} />
                  </div>
                </Card>
              );
            })}
      </div>

      {/* Charts */}
      <div className={styles.grid2}>
        <Card className={styles.card} shadow>
          <h2 className={styles.cardTitle}>Daily Query Volume (30d)</h2>
          {dailyVolume.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', padding: '24px 0' }}>
              No query volume recorded in the last 30 days.
            </p>
          ) : (
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <AreaChart data={dailyVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
                  <XAxis dataKey="date" stroke="var(--muted)" fontSize={11} />
                  <YAxis stroke="var(--muted)" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface)',
                      border: '1px solid var(--rule)',
                      borderRadius: 8,
                      color: 'var(--ink)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="var(--accent)"
                    fill="var(--accent-soft)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className={styles.card} shadow>
          <h2 className={styles.cardTitle}>Top Query Intents</h2>
          {intentDist.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', padding: '24px 0' }}>
              No intent tags recorded yet.
            </p>
          ) : (
            <div style={{ width: '100%', height: 240 }}>
              <ResponsiveContainer>
                <BarChart data={intentDist.slice(0, 6)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
                  <XAxis type="number" stroke="var(--muted)" fontSize={11} allowDecimals={false} />
                  <YAxis type="category" dataKey="intent" stroke="var(--muted)" fontSize={11} width={110} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface)',
                      border: '1px solid var(--rule)',
                      borderRadius: 8,
                      color: 'var(--ink)',
                    }}
                  />
                  <Bar dataKey="count" fill="var(--accent)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Top Active Users + Quick Shortcuts */}
      <div className={styles.gridEqual}>
        <Card className={styles.card} shadow>
          <h2 className={styles.cardTitle}>
            <span>Most Active Users</span>
            <Link to="/admin/users" style={{ fontSize: 'var(--text-xs)' }}>
              All Users →
            </Link>
          </h2>
          {topUsers.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>No activity logs yet.</p>
          ) : (
            topUsers.map((u, idx) => (
              <div key={u.user_id || idx} className={styles.listRow}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{u.name}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>{u.email}</div>
                </div>
                <span className="tabular" style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--accent)' }}>
                  {u.activity_count} actions
                </span>
              </div>
            ))
          )}
        </Card>

        <Card className={styles.card} shadow>
          <h2 className={styles.cardTitle}>Quick Administration</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link to="/admin/users" className={styles.listRow} style={{ textDecoration: 'none', color: 'var(--ink)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Users size={18} color="var(--accent)" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>User Management</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
                    Add users, ban/unban, reset passwords, export CSV
                  </div>
                </div>
              </div>
              <ArrowRight size={15} color="var(--muted)" />
            </Link>

            <Link to="/admin/knowledge-base" className={styles.listRow} style={{ textDecoration: 'none', color: 'var(--ink)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Database size={18} color="var(--accent)" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>CBIC Knowledge Base</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
                    Upload statutory PDFs and re-index vector store
                  </div>
                </div>
              </div>
              <ArrowRight size={15} color="var(--muted)" />
            </Link>

            <Link to="/admin/security" className={styles.listRow} style={{ textDecoration: 'none', color: 'var(--ink)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Shield size={18} color="var(--danger)" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Security &amp; Audit Console</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
                    Inspect failed logins, active sessions, and block IPs
                  </div>
                </div>
              </div>
              <ArrowRight size={15} color="var(--muted)" />
            </Link>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
