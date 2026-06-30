/**
 * Landing Page — Hero with word-by-word reveal, feature cards, stats counter,
 * floating particles, CTA, testimonials.
 */

import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, animate } from 'framer-motion';
import {
  wordRevealContainer, wordReveal, staggerContainer, staggerItem,
  scaleTap, buttonTap, pageVariants, pageTransition
} from '../animations/variants';
import {
  Sparkles, MessageSquare, Shield, Calculator, FileText,
  Zap, Clock, ArrowRight
} from 'lucide-react';

// ─── Animated Counter Component ────────────
function Counter({ from = 0, to, suffix = '', prefix = '' }: { from?: number; to: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(from);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const ctrl = animate(from, to, {
        duration: 2,
        ease: 'easeOut',
        onUpdate: (v) => setCount(Math.round(v)),
      });
      return () => ctrl.stop();
    }
  }, [isInView, from, to]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

// ─── Floating Particle ────────────────────
function FloatingParticle({ delay, size, x, y, color }: any) {
  return (
    <motion.div
      animate={{
        y: [0, -30, 0],
        x: [0, 15, 0],
        opacity: [0.2, 0.6, 0.2],
        rotate: [0, 180, 360],
      }}
      transition={{
        duration: 6 + Math.random() * 4,
        delay,
        repeat: Infinity,
        ease: 'easeInOut' as const,
      }}
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        left: x,
        top: y,
        filter: 'blur(1px)',
        pointerEvents: 'none',
      }}
    />
  );
}

const features = [
  { icon: MessageSquare, title: 'AI-Powered Chat', desc: 'Get instant, cited answers about GST rules, ITC claims, returns, and compliance.', color: '#6366f1' },
  { icon: Shield, title: 'CBIC Source Citations', desc: 'Every answer references official CBIC documents with section numbers and page references.', color: '#22d3ee' },
  { icon: Calculator, title: 'GST Calculators', desc: 'Built-in tools for GST calculation, ITC eligibility, HSN lookup, and late fee computation.', color: '#34d399' },
  { icon: FileText, title: 'Document Analysis', desc: 'Upload GST returns, invoices, or notices. Our AI extracts and analyzes key information.', color: '#f97316' },
  { icon: Zap, title: 'Real-time Streaming', desc: 'Get answers in real-time with token-by-token streaming. No waiting for full responses.', color: '#8b5cf6' },
  { icon: Clock, title: 'Deadline Alerts', desc: 'Never miss a filing deadline with smart compliance tracking and notification alerts.', color: '#fbbf24' },
];

const stats = [
  { value: 500, suffix: '+', label: 'CBIC Documents Indexed' },
  { value: 98, suffix: '%', label: 'Answer Accuracy' },
  { value: 10000, suffix: '+', label: 'Queries Answered' },
  { value: 3, suffix: 's', label: 'Avg Response Time', prefix: '<' },
];

export default function Landing() {
  const heroWords = "Your AI-Powered GST & Tax Compliance Partner".split(' ');

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      style={{ background: 'var(--color-bg-primary)', minHeight: '100vh' }}
    >
      {/* ─── Top Nav ──────────────────────── */}
      <motion.header
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 40px', background: 'rgba(10, 14, 26, 0.8)',
          backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(148, 163, 184, 0.06)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8,
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Sparkles size={18} color="white" />
          </div>
          <span style={{ fontSize: '1.2rem', fontWeight: 800 }}>
            <span className="gradient-text">TaxSathi</span>{' '}
            <span style={{ color: 'var(--color-accent)' }}>AI</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/login">
            <motion.button {...scaleTap} className="btn btn-ghost" style={{ color: 'var(--color-text-secondary)' }}>
              Log In
            </motion.button>
          </Link>
          <Link to="/register">
            <motion.button {...buttonTap} className="btn btn-primary">
              Get Started Free <ArrowRight size={16} />
            </motion.button>
          </Link>
        </div>
      </motion.header>

      {/* ─── Hero Section ─────────────────── */}
      <section style={{
        position: 'relative', minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: '120px 20px 80px', overflow: 'hidden',
        background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 60%)',
      }}>
        {/* Floating Particles */}
        {[
          { delay: 0, size: 6, x: '10%', y: '20%', color: 'rgba(99,102,241,0.5)' },
          { delay: 1, size: 4, x: '80%', y: '30%', color: 'rgba(34,211,238,0.5)' },
          { delay: 2, size: 8, x: '70%', y: '60%', color: 'rgba(139,92,246,0.4)' },
          { delay: 3, size: 5, x: '20%', y: '70%', color: 'rgba(52,211,153,0.4)' },
          { delay: 0.5, size: 3, x: '90%', y: '15%', color: 'rgba(251,191,36,0.4)' },
          { delay: 1.5, size: 7, x: '5%', y: '50%', color: 'rgba(99,102,241,0.3)' },
        ].map((p, i) => <FloatingParticle key={i} {...p} />)}

        <div style={{ maxWidth: 800, position: 'relative', zIndex: 1 }}>
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 16px', background: 'rgba(99,102,241,0.1)',
              borderRadius: 'var(--border-radius-full)', border: '1px solid rgba(99,102,241,0.2)',
              marginBottom: 24, fontSize: '0.85rem', color: 'var(--color-primary-light)',
            }}
          >
            <Sparkles size={14} /> Powered by RAG + Gemini AI
          </motion.div>

          {/* Word-by-word reveal */}
          <motion.h1
            variants={wordRevealContainer}
            initial="hidden"
            animate="visible"
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              marginBottom: 24,
            }}
          >
            {heroWords.map((word, i) => (
              <motion.span
                key={i}
                variants={wordReveal}
                style={{
                  display: 'inline-block',
                  marginRight: '0.3em',
                  background: ['GST', '&', 'Tax'].includes(word)
                    ? 'var(--gradient-primary)' : 'none',
                  WebkitBackgroundClip: ['GST', '&', 'Tax'].includes(word) ? 'text' : 'unset',
                  WebkitTextFillColor: ['GST', '&', 'Tax'].includes(word) ? 'transparent' : 'inherit',
                }}
              >
                {word}
              </motion.span>
            ))}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            style={{
              fontSize: '1.15rem', color: 'var(--color-text-secondary)',
              maxWidth: 600, margin: '0 auto 40px', lineHeight: 1.7,
            }}
          >
            Get instant, accurate, cited answers about GST rules, ITC claims,
            return filing, penalties, and tax compliance — powered by AI over official CBIC documents.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <Link to="/register">
              <motion.button
                {...buttonTap}
                className="btn btn-primary"
                style={{ padding: '14px 32px', fontSize: '1rem' }}
              >
                Start Free <ArrowRight size={18} />
              </motion.button>
            </Link>
            <Link to="/login">
              <motion.button
                {...scaleTap}
                className="btn btn-secondary"
                style={{ padding: '14px 32px', fontSize: '1rem' }}
              >
                <MessageSquare size={18} /> Try AI Chat
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ─── Stats Section ────────────────── */}
      <section style={{
        padding: '60px 20px', borderTop: '1px solid var(--border-color)',
        borderBottom: '1px solid var(--border-color)',
      }}>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          style={{
            maxWidth: 1000, margin: '0 auto',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 40, textAlign: 'center',
          }}
        >
          {stats.map((stat, i) => (
            <motion.div key={i} variants={staggerItem}>
              <div style={{
                fontSize: '2.5rem', fontWeight: 900, marginBottom: 4,
                background: 'var(--gradient-primary)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                <Counter to={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                {stat.label}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── Features Section ─────────────── */}
      <section style={{ padding: '100px 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ textAlign: 'center', marginBottom: 60 }}
          >
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 16 }}>
              Everything You Need for{' '}
              <span className="gradient-text">GST Compliance</span>
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', maxWidth: 600, margin: '0 auto', fontSize: '1.05rem' }}>
              From AI-powered Q&A to automated calculations, TaxSathi AI covers every aspect of GST compliance.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: 24,
            }}
          >
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  variants={staggerItem}
                  whileHover={{ y: -6, boxShadow: `0 12px 40px rgba(99,102,241,0.15)` }}
                  style={{
                    padding: 28,
                    background: 'var(--color-bg-glass)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius-lg)',
                    cursor: 'default',
                    transition: 'border-color 0.3s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = feature.color + '40')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(148,163,184,0.1)')}
                >
                  <div style={{
                    width: 48, height: 48, borderRadius: 12,
                    background: feature.color + '15',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 16,
                  }}>
                    <Icon size={22} color={feature.color} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8 }}>
                    {feature.title}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                    {feature.desc}
                  </p>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ─── CTA Section ──────────────────── */}
      <section style={{
        padding: '80px 20px',
        background: 'radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.08) 0%, transparent 60%)',
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          style={{
            maxWidth: 700, margin: '0 auto', textAlign: 'center',
            padding: '60px 40px', borderRadius: 'var(--border-radius-xl)',
            background: 'var(--color-bg-glass)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(99,102,241,0.2)',
          }}
        >
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 16 }}>
            Ready to Simplify Your{' '}
            <span className="gradient-text">Tax Compliance</span>?
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 32, fontSize: '1.05rem' }}>
            Join thousands of businesses using TaxSathi AI for instant GST guidance.
          </p>
          <Link to="/register">
            <motion.button
              {...buttonTap}
              className="btn btn-primary"
              style={{ padding: '16px 40px', fontSize: '1.05rem' }}
            >
              Get Started — It's Free <Sparkles size={18} />
            </motion.button>
          </Link>
        </motion.div>
      </section>

      {/* ─── Footer ───────────────────────── */}
      <footer style={{
        padding: '40px 20px', borderTop: '1px solid var(--border-color)',
        textAlign: 'center',
      }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
          © 2024 TaxSathi AI. AI-generated guidance, not legal advice. Built with ❤️ for Indian businesses.
        </p>
      </footer>
    </motion.div>
  );
}
