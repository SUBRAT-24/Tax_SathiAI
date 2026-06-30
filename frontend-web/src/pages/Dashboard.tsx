/**
 * Dashboard — Stats cards, deadlines, compliance score with animations.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  pageVariants, pageTransition, staggerContainer, staggerItem,
  fadeInUp
} from '../animations/variants';
import {
  MessageSquare, FileText, Bookmark, TrendingUp,
  Calendar, CheckCircle, AlertTriangle
} from 'lucide-react';
import api from '../utils/api';

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -4, boxShadow: `0 12px 40px ${color}20` }}
      style={{
        padding: 24, borderRadius: 'var(--border-radius-lg)',
        background: 'var(--color-bg-glass)', backdropFilter: 'blur(20px)',
        border: '1px solid var(--border-color)', cursor: 'default',
      }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
            {label}
          </p>
          <p style={{ fontSize: '2rem', fontWeight: 800 }}>{value}</p>
        </div>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: color + '15', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={22} color={color} />
        </div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any>(null);

  useEffect(() => {
    api.get('/dashboard/stats').then(r => setStats(r.data.data)).catch(() => {});
    api.get('/dashboard/deadlines').then(r => setDeadlines(r.data.data || [])).catch(() => {});
    api.get('/dashboard/compliance-score').then(r => setCompliance(r.data.data)).catch(() => {});
  }, []);

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
      <motion.h1 variants={fadeInUp} initial="hidden" animate="visible"
        style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 32 }}>
        Dashboard
      </motion.h1>

      {/* Stats Cards */}
      <motion.div
        variants={staggerContainer} initial="hidden" animate="visible"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 32 }}
      >
        <StatCard icon={MessageSquare} label="Total Queries" value={stats?.total_queries || 0} color="#6366f1" />
        <StatCard icon={FileText} label="Documents" value={stats?.total_documents || 0} color="#22d3ee" />
        <StatCard icon={Bookmark} label="Bookmarked" value={stats?.bookmarked_answers || 0} color="#f97316" />
        <StatCard icon={TrendingUp} label="Avg Confidence" value={`${Math.round((stats?.avg_confidence || 0) * 100)}%`} color="#34d399" />
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Deadlines */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" style={{
          padding: 24, borderRadius: 'var(--border-radius-lg)', background: 'var(--color-bg-glass)',
          backdropFilter: 'blur(20px)', border: '1px solid var(--border-color)',
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={20} color="var(--color-primary)" /> Upcoming Deadlines
          </h2>
          {deadlines.slice(0, 5).map((d, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 0', borderBottom: i < 4 ? '1px solid var(--border-color)' : 'none',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{d.return_type}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{d.description?.slice(0, 50)}</div>
              </div>
              <span className={`badge ${d.status === 'overdue' ? 'badge-error' : d.status === 'upcoming' ? 'badge-warning' : 'badge-success'}`}>
                {d.days_left < 0 ? `${Math.abs(d.days_left)}d overdue` : d.days_left === 0 ? 'Today' : `${d.days_left}d left`}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* Compliance Score */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" transition={{ delay: 0.2 }} style={{
          padding: 24, borderRadius: 'var(--border-radius-lg)', background: 'var(--color-bg-glass)',
          backdropFilter: 'blur(20px)', border: '1px solid var(--border-color)',
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={20} color="var(--color-success)" /> Compliance Score
          </h2>
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <div style={{
              width: 120, height: 120, borderRadius: '50%', margin: '0 auto',
              background: `conic-gradient(var(--color-success) ${(compliance?.score || 0) * 3.6}deg, var(--color-surface) 0deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: 100, height: 100, borderRadius: '50%',
                background: 'var(--color-bg-secondary)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '1.8rem', fontWeight: 800,
              }}>
                {compliance?.score || 0}
              </div>
            </div>
          </div>
          {compliance?.tips?.map((tip: string, i: number) => (
            <div key={i} style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
              padding: '8px 0', fontSize: '0.85rem', color: 'var(--color-text-secondary)',
            }}>
              <AlertTriangle size={14} color="var(--color-warning)" style={{ marginTop: 2, flexShrink: 0 }} />
              {tip}
            </div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
