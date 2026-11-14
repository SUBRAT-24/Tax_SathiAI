import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Search, Calendar } from 'lucide-react';
import { Card, Input, Button, Select } from '../components/ui';
import { pageVariants } from '../animations/variants';
import styles from './Tools.module.css';
import toast from 'react-hot-toast';
import api from '../utils/api';

export default function Tools() {
  const [activeTab, setActiveTab] = useState('calculator');
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('18');
  const [gstin, setGstin] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const calculateGST = () => {
    const amt = parseFloat(amount);
    const gstRate = parseFloat(rate) / 100;
    const gstAmount = amt * gstRate;
    const total = amt + gstAmount;
    
    setResult({
      base: amt.toFixed(2),
      gst: gstAmount.toFixed(2),
      total: total.toFixed(2)
    });
  };

  const validateGSTIN = async () => {
    if (!gstin) return;
    setLoading(true);
    try {
      const res = await api.post('/tools/validate-gstin', { gstin });
      setResult(res.data);
      toast.success('GSTIN validated');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className={styles.tools}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <h1 className={styles.title}>GST Tools</h1>

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'calculator' ? styles.tabActive : ''}`}
          onClick={() => { setActiveTab('calculator'); setResult(null); }}
        >
          <Calculator size={18} strokeWidth={1.5} /> GST Calculator
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'validator' ? styles.tabActive : ''}`}
          onClick={() => { setActiveTab('validator'); setResult(null); }}
        >
          <Search size={18} strokeWidth={1.5} /> GSTIN Validator
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'dates' ? styles.tabActive : ''}`}
          onClick={() => { setActiveTab('dates'); setResult(null); }}
        >
          <Calendar size={18} strokeWidth={1.5} /> Due Dates
        </button>
      </div>

      {activeTab === 'calculator' && (
        <Card className={styles.card}>
          <h2 className={styles.cardTitle}>Calculate GST</h2>
          <div className={styles.form}>
            <Input
              label="Base Amount (₹)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="10000"
            />
            <Select
              label="GST Rate"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              options={[
                { value: '5', label: '5%' },
                { value: '12', label: '12%' },
                { value: '18', label: '18%' },
                { value: '28', label: '28%' }
              ]}
            />
            <Button onClick={calculateGST} disabled={!amount}>
              Calculate
            </Button>
          </div>
          {result && (
            <div className={styles.result}>
              <div className={styles.resultRow}>
                <span>Base Amount:</span>
                <span className="tabular">₹ {result.base}</span>
              </div>
              <div className={styles.resultRow}>
                <span>GST ({rate}%):</span>
                <span className="tabular">₹ {result.gst}</span>
              </div>
              <div className={`${styles.resultRow} ${styles.resultTotal}`}>
                <span>Total Amount:</span>
                <span className="tabular">₹ {result.total}</span>
              </div>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'validator' && (
        <Card className={styles.card}>
          <h2 className={styles.cardTitle}>Validate GSTIN</h2>
          <div className={styles.form}>
            <Input
              label="GSTIN"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              placeholder="22AAAAA0000A1Z5"
              maxLength={15}
            />
            <Button onClick={validateGSTIN} disabled={!gstin || loading} loading={loading}>
              Validate
            </Button>
          </div>
          {result && (
            <div className={styles.result}>
              <div className={styles.resultRow}>
                <span>Status:</span>
                <span>{result.valid ? '✓ Valid' : '✗ Invalid'}</span>
              </div>
              {result.business_name && (
                <div className={styles.resultRow}>
                  <span>Business Name:</span>
                  <span>{result.business_name}</span>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'dates' && (
        <Card className={styles.card}>
          <h2 className={styles.cardTitle}>GST Filing Due Dates</h2>
          <div className={styles.dueDates}>
            <div className={styles.dateItem}>
              <span className={styles.dateLabel}>GSTR-1</span>
              <span className={styles.dateValue}>11th of next month</span>
            </div>
            <div className={styles.dateItem}>
              <span className={styles.dateLabel}>GSTR-3B</span>
              <span className={styles.dateValue}>20th of next month</span>
            </div>
            <div className={styles.dateItem}>
              <span className={styles.dateLabel}>GSTR-9</span>
              <span className={styles.dateValue}>31st December (Annual)</span>
            </div>
          </div>
        </Card>
      )}
    </motion.div>
  );
}
