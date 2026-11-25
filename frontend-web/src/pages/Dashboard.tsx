import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  MessageSquare,
  FileText,
  Bookmark,
  ShieldCheck,
  Calendar,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Upload,
} from 'lucide-react';
import type { RootState, AppDispatch } from '../store/store';
import { fetchSessions, fetchSessionMessages } from '../store/chatSlice';
import { Card, Badge, Button, Skeleton } from '../components/ui';
import { pageVariants } from '../animations/variants';
import api from '../utils/api';
import styles from './Dashboard.module.css';

interface DashboardStats {
  total_queries: number;
  total_sessions: number;
  total_documents: number;
  bookmarked_answers: number;
  avg_confidence: number;
  member_since?: string;
}

interface DeadlineItem {
  return_type: string;
  description: string;
  due_date: string;
  frequency: string;
  source: string;
  days_left: number;
  status: 'overdue' | 'upcoming' | 'future';
}

interface ComplianceData {
  score: number;
  max_score: number;
  breakdown: {
    profile_completeness: number;
    gstin_verified: number;
    engagement: number;
    documents: number;
    base: number;
  };
  tips: string[];
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [compliance, setCompliance] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.auth);
  const { sessions } = useSelector((state: RootState) => state.chat);

  useEffect(() => {
    let active = true;
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [statsRes, deadlinesRes, scoreRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/deadlines'),
          api.get('/dashboard/compliance-score'),
        ]);
        if (!active) return;
        setStats(statsRes.data?.data || null);
        setDeadlines(deadlinesRes.data?.data || []);
        setCompliance(scoreRes.data?.data || null);
      } catch {
        // Leave partial/empty cleanly
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDashboard();
    dispatch(fetchSessions());
    return () => {
      active = false;
    };
  }, [dispatch]);

  const openSession = async (sessionId: number) => {
    await dispatch(fetchSessionMessages(sessionId));
    navigate('/chat');
  };

  const score = compliance?.score ?? 0;
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const statCards = [
    { label: 'Total Queries', value: stats?.total_queries ?? 0, icon: MessageSquare },
    { label: 'Active Sessions', value: stats?.total_sessions ?? 0, icon: ShieldCheck },
    { label: 'Documents Indexed', value: stats?.total_documents ?? 0, icon: FileText },
    { label: 'Bookmarked Answers', value: stats?.bookmarked_answers ?? 0, icon: Bookmark },
    {
      label: 'Avg AI Grounding',
      value: stats?.avg_confidence ? `${Math.round(stats.avg_confidence * 100)}%` : '—',
      icon: CheckCircle2,
    },
  ];

  const breakdownRows = compliance
    ? [
        { label: 'Base Standing', val: compliance.breakdown.base, max: 40 },
        { label: 'GSTIN Profile', val: compliance.breakdown.gstin_verified, max: 20 },
        { label: 'PAN & Phone', val: Math.max(0, compliance.breakdown.profile_completeness - 20), max: 15 },
        { label: '30-Day Activity', val: compliance.breakdown.engagement, max: 15 },
        { label: 'Uploaded Returns', val: compliance.breakdown.documents, max: 10 },
      ]
    : [];

  return (
    <motion.div
      className={styles.dashboard}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className={styles.header}>
        <div>
          <div className={styles.kicker}>Compliance Overview</div>
          <h1 className={styles.title}>
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className={styles.subtitle}>
            {user?.gstin ? `Linked GSTIN: ${user.gstin}` : 'Add your GSTIN in Profile to unlock full compliance tracking.'}
          </p>
        </div>
        <div className={styles.quickActions}>
          <Link to="/documents">
            <Button variant="secondary" size="sm">
              <Upload size={15} /> Upload PDF
            </Button>
          </Link>
          <Link to="/tools">
            <Button variant="secondary" size="sm">
              <Wrench size={15} /> GST Tools
            </Button>
          </Link>
          <Link to="/chat">
            <Button variant="primary" size="sm">
              <MessageSquare size={15} /> Ask TaxSathi
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.stats}>
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} variant="card" style={{ height: 92 }} />)
          : statCards.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <Card key={i} className={styles.statCard} shadow>
                  <div className={styles.statIcon}>
                    <Icon size={20} strokeWidth={1.75} />
                  </div>
                  <div>
                    <div className={styles.statValue}>{stat.value}</div>
                    <div className={styles.statLabel}>{stat.label}</div>
                  </div>
                </Card>
              );
            })}
      </div>

      {/* Compliance Score + Deadlines */}
      <div className={styles.mainGrid}>
        <Card className={styles.sectionCard} shadow>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Compliance Readiness</h2>
            <Badge variant={score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger'}>
              {score}/100
            </Badge>
          </div>

          {loading ? (
            <Skeleton variant="card" style={{ height: 180 }} />
          ) : (
            <>
              <div className={styles.scoreBody}>
                <div className={styles.gaugeWrap}>
                  <svg width="112" height="112" viewBox="0 0 112 112">
                    <circle
                      cx="56"
                      cy="56"
                      r={radius}
                      fill="none"
                      stroke="var(--rule)"
                      strokeWidth="9"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r={radius}
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      transform="rotate(-90 56 56)"
                    />
                  </svg>
                  <div className={styles.gaugeCenter}>
                    <span className={styles.gaugeValue}>{score}</span>
                    <span className={styles.gaugeLabel}>Score</span>
                  </div>
                </div>

                <div className={styles.breakdownList}>
                  {breakdownRows.map((row) => (
                    <div key={row.label} className={styles.breakdownRow}>
                      <div className={styles.breakdownTop}>
                        <span>{row.label}</span>
                        <span className="tabular">{row.val}/{row.max}</span>
                      </div>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{ width: `${Math.min(100, (row.val / row.max) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {compliance?.tips && compliance.tips.length > 0 && (
                <div className={styles.tipsBox}>
                  {compliance.tips.map((tip, idx) => (
                    <div key={idx} className={styles.tipItem}>
                      <AlertCircle size={14} color="var(--accent)" style={{ flexShrink: 0 }} />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Card>

        <Card className={styles.sectionCard} shadow>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Upcoming GST Deadlines</h2>
            <Link to="/tools" style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
              Full Calendar →
            </Link>
          </div>

          {loading ? (
            <Skeleton variant="card" style={{ height: 220 }} />
          ) : deadlines.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
              No upcoming deadlines found for the current window.
            </p>
          ) : (
            <div className={styles.deadlineList}>
              {deadlines.slice(0, 5).map((d, idx) => (
                <div key={idx} className={styles.deadlineItem}>
                  <div>
                    <div className={styles.deadlineTitle}>
                      <Calendar size={14} color="var(--accent)" />
                      <span>{d.return_type}</span>
                      <Badge
                        variant={
                          d.status === 'overdue'
                            ? 'danger'
                            : d.status === 'upcoming'
                            ? 'warning'
                            : 'info'
                        }
                      >
                        {d.days_left < 0
                          ? `${Math.abs(d.days_left)}d overdue`
                          : d.days_left === 0
                          ? 'Due today'
                          : `${d.days_left}d left`}
                      </Badge>
                    </div>
                    <div className={styles.deadlineDesc}>
                      {d.description} · {d.source}
                    </div>
                  </div>
                  <div className={styles.deadlineRight}>
                    <div className={styles.deadlineDate}>{d.due_date}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{d.frequency}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Consultations */}
      <Card className={styles.recent} shadow>
        <div className={styles.cardHeader} style={{ marginBottom: 8 }}>
          <h2 className={styles.cardTitle}>Recent Statutory Consultations</h2>
          <Link to="/chat" style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
            Open Chat Workspace →
          </Link>
        </div>
        {sessions.length === 0 ? (
          <div style={{ padding: '18px 0', textAlign: 'center', color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
            You haven&apos;t started a GST consultation yet.{' '}
            <Link to="/chat" style={{ fontWeight: 600 }}>Ask your first question</Link>.
          </div>
        ) : (
          <div className={styles.recentList}>
            {sessions.slice(0, 6).map((s) => (
              <div
                key={s.id}
                className={styles.recentItem}
                onClick={() => openSession(s.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <MessageSquare size={15} color="var(--accent)" style={{ flexShrink: 0 }} />
                  <p className={styles.recentQuery}>{s.title || 'GST Consultation'}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={styles.recentTime}>
                    {s.updated_at ? new Date(s.updated_at).toLocaleDateString('en-IN') : ''}
                  </span>
                  <ArrowRight size={14} color="var(--muted)" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
