/**
 * Chat Page — Full RAG chatbot UI with streaming, source citations,
 * suggestion chips, feedback buttons, typing indicator.
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import {
  sendQuery, addUserMessage, fetchSessions, fetchSuggestions, clearMessages
} from '../store/chatSlice';
import {
  pageVariants, pageTransition, chatBubbleUser, chatBubbleAI,
  chipStagger, chipItem, expandVariants,
  scaleTap, fadeInUp
} from '../animations/variants';
import {
  Send, Sparkles, ThumbsUp, ThumbsDown, Copy,
  ChevronDown, FileText, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';

// ─── Typing Indicator ──────────────────
function TypingIndicator() {
  return (
    <motion.div
      variants={chatBubbleAI} initial="hidden" animate="visible"
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '12px 18px', background: 'var(--color-surface)',
        borderRadius: '16px 16px 16px 4px', width: 'fit-content',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
      }}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -6, 0],
            opacity: [0.4, 1, 0.4],
            scale: [0.9, 1.15, 0.9],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            delay: i * 0.16,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--color-primary-light)',
            boxShadow: '0 0 8px rgba(99, 102, 241, 0.6)',
          }}
        />
      ))}
    </motion.div>
  );
}

// ─── Source Citation ────────────────────
function SourceCitation({ sources }: { sources: any[] }) {
  const [open, setOpen] = useState(false);
  if (!sources || sources.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <motion.button
        {...scaleTap}
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 12px', background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8,
          color: 'var(--color-primary-light)', fontSize: '0.8rem', fontWeight: 500,
        }}
      >
        <FileText size={14} /> {sources.length} Sources
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={expandVariants} initial="collapsed" animate="expanded" exit="collapsed"
            style={{ marginTop: 8 }}
          >
            {sources.map((src, i) => (
              <div key={i} style={{
                padding: '8px 12px', marginBottom: 4,
                background: 'rgba(30,41,59,0.5)', borderRadius: 6,
                fontSize: '0.78rem', color: 'var(--color-text-secondary)',
                borderLeft: '3px solid var(--color-primary)',
              }}>
                <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  📄 {src.doc_name} • Page {src.page}
                </div>
                <div style={{ marginTop: 2 }}>{src.text_preview}</div>
                <div style={{ marginTop: 2, color: 'var(--color-primary-light)' }}>
                  Relevance: {Math.round((src.relevance_score || 0) * 100)}%
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Message Bubble ────────────────────
function MessageBubble({ message, onFeedback }: { message: any; onFeedback: (id: number, fb: string) => void }) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      variants={isUser ? chatBubbleUser : chatBubbleAI}
      initial="hidden" animate="visible"
      style={{
        display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 16,
      }}
    >
      <div style={{
        maxWidth: '75%', padding: '14px 18px',
        background: isUser ? 'var(--gradient-primary)' : 'var(--color-surface)',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
        border: isUser ? 'none' : '1px solid var(--border-color)',
        color: isUser ? 'white' : 'var(--color-text-primary)',
      }}>
        <div style={{
          fontSize: '0.9rem', lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
        }}>
          {message.content}
        </div>

        {/* Confidence bar */}
        {message.confidence_score != null && (
          <div style={{ marginTop: 10 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 4,
            }}>
              <span>Confidence</span>
              <span>{Math.round(message.confidence_score * 100)}%</span>
            </div>
            <div style={{
              height: 4, borderRadius: 4,
              background: 'rgba(148,163,184,0.15)',
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${message.confidence_score * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                style={{
                  height: '100%', borderRadius: 4,
                  background: message.confidence_score > 0.7
                    ? 'var(--color-success)'
                    : message.confidence_score > 0.5
                    ? 'var(--color-warning)'
                    : 'var(--color-error)',
                }}
              />
            </div>
          </div>
        )}

        {/* Sources */}
        {!isUser && <SourceCitation sources={message.sources || []} />}

        {/* Feedback buttons */}
        {!isUser && (
          <div style={{
            display: 'flex', gap: 8, marginTop: 10, paddingTop: 10,
            borderTop: '1px solid var(--border-color)',
          }}>
            <motion.button
              {...scaleTap}
              onClick={() => onFeedback(message.id, 'thumbs_up')}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', borderRadius: 6, fontSize: '0.75rem',
                background: message.feedback === 'thumbs_up' ? 'rgba(52,211,153,0.2)' : 'transparent',
                color: message.feedback === 'thumbs_up' ? 'var(--color-success)' : 'var(--color-text-muted)',
                border: '1px solid transparent',
              }}
            >
              <ThumbsUp size={14} />
            </motion.button>
            <motion.button
              {...scaleTap}
              onClick={() => onFeedback(message.id, 'thumbs_down')}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', borderRadius: 6, fontSize: '0.75rem',
                background: message.feedback === 'thumbs_down' ? 'rgba(248,113,113,0.2)' : 'transparent',
                color: message.feedback === 'thumbs_down' ? 'var(--color-error)' : 'var(--color-text-muted)',
                border: '1px solid transparent',
              }}
            >
              <ThumbsDown size={14} />
            </motion.button>
            <motion.button
              {...scaleTap}
              onClick={() => { navigator.clipboard.writeText(message.content); toast.success('Copied!'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 8px', borderRadius: 6, fontSize: '0.75rem',
                background: 'transparent', color: 'var(--color-text-muted)',
              }}
            >
              <Copy size={14} />
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Chat Page ────────────────────
export default function Chat() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dispatch = useDispatch<AppDispatch>();
  const { messages, loading, suggestions, currentSessionId } = useSelector(
    (state: RootState) => state.chat
  );

  useEffect(() => {
    dispatch(fetchSuggestions());
    dispatch(fetchSessions());
  }, [dispatch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const query = input.trim();
    setInput('');
    dispatch(addUserMessage(query));
    dispatch(sendQuery({ query, sessionId: currentSessionId || undefined }));
  };

  const handleFeedback = async (messageId: number, feedback: string) => {
    try {
      await api.post('/chat/feedback', { message_id: messageId, feedback });
      toast.success('Feedback recorded');
    } catch {
      toast.error('Failed to submit feedback');
    }
  };

  const quickQuestions = [
    "How to register for GST?",
    "ITC claim rules and conditions",
    "GSTR-3B filing due dates",
    "Late fee for delayed filing",
    "GST rates for IT services",
    "Composition scheme eligibility",
  ];

  return (
    <motion.div
      variants={pageVariants} initial="initial" animate="animate" exit="exit"
      transition={pageTransition}
      style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}
    >
      {/* Messages area */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '20px 0',
      }}>
        {messages.length === 0 ? (
          /* Empty state */
          <motion.div
            variants={fadeInUp} initial="hidden" animate="visible"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', textAlign: 'center',
              padding: 40,
            }}
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 80, height: 80, borderRadius: 24,
                background: 'var(--gradient-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 24, boxShadow: '0 0 35px rgba(99, 102, 241, 0.45)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <Sparkles size={36} color="white" />
            </motion.div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>
              Ask me anything about <span className="gradient-text">GST & Tax</span>
            </h2>
            <p style={{
              color: 'var(--color-text-muted)', maxWidth: 500,
              marginBottom: 32, lineHeight: 1.6, fontSize: '0.95rem',
            }}>
              Powered by official CBIC circulars, CGST/SGST Acts, and real-time rules. Every answer includes verifiable citations.
            </p>

            {/* Quick question chips */}
            <motion.div
              variants={chipStagger} initial="hidden" animate="visible"
              style={{
                display: 'flex', flexWrap: 'wrap', gap: 10,
                justifyContent: 'center', maxWidth: 620,
              }}
            >
              {quickQuestions.map((q, i) => (
                <motion.button
                  key={i}
                  variants={chipItem}
                  whileHover={{ y: -3, scale: 1.02, borderColor: 'var(--color-primary-light)', boxShadow: '0 6px 20px rgba(99, 102, 241, 0.15)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  style={{
                    padding: '9px 18px', borderRadius: 'var(--border-radius-full)',
                    background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: 'var(--color-text-primary)', fontSize: '0.84rem', fontWeight: 500,
                    cursor: 'pointer', transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                >
                  {q}
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        ) : (
          /* Messages list */
          <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 16px' }}>
            <AnimatePresence>
              {messages.map((msg, i) => (
                <MessageBubble key={msg.id || i} message={msg} onFeedback={handleFeedback} />
              ))}
            </AnimatePresence>

            {loading && <TypingIndicator />}

            {/* Suggestion chips after response */}
            {!loading && suggestions.length > 0 && messages.length > 0 && (
              <motion.div
                variants={chipStagger} initial="hidden" animate="visible"
                style={{
                  display: 'flex', flexWrap: 'wrap', gap: 8,
                  marginTop: 12, marginBottom: 16,
                }}
              >
                {suggestions.map((s, i) => (
                  <motion.button
                    key={i} variants={chipItem}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    style={{
                      padding: '6px 14px', borderRadius: 'var(--border-radius-full)',
                      background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
                      color: 'var(--color-primary-light)', fontSize: '0.8rem', cursor: 'pointer',
                    }}
                  >
                    {s}
                  </motion.button>
                ))}
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div style={{
        padding: '16px 0', borderTop: '1px solid var(--border-color)',
        background: 'rgba(10,14,26,0.5)', backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          maxWidth: 800, margin: '0 auto',
          display: 'flex', gap: 12, alignItems: 'center',
          padding: '0 16px',
        }}>
          <motion.button
            {...scaleTap}
            onClick={() => dispatch(clearMessages())}
            className="btn-icon"
            title="New chat"
          >
            <Plus size={20} />
          </motion.button>

          <div style={{
            flex: 1, display: 'flex', alignItems: 'center',
            background: 'var(--color-surface)', borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--border-color)', padding: '4px 4px 4px 16px',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about GST, ITC, returns, penalties..."
              style={{
                flex: 1, background: 'transparent', border: 'none',
                color: 'var(--color-text-primary)', fontSize: '0.9rem',
                outline: 'none',
              }}
            />
            <motion.button
              {...scaleTap}
              onClick={handleSend}
              disabled={!input.trim() || loading}
              style={{
                width: 38, height: 38, borderRadius: 8,
                background: input.trim() ? 'var(--gradient-primary)' : 'var(--color-surface-hover)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', transition: 'all 0.2s',
              }}
            >
              <Send size={18} />
            </motion.button>
          </div>
        </div>

        <p style={{
          textAlign: 'center', fontSize: '0.7rem',
          color: 'var(--color-text-muted)', marginTop: 8,
        }}>
          ⚠️ AI-generated guidance, not legal advice. Always verify with a qualified CA.
        </p>
      </div>
    </motion.div>
  );
}
