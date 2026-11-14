import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { sendQuery, addUserMessage } from '../store/chatSlice';
import { Send, MessageSquare } from 'lucide-react';
import { Button, EmptyState } from '../components/ui';
import ReactMarkdown from 'react-markdown';
import { pageVariants } from '../animations/variants';
import styles from './Chat.module.css';

export default function Chat() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dispatch = useDispatch<AppDispatch>();
  const { messages, loading, currentSessionId } = useSelector((state: RootState) => state.chat);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const query = input.trim();
    setInput('');
    dispatch(addUserMessage(query));
    dispatch(sendQuery({ query, sessionId: currentSessionId || undefined }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const exampleQuestions = [
    "What is Input Tax Credit?",
    "GSTR-3B filing due date?",
    "GST rate for IT services?"
  ];

  return (
    <motion.div
      className={styles.chat}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className={styles.messages}>
        {messages.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="Ask anything about GST"
            description="Get instant answers with citations from official CBIC documents"
            action={
              <div className={styles.examples}>
                {exampleQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(q)}
                    className={styles.exampleChip}
                  >
                    {q}
                  </button>
                ))}
              </div>
            }
          />
        ) : (
          <>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`${styles.message} ${msg.role === 'user' ? styles.messageUser : styles.messageAssistant}`}
              >
                {msg.role === 'user' ? (
                  <p>{msg.content}</p>
                ) : (
                  <div className={styles.markdown}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className={styles.citations}>
                        {msg.sources.map((src: any, idx: number) => (
                          <span key={idx} className={styles.citation}>
                            {src.section || `Page ${src.page}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className={`${styles.message} ${styles.messageAssistant}`}>
                <div className={styles.typing}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className={styles.inputContainer}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about GST rules, ITC claims, return filing..."
          rows={1}
          disabled={loading}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          iconOnly
          aria-label="Send message"
        >
          <Send size={18} strokeWidth={1.5} />
        </Button>
      </div>
    </motion.div>
  );
}
