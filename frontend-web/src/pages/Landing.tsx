import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Calculator,
  Sparkles,
  ChevronRight,
  BookOpen,
  CalendarCheck,
  FileSearch,
  Scale,
  Clock,
  Sun,
  Moon,
  Percent,
} from 'lucide-react';
import { pageVariants } from '../animations/variants';
import { useTheme } from '../utils/theme';
import styles from './Landing.module.css';

const DEMO_QUERIES = [
  {
    id: 1,
    title: 'Can I claim ITC on corporate health insurance for employees?',
    category: 'Input Tax Credit',
    verdict: 'Conditional ITC Eligibility',
    ok: false,
    explanation:
      'Under Section 17(5)(b)(i) of the CGST Act, ITC on health insurance is blocked unless it is obligatory for an employer to provide it to employees under any law for the time being in force.',
    citations: ['CGST Act, Sec 17(5)(b)', 'CGST Rule 42', 'Circular 140/10/2020'],
  },
  {
    id: 2,
    title: 'What is the statutory late fee for delayed GSTR-3B with nil tax?',
    category: 'Late Fees & Interest',
    verdict: 'Capped at ₹20/day (₹10 CGST + ₹10 SGST), max ₹500',
    ok: true,
    explanation:
      'Pursuant to Notification No. 19/2021-Central Tax, late fee for nil GSTR-3B returns is ₹20 per day of delay and capped at ₹500 total (₹250 CGST + ₹250 SGST).',
    citations: ['CGST Act, Sec 47', 'Notif. 19/2021-CT'],
  },
  {
    id: 3,
    title: 'Does export of software services require LUT or payment of IGST?',
    category: 'Zero-Rated Supply',
    verdict: 'Zero-Rated under Letter of Undertaking (LUT)',
    ok: true,
    explanation:
      'Exports of services constitute zero-rated supplies under Section 16 of the IGST Act. Suppliers can export without payment of IGST under a valid LUT (Form GST RFD-11) filed on the GST portal.',
    citations: ['IGST Act, Sec 16', 'CGST Rules, Rule 96A', 'Circular 125/44/2019'],
  },
];

const TOOLS_SHOWCASE = [
  {
    icon: Calculator,
    title: 'Date-Aware GST Calculator',
    desc: 'Supports CGST+SGST, IGST, Tax-Inclusive reverse math, Compensation Cess, and 56th GST Council slab changes.',
  },
  {
    icon: Scale,
    title: 'Rule 42 ITC Apportionment',
    desc: 'Step-by-step T1/T2/T3/T4 & D1/D2 reversal ledger with Section 17(5) blocked credit guidance.',
  },
  {
    icon: FileSearch,
    title: 'HSN & SAC Master Lookup',
    desc: 'Search 11,000+ goods and service codes with effective date filtering and CBIC notification tags.',
  },
  {
    icon: Clock,
    title: 'Sec 47 Late Fee & Sec 50 Interest',
    desc: 'Exact turnover-band caps for GSTR-3B, GSTR-1, and GSTR-9 plus 18% p.a. interest computation.',
  },
  {
    icon: ShieldCheck,
    title: 'Mod-36 GSTIN Validator',
    desc: 'ISO 7064 Mod 37,36 checksum verification extracting State, PAN, Entity Type, and Check Digit.',
  },
  {
    icon: CalendarCheck,
    title: 'Statutory Due Date Calendar',
    desc: 'Monthly, QRMP quarterly, ISD, TDS/TCS, and annual return deadlines anchored to CGST Rules.',
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [selectedQuery, setSelectedQuery] = useState(DEMO_QUERIES[0]);
  const { theme, toggleTheme } = useTheme();
  const isAuth = !!localStorage.getItem('access_token');

  const handleAction = (path: string) => {
    if (isAuth && (path === '/login' || path === '/register')) {
      navigate('/chat');
    } else {
      navigate(path);
    }
  };

  return (
    <motion.div
      className={styles.pageWrapper}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* ─── 1. Floating Pill Navbar ──────────────────────────────── */}
      <header className={styles.navWrap}>
        <div className={styles.navBar}>
          <Link to="/" className={styles.brand}>
            <div className={styles.brandIcon}>₹</div>
            <div className={styles.brandName}>
              TaxSathi <span className={styles.brandBadge}>AI</span>
            </div>
          </Link>

          <nav className={styles.navLinks} aria-label="Landing sections">
            <a href="#features" className={styles.navLink}>Capabilities</a>
            <a href="#playground" className={styles.navLink}>Live Demo</a>
            <a href="#tools" className={styles.navLink}>GST Tools</a>
            <a href="#statutory" className={styles.navLink}>Sources</a>
            <a href="#pricing" className={styles.navLink}>Plans</a>
          </nav>

          <div className={styles.navActions}>
            <button
              type="button"
              onClick={toggleTheme}
              className={styles.iconBtn}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              title="Toggle theme"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            <button
              type="button"
              onClick={() => handleAction(isAuth ? '/dashboard' : '/login')}
              className={styles.loginBtn}
            >
              {isAuth ? 'Dashboard' : 'Log in'}
            </button>
            <button
              type="button"
              onClick={() => handleAction(isAuth ? '/chat' : '/register')}
              className={styles.primaryPill}
            >
              <span>{isAuth ? 'Open Workspace' : 'Start Free'}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* ─── 2. Signature Hero Ledger Card ───────────────────────── */}
      <section className={styles.heroWrapper}>
        <div className={styles.heroCard}>
          <div className={styles.heroGridLines} />

          <div className={styles.heroContent}>
            <div className={styles.kickerPill}>
              <span className={styles.pulseDot} />
              <span>Grounded in CBIC Acts, Rules &amp; Circulars</span>
            </div>

            <h1 className={styles.heroTitle}>
              Statutory GST Intelligence,{' '}
              <span className={styles.heroTitleEm}>Cited to the Section.</span>
            </h1>

            <p className={styles.heroDescription}>
              Ask complex GST questions backed by hybrid RAG retrieval over official CGST/IGST statutes,
              or run deterministic Rule 42 ITC, HSN lookup, and Section 47 penalty calculations in seconds.
            </p>

            <div className={styles.heroActions}>
              <button
                type="button"
                onClick={() => handleAction(isAuth ? '/chat' : '/register')}
                className={styles.ctaWhite}
              >
                <span>{isAuth ? 'Launch AI Assistant' : 'Create Free Account'}</span>
                <ArrowRight size={17} />
              </button>
              <a href="#playground" className={styles.ctaGhost}>
                <span>Inspect Live Analysis</span>
              </a>
            </div>

            <div className={styles.heroMetrics}>
              <div className={styles.metricItem}>
                <span className={styles.metricVal}>Hybrid RAG</span>
                <span className={styles.metricLbl}>BM25 + Semantic Rerank</span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricVal}>11,000+</span>
                <span className={styles.metricLbl}>HSN / SAC Master</span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricVal}>6 Engines</span>
                <span className={styles.metricLbl}>Deterministic Tax Tools</span>
              </div>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.ledgerPreview}>
              <div className={styles.previewTop}>
                <span className={styles.verifiedPill}>
                  <ShieldCheck size={14} /> Statutory Grounded
                </span>
                <span className={styles.previewTag}>Sec 17(5)(a) Check</span>
              </div>
              <div className={styles.previewQuery}>
                &ldquo;Can our company claim ITC on commercial passenger vehicles above 13-person seating?&rdquo;
              </div>
              <div className={styles.previewAnswer}>
                <div className={styles.previewVerdict}>
                  <CheckCircle2 size={15} /> ITC Eligible &amp; Allowed
                </div>
                <p className={styles.previewBody}>
                  Section 17(5)(a) blocks ITC only on motor vehicles for transportation of persons having approved
                  seating capacity of not more than 13 persons (including driver).
                </p>
                <div className={styles.citationRow}>
                  <span className={styles.citationTag}>CGST Act § 17(5)(a)</span>
                  <span className={styles.citationTag}>Rule 42 Apportionment</span>
                </div>
              </div>
            </div>

            <div className={styles.miniCards}>
              <div className={styles.miniCard}>
                <div className={styles.miniHeader}>
                  <ShieldCheck size={15} color="var(--accent)" />
                  <span>GSTIN Mod-36</span>
                </div>
                <code className={styles.miniValue}>27AAAPL1234C1ZV • Valid</code>
              </div>
              <div className={styles.miniCard}>
                <div className={styles.miniHeader}>
                  <Percent size={15} color="var(--warn)" />
                  <span>Late Fee (Sec 47)</span>
                </div>
                <code className={styles.miniValue}>₹50/day + 18% p.a. Int</code>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. Core Capabilities ────────────────────────────────── */}
      <section id="features" className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionKicker}>Built for CAs, Tax Teams &amp; Founders</div>
          <h2 className={styles.sectionTitle}>Every Answer Traceable. Every Calculation Exact.</h2>
          <p className={styles.sectionSubtitle}>
            Designed like a modern accountant&apos;s ledger—combining citation-verified statutory AI
            with deterministic calculators that never hallucinate tax math.
          </p>
        </div>

        <div className={styles.grid3}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <BookOpen size={22} />
            </div>
            <h3 className={styles.featureTitle}>Grounded Statutory RAG</h3>
            <p className={styles.featureDesc}>
              Hybrid retrieval combines dense semantic embeddings, BM25 lexical matching, and cross-encoder reranking across CBIC documents.
            </p>
            <ul className={styles.featureList}>
              <li><CheckCircle2 size={15} color="var(--accent)" /> Page &amp; source preview citations</li>
              <li><CheckCircle2 size={15} color="var(--accent)" /> Confidence score &amp; intent tagging</li>
              <li><CheckCircle2 size={15} color="var(--accent)" /> Persistent sessions &amp; bookmarks</li>
            </ul>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <Calculator size={22} />
            </div>
            <h3 className={styles.featureTitle}>Deterministic Tax Engines</h3>
            <p className={styles.featureDesc}>
              Zero LLM guesswork for numbers. Exact Decimal arithmetic for CGST/SGST/IGST splits, Rule 42 ITC reversals, and Section 47 caps.
            </p>
            <ul className={styles.featureList}>
              <li><CheckCircle2 size={15} color="var(--accent)" /> 56th GST Council slab date awareness</li>
              <li><CheckCircle2 size={15} color="var(--accent)" /> Full 12-step Rule 42 ITC breakdown</li>
              <li><CheckCircle2 size={15} color="var(--accent)" /> Turnover-tiered GSTR-1/3B/9 late fees</li>
            </ul>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <FileSearch size={22} />
            </div>
            <h3 className={styles.featureTitle}>Personal Document Vault</h3>
            <p className={styles.featureDesc}>
              Upload your notices, returns, and tax PDFs. Automated PyMuPDF + OCR extraction indexes them directly into your private query context.
            </p>
            <ul className={styles.featureList}>
              <li><CheckCircle2 size={15} color="var(--accent)" /> PDF magic-byte &amp; page validation</li>
              <li><CheckCircle2 size={15} color="var(--accent)" /> Scanned PDF OCR support</li>
              <li><CheckCircle2 size={15} color="var(--accent)" /> Live compliance score &amp; due dates</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── 4. Interactive Query Playground ─────────────────────── */}
      <section id="playground" className={styles.section}>
        <div className={styles.playgroundCard}>
          <div>
            <div className={styles.sectionKicker}>
              <Sparkles size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
              Interactive Simulator
            </div>
            <h2 className={styles.sectionTitle} style={{ fontSize: '2rem', textAlign: 'left', marginBottom: 10 }}>
              Inspect Statutory Grounding
            </h2>
            <p className={styles.sectionSubtitle} style={{ textAlign: 'left', fontSize: '0.96rem' }}>
              Select a compliance scenario to see how TaxSathi structures its statutory verdict and citations.
            </p>

            <div className={styles.queryList}>
              {DEMO_QUERIES.map((q) => (
                <button
                  type="button"
                  key={q.id}
                  onClick={() => setSelectedQuery(q)}
                  className={`${styles.queryBtn} ${selectedQuery.id === q.id ? styles.queryBtnActive : ''}`}
                >
                  <span>{q.title}</span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          </div>

          <div className={styles.terminal}>
            <div className={styles.terminalHead}>
              <div className={styles.dots}>
                <span className={styles.dot} style={{ background: '#EF4444' }} />
                <span className={styles.dot} style={{ background: '#F59E0B' }} />
                <span className={styles.dot} style={{ background: '#22C55E' }} />
              </div>
              <span>CBIC Grounding Engine</span>
              <span style={{ color: '#4ADE80' }}>● {selectedQuery.category}</span>
            </div>

            <div className={styles.termLabel}>User Query</div>
            <div className={styles.termQuery}>{selectedQuery.title}</div>

            <div className={styles.termBodyBox}>
              <div className={styles.termLabel}>Statutory Verdict</div>
              <div
                className={styles.termVerdict}
                style={{ color: selectedQuery.ok ? '#4ADE80' : '#FBBF24' }}
              >
                {selectedQuery.verdict}
              </div>
              <p className={styles.termText}>{selectedQuery.explanation}</p>
              <div className={styles.termLabel}>Cited Authority</div>
              <div className={styles.termCites}>
                {selectedQuery.citations.map((cite) => (
                  <span key={cite} className={styles.termCiteTag}>§ {cite}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. GST Statutory Tools Suite ────────────────────────── */}
      <section id="tools" className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionKicker}>Integrated Compliance Suite</div>
          <h2 className={styles.sectionTitle}>Six Deterministic GST Tools Included</h2>
          <p className={styles.sectionSubtitle}>
            Run exact statutory calculations directly inside your workspace—no spreadsheets or outdated web widgets.
          </p>
        </div>

        <div className={styles.toolsStrip}>
          {TOOLS_SHOWCASE.map((tool) => {
            const Icon = tool.icon;
            return (
              <div key={tool.title} className={styles.toolCard}>
                <div className={styles.toolIcon}>
                  <Icon size={18} />
                </div>
                <div>
                  <div className={styles.toolTitle}>{tool.title}</div>
                  <p className={styles.toolDesc}>{tool.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── 6. Statutory Sources ────────────────────────────────── */}
      <section id="statutory" className={styles.section}>
        <div className={styles.sectionHeader} style={{ marginBottom: 28 }}>
          <div className={styles.sectionKicker}>Authoritative Corpus</div>
          <h2 className={styles.sectionTitle}>Grounded in Official Gazettes</h2>
        </div>

        <div className={styles.statutoryBand}>
          <div className={styles.sourceItem}>
            <div className={styles.sourceTitle}>CGST &amp; IGST Acts, 2017</div>
            <div className={styles.sourceSub}>Sections 9, 16, 17(5), 44, 47, 50</div>
          </div>
          <div className={styles.sourceItem}>
            <div className={styles.sourceTitle}>CGST Rules, 2017</div>
            <div className={styles.sourceSub}>Rules 32, 42, 43, 59–67, 96A</div>
          </div>
          <div className={styles.sourceItem}>
            <div className={styles.sourceTitle}>CBIC Rate Notifications</div>
            <div className={styles.sourceSub}>Notif. 1/2017, 11/2017, 56th Council</div>
          </div>
          <div className={styles.sourceItem}>
            <div className={styles.sourceTitle}>Penalty &amp; Return Circulars</div>
            <div className={styles.sourceSub}>Notif. 19/2021, 20/2021, 07/2023-CT</div>
          </div>
        </div>
      </section>

      {/* ─── 7. Pricing Plans ────────────────────────────────────── */}
      <section id="pricing" className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionKicker}>Transparent Plans</div>
          <h2 className={styles.sectionTitle}>Built for Solo Taxpayers &amp; CA Practices</h2>
          <p className={styles.sectionSubtitle}>
            Start free with statutory Q&amp;A and calculators, or scale up for firm-wide document analysis.
          </p>
        </div>

        <div className={styles.grid3}>
          <div className={styles.featureCard}>
            <span className={styles.sectionKicker}>Starter</span>
            <div className={styles.priceValue}>
              ₹0 <span className={styles.priceUnit}>/ month</span>
            </div>
            <p className={styles.featureDesc}>For individual taxpayers and SMEs needing reliable statutory guidance.</p>
            <ul className={styles.featureList}>
              <li><CheckCircle2 size={15} color="var(--accent)" /> Statutory AI chat with citations</li>
              <li><CheckCircle2 size={15} color="var(--accent)" /> All 6 GST statutory tools</li>
              <li><CheckCircle2 size={15} color="var(--accent)" /> Compliance score &amp; due dates</li>
            </ul>
            <button
              type="button"
              onClick={() => handleAction('/register')}
              className={styles.loginBtn}
              style={{ marginTop: 20, border: '1px solid var(--rule)' }}
            >
              Get Started Free
            </button>
          </div>

          <div className={`${styles.featureCard} ${styles.pricingFeatured}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className={styles.sectionKicker} style={{ marginBottom: 0 }}>Professional CA</span>
              <span className={styles.brandBadge}>RECOMMENDED</span>
            </div>
            <div className={styles.priceValue}>
              ₹999 <span className={styles.priceUnit}>/ month</span>
            </div>
            <p className={styles.featureDesc}>For Chartered Accountants and tax advisors managing client filings.</p>
            <ul className={styles.featureList}>
              <li><CheckCircle2 size={15} color="var(--accent)" /> High-volume AI statutory sessions</li>
              <li><CheckCircle2 size={15} color="var(--accent)" /> PDF notice &amp; return OCR indexing</li>
              <li><CheckCircle2 size={15} color="var(--accent)" /> Saved bookmarks &amp; exportable history</li>
            </ul>
            <button
              type="button"
              onClick={() => handleAction('/register')}
              className={styles.primaryPill}
              style={{ marginTop: 20, justifyContent: 'center' }}
            >
              Start Professional Workspace
            </button>
          </div>

          <div className={styles.featureCard}>
            <span className={styles.sectionKicker}>Enterprise Firm</span>
            <div className={styles.priceValue}>Custom</div>
            <p className={styles.featureDesc}>For mid-to-large tax practices needing dedicated deployment and custom KBs.</p>
            <ul className={styles.featureList}>
              <li><CheckCircle2 size={15} color="var(--accent)" /> Private CBIC &amp; firm KB curation</li>
              <li><CheckCircle2 size={15} color="var(--accent)" /> Admin audit &amp; security console</li>
              <li><CheckCircle2 size={15} color="var(--accent)" /> Dedicated SLA &amp; API access</li>
            </ul>
            <button
              type="button"
              onClick={() => handleAction('/register')}
              className={styles.loginBtn}
              style={{ marginTop: 20, border: '1px solid var(--rule)' }}
            >
              Create Account
            </button>
          </div>
        </div>
      </section>

      {/* ─── 8. Footer ───────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div>
            <Link to="/" className={styles.brand}>
              <div className={styles.brandIcon}>₹</div>
              <div className={styles.brandName}>
                TaxSathi <span className={styles.brandBadge}>AI</span>
              </div>
            </Link>
            <p className={styles.footerDesc}>
              Citation-grounded Indian GST &amp; tax compliance assistant with deterministic calculators and document indexing.
            </p>
          </div>

          <div>
            <div className={styles.footerTitle}>Workspace</div>
            <ul className={styles.footerList}>
              <li><Link to="/chat">AI Tax Assistant</Link></li>
              <li><Link to="/dashboard">Compliance Dashboard</Link></li>
              <li><Link to="/tools">GST Statutory Tools</Link></li>
              <li><Link to="/documents">Documents Vault</Link></li>
            </ul>
          </div>

          <div>
            <div className={styles.footerTitle}>Official Portals</div>
            <ul className={styles.footerList}>
              <li><a href="https://cbic.gov.in" target="_blank" rel="noreferrer">CBIC Portal</a></li>
              <li><a href="https://gst.gov.in" target="_blank" rel="noreferrer">GST Portal</a></li>
              <li><a href="https://gstcouncil.gov.in" target="_blank" rel="noreferrer">GST Council</a></li>
              <li><a href="https://cbic-gst.gov.in" target="_blank" rel="noreferrer">CBIC GST Acts</a></li>
            </ul>
          </div>

          <div>
            <div className={styles.footerTitle}>Account</div>
            <ul className={styles.footerList}>
              <li><Link to="/login">Sign In</Link></li>
              <li><Link to="/register">Register Free</Link></li>
              <li><Link to="/admin/login">Admin Console</Link></li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} TaxSathi AI.</span>
          <span>Statutory reference only — verify filings with a practicing Chartered Accountant.</span>
        </div>
      </footer>
    </motion.div>
  );
}
