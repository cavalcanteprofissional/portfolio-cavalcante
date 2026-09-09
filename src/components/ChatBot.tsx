import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { EASE, DURATION } from '../lib/motion';
import { chatWithBot } from '../lib/api';
import type { ChatMessage } from '../lib/api';
import { QuoteModal } from './QuoteModal';

const PAD = 'https://wa.me/5585996859051';
const STORAGE_KEY = 'portfolio-chat-history';
const HISTORY_MAX = 10;

interface Bubble {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: number;
  error?: boolean;
}

function nanoid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

export function ChatBot() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage === 'en' ? 'en' : i18n.resolvedLanguage === 'es' ? 'es' : 'pt';

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Bubble[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const quoteOpenRef = useRef(false);

  useEffect(() => {
    quoteOpenRef.current = quoteOpen;
  }, [quoteOpen]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(bubbles));
    } catch {
      // storage indisponível — histórico só em memória
    }
  }, [bubbles]);

  const handleClose = useCallback(() => {
    setQuoteOpen(false);
    setOpen(false);
  }, []);

  // Scroll lock + foco inicial (só ao abrir/fechar)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const timer = setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('[data-chat-focus]')?.focus();
    }, 60);
    return () => {
      document.body.style.overflow = prev;
      clearTimeout(timer);
    };
  }, [open]);

  // Escape + focus trap (desabilitado enquanto o QuoteModal está aberto por cima)
  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (quoteOpenRef.current) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, textarea, select, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      prevFocus?.focus?.();
    };
  }, [open, handleClose]);

  // Auto-scroll ao fim
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [bubbles, sending, open]);

  async function send(raw?: string) {
    const text = (raw ?? input).trim();
    if (!text || sending) return;
    setInput('');
    setBubbles((prev) => [...prev, { id: nanoid(), role: 'user', content: text, ts: Date.now() }]);
    setSending(true);

    const history: ChatMessage[] = bubbles
      .filter((b) => !b.error)
      .slice(-HISTORY_MAX)
      .map((b) => ({ role: b.role, content: b.content }));

    try {
      const answer = await chatWithBot(text, lang, history);
      setBubbles((prev) => [...prev, { id: nanoid(), role: 'assistant', content: answer, ts: Date.now() }]);
    } catch {
      setBubbles((prev) => [
        ...prev,
        { id: nanoid(), role: 'assistant', content: t('chat.error'), ts: Date.now(), error: true },
      ]);
    } finally {
      setSending(false);
    }
  }

  const waHref = `${PAD}?text=${encodeURIComponent(t('cta.whatsappMsg'))}`;
  const suggestions = (t('chat.suggestions', { returnObjects: true }) as unknown as string[]) ?? [];
  const time = (ts: number) =>
    new Date(ts).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit' });

  const chipCls =
    'px-3.5 py-2 rounded-full border border-border bg-secondary/50 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all';
  const pillCls =
    'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium border border-border transition-all';

  return (
    <>
      <button
        type="button"
        onClick={() => (open ? handleClose() : setOpen(true))}
        aria-label={open ? t('chat.closeLabel') : t('chat.openLabel')}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-[58] flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl cta-glow hover:bg-primary/90 transition-all"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-7 h-7" />}
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <div className="fixed inset-0 z-[58]" role="dialog" aria-modal="true" aria-labelledby="chat-title">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: DURATION.fast, ease: EASE }}
                  className="absolute inset-0 bg-black/60"
                  onClick={handleClose}
                />

                <motion.div
                  ref={panelRef}
                  initial={{ opacity: 0, y: 32, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 24, scale: 0.98 }}
                  transition={{ duration: DURATION.base, ease: EASE }}
                  className="absolute bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] max-w-[24rem] flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
                  style={{ height: 'min(64vh, 34rem)' }}
                >
                  {/* Cabeçalho */}
                  <div className="flex items-center gap-3 px-4 pt-4 pb-2.5 border-b border-border">
                    <div className="relative shrink-0">
                      <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-bold">
                        LC
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-card" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 id="chat-title" className="text-sm font-semibold truncate">{t('chat.title')}</h3>
                      <p className="text-xs text-emerald-500">{t('chat.status')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClose}
                      aria-label={t('chat.closeLabel')}
                      className="p-1.5 rounded-full hover:bg-secondary transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Mensagens */}
                  <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide">
                    {bubbles.length === 0 && (
                      <div className="space-y-3">
                        <div className="flex justify-start">
                          <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm whitespace-pre-wrap bg-secondary text-foreground">
                            {t('chat.welcome')}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2" role="group" aria-label={t('chat.title')}>
                          {suggestions.map((s) => (
                            <button key={s} type="button" onClick={() => send(s)} className={chipCls}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {bubbles.map((b) => (
                      <div key={b.id} className={`flex ${b.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap shadow-sm ${
                            b.role === 'user'
                              ? 'bg-primary text-primary-foreground rounded-br-sm'
                              : 'bg-secondary text-foreground rounded-bl-sm'
                          } ${b.error ? 'opacity-85' : ''}`}
                        >
                          {b.content}
                          <span className={`block mt-1 text-[10px] ${b.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                            {time(b.ts)}
                          </span>
                        </div>
                      </div>
                    ))}

                    {sending && (
                      <div className="flex justify-start">
                        <div
                          className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-bl-sm bg-secondary text-foreground"
                          aria-label={t('chat.typing')}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Handoff + input */}
                  <div className="px-4 pb-2 flex items-center justify-center gap-2">
                    <a href={waHref} target="_blank" rel="noopener noreferrer" className={`${pillCls} text-foreground hover:border-primary/40`}>
                      <MessageCircle className="w-3.5 h-3.5" />
                      {t('chat.handoffWhatsApp')}
                    </a>
                    <button type="button" onClick={() => setQuoteOpen(true)} className={`${pillCls} bg-primary/10 border-primary/30 text-primary hover:bg-primary/15`}>
                      {t('chat.handoffQuote')}
                    </button>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void send();
                    }}
                    className="flex items-center gap-2 px-4 py-3 border-t border-border"
                  >
                    <input
                      data-chat-focus
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={t('chat.placeholder')}
                      maxLength={2000}
                      aria-label={t('chat.placeholder')}
                      className="flex-1 px-4 py-2.5 rounded-full bg-secondary/50 border border-border focus:outline-none focus:border-primary/50 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={sending || !input.trim()}
                      aria-label={t('chat.sendLabel')}
                      className="shrink-0 w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 transition-all"
                    >
                      {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      <QuoteModal open={quoteOpen} onClose={() => setQuoteOpen(false)} />
    </>
  );
}