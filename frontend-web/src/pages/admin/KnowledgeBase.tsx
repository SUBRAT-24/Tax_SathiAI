import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Database, Upload, Trash2, RefreshCcw, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../utils/api';
import { Card, Button, Badge, EmptyState } from '../../components/ui';
import { pageVariants } from '../../animations/variants';
import styles from './Admin.module.css';

export default function KnowledgeBase() {
  const [docs, setDocs] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchDocs = () => {
    adminApi
      .get('/admin/knowledge-base')
      .then((r) => setDocs(r.data.data || []))
      .catch(() => toast.error('Failed to load knowledge base'));
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await adminApi.post('/admin/knowledge-base/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('CBIC document uploaded and indexed');
      fetchDocs();
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await adminApi.delete(`/admin/knowledge-base/${id}`);
      toast.success('Document removed from active KB');
      fetchDocs();
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      const { data } = await adminApi.post('/admin/knowledge-base/reindex');
      toast.success(`Re-indexed ${data.data?.indexed_count || 0} documents`);
      fetchDocs();
    } catch {
      toast.error('Re-indexing failed');
    } finally {
      setReindexing(false);
    }
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
          <div className={styles.kicker}>Statutory RAG Corpus</div>
          <h1 className={styles.title}>Knowledge Base</h1>
          <p className={styles.subtitle}>Manage official CBIC Acts, Rules, Circulars, and vector embeddings.</p>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" size="sm" onClick={handleReindex} loading={reindexing}>
            <RefreshCcw size={15} /> Re-index All
          </Button>
          <Button variant="primary" size="sm" onClick={() => fileRef.current?.click()} loading={uploading}>
            <Upload size={15} /> Upload CBIC PDF
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {docs.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No knowledge base documents"
          description="Upload CBIC Acts, Rules, or Notifications (PDF) to index them into ChromaDB."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {docs.map((doc) => (
            <Card key={doc.id} className={styles.card} style={{ padding: '14px 18px' }} shadow>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className={styles.statIcon} style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                    <Database size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{doc.doc_name}</div>
                    <div className="tabular" style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
                      {doc.chunks_count} chunks · {doc.category || 'general'} ·{' '}
                      {doc.ingested_at ? new Date(doc.ingested_at).toLocaleDateString('en-IN') : 'Not indexed'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Badge variant={doc.is_active ? 'success' : 'danger'}>
                    {doc.is_active ? <><CheckCircle size={11} /> Active</> : <><XCircle size={11} /> Inactive</>}
                  </Badge>
                  {doc.is_active && (
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      onClick={() => handleDelete(doc.id)}
                      aria-label="Remove document"
                    >
                      <Trash2 size={15} />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
