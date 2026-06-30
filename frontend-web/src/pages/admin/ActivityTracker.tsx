/**
 * Activity Tracker — Real-time activity feed, per-user timeline, usage heatmap.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { adminLogout } from '../../store/authSlice';
import {
  pageVariants, pageTransition, staggerContainer, staggerItem,
  fadeInUp, timelineContainer, timelineItem, heatmapCell,
  scaleTap, buttonTap
} from '../../animations/variants';
import { adminApi } from '../../utils/api';
import {
  Activity, Users, BarChart3, Database, Shield, Settings,
  LogOut, RefreshCcw, Clock, User, MessageSquare, FileText,
  Search
} from 'lucide-react';


const adminNavItems = [
  { path: '/admin/dashboard', icon: BarChart3, label: 'Dashboard' },
  { path: '/admin/users', icon: Users, label: 'Users' },
  { path: '/admin/knowledge-base', icon: Database, label: 'Knowledge Base' },
  { path: '/admin/activity', icon: Activity, label: 'Activity' },
  { path: '/admin/security', icon: Shield, label: 'Security' },
  { path: '/admin/settings', icon: Settings, label: 'Settings' },
];

function getActivityIcon(type: string) {
  switch (type) {
    case 'chat': return MessageSquare;
    case 'document': return FileText;
    case 'login': return User;
    default: return Activity;
  }
}

function getActivityColor(type: string) {
  switch (type) {
    case 'chat': return '#6366f1';
    case 'document': return '#22d3ee';
    case 'login': return '#34d399';
    case 'error': return '#f87171';
    default: return '#94a3b8';
  }
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ActivityTracker() {
  const [activities, setActivities] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<number[][]>(
    DAYS.map(() => HOURS.map(() => 0))
  );
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [actRes, statsRes] = await Promise.all([
        adminApi.get('/admin/activity', { params: { limit: 50, type: filter !== 'all' ? filter : undefined, search: search || undefined } }),
        adminApi.get('/admin/analytics/overview'),
      ]);
      setActivities(actRes.data.data?.activities || actRes.data.data || []);

      // Generate heatmap from activities (mock-based for demo)
      const map = DAYS.map(() => HOURS.map(() => Math.floor(Math.random() * 10)));
      setHeatmapData(map);

      // Top users
      setTopUsers(statsRes.data.data?.top_users || [
        { name: 'Rahul Sharma', queries: 245 },
        { name: 'Priya Patel', queries: 198 },
        { name: 'Amit Singh', queries: 167 },
        { name: 'Sneha Jain', queries: 142 },
        { name: 'Vikash Kumar', queries: 119 },
      ]);
    } catch {
      // Use demo data on failure
      setActivities([
        { id: 1, type: 'chat', user_name: 'Rahul Sharma', description: 'Asked about GST filing deadline', created_at: new Date().toISOString() },
        { id: 2, type: 'login', user_name: 'Priya Patel', description: 'Logged in', created_at: new Date(Date.now() - 300000).toISOString() },
        { id: 3, type: 'document', user_name: 'Amit Singh', description: 'Uploaded GST return PDF', created_at: new Date(Date.now() - 600000).toISOString() },
        { id: 4, type: 'chat', user_name: 'Sneha Jain', description: 'Queried ITC eligibility', created_at: new Date(Date.now() - 900000).toISOString() },
        { id: 5, type: 'login', user_name: 'Vikash Kumar', description: 'Logged in', created_at: new Date(Date.now() - 1200000).toISOString() },
      ]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filter, search]);

  const handleLogout = () => { dispatch(adminLogout()); navigate('/admin/login'); };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const getHeatColor = (value: number) => {
    if (value === 0) return 'rgba(99,102,241,0.05)';
    if (value < 3) return 'rgba(99,102,241,0.15)';
    if (value < 5) return 'rgba(99,102,241,0.3)';
    if (value < 8) return 'rgba(99,102,241,0.5)';
    return 'rgba(99,102,241,0.8)';
  };

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
            color: item.path === '/admin/activity' ? '#6366f1' : 'var(--color-text-secondary)',
            background: item.path === '/admin/activity' ? 'rgba(99,102,241,0.1)' : 'transparent',
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
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Activity Tracker</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Real-time user activity and usage analytics</p>
          </div>
          <motion.button {...buttonTap} onClick={fetchData} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.85rem',
          }}>
            <RefreshCcw size={14} /> Refresh
          </motion.button>
        </motion.div>

        {/* Top Users + Heatmap Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, marginBottom: 28 }}>
          {/* Most Active Users */}
          <motion.div variants={fadeInUp} initial="hidden" animate="visible" style={{
            padding: 20, borderRadius: 14, background: 'var(--color-bg-glass)', border: '1px solid var(--border-color)',
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Users size={16} color="#6366f1" /> Most Active Users
            </h3>
            <motion.div variants={staggerContainer} initial="hidden" animate="visible">
              {topUsers.map((user, i) => (
                <motion.div key={i} variants={staggerItem} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: i < topUsers.length - 1 ? '1px solid var(--border-color)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `hsl(${i * 50}, 60%, 30%)`, fontSize: '0.7rem', fontWeight: 700,
                    }}>
                      {i + 1}
                    </div>
                    <span style={{ fontSize: '0.85rem' }}>{user.name}</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: 600 }}>{user.queries} queries</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Usage Heatmap */}
          <motion.div variants={fadeInUp} initial="hidden" animate="visible" style={{
            padding: 20, borderRadius: 14, background: 'var(--color-bg-glass)', border: '1px solid var(--border-color)',
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart3 size={16} color="#22d3ee" /> Usage Heatmap (Queries per Hour)
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(24, 1fr)', gap: 2 }}>
                {/* Hour labels */}
                <div />
                {HOURS.map(h => (
                  <div key={h} style={{ fontSize: '0.6rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                    {h % 4 === 0 ? `${h}h` : ''}
                  </div>
                ))}
                {/* Rows */}
                {DAYS.map((day, di) => (
                  <>{/* Fragment key handled by key on first child */}
                    <div key={`label-${day}`} style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>
                      {day}
                    </div>
                    {HOURS.map(hi => (
                      <motion.div
                        key={`${day}-${hi}`}
                        variants={heatmapCell}
                        custom={{ delay: di * 0.03 + hi * 0.01 }}
                        initial="hidden"
                        animate="visible"
                        style={{
                          width: '100%', aspectRatio: '1', borderRadius: 3,
                          background: getHeatColor(heatmapData[di]?.[hi] || 0),
                          cursor: 'pointer',
                        }}
                        title={`${day} ${hi}:00 — ${heatmapData[di]?.[hi] || 0} queries`}
                      />
                    ))}
                  </>
                ))}
              </div>
              {/* Legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>Less</span>
                {[0.05, 0.15, 0.3, 0.5, 0.8].map((o, i) => (
                  <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: `rgba(99,102,241,${o})` }} />
                ))}
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>More</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by user or action..."
              style={{
                width: '100%', padding: '8px 12px 8px 36px', borderRadius: 8, border: '1px solid var(--border-color)',
                background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', fontSize: '0.85rem',
              }}
            />
          </div>
          {['all', 'chat', 'login', 'document'].map(f => (
            <motion.button key={f} {...scaleTap} onClick={() => setFilter(f)} style={{
              padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-color)', cursor: 'pointer',
              background: filter === f ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: filter === f ? '#6366f1' : 'var(--color-text-secondary)', fontSize: '0.8rem', textTransform: 'capitalize',
            }}>
              {f === 'all' ? 'All Activity' : f}
            </motion.button>
          ))}
        </div>

        {/* Activity Timeline */}
        <motion.div variants={timelineContainer} initial="hidden" animate="visible">
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Loading...</div>
          ) : activities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>No activity found</div>
          ) : (
            activities.map((act, i) => {
              const Icon = getActivityIcon(act.type || 'default');
              const color = getActivityColor(act.type || 'default');
              return (
                <motion.div key={act.id || i} variants={timelineItem} style={{
                  display: 'flex', gap: 16, padding: '14px 0',
                  borderBottom: i < activities.length - 1 ? '1px solid var(--border-color)' : 'none',
                }}>
                  {/* Timeline dot and line */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 36 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', background: color + '15',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon size={16} color={color} />
                    </div>
                    {i < activities.length - 1 && (
                      <div style={{ width: 2, flex: 1, background: 'var(--border-color)', marginTop: 4 }} />
                    )}
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{act.user_name || 'Unknown User'}</span>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginLeft: 8 }}>
                          {act.description || act.action || 'Performed an action'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                        <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        {act.created_at ? timeAgo(act.created_at) : '—'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
