/**
 * Knowledge Base — Upload, manage, and re-index CBIC documents.
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDispatch } from 'react-redux';
import { adminLogout } from '../../store/authSlice';
import {
  pageVariants, pageTransition, staggerContainer, staggerItem,
  fadeInUp, scaleTap, buttonTap
} from '../../animations/variants';
import { adminApi } from '../../utils/api';
import {
  Database, Upload, Trash2, RefreshCcw, CheckCircle,
  XCircle, Shield, Users, BarChart3, LogOut
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function KnowledgeBase() {
  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const fetchDocs = () => {
    adminApi.get('/admin/knowledge-base').then(r => setDocs(r.data.data || [])).catch(() => {});
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleUpload = async () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.pdf';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      try {
        await adminApi.post('/admin/knowledge-base/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Document indexed!');
        fetchDocs();
      } catch { toast.error('Upload failed'); }
      setUploading(false);
    };
    input.click();
  };

  const handleDelete = async (id: number) => {
    try {
      await adminApi.delete(`/admin/knowledge-base/${id}`);
      toast.success('Document removed');
      fetchDocs();
    } catch { toast.error('Delete failed'); }
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      const { data } = await adminApi.post('/admin/knowledge-base/reindex');
      toast.success(`Re-indexed ${data.data?.indexed_count || 0} documents`);
    } catch { toast.error('Re-indexing failed'); }
    setReindexing(false);
  };

  const adminNavItems = [
    { path: '/admin/dashboard', icon: BarChart3, label: 'Dashboard' },
    { path: '/admin/users', icon: Users, label: 'Users' },
    { path: '/admin/knowledge-base', icon: Database, label: 'Knowledge Base' },
  ];

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}
      style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
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
          <div><div style={{ fontSize: '1rem', fontWeight: 800 }}>Admin Panel</div><div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>TaxSathi AI</div></div>
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
            <span style={{ color: 'var(--color-error)' }}>Knowledge</span> Base
          </h1>
          <div style={{ display: 'flex', gap: 10 }}>
            <motion.button {...buttonTap} onClick={handleReindex} disabled={reindexing}
              className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
              <RefreshCcw size={16} className={reindexing ? 'animate-spin' : ''} />
              {reindexing ? 'Re-indexing...' : 'Re-index All'}
            </motion.button>
            <motion.button {...buttonTap} onClick={handleUpload} disabled={uploading}
              className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
              <Upload size={16} /> {uploading ? 'Uploading...' : 'Upload Document'}
            </motion.button>
          </div>
        </motion.div>

        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
          {docs.map((doc) => (
            <motion.div key={doc.id} variants={staggerItem} whileHover={{ x: 4 }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', marginBottom: 8, background: 'var(--color-surface)',
                borderRadius: 10, border: '1px solid var(--border-color)',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Database size={20} color="var(--color-accent)" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{doc.doc_name}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                    {doc.chunks_count} chunks • {doc.category || 'general'} •{' '}
                    {doc.ingested_at ? new Date(doc.ingested_at).toLocaleDateString() : 'Not indexed'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className={`badge ${doc.is_active ? 'badge-success' : 'badge-error'}`}>
                  {doc.is_active ? <><CheckCircle size={12} /> Active</> : <><XCircle size={12} /> Removed</>}
                </span>
                <motion.button {...scaleTap} onClick={() => handleDelete(doc.id)} className="btn-icon"
                  style={{ color: 'var(--color-error)' }}>
                  <Trash2 size={16} />
                </motion.button>
              </div>
            </motion.div>
          ))}
          {docs.length === 0 && (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-text-muted)' }}>
              <Database size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
              <p>No documents in the knowledge base. Upload CBIC PDFs to get started.</p>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
