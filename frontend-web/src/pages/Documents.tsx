import { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileText, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, Modal } from '../components/ui';
import { pageVariants } from '../animations/variants';
import styles from './Documents.module.css';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function Documents() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deleteModal, setDeleteModal] = useState<number | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 10MB limit
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post('/documents/upload', formData);
      setDocuments([...documents, res.data]);
      toast.success('Document uploaded');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/documents/${id}`);
      setDocuments(documents.filter(d => d.id !== id));
      toast.success('Document deleted');
      setDeleteModal(null);
    } catch {
      toast.error('Delete failed');
    }
  };

  return (
    <motion.div
      className={styles.documents}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className={styles.header}>
        <h1 className={styles.title}>Documents</h1>
        <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
          <span style={{ display: 'inline-flex' }}>
            <Button disabled={uploading} loading={uploading}>
              <Upload size={18} strokeWidth={1.5} /> Upload
            </Button>
          </span>
          <input
            id="file-upload"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleUpload}
            style={{ display: 'none' }}
            disabled={uploading}
          />
        </label>
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description="Upload invoices, returns, or notices for analysis. Supports PDF and Word documents up to 10MB."
        />
      ) : (
        <div className={styles.list}>
          {documents.map((doc) => (
            <Card key={doc.id} className={styles.docCard}>
              <div className={styles.docIcon}>
                <FileText size={24} strokeWidth={1.5} />
              </div>
              <div className={styles.docInfo}>
                <div className={styles.docName}>{doc.filename}</div>
                <div className={styles.docMeta}>
                  {(doc.size_bytes / 1024).toFixed(0)} KB • {new Date(doc.uploaded_at).toLocaleDateString()}
                </div>
              </div>
              <Button
                variant="ghost"
                iconOnly
                onClick={() => setDeleteModal(doc.id)}
                aria-label="Delete document"
              >
                <Trash2 size={18} strokeWidth={1.5} />
              </Button>
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
            <Button variant="danger" onClick={() => deleteModal && handleDelete(deleteModal)}>
              Delete
            </Button>
          </>
        }
      >
        <p>Are you sure you want to delete this document? This action cannot be undone.</p>
      </Modal>
    </motion.div>
  );
}
