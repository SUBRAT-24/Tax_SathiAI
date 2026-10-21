/**
 * Tools Page — GST Calculator, ITC Checker, HSN Finder, Late Fee Calculator.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { pageVariants, pageTransition, fadeInUp, staggerContainer, staggerItem, scaleTap, buttonTap } from '../animations/variants';
import { Calculator, Search, Clock, ArrowRight } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

function ToolCard({ title, icon: Icon, color, children }: any) {
  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ y: -5, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
      className="card-cinematic"
      style={{
        padding: 26, borderRadius: 'var(--border-radius-lg)',
        background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.07)',
        position: 'relative', overflow: 'hidden',
      }}>
      <div style={{
        position: 'absolute', top: 0, right: 0, width: 140, height: 140,
        background: `radial-gradient(circle at top right, ${color}15 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, background: color + '15',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${color}30`,
          boxShadow: `0 0 16px ${color}15`,
        }}>
          <Icon size={20} color={color} />
        </div>
        <h3 style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

export default function Tools() {
  const [gstForm, setGstForm] = useState({ amount: '', rate: '18', is_igst: false });
  const [gstResult, setGstResult] = useState<any>(null);
  const [hsnQuery, setHsnQuery] = useState('');
  const [hsnResults, setHsnResults] = useState<any[]>([]);
  const [lateForm, setLateForm] = useState({ return_type: 'GSTR-3B', due_date: '', filing_date: '', tax_liability: '0' });
  const [lateResult, setLateResult] = useState<any>(null);

  const calcGST = async () => {
    if (!gstForm.amount) return;
    try {
      const { data } = await api.post('/tools/gst-calculator', {
        amount: parseFloat(gstForm.amount), rate: parseFloat(gstForm.rate), is_igst: gstForm.is_igst
      });
      setGstResult(data.data);
    } catch { toast.error('Calculation failed'); }
  };

  const searchHSN = async () => {
    if (!hsnQuery) return;
    try {
      const { data } = await api.get(`/tools/hsn-search?q=${hsnQuery}`);
      setHsnResults(data.data || []);
    } catch { toast.error('Search failed'); }
  };

  const calcLateFee = async () => {
    if (!lateForm.due_date || !lateForm.filing_date) return;
    try {
      const { data } = await api.post('/tools/late-fee-calculator', {
        ...lateForm, tax_liability: parseFloat(lateForm.tax_liability) || 0
      });
      setLateResult(data.data);
    } catch { toast.error('Calculation failed'); }
  };

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit" transition={pageTransition}>
      <motion.h1 variants={fadeInUp} initial="hidden" animate="visible"
        style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 32 }}>
        GST Tools
      </motion.h1>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 24 }}>

        {/* GST Calculator */}
        <ToolCard title="GST Calculator" icon={Calculator} color="#6366f1">
          <div style={{ display: 'grid', gap: 12 }}>
            <input className="input" type="number" placeholder="Amount (₹)" value={gstForm.amount}
              onChange={e => setGstForm({...gstForm, amount: e.target.value})} />
            <select className="input" value={gstForm.rate} onChange={e => setGstForm({...gstForm, rate: e.target.value})}
              style={{ background: 'var(--color-bg-secondary)' }}>
              {[0, 0.25, 3, 5, 12, 18, 28, 40].map(r => <option key={r} value={r}>{r}%</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              <input type="checkbox" checked={gstForm.is_igst} onChange={e => setGstForm({...gstForm, is_igst: e.target.checked})} />
              Inter-state (IGST)
            </label>
            <motion.button {...buttonTap} onClick={calcGST} className="btn btn-primary" style={{ width: '100%' }}>
              Calculate <ArrowRight size={16} />
            </motion.button>
            {gstResult && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{ padding: 16, background: 'rgba(99,102,241,0.08)', borderRadius: 10, fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>Base Amount</span><span style={{ fontWeight: 700 }}>₹{gstResult.base_amount?.toLocaleString()}</span>
                </div>
                {gstResult.cgst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>CGST</span><span style={{ fontWeight: 600 }}>₹{gstResult.cgst?.toLocaleString()}</span></div>}
                {gstResult.sgst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>SGST</span><span style={{ fontWeight: 600 }}>₹{gstResult.sgst?.toLocaleString()}</span></div>}
                {gstResult.igst > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>IGST</span><span style={{ fontWeight: 600 }}>₹{gstResult.igst?.toLocaleString()}</span></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border-color)', fontWeight: 800, fontSize: '1rem' }}>
                  <span>Total</span><span className="gradient-text">₹{gstResult.total_amount?.toLocaleString()}</span>
                </div>
              </motion.div>
            )}
          </div>
        </ToolCard>

        {/* HSN Finder */}
        <ToolCard title="HSN Code Finder" icon={Search} color="#22d3ee">
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="Search HSN code or product..." value={hsnQuery}
                onChange={e => setHsnQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchHSN()} />
              <motion.button {...scaleTap} onClick={searchHSN} className="btn btn-primary" style={{ flexShrink: 0 }}>
                <Search size={16} />
              </motion.button>
            </div>
            {hsnResults.length > 0 && (
              <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                {hsnResults.map((r, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                    style={{
                      padding: '10px 12px', marginBottom: 4, borderRadius: 6,
                      background: 'rgba(30,41,59,0.5)', fontSize: '0.85rem',
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, color: 'var(--color-accent)' }}>{r.hsn_code}</span>
                      <span className="badge badge-info">{r.gst_rate}% GST</span>
                    </div>
                    <div style={{ color: 'var(--color-text-secondary)', marginTop: 2 }}>{r.description}</div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </ToolCard>

        {/* Late Fee Calculator */}
        <ToolCard title="Late Fee Calculator" icon={Clock} color="#f97316">
          <div style={{ display: 'grid', gap: 12 }}>
            <select className="input" value={lateForm.return_type} onChange={e => setLateForm({...lateForm, return_type: e.target.value})}
              style={{ background: 'var(--color-bg-secondary)' }}>
              {['GSTR-3B', 'GSTR-1', 'GSTR-9'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 4, display: 'block' }}>Due Date</label>
                <input className="input" type="date" value={lateForm.due_date} onChange={e => setLateForm({...lateForm, due_date: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginBottom: 4, display: 'block' }}>Filing Date</label>
                <input className="input" type="date" value={lateForm.filing_date} onChange={e => setLateForm({...lateForm, filing_date: e.target.value})} />
              </div>
            </div>
            <input className="input" type="number" placeholder="Tax Liability (₹)" value={lateForm.tax_liability}
              onChange={e => setLateForm({...lateForm, tax_liability: e.target.value})} />
            <motion.button {...buttonTap} onClick={calcLateFee} className="btn btn-primary" style={{ width: '100%' }}>
              Calculate Late Fee <ArrowRight size={16} />
            </motion.button>
            {lateResult && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{ padding: 16, background: 'rgba(249,115,22,0.08)', borderRadius: 10, fontSize: '0.85rem' }}>
                <div style={{ marginBottom: 6 }}><span style={{ color: 'var(--color-text-muted)' }}>Days Late:</span> <strong>{lateResult.days_late}</strong></div>
                <div style={{ marginBottom: 6 }}><span style={{ color: 'var(--color-text-muted)' }}>Late Fee:</span> <strong>₹{lateResult.late_fee?.toLocaleString()}</strong></div>
                <div style={{ marginBottom: 6 }}><span style={{ color: 'var(--color-text-muted)' }}>Interest:</span> <strong>₹{lateResult.interest_on_tax?.toLocaleString()}</strong></div>
                <div style={{ paddingTop: 8, borderTop: '1px solid var(--border-color)', fontWeight: 800, color: 'var(--color-error)' }}>
                  Total Penalty: ₹{lateResult.total_penalty?.toLocaleString()}
                </div>
              </motion.div>
            )}
          </div>
        </ToolCard>
      </motion.div>
    </motion.div>
  );
}
