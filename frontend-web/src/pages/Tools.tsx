import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calculator,
  Search,
  Calendar,
  Scale,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Card, Input, Button, Select, Checkbox, Badge, Table } from '../components/ui';
import { pageVariants } from '../animations/variants';
import styles from './Tools.module.css';
import toast from 'react-hot-toast';
import api from '../utils/api';

type ToolTab = 'calculator' | 'itc' | 'hsn' | 'latefee' | 'gstin' | 'dates';

const INR = (n: number) =>
  `₹ ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Tools() {
  const [activeTab, setActiveTab] = useState<ToolTab>('calculator');

  // 1. GST Calculator state
  const [gstForm, setGstForm] = useState({
    amount: '10000',
    rate: '18',
    is_igst: false,
    tax_inclusive: false,
    cess_rate: '0',
    supply_date: new Date().toISOString().slice(0, 10),
  });
  const [gstResult, setGstResult] = useState<any>(null);
  const [gstLoading, setGstLoading] = useState(false);

  // 2. ITC Rule 42 state
  const [itcForm, setItcForm] = useState({
    total_itc: '100000',
    itc_on_non_business: '5000',
    itc_on_exempt_exclusive: '10000',
    itc_blocked_17_5: '8000',
    itc_on_taxable_exclusive: '40000',
    exempt_turnover: '200000',
    total_turnover: '1000000',
    reverse_charge_itc: '12000',
  });
  const [itcResult, setItcResult] = useState<any>(null);
  const [itcLoading, setItcLoading] = useState(false);

  // 3. HSN / SAC Search state
  const [hsnQuery, setHsnQuery] = useState('');
  const [hsnAsOf, setHsnAsOf] = useState('');
  const [hsnResults, setHsnResults] = useState<any[]>([]);
  const [hsnSearched, setHsnSearched] = useState(false);
  const [hsnLoading, setHsnLoading] = useState(false);

  // 4. Late Fee state
  const [lateForm, setLateForm] = useState({
    return_type: 'GSTR-3B',
    due_date: '2026-10-20',
    filing_date: '2026-11-05',
    tax_liability: '25000',
    annual_turnover: '10000000',
    turnover_in_state: '0',
  });
  const [lateResult, setLateResult] = useState<any>(null);
  const [lateLoading, setLateLoading] = useState(false);

  // 5. GSTIN Validator state
  const [gstin, setGstin] = useState('');
  const [gstinResult, setGstinResult] = useState<any>(null);
  const [gstinLoading, setGstinLoading] = useState(false);

  // 6. Due Dates state
  const now = new Date();
  const [dueMonth, setDueMonth] = useState(String(now.getMonth() + 1));
  const [dueYear, setDueYear] = useState(String(now.getFullYear()));
  const [dueDates, setDueDates] = useState<any[]>([]);
  const [dueLoading, setDueLoading] = useState(false);

  const runGSTCalc = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(gstForm.amount);
    if (!amt || amt <= 0) {
      toast.error('Enter a positive amount');
      return;
    }
    setGstLoading(true);
    try {
      const { data } = await api.post('/tools/gst-calculator', {
        amount: amt,
        rate: parseFloat(gstForm.rate),
        is_igst: gstForm.is_igst,
        tax_inclusive: gstForm.tax_inclusive,
        cess_rate: parseFloat(gstForm.cess_rate || '0'),
        supply_date: gstForm.supply_date || undefined,
      });
      if (!data.success) {
        toast.error(data.message || 'Calculation error');
        return;
      }
      setGstResult(data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Calculation failed');
    } finally {
      setGstLoading(false);
    }
  };

  const runITCCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setItcLoading(true);
    try {
      const { data } = await api.post('/tools/itc-checker', {
        total_itc: parseFloat(itcForm.total_itc || '0'),
        itc_on_non_business: parseFloat(itcForm.itc_on_non_business || '0'),
        itc_on_exempt_exclusive: parseFloat(itcForm.itc_on_exempt_exclusive || '0'),
        itc_blocked_17_5: parseFloat(itcForm.itc_blocked_17_5 || '0'),
        itc_on_taxable_exclusive: parseFloat(itcForm.itc_on_taxable_exclusive || '0'),
        exempt_turnover: parseFloat(itcForm.exempt_turnover || '0'),
        total_turnover: parseFloat(itcForm.total_turnover || '0'),
        reverse_charge_itc: parseFloat(itcForm.reverse_charge_itc || '0'),
      });
      setItcResult(data.data);
      toast.success('Rule 42 ITC computed');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'ITC calculation failed');
    } finally {
      setItcLoading(false);
    }
  };

  const runHSNSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hsnQuery.trim().length < 2) {
      toast.error('Enter at least 2 characters to search HSN/SAC');
      return;
    }
    setHsnLoading(true);
    setHsnSearched(true);
    try {
      const { data } = await api.get('/tools/hsn-search', {
        params: { q: hsnQuery.trim(), as_of: hsnAsOf || undefined },
      });
      setHsnResults(data.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'HSN search failed');
    } finally {
      setHsnLoading(false);
    }
  };

  const runLateFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setLateLoading(true);
    try {
      const { data } = await api.post('/tools/late-fee-calculator', {
        return_type: lateForm.return_type,
        due_date: lateForm.due_date,
        filing_date: lateForm.filing_date,
        tax_liability: parseFloat(lateForm.tax_liability || '0'),
        annual_turnover: parseFloat(lateForm.annual_turnover || '0'),
        turnover_in_state: parseFloat(lateForm.turnover_in_state || '0'),
      });
      if (!data.success) {
        toast.error(data.message || 'Invalid late fee inputs');
        return;
      }
      setLateResult(data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Late fee calculation failed');
    } finally {
      setLateLoading(false);
    }
  };

  const validateGSTIN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (gstin.trim().length !== 15) {
      toast.error('GSTIN must be 15 characters');
      return;
    }
    setGstinLoading(true);
    try {
      const { data } = await api.post('/tools/validate-gstin', { gstin: gstin.trim().toUpperCase() });
      setGstinResult(data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Validation failed');
    } finally {
      setGstinLoading(false);
    }
  };

  const fetchDueDates = async (m = dueMonth, y = dueYear) => {
    setDueLoading(true);
    try {
      const { data } = await api.get('/tools/due-dates', {
        params: { month: Number(m), year: Number(y) },
      });
      setDueDates(data.data || []);
    } catch {
      toast.error('Failed to load due dates');
    } finally {
      setDueLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'dates' && dueDates.length === 0) {
      fetchDueDates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const tabItems: { key: ToolTab; label: string; icon: typeof Calculator }[] = [
    { key: 'calculator', label: 'GST Calculator', icon: Calculator },
    { key: 'itc', label: 'Rule 42 ITC Checker', icon: Scale },
    { key: 'hsn', label: 'HSN / SAC Finder', icon: Search },
    { key: 'latefee', label: 'Late Fee & Interest', icon: Clock },
    { key: 'gstin', label: 'GSTIN Validator', icon: ShieldCheck },
    { key: 'dates', label: 'Due Dates', icon: Calendar },
  ];

  return (
    <motion.div
      className={styles.tools}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className={styles.kicker}>Deterministic Statutory Engines</div>
      <h1 className={styles.title}>GST Statutory Tools</h1>
      <p className={styles.subtitle}>
        Powered by CBIC rules, 56th GST Council rate slabs, Rule 42 apportionment math, and ISO 7064 Mod-36 checksums.
      </p>

      <div className={styles.tabs} role="tablist">
        {tabItems.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={activeTab === t.key}
              className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(t.key)}
            >
              <Icon size={16} strokeWidth={1.75} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ─── 1. GST Calculator ───────────────────────────────────── */}
      {activeTab === 'calculator' && (
        <div className={styles.splitGrid}>
          <Card className={styles.card} shadow>
            <h2 className={styles.cardTitle}>Tax Computation Inputs</h2>
            <form onSubmit={runGSTCalc} className={styles.form}>
              <Input
                label="Transaction Amount (₹)"
                type="number"
                step="0.01"
                value={gstForm.amount}
                onChange={(e) => setGstForm({ ...gstForm, amount: e.target.value })}
                required
              />

              <div className={styles.row2}>
                <Select
                  label="GST Slab (%)"
                  value={gstForm.rate}
                  onChange={(e) => setGstForm({ ...gstForm, rate: e.target.value })}
                  options={[
                    { value: '0', label: '0% (Exempt / Nil)' },
                    { value: '0.25', label: '0.25% (Rough Diamonds)' },
                    { value: '3', label: '3% (Gold / Jewellery)' },
                    { value: '5', label: '5%' },
                    { value: '12', label: '12% (Pre-Sep 2025)' },
                    { value: '18', label: '18% (Standard)' },
                    { value: '28', label: '28% (Pre-Sep 2025)' },
                    { value: '40', label: '40% (Luxury / Sin Post-Sep 2025)' },
                  ]}
                />
                <Input
                  label="Compensation Cess (%)"
                  type="number"
                  step="0.01"
                  min="0"
                  value={gstForm.cess_rate}
                  onChange={(e) => setGstForm({ ...gstForm, cess_rate: e.target.value })}
                />
              </div>

              <Input
                label="Supply Date (validates slab regime)"
                type="date"
                value={gstForm.supply_date}
                onChange={(e) => setGstForm({ ...gstForm, supply_date: e.target.value })}
              />

              <div className={styles.toggleGroup}>
                <Checkbox
                  label="Inter-state supply (IGST instead of CGST + SGST)"
                  checked={gstForm.is_igst}
                  onChange={(e) => setGstForm({ ...gstForm, is_igst: e.target.checked })}
                />
                <Checkbox
                  label="Amount is Tax-Inclusive (reverse calculate base)"
                  checked={gstForm.tax_inclusive}
                  onChange={(e) => setGstForm({ ...gstForm, tax_inclusive: e.target.checked })}
                />
              </div>

              <Button type="submit" loading={gstLoading}>
                Compute Tax Breakdown
              </Button>
            </form>
          </Card>

          <Card className={styles.card} shadow>
            <h2 className={styles.cardTitle}>Statutory Breakdown</h2>
            {gstResult ? (
              <div className={styles.resultBox}>
                <div style={{ marginBottom: 4 }}>
                  <Badge variant="info">{gstResult.tax_type}</Badge>
                </div>
                <div className={styles.resultRow}>
                  <span>Taxable Base Value</span>
                  <span className="tabular">{INR(gstResult.base_amount)}</span>
                </div>
                {gstResult.igst > 0 ? (
                  <div className={styles.resultRow}>
                    <span>IGST ({gstResult.gst_rate}%)</span>
                    <span className="tabular">{INR(gstResult.igst)}</span>
                  </div>
                ) : (
                  <>
                    <div className={styles.resultRow}>
                      <span>CGST ({gstResult.gst_rate / 2}%)</span>
                      <span className="tabular">{INR(gstResult.cgst)}</span>
                    </div>
                    <div className={styles.resultRow}>
                      <span>SGST ({gstResult.gst_rate / 2}%)</span>
                      <span className="tabular">{INR(gstResult.sgst)}</span>
                    </div>
                  </>
                )}
                {gstResult.cess_amount > 0 && (
                  <div className={styles.resultRow}>
                    <span>Compensation Cess ({gstResult.cess_rate}%)</span>
                    <span className="tabular">{INR(gstResult.cess_amount)}</span>
                  </div>
                )}
                <div className={`${styles.resultRow} ${styles.resultTotal}`}>
                  <span>Invoice Total</span>
                  <span className="tabular">{INR(gstResult.total_amount)}</span>
                </div>
              </div>
            ) : (
              <div className={styles.placeholderBox}>
                Enter transaction parameters and compute to view CGST/SGST/IGST split.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ─── 2. Rule 42 ITC Checker ──────────────────────────────── */}
      {activeTab === 'itc' && (
        <div className={styles.splitGrid}>
          <Card className={styles.card} shadow>
            <h2 className={styles.cardTitle}>Rule 42 Apportionment Inputs (₹)</h2>
            <form onSubmit={runITCCheck} className={styles.form}>
              <div className={styles.row2}>
                <Input
                  label="Total ITC (T)"
                  type="number"
                  value={itcForm.total_itc}
                  onChange={(e) => setItcForm({ ...itcForm, total_itc: e.target.value })}
                />
                <Input
                  label="Exclusively Taxable (T4)"
                  type="number"
                  value={itcForm.itc_on_taxable_exclusive}
                  onChange={(e) => setItcForm({ ...itcForm, itc_on_taxable_exclusive: e.target.value })}
                />
              </div>
              <div className={styles.row2}>
                <Input
                  label="Non-Business Use (T1)"
                  type="number"
                  value={itcForm.itc_on_non_business}
                  onChange={(e) => setItcForm({ ...itcForm, itc_on_non_business: e.target.value })}
                />
                <Input
                  label="Exclusively Exempt (T2)"
                  type="number"
                  value={itcForm.itc_on_exempt_exclusive}
                  onChange={(e) => setItcForm({ ...itcForm, itc_on_exempt_exclusive: e.target.value })}
                />
              </div>
              <div className={styles.row2}>
                <Input
                  label="Blocked Sec 17(5) (T3)"
                  type="number"
                  value={itcForm.itc_blocked_17_5}
                  onChange={(e) => setItcForm({ ...itcForm, itc_blocked_17_5: e.target.value })}
                />
                <Input
                  label="Reverse Charge ITC (Sec 9)"
                  type="number"
                  value={itcForm.reverse_charge_itc}
                  onChange={(e) => setItcForm({ ...itcForm, reverse_charge_itc: e.target.value })}
                />
              </div>
              <div className={styles.row2}>
                <Input
                  label="Exempt Turnover (E)"
                  type="number"
                  value={itcForm.exempt_turnover}
                  onChange={(e) => setItcForm({ ...itcForm, exempt_turnover: e.target.value })}
                />
                <Input
                  label="Total State Turnover (F)"
                  type="number"
                  value={itcForm.total_turnover}
                  onChange={(e) => setItcForm({ ...itcForm, total_turnover: e.target.value })}
                />
              </div>
              <Button type="submit" loading={itcLoading}>
                Calculate Eligible ITC
              </Button>
            </form>
          </Card>

          <Card className={styles.card} shadow>
            <h2 className={styles.cardTitle}>Rule 42(1) Audit Trail</h2>
            {itcResult ? (
              <div>
                <div className={styles.resultBox} style={{ marginBottom: 14 }}>
                  <div className={styles.resultRow}>
                    <span>Total Input Tax (T)</span>
                    <span className="tabular">{INR(itcResult.total_itc_available)}</span>
                  </div>
                  <div className={styles.resultRow}>
                    <span>Ineligible / Reversed (T1+T2+T3+D1+D2)</span>
                    <span className="tabular" style={{ color: 'var(--danger)' }}>
                      - {INR(itcResult.total_ineligible_reversed)}
                    </span>
                  </div>
                  <div className={`${styles.resultRow} ${styles.resultTotal}`}>
                    <span>Net Eligible ITC</span>
                    <span className="tabular">{INR(itcResult.net_eligible_itc)}</span>
                  </div>
                </div>

                <div style={{ maxHeight: 280, overflowY: 'auto', borderTop: '1px solid var(--rule)', paddingTop: 8 }}>
                  {(itcResult.steps || []).map((s: any) => (
                    <div key={s.step} className={styles.stepRow}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{s.step}. {s.label}</div>
                        <div className={styles.stepSource}>{s.source}</div>
                      </div>
                      <span className="tabular" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {INR(s.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.placeholderBox}>
                Submit Rule 42 credit &amp; turnover values to generate the 12-step statutory apportionment audit.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ─── 3. HSN / SAC Finder ─────────────────────────────────── */}
      {activeTab === 'hsn' && (
        <Card className={styles.card} shadow>
          <h2 className={styles.cardTitle}>HSN &amp; SAC Rate Master Search</h2>
          <form onSubmit={runHSNSearch} className={styles.searchBar}>
            <div style={{ flex: 2, minWidth: 220 }}>
              <Input
                placeholder="Search code or goods/services (e.g. 9997, software, laptop, rice)..."
                value={hsnQuery}
                onChange={(e) => setHsnQuery(e.target.value)}
              />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <Input
                type="date"
                value={hsnAsOf}
                onChange={(e) => setHsnAsOf(e.target.value)}
                title="Effective as-of date (optional)"
              />
            </div>
            <Button type="submit" loading={hsnLoading}>
              <Search size={15} /> Search Master
            </Button>
          </form>

          {hsnResults.length > 0 ? (
            <Table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Description</th>
                  <th className="numeric">GST Rate</th>
                  <th>Effective From</th>
                  <th>Notification</th>
                </tr>
              </thead>
              <tbody>
                {hsnResults.map((item, idx) => (
                  <tr key={`${item.hsn_code}-${idx}`}>
                    <td className="tabular" style={{ fontWeight: 600 }}>{item.hsn_code}</td>
                    <td>{item.description}</td>
                    <td className="numeric">
                      <Badge variant="info">{item.gst_rate}%</Badge>
                    </td>
                    <td className="tabular" style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
                      {item.effective_from || '2017-07-01'}
                      {item.effective_to ? ` → ${item.effective_to}` : ''}
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
                      {item.notification || 'CBIC Schedule'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className={styles.placeholderBox}>
              {hsnSearched
                ? 'No matching HSN/SAC entries found. Try another keyword or code prefix.'
                : 'Search across CBIC HSN goods and SAC service classifications.'}
            </div>
          )}
        </Card>
      )}

      {/* ─── 4. Late Fee & Interest ──────────────────────────────── */}
      {activeTab === 'latefee' && (
        <div className={styles.splitGrid}>
          <Card className={styles.card} shadow>
            <h2 className={styles.cardTitle}>Return Delay Parameters</h2>
            <form onSubmit={runLateFee} className={styles.form}>
              <Select
                label="Return Type"
                value={lateForm.return_type}
                onChange={(e) => setLateForm({ ...lateForm, return_type: e.target.value })}
                options={[
                  { value: 'GSTR-3B', label: 'GSTR-3B (Monthly/Quarterly Summary)' },
                  { value: 'GSTR-1', label: 'GSTR-1 (Outward Supplies)' },
                  { value: 'GSTR-9', label: 'GSTR-9 (Annual Return)' },
                ]}
              />
              <div className={styles.row2}>
                <Input
                  label="Statutory Due Date"
                  type="date"
                  value={lateForm.due_date}
                  onChange={(e) => setLateForm({ ...lateForm, due_date: e.target.value })}
                  required
                />
                <Input
                  label="Actual Filing Date"
                  type="date"
                  value={lateForm.filing_date}
                  onChange={(e) => setLateForm({ ...lateForm, filing_date: e.target.value })}
                  required
                />
              </div>
              <div className={styles.row2}>
                <Input
                  label="Net Tax Liability (₹)"
                  type="number"
                  min="0"
                  value={lateForm.tax_liability}
                  onChange={(e) => setLateForm({ ...lateForm, tax_liability: e.target.value })}
                />
                <Input
                  label="Annual Turnover / AATO (₹)"
                  type="number"
                  min="0"
                  value={lateForm.annual_turnover}
                  onChange={(e) => setLateForm({ ...lateForm, annual_turnover: e.target.value })}
                />
              </div>
              {lateForm.return_type === 'GSTR-9' && (
                <Input
                  label="Turnover in State / UT (₹, for 0.04% cap)"
                  type="number"
                  min="0"
                  value={lateForm.turnover_in_state}
                  onChange={(e) => setLateForm({ ...lateForm, turnover_in_state: e.target.value })}
                />
              )}
              <Button type="submit" loading={lateLoading}>
                Compute Late Fee &amp; Interest
              </Button>
            </form>
          </Card>

          <Card className={styles.card} shadow>
            <h2 className={styles.cardTitle}>Penalty Assessment</h2>
            {lateResult ? (
              <div className={styles.resultBox}>
                <div className={styles.resultRow}>
                  <span>Return / Days Delayed</span>
                  <span className="tabular">
                    {lateResult.return_type} · <strong>{lateResult.days_late} days</strong>
                  </span>
                </div>
                <div className={styles.resultRow}>
                  <span>Sec 47 Late Fee</span>
                  <span className="tabular">{INR(lateResult.late_fee)}</span>
                </div>
                <div className={styles.resultRow}>
                  <span>Sec 50 Interest (18% p.a.)</span>
                  <span className="tabular">{INR(lateResult.interest_on_tax)}</span>
                </div>
                <div className={`${styles.resultRow} ${styles.resultTotal}`}>
                  <span>Total Statutory Outflow</span>
                  <span className="tabular">{INR(lateResult.total_penalty)}</span>
                </div>
                {(lateResult.breakdown || lateResult.message) && (
                  <div className={styles.sourceNote}>
                    {lateResult.breakdown || lateResult.message}
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.placeholderBox}>
                Enter due date, filing date, and turnover to apply Notif. 19/2021, 20/2021, or 07/2023 caps.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ─── 5. GSTIN Validator ──────────────────────────────────── */}
      {activeTab === 'gstin' && (
        <div className={styles.splitGrid}>
          <Card className={styles.card} shadow>
            <h2 className={styles.cardTitle}>15-Digit GSTIN Checksum</h2>
            <form onSubmit={validateGSTIN} className={styles.form}>
              <Input
                label="GSTIN Number"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="27AAAPL1234C1ZV"
                maxLength={15}
              />
              <Button type="submit" disabled={gstin.length !== 15} loading={gstinLoading}>
                Verify Mod-36 Checksum
              </Button>
            </form>
          </Card>

          <Card className={styles.card} shadow>
            <h2 className={styles.cardTitle}>Verification Result</h2>
            {gstinResult ? (
              gstinResult.valid ? (
                <div className={styles.resultBox}>
                  <div style={{ marginBottom: 6 }}>
                    <Badge variant="success">
                      <CheckCircle2 size={12} /> Valid GSTIN Format &amp; Check Digit
                    </Badge>
                  </div>
                  <div className={styles.resultRow}>
                    <span>GSTIN</span>
                    <span className="tabular">{gstinResult.gstin}</span>
                  </div>
                  <div className={styles.resultRow}>
                    <span>State Jurisdiction</span>
                    <span>
                      {gstinResult.state_name} ({gstinResult.state_code})
                    </span>
                  </div>
                  <div className={styles.resultRow}>
                    <span>Embedded PAN</span>
                    <span className="tabular">{gstinResult.pan}</span>
                  </div>
                  <div className={styles.resultRow}>
                    <span>Entity Type</span>
                    <span>
                      {gstinResult.entity_type} (#{gstinResult.entity_number})
                    </span>
                  </div>
                  <div className={styles.resultRow}>
                    <span>Check Digit</span>
                    <span className="tabular">{gstinResult.check_digit}</span>
                  </div>
                </div>
              ) : (
                <div className={styles.resultBox}>
                  <Badge variant="danger">
                    <XCircle size={12} /> Invalid GSTIN
                  </Badge>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--danger)', marginTop: 8 }}>
                    {gstinResult.error}
                  </p>
                </div>
              )
            ) : (
              <div className={styles.placeholderBox}>
                Enter any 15-character GSTIN to validate state code, PAN structure, and ISO 7064 Mod-36 check digit.
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ─── 6. Statutory Due Dates ──────────────────────────────── */}
      {activeTab === 'dates' && (
        <Card className={styles.card} shadow>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            <h2 className={styles.cardTitle} style={{ borderBottom: 'none', margin: 0, padding: 0 }}>
              GST Return Filing Calendar
            </h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Select
                value={dueMonth}
                onChange={(e) => {
                  setDueMonth(e.target.value);
                  fetchDueDates(e.target.value, dueYear);
                }}
                options={Array.from({ length: 12 }, (_, i) => ({
                  value: String(i + 1),
                  label: new Date(2026, i, 1).toLocaleString('en-IN', { month: 'long' }),
                }))}
              />
              <Select
                value={dueYear}
                onChange={(e) => {
                  setDueYear(e.target.value);
                  fetchDueDates(dueMonth, e.target.value);
                }}
                options={['2024', '2025', '2026', '2027'].map((y) => ({ value: y, label: y }))}
              />
            </div>
          </div>

          {dueLoading ? (
            <div className={styles.placeholderBox}>Loading statutory due dates...</div>
          ) : (
            <div className={styles.dueDatesGrid}>
              {dueDates.map((d, idx) => (
                <div key={idx} className={styles.dateCard}>
                  <div className={styles.dateCardTop}>
                    <span className={styles.dateReturn}>{d.return_type}</span>
                    <Badge variant="default">{d.frequency}</Badge>
                  </div>
                  <div className={styles.dateDue}>Due: {d.due_date}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--ink)' }}>{d.description}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                    {d.applicable_to} · <span className="tabular">{d.source}</span>
                  </div>
                  {d.extension && <Badge variant="warning">{d.extension}</Badge>}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </motion.div>
  );
}
