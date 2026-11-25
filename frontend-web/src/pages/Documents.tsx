import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Upload,
  FileText,
  Trash2,
  Search,
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ScanText,
} from 'lucide-react';
import { Button, Card, EmptyState, Modal, Badge, Skeleton } from '../components/ui';
import { pageVariants } from '../animations/variants';
import styles from './Documents.module.css';
import toast from 'react-hot-toast';
import api from '../utils/api';

interface DocumentItem {
  id: number;
  filename: string;
  file_size: number;
  status: string;
  chunks_count?: number;
  ocr_used?: boolean;
  created_at?: string;
}

export default function Documents() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteModal, setDeleteModal] = useState<DocumentItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/documents/list');
      setDocuments(Array.isArray(data.data) ? data.data : []);
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const uploadFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are supported for statutory indexing');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploaded = data.data as DocumentItem;
      toast.success(`"${uploaded?.filename || file.name}" uploaded and indexed`);
      await loadDocuments();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/documents/${id}`);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast.success('Document deleted');
      setDeleteModal(null);
    } catch {
      toast.error('Delete failed');
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 KB';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  };

  const filtered = documents.filter((d) =>
    (d.filename || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      className={styles.documents}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className={styles.header}>
        <div>
          <div className={styles.kicker}>Private RAG Index</div>
          <h1 className={styles.title}>Documents Vault</h1>
          <p className={styles.subtitle}>
            Upload GST returns, SCN notices, or tax invoices (PDF). Indexed chunks become queryable in AI Chat.
          </p>
        </div>

        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          loading={uploading}
        >
          <Upload size={16} /> Upload PDF
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInput}
          style={{ display: 'none' }}
          disabled={uploading}
        />
      </div>

      {/* Drag & Drop Zone */}
      <div
        className={`${styles.dropzone} ${dragOver ? styles.dropzoneActive : ''}`}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className={styles.dropIcon}>
          <Upload size={20} />
        </div>
        <div className={styles.dropTitle}>
          {uploading ? 'Extracting text & indexing chunks...' : 'Drop a PDF here or click to browse'}
        </div>
        <div className={styles.dropSub}>
          PDF files up to 10 MB · Automatic OCR fallback for scanned notices
        </div>
      </div>

      {documents.length > 0 && (
        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter uploaded documents..."
              className={styles.searchInput}
            />
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
            {filtered.length} of {documents.length} documents
          </span>
        </div>
      )}

      {loading ? (
        <div className={styles.list}>
          <Skeleton variant="card" style={{ height: 78 }} />
          <Skeleton variant="card" style={{ height: 78 }} />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={documents.length === 0 ? 'No documents indexed yet' : 'No matching documents'}
          description={
            documents.length === 0
              ? 'Upload a GST notice, GSTR summary, or invoice PDF above to index it into your private knowledge context.'
              : 'Try clearing your search filter.'
          }
        />
      ) : (
        <div className={styles.list}>
          {filtered.map((doc) => (
            <Card key={doc.id} className={styles.docCard} shadow>
              <div className={styles.docLeft}>
                <div className={styles.docIcon}>
                  <FileText size={22} strokeWidth={1.75} />
                </div>
                <div className={styles.docInfo}>
                  <div className={styles.docName}>{doc.filename}</div>
                  <div className={styles.docMeta}>
                    <span>{formatBytes(doc.file_size)}</span>
                    <span>•</span>
                    <span>
                      {doc.created_at
                        ? new Date(doc.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })
                        : 'Recent'}
                    </span>
                    {typeof doc.chunks_count === 'number' && (
                      <>
                        <span>•</span>
                        <span>{doc.chunks_count} chunks</span>
                      </>
                    )}
                    {doc.ocr_used && (
                      <Badge variant="info">
                        <ScanText size={11} /> OCR
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.docActions}>
                <Badge
                  variant={
                    doc.status === 'completed'
                      ? 'success'
                      : doc.status === 'failed'
                      ? 'danger'
                      : 'warning'
                  }
                >
                  {doc.status === 'completed' ? (
                    <CheckCircle2 size={11} />
                  ) : doc.status === 'failed' ? (
                    <AlertTriangle size={11} />
                  ) : (
                    <Clock size={11} />
                  )}
                  {doc.status}
                </Badge>

                <Link to="/chat">
                  <Button variant="secondary" size="sm">
                    <MessageSquare size={14} /> Query
                  </Button>
                </Link>

                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  onClick={() => setDeleteModal(doc)}
                  aria-label="Delete document"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={deleteModal !== null}
        onClose={() => setDeleteModal(null)}
        title="Delete Document"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteModal(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => deleteModal && handleDelete(deleteModal.id)}>
              Delete
            </Button>
          </>
        }
      >
        <p>
          Are you sure you want to delete <strong>{deleteModal?.filename}</strong>? This removes the file from your vault.
        </p>
      </Modal>
    </motion.div>
  );
}
