import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sanitizeModelResponse } from "../lib/document-tool-service.js";
import { authFetch, clearAuthSession, getStoredAuth } from "../lib/client-auth.js";
const IpToolsPanel=lazy(()=>import("./ip-tools-panel"));

const ClaimChartWorkspace=lazy(()=>import("./claim-chart-workspace"));
const TrademarkClearanceWorkspace=lazy(()=>import("./trademark-clearance-workspace"));
const PatentFamilyWorkspace=lazy(()=>import("./patent-family-workspace"));
const ProsecutionHistoryWorkspace=lazy(()=>import("./prosecution-history-workspace"));
const IpKnowledgeGraphWorkspace=lazy(()=>import("./ip-knowledge-graph-workspace"));
const PriorArtWorkspace=lazy(()=>import("./prior-art-workspace"));
const InventiveStepWorkspace=lazy(()=>import("./inventive-step-workspace"));
const FtoWorkspace=lazy(()=>import("./fto-workspace"));
const TrademarkIntelligenceWorkspace=lazy(()=>import("./trademark-intelligence-workspace"));
const NoveltyWorkspace=lazy(()=>import("./novelty-workspace"));
const LitigationEvidenceWorkspace=lazy(()=>import("./litigation-evidence-workspace"));
const VerificationDeskWorkspace=lazy(()=>import("./verification-desk-workspace"));
const PlaybookWorkspace=lazy(()=>import("./playbook-workspace"));
const ContractWorkspace=lazy(()=>import("./contract-workspace"));
const PatentDraftingWorkspace=lazy(()=>import("./patent-drafting-workspace"));
const OfficeActionWorkspace=lazy(()=>import("./oa-workspace"));
const ClaimQaWorkspace=lazy(()=>import("./claim-qa-workspace"));
const DocPanel=lazy(()=>import("./doc-panel"));
const VerificationInspectorModal=lazy(()=>import("./verification-inspector-modal"));
const VoiceOverlay=lazy(()=>import("./voice/VoiceOverlay.jsx"));
const SallyVideoCallCard=lazy(()=>import("./voice/SallyVideoCallCard.jsx"));
const SallyDocumentsModal=lazy(()=>import("./SallyDocumentsModal.jsx"));
import {
  identifyDocument,
  isDraftedDocument,
} from "../lib/document-intake-coordinator.js";
import "./voice-chat-widget.css";
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronsUpDown,
  Clock3,
  Copy,
  Check,
  Download,
  FileText,
  FileWarning,
  FolderKanban,
  Home,
  Layers3,
  LogOut,
  Menu,
  MessageSquare,
  Mic,
  MicOff,
  Minus,
  Paperclip,
  Pencil,
  PhoneCall,
  Video,
  Plus,
  Search,
  Send,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  Trash2,
  Telescope,
  Volume2,
  VolumeX,
  X,
  RotateCw,
} from "lucide-react";

const STORAGE_KEY = "sallyip-chat-history-v1";
const suggestions = [
  "Run an FTO analysis for India",
  "Assess patentability of this invention",
  "Check whether NOVARA is clear for SaaS in the EU",
  "Build the evidence chronology",
];
const thinkingStages = [
  { state: "connecting", label: "Connecting to matter vault…" },
  { state: "searching", label: "Searching retrieved passages…" },
  { state: "weaving", label: "Checking quotes and citations…" },
  { state: "solving", label: "Resolving conflicts…" },
  { state: "composing", label: "Drafting answer with sources…" },
  { state: "shaping", label: "Final check before answering…" },
];
const detectFileRequest = (text) => {
  const match = text.match(/\b(pdf|docx?|word document|pptx?|powerpoint|xlsx?|excel|csv|markdown|md|html|json|txt|text file)\b/i);
  const requestsDownload = /\b(create|generate|make|export|prepare|download|convert|provide|give|draft|write|turn .+ into)\b/i.test(text);
  const implied = /\b(downloadable version|turn (this|that|it) into (a )?document)\b/i.test(text);
  if (!match && !implied) return null;
  if (!requestsDownload && text.trim().split(/\s+/).length > 6) return null;
  const value = match?.[1]?.toLowerCase() || (/document/i.test(text) ? "docx" : "pdf");
  const format = value === "doc" || value === "word document" ? "docx" : value === "ppt" || value === "powerpoint" ? "pptx" : value === "xls" || value === "excel" ? "xlsx" : value === "markdown" ? "md" : value === "text file" ? "txt" : value;
  return { format, title: titleFor(text).replace(/\.(pdf|docx?|pptx?|xlsx?|csv|md|html|json|txt)$/i, "") };
};
const isBareFileRequest = (text) =>
  text.trim().split(/\s+/).length <= 6 &&
  /\b(pdf|docx?|word|pptx?|xlsx?|excel|csv|markdown|md|html|json|txt|downloadable)\b/i.test(text);
const detectDocumentRequest = (text) =>
  /\b(draft|write|prepare|create|generate)\b[\s\S]*\b(agreement|contract|memorandum|memo|opinion|letter|report|notice|policy|brief|claim chart|checklist|document|nda|patent application|specification|claims|assignment|licence|license|declaration|petition)\b/i.test(text);
const detectRevisionRequest = (text) =>
  /\b(revise|change|replace|rename|amend|edit|update|remove|add|rewrite)\b/i.test(text);
const referencesPreviousArtifact = (text) =>
  /\b(this|that|it|previous|above|same|last)\b/i.test(text);
const latestArtifact = (messages) =>
  [...messages].reverse().find((message) => message.artifact)?.artifact || null;
const makeArtifact = ({ title, content, previous }) => ({
  id: previous?.id || crypto.randomUUID(),
  type: "legal_document",
  title: title || previous?.title || "SallyIP document",
  content,
  version: (previous?.version || 0) + 1,
  updated_at: new Date().toISOString(),
});
const persistArtifact = async ({ artifact, conversationId, conversation_id, revision }) => {
  const convId = conversationId || conversation_id;
  try {
    const response = await authFetch("/api/artifacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: revision ? "revise" : "create",
        artifact_id: artifact.id,
        conversation_id: convId,
        title: artifact.title,
        document_type: artifact.document_type || "legal_document",
        content: artifact.content,
        metadata: artifact.metadata || {
          practice_area: "Intellectual Property",
          status: "draft",
          requires_review: true,
        },
      }),
    });
    if (!response.ok) return artifact;
    const data = await response.json().catch(() => ({}));
    return data.artifact || artifact;
  } catch (err) {
    console.warn("Could not persist artifact to server:", err);
    return artifact;
  }
};
const makeChat = () => ({
  id: crypto.randomUUID(),
  title: "New conversation",
  messages: [],
  documentSession: null,
  createdAt: Date.now(),
});
const titleFor = (text) =>
  text.trim().replace(/\s+/g, " ").slice(0, 42) +
  (text.trim().length > 42 ? "…" : "");


function Mark({ className = "" }) {
  return (
    <span className={`brandMark ${className}`}>
      <img src="/sallyip-logo.png" alt="SallyIP" />
    </span>
  );
}

export default function ChatPage({ onHome, onAuthRequired, user: initialUser }) {
  const threadRef = useRef(null);
  const threadEndRef = useRef(null);
  const uploadInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const [chats, setChats] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return saved.length ? saved : [makeChat()];
    } catch {
      return [makeChat()];
    }
  });
  const [activeId, setActiveId] = useState(() => chats[0].id);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [thinkingStage, setThinkingStage] = useState(0);
  const [thinkingProgress, setThinkingProgress] = useState(0);
  const [thinkingPhase, setThinkingPhase] = useState("Analyzing query…");
  const [streamingAnswer, setStreamingAnswer] = useState("");
  const [isWriting, setIsWriting] = useState(false);
  const [user, setUser] = useState(() => {
    if (initialUser && initialUser.email) return initialUser;
    const stored = getStoredAuth();
    if (stored?.user?.email) return stored.user;
    return null;
  });

  useEffect(() => {
    if (initialUser && initialUser.email) {
      setUser(initialUser);
    } else {
      const stored = getStoredAuth();
      if (stored?.user?.email) {
        setUser(stored.user);
      } else {
        setUser(null);
        if (onAuthRequired) onAuthRequired();
      }
    }
  }, [initialUser, onAuthRequired]);
  const [selectedEngine, setSelectedEngine] = useState("auto");
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [editingMessage, setEditingMessage] = useState(null);
  const [matters, setMatters] = useState([]);
  const [activeMatterId, setActiveMatterId] = useState("");
  const [deepResearch, setDeepResearch] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [uploadedSource, setUploadedSource] = useState(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [viewingPassage, setViewingPassage] = useState(null);
  const [docPanel, setDocPanel] = useState(null);
  const [verificationMessage, setVerificationMessage] = useState(null);
  const [libraryFiles, setLibraryFiles] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("sallyip-docx-library") || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("chats"); // 'chats' | 'library'
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Sally Permanent Voice & Audio State
  const [playingAudioIndex, setPlayingAudioIndex] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [dictatedLiveText, setDictatedLiveText] = useState("");
  const [voiceOverlayOpen, setVoiceOverlayOpen] = useState(false);
  const [videoCallOpen, setVideoCallOpen] = useState(false);
  const [autoSpeakVoice, setAutoSpeakVoice] = useState(() => {
    try {
      return localStorage.getItem("sallyip-auto-speak") === "true";
    } catch {
      return false;
    }
  });
  const currentAudioRef = useRef(null);
  const dictationRecognitionRef = useRef(null);
  const isDictatingRef = useRef(false);
  const dictationMediaStreamRef = useRef(null);
  const dictationRecorderRef = useRef(null);
  const dictationChunksRef = useRef([]);
  const dictationBaseInputRef = useRef("");
  const accumulatedFinalRef = useRef("");
  const inputRef = useRef(input);
  const isSendingRef = useRef(false);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  useEffect(() => {
    try {
      localStorage.setItem("sallyip-auto-speak", autoSpeakVoice ? "true" : "false");
    } catch {}
  }, [autoSpeakVoice]);

  useEffect(() => {
    return () => {
      if (currentAudioRef.current) {
        try {
          currentAudioRef.current.pause();
        } catch {}
        currentAudioRef.current = null;
      }
      isDictatingRef.current = false;
      if (dictationRecognitionRef.current) {
        try {
          dictationRecognitionRef.current.stop();
        } catch {}
        dictationRecognitionRef.current = null;
      }
      if (dictationRecorderRef.current && dictationRecorderRef.current.state !== "inactive") {
        try {
          dictationRecorderRef.current.stop();
        } catch {}
        dictationRecorderRef.current = null;
      }
      if (dictationMediaStreamRef.current) {
        try {
          dictationMediaStreamRef.current.getTracks().forEach((t) => t.stop());
        } catch {}
        dictationMediaStreamRef.current = null;
      }
    };
  }, []);

  const cleanMarkdownForVoice = (text) => {
    if (!text) return "";
    return text
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/#+\s*(.*)/g, "$1. ")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^\s*[-*+]\s+/gm, "")
      .replace(/^\s*\d+\.\s+/gm, "")
      .replace(/\[Doc:\s*[^\]]+\]/gi, "")
      .replace(/\[\d+\]/g, "")
      .replace(/<[^>]*>/g, "")
      .replace(/\n\s*\n/g, ". ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const togglePlayVoice = async (text, msgIndex) => {
    if (playingAudioIndex === msgIndex && isPlayingAudio) {
      if (currentAudioRef.current) {
        try {
          currentAudioRef.current.pause();
          currentAudioRef.current.currentTime = 0;
        } catch {}
        currentAudioRef.current = null;
      }
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlayingAudio(false);
      setPlayingAudioIndex(null);
      return;
    }

    if (currentAudioRef.current) {
      try {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      } catch {}
      currentAudioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const clean = cleanMarkdownForVoice(text);
    if (!clean) return;

    setPlayingAudioIndex(msgIndex);
    setIsPlayingAudio(true);

    try {
      const speechInput = clean.length > 500 ? clean.slice(0, 500) + "..." : clean;
      const chosenVoice = (typeof window !== 'undefined' ? localStorage.getItem('sally_selected_voice') : null) || 'en-US-AriaNeural';
      let res = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: speechInput,
          input: speechInput,
          voice: chosenVoice,
          mode: "PUBLIC_RESEARCH",
        }),
      });

      if (!res.ok) {
        res = await fetch("/api/speech", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: speechInput,
            voice: chosenVoice,
            model: "fish-audio/s2.1-pro-free:free",
          }),
        });
      }

      if (res.ok) {
        const blob = await res.blob();
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          setIsPlayingAudio(false);
          setPlayingAudioIndex(null);
        };

        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            const utterance = new SpeechSynthesisUtterance(speechInput);
            utterance.onend = () => {
              setIsPlayingAudio(false);
              setPlayingAudioIndex(null);
            };
            window.speechSynthesis.speak(utterance);
          } else {
            setIsPlayingAudio(false);
            setPlayingAudioIndex(null);
          }
        };

        await audio.play();
        return;
      }
    } catch (err) {
      console.warn("[ChatPage] Fish Audio playback issue:", err);
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(clean.slice(0, 300));
      utterance.onend = () => {
        setIsPlayingAudio(false);
        setPlayingAudioIndex(null);
      };
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio(false);
      setPlayingAudioIndex(null);
    }
  };

  const stopDictation = () => {
    isDictatingRef.current = false;
    setIsDictating(false);
    setDictatedLiveText("");
    if (dictationRecognitionRef.current) {
      try {
        dictationRecognitionRef.current.stop();
      } catch {}
      dictationRecognitionRef.current = null;
    }
    if (dictationRecorderRef.current && dictationRecorderRef.current.state !== "inactive") {
      try {
        dictationRecorderRef.current.stop();
      } catch {}
      dictationRecorderRef.current = null;
    }
    if (dictationMediaStreamRef.current) {
      try {
        dictationMediaStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch {}
      dictationMediaStreamRef.current = null;
    }
  };

  const startMediaRecorderFallback = async (autoSendOnDone = false) => {
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        alert("Microphone is not supported in this browser.");
        stopDictation();
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      dictationMediaStreamRef.current = stream;
      dictationChunksRef.current = [];
      setIsDictating(true);
      isDictatingRef.current = true;
      setDictatedLiveText("Recording speech... Speak clearly");

      const mimeType = typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          dictationChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        if (dictationChunksRef.current.length > 0) {
          setDictatedLiveText("Transcribing speech with AI...");
          const blob = new Blob(dictationChunksRef.current, { type: recorder.mimeType || "audio/webm" });
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Audio = (reader.result || "").split(",")[1];
            if (base64Audio) {
              try {
                const res = await fetch("/api/voice/transcribe", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ audio_base64: base64Audio, mode: "PUBLIC_RESEARCH" }),
                });
                if (res.ok) {
                  const data = await res.json();
                  if (data.text) {
                    const fullInput = (dictationBaseInputRef.current + data.text).trim();
                    setInput(fullInput);
                    setDictatedLiveText(data.text);
                    if (autoSendOnDone) {
                      setTimeout(() => send(fullInput, { autoSpeak: true }), 100);
                    }
                  }
                }
              } catch (err) {
                console.warn("[Dictation] Transcribe error:", err);
              }
            }
            stopDictation();
          };
          reader.readAsDataURL(blob);
        } else {
          stopDictation();
        }
      };

      recorder.start();
      dictationRecorderRef.current = recorder;
    } catch (micErr) {
      alert("Microphone access was denied. Please allow microphone permissions in your browser settings.");
      stopDictation();
    }
  };

  const toggleDictation = () => {
    if (isDictatingRef.current) {
      stopDictation();
      return;
    }

    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    dictationBaseInputRef.current = input ? input.trim() + " " : "";
    accumulatedFinalRef.current = "";
    setDictatedLiveText("");

    // Try native Web Speech API first (works natively in Chrome, Safari iOS, Edge)
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        const isMobile = typeof navigator !== "undefined" &&
          (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || navigator.maxTouchPoints > 1);

        try {
          recognition.continuous = !isMobile;
        } catch {
          recognition.continuous = false;
        }
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsDictating(true);
          isDictatingRef.current = true;
        };

        recognition.onresult = (event) => {
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
            const fullInput = (dictationBaseInputRef.current + totalSpoken).trim();
            setInput(fullInput);
            setDictatedLiveText(totalSpoken);
          }
        };

        recognition.onerror = (err) => {
          console.warn("[Dictation] SpeechRecognition error:", err.error);
          if (err.error === "not-allowed" || err.error === "service-not-allowed") {
            alert("Microphone permission was denied. Please enable microphone permissions in your browser settings to use dictation.");
            stopDictation();
          } else if (err.error === "network") {
            try { recognition.stop(); } catch {}
            dictationRecognitionRef.current = null;
            startMediaRecorderFallback();
          }
        };

        recognition.onend = () => {
          if (isDictatingRef.current) {
            setTimeout(() => {
              try {
                if (isDictatingRef.current && dictationRecognitionRef.current) {
                  dictationRecognitionRef.current.start();
                }
              } catch {
                stopDictation();
              }
            }, 100);
          } else {
            stopDictation();
          }
        };

        dictationRecognitionRef.current = recognition;
        // CRITICAL: Call recognition.start() synchronously within user click event!
        recognition.start();
        setIsDictating(true);
        isDictatingRef.current = true;
        return;
      } catch (err) {
        console.warn("[Dictation] SpeechRecognition init failed, falling back to MediaRecorder:", err);
      }
    }

    // Fallback for browsers without SpeechRecognition (e.g. Chrome on iOS or Firefox)
    startMediaRecorderFallback();
  };

  const syncLibraryFiles = async () => {
    try {
      setLibraryLoading(true);
      const res = await fetch("/api/generated-files");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.files)) {
          setLibraryFiles((prev) => {
            const map = new Map();
            for (const f of data.files) {
              if (f.format === "docx" || f.name?.endsWith(".docx") || f.filename?.endsWith(".docx")) {
                map.set(f.id || f.name, { ...f, format: "docx" });
              }
            }
            for (const f of prev) {
              if (f.format === "docx" || f.name?.endsWith(".docx") || f.filename?.endsWith(".docx")) {
                const existing = map.get(f.id || f.name);
                map.set(f.id || f.name, { ...f, ...existing, content: f.content || existing?.content });
              }
            }
            const merged = Array.from(map.values()).sort(
              (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
            );
            try {
              localStorage.setItem("sallyip-docx-library", JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      }
    } catch (e) {
      console.warn("Failed to sync library files:", e);
    } finally {
      setLibraryLoading(false);
    }
  };

  useEffect(() => {
    syncLibraryFiles();
  }, []);

  const addLibraryFile = (file) => {
    if (!file) return;
    const isDocx = file.format === "docx" || file.name?.endsWith(".docx") || file.filename?.endsWith(".docx");
    if (!isDocx) return;
    const cleanFile = {
      id: file.id || crypto.randomUUID(),
      name: file.name || file.filename || "document.docx",
      filename: file.filename || file.name || "document.docx",
      format: "docx",
      size: file.size || file.size_bytes || 0,
      size_bytes: file.size_bytes || file.size || 0,
      artifact_id: file.artifact_id || null,
      artifact_version: file.artifact_version || 1,
      conversation_id: file.conversation_id || activeId,
      created_at: file.created_at || new Date().toISOString(),
      content: file.content || "",
      url: file.url || (file.id ? `/api/generated-files?id=${file.id}` : null),
    };
    setLibraryFiles((prev) => {
      const filtered = prev.filter((f) => f.id !== cleanFile.id && f.name !== cleanFile.name);
      const updated = [cleanFile, ...filtered];
      try {
        localStorage.setItem("sallyip-docx-library", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const deleteLibraryFile = async (fileId, e) => {
    e?.stopPropagation();
    if (!window.confirm("Remove this Word document from your library?")) return;
    setLibraryFiles((prev) => {
      const updated = prev.filter((f) => f.id !== fileId);
      try {
        localStorage.setItem("sallyip-docx-library", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    try {
      await fetch(`/api/generated-files?id=${encodeURIComponent(fileId)}`, { method: "DELETE" });
    } catch {}
  };

  const downloadLibraryFile = (file, e) => {
    e?.stopPropagation();
    if (!file) return;
    const a = document.createElement("a");
    a.href = file.url || `/api/generated-files?id=${file.id}`;
    a.download = file.name || file.filename || "document.docx";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const openLibraryDocInPanel = (file, e) => {
    e?.stopPropagation();
    if (!file) return;
    let content = file.content || "";
    if (!content && file.conversation_id) {
      const targetChat = chats.find((c) => c.id === file.conversation_id);
      if (targetChat) {
        const matchingMsg = [...targetChat.messages].reverse().find((m) => m.artifact || m.attachments?.some((a) => a.id === file.id));
        if (matchingMsg?.artifact?.content) {
          content = matchingMsg.artifact.content;
        } else if (matchingMsg?.content) {
          content = matchingMsg.content;
        }
      }
    }
    if (!content) {
      content = `# ${file.name || "Word Document"}\n\n*Word document (.docx) ready for download.*`;
    }
    setDocPanel({
      title: file.name || "Word Document",
      content,
      version: file.artifact_version || 1,
      live: false,
      artifact: file.artifact_id ? { id: file.artifact_id, title: file.name, content } : null,
      conversationId: file.conversation_id || activeId,
    });
    if (file.conversation_id && file.conversation_id !== activeId) {
      openChat(file.conversation_id);
    }
  };
  const openPassage = async (passageId, label) => {
    setViewingPassage({ loading: true, label });
    try {
      const response = await fetch(`/api/sources?passage_id=${encodeURIComponent(passageId)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error?.message || "Passage unavailable");
      setViewingPassage({ loading: false, label, data });
    } catch (error) {
      setViewingPassage({ loading: false, label, error: error.message });
    }
  };
  const active = useMemo(
    () => chats.find((chat) => chat.id === activeId) || chats[0],
    [chats, activeId],
  );
  useEffect(() => {
    if (active?.matter_id) setActiveMatterId(active.matter_id);
  }, [activeId, active?.matter_id]);
  useEffect(
    () => localStorage.setItem(STORAGE_KEY, JSON.stringify(chats)),
    [chats],
  );
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth")
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && data?.user) {
          setUser(data.user);
          try {
            localStorage.setItem("sallyip-user", JSON.stringify(data.user));
          } catch {}
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    authFetch("/api/matters")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => {
        setMatters(data.matters || []);
        if (!activeMatterId && data.matters?.length) setActiveMatterId(data.matters[0].id);
      })
      .catch(() => {});
  }, []);
  const createMatter = async () => {
    const name = prompt("Matter name");
    if (!name?.trim()) return;
    const response = await authFetch("/api/matters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", name: name.trim() }) });
    const data = await response.json();
    if (!response.ok) return alert(data?.error?.message || "Matter could not be created");
    setMatters((items) => [data.matter, ...items]);
    setActiveMatterId(data.matter.id);
  };
  const ingestDocument = async (file) => {
    if (!file) return;
    if (!activeMatterId) return alert("Create or select a matter before adding documents.");
    if (file.size > 12 * 1024 * 1024) return alert("Documents must be 12 MB or smaller.");
    if (!confirm("Confirm you are authorised to use this document in the selected matter.")) return;
    setIngesting(true);setUploadedSource(null);
    try {
      const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader();reader.onload = () => resolve(reader.result);reader.onerror = reject;reader.readAsDataURL(file); });
      const response = await authFetch("/api/ingest-document", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matter_id: activeMatterId, filename: file.name, data: String(dataUrl).split(",")[1], rights_confirmed: true, authority_tier: 5, source_type: "uploaded_document" }) });
      const result = await response.json();if (!response.ok) throw new Error(result?.error?.message || "Document ingestion failed");
      setUploadedSource(result.source);
    } catch (error) { alert(error.message); }
    finally { setIngesting(false);if (uploadInputRef.current) uploadInputRef.current.value = ""; }
  };
  useEffect(() => {
    if (!loading) {
      setThinkingStage(0);
      return;
    }
    const timer = setInterval(
      () =>
        setThinkingStage((stage) =>
          Math.min(stage + 1, thinkingStages.length - 1),
        ),
      2200,
    );
    return () => clearInterval(timer);
  }, [loading]);
  useEffect(() => {
    let cancelled = false;
    authFetch("/api/conversations")
      .then((response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((remote) => {
        if (cancelled || !remote) return;
        const loaded = remote.map((chat) => ({
          ...chat,
          messages: chat.messages.map((message) => ({
            role: message.role,
            content: message.content,
            attachments: Array.isArray(message.attachments) ? message.attachments : [],
            artifact: message.artifact || null,
            provenance: message.provenance || {},
          })),
        }));
        if (loaded.length) {
          setChats(loaded);
          setActiveId(loaded[0].id);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const logout = async () => {
    if (!window.confirm("Log out of SallyIP? Your 7-day session will be ended.")) return;
    try {
      await authFetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      });
    } catch {}
    clearAuthSession();
    localStorage.removeItem(STORAGE_KEY);
    if (onAuthRequired) onAuthRequired();
  };
  const persistChat = async (chat) => {
    try {
      const response = await authFetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: chat.id,
          title: chat.title,
          messages: chat.messages,
        }),
      });
      return response;
    } catch {
      return null;
    }
  };
  const updateActive = (updater) =>
    setChats((all) =>
      all.map((chat) => (chat.id === activeId ? updater(chat) : chat)),
    );
  const recordToolResult = async (content, details) => {
    const message={role:"assistant",content,provenance:{route:{task_class:details.task_class,specialists:details.specialists,research_mode:"tool"},verification:{source_basis:details.source_basis,sources_retrieved:0,status:"calculated"},sources:[]}};
    const changed={...active,messages:[...(active.messages||[]),message]};updateActive(()=>changed);await persistChat(changed).catch(()=>{});
  };
  const newChat = async () => {
    setMobileSidebarOpen(false);
    if (active?.messages.length === 0) {
      setInput("");
      return;
    }
    const chat = makeChat();
    setChats((all) => [chat, ...all]);
    setActiveId(chat.id);
    setInput("");
    await persistChat(chat).catch(() => {});
  };
  const beginRename = (chat) => {
    setRenamingId(chat.id);
    setRenameValue(chat.title);
  };
  const saveRename = async (id) => {
    const title = renameValue.trim().slice(0, 80) || "New conversation";
    const chat = chats.find((item) => item.id === id);
    if (!chat) return;
    const renamed = { ...chat, title };
    setChats((all) => all.map((item) => (item.id === id ? renamed : item)));
    setRenamingId(null);
    await persistChat(renamed).catch(() => {});
  };
  const deleteChat = async (id) => {
    if (loading || !confirm("Delete this conversation permanently?")) return;
    const remaining = chats.filter((chat) => chat.id !== id);
    const fallback = remaining[0] || makeChat();
    setChats(remaining.length ? remaining : [fallback]);
    if (activeId === id) setActiveId(fallback.id);
    await authFetch(`/api/conversations?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch(() => {});
    if (!remaining.length) await persistChat(fallback).catch(() => {});
  };
  const saveMessageEdit = async () => {
    if (!editingMessage) return;
    const content = editingMessage.value.trim();
    if (!content) return;
    const changed = {
      ...active,
      messages: active.messages.map((message, index) =>
        index === editingMessage.index ? { ...message, content } : message,
      ),
    };
    updateActive(() => changed);
    setEditingMessage(null);
    await persistChat(changed).catch(() => {});
  };
  const openChat = (id) => {
    if (loading) return;
    setActiveId(id);
    setInput("");
    setMobileSidebarOpen(false);
  };
  const streamResponseLineByLine = async (fullText) => {
    setIsWriting(true);
    const lines = fullText.split("\n");
    let currentOutput = "";
    for (let i = 0; i < lines.length; i++) {
      currentOutput += (i > 0 ? "\n" : "") + lines[i];
      setStreamingAnswer(currentOutput);
      if (isDraftedDocument(currentOutput)) {
        const docTitle = titleFor(currentOutput);
        setDocPanel((p) => ({
          title: p?.title || docTitle,
          content: currentOutput,
          version: p?.version || 1,
          live: true,
          artifact: p?.artifact || null,
          conversationId: p?.conversationId || null,
        }));
        setStreamingAnswer(`Drafting **${docTitle}** into the workspace panel on the right...`);
      } else {
        setStreamingAnswer(currentOutput);
        setDocPanel((p) => (p?.live ? { ...p, content: currentOutput } : p));
      }
      if (threadRef.current) {
        threadRef.current.scrollTop = threadRef.current.scrollHeight;
      }
      const delay = Math.max(90, Math.min(240, lines[i].length * 3.5));
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  };

  const transitionToComplete = async () => {
    // 1. Enter 99% the moment the answer is received
    setThinkingProgress(99);
    setThinkingPhase("Evidence checked • Drafting answer…");
    await new Promise((resolve) => setTimeout(resolve, 600));

    // 2. Advance to 100% and hold for 2-3 seconds as requested
    setThinkingProgress(100);
    setThinkingPhase("Draft ready • Delivering with sources…");
    await new Promise((resolve) => setTimeout(resolve, 2400));
  };

  const send = async (text = input, options = {}) => {
    const { autoSpeak = false } = options;
    const clean = text.trim();
    if (!clean || loading || isSendingRef.current) return;
    isSendingRef.current = true;
    const next = [
        ...(active?.messages || []),
        { role: "user", content: clean },
      ],
      baseChat = {
        ...active,
        title: active.messages.length ? active.title : titleFor(clean),
        messages: next,
      };
    updateActive(() => baseChat);
    setInput("");
    setLoading(true);
    setThinkingProgress(0);
    setThinkingPhase("Parsing legal intent & parameters…");
    setIsWriting(false);
    setStreamingAnswer("");

    let currentProg = 0;
    const progressTimer = setInterval(() => {
      if (currentProg < 30) {
        currentProg += Math.floor(Math.random() * 4 + 3);
      } else if (currentProg < 65) {
        currentProg += Math.floor(Math.random() * 3 + 2);
      } else if (currentProg < 88) {
        currentProg += Math.floor(Math.random() * 2 + 1);
      } else if (currentProg < 92) {
        currentProg = Math.min(currentProg + (Math.random() > 0.6 ? 1 : 0), 92);
      }
      setThinkingProgress(currentProg);
      if (currentProg < 25) setThinkingPhase("Parsing request & jurisdiction…");
      else if (currentProg < 50) setThinkingPhase("Comparing features to retrieved passages…");
      else if (currentProg < 75) setThinkingPhase("Checking quotes and citations…");
      else setThinkingPhase("Drafting for practitioner review…");
    }, 240);

    try {
      await persistChat(baseChat);

      if (activeMatterId) {
        const workflowResponse = await authFetch("/api/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            matter_id: activeMatterId,
            conversation_id: baseChat.id,
            instruction: clean,
            matter_jurisdictions:
              matters.find((matter) => matter.id === activeMatterId)
                ?.jurisdictions || [],
          }),
        });
        if (workflowResponse.ok) {
          const workflow = await workflowResponse.json();
          clearInterval(progressTimer);
          await transitionToComplete();
          const completed = workflow.steps
            .filter((step) => step.status === "completed")
            .map((step) => `- ✓ ${step.key.replaceAll("_", " ")}`)
            .join("\n");
          const pending = [
            ...workflow.steps
              .filter((step) => ["skipped", "needs_review"].includes(step.status))
              .map((step) => `- ⚠ ${step.key.replaceAll("_", " ")}`),
            ...(workflow.warnings || []).map((warning) => `- ⚠ ${warning}`),
          ].join("\n");
          const fullContent = `${workflow.content}\n\n## Workflow execution\n\n**Completed**\n${completed || "- Workflow prepared"}\n\n${pending ? `**Needs review / incomplete**\n${pending}` : "**Status:** Completed"}`;
          await streamResponseLineByLine(fullContent);
          const finalChat = {
            ...baseChat,
            messages: [
              ...next,
              {
                role: "assistant",
                content: fullContent,
                artifact: workflow.artifact_id
                  ? {
                      id: workflow.artifact_id,
                      title: workflow.title,
                      version: 1,
                      content: workflow.content,
                    }
                  : null,
                provenance: {
                  route: {
                    task_class: workflow.plan.workflow_type.toUpperCase(),
                    specialists: workflow.steps.map((step) => step.service),
                    research_mode: "automated_workflow",
                  },
                  verification: {
                    source_basis: "matter_sources",
                    sources_retrieved: 0,
                    status: workflow.status,
                  },
                  sources: [],
                },
              },
            ],
          };
          setIsWriting(false);
          setStreamingAnswer("");
          setThinkingProgress(0);
          setLoading(false);
          updateActive(() => finalChat);
          await persistChat(finalChat);
          if (autoSpeak || autoSpeakVoice) {
            const lastMsg = finalChat.messages[finalChat.messages.length - 1];
            if (lastMsg?.role === "assistant" && lastMsg.content) {
              setTimeout(() => togglePlayVoice(lastMsg.content, finalChat.messages.length - 1), 200);
            }
          }
          return;
        }
        if (workflowResponse.status !== 422) {
          const workflowError = await workflowResponse.json().catch(() => null);
          throw new Error(
            workflowError?.error?.message || "Automated workflow could not finish",
          );
        }
      }
      let documentDecision = null;
      try {
        const decisionResponse = await authFetch('/api/document-tools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: clean, conversation_id: baseChat.id }),
        });
        if (decisionResponse.ok) documentDecision = await decisionResponse.json();
      } catch {}
      const fileRequest = documentDecision?.intent?.format
        ? { format: documentDecision.intent.format, title: titleFor(clean) }
        : detectFileRequest(clean);
      const previousArtifact = documentDecision?.artifact || latestArtifact(active?.messages || []);
      const revisionRequest = Boolean(
        previousArtifact && detectRevisionRequest(clean),
      );
      const exportPrevious = Boolean(documentDecision?.tool_call || (
        fileRequest && previousArtifact &&
        (referencesPreviousArtifact(clean) || isBareFileRequest(clean)) && !revisionRequest
      ));
      const identifiedDoc = identifyDocument(clean, active?.messages || []);
      const documentRequest = Boolean(fileRequest || detectDocumentRequest(clean) || identifiedDoc);
      if (documentRequest || revisionRequest) {
        setDocPanel({
          title: identifiedDoc?.name || fileRequest?.title || previousArtifact?.title || titleFor(clean),
          content: revisionRequest && previousArtifact?.content ? previousArtifact.content : "",
          version: revisionRequest && previousArtifact ? (previousArtifact.version || 0) + 1 : 1,
          live: true,
          artifact: revisionRequest ? previousArtifact : null,
          conversationId: baseChat.id,
        });
      } else {
        setDocPanel(null);
      }

      if (exportPrevious) {
        const generated = await authFetch("/api/generate-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(documentDecision?.tool_call?.arguments || fileRequest),
            title: previousArtifact.title,
            artifact_id: previousArtifact.id,
            artifact_version: previousArtifact.version,
            conversation_id: baseChat.id,
          }),
        });
        const generatedData = await generated.json();
        if (!generated.ok)
          throw new Error(generatedData?.message || generatedData?.error || "The file generator could not finish");
        clearInterval(progressTimer);
        await transitionToComplete();
        const exportMsg = `Your ${fileRequest.format.toUpperCase()} has been created.`;
        await streamResponseLineByLine(exportMsg);
        const finalChat = {
          ...baseChat,
          messages: [
            ...next,
            {
              role: "assistant",
              content: `Your ${fileRequest.format.toUpperCase()} has been created.`,
              artifact: previousArtifact,
              attachments: generatedData.file ? [generatedData.file] : [],
            },
          ],
        };
        if (generatedData.file) {
          addLibraryFile({
            ...generatedData.file,
            content: previousArtifact?.content || "",
            conversation_id: baseChat.id,
          });
        }
        if (previousArtifact?.content) {
          setDocPanel({ title: previousArtifact.title, content: previousArtifact.content, version: previousArtifact.version, live: false, artifact: previousArtifact, conversationId: baseChat.id });
        }
        updateActive(() => finalChat);
        await persistChat(finalChat);
        if (autoSpeak || autoSpeakVoice) {
          const lastMsg = finalChat.messages[finalChat.messages.length - 1];
          if (lastMsg?.role === "assistant" && lastMsg.content) {
            setTimeout(() => togglePlayVoice(lastMsg.content, finalChat.messages.length - 1), 200);
          }
        }
        return;
      }

      let requestMessages = next;
      if (revisionRequest) {
        requestMessages = [
          ...next.slice(0, -1),
          {
            role: "user",
            content: `DOCUMENT REVISION REQUEST\n\nExisting artifact: ${previousArtifact.title}, version ${previousArtifact.version}\n\n${previousArtifact.content}\n\nRequested revision: ${clean}\n\nReturn only the complete revised document content.`,
          },
        ];
      } else if (documentRequest) {
        requestMessages = [
          ...next.slice(0, -1),
          {
            role: "user",
            content: `DOCUMENT CONTENT REQUEST\n\nCreate the requested ${fileRequest?.format?.toUpperCase() || "legal document"} artifact.\nUser request: ${clean}\n\nReturn only the polished document content. Do not mention file-generation limitations, copying, or conversion instructions.`,
          },
        ];
      }
      let answer = "";
      let data = {};

      // True token streaming: render server deltas live (thread + doc panel).
      // Falls back to buffered /api/chat below on any failure.
      let sseAnswer = null;
      try {
        const streamRes = await authFetch("/api/chat-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: requestMessages,
            conversation_id: baseChat.id,
            matter_id: activeMatterId || null,
            deep_research: deepResearch,
            engine: selectedEngine !== "auto" ? selectedEngine : null,
          }),
        });
        if (streamRes.status === 401) {
          clearAuthSession();
          if (onAuthRequired) onAuthRequired();
          return;
        }
        const sseType = streamRes.headers.get("content-type") || "";
        if (streamRes.ok && sseType.includes("text/event-stream") && streamRes.body) {
          const reader = streamRes.body.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          let acc = "";
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const parts = buf.split("\n\n");
            buf = parts.pop() || "";
            for (const part of parts) {
              const line = part.trim();
              if (!line.startsWith("data:")) continue;
              let evt = null;
              try { evt = JSON.parse(line.slice(5)); } catch { continue; }
              if (evt.type === "delta" && evt.delta) {
                acc += evt.delta;
                setIsWriting(true);
                if (isDraftedDocument(acc)) {
                  const docTitle = identifiedDoc?.name || fileRequest?.title || previousArtifact?.title || titleFor(clean);
                  setStreamingAnswer(`Drafting **${docTitle}** into the workspace panel on the right...`);
                  setDocPanel((p) => ({
                    title: p?.title || docTitle,
                    content: acc,
                    version: p?.version || 1,
                    live: true,
                    artifact: p?.artifact || null,
                    conversationId: baseChat.id,
                  }));
                } else {
                  setStreamingAnswer(acc);
                  setDocPanel((p) => (p?.live ? { ...p, content: acc } : p));
                }
                if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
              } else if (evt.type === "meta") {
                if (evt.answer) {
                  acc = evt.answer;
                  setStreamingAnswer(acc);
                }
                data = { sally_meta: evt.sally_meta || {} };
              } else if (evt.type === "error") {
                throw new Error(evt.message || "Stream failed");
              }
            }
          }
          if (acc) sseAnswer = acc;
        }
      } catch {
        sseAnswer = null;
      }

      if (!sseAnswer) try {
        const response = await authFetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: requestMessages,
            conversation_id: baseChat.id,
            matter_id: activeMatterId || null,
            deep_research: deepResearch,
            engine: selectedEngine !== "auto" ? selectedEngine : null,
          }),
        });
        if (response.status === 401) {
          clearAuthSession();
          if (onAuthRequired) onAuthRequired();
          return;
        }
        if (response.ok) {
          data = await response.json();
          answer = sanitizeModelResponse(data.choices?.[0]?.message?.content || "");
        }
      } catch (err) {}

      if (sseAnswer) {
        answer = sanitizeModelResponse(sseAnswer);
        setStreamingAnswer(answer);
      }

      if (!answer) {
        throw new Error("Unable to obtain a response from Sally reasoning engines. Please verify your connection or model provider status.");
      }

      // Model answer received: SSE path already streamed live; buffered path replays.
      clearInterval(progressTimer);
      if (!sseAnswer) {
        await transitionToComplete();
        await streamResponseLineByLine(answer);
      }

      const isDocumentAnswer = Boolean(isDraftedDocument(answer) || documentRequest || revisionRequest);
      let artifact = isDocumentAnswer
        ? makeArtifact({
            title: identifiedDoc?.name || fileRequest?.title || previousArtifact?.title || titleFor(clean),
            content: answer,
            previous: revisionRequest ? previousArtifact : null,
          })
        : null;
      if (artifact) {
        const h1Match = answer.match(/^#\s+([^\n]+)/m);
        if (h1Match && h1Match[1]?.trim() && !h1Match[1].toLowerCase().includes("intake")) {
          artifact.title = h1Match[1].trim();
        }
        artifact = await persistArtifact({
          artifact,
          conversation_id: baseChat.id,
          revision: revisionRequest,
        });
        setDocPanel({
          title: artifact.title,
          content: artifact.content,
          version: artifact.version,
          live: false,
          artifact,
          conversationId: baseChat.id,
        });
      } else {
        setDocPanel(null);
      }
      let attachments = [];
      if (fileRequest) {
        try {
          const generated = await authFetch("/api/generate-file", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...fileRequest,
              title: artifact?.title || titleFor(clean),
              content: artifact?.content || answer,
              artifact_id: artifact?.id,
              artifact_version: artifact?.version,
              conversation_id: baseChat.id,
            }),
          });
          if (generated.ok) {
            const generatedData = await generated.json();
            if (generatedData.file) {
              attachments = [generatedData.file];
              addLibraryFile({
                ...generatedData.file,
                content: artifact?.content || answer,
                conversation_id: baseChat.id,
              });
              try {
                const a = document.createElement("a");
                a.href = generatedData.file.url;
                a.download = generatedData.file.name || `document.${fileRequest.format}`;
                document.body.appendChild(a);
                a.click();
                a.remove();
              } catch {}
            }
          }
        } catch {}
      }

      const finalChat = {
        ...baseChat,
        messages: [
          ...next,
          {
            role: "assistant",
            content: fileRequest
              ? attachments.length
                ? `Your ${fileRequest.format.toUpperCase()} has been created.`
                : "I prepared the document, but the file generator could not finish. Please try exporting it again."
              : artifact
                ? `I have drafted the **${artifact.title}** and opened it in the document workspace on the right.\n\nYou can review the complete text, make direct edits, or export it to Word (.docx) or PDF.`
                : answer,
            artifact,
            attachments,
            provenance: data?.sally_meta || {},
          },
        ],
      };
      setIsWriting(false);
      setStreamingAnswer("");
      setThinkingProgress(0);
      setLoading(false);
      updateActive(() => finalChat);
      await persistChat(finalChat);
      if (autoSpeak || autoSpeakVoice) {
        const lastMsg = finalChat.messages[finalChat.messages.length - 1];
        if (lastMsg?.role === "assistant" && lastMsg.content) {
          setTimeout(() => togglePlayVoice(lastMsg.content, finalChat.messages.length - 1), 200);
        }
      }
    } catch (error) {
      clearInterval(progressTimer);
      const errorContent = `**Error:** Sally reasoning engines encountered an issue: ${error.message || "Unable to complete request"}. Please verify your connection or model provider status and try again.`;
      await transitionToComplete();
      await streamResponseLineByLine(errorContent);

      const finalChat = {
        ...baseChat,
        messages: [
          ...next,
          {
            role: "assistant",
            content: errorContent,
            provenance: { error: error.message || "Model execution error" },
          },
        ],
      };
      setIsWriting(false);
      setStreamingAnswer("");
      setThinkingProgress(0);
      setLoading(false);
      updateActive(() => finalChat);
      await persistChat(finalChat).catch(() => {});
    } finally {
      clearInterval(progressTimer);
      setIsWriting(false);
      setStreamingAnswer("");
      setThinkingProgress(0);
      setLoading(false);
      isSendingRef.current = false;
    }
  };
  const messages = active?.messages || [];
  const retry = (failed) => {
    if (loading || isSendingRef.current || !failed?.retryText) return;
    const recall = failed.retryText;
    const pruned = { ...active, messages: (active?.messages || []).filter((m) => m !== failed) };
    updateActive(() => pruned);
    persistChat(pruned).catch(() => {});
    setTimeout(() => send(recall), 0);
  };
  useEffect(() => {
    if (!messages.length) return;
    const frame = requestAnimationFrame(() => {
      if (threadRef.current) {
        threadRef.current.scrollTop = threadRef.current.scrollHeight;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [activeId, messages.length, loading]);

  const [searchQuery, setSearchQuery] = useState("");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("home"); // 'home' | 'explore' | 'library' | 'history'

  const greeting = useMemo(() => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good Morning";
    if (hr < 18) return "Good Afternoon";
    return "Good Evening";
  }, []);

  const displayName = useMemo(() => {
    if (user?.name) {
      return user.name.split(" ")[0];
    }
    return "Researcher";
  }, [user]);

  const userInitial = useMemo(() => {
    if (user?.initials) return user.initials;
    if (user?.name) {
      return user.name.trim()[0]?.toUpperCase() || "S";
    }
    return "S";
  }, [user]);

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    return chats.filter((c) =>
      (c.title || "").toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [chats, searchQuery]);

  // Group chats by age
  const groupedChats = useMemo(() => {
    const today = [];
    const pastWeek = [];
    const older = [];
    const now = Date.now();
    for (const c of filteredChats) {
      const updated = new Date(c.updated_at || c.created_at || now).getTime();
      const diffHours = (now - updated) / (1000 * 60 * 60);
      if (diffHours < 24) today.push(c);
      else if (diffHours < 168) pastWeek.push(c);
      else older.push(c);
    }
    return [
      { label: "Today", items: today },
      { label: "7 Days Ago", items: pastWeek },
      { label: "Earlier", items: older },
    ].filter((g) => g.items.length > 0);
  }, [filteredChats]);

  const allDocxFiles = useMemo(() => {
    const map = new Map();
    // 1. Files from state / database
    for (const f of libraryFiles) {
      const isDocx = f.format === "docx" || f.name?.endsWith(".docx") || f.filename?.endsWith(".docx");
      if (isDocx) map.set(f.id || f.name, f);
    }
    // 2. Scan attachments from conversation messages
    for (const chat of chats || []) {
      for (const msg of chat.messages || []) {
        for (const att of msg.attachments || []) {
          const isDocx = att && (att.format === "docx" || att.name?.endsWith(".docx") || att.filename?.endsWith(".docx"));
          if (isDocx) {
            const key = att.id || att.name || att.url;
            if (!map.has(key)) {
              map.set(key, {
                id: att.id || crypto.randomUUID(),
                name: att.name || att.filename || "document.docx",
                filename: att.filename || att.name || "document.docx",
                format: "docx",
                size: att.size || att.size_bytes || 0,
                size_bytes: att.size_bytes || att.size || 0,
                conversation_id: chat.id,
                created_at: msg.createdAt || chat.createdAt || new Date().toISOString(),
                content: msg.artifact?.content || msg.content || "",
                url: att.url || (att.id ? `/api/generated-files?id=${att.id}` : null),
              });
            }
          }
        }
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );
  }, [libraryFiles, chats]);

  const filteredDocxFiles = useMemo(() => {
    if (!searchQuery.trim()) return allDocxFiles;
    const q = searchQuery.toLowerCase();
    return allDocxFiles.filter(
      (f) =>
        (f.name || "").toLowerCase().includes(q) ||
        (f.filename || "").toLowerCase().includes(q)
    );
  }, [allDocxFiles, searchQuery]);

  return (
    <div className="beebotLayout">
      {/* Top App Tabs Bar with Window Controls */}
      <header className="beebotTopTabs">
        <div className="beebotTabsList">
          <button className="beebotTabPlus" onClick={newChat} title="New Chat">
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Active Legal Matter */}
          <button
            className="beebotTabBtn"
            onClick={() => {
              const name = prompt("Enter Legal Matter Name:");
              if (name) createMatter(name);
            }}
            title="Matter workspace"
          >
            <FolderKanban className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>{matters.find((m) => m.id === activeMatterId)?.name || "General Matter"}</span>
          </button>

          {/* Active Conversation Tab */}
          <div className="beebotTabBtn active">
            <img src="/sallyip-brand-mark.png" alt="SallyIP" className="w-3.5 h-3.5 object-contain shrink-0" />
            <span className="max-w-[160px] truncate">{active?.title || "New conversation"}</span>
            <button
              className="beebotTabClose"
              onClick={(e) => {
                e.stopPropagation();
                newChat();
              }}
              title="Close Tab"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          {/* Workspaces Launcher */}
          <button className="beebotTabBtn" onClick={() => setToolsOpen(true)} title="Specialist Legal Workspaces">
            <Layers3 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span>Workspaces</span>
          </button>

          {/* Documents Catalogue Launcher */}
          <button
            className={`beebotTabBtn ${documentsModalOpen ? "active" : ""}`}
            onClick={() => setDocumentsModalOpen(true)}
            title="Sally IP Official Documents Catalogue (20 Verified Documents)"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Documents</span>
          </button>
        </div>

        {/* Window controls (Minimize, Maximize, Close) */}
        <div className="beebotWindowControls">
          <button className="beebotWindowBtn" title="Minimize"><Minus className="w-3 h-3" /></button>
          <button className="beebotWindowBtn" title="Maximize"><Square className="w-2.5 h-2.5" /></button>
          <button className="beebotWindowBtn" title="Close"><X className="w-3 h-3" /></button>
        </div>
      </header>

      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="beebotSidebarBackdrop"
          onClick={() => setMobileSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Body */}
      <div className="beebotBody">
        {/* Left Sidebar */}
        <aside className={`beebotSidebar ${mobileSidebarOpen ? "mobile-open" : ""}`}>
          <div className="beebotBrandRow">
            <div className="beebotBrand" onClick={() => { setMobileSidebarOpen(false); onHome(); }}>
              <div className="beebotLogoIcon">
                <img src="/sallyip-brand-mark.png" alt="SallyIP" className="beebotBrandLogoImg" />
              </div>
              <div className="beebotLogoText">SallyIP</div>
            </div>
            <button
              type="button"
              className="beebotSidebarCloseBtn"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="beebotSearchWrap">
            <input
              ref={searchInputRef}
              type="text"
              className="beebotSearchInput"
              aria-label="Search conversations"
              placeholder="Search conversations"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="beebotSearchIcon" />
            <span className="beebotSearchKbd">⌘</span>
          </div>

          <nav className="beebotNavMenu">
            <button
              className={`beebotNavItem ${activeNav === "home" ? "active" : ""}`}
              onClick={() => {
                setActiveNav("home");
                if (messages.length > 0) newChat();
              }}
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>
            <button
              className={`beebotNavItem ${activeNav === "explore" ? "active" : ""}`}
              onClick={() => {
                setActiveNav("explore");
                setToolsOpen(true);
              }}
            >
              <Telescope className="w-4 h-4" />
              <span>Explore</span>
            </button>
            <button
              className={`beebotNavItem ${activeNav === "library" || sidebarTab === "library" ? "active" : ""}`}
              onClick={() => {
                setActiveNav("library");
                setSidebarTab("library");
              }}
              title="Word Document Library"
            >
              <BookOpen className="w-4 h-4" />
              <span>Library</span>
              {allDocxFiles.length > 0 && (
                <span className="beebotNavBadge">{allDocxFiles.length}</span>
              )}
            </button>
            <button
              className={`beebotNavItem ${activeNav === "history" ? "active" : ""}`}
              onClick={() => {
                setActiveNav("history");
                setSidebarTab("chats");
                setSearchQuery("");
                searchInputRef.current?.focus();
              }}
              title="Search conversation history"
            >
              <Clock3 className="w-4 h-4" />
              <span>History</span>
            </button>
          </nav>

          {/* Switcher tabs between Chats & DOCX Library */}
          <div className="beebotSidebarTabs">
            <button
              type="button"
              className={`beebotSidebarTab ${sidebarTab === "chats" && activeNav !== "library" ? "active" : ""}`}
              onClick={() => {
                setSidebarTab("chats");
                if (activeNav === "library") setActiveNav("home");
              }}
            >
              <MessageSquare className="w-3 h-3" />
              <span>Chats</span>
              <span className="beebotSidebarTabBadge">{chats.length}</span>
            </button>
            <button
              type="button"
              className={`beebotSidebarTab ${sidebarTab === "library" || activeNav === "library" ? "active" : ""}`}
              onClick={() => {
                setSidebarTab("library");
                setActiveNav("library");
              }}
            >
              <BookOpen className="w-3 h-3" />
              <span>DOCX</span>
              <span className="beebotSidebarTabBadge">{allDocxFiles.length}</span>
            </button>
          </div>

          {sidebarTab === "library" || activeNav === "library" ? (
            <div className="beebotLibraryScroll">
              <div className="beebotLibraryHeaderBar">
                <span className="beebotLibraryTitle">Word Documents (.docx)</span>
                <button
                  type="button"
                  className="beebotLibraryRefreshBtn"
                  onClick={syncLibraryFiles}
                  title="Sync DOCX library from server"
                >
                  <RotateCw className={`w-3 h-3 ${libraryLoading ? "animate-spin" : ""}`} />
                </button>
              </div>

              {filteredDocxFiles.length === 0 ? (
                <div className="beebotLibraryEmpty">
                  <div className="beebotLibraryEmptyIcon">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="beebotLibraryEmptyTitle">No Word Documents Yet</div>
                  <div className="beebotLibraryEmptyDesc">
                    Any patent, trademark filing, copyright work, or NDA drafted as a Word document will be stored here automatically.
                  </div>
                  <button
                    type="button"
                    className="beebotLibrarySampleBtn"
                    onClick={() => {
                      setSidebarTab("chats");
                      setActiveNav("home");
                      send("Draft a mutual NDA between A Ltd and B Ltd as a Word document");
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    <span>Draft Sample NDA (.docx)</span>
                  </button>
                </div>
              ) : (
                filteredDocxFiles.map((file) => (
                  <div
                    key={file.id || file.name}
                    className="beebotDocxCard"
                    onClick={() => openLibraryDocInPanel(file)}
                    title={`Click to view ${file.name} in document panel`}
                  >
                    <div className="beebotDocxTop">
                      <div className="beebotDocxIconBadge">W</div>
                      <div className="beebotDocxInfo">
                        <div className="beebotDocxName">{file.name}</div>
                        <div className="beebotDocxMeta">
                          <span>{file.size ? `${Math.round(file.size / 1024)} KB` : "Word Doc"}</span>
                          <span className="beebotDocxMetaDot" />
                          <span>{new Date(file.created_at || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="beebotDocxActions">
                      <button
                        type="button"
                        className="beebotDocxActionBtn download"
                        onClick={(e) => downloadLibraryFile(file, e)}
                        title="Download DOCX file"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </button>
                      <button
                        type="button"
                        className="beebotDocxActionBtn"
                        onClick={(e) => openLibraryDocInPanel(file, e)}
                        title="Open in Right Panel"
                      >
                        <FileText className="w-3 h-3" />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        className="beebotDocxActionBtn delete"
                        onClick={(e) => deleteLibraryFile(file.id, e)}
                        title="Delete from Library"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="beebotHistoryScroll">
              {groupedChats.map((group) => (
                <div key={group.label} className="beebotHistorySection">
                  <div className="beebotHistoryHeader">{group.label}</div>
                  {group.items.map((chat) => (
                    <div
                      key={chat.id}
                      className={`beebotHistoryRow ${chat.id === activeId ? "active" : ""}`}
                    >
                      <button
                        className="beebotHistoryItem"
                        onClick={() => openChat(chat.id)}
                        title={chat.title}
                      >
                        {chat.title || "Untitled Conversation"}
                      </button>
                      <button
                        className="beebotHistoryDelete"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(chat.id);
                        }}
                        title="Delete chat"
                        aria-label={`Delete chat: ${chat.title || "Untitled Conversation"}`}
                      >
                        <Trash2 className="w-3 h-3" aria-hidden="true" focusable="false" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* User Profile Card */}
          <div className="beebotUserCard" onClick={logout} title="Click to log out of SallyIP">
            <div className="beebotUserMeta">
              <div className="beebotUserAvatar">
                {userInitial}
              </div>
              <div className="beebotUserTexts">
                <div className="beebotUserName">{user?.name || displayName}</div>
                <div className="beebotUserEmail">{user?.email || "Authenticated"}</div>
              </div>
            </div>
            <LogOut className="w-3.5 h-3.5 text-slate-400 hover:text-red-400 shrink-0" />
          </div>
        </aside>

        {/* Main Chat Work Area */}
        <main className="beebotMainArea">
          {/* Main Top Bar */}
          <div className="beebotMainTop">
            <div className="beebotTopLeftGroup">
              <button
                type="button"
                className="beebotMobileMenuBtn"
                onClick={() => setMobileSidebarOpen((v) => !v)}
                title="Toggle sidebar menu"
                aria-label="Toggle sidebar menu"
              >
                <Menu className="w-4 h-4 text-slate-700" />
              </button>

              <div className="beebotModelPickerWrap">
                <button
                  type="button"
                  className="beebotModelPicker"
                  onClick={() => setModelMenuOpen((v) => !v)}
                >
                  <div className="beebotModelIcon">
                    <img src="/sallyip-brand-mark.png" alt="SallyIP" className="w-3.5 h-3.5 object-contain" />
                  </div>
                  <span>{selectedEngine === "nvidia/nemotron-3.5-lightning:free" ? "Nemotron 3.5" : selectedEngine === "google/gemma-4-26b-a4b-it:free" ? "Gemma 4 26B" : selectedEngine === "liquid/lfm-2.5-2.6b:free" ? "Liquid LFM Fast" : "SallyIP 4.2 Pro"}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

              {modelMenuOpen && (
                <div className="beebotModelDropdown">
                  <div className="beebotDropdownHeader">Active AI Engines</div>
                  <button
                    type="button"
                    className={`beebotDropdownItem ${selectedEngine === "auto" ? "active" : ""}`}
                    onClick={() => {
                      setSelectedEngine("auto");
                      setModelMenuOpen(false);
                    }}
                  >
                    <span>⚡ SallyIP 4.2 Pro (Auto fleet)</span>
                    {selectedEngine === "auto" && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                  <button
                    type="button"
                    className={`beebotDropdownItem ${selectedEngine === "nvidia/nemotron-3.5-lightning:free" ? "active" : ""}`}
                    onClick={() => {
                      setSelectedEngine("nvidia/nemotron-3.5-lightning:free");
                      setModelMenuOpen(false);
                    }}
                  >
                    <span>🔬 Nemotron 3.5 (Legal reasoning)</span>
                    {selectedEngine === "nvidia/nemotron-3.5-lightning:free" && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                  <button
                    type="button"
                    className={`beebotDropdownItem ${selectedEngine === "google/gemma-4-26b-a4b-it:free" ? "active" : ""}`}
                    onClick={() => {
                      setSelectedEngine("google/gemma-4-26b-a4b-it:free");
                      setModelMenuOpen(false);
                    }}
                  >
                    <span>💬 Gemma 4 26B (Explanation)</span>
                    {selectedEngine === "google/gemma-4-26b-a4b-it:free" && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                  <button
                    type="button"
                    className={`beebotDropdownItem ${selectedEngine === "liquid/lfm-2.5-2.6b:free" ? "active" : ""}`}
                    onClick={() => {
                      setSelectedEngine("liquid/lfm-2.5-2.6b:free");
                      setModelMenuOpen(false);
                    }}
                  >
                    <span>🚀 Liquid LFM (Fast draft)</span>
                    {selectedEngine === "liquid/lfm-2.5-2.6b:free" && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="beebotTopRightActions">
              <button
                type="button"
                className={`beebotNewChatBtn ${autoSpeakVoice ? "border-indigo-300 text-indigo-600 dark:border-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30" : ""}`}
                onClick={() => setAutoSpeakVoice((v) => !v)}
                title={autoSpeakVoice ? "Sally voice auto-speak is ON (Answers will be spoken automatically)" : "Enable Sally voice auto-speak (Click to hear answers aloud)"}
              >
                {autoSpeakVoice ? <Volume2 className="w-3.5 h-3.5 text-indigo-600" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                <span>{autoSpeakVoice ? "Voice On" : "Voice Off"}</span>
              </button>
              <button
                type="button"
                className="beebotNewChatBtn border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100/60"
                onClick={() => setVoiceOverlayOpen(true)}
                title="Start live conversational full-duplex voice call with Sally"
              >
                <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                <span>Voice Call</span>
              </button>
              <button
                type="button"
                className="beebotNewChatBtn border-indigo-300 text-indigo-700 dark:border-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100/60 shadow-sm"
                onClick={() => setVideoCallOpen(true)}
                title="Start a live video call with Sally's real-time 3D human"
              >
                <Video className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Video Call</span>
              </button>
              <button className="beebotNewChatBtn" onClick={newChat}>
                <Plus className="w-3.5 h-3.5" />
                <span>New Chat</span>
              </button>
              <div className="beebotAvatarPill" title={user?.name || displayName}>
                <span>{userInitial}</span>
              </div>
            </div>
          </div>

          {/* Empty Hero State or Chat Thread */}
          {messages.length === 0 ? (
            <div className="beebotHero">
              {/* Hero Brand Emblem */}
              <div className="beebotHeroEmblemWrap">
                <img src="/sallyip-brand-mark.png" alt="SallyIP" className="beebotHeroEmblemImg" />
              </div>

              <div className="beebotHeroGreeting">
                {greeting}, {displayName}
              </div>

              <h1 className="beebotHeroHeadline">
                What IP matter <span>shall we work on?</span>
              </h1>
              <p className="beebotHeroSub">
                Patents, Trademarks &amp; Copyrights — research, drafting, and clearance linked to evidence.
              </p>

              {/* Floating Center Composer */}
              <div className={`beebotComposerCard ${isDictating ? "is-dictating" : ""}`}>
                {isDictating && (
                  <div className="beebotDictationBanner" role="status" aria-live="polite">
                    <div className="beebotDictationLeft">
                      <div className="beebotDictationPulseWrap">
                        <div className="beebotDictationRadar" />
                        <div className="beebotDictationDot" />
                      </div>
                      <div className="beebotDictationTextWrap">
                        <span className="beebotDictationTitle">
                          Listening to your voice... (Live typing)
                        </span>
                        <span className="beebotDictationSubtitle">
                          {dictatedLiveText || "Speak clearly into your microphone..."}
                        </span>
                      </div>
                    </div>
                    <div className="beebotDictationActions">
                      <button
                        type="button"
                        onClick={stopDictation}
                        className="beebotDictationDoneBtn"
                        title="Done dictating"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
                <textarea
                  className="beebotComposerInput"
                  aria-label="Message SallyIP. Press Enter to send, Shift plus Enter for a new line"
                  enterKeyHint="send"
                  placeholder={isDictating ? "Listening... Your spoken words appear here live as you talk..." : "Describe an invention, trademark mark, copyright work, or paste an office action..."}
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (isDictatingRef.current) stopDictation();
                      send(input);
                    }
                  }}
                />

                <div className="beebotComposerBottom">
                  <div className="beebotActionPills">
                    <input
                      ref={uploadInputRef}
                      type="file"
                      style={{ display: "none" }}
                      accept=".pdf,.docx,.txt,.md,.csv,.xlsx"
                      onChange={(e) => ingestDocument(e.target.files?.[0])}
                    />
                    <button
                      type="button"
                      className="beebotPillBtn"
                      onClick={() => uploadInputRef.current?.click()}
                      title="Attach documents"
                      aria-label="Attach document"
                    >
                      <Paperclip />
                    </button>

                    <button
                      type="button"
                      className={`beebotPillBtn ${deepResearch ? "active" : ""}`}
                      onClick={() => setDeepResearch((v) => !v)}
                    >
                      <Telescope />
                      <span>{deepResearch ? "Reasoning On" : "Reasoning"}</span>
                    </button>

                    <button
                      type="button"
                      className="beebotPillBtn"
                      onClick={() => setActiveWorkspace("patent_draft")}
                      title="Open IP Drafting Workspace (Patents, Trademarks & Filings)"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      <span>IP Drafter</span>
                    </button>

                    <button
                      type="button"
                      className="beebotPillBtn"
                      onClick={() => setToolsOpen(true)}
                      title="Specialist Legal Workspaces"
                    >
                      <Layers3 className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Workspaces</span>
                    </button>

                    <button
                      type="button"
                      className="beebotPillBtn"
                      onClick={() => setDocumentsModalOpen(true)}
                      title="Official IP Documents Catalogue (Patents, Trademarks & Copyrights)"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Documents</span>
                    </button>

                    <button
                      type="button"
                      className={`beebotPillBtn ${isDictating ? "active text-red-600 border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-950/30 animate-pulse font-semibold" : ""}`}
                      onClick={toggleDictation}
                      title={isDictating ? "Stop voice dictation" : "Voice dictation (Speak to Sally)"}
                    >
                      {isDictating ? <MicOff className="w-3.5 h-3.5 text-red-600" /> : <Mic className="w-3.5 h-3.5 text-indigo-500" />}
                      <span>{isDictating ? "Stop Dictating" : "Dictate"}</span>
                    </button>

                    <button
                      type="button"
                      className="beebotPillBtn text-emerald-700 dark:text-emerald-300"
                      onClick={() => setVoiceOverlayOpen(true)}
                      title="Launch Sally Real-Time Voice Call"
                    >
                      <PhoneCall className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Voice Call</span>
                    </button>

                    <button
                      type="button"
                      className="beebotPillBtn text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30"
                      onClick={() => setVideoCallOpen(true)}
                      title="Launch Sally Photorealistic Video Call"
                    >
                      <Video className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Video Call</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="beebotSendBtn"
                    aria-label="Send message"
                    disabled={!input.trim() || loading}
                    onClick={() => {
                      if (isDictatingRef.current) stopDictation();
                      send(input);
                    }}
                  >
                    <Send className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
                  </button>
                </div>
              </div>

              {/* Ingestion notification */}
              {(ingesting || uploadedSource) && (
                <div className="mt-3 text-xs text-indigo-600 font-medium flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>
                    {ingesting
                      ? "Ingesting document into matter vault…"
                      : `${uploadedSource.name} ready for retrieval`}
                  </span>
                </div>
              )}

              {/* Capability suggestions */}
              <div className="beebotSuggestions">
                {[
                  { icon: <Telescope className="w-3.5 h-3.5" />, title: "Patent Prior-Art & FTO", prompt: "Search prior art for the uploaded invention and rank the closest references." },
                  { icon: <Scale className="w-3.5 h-3.5" />, title: "Trademark Clearance", prompt: "Check whether my trademark mark is clear for SaaS and AI services in the US and EU." },
                  { icon: <ShieldCheck className="w-3.5 h-3.5" />, title: "Copyright & Fair Use", prompt: "Run a copyright clearance and fair-use risk analysis on this creative work and digital asset." },
                  { icon: <FileText className="w-3.5 h-3.5" />, title: "Draft IP Filing", prompt: "Draft a US patent application scaffold from my invention disclosure, section by section." },
                ].map((s) => (
                  <button
                    key={s.title}
                    type="button"
                    className="beebotSuggestionCard"
                    disabled={loading}
                    onClick={() => { setInput(s.prompt); }}
                  >
                    {s.icon}
                    <span>{s.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Active Message Thread Layout */
            <div className={`beebotActiveChatView${docPanel ? " doc-open" : ""}`}>
              <div className="beebotThread" ref={threadRef} role="log" aria-label="Conversation with SallyIP" aria-live="off">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`beebotMessage ${message.role}`}
                  >
                    {message.role === "assistant" && (
                      <div className="beebotAvatar assistant">
                        <img src="/sallyip-brand-mark.png" alt="SallyIP" className="w-4 h-4 object-contain" />
                      </div>
                    )}

                    {message.role === "user" ? (
                      <div className="beebotUserBubble">
                        {message.content}
                      </div>
                    ) : (
                      <div className="beebotMessageBody">
                        <div className="beebotAssistantHeader">
                          <span className="beebotAssistantTitle">SallyIP 4.2 Pro</span>
                        </div>

                        <div className="beebotAssistantText">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {sanitizeModelResponse(
                              message.artifact?.content && isDraftedDocument(message.content)
                                ? `I have drafted the **${message.artifact.title || "Statutory Document"}** and opened it in the document workspace on the right.\n\nYou can review the complete text, make direct edits, or export it to Word (.docx) or PDF.`
                                : message.content
                            )}
                          </ReactMarkdown>
                        </div>

                        {message.attachments?.length > 0 && (
                          <div className="beebotAttachmentsList">
                            {message.attachments.map((file) => (
                              <a
                                href={file.url}
                                key={file.id}
                                download={file.name}
                                className="beebotAttachmentItem"
                              >
                                <span className="flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-indigo-500" />
                                  <span className="font-medium">{file.name}</span>
                                </span>
                                <Download className="w-3.5 h-3.5 text-slate-400" />
                              </a>
                            ))}
                          </div>
                        )}

                        <div className="beebotMessageActions">
                          <button
                            onClick={() => togglePlayVoice(message.content, index)}
                            className={`beebotActionBtn ${playingAudioIndex === index && isPlayingAudio ? "text-indigo-600 font-semibold bg-indigo-50 dark:bg-indigo-950/40" : ""}`}
                            title={playingAudioIndex === index && isPlayingAudio ? "Stop Sally's voice audio" : "Listen in Sally's voice (Edge Neural)"}
                          >
                            {playingAudioIndex === index && isPlayingAudio ? (
                              <>
                                <Square className="w-3 h-3 text-red-500 fill-red-500 animate-pulse" />
                                <span className="text-red-600 font-medium">Stop audio</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3 text-indigo-500" />
                                <span>Play audio</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => navigator.clipboard.writeText(message.content)}
                            className="beebotActionBtn"
                            title="Copy response"
                          >
                            <Copy className="w-3 h-3" /> <span>Copy</span>
                          </button>
                          <button
                            onClick={() => setVerificationMessage(message)}
                            className="beebotActionBtn"
                            title="Inspect verification, citation audit, and proposition graph"
                          >
                            <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> <span>Verify</span>
                          </button>
                          {message.artifact?.content && (
                            <button
                              onClick={() => setDocPanel({ title: message.artifact.title, content: message.artifact.content, version: message.artifact.version, live: false, artifact: message.artifact, conversationId: active?.id })}
                              className="beebotActionBtn"
                              title="Open document in side panel"
                            >
                              <FileText className="w-3 h-3" /> <span>Open document</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {message.role === "user" && (
                      <div className="beebotAvatar user" title={user?.name || "Aman"}>
                        {userInitial}
                      </div>
                    )}
                  </div>
                ))}

                {loading && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="beebotMessage assistant">
                    <div className="beebotAvatar assistant">
                      <img src="/sallyip-brand-mark.png" alt="SallyIP" className="w-4 h-4 object-contain" />
                    </div>
                    <div className="beebotMessageBody">
                      <div className="beebotAssistantHeader">
                        <span className="beebotAssistantTitle">SallyIP 4.2 Pro</span>
                        <div className="beebotProgressBadge">
                          {thinkingProgress}%
                        </div>
                      </div>

                      {/* Percentage Progress Bar before 100% */}
                      {!isWriting && (
                        <div className="beebotProgressSection" role="status" aria-live="polite" aria-atomic="true">
                          <div className="beebotProgressBarTrack">
                            <div
                              className="beebotProgressBarFill"
                              style={{ width: `${thinkingProgress}%` }}
                            />
                          </div>
                          <div className="beebotProgressPhaseRow">
                            <span className="beebotProgressPulseDot" />
                            <span className="beebotProgressPhaseText">{thinkingPhase}</span>
                          </div>
                        </div>
                      )}

                      {/* Once 100% reached: Live line-by-line typing */}
                      {isWriting && (
                        <div className="beebotStreamingText" aria-busy="true">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {streamingAnswer}
                          </ReactMarkdown>
                          <span className="beebotStreamingCursor" />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div ref={threadEndRef} />
              </div>

              {/* Persistent Pinned Bottom Composer */}
              <div className="beebotBottomComposerWrap">
                <div className={`beebotComposerCard ${isDictating ? "is-dictating" : ""}`}>
                  {isDictating && (
                    <div className="beebotDictationBanner" role="status" aria-live="polite">
                      <div className="beebotDictationLeft">
                        <div className="beebotDictationPulseWrap">
                          <div className="beebotDictationRadar" />
                          <div className="beebotDictationDot" />
                        </div>
                        <div className="beebotDictationTextWrap">
                          <span className="beebotDictationTitle">
                            Listening to your voice... (Live typing)
                          </span>
                          <span className="beebotDictationSubtitle">
                            {dictatedLiveText || "Speak clearly into your microphone..."}
                          </span>
                        </div>
                      </div>
                      <div className="beebotDictationActions">
                        <button
                          type="button"
                          onClick={stopDictation}
                          className="beebotDictationDoneBtn"
                          title="Stop dictating and keep text"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  )}
                  <textarea
                    className="beebotComposerInput"
                    aria-label="Message SallyIP. Press Enter to send, Shift plus Enter for a new line"
                    enterKeyHint="send"
                    placeholder={isDictating ? "Listening... Your spoken words appear here live as you talk..." : "Ask a follow-up about this IP matter (Patent, Trademark, Copyright)..."}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (isDictatingRef.current) stopDictation();
                        send(input);
                      }
                    }}
                  />
                  <div className="beebotComposerBottom">
                    <div className="beebotActionPills">
                      <button
                        type="button"
                        className="beebotPillBtn"
                        onClick={() => uploadInputRef.current?.click()}
                        title="Attach document"
                        aria-label="Attach document"
                      >
                        <Paperclip />
                      </button>
                      <button
                        type="button"
                        className={`beebotPillBtn ${deepResearch ? "active" : ""}`}
                        onClick={() => setDeepResearch((v) => !v)}
                        aria-pressed={deepResearch}
                      >
                        <Telescope />
                        <span>{deepResearch ? "Reasoning On" : "Reasoning"}</span>
                      </button>
                      <button
                        type="button"
                        className="beebotPillBtn"
                        onClick={() => setActiveWorkspace("patent_draft")}
                        title="Open IP Drafting Workspace (Patents, Trademarks & Filings)"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-500" />
                        <span>IP Drafter</span>
                      </button>
                      <button
                        type="button"
                        className="beebotPillBtn"
                        onClick={() => setToolsOpen(true)}
                        title="Specialist Legal Workspaces"
                      >
                        <Layers3 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Workspaces</span>
                      </button>

                      <button
                        type="button"
                        className="beebotPillBtn"
                        onClick={() => setDocumentsModalOpen(true)}
                        title="Official IP Documents Catalogue (Patents, Trademarks & Copyrights)"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Documents</span>
                      </button>

                      <button
                        type="button"
                        className={`beebotPillBtn ${isDictating ? "active text-red-600 border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-950/30 animate-pulse font-semibold" : ""}`}
                        onClick={toggleDictation}
                        title={isDictating ? "Stop voice dictation" : "Voice dictation (Speak to Sally)"}
                      >
                        {isDictating ? <MicOff className="w-3.5 h-3.5 text-red-600" /> : <Mic className="w-3.5 h-3.5 text-indigo-500" />}
                        <span>{isDictating ? "Stop Dictating" : "Dictate"}</span>
                      </button>

                      <button
                        type="button"
                        className="beebotPillBtn text-emerald-700 dark:text-emerald-300"
                        onClick={() => setVoiceOverlayOpen(true)}
                        title="Launch Sally Real-Time Voice Call"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Voice Call</span>
                      </button>

                      <button
                        type="button"
                        className="beebotPillBtn text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30"
                        onClick={() => setVideoCallOpen(true)}
                        title="Launch Sally Photorealistic Video Call"
                      >
                        <Video className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Video Call</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      className="beebotSendBtn"
                      aria-label="Send message"
                      disabled={!input.trim() || loading}
                      onClick={() => {
                        if (isDictatingRef.current) stopDictation();
                        send(input);
                      }}
                    >
                      <Send className="w-3.5 h-3.5" aria-hidden="true" focusable="false" />
                    </button>
                  </div>
                </div>
              </div>
              {docPanel && (
                <Suspense fallback={null}>
                  <DocPanel
                    doc={docPanel}
                    onClose={() => setDocPanel(null)}
                    onExported={(file) => {
                      recordToolResult?.(`## Document exported\n\n**${file.name}** ready for download.`, { task_class: "DOCUMENT_EXPORT", source_basis: "user_supplied" });
                      addLibraryFile({ ...file, content: docPanel?.content || "" });
                    }}
                  />
                </Suspense>
              )}
              {verificationMessage && (
                <Suspense fallback={null}>
                  <VerificationInspectorModal
                    isOpen={Boolean(verificationMessage)}
                    onClose={() => setVerificationMessage(null)}
                    message={verificationMessage}
                  />
                </Suspense>
              )}
            </div>
          )}

      {/* Sally Full-Duplex Voice Call Overlay */}
      {voiceOverlayOpen && (
        <Suspense fallback={null}>
          <VoiceOverlay
            isOpen={voiceOverlayOpen}
            onClose={() => setVoiceOverlayOpen(false)}
            matterId={activeMatterId}
            conversationId={active?.id}
          />
        </Suspense>
      )}

      {/* Sally Photorealistic Digital Human Video Call Card */}
      {videoCallOpen && (
        <Suspense fallback={null}>
          <SallyVideoCallCard
            isOpen={videoCallOpen}
            onClose={() => setVideoCallOpen(false)}
            onSwitchToVoice={() => {
              setVideoCallOpen(false);
              setVoiceOverlayOpen(true);
            }}
            matterId={activeMatterId}
            conversationId={active?.id}
          />
        </Suspense>
      )}

      {/* Sally Official Documents Catalogue Modal (20 Verified Documents) */}
      {documentsModalOpen && (
        <Suspense fallback={null}>
          <SallyDocumentsModal
            isOpen={documentsModalOpen}
            onClose={() => setDocumentsModalOpen(false)}
            onSelectDocument={(doc) => {
              setDocumentsModalOpen(false);
              setInput(doc.command);
              setTimeout(() => {
                const inputEl = document.querySelector('.beebotInput');
                if (inputEl) {
                  inputEl.focus();
                }
              }, 50);
            }}
          />
        </Suspense>
      )}

      {/* Workspaces Launcher Modal */}
      {toolsOpen && (
        <div
          className="beebotModalBackdrop"
          onClick={() => setToolsOpen(false)}
        >
          <div
            className="beebotModalCard"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="beebotModalHeader">
              <div>
                <h3 className="beebotModalTitle">Specialist IP Workspaces</h3>
                <p className="beebotModalSubtitle">Select a specialized module for Patent, Trademark, and Copyright analysis.</p>
              </div>
              <button
                onClick={() => setToolsOpen(false)}
                className="beebotModalClose"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="beebotModalBody">
              <button
                className="beebotWorkspaceTile"
                onClick={() => {
                  setToolsOpen(false);
                  setActiveWorkspace("patent_draft");
                }}
              >
                <div className="beebotTileHeader">
                  <div className="beebotTileIcon">
                    <FileText className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="beebotTileName">Patent & IP Drafter</div>
                </div>
                <div className="beebotTileDesc">
                  Draft patents, trademark filings, and IP specifications with automated statutory screening.
                </div>
              </button>

              <button
                className="beebotWorkspaceTile"
                onClick={() => {
                  setToolsOpen(false);
                  setActiveWorkspace("contracts");
                }}
              >
                <div className="beebotTileHeader">
                  <div className="beebotTileIcon">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="beebotTileName">Contract & IP Licensing Review</div>
                </div>
                <div className="beebotTileDesc">
                  Automated IP licensing redlining, copyright assignment checks, and institutional playbook enforcement.
                </div>
              </button>

              <button
                className="beebotWorkspaceTile"
                onClick={() => {
                  setToolsOpen(false);
                  setActiveWorkspace("playbooks");
                }}
              >
                <div className="beebotTileHeader">
                  <div className="beebotTileIcon">
                    <BookOpen className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="beebotTileName">Playbooks Desk</div>
                </div>
                <div className="beebotTileDesc">
                  Manage standard clauses, fallbacks, negotiation positions, and clause ledger.
                </div>
              </button>

              <button
                className="beebotWorkspaceTile"
                onClick={() => {
                  setToolsOpen(false);
                  setActiveWorkspace("fto");
                }}
              >
                <div className="beebotTileHeader">
                  <div className="beebotTileIcon">
                    <Telescope className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="beebotTileName">Freedom to Operate</div>
                </div>
                <div className="beebotTileDesc">
                  Infringement risk matrices, product-to-patent mapping, and design-around guidance.
                </div>
              </button>

              <button
                className="beebotWorkspaceTile"
                onClick={() => {
                  setToolsOpen(false);
                  setActiveWorkspace("claim_chart");
                }}
              >
                <div className="beebotTileHeader">
                  <div className="beebotTileIcon">
                    <Layers3 className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="beebotTileName">Claim Chart Builder</div>
                </div>
                <div className="beebotTileDesc">
                  Element-by-element patent claim comparison against prior art disclosures.
                </div>
              </button>

              <button
                className="beebotWorkspaceTile"
                onClick={() => {
                  setToolsOpen(false);
                  setActiveWorkspace("novelty");
                }}
              >
                <div className="beebotTileHeader">
                  <div className="beebotTileIcon">
                    <Search className="w-4 h-4 text-rose-600" />
                  </div>
                  <div className="beebotTileName">Prior Art & Novelty</div>
                </div>
                <div className="beebotTileDesc">
                  Anticipation analysis, primary citation verification, and inventive step assessments.
                </div>
              </button>

              <button
                className="beebotWorkspaceTile"
                onClick={() => {
                  setToolsOpen(false);
                  setActiveWorkspace("trademark");
                }}
              >
                <div className="beebotTileHeader">
                  <div className="beebotTileIcon">
                    <Scale className="w-4 h-4 text-cyan-600" />
                  </div>
                  <div className="beebotTileName">Trademark Intelligence</div>
                </div>
                <div className="beebotTileDesc">
                  Likelihood of confusion screening, Nice classification, and registry clearance.
                </div>
              </button>

              <button
                className="beebotWorkspaceTile"
                onClick={() => {
                  setToolsOpen(false);
                  setActiveWorkspace("office_action");
                }}
              >
                <div className="beebotTileHeader">
                  <div className="beebotTileIcon">
                    <FileWarning className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="beebotTileName">Office Action Response</div>
                </div>
                <div className="beebotTileDesc">
                  Parse rejections, map to claims, draft audited amendments with new-matter checks.
                </div>
              </button>

              <button
                className="beebotWorkspaceTile"
                onClick={() => {
                  setToolsOpen(false);
                  setActiveWorkspace("claim_qa");
                }}
              >
                <div className="beebotTileHeader">
                  <div className="beebotTileIcon">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="beebotTileName">Claim QA Audit</div>
                </div>
                <div className="beebotTileDesc">
                  One-click antecedent, dependency, terminology, and support audit — instant, in-browser.
                </div>
              </button>

              <button
                className="beebotWorkspaceTile"
                onClick={() => {
                  setToolsOpen(false);
                  setActiveWorkspace("knowledge_graph");
                }}
              >
                <div className="beebotTileHeader">
                  <div className="beebotTileIcon">
                    <FolderKanban className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="beebotTileName">IP Knowledge Graph & Citations</div>
                </div>
                <div className="beebotTileDesc">
                  Patent families, trademark registries, copyright registers, and litigation evidence.
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Workspaces Render */}
      <Suspense fallback={null}>
        {activeWorkspace === "patent_draft" && (
          <PatentDraftingWorkspace
            isOpen={true}
            onClose={() => setActiveWorkspace(null)}
            matterId={activeMatterId}
            onResult={recordToolResult}
          />
        )}
        {activeWorkspace === "contracts" && (
          <ContractWorkspace
            isOpen={true}
            onClose={() => setActiveWorkspace(null)}
            matterId={activeMatterId}
            onResult={recordToolResult}
          />
        )}
        {activeWorkspace === "playbooks" && (
          <PlaybookWorkspace
            isOpen={true}
            onClose={() => setActiveWorkspace(null)}
            matterId={activeMatterId}
            conversationId={active?.id}
            onResult={recordToolResult}
          />
        )}
        {activeWorkspace === "fto" && (
          <FtoWorkspace
            isOpen={true}
            onClose={() => setActiveWorkspace(null)}
            matterId={activeMatterId}
            onResult={recordToolResult}
          />
        )}
        {activeWorkspace === "claim_chart" && (
          <ClaimChartWorkspace
            isOpen={true}
            onClose={() => setActiveWorkspace(null)}
            matterId={activeMatterId}
            onResult={recordToolResult}
          />
        )}
        {activeWorkspace === "novelty" && (
          <NoveltyWorkspace
            isOpen={true}
            onClose={() => setActiveWorkspace(null)}
            matterId={activeMatterId}
            onResult={recordToolResult}
          />
        )}
        {activeWorkspace === "trademark" && (
          <TrademarkClearanceWorkspace
            isOpen={true}
            onClose={() => setActiveWorkspace(null)}
            matterId={activeMatterId}
            onResult={recordToolResult}
          />
        )}
        {activeWorkspace === "knowledge_graph" && (
          <IpKnowledgeGraphWorkspace
            isOpen={true}
            onClose={() => setActiveWorkspace(null)}
            matterId={activeMatterId}
          />
        )}
        {activeWorkspace === "office_action" && (
          <OfficeActionWorkspace
            isOpen={true}
            onClose={() => setActiveWorkspace(null)}
            matterId={activeMatterId}
            onResult={recordToolResult}
          />
        )}
        {activeWorkspace === "claim_qa" && (
          <ClaimQaWorkspace
            isOpen={true}
            onClose={() => setActiveWorkspace(null)}
            onResult={recordToolResult}
          />
        )}
      </Suspense>
        </main>
      </div>
    </div>
  );
}
