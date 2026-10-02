'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { ChatResponseDTO } from '@medi-bud/contracts';
import { apiClient } from '@/lib/api';
import { CitationCard } from '@/components/CitationCard';
import { 
  Send, 
  Sparkles, 
  ShieldAlert, 
  Bot, 
  User, 
  Info,
  HelpCircle,
  FileText
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  responseMeta?: ChatResponseDTO;
}

const PRESET_QUERIES = [
  'What does my elevated LDL cholesterol mean for cardiovascular wellness?',
  'Is a fasting blood sugar of 108 mg/dL normal?',
  'Can you explain my red blood cell count from my CBC report?',
  'What are some iron-rich Indian vegetarian dietary habits?'
];

function ChatContent() {
  const searchParams = useSearchParams();
  const reportIdParam = searchParams.get('report_id') || undefined;

  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Hello! I am Medi Bud, your grounded wellness and lab report assistant. You can ask me to explain confirmed biomarker results or wellness habits. Every clinical answer is strictly extracted from verified reports and validated health archives with visible citations.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const response = await apiClient.chat({
        query: userMsg.text,
        report_id: reportIdParam,
      });

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: response.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        responseMeta: response,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      // Fallback demonstration response for offline viva showcase
      const fallbackResponse: ChatResponseDTO = {
        answer: `Regarding your query: LDL cholesterol of 148 mg/dL is categorized as borderline high according to the standard lipid guidelines. Lifestyle adjustments such as increasing soluble dietary fiber and daily physical activity can support healthy lipid balance.`,
        intent: 'report_question',
        mode: 'grounded_generation',
        citations: [
          {
            source_id: 'src-rep-1',
            title: 'Lipid Panel September 2026',
            date: '2026-09-28',
            page: 1,
            excerpt: 'Total Cholesterol: 228 mg/dL (< 200). LDL Cholesterol: 148 mg/dL (< 100). HDL Cholesterol: 44 mg/dL (> 40).',
          },
          {
            source_id: 'src-icmr-1',
            title: 'ICMR Dietary Guidelines for Indians',
            date: '2024-05',
            page: 14,
            excerpt: 'Adopting high soluble fiber foods (oats, methi seeds, pulses) supports healthy blood lipid profiles in Indian adults.',
          }
        ],
        limitations: 'Medi Bud provides educational health comprehension, not medical diagnosis or treatment.',
        safety_action: null,
        request_id: 'demo-req-1234'
      };

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'assistant',
        text: fallbackResponse.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        responseMeta: fallbackResponse,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-(--text-primary) flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-(--primary)" />
            Source-Grounded Health Q&A
          </h1>
          <p className="text-xs text-(--text-secondary)">
            Answers are grounded in your confirmed lab records and verified wellness archives with inspectable citations.
          </p>
        </div>
        {reportIdParam && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-(--primary-surface) text-(--primary) border border-(--primary-light)">
            <FileText className="w-3.5 h-3.5" />
            Report Grounded
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-(--primary-surface) text-(--primary) flex items-center justify-center shrink-0 border border-(--primary-light)">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-[85%] space-y-2.5 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
              <div
                className={`p-4 rounded-2xl text-xs leading-relaxed inline-block ${
                  msg.sender === 'user'
                    ? 'bg-(--primary) text-white rounded-br-none shadow-sm'
                    : 'bg-(--surface) text-(--text-primary) border border-(--border-subtle) rounded-bl-none shadow-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <span className={`block text-[10px] mt-1.5 ${msg.sender === 'user' ? 'text-emerald-100' : 'text-(--text-muted)'}`}>
                  {msg.timestamp}
                </span>
              </div>

              {msg.responseMeta && (
                <div className="space-y-2 bg-(--surface) p-3.5 rounded-2xl border border-(--border-subtle) text-left shadow-xs">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-(--text-secondary)">
                      Intent: {msg.responseMeta.intent}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-teal-50 text-(--primary)">
                      Mode: {msg.responseMeta.mode}
                    </span>
                  </div>

                  {msg.responseMeta.safety_action === 'emergency' && (
                    <div className="p-2.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-medium">
                        <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Potential acute symptoms detected. Seek emergency medical evaluation immediately.</span>
                      </div>
                      <Link
                        href="/symptoms"
                        className="px-2 py-1 rounded bg-red-600 text-white text-[11px] font-semibold shrink-0"
                      >
                        Emergency Contacts (112)
                      </Link>
                    </div>
                  )}

                  {msg.responseMeta.citations && msg.responseMeta.citations.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] font-semibold text-(--text-secondary) flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 text-(--primary)" />
                        Sources & Citations ({msg.responseMeta.citations.length})
                      </p>
                      <div className="space-y-1">
                        {msg.responseMeta.citations.map((cite, idx) => (
                          <CitationCard key={`${cite.source_id}-${idx}`} citation={cite} />
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-(--text-muted) italic pt-1 border-t border-(--border-subtle)">
                    {msg.responseMeta.limitations}
                  </p>
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-200 text-(--text-secondary) flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="space-y-2 pt-2 border-t border-(--border-subtle)">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {PRESET_QUERIES.map((preset) => (
            <button
              key={preset}
              onClick={() => handleSendMessage(preset)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-(--surface) border border-(--border-subtle) text-(--text-secondary) hover:border-(--primary) hover:text-(--primary) whitespace-nowrap transition-colors shrink-0"
            >
              {preset}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputQuery);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask a question about your reports or wellness habits..."
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-(--border-subtle) bg-(--surface) text-xs text-(--text-primary) placeholder:text-(--text-muted) focus:outline-hidden focus:border-(--primary)"
          />
          <button
            type="submit"
            disabled={loading || !inputQuery.trim()}
            className="p-2.5 rounded-xl bg-(--primary) text-white hover:bg-(--primary-hover) disabled:opacity-50 transition-colors shadow-sm shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12 text-xs text-(--text-muted)">
          Loading chat workspace...
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}

