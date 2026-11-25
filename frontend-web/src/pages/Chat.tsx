import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import {
  Send,
  MessageSquare,
  Plus,
  Bookmark,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  PanelLeftClose,
  PanelLeftOpen,
  Trash2,
  Pencil,
  Search,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import type { RootState, AppDispatch } from '../store/store';
import {
  sendQuery,
  addUserMessage,
  clearMessages,
  fetchSessions,
  fetchSessionMessages,
  renameSession,
  deleteSession,
  submitFeedback,
  toggleBookmark,
  fetchBookmarks,
  fetchSuggestions,
  type Source,
} from '../store/chatSlice';
import { Button, Skeleton } from '../components/ui';
import { pageVariants } from '../animations/variants';
import styles from './Chat.module.css';

function CitationItem({ src }: { src: Source }) {
  const [expanded, setExpanded] = useState(false);
  const title = src.doc_name || src.section || `CBIC Document (Page ${src.page || 1})`;

  return (
    <button
      type="button"
      className={styles.citationChip}
      onClick={() => src.text_preview && setExpanded((prev) => !prev)}
    >
      <div className={styles.citationHeader}>
        <span>
          § {title}
          {src.page ? ` · p.${src.page}` : ''}
          {src.category ? ` · ${src.category}` : ''}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {typeof src.relevance_score === 'number' && (
            <span className={styles.citationScore}>
              {Math.round(src.relevance_score * 100)}% match
            </span>
          )}
          {src.text_preview && (expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
        </span>
      </div>
      {expanded && src.text_preview && (
        <div className={styles.citationPreview}>{src.text_preview}</div>
      )}
    </button>
  );
}

export default function Chat() {
  const [input, setInput] = useState('');
  const [historyOpen, setHistoryOpen] = useState(() => window.innerWidth > 900);
  const [historyTab, setHistoryTab] = useState<'sessions' | 'bookmarks'>('sessions');
  const [sessionSearch, setSessionSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dispatch = useDispatch<AppDispatch>();
  const {
    sessions,
    sessionsLoading,
    currentSessionId,
    messages,
    messagesLoading,
    bookmarks,
    suggestions,
    loading,
  } = useSelector((state: RootState) => state.chat);

  useEffect(() => {
    dispatch(fetchSessions());
    dispatch(fetchSuggestions());
    dispatch(fetchBookmarks());
  }, [dispatch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [input]);

  const sendText = async (text: string) => {
    const query = text.trim();
    if (!query || query.length < 3 || loading) {
      if (query.length > 0 && query.length < 3) {
        toast.error('Please enter at least 3 characters');
      }
      return;
    }
    setInput('');
    dispatch(addUserMessage(query));
    const res = await dispatch(sendQuery({ query, sessionId: currentSessionId || undefined }));
    if (sendQuery.fulfilled.match(res)) {
      dispatch(fetchSessions());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendText(input);
    }
  };

  const handleSelectSession = (sessionId: number) => {
    dispatch(fetchSessionMessages(sessionId));
    if (window.innerWidth <= 900) setHistoryOpen(false);
  };

  const handleRenameSubmit = async (sessionId: number) => {
    const trimmed = editTitle.trim();
    if (trimmed) {
      await dispatch(renameSession({ sessionId, title: trimmed }));
      toast.success('Conversation renamed');
    }
    setEditingId(null);
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: number) => {
    e.stopPropagation();
    await dispatch(deleteSession(sessionId));
    toast.success('Conversation deleted');
  };

  const handleCopy = async (id: number, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      toast.error('Unable to copy');
    }
  };

  const handleBookmark = async (messageId: number) => {
    await dispatch(toggleBookmark(messageId));
    dispatch(fetchBookmarks());
  };

  const filteredSessions = sessions.filter((s) =>
    (s.title || 'New Chat').toLowerCase().includes(sessionSearch.toLowerCase())
  );

  const activeSession = sessions.find((s) => s.id === currentSessionId);

  const fallbackExamples = [
    'What is Input Tax Credit and when is it blocked under Section 17(5)?',
    'What are the due dates for GSTR-1 and GSTR-3B filing?',
    'What is the GST rate and SAC code for IT & software services?',
    'How to calculate late fee and interest for delayed GSTR-3B?',
  ];
  const displaySuggestions = suggestions.length > 0 ? suggestions : fallbackExamples;

  return (
    <motion.div
      className={styles.chatShell}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* ─── Left History & Bookmarks Drawer ─────────────────────── */}
      {historyOpen && (
        <aside className={styles.historyPanel} aria-label="Conversation history">
          <div className={styles.historyTop}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="primary"
                size="sm"
                style={{ flex: 1 }}
                onClick={() => dispatch(clearMessages())}
              >
                <Plus size={15} /> New Chat
              </Button>
              <Button
                variant="secondary"
                size="sm"
                iconOnly
                onClick={() => setHistoryOpen(false)}
                aria-label="Hide history panel"
              >
                <PanelLeftClose size={15} />
              </Button>
            </div>

            <div className={styles.historyTabs}>
              <button
                type="button"
                className={`${styles.historyTab} ${historyTab === 'sessions' ? styles.historyTabActive : ''}`}
                onClick={() => setHistoryTab('sessions')}
              >
                <MessageSquare size={13} /> Sessions ({sessions.length})
              </button>
              <button
                type="button"
                className={`${styles.historyTab} ${historyTab === 'bookmarks' ? styles.historyTabActive : ''}`}
                onClick={() => {
                  setHistoryTab('bookmarks');
                  dispatch(fetchBookmarks());
                }}
              >
                <Bookmark size={13} /> Saved ({bookmarks.length})
              </button>
            </div>

            {historyTab === 'sessions' && (
              <div className={styles.historySearch}>
                <Search size={13} className={styles.historySearchIcon} />
                <input
                  type="text"
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  placeholder="Filter conversations..."
                  className={styles.historySearchInput}
                />
              </div>
            )}
          </div>

          <div className={styles.historyList}>
            {historyTab === 'sessions' ? (
              sessionsLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 4 }}>
                  <Skeleton variant="button" />
                  <Skeleton variant="button" />
                  <Skeleton variant="button" />
                </div>
              ) : filteredSessions.length === 0 ? (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', padding: 12, textAlign: 'center' }}>
                  {sessionSearch ? 'No matching conversations' : 'No saved conversations yet'}
                </p>
              ) : (
                filteredSessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => editingId !== s.id && handleSelectSession(s.id)}
                    className={`${styles.sessionItem} ${currentSessionId === s.id ? styles.sessionItemActive : ''}`}
                  >
                    <div className={styles.sessionTitleWrap}>
                      {editingId === s.id ? (
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => handleRenameSubmit(s.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameSubmit(s.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          autoFocus
                          className={styles.renameInput}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <div className={styles.sessionTitle}>{s.title || 'New Consultation'}</div>
                          <div className={styles.sessionDate}>
                            {s.updated_at ? new Date(s.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Recent'}
                          </div>
                        </>
                      )}
                    </div>
                    {editingId !== s.id && (
                      <div className={styles.sessionActions}>
                        <button
                          type="button"
                          className={styles.miniIconBtn}
                          aria-label="Rename session"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(s.id);
                            setEditTitle(s.title);
                          }}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.miniIconBtn} ${styles.miniIconBtnDanger}`}
                          aria-label="Delete session"
                          onClick={(e) => handleDeleteSession(e, s.id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )
            ) : bookmarks.length === 0 ? (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', padding: 12, textAlign: 'center' }}>
                Bookmark any statutory answer to save it here for quick reference.
              </p>
            ) : (
              bookmarks.map((bm) => (
                <div key={bm.id} className={styles.bookmarkCard}>
                  <div className={styles.bookmarkExcerpt}>{bm.content}</div>
                  <div className={styles.bookmarkMeta}>
                    <span>
                      {bm.timestamp ? new Date(bm.timestamp).toLocaleDateString('en-IN') : ''}
                    </span>
                    <button
                      type="button"
                      className={styles.miniIconBtn}
                      onClick={() => handleCopy(bm.id, bm.content)}
                      title="Copy bookmarked answer"
                    >
                      {copiedId === bm.id ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      )}

      {/* ─── Main Conversation Canvas ─────────────────────────────── */}
      <div className={styles.chatMain}>
        <div className={styles.chatHeader}>
          <div className={styles.chatHeaderLeft}>
            {!historyOpen && (
              <Button
                variant="secondary"
                size="sm"
                iconOnly
                onClick={() => setHistoryOpen(true)}
                aria-label="Show history panel"
              >
                <PanelLeftOpen size={16} />
              </Button>
            )}
            <div style={{ minWidth: 0 }}>
              <div className={styles.chatHeaderTitle}>
                {activeSession?.title || 'New Statutory Consultation'}
              </div>
              <div className={styles.chatHeaderMeta}>
                <span>CBIC Acts &amp; Rules Grounded</span>
                <span>•</span>
                <span>Multi-turn Context Active</span>
              </div>
            </div>
          </div>

          <Link to="/tools">
            <Button variant="secondary" size="sm">
              <Wrench size={14} /> GST Calculators
            </Button>
          </Link>
        </div>

        <div className={styles.messages}>
          <div className={styles.messagesInner}>
            {messagesLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Skeleton variant="card" />
                <Skeleton variant="card" />
              </div>
            ) : messages.length === 0 ? (
              <div className={styles.emptyWrap}>
                <div className={styles.emptyIcon}>
                  <Sparkles size={24} />
                </div>
                <h1 className={styles.emptyTitle}>Ask Any Indian GST Question</h1>
                <p className={styles.emptyDesc}>
                  Grounded in the CGST Act, IGST Act, Rules 2017, CBIC circulars, and your uploaded PDFs.
                </p>

                <div className={styles.examplesGrid}>
                  {displaySuggestions.slice(0, 6).map((q, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => sendText(q)}
                      className={styles.exampleChip}
                    >
                      <span>{q}</span>
                      <Send size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`${styles.message} ${
                      msg.role === 'user' ? styles.messageUser : styles.messageAssistant
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <p>{msg.content}</p>
                    ) : (
                      <>
                        {(msg.confidence_score !== undefined || msg.intent_tag || msg.response_time_ms) && (
                          <div className={styles.assistantMeta}>
                            {typeof msg.confidence_score === 'number' && (
                              <span className={styles.metaPill}>
                                <ShieldCheck size={12} />
                                {Math.round(msg.confidence_score * 100)}% Grounded
                              </span>
                            )}
                            {msg.intent_tag && (
                              <span className={`${styles.metaPill} ${styles.metaPillMuted}`}>
                                {msg.intent_tag}
                              </span>
                            )}
                            {typeof msg.response_time_ms === 'number' && (
                              <span className={`${styles.metaPill} ${styles.metaPillMuted}`}>
                                {(msg.response_time_ms / 1000).toFixed(2)}s
                              </span>
                            )}
                          </div>
                        )}

                        <div className={styles.markdown}>
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>

                        {msg.sources && msg.sources.length > 0 && (
                          <div className={styles.citationsBox}>
                            <div className={styles.citationsLabel}>
                              Statutory Sources ({msg.sources.length}) — click to inspect excerpt
                            </div>
                            <div className={styles.citationsList}>
                              {msg.sources.map((src, idx) => (
                                <CitationItem key={idx} src={src} />
                              ))}
                            </div>
                          </div>
                        )}

                        <div className={styles.msgActions}>
                          <div className={styles.msgActionGroup}>
                            <button
                              type="button"
                              className={styles.actionBtn}
                              onClick={() => handleCopy(msg.id, msg.content)}
                            >
                              {copiedId === msg.id ? <Check size={13} /> : <Copy size={13} />}
                              {copiedId === msg.id ? 'Copied' : 'Copy'}
                            </button>
                            <button
                              type="button"
                              className={`${styles.actionBtn} ${msg.is_bookmarked ? styles.actionBtnActive : ''}`}
                              onClick={() => handleBookmark(msg.id)}
                            >
                              <Bookmark size={13} />
                              {msg.is_bookmarked ? 'Saved' : 'Save'}
                            </button>
                          </div>

                          <div className={styles.msgActionGroup}>
                            <button
                              type="button"
                              className={`${styles.actionBtn} ${msg.feedback === 'thumbs_up' ? styles.actionBtnActive : ''}`}
                              onClick={() => dispatch(submitFeedback({ messageId: msg.id, feedback: 'thumbs_up' }))}
                              aria-label="Helpful response"
                            >
                              <ThumbsUp size={13} />
                            </button>
                            <button
                              type="button"
                              className={`${styles.actionBtn} ${msg.feedback === 'thumbs_down' ? styles.actionBtnDangerActive : ''}`}
                              onClick={() => dispatch(submitFeedback({ messageId: msg.id, feedback: 'thumbs_down' }))}
                              aria-label="Not helpful"
                            >
                              <ThumbsDown size={13} />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {loading && (
                  <div className={`${styles.message} ${styles.messageAssistant}`}>
                    <div className={styles.typing}>
                      <div className={styles.typingDots}>
                        <span />
                        <span />
                        <span />
                      </div>
                      <span>Retrieving CBIC statutes &amp; verifying citations...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Dynamic Follow-up Chips */}
        {messages.length > 0 && suggestions.length > 0 && !loading && (
          <div className={styles.followupStrip}>
            {suggestions.slice(0, 4).map((s, idx) => (
              <button
                type="button"
                key={idx}
                className={styles.followupChip}
                onClick={() => sendText(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className={styles.inputOuter}>
          <div className={styles.inputContainer}>
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about ITC rules, HSN/SAC rates, return due dates, or uploaded notices..."
              rows={1}
              disabled={loading}
            />
            <Button
              onClick={() => sendText(input)}
              disabled={!input.trim() || loading}
              iconOnly
              aria-label="Send message"
            >
              <Send size={18} strokeWidth={1.75} />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
