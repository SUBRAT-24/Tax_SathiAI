/**
 * Admin Dashboard — Overview with stats, charts, activity feed.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { adminLogout } from '../../store/authSlice';
import { pageVariants, pageTransition, staggerContainer, staggerItem, fadeInUp, scaleTap } from '../../animations/variants';
import { adminApi } from '../../utils/api';
import {
  Users, MessageSquare, FileText, Shield, TrendingUp,
  LogOut, Database, Activity, BarChart3
} from 'lucide-react';

function AdminStatCard({ icon: Icon, label, value, color, trend }: any) {
  return (
    <motion.div variants={staggerItem} whileHover={{ y: -4, boxShadow: `0 8px 30px ${color}20` }}
      style={{
        padding: 20, borderRadius: 14, background: 'var(--color-bg-glass)',
        backdropFilter: 'blur(20px)', border: '1px solid var(--border-color)',
      }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 6 }}>{label}</p>
          <p style={{ fontSize: '1.8rem', fontWeight: 800 }}>{value}</p>
          {trend && <p style={{ fontSize: '0.75rem', color: 'var(--color-success)', marginTop: 4 }}>↑ {trend}</p>}
        </div>
        <div style={{
          width: 42, height: 42, borderRadius: 10, background: color + '15',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} color={color} />
        </div>
      </div>
    </motion.div>
  );
}

const adminNavItems = [
  { path: '/admin/dashboard', icon: BarChart3, label: 'Dashboard' },
  { path: '/admin/users', icon: Users, label: 'Users' },
  { path: '/admin/knowledge-base', icon: Database, label: 'Knowledge Base' },
];

export default function AdminDashboard() {
  const [overview, setOverview] = useState<any>(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    adminApi.get('/admin/analytics/overview').then(r => setOverview(r.data.data)).catch(() => {});
  }, []);

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}
      style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-bg-primary)' }}>
      {/* Admin Sidebar */}
      <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        style={{
          width: 260, padding: '20px 12px', position: 'fixed', top: 0, bottom: 0,
          background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(20px)',
          borderRight: '1px solid var(--border-color)', zIndex: 250,
          display: 'flex', flexDirection: 'column',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 32 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #dc2626, #f87171)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
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
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                background: isActive ? 'rgba(220,38,38,0.1)' : 'transparent',
                borderLeft: isActive ? '3px solid #dc2626' : '3px solid transparent',
              }}>
                <Icon size={18} /> {item.label}
              </Link>
            );
          })}
        </nav>

        <button onClick={() => { dispatch(adminLogout()); navigate('/admin/login'); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
            borderRadius: 10, color: 'var(--color-error)', background: 'transparent',
            fontSize: '0.9rem', width: '100%',
          }}>
          <LogOut size={18} /> Logout
        </button>
      </motion.aside>

      {/* Main content */}
      <div style={{ flex: 1, marginLeft: 260, padding: 32 }}>
        <motion.h1 variants={fadeInUp} initial="hidden" animate="visible"
          style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 32 }}>
          <span style={{ color: 'var(--color-error)' }}>Admin</span> Dashboard
        </motion.h1>

        <motion.div variants={staggerContainer} initial="hidden" animate="visible"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
          <AdminStatCard icon={Users} label="Total Users" value={overview?.total_users || 0} color="#6366f1" trend="+12 this week" />
          <AdminStatCard icon={Activity} label="DAU" value={overview?.dau || 0} color="#22d3ee" />
          <AdminStatCard icon={MessageSquare} label="Total Queries" value={overview?.total_queries || 0} color="#34d399" trend="+156 today" />
          <AdminStatCard icon={TrendingUp} label="Avg Confidence" value={`${Math.round((overview?.avg_confidence || 0) * 100)}%`} color="#f97316" />
          <AdminStatCard icon={FileText} label="KB Documents" value={overview?.total_kb_documents || 0} color="#8b5cf6" />
          <AdminStatCard icon={Shield} label="Feedback Score" value={`${Math.round((overview?.feedback_positive_ratio || 0) * 100)}%`} color="#fbbf24" />
        </motion.div>

        {/* Quick links */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" transition={{ delay: 0.3 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          <Link to="/admin/users" style={{ textDecoration: 'none' }}>
            <motion.div {...scaleTap} style={{
              padding: 24, borderRadius: 14, background: 'rgba(99,102,241,0.05)',
              border: '1px solid rgba(99,102,241,0.15)', cursor: 'pointer',
            }}>
              <Users size={24} color="var(--color-primary)" style={{ marginBottom: 12 }} />
              <h3 style={{ fontWeight: 700, marginBottom: 4, color: 'var(--color-text-primary)' }}>User Management</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                View, manage, ban/unban users, reset passwords, export CSV
              </p>
            </motion.div>
          </Link>
          <Link to="/admin/knowledge-base" style={{ textDecoration: 'none' }}>
            <motion.div {...scaleTap} style={{
              padding: 24, borderRadius: 14, background: 'rgba(34,211,238,0.05)',
              border: '1px solid rgba(34,211,238,0.15)', cursor: 'pointer',
            }}>
              <Database size={24} color="var(--color-accent)" style={{ marginBottom: 12 }} />
              <h3 style={{ fontWeight: 700, marginBottom: 4, color: 'var(--color-text-primary)' }}>Knowledge Base</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Upload CBIC documents, manage indexing, trigger re-indexing
              </p>
            </motion.div>
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}
