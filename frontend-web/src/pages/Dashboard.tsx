/**
 * Dashboard — Stats cards, deadlines, compliance score with animations.
 */

import { useState, useEffect, useRef } from 'react';
import { motion, animate, useInView } from 'framer-motion';
import {
  pageVariants, pageTransition, staggerContainerFast, staggerItemHeavy,
  fadeInUp
} from '../animations/variants';
import {
  MessageSquare, FileText, Bookmark, TrendingUp,
  Calendar, CheckCircle, AlertTriangle
} from 'lucide-react';
import api from '../utils/api';

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView && typeof value === 'number') {
      const ctrl = animate(0, value, {
        duration: 1.1,
        ease: [0.16, 1, 0.3, 1],
        onUpdate: (v) => setDisplay(Math.round(v)),
      });
      return () => ctrl.stop();
    }
  }, [isInView, value]);

  return <span ref={ref}>{display}</span>;
}

function StatCard({ icon: Icon, label, value, isPercent, color }: any) {
  const numValue = typeof value === 'number' ? value : parseInt(value, 10) || 0;

  return (
    <motion.div
      variants={staggerItemHeavy}
      whileHover={{ y: -5, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
      className="card-cinematic"
      style={{
        padding: 24, borderRadius: 'var(--border-radius-lg)',
        background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.07)', cursor: 'default',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 120, height: 120,
        background: `radial-gradient(circle at top right, ${color}18 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      }}>
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 8, fontWeight: 500 }}>
            {label}
          </p>
          <p style={{ fontSize: '2.1rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center' }}>
            <AnimatedNumber value={numValue} />
            {isPercent && '%'}
          </p>
        </div>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: color + '15', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${color}30`,
          boxShadow: `0 0 20px ${color}15`,
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
        variants={staggerContainerFast} initial="hidden" animate="visible"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 32 }}
      >
        <StatCard icon={MessageSquare} label="Total Queries" value={stats?.total_queries || 0} color="#6366f1" />
        <StatCard icon={FileText} label="Documents" value={stats?.total_documents || 0} color="#22d3ee" />
        <StatCard icon={Bookmark} label="Bookmarked" value={stats?.bookmarked_answers || 0} color="#f97316" />
        <StatCard icon={TrendingUp} label="Avg Confidence" value={Math.round((stats?.avg_confidence || 0) * 100)} isPercent={true} color="#34d399" />
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Deadlines */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="card-cinematic" style={{
          padding: 24, borderRadius: 'var(--border-radius-lg)', background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.07)',
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={20} color="var(--color-primary)" /> Upcoming Deadlines
          </h2>
          {deadlines.slice(0, 5).map((d, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ x: 4, transition: { duration: 0.15 } }}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 8px', borderRadius: 8,
                borderBottom: i < 4 ? '1px solid rgba(148, 163, 184, 0.08)' : 'none',
                cursor: 'pointer',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>{d.return_type}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{d.description?.slice(0, 50)}</div>
              </div>
              <span className={`badge ${d.status === 'overdue' ? 'badge-error' : d.status === 'upcoming' ? 'badge-warning' : 'badge-success'}`}>
                {d.days_left < 0 ? `${Math.abs(d.days_left)}d overdue` : d.days_left === 0 ? 'Today' : `${d.days_left}d left`}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* Compliance Score */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" transition={{ delay: 0.15 }} className="card-cinematic" style={{
          padding: 24, borderRadius: 'var(--border-radius-lg)', background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.07)',
        }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle size={20} color="var(--color-success)" /> Compliance Score
          </h2>
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <div style={{
              width: 124, height: 124, borderRadius: '50%', margin: '0 auto',
              background: `conic-gradient(var(--color-success) ${(compliance?.score || 0) * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 30px rgba(52, 211, 153, 0.15)',
            }}>
              <div style={{
                width: 104, height: 104, borderRadius: '50%',
                background: 'var(--color-bg-secondary)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.02em',
              }}>
                <AnimatedNumber value={compliance?.score || 0} />
              </div>
            </div>
          </div>
          {compliance?.tips?.map((tip: string, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              style={{
                display: 'flex', gap: 8, alignItems: 'flex-start',
                padding: '8px 10px', fontSize: '0.85rem', color: 'var(--color-text-secondary)',
                borderRadius: 6, background: 'rgba(255, 255, 255, 0.02)', marginBottom: 4,
              }}
            >
              <AlertTriangle size={14} color="var(--color-warning)" style={{ marginTop: 2, flexShrink: 0 }} />
              {tip}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
