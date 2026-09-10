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
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text: "Hello! I am SallyIP Conversational Agent powered by ElevenLabs. How can I assist with your patent, trademark, or legal research today?",
      time: "Just now",
    },
  ]);

  const timerRef = useRef(null);
  const recognitionRef = useRef(null);
  const langMenuRef = useRef(null);
  const messagesEndRef = useRef(null);

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

  // Speak response using SpeechSynthesis
  const speakText = (text) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = selectedLang.voiceLang;
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setCallState("speaking");
      };

      utterance.onend = () => {
        setCallState("listening");
      };

      utterance.onerror = () => {
        setCallState("listening");
      };

      window.speechSynthesis.speak(utterance);
    } else {
      // Fallback
      setCallState("speaking");
      setTimeout(() => setCallState("listening"), 3000);
    }
  };

  // Start speech recognition
  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = selectedLang.voiceLang;

        recognition.onstart = () => {
          setCallState("listening");
        };

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            handleUserUtterance(transcript);
          }
        };

        recognition.onerror = () => {
          // If error or silence, keep in listening or simulate
          setCallState("listening");
        };

        recognition.onend = () => {
          // If call is still active and not speaking, restart listening after a pause
          if (callState === "listening") {
            setTimeout(() => {
              try {
                recognition.start();
              } catch {
                // already active
              }
            }, 800);
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
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Toggle call
  const toggleCall = () => {
    if (callState === "idle") {
      setCallState("connecting");
      setTimeout(() => {
        const greeting = `Welcome! I'm connected. What can I check in SallyIP for you today?`;
        setCallState("speaking");
        speakText(greeting);
        startListening();
      }, 900);
    } else {
      stopListeningAndSpeech();
      setCallState("idle");
    }
  };

  // Generate simulated AI reply
  const handleUserUtterance = (text) => {
    const userMsg = {
      id: Date.now().toString(),
      role: "user",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setCallState("speaking");

    // Dynamic response generation based on IP and legal queries
    let reply = "I've processed that with SallyIP's legal intelligence models. What matter or patent jurisdiction would you like to explore next?";
    const lower = text.toLowerCase();
    if (lower.includes("patent") || lower.includes("claim") || lower.includes("novelty")) {
      reply = "Our patent claims analyzer can evaluate prior art, claim charts, and novelty across USPTO and EPO filings. Would you like me to start a novelty check?";
    } else if (lower.includes("trademark") || lower.includes("brand") || lower.includes("class")) {
      reply = "For trademark clearance, I can run similarity matrices across EUIPO and USPTO registers. Which mark or classification are you reviewing?";
    } else if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
      reply = "Hello! SallyIP conversational agent is ready. Ask me about patent analysis, trademark clearance, or workflow automation.";
    }

    setTimeout(() => {
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: reply,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
      speakText(reply);
    }, 600);
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
                    <div className="voice-status-badge">
                      <span className="voice-status-dot" />
                      <span>
                        {callState === "connecting"
                          ? "Connecting..."
                          : callState === "speaking"
                          ? "Sally AI speaking..."
                          : "Listening..."}{" "}
                        · {formatTime(callDuration)}
                      </span>
                    </div>

                    <div className="voice-live-audio-bars">
                      <span className="voice-live-bar" />
                      <span className="voice-live-bar" />
                      <span className="voice-live-bar" />
                      <span className="voice-live-bar" />
                      <span className="voice-live-bar" />
                    </div>
                  </div>
                ) : (
                  /* Subtitle text matching user's exact screenshot */
                  <p className="voice-subtitle">
                    Discover the capabilities of Conversational Agents powered by
                    ElevenLabs
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
                        {msg.role === "assistant" ? "Sally Voice Agent" : "You"} · {msg.time}
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
