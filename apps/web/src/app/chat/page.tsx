"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { ChatResponseDTO, ChatImageDTO } from "@medi-bud/contracts";
import { apiClient } from "@/lib/api";
import { CitationCard } from "@/components/CitationCard";
import { ChatImageResult } from "@/components/ChatImageResult";
import { VoiceInput } from "@/components/VoiceInput";
import {
  Send,
  Sparkles,
  ShieldAlert,
  Bot,
  User,
  Info,
  HelpCircle,
  FileText,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  responseMeta?: ChatResponseDTO;
  imageResult?: ChatImageDTO;
}

const PRESET_QUERIES = [
  "Show my confirmed hemoglobin result",
  "How can I prepare questions for my clinician?",
  "Can you explain my red blood cell count from my CBC report?",
  "What are some iron-rich Indian vegetarian dietary habits?",
];

function ChatContent() {
  const searchParams = useSearchParams();
  const reportIdParam = searchParams.get("report_id") || undefined;

  const [inputQuery, setInputQuery] = useState("");
  const [allowAI, setAllowAI] = useState(false);
  const [allowFallback, setAllowFallback] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [imageConsent, setImageConsent] = useState(false);
  const [imageKind, setImageKind] = useState<"auto" | "report" | "meal">(
    "auto",
  );
  const [attachmentError, setAttachmentError] = useState("");
  const imageInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!image) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);
  const [contextMode, setContextMode] = useState<
    "auto" | "account" | "general"
  >("auto");
  const [providerNote, setProviderNote] = useState(
    "Checking AI configuration…",
  );
  useEffect(() => {
    apiClient
      .getChatCapabilities()
      .then((capabilities) => {
        setProviderNote(
          capabilities.gemini_configured || capabilities.groq_configured
            ? `Text AI configured: ${capabilities.primary}. Provider availability is checked when you send.`
            : "General AI is not configured. Add GEMINI_API_KEY or GROQ_API_KEY on the server. Saved app facts still work without a key.",
        );
      })
      .catch(() =>
        setProviderNote(
          "Sign in and connect to the API to check AI availability.",
        ),
      );
  }, []);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      sender: "assistant",
      text: "Hi, I’m Medi Bud. Ask about your saved profile, confirmed reports, habits, reminders, meals or plan. For general medical education, enable external AI below; it requires a configured provider key. I’ll say when information is missing. This is not diagnosis or treatment.",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;
    if (image && !imageConsent) {
      setAttachmentError(
        "Please agree to image processing before sending, or remove the image.",
      );
      return;
    }
    setAttachmentError("");

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: "user",
      text:
        textToSend.trim() + (image ? `\nAttached image: ${image.name}` : ""),
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setLoading(true);

    try {
      if (image) {
        const result = await apiClient.chatImage(
          image,
          image.name,
          textToSend.trim(),
          {
            consentAI: imageConsent,
            allowFallback: allowAI && allowFallback,
            kind: imageKind,
          },
        );
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            sender: "assistant",
            text: result.answer,
            imageResult: result,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          },
        ]);
        return;
      }
      const response = await apiClient.chat({
        query: userMsg.text,
        report_id: reportIdParam,
        allow_ai: allowAI,
        allow_fallback: allowFallback,
        context_mode: contextMode,
      });

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: "assistant",
        text: response.answer,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        responseMeta: response,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      if (image) setInputQuery(textToSend.trim());
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          sender: "assistant",
          text:
            image && error instanceof Error
              ? error.message
              : "The health service is unavailable, so I cannot verify an answer. No medical interpretation was generated. Please reconnect and try again.",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[650px] max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-(--text-primary) flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-(--primary)" />A place for your
            health questions.
          </h1>
          <p className="text-xs text-(--text-secondary)">
            Ask with text, a report image or a meal photo. Clear limits,
            reviewed context.
          </p>
        </div>
        {reportIdParam && contextMode !== "general" && !image && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-(--primary-surface) text-(--primary) border border-(--primary-light)">
            <FileText className="w-3.5 h-3.5" />
            Report Grounded
          </span>
        )}
      </div>

      <div
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className="min-h-[280px] max-h-[60dvh] overflow-y-auto space-y-4 pr-1"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender === "assistant" && (
              <div className="w-8 h-8 rounded-full bg-(--primary-surface) text-(--primary) flex items-center justify-center shrink-0 border border-(--primary-light)">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] space-y-2.5 ${msg.sender === "user" ? "text-right" : "text-left"}`}
            >
              <div
                className={`p-4 rounded-2xl text-xs leading-relaxed inline-block ${
                  msg.sender === "user"
                    ? "bg-(--primary) text-white rounded-br-none shadow-sm"
                    : "bg-(--surface) text-(--text-primary) border border-(--border-subtle) rounded-bl-none shadow-sm"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                <span
                  className={`block text-[10px] mt-1.5 ${msg.sender === "user" ? "text-emerald-100" : "text-(--text-muted)"}`}
                >
                  {msg.timestamp}
                </span>
              </div>

              {msg.responseMeta && (
                <div className="space-y-2 bg-(--surface) p-3.5 rounded-2xl border border-(--border-subtle) text-left shadow-xs">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-(--text-secondary)">
                      {msg.responseMeta.provider
                        ? `AI: ${msg.responseMeta.provider}`
                        : "Local app/reference response"}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-teal-50 text-(--primary)">
                      {msg.responseMeta.mode === "rules"
                        ? "Safety guidance"
                        : msg.responseMeta.context_scope === "general"
                          ? "General education"
                          : "Your saved app context"}
                    </span>
                  </div>

                  {msg.responseMeta.safety_action ===
                    "EMERGENCY_ESCALATION" && (
                    <div className="p-2.5 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-medium">
                        <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                        <span>
                          Potential acute symptoms detected. Seek emergency
                          medical evaluation immediately.
                        </span>
                      </div>
                      <Link
                        href="/symptoms"
                        className="px-2 py-1 rounded bg-red-600 text-white text-[11px] font-semibold shrink-0"
                      >
                        Emergency Contacts (112)
                      </Link>
                    </div>
                  )}

                  {msg.responseMeta.citations &&
                    msg.responseMeta.citations.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-[11px] font-semibold text-(--text-secondary) flex items-center gap-1">
                          <Info className="w-3.5 h-3.5 text-(--primary)" />
                          Sources & Citations (
                          {msg.responseMeta.citations.length})
                        </p>
                        <div className="space-y-1">
                          {msg.responseMeta.citations.map((cite, idx) => (
                            <CitationCard
                              key={`${cite.source_id}-${idx}`}
                              citation={cite}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                  <p className="text-[10px] text-(--text-muted) italic pt-1 border-t border-(--border-subtle)">
                    {msg.responseMeta.limitations}
                  </p>
                </div>
              )}
              {msg.imageResult && <ChatImageResult result={msg.imageResult} />}
            </div>

            {msg.sender === "user" && (
              <div className="w-8 h-8 rounded-full bg-slate-200 text-(--text-secondary) flex items-center justify-center shrink-0">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="space-y-2 pt-2 border-t border-(--border-subtle)">
        <details
          className="rounded-xl border border-(--border-subtle) p-3 text-xs"
          open={image ? true : undefined}
        >
          <summary className="font-medium cursor-pointer">
            Attach a report or meal image
          </summary>
          <div className="space-y-2 mt-2">
            <p>
              JPEG or PNG, up to 10 MB and 16 megapixels. For PDF reports,{" "}
              <Link href="/reports" className="underline">
                use Reports
              </Link>
              . Remove names or identifiers you do not want shared. Your file is
              not sent until you press Send.
            </p>
            <input
              ref={imageInput}
              aria-label="Attach image"
              type="file"
              accept="image/jpeg,image/png"
              disabled={loading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                setImageConsent(false);
                if (!file) return;
                if (
                  !["image/jpeg", "image/png"].includes(file.type) ||
                  file.size > 10 * 1024 * 1024
                ) {
                  setAttachmentError("Choose a JPEG or PNG under 10 MB.");
                  setImage(null);
                  event.target.value = "";
                  return;
                }
                setAttachmentError("");
                setImage(file);
              }}
            />
            {image && (
              <>
                <div className="flex gap-3 items-center">
                  {preview && (
                    <img
                      src={preview}
                      alt="Selected attachment preview — not yet sent"
                      className="w-16 h-16 rounded-lg object-contain border"
                    />
                  )}
                  <span className="break-all">{image.name}</span>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setImage(null);
                      setImageConsent(false);
                      setAttachmentError("");
                      if (imageInput.current) imageInput.current.value = "";
                    }}
                    className="underline shrink-0"
                  >
                    Remove image
                  </button>
                </div>
                <label>
                  Image content{" "}
                  <select
                    aria-label="Image content"
                    value={imageKind}
                    onChange={(e) =>
                      setImageKind(e.target.value as typeof imageKind)
                    }
                    className="border rounded px-2 py-1"
                  >
                    <option value="auto">Auto-detect</option>
                    <option value="report">Report</option>
                    <option value="meal">Meal / dish</option>
                  </select>
                </label>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={imageConsent}
                    disabled={loading}
                    onChange={(e) => setImageConsent(e.target.checked)}
                  />
                  I agree to send this image and question to the configured
                  Gemini/Groq provider. A private draft may be held for one
                  hour, then removed. Nothing enters saved context until I
                  choose Save. No other account records are sent with this image
                  request.
                </label>
                <p>
                  The image stays attached for follow-up questions until you
                  remove it. Each Send reanalyzes it and counts toward AI
                  limits. Optional provider fallback uses the separate consent
                  below.
                </p>
              </>
            )}
            {attachmentError && (
              <p role="alert" className="text-red-700">
                {attachmentError}
              </p>
            )}
          </div>
        </details>
        <VoiceInput
          disabled={loading}
          onTranscript={(text) =>
            setInputQuery((current) =>
              (current ? current + " " + text : text).slice(0, 4000),
            )
          }
        />
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

        <section className="rounded-xl border border-(--border-subtle) p-3 space-y-2 text-xs">
          <label className="block">
            Question context
            <select
              aria-label="Question context"
              disabled={Boolean(image)}
              className="ml-2 border rounded-lg px-2"
              value={contextMode}
              onChange={(e) =>
                setContextMode(e.target.value as typeof contextMode)
              }
            >
              <option value="auto">Auto-detect</option>
              <option value="account">My saved app data</option>
              <option value="general">General medical education</option>
            </select>
          </label>
          <p role="status">{providerNote}</p>
          <label className="flex gap-2 items-start">
            <input
              type="checkbox"
              checked={allowAI}
              onChange={(e) => setAllowAI(e.target.checked)}
            />
            Allow external AI: send my question and, for account questions,
            relevant saved health records to the configured Gemini or Groq
            provider. AI can be wrong; this is not diagnosis or treatment.
          </label>
          <label className="flex gap-2 items-start">
            <input
              type="checkbox"
              disabled={!allowAI}
              checked={allowFallback}
              onChange={(e) => setAllowFallback(e.target.checked)}
            />
            Also allow the configured fallback provider (Gemini/Groq) if the
            primary is unavailable or rate-limited. No fallback for a safety
            refusal.
          </label>
        </section>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputQuery);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            aria-label="Your health question"
            maxLength={4000}
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder={
              image
                ? "Ask a question about this image…"
                : "Ask about your reports or wellness habits…"
            }
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-(--border-subtle) bg-(--surface) text-xs text-(--text-primary) placeholder:text-(--text-muted) focus:outline-hidden focus:border-(--primary)"
          />
          <button
            type="submit"
            aria-label="Send message"
            disabled={
              loading || !inputQuery.trim() || Boolean(image && !imageConsent)
            }
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
