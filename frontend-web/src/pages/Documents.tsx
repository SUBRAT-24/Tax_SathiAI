/**
 * Documents — File upload with drag-and-drop, document list.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { pageVariants, pageTransition, staggerContainer, staggerItem, fadeInUp, scaleTap } from '../animations/variants';
import { Upload, FileText, Trash2, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Documents() {
  const [docs, setDocs] = useState<any[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchDocs = () => {
    api.get('/documents/list').then(r => setDocs(r.data.data || [])).catch(() => {});
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are allowed');
      return;
    }
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Document uploaded!');
      fetchDocs();
    } catch { toast.error('Upload failed'); }
    setUploading(false);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/documents/${id}`);
      toast.success('Document deleted');
      fetchDocs();
    } catch { toast.error('Delete failed'); }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, []);

  const statusIcon = (s: string) => {
    if (s === 'completed') return <CheckCircle size={16} color="var(--color-success)" />;
    if (s === 'processing') return <Clock size={16} color="var(--color-warning)" />;
    return <AlertCircle size={16} color="var(--color-error)" />;
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
      <motion.h1 variants={fadeInUp} initial="hidden" animate="visible"
        style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 32 }}>
        Documents
      </motion.h1>

      {/* Upload zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        animate={{ scale: dragging ? 1.02 : 1, borderColor: dragging ? 'var(--color-primary)' : 'rgba(148,163,184,0.15)' }}
        style={{
          padding: 48, borderRadius: 'var(--border-radius-lg)',
          border: '2px dashed rgba(148,163,184,0.15)',
          background: dragging ? 'rgba(99,102,241,0.05)' : 'var(--color-bg-glass)',
          textAlign: 'center', marginBottom: 32, cursor: 'pointer',
          transition: 'all 0.3s',
        }}
        onClick={() => {
          const input = document.createElement('input');
          input.type = 'file'; input.accept = '.pdf';
          input.onchange = (e: any) => { if (e.target.files[0]) handleUpload(e.target.files[0]); };
          input.click();
        }}
      >
        <motion.div animate={{ y: dragging ? -8 : 0 }}>
          <Upload size={40} color="var(--color-primary)" style={{ marginBottom: 16 }} />
          <p style={{ fontWeight: 600, marginBottom: 4 }}>
            {uploading ? 'Uploading...' : 'Drop PDF here or click to upload'}
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            PDF files only, max 50MB
          </p>
        </motion.div>
      </motion.div>

      {/* Document list */}
      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        {docs.map((doc) => (
          <motion.div
            key={doc.id}
            variants={staggerItem}
            whileHover={{ x: 4 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 20px', marginBottom: 8,
              background: 'var(--color-surface)', borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <FileText size={20} color="var(--color-primary)" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{doc.filename}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>
                  {(doc.file_size / 1024).toFixed(0)} KB • {doc.chunks_count} chunks • {new Date(doc.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className={`badge ${doc.status === 'completed' ? 'badge-success' : doc.status === 'processing' ? 'badge-warning' : 'badge-error'}`}>
                {statusIcon(doc.status)} {doc.status}
              </span>
              <motion.button {...scaleTap} onClick={() => handleDelete(doc.id)} className="btn-icon" style={{ color: 'var(--color-error)' }}>
                <Trash2 size={16} />
              </motion.button>
            </div>
          </motion.div>
        ))}
        {docs.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 40 }}>
            No documents uploaded yet. Upload a GST return or invoice to get started.
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
