'use client'

import { useEffect, useState } from 'react'
import { Sparkles, X, Send, Loader2, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const CHAT_CACHE_KEY = 'endless_ai_chat_';
const CHAT_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedChat {
  messages: Message[];
  timestamp: number;
}

const sanitizeAIResponse = (text: string) =>
  text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*/g, '')
    .replace(/\s+\n/g, '\n')
    .trim()

export default function AskAIButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { company, user } = useAuth()
  const companyContextId = company?.id ?? null
  const canAccessAI = ['owner', 'admin', 'accountant'].includes((user?.role || '').toLowerCase())
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [attemptedFallback, setAttemptedFallback] = useState(false)

  // Load chat from cache when company ID is available
  useEffect(() => {
    if (companyId) {
      loadChatFromCache(companyId);
    }
  }, [companyId]);

  // Save chat to cache whenever messages change
  useEffect(() => {
    if (companyId && messages.length > 0) {
      saveChatToCache(companyId, messages);
    }
  }, [messages, companyId]);

  useEffect(() => {
    if (companyContextId) {
      setCompanyId(companyContextId)
      return
    }

    if (companyId || attemptedFallback) return

    const fetchFallbackCompany = async () => {
      try {
        const companies = await api.get('/companies/')
        if (companies.data && companies.data.length > 0) {
          setCompanyId(companies.data[0].id)
        }
      } catch (err) {
        console.error('Unable to resolve company for AI assistant:', err)
      } finally {
        setAttemptedFallback(true)
      }
    }

    fetchFallbackCompany()
  }, [companyContextId, companyId, attemptedFallback])

  const loadChatFromCache = (companyId: string) => {
    try {
      const cacheKey = `${CHAT_CACHE_KEY}${companyId}`;
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return;

      const parsed: CachedChat = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is expired
      if (now - parsed.timestamp > CHAT_CACHE_DURATION) {
        localStorage.removeItem(cacheKey);
        return;
      }

      // Restore messages with Date objects
      const restoredMessages = parsed.messages.map(msg => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      setMessages(restoredMessages);
    } catch (error) {
      console.error('Failed to load chat from cache:', error);
    }
  };

  const saveChatToCache = (companyId: string, messages: Message[]) => {
    try {
      const cacheKey = `${CHAT_CACHE_KEY}${companyId}`;
      const cached: CachedChat = {
        messages,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(cached));
    } catch (error) {
      console.error('Failed to save chat to cache:', error);
    }
  };

  const clearChat = () => {
    if (!companyId) return;
    const cacheKey = `${CHAT_CACHE_KEY}${companyId}`;
    localStorage.removeItem(cacheKey);
    setMessages([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    if (!companyId) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Connect a company to unlock AI insights. Complete onboarding so I know which books to analyze!',
          timestamp: new Date()
        }
      ])
      return
    }

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await api.post('/ai/query', {
        company_id: companyId,
        question: input.trim()
      })
      const aiMessage: Message = {
        role: 'assistant',
        content: sanitizeAIResponse(response.answer || 'I apologize, but I couldn\'t process that request.'),
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])
    } catch (error: any) {
      console.error('AI chat error:', error)
      const detail = error?.response?.data?.detail
      const readableDetail = typeof detail === 'string' ? detail : detail ? JSON.stringify(detail) : null
      const errorMessage: Message = {
        role: 'assistant',
        content: sanitizeAIResponse(
          readableDetail
            ? `Sorry, I encountered an error: ${readableDetail}`
            : 'Sorry, I encountered an error. Please try again.'
        ),
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const quickQuestions = [
    "What's my financial health this month?",
    "Show me top expenses",
    "Explain this transaction",
    "Predict next month's expenses"
  ]

  if (!canAccessAI) {
    return null
  }

  return (
    <>
      <motion.button
        layoutId="ask-ai-pill"
        onClick={() => setIsOpen(true)}
        className="group fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full px-5 py-2.5 text-white"
        style={{
          background: '#09090b',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(12px)',
        }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: 'var(--accent)' }}>
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </span>
        <span className="text-sm font-semibold text-white">Ask Fintra AI</span>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>⌘K</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden"
            style={{
              width: 400,
              height: 580,
              background: '#0d0d12',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 20,
              boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: 'var(--accent)' }}>
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">Fintra AI</h3>
                    {messages.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>
                        saved
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Finance analyst · your real data</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {messages.length > 0 && (
                  <motion.button
                    onClick={clearChat}
                    className="flex h-8 w-8 items-center justify-center rounded-xl transition"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
                    whileHover={{ scale: 1.05 }}
                    title="Clear chat history"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </motion.button>
                )}
                <motion.button
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl transition"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
                  whileHover={{ rotate: 90 }}
                  aria-label="Close AI console"
                >
                  <X className="h-3.5 w-3.5" />
                </motion.button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 custom-scrollbar">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {companyId
                      ? "Synced with your ledgers. Ask anything."
                      : 'Loading company data...'}
                  </p>
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>Try asking</p>
                    <div className="grid gap-1.5">
                      {quickQuestions.map((question, idx) => (
                        <button
                          key={idx}
                          onClick={() => setInput(question)}
                          className="rounded-xl px-3.5 py-2.5 text-left text-sm transition"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.65)' }}
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((message, idx) => (
                <motion.div
                  key={`${message.role}-${idx}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
                    style={
                      message.role === 'user'
                        ? { background: 'var(--accent)', color: '#fff' }
                        : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)' }
                    }
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className="mt-1.5 text-[10px]" style={{ color: message.role === 'user' ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.35)' }}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-3 text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
                    <Loader2 className="mr-2 inline-block h-3.5 w-3.5 animate-spin align-middle" />
                    Analyzing...
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSubmit} className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex gap-2 items-center rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your finances..."
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  style={{ color: 'rgba(255,255,255,0.85)' }}
                  disabled={isLoading || !companyId}
                />
                <motion.button
                  type="submit"
                  disabled={isLoading || !input.trim() || !companyId}
                  className="flex h-8 w-8 items-center justify-center rounded-lg disabled:opacity-30"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Send className="h-3.5 w-3.5" />
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
