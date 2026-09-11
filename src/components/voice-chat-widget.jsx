import React, { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  MessageSquare,
  ChevronDown,
  Maximize2,
  Minimize2,
  Phone,
  PhoneOff,
  Send,
  X,
  Volume2,
  Sparkles,
  ArrowLeft,
  Check,
} from "lucide-react";
import "./voice-chat-widget.css";

const LANGUAGES = [
  { code: "en-US", name: "English", flag: "🇺🇸", voiceLang: "en-US" },
  { code: "en-GB", name: "English (UK)", flag: "🇬🇧", voiceLang: "en-GB" },
  { code: "es-ES", name: "Español", flag: "🇪🇸", voiceLang: "es-ES" },
  { code: "fr-FR", name: "Français", flag: "🇫🇷", voiceLang: "fr-FR" },
  { code: "de-DE", name: "Deutsch", flag: "🇩🇪", voiceLang: "de-DE" },
  { code: "ja-JP", name: "日本語", flag: "🇯🇵", voiceLang: "ja-JP" },
  { code: "zh-CN", name: "中文", flag: "🇨🇳", voiceLang: "zh-CN" },
];

export default function VoiceChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("voice"); // 'voice' | 'chat'
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  
  // Call session state
  const [callState, setCallState] = useState("idle"); // 'idle' | 'connecting' | 'listening' | 'speaking'
  const [callDuration, setCallDuration] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [liveUserSpeech, setLiveUserSpeech] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text: "Hello! I am SallyIP Conversational Agent powered by Fish Audio S2.1 Pro. How can I assist with your patent, trademark, or legal research today?",
      time: "Just now",
    },
  ]);

  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const langMenuRef = useRef(null);
  const messagesEndRef = useRef(null);
  const currentAudioRef = useRef(null);
  const callStateRef = useRef(callState);
  const echoCooldownRef = useRef(0);
  const accumulatedFinalRef = useRef("");
  const silenceTimerRef = useRef(null);

  // Sync callStateRef to avoid stale closures in SpeechRecognition callbacks
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // Close language menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle call timer
  useEffect(() => {
    if (callState === "listening" || callState === "speaking") {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (callState === "idle") setCallDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (activeTab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  const fallbackSpeech = (text) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try { window.speechSynthesis.cancel(); } catch {}
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = selectedLang.voiceLang;
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.onstart = () => setCallState("speaking");
      utterance.onend = () => {
        echoCooldownRef.current = Date.now() + 450;
        setCallState("listening");
      };
      utterance.onerror = () => {
        echoCooldownRef.current = Date.now() + 200;
        setCallState("listening");
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setCallState("speaking");
      setTimeout(() => {
        echoCooldownRef.current = Date.now() + 450;
        setCallState("listening");
      }, 2500);
    }
  };

  // Speak response using Fish Audio S2.1 Pro Free via /api/speech with SpeechSynthesis fallback
  const speakText = async (text) => {
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch {}
      currentAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }

    setCallState("speaking");

    try {
      const res = await fetch("/api/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: text, model: "fish-audio/s2.1-pro-free:free" }),
      });

      if (res.ok) {
        const blob = await res.blob();
        if (blob && blob.size > 200) {
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;

          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            currentAudioRef.current = null;
            echoCooldownRef.current = Date.now() + 450;
            setCallState("listening");
          };

          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            currentAudioRef.current = null;
            fallbackSpeech(text);
          };

          await audio.play();
          return;
        }
      }
    } catch (err) {
      console.warn("Fish Audio TTS failed, falling back to local speech:", err);
    }

    fallbackSpeech(text);
  };

  // Start speech recognition
  const startListening = () => {
    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (SpeechRecognition) {
      try {
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch {}
        }

        const isMobile = typeof navigator !== "undefined" &&
          (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

        const recognition = new SpeechRecognition();
        recognition.continuous = !isMobile;
        recognition.interimResults = true;
        recognition.lang = selectedLang.voiceLang;

        recognition.onstart = () => {
          if (callStateRef.current !== "speaking") {
            setCallState("listening");
          }
        };

        recognition.onresult = (event) => {
          // CRITICAL: Drop any audio picked up from the speaker while Sally is speaking or during echo cooldown
          if (callStateRef.current === "speaking" || Date.now() < echoCooldownRef.current) {
            return;
          }

          let interim = "";
          let newlyFinalized = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const piece = event.results[i][0]?.transcript || "";
            if (event.results[i].isFinal) {
              newlyFinalized += piece + " ";
            } else {
              interim += piece;
            }
          }

          if (newlyFinalized) {
            accumulatedFinalRef.current += newlyFinalized;
          }

          const totalSpoken = (accumulatedFinalRef.current + interim).trim();
          if (totalSpoken) {
            setLiveUserSpeech(totalSpoken);
          }

          // Auto-silence timer: when user pauses for 1350ms, auto-commit and send to Sally
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = setTimeout(() => {
            const toSend = (accumulatedFinalRef.current + interim).trim();
            if (toSend.length > 1 && callStateRef.current !== "speaking") {
              accumulatedFinalRef.current = "";
              setLiveUserSpeech("");
              handleUserUtterance(toSend);
            }
          }, 1350);
        };

        recognition.onerror = (err) => {
          if (err.error !== "no-speech") {
            console.warn("SpeechRecognition error:", err.error);
          }
        };

        recognition.onend = () => {
          const pending = (accumulatedFinalRef.current + (liveUserSpeech || "")).trim();
          if (pending.length > 1 && callStateRef.current !== "speaking") {
            accumulatedFinalRef.current = "";
            setLiveUserSpeech("");
            handleUserUtterance(pending);
            return;
          }

          // If call is still active and assistant not speaking, restart recognition
          if (callStateRef.current !== "idle") {
            setTimeout(() => {
              try {
                if (callStateRef.current !== "idle" && recognitionRef.current && callStateRef.current !== "speaking") {
                  recognition.start();
                }
              } catch {}
            }, 150);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (e) {
        console.warn("SpeechRecognition start issue:", e);
      }
    }
  };

  // Stop speech recognition and synthesis
  const stopListeningAndSpeech = () => {
    echoCooldownRef.current = 0;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    accumulatedFinalRef.current = "";
    setLiveUserSpeech("");
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch {}
      currentAudioRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
  };

  // Immediate interruption / barge-in handler
  const interruptSpeech = () => {
    echoCooldownRef.current = Date.now() + 200;
    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch {}
      currentAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    setLiveUserSpeech("");
    setCallState("listening");
  };

  // Toggle call
  const toggleCall = async () => {
    if (callState === "idle") {
      // Request mic permission on user gesture (crucial for mobile Safari/Chrome)
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        try {
          await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
        } catch (e) {
          console.warn("Microphone permission check issue:", e);
        }
      }
      setCallState("connecting");
      const greeting = `Hello! I'm Sally. What intellectual property matter or patent can I check for you today?`;
      speakText(greeting);
      startListening();
    } else {
      stopListeningAndSpeech();
      setCallState("idle");
    }
  };

  // Generate AI reply and speak it
  const handleUserUtterance = async (text) => {
    const userMsg = {
      id: Date.now().toString(),
      role: "user",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setCallState("speaking");

    let reply = "";
    try {
      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "PUBLIC_RESEARCH",
          messages: [
            ...messages
              .filter((m) => !m.text.includes("trouble reaching the reasoning engine"))
              .slice(-4)
              .map((m) => ({ role: m.role, content: m.text })),
            { role: "user", content: text + " (Please answer concisely in 2 clear sentences for conversational voice response)" },
          ],
        }),
      });

      if (chatRes.ok) {
        const data = await chatRes.json();
        reply = data.choices?.[0]?.message?.content || "";
      } else {
        const errData = await chatRes.json().catch(() => ({}));
        console.warn("Chat API returned error:", chatRes.status, errData);
      }
    } catch (e) {
      console.warn("Chat API fetch issue:", e);
    }

    if (!reply) {
      reply = "I'm having trouble reaching the reasoning engine right now. Please try your request again in a moment.";
    }

    const aiMsg = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      text: reply,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, aiMsg]);
    speakText(reply);
  };

  // Handle text message submit
  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const userText = inputValue.trim();
    setInputValue("");

    // If sent in voice tab, switch to chat tab so user sees their conversation
    if (activeTab === "voice") {
      setActiveTab("chat");
    }

    handleUserUtterance(userText);
  };

  // Format seconds to mm:ss
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };

  return (
    <div className="voice-widget-root">
      <AnimatePresence mode="wait">
        {!isOpen ? (
          /* Image 2: Closed Floating Action Pill Button */
          <motion.button
            key="launcher-pill"
            className="voice-launcher-btn"
            onClick={() => setIsOpen(true)}
            initial={{ opacity: 0, scale: 0.85, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 10 }}
            transition={{ type: "spring", stiffness: 450, damping: 28 }}
            aria-label="Open Voice Chat"
          >
            <div className="voice-mini-orb">
              <div className="voice-mini-orb-gradient" />
              <div className="voice-mini-orb-noise" />
            </div>
            <span className="voice-launcher-text">Voice chat</span>
          </motion.button>
        ) : (
          /* Image 1: Open Floating Agent Card */
          <motion.div
            key="agent-card"
            className={`voice-card ${isExpanded ? "is-expanded" : ""}`}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 20 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
          >
            {/* Card Header */}
            <div className="voice-card-header">
              {/* Left Button: Chat history toggle */}
              <button
                type="button"
                className={`voice-icon-btn ${activeTab === "chat" ? "active" : ""}`}
                onClick={() => setActiveTab(activeTab === "voice" ? "chat" : "voice")}
                title={activeTab === "voice" ? "View Conversation" : "Back to Voice Call"}
                aria-label="Toggle Conversation View"
              >
                {activeTab === "chat" ? (
                  <ArrowLeft size={18} />
                ) : (
                  <MessageSquare size={18} />
                )}
              </button>

              {/* Center: Language Selector Pill */}
              <div ref={langMenuRef} style={{ position: "relative" }}>
                <button
                  type="button"
                  className="voice-lang-pill"
                  onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                  aria-expanded={isLangMenuOpen}
                >
                  <span className="voice-flag-emoji">{selectedLang.flag}</span>
                  <span>{selectedLang.name}</span>
                  <ChevronDown
                    size={14}
                    className={`voice-lang-chevron ${isLangMenuOpen ? "open" : ""}`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isLangMenuOpen && (
                  <div className="voice-lang-dropdown">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        type="button"
                        className={`voice-lang-item ${selectedLang.code === lang.code ? "selected" : ""}`}
                        onClick={() => {
                          setSelectedLang(lang);
                          setIsLangMenuOpen(false);
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "16px" }}>{lang.flag}</span>
                          <span>{lang.name}</span>
                        </span>
                        {selectedLang.code === lang.code && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Button: Minimize / Expand / Close */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  type="button"
                  className="voice-icon-btn"
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? "Collapse view" : "Expand view"}
                  aria-label="Toggle Size"
                >
                  {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button
                  type="button"
                  className="voice-icon-btn"
                  onClick={() => {
                    stopListeningAndSpeech();
                    setCallState("idle");
                    setIsOpen(false);
                  }}
                  title="Close widget"
                  aria-label="Close"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Card Body */}
            {activeTab === "voice" ? (
              <div className="voice-card-body">
                {/* ElevenLabs Themed Big Orb */}
                <div className="voice-orb-stage">
                  {/* Outer Glow */}
                  <div
                    className={`voice-orb-glow ${callState !== "idle" ? "active" : ""}`}
                  />

                  {/* Wave expansion rings when active */}
                  {callState !== "idle" && (
                    <>
                      <div className="voice-wave-ring" />
                      <div className="voice-wave-ring delay-1" />
                      <div className="voice-wave-ring delay-2" />
                    </>
                  )}

                  {/* Main Orb Sphere */}
                  <div className="voice-orb-container">
                    <div
                      className={`voice-orb-gradient ${callState === "speaking" ? "speaking" : ""}`}
                    />
                    <div className="voice-orb-noise" />

                    {/* Center White Circular Phone Handset Button */}
                    <button
                      type="button"
                      className={`voice-call-center-btn ${callState !== "idle" ? "is-active" : ""}`}
                      onClick={toggleCall}
                      title={callState === "idle" ? "Start Voice Call" : "End Call"}
                      aria-label="Toggle Voice Call"
                    >
                      {callState === "idle" ? (
                        <Phone size={22} fill="#111827" strokeWidth={0} />
                      ) : (
                        <PhoneOff size={22} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Call Status Badge */}
                {callState !== "idle" ? (
                  <div style={{ textAlign: "center", marginTop: "16px" }}>
                    <div className={`voice-status-badge ${callState}`}>
                      <span className={`voice-status-dot ${callState}`} />
                      <span>
                        {callState === "connecting"
                          ? "Connecting..."
                          : callState === "speaking"
                          ? "Sally AI speaking..."
                          : "Listening to your mic..."}{" "}
                        · {formatTime(callDuration)}
                      </span>
                    </div>

                    <div className={`voice-live-audio-bars ${callState === "listening" ? "listening-bars" : ""}`}>
                      <span className="voice-live-bar" />
                      <span className="voice-live-bar" />
                      <span className="voice-live-bar" />
                      <span className="voice-live-bar" />
                      <span className="voice-live-bar" />
                    </div>

                    {/* Real-time visual feedback: shows user what the mic is hearing */}
                    {callState === "listening" && liveUserSpeech && (
                      <div className="voice-live-transcript-bubble">
                        <span className="voice-live-mic-icon">🎙️</span>
                        <em>"{liveUserSpeech}"</em>
                      </div>
                    )}

                    {/* Interruption UI: shows user they can interrupt Sally anytime */}
                    {callState === "speaking" && (
                      <div style={{ marginTop: "6px" }}>
                        <button
                          type="button"
                          className="voice-interrupt-pill-btn"
                          onClick={interruptSpeech}
                          title="Click or speak to interrupt Sally"
                        >
                          ✋ Tap or speak to interrupt
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Subtitle text matching user's voice model */
                  <p className="voice-subtitle">
                    Discover the capabilities of Conversational Agents powered by
                    Fish Audio S2.1 Pro
                  </p>
                )}
              </div>
            ) : (
              /* Chat Transcript View */
              <div className="voice-chat-transcript-view">
                <div className="voice-messages-scroll">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`voice-msg-bubble ${msg.role === "user" ? "user" : "assistant"}`}
                    >
                      <div className={`voice-msg-author ${msg.role === "assistant" ? "assistant" : ""}`}>
                        {msg.role === "assistant" ? "Sally Voice Agent" : "You"} · {msg.time || "Just now"}
                        {msg.interrupted && <span className="voice-msg-interrupted-tag">Interrupted</span>}
                      </div>
                      <div>{msg.text}</div>
                      {msg.role === "assistant" && (
                        <button
                          type="button"
                          onClick={() => speakText(msg.text)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            marginTop: "6px",
                            border: "none",
                            background: "transparent",
                            fontSize: "11px",
                            color: "#0284c7",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          <Volume2 size={12} /> Play audio
                        </button>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}

            {/* Card Footer: Message Input Pill */}
            <div className="voice-card-footer">
              <form onSubmit={handleSendMessage} className="voice-input-pill">
                <input
                  type="text"
                  className="voice-input-field"
                  placeholder="Or send a message..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  aria-label="Send a message"
                />
                <button
                  type="submit"
                  className={`voice-send-btn ${inputValue.trim() ? "active" : ""}`}
                  disabled={!inputValue.trim()}
                  title="Send message"
                  aria-label="Send"
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ transform: "rotate(45deg) translate(-1px, 1px)" }}
                  >
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
