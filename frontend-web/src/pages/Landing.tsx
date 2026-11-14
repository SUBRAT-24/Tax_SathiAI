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
  ExternalLink,
  BookOpen,
  CalendarCheck,
  TrendingUp,
  Award
} from 'lucide-react';
import { pageVariants } from '../animations/variants';
import styles from './Landing.module.css';

// Interactive demo queries
const DEMO_QUERIES = [
  {
    id: 1,
    title: 'Can I claim ITC on corporate health insurance for employees?',
    category: 'Input Tax Credit',
    verdict: '⚠️ Conditional ITC Eligibility',
    explanation: 'Under Section 17(5)(b)(i), ITC on health insurance is blocked unless it is obligatory for the employer under statutory factory laws or government notifications during emergencies.',
    citations: ['CGST Act, Sec 17(5)(b)', 'Rule 42', 'Circular 140/10/2020'],
    score: '99.8% Match'
  },
  {
    id: 2,
    title: 'What is the statutory late fee for delayed GSTR-3B with nil tax?',
    category: 'Late Fees & Interest',
    verdict: '✓ Capped at ₹20/day (₹10 CGST + ₹10 SGST)',
    explanation: 'Pursuant to Notification No. 19/2021-Central Tax, late fee for nil returns is capped at ₹500 total (₹250 CGST + ₹250 SGST) calculated at ₹20 per day of delay.',
    citations: ['CGST Act, Sec 47', 'Notification 19/2021-CT'],
    score: '99.5% Match'
  },
  {
    id: 3,
    title: 'Does export of software services require LUT or refund under IGST?',
    category: 'Zero Rated Supply',
    verdict: '✓ Zero-Rated under Letter of Undertaking (LUT)',
    explanation: 'Exports constitute zero-rated supplies under Section 16 of the IGST Act. Suppliers can export without payment of IGST under a valid LUT filed on the GST portal.',
    citations: ['IGST Act, Sec 16', 'CGST Rules, Rule 96A', 'Circular 125/44/2019'],
    score: '99.2% Match'
  }
];

export default function Landing() {
  const navigate = useNavigate();
  const [selectedQuery, setSelectedQuery] = useState(DEMO_QUERIES[0]);
  const isAuth = !!localStorage.getItem('access_token');

  const handleAction = (path: string) => {
    if (isAuth && path === '/login') {
      navigate('/dashboard');
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
      {/* ─── 1. Floating Capsule / Pill Navbar ───────────────────────────── */}
      <header className={styles.navContainer}>
        <Link to="/" className={styles.brand}>
          <div className={styles.brandIcon}>₹</div>
          <div className={styles.brandName}>
            TaxSathi<span className={styles.brandSuffix}>AI</span>
          </div>
        </Link>

        {/* Center Floating Capsule Pill */}
        <nav className={styles.navCapsule}>
          <a href="#features" className={styles.capsuleLink}>Features</a>
          <a href="#playground" className={styles.capsuleLink}>Live Demo</a>
          <a href="#tools" className={styles.capsuleLink}>Calculators</a>
          <a href="#statutory" className={styles.capsuleLink}>Statutory Sources</a>
          <a href="#pricing" className={styles.capsuleLink}>Pricing</a>
        </nav>

        {/* Right Action Buttons */}
        <div className={styles.navActions}>
          <button onClick={() => handleAction('/login')} className={styles.loginLink}>
            {isAuth ? 'Dashboard' : 'Log in'}
          </button>
          <button 
            onClick={() => handleAction(isAuth ? '/chat' : '/register')} 
            className={styles.pillButtonPrimary}
          >
            <span>Start Free Trial</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </header>

      {/* ─── 2. Signature Hero Card (Outcrowd Wollo Style) ─────────────── */}
      <section className={styles.heroCardWrapper}>
        <div className={styles.heroCard}>
          <div className={styles.heroGlow} />
          <div className={styles.heroGlowBottom} />

          {/* Left Column: Headline, Description, CTAs */}
          <div className={styles.heroContent}>
            <div className={styles.badgePill}>
              <span className={styles.pulseDot} />
              <span>India's 1st Grounded Statutory Tax AI</span>
            </div>

            <h1 className={styles.heroTitle}>
              Reach Compliance with Precision.{' '}
              <span className={styles.heroTitleGradient}>Verify GST in Seconds.</span>
            </h1>

            <p className={styles.heroDescription}>
              Instant, legally grounded answers from official CBIC Acts, CGST Rules 2017 & GST Council circulars. 
              Zero hallucinations with exact section citations and deterministic statutory tools.
            </p>

            <div className={styles.heroActions}>
              <button 
                onClick={() => handleAction(isAuth ? '/chat' : '/register')} 
                className={styles.ctaButtonWhite}
              >
                <span>Start Free Trial</span>
                <ArrowRight size={17} />
              </button>

              <a href="#playground" className={styles.ctaButtonGhost}>
                <span>Explore Live Demo</span>
              </a>
            </div>

            {/* Bottom Trust Row */}
            <div className={styles.heroTrust}>
              <div className={trustStatStyle()}>
                <span className={styles.trustValue}>99.4%</span>
                <span className={styles.trustLabel}>Statutory Accuracy</span>
              </div>
              <div className={styles.trustDivider} />
              <div className={trustStatStyle()}>
                <span className={styles.trustValue}>11,000+</span>
                <span className={styles.trustLabel}>HSN / SAC Master</span>
              </div>
              <div className={styles.trustDivider} />
              <div className={trustStatStyle()}>
                <span className={styles.trustValue}>Zero</span>
                <span className={styles.trustLabel}>Hallucination Rate</span>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Layered Cards Showcase */}
          <div className={styles.heroVisual}>
            {/* Main Interactive Floating Card */}
            <div className={styles.floatingCardMain}>
              <div className={styles.cardTopRow}>
                <div className={styles.statusVerifiedPill}>
                  <ShieldCheck size={14} />
                  <span>Statutory Grounded</span>
                </div>
                <span className={styles.cardCategory}>Section 17(5) Evaluation</span>
              </div>

              <div className={styles.cardQueryText}>
                "Can our company claim ITC on commercial vehicle purchases above 13 seater capacity?"
              </div>

              <div className={styles.cardAnswerBox}>
                <div className={styles.answerHighlight}>
                  <CheckCircle2 size={14} color="#16a34a" />
                  <span style={{ color: '#15803d' }}>ITC Available & Allowed</span>
                </div>
                <p className={styles.answerText}>
                  Section 17(5)(a) restricts ITC only on motor vehicles with seating capacity up to 13 persons. Vehicles with seating capacity &gt; 13 are fully eligible for input tax credit.
                </p>
                <div className={styles.citationRow}>
                  <span className={styles.citationBadge}>CGST Act, Sec 17(5)(a)</span>
                  <span className={styles.citationBadge}>CBIC Notification 2018</span>
                  <span className={styles.citationBadge}>Rule 42 Validated</span>
                </div>
              </div>
            </div>

            {/* Sub Floating Mini Cards Grid */}
            <div className={styles.subCardsGrid}>
              <div className={styles.floatingMiniCard}>
                <div className={styles.miniCardHeader}>
                  <div className={styles.miniCardIcon} style={{ background: '#ecfdf5', color: '#059669' }}>
                    <ShieldCheck size={16} />
                  </div>
                  <span className={styles.miniCardTitle}>GSTIN Checksum</span>
                </div>
                <span className={styles.miniCardValue}>27AAAPL1234C1ZV • Valid</span>
              </div>

              <div className={styles.floatingMiniCard}>
                <div className={styles.miniCardHeader}>
                  <div className={styles.miniCardIcon} style={{ background: '#ede9fe', color: '#7c3aed' }}>
                    <Calculator size={16} />
                  </div>
                  <span className={styles.miniCardTitle}>Late Fee (Sec 47)</span>
                </div>
                <span className={styles.miniCardValue}>₹50/day + 18% Int</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. Sub-Hero Horizontal Strip (Video Spec) ──────────────────── */}
      <div className={styles.subHeroStrip}>
        <div className={styles.subHeroNav}>
          <a href="#features" className={styles.stripLink}>Features</a>
          <a href="#playground" className={styles.stripLink}>Live Demo</a>
          <a href="#tools" className={styles.stripLink}>Calculators</a>
          <a href="#statutory" className={styles.stripLink}>Official Gazettes</a>
          <a href="#pricing" className={styles.stripLink}>Pricing</a>
        </div>

        <div className={styles.socialIcons}>
          <a href="https://twitter.com" target="_blank" rel="noreferrer" className={styles.socialIconBtn} title="Twitter / X">
            <TrendingUp size={16} />
          </a>
          <a href="https://github.com/SUBRAT-24/Tax_SathiAI" target="_blank" rel="noreferrer" className={styles.socialIconBtn} title="GitHub Repository">
            <ExternalLink size={16} />
          </a>
          <a href="https://linkedin.com" target="_blank" rel="noreferrer" className={styles.socialIconBtn} title="LinkedIn">
            <Award size={16} />
          </a>
        </div>
      </div>

      {/* ─── 4. Secondary Section: Display Header + Dual CTAs ──────────── */}
      <section id="features" className={styles.secondarySection}>
        <div className={styles.sectionKicker}>Built For Modern Indian Businesses & CAs</div>
        <h2 className={styles.secondaryTitle}>
          Maximize Your Tax Compliance & Cut Audit Penalties
        </h2>
        <p className={styles.secondarySubtitle}>
          Replace guesswork with deterministic statutory intelligence. Back every return, credit claim, and rate classification with official CBIC citations.
        </p>

        <div className={styles.secondaryButtons}>
          <button onClick={() => handleAction(isAuth ? '/chat' : '/register')} className={styles.pillPrimaryBtn}>
            <span>Start Free Trial</span>
            <ArrowRight size={16} />
          </button>
          <button onClick={() => handleAction('/tools')} className={styles.pillGhostBtn}>
            <span>Explore GST Calculators</span>
          </button>
        </div>

        {/* 3D Colored Feature Cards Grid */}
        <div className={styles.featuresCardsGrid}>
          {/* Card 1: Grounded RAG */}
          <div className={styles.featureCardItem}>
            <div className={styles.featureCardIconWrapper} style={{ background: '#ede9fe', color: '#6366f1' }}>
              <BookOpen size={28} />
            </div>
            <h3 className={styles.featureCardTitle}>Grounded Statutory RAG</h3>
            <p className={styles.featureCardDescription}>
              Proprietary hybrid search combining semantic vector embeddings with BM25 keyword matching across the complete CGST Act, IGST Act, and CBIC notifications.
            </p>
            <ul className={styles.featureCardFooterList}>
              <li><CheckCircle2 size={16} color="#4f46e5" /> Zero hallucinations guaranteed</li>
              <li><CheckCircle2 size={16} color="#4f46e5" /> Section & rule level citations</li>
              <li><CheckCircle2 size={16} color="#4f46e5" /> Multi-turn conversational memory</li>
            </ul>
          </div>

          {/* Card 2: Deterministic Calculators */}
          <div className={styles.featureCardItem}>
            <div className={styles.featureCardIconWrapper} style={{ background: '#ecfdf5', color: '#10b981' }}>
              <Calculator size={28} />
            </div>
            <h3 className={styles.featureCardTitle}>Deterministic Calculators</h3>
            <p className={styles.featureCardDescription}>
              Never calculate GST penalties manually again. Date-aware statutory calculation logic with automatic CGST, SGST, and IGST breakdowns.
            </p>
            <ul className={styles.featureCardFooterList}>
              <li><CheckCircle2 size={16} color="#10b981" /> Section 47 tiered late fee engine</li>
              <li><CheckCircle2 size={16} color="#10b981" /> 18% p.a. Section 50 interest logic</li>
              <li><CheckCircle2 size={16} color="#10b981" /> Rule 42 & 43 reversal computation</li>
            </ul>
          </div>

          {/* Card 3: GSTIN & Due Dates */}
          <div className={styles.featureCardItem}>
            <div className={styles.featureCardIconWrapper} style={{ background: '#fffbeb', color: '#f59e0b' }}>
              <CalendarCheck size={28} />
            </div>
            <h3 className={styles.featureCardTitle}>GSTIN & Due Date Tracker</h3>
            <p className={styles.featureCardDescription}>
              Instant ISO 7064 Mod 36, M-36 checksum verification for 15-digit GSTINs, paired with real-time compliance deadlines for GSTR-1, GSTR-3B, and CMP-08.
            </p>
            <ul className={styles.featureCardFooterList}>
              <li><CheckCircle2 size={16} color="#f59e0b" /> Mod-36 mathematical checksum</li>
              <li><CheckCircle2 size={16} color="#f59e0b" /> Monthly & quarterly due date alerts</li>
              <li><CheckCircle2 size={16} color="#f59e0b" /> 11,000+ HSN & SAC code lookup</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── 5. Interactive Query Playground / Live Demo ────────────────── */}
      <section id="playground" className={styles.playgroundSection}>
        <div className={styles.playgroundContainer}>
          <div className={styles.playgroundLeft}>
            <div className={styles.badgePill} style={{ background: '#e0e7ff', color: '#4338ca', border: '1px solid #c7d2fe' }}>
              <Sparkles size={14} />
              <span>Interactive Simulator</span>
            </div>
            <h3>Test the Statutory AI Live</h3>
            <p>
              Select any real-world compliance scenario below to see how TaxSathi grounds its analysis with statutory authority and citations:
            </p>

            <div className={styles.queriesList}>
              {DEMO_QUERIES.map((q) => (
                <button
                  key={q.id}
                  onClick={() => setSelectedQuery(q)}
                  className={`${styles.queryButton} ${selectedQuery.id === q.id ? styles.activeQuery : ''}`}
                >
                  <span>{q.title}</span>
                  <ChevronRight size={16} />
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Playground Output Terminal */}
          <div className={styles.playgroundRight}>
            <div className={styles.terminalHeader}>
              <div className={styles.terminalDots}>
                <span className={`${styles.terminalDot} ${styles.dotRed}`} />
                <span className={`${styles.terminalDot} ${styles.dotYellow}`} />
                <span className={`${styles.terminalDot} ${styles.dotGreen}`} />
              </div>
              <span className={styles.terminalTitle}>CBIC Statutory Grounding Engine</span>
              <span style={{ fontSize: '0.75rem', color: '#4ade80' }}>● Grounded</span>
            </div>

            <div className={styles.terminalQueryBox}>
              <div className={styles.terminalLabel}>Query</div>
              <div className={styles.terminalQuery}>{selectedQuery.title}</div>
            </div>

            <div className={styles.terminalAnswerBox}>
              <div className={styles.terminalLabel}>Statutory Analysis</div>
              <div className={styles.terminalVerdict} style={{ color: selectedQuery.verdict.includes('✓') ? '#4ade80' : '#fbbf24' }}>
                {selectedQuery.verdict}
              </div>
              <p className={styles.terminalBody}>{selectedQuery.explanation}</p>
              
              <div className={styles.terminalLabel}>Authoritative Citations</div>
              <div className={styles.terminalCitations}>
                {selectedQuery.citations.map((cite, i) => (
                  <span key={i} className={styles.terminalCitationTag}>
                    § {cite}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. Modern Pricing / Plans Section ───────────────────────────── */}
      <section id="pricing" className={styles.secondarySection} style={{ marginTop: '100px' }}>
        <div className={styles.sectionKicker}>Transparent Pricing</div>
        <h2 className={styles.secondaryTitle}>Simple Plans for Growing Businesses</h2>
        <p className={styles.secondarySubtitle}>
          Start free with statutory lookups or upgrade for high-volume invoice reconciliation and multi-client CA practices.
        </p>

        <div className={styles.featuresCardsGrid}>
          {/* Free Tier */}
          <div className={styles.featureCardItem}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Starter</span>
            <h3 style={{ fontSize: '2.4rem', fontWeight: 800, margin: '8px 0 16px' }}>₹0 <span style={{ fontSize: '1rem', color: '#6b7280', fontWeight: 500 }}>/ month</span></h3>
            <p className={styles.featureCardDescription}>For individual taxpayers and small traders wanting fast statutory answers.</p>
            <ul className={styles.featureCardFooterList}>
              <li><CheckCircle2 size={16} color="#4f46e5" /> 50 AI Queries / month</li>
              <li><CheckCircle2 size={16} color="#4f46e5" /> Basic GSTIN validator</li>
              <li><CheckCircle2 size={16} color="#4f46e5" /> Standard tax calculators</li>
            </ul>
            <button onClick={() => handleAction('/register')} className={styles.pillGhostBtn} style={{ marginTop: '24px', justifyContent: 'center' }}>
              Get Started Free
            </button>
          </div>

          {/* Pro Tier (Featured) */}
          <div className={styles.featureCardItem} style={{ border: '2px solid #4f46e5', boxShadow: '0 20px 40px rgba(79, 70, 229, 0.12)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase' }}>Professional CA</span>
              <span style={{ background: '#ede9fe', color: '#4f46e5', fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px' }}>POPULAR</span>
            </div>
            <h3 style={{ fontSize: '2.4rem', fontWeight: 800, margin: '8px 0 16px' }}>₹999 <span style={{ fontSize: '1rem', color: '#6b7280', fontWeight: 500 }}>/ month</span></h3>
            <p className={styles.featureCardDescription}>For Chartered Accountants and tax consultants managing multiple clients.</p>
            <ul className={styles.featureCardFooterList}>
              <li><CheckCircle2 size={16} color="#4f46e5" /> Unlimited AI Queries</li>
              <li><CheckCircle2 size={16} color="#4f46e5" /> Full Document & Invoice Upload</li>
              <li><CheckCircle2 size={16} color="#4f46e5" /> Priority RAG Vector Pipeline</li>
              <li><CheckCircle2 size={16} color="#4f46e5" /> Multi-client workspace</li>
            </ul>
            <button onClick={() => handleAction('/register')} className={styles.pillPrimaryBtn} style={{ marginTop: '24px', justifyContent: 'center' }}>
              Start 14-Day Trial
            </button>
          </div>

          {/* Firm Tier */}
          <div className={styles.featureCardItem}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Enterprise Firm</span>
            <h3 style={{ fontSize: '2.4rem', fontWeight: 800, margin: '8px 0 16px' }}>Custom</h3>
            <p className={styles.featureCardDescription}>For high-volume accounting firms, ERP integrations, and enterprise audits.</p>
            <ul className={styles.featureCardFooterList}>
              <li><CheckCircle2 size={16} color="#4f46e5" /> Custom API Access</li>
              <li><CheckCircle2 size={16} color="#4f46e5" /> Dedicated VPC Deployment</li>
              <li><CheckCircle2 size={16} color="#4f46e5" /> Custom Rule 42/43 Workflows</li>
              <li><CheckCircle2 size={16} color="#4f46e5" /> 24/7 SLA Support</li>
            </ul>
            <button onClick={() => handleAction('/register')} className={styles.pillGhostBtn} style={{ marginTop: '24px', justifyContent: 'center' }}>
              Contact Sales
            </button>
          </div>
        </div>
      </section>

      {/* ─── 7. Modern Clean Footer ─────────────────────────────────────── */}
      <footer className={styles.footerContainer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBrandCol}>
            <Link to="/" className={styles.brand}>
              <div className={styles.brandIcon}>₹</div>
              <div className={styles.brandName}>
                TaxSathi<span className={styles.brandSuffix}>AI</span>
              </div>
            </Link>
            <p>
              Authoritative, citation-grounded statutory AI assistant for Indian GST compliance, rules, and tax calculations.
            </p>
          </div>

          <div>
            <div className={styles.footerColTitle}>Capabilities</div>
            <ul className={styles.footerLinksList}>
              <li><Link to="/chat">Statutory Chatbot</Link></li>
              <li><Link to="/tools">GST Rate Calculator</Link></li>
              <li><Link to="/tools">Late Fee Computation</Link></li>
              <li><Link to="/tools">GSTIN Checksum</Link></li>
              <li><Link to="/documents">Invoice Verification</Link></li>
            </ul>
          </div>

          <div>
            <div className={styles.footerColTitle}>Statutory Sources</div>
            <ul className={styles.footerLinksList}>
              <li><a href="https://cbic.gov.in" target="_blank" rel="noreferrer">CBIC Portal</a></li>
              <li><a href="https://gst.gov.in" target="_blank" rel="noreferrer">GST Council</a></li>
              <li><a href="https://gstcouncil.gov.in" target="_blank" rel="noreferrer">Central Tax Acts</a></li>
              <li><a href="https://cbic-gst.gov.in" target="_blank" rel="noreferrer">GST Notifications</a></li>
            </ul>
          </div>

          <div>
            <div className={styles.footerColTitle}>Account</div>
            <ul className={styles.footerLinksList}>
              <li><Link to="/login">Sign In</Link></li>
              <li><Link to="/register">Create Free Account</Link></li>
              <li><Link to="/admin/login">Admin Portal</Link></li>
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <div>© {new Date().getFullYear()} TaxSathi AI. All statutory rights reserved.</div>
          <div>
            Statutory information sourced from cbic.gov.in. Not a substitute for certified chartered accountant advisory.
          </div>
        </div>
      </footer>
    </motion.div>
  );
}

function trustStatStyle() {
  return styles.trustStat;
}
