import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Zap, Server } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminApi } from '../../utils/api';
import { Card, Button, Input, Badge } from '../../components/ui';
import { pageVariants } from '../../animations/variants';
import styles from './Admin.module.css';

interface SettingsState {
  maintenance_mode: boolean;
  rate_limit_per_minute: number;
  max_upload_size_mb: number;
  environment: string;
  vector_store_type: string;
  debug: boolean;
}

export default function AppSettings() {
  const [config, setConfig] = useState<SettingsState>({
    maintenance_mode: false,
    rate_limit_per_minute: 30,
    max_upload_size_mb: 10,
    environment: 'development',
    vector_store_type: 'chromadb',
    debug: false,
  });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    adminApi
      .get('/admin/settings')
      .then((r) => {
        if (r.data?.data) setConfig(r.data.data);
      })
      .catch(() => toast.error('Failed to load runtime settings'));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminApi.patch('/admin/settings', {
        maintenance_mode: config.maintenance_mode,
        rate_limit_per_minute: Number(config.rate_limit_per_minute),
      });
      toast.success('Runtime settings updated');
      setHasChanges(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const toggleMaintenance = async () => {
    try {
      const { data } = await adminApi.post('/admin/settings/maintenance-mode');
      const mode = Boolean(data.data?.maintenance_mode);
      setConfig((prev) => ({ ...prev, maintenance_mode: mode }));
      toast.success(data.message || `Maintenance mode ${mode ? 'enabled' : 'disabled'}`);
    } catch {
      toast.error('Failed to toggle maintenance mode');
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
          <div className={styles.kicker}>System Configuration</div>
          <h1 className={styles.title}>Application Settings</h1>
          <p className={styles.subtitle}>Manage runtime maintenance mode, rate limits, and inspect server environment.</p>
        </div>
      </div>

      <div className={styles.gridEqual}>
        <Card className={styles.card} shadow>
          <h2 className={styles.cardTitle}>
            <span><Zap size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Runtime Controls</span>
          </h2>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className={styles.settingRow}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Maintenance Mode</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
                  Returns HTTP 503 for all non-admin API endpoints immediately
                </div>
              </div>
              <button
                type="button"
                onClick={toggleMaintenance}
                className={styles.switchBtn}
                style={{ background: config.maintenance_mode ? 'var(--danger)' : 'var(--rule)' }}
                aria-label="Toggle maintenance mode"
              >
                <div
                  className={styles.switchThumb}
                  style={{ transform: config.maintenance_mode ? 'translateX(22px)' : 'translateX(3px)' }}
                />
              </button>
            </div>

            <Input
              label="Rate Limit (requests / minute)"
              type="number"
              min={1}
              max={1000}
              value={config.rate_limit_per_minute}
              onChange={(e) => {
                setConfig({ ...config, rate_limit_per_minute: Number(e.target.value) });
                setHasChanges(true);
              }}
            />

            <Button type="submit" disabled={!hasChanges} loading={saving}>
              <Save size={15} /> Save Runtime Settings
            </Button>
          </form>
        </Card>

        <Card className={styles.card} shadow>
          <h2 className={styles.cardTitle}>
            <span><Server size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Environment Telemetry</span>
          </h2>
          <div className={styles.settingRow}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>Environment</span>
            <Badge variant="info">{config.environment}</Badge>
          </div>
          <div className={styles.settingRow}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>Vector Store</span>
            <span className="tabular" style={{ fontWeight: 600 }}>{config.vector_store_type}</span>
          </div>
          <div className={styles.settingRow}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>Max Upload Limit</span>
            <span className="tabular" style={{ fontWeight: 600 }}>{config.max_upload_size_mb} MB</span>
          </div>
          <div className={styles.settingRow}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>Debug Mode</span>
            <Badge variant={config.debug ? 'warning' : 'success'}>{config.debug ? 'Enabled' : 'Disabled'}</Badge>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
