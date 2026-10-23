"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

// Web Speech is not available in every browser. It may use the browser vendor's service.
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
        results: ArrayLike<ArrayLike<{ transcript: string }>>;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export function VoiceInput({
  disabled,
  onTranscript,
}: {
  disabled: boolean;
  onTranscript: (text: string) => void;
}) {
  const [supported, setSupported] = useState(false);
  const [consent, setConsent] = useState(false);
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState("");
  const [language, setLanguage] = useState("en-IN");
  const recognition = useRef<Recognition | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function stop() {
    const current = recognition.current;
    recognition.current = null;
    current?.abort();
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setListening(false);
  }
  useEffect(() => {
    const w = window as SpeechWindow;
    setSupported(
      Boolean(w.SpeechRecognition || w.webkitSpeechRecognition) &&
        window.isSecureContext,
    );
    return () => {
      const current = recognition.current;
      if (current) {
        current.onresult = null;
        current.onerror = null;
        current.onend = null;
        current.abort();
      }
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    if (disabled) stop();
  }, [disabled]);

  function start() {
    if (!consent || disabled) return;
    const w = window as SpeechWindow;
    const Constructor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Constructor) return;
    setNotice("");
    const session = new Constructor();
    recognition.current = session;
    session.lang = language;
    session.continuous = false;
    session.interimResults = false;
    session.onresult = (event) => {
      if (recognition.current !== session) return;
      const text = Array.from(event.results)
        .map((r) => r[0]?.transcript || "")
        .join(" ")
        .trim();
      if (text) {
        onTranscript(text.slice(0, 4000));
        setNotice("Dictation added to your draft. Check it before sending.");
      }
    };
    session.onerror = (event) =>
      setNotice(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Microphone or speech service access was denied. You can still type your question."
          : "Dictation could not finish. Try again or type your question.",
      );
    session.onend = () => {
      if (recognition.current === session) stop();
    };
    try {
      session.start();
      setListening(true);
      timer.current = setTimeout(() => {
        session.stop();
      }, 45000);
    } catch {
      stop();
      setNotice("Voice input is unavailable. Type your question instead.");
    }
  }

  return (
    <details className="text-xs rounded-xl border border-(--border-subtle) p-3">
      <summary className="cursor-pointer font-medium">
        Voice input (optional)
      </summary>
      <div className="mt-2 space-y-2">
        {!supported ? (
          <p>
            Voice dictation is not supported in this browser. Type your
            question, or use your device keyboard’s dictation.
          </p>
        ) : (
          <>
            <p>
              Your browser may send audio to its speech-recognition service.
              Medi Bud does not store audio. Avoid speaking sensitive
              information unless you accept that service’s processing. Only your
              reviewed text is sent when you press Send.
            </p>
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={consent}
                disabled={listening}
                onChange={(e) => {
                  setConsent(e.target.checked);
                  if (!e.target.checked) stop();
                }}
              />
              I agree to browser speech processing and microphone use.
            </label>
            <label>
              Language{" "}
              <select
                aria-label="Dictation language"
                value={language}
                disabled={listening}
                onChange={(e) => setLanguage(e.target.value)}
                className="border rounded px-2 py-1"
              >
                <option value="en-IN">English (India)</option>
                <option value="hi-IN">Hindi</option>
              </select>
            </label>
            <button
              type="button"
              onClick={listening ? stop : start}
              disabled={disabled || !consent}
              aria-pressed={listening}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 disabled:opacity-50"
            >
              {listening ? <Square size={14} /> : <Mic size={14} />}
              {listening ? "Stop dictation" : "Start dictation"}
            </button>
          </>
        )}
        <p role="status">
          {listening
            ? "Listening… Stops after 45 seconds. Nothing is sent to chat automatically."
            : notice}
        </p>
      </div>
    </details>
  );
}
