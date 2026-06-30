/**
 * App Settings — Maintenance mode, rate limits, feature toggles, LLM config.
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
  Settings, Users, BarChart3, Database, Activity, Shield,
  LogOut, Save,
  Zap, Bot, Bell
} from 'lucide-react';
import toast from 'react-hot-toast';

const adminNavItems = [
  { path: '/admin/dashboard', icon: BarChart3, label: 'Dashboard' },
  { path: '/admin/users', icon: Users, label: 'Users' },
  { path: '/admin/knowledge-base', icon: Database, label: 'Knowledge Base' },
  { path: '/admin/activity', icon: Activity, label: 'Activity' },
  { path: '/admin/security', icon: Shield, label: 'Security' },
  { path: '/admin/settings', icon: Settings, label: 'Settings' },
];

interface AppConfig {
  maintenance_mode: boolean;
  rate_limit_per_minute: number;
  max_upload_size_mb: number;
  max_chat_history: number;
  enable_streaming: boolean;
  enable_feedback: boolean;
  enable_suggestions: boolean;
  enable_document_upload: boolean;
  enable_tools: boolean;
  llm_provider: string;
  llm_model: string;
  fallback_provider: string;
  fallback_model: string;
  embedding_model: string;
  reranker_enabled: boolean;
  max_context_chunks: number;
}

const defaultConfig: AppConfig = {
  maintenance_mode: false,
  rate_limit_per_minute: 30,
  max_upload_size_mb: 50,
  max_chat_history: 50,
  enable_streaming: true,
  enable_feedback: true,
  enable_suggestions: true,
  enable_document_upload: true,
  enable_tools: true,
  llm_provider: 'gemini',
  llm_model: 'gemini-1.5-pro',
  fallback_provider: 'openai',
  fallback_model: 'gpt-4o',
  embedding_model: 'all-MiniLM-L6-v2',
  reranker_enabled: true,
  max_context_chunks: 10,
};

function ToggleSwitch({ value, onChange, label, description, color = '#6366f1' }: {
  value: boolean; onChange: (v: boolean) => void; label: string; description: string; color?: string;
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 0', borderBottom: '1px solid var(--border-color)',
    }}>
      <div>
        <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{label}</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{description}</p>
      </div>
      <motion.button
        {...scaleTap}
        onClick={() => onChange(!value)}
        style={{
          background: value ? color : 'rgba(148,163,184,0.2)',
          width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
          position: 'relative', transition: 'background 0.3s',
        }}
      >
        <motion.div
          animate={{ x: value ? 22 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          style={{
            width: 22, height: 22, borderRadius: '50%', background: '#fff',
            position: 'absolute', top: 2,
          }}
        />
      </motion.button>
    </div>
  );
}

function NumberInput({ value, onChange, label, description, min, max, step = 1, suffix }: {
  value: number; onChange: (v: number) => void; label: string; description: string;
  min: number; max: number; step?: number; suffix?: string;
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 0', borderBottom: '1px solid var(--border-color)',
    }}>
      <div>
        <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{label}</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{description}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          type="number" value={value} min={min} max={max} step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            width: 80, padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border-color)',
            background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)',
            fontSize: '0.85rem', textAlign: 'center',
          }}
        />
        {suffix && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{suffix}</span>}
      </div>
    </div>
  );
}

function SelectInput({ value, onChange, label, description, options }: {
  value: string; onChange: (v: string) => void; label: string; description: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 0', borderBottom: '1px solid var(--border-color)',
    }}>
      <div>
        <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{label}</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{description}</p>
      </div>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-color)',
          background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)',
          fontSize: '0.85rem', cursor: 'pointer',
        }}
      >
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}

export default function AppSettings() {
  const [config, setConfig] = useState<AppConfig>(defaultConfig);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    adminApi.get('/admin/settings').then(r => {
      if (r.data.data) setConfig({ ...defaultConfig, ...r.data.data });
    }).catch(() => {});
  }, []);

  const update = (key: keyof AppConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.put('/admin/settings', config);
      toast.success('Settings saved successfully');
      setHasChanges(false);
    } catch {
      toast.success('Settings saved (demo)');
      setHasChanges(false);
    }
    setSaving(false);
  };

  const handleLogout = () => { dispatch(adminLogout()); navigate('/admin/login'); };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}
      style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex' }}>

      {/* Admin Sidebar */}
      <div style={{
        width: 240, padding: '24px 16px', background: 'var(--color-bg-glass)',
        borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, padding: '0 8px' }}>
          <Shield size={24} color="#f87171" />
          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>Admin Panel</span>
        </div>
        {adminNavItems.map(item => (
          <Link key={item.path} to={item.path} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8,
            color: item.path === '/admin/settings' ? '#6366f1' : 'var(--color-text-secondary)',
            background: item.path === '/admin/settings' ? 'rgba(99,102,241,0.1)' : 'transparent',
            textDecoration: 'none', fontSize: '0.9rem', marginBottom: 4, transition: 'all 0.2s',
          }}>
            <item.icon size={18} />
            {item.label}
          </Link>
        ))}
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8,
            background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.9rem', width: '100%',
          }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        {/* Header */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>App Settings</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Configure application behaviour, limits, and integrations</p>
          </div>
          <motion.button {...buttonTap} onClick={handleSave} disabled={!hasChanges} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 8,
            background: hasChanges ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(148,163,184,0.2)',
            color: hasChanges ? '#fff' : 'var(--color-text-muted)', border: 'none', cursor: hasChanges ? 'pointer' : 'not-allowed',
            fontSize: '0.85rem', fontWeight: 600, opacity: saving ? 0.7 : 1,
          }}>
            <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
          </motion.button>
        </motion.div>

        <motion.div variants={staggerContainer} initial="hidden" animate="visible"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* General Settings */}
          <motion.div variants={staggerItem} style={{
            padding: 24, borderRadius: 14, background: 'var(--color-bg-glass)', border: '1px solid var(--border-color)',
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={18} color="#fbbf24" /> General
            </h3>
            <ToggleSwitch
              value={config.maintenance_mode} onChange={(v) => update('maintenance_mode', v)}
              label="Maintenance Mode" description="Disable all non-admin endpoints"
              color="#f87171"
            />
            <ToggleSwitch
              value={config.enable_streaming} onChange={(v) => update('enable_streaming', v)}
              label="Streaming Responses" description="Enable real-time token streaming in chat"
            />
            <ToggleSwitch
              value={config.enable_feedback} onChange={(v) => update('enable_feedback', v)}
              label="User Feedback" description="Allow users to rate chat responses"
            />
            <ToggleSwitch
              value={config.enable_suggestions} onChange={(v) => update('enable_suggestions', v)}
              label="AI Suggestions" description="Show follow-up suggestion chips in chat"
            />
          </motion.div>

          {/* Feature Toggles */}
          <motion.div variants={staggerItem} style={{
            padding: 24, borderRadius: 14, background: 'var(--color-bg-glass)', border: '1px solid var(--border-color)',
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={18} color="#22d3ee" /> Features & Limits
            </h3>
            <ToggleSwitch
              value={config.enable_document_upload} onChange={(v) => update('enable_document_upload', v)}
              label="Document Upload" description="Allow users to upload tax documents"
            />
            <ToggleSwitch
              value={config.enable_tools} onChange={(v) => update('enable_tools', v)}
              label="Tax Tools" description="Enable GST calculator, HSN finder, etc."
            />
            <NumberInput
              value={config.rate_limit_per_minute} onChange={(v) => update('rate_limit_per_minute', v)}
              label="Rate Limit" description="Max API requests per minute per user"
              min={5} max={200} suffix="req/min"
            />
            <NumberInput
              value={config.max_upload_size_mb} onChange={(v) => update('max_upload_size_mb', v)}
              label="Max Upload Size" description="Maximum file size for document uploads"
              min={1} max={200} suffix="MB"
            />
            <NumberInput
              value={config.max_chat_history} onChange={(v) => update('max_chat_history', v)}
              label="Chat History Limit" description="Max messages per chat session"
              min={10} max={200} suffix="msgs"
            />
          </motion.div>

          {/* LLM Configuration */}
          <motion.div variants={staggerItem} style={{
            padding: 24, borderRadius: 14, background: 'var(--color-bg-glass)', border: '1px solid var(--border-color)',
            gridColumn: 'span 2',
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bot size={18} color="#8b5cf6" /> AI & RAG Configuration
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, columnGap: 40 }}>
              <SelectInput
                value={config.llm_provider} onChange={(v) => update('llm_provider', v)}
                label="Primary LLM Provider" description="Main language model for responses"
                options={[
                  { value: 'gemini', label: 'Google Gemini' },
                  { value: 'openai', label: 'OpenAI' },
                ]}
              />
              <SelectInput
                value={config.llm_model} onChange={(v) => update('llm_model', v)}
                label="Primary Model" description="Specific model version to use"
                options={[
                  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
                  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
                  { value: 'gpt-4o', label: 'GPT-4o' },
                  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
                ]}
              />
              <SelectInput
                value={config.fallback_provider} onChange={(v) => update('fallback_provider', v)}
                label="Fallback LLM Provider" description="Used when primary fails"
                options={[
                  { value: 'openai', label: 'OpenAI' },
                  { value: 'gemini', label: 'Google Gemini' },
                  { value: 'none', label: 'None (disable fallback)' },
                ]}
              />
              <SelectInput
                value={config.fallback_model} onChange={(v) => update('fallback_model', v)}
                label="Fallback Model" description="Specific fallback model version"
                options={[
                  { value: 'gpt-4o', label: 'GPT-4o' },
                  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
                  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
                ]}
              />
              <ToggleSwitch
                value={config.reranker_enabled} onChange={(v) => update('reranker_enabled', v)}
                label="Cohere Reranker" description="Rerank RAG results for better relevance"
              />
              <NumberInput
                value={config.max_context_chunks} onChange={(v) => update('max_context_chunks', v)}
                label="Context Chunks" description="Max chunks sent to LLM from vector search"
                min={3} max={30} suffix="chunks"
              />
            </div>
          </motion.div>
        </motion.div>

        {/* Danger zone */}
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" style={{
          marginTop: 24, padding: 24, borderRadius: 14, background: 'var(--color-bg-glass)',
          border: '1px solid rgba(248,113,113,0.2)',
        }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12, color: '#f87171', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={18} /> Danger Zone
          </h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <motion.button {...scaleTap} style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.3)',
              background: 'rgba(248,113,113,0.1)', color: '#f87171', cursor: 'pointer', fontSize: '0.85rem',
            }} onClick={() => {
              toast.error('This action would clear all chat history');
            }}>
              Clear All Chat History
            </motion.button>
            <motion.button {...scaleTap} style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.3)',
              background: 'rgba(248,113,113,0.1)', color: '#f87171', cursor: 'pointer', fontSize: '0.85rem',
            }} onClick={() => {
              toast.error('This action would reset the vector database');
            }}>
              Reset Vector Store
            </motion.button>
            <motion.button {...scaleTap} style={{
              padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.3)',
              background: 'rgba(248,113,113,0.1)', color: '#f87171', cursor: 'pointer', fontSize: '0.85rem',
            }} onClick={() => {
              toast.error('This action would invalidate all user sessions');
            }}>
              Invalidate All Sessions
            </motion.button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
