import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { sanitizeModelResponse } from "../lib/document-tool-service.js";
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
  FolderKanban,
  Home,
  Layers3,
  LogOut,
  MessageSquare,
  Minus,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  Trash2,
  Telescope,
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
  { state: "connecting", label: "Connecting Sally’s intelligence…" },
  { state: "searching", label: "Searching evidence…" },
  { state: "weaving", label: "Weaving model findings…" },
  { state: "solving", label: "Resolving conflicts…" },
  { state: "composing", label: "Composing Sally’s answer…" },
  { state: "shaping", label: "Shaping the final response…" },
];
const detectFileRequest = (text) => {
  const match = text.match(/\b(pdf|docx?|word document|pptx?|powerpoint|xlsx?|excel|csv|markdown|md|html|json|txt|text file)\b/i);
  const requestsDownload = /\b(create|generate|make|export|prepare|download|convert|provide|give|turn .+ into)\b/i.test(text);
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
  /\b(draft|write|prepare|create|generate)\b[\s\S]*\b(agreement|contract|memorandum|memo|opinion|letter|report|notice|policy|brief|claim chart|checklist|document)\b/i.test(text);
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
const persistArtifact = async ({ artifact, conversationId, revision }) => {
  const response = await fetch("/api/artifacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: revision ? "revise" : "create",
      artifact_id: artifact.id,
      conversation_id: conversationId,
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
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Artifact could not be saved");
  return data.artifact;
};
const makeChat = () => ({
  id: crypto.randomUUID(),
  title: "New conversation",
  messages: [],
  createdAt: Date.now(),
});
const titleFor = (text) =>
  text.trim().replace(/\s+/g, " ").slice(0, 42) +
  (text.trim().length > 42 ? "…" : "");
function Mark({ className = "" }) {
  return (
    <span className={`brandMark ${className}`}>
      <img src="/sallyip-logo.png" alt="" />
    </span>
  );
}

export default function ChatPage({ onHome, onAuthRequired }) {
  const threadRef = useRef(null);
  const threadEndRef = useRef(null);
  const uploadInputRef = useRef(null);
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
  const [user, setUser] = useState({ name: "Judha", email: "attorney@sallyip.com", role: "Patent Attorney" });
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [editingMessage, setEditingMessage] = useState(null);
  const [matters, setMatters] = useState([]);
  const [activeMatterId, setActiveMatterId] = useState("");
  const [deepResearch, setDeepResearch] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [uploadedSource, setUploadedSource] = useState(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [viewingPassage, setViewingPassage] = useState(null);
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
        if (!cancelled && data?.user) setUser(data.user);
      })
      .catch(() => {
        // Fallback user already set
      });
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    fetch("/api/matters")
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
    const response = await fetch("/api/matters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", name: name.trim() }) });
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
      const response = await fetch("/api/ingest-document", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matter_id: activeMatterId, filename: file.name, data: String(dataUrl).split(",")[1], rights_confirmed: true, authority_tier: 5, source_type: "uploaded_document" }) });
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
    fetch("/api/conversations")
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
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    }).catch(() => {});
    localStorage.removeItem(STORAGE_KEY);
    if (onAuthRequired) onAuthRequired();
  };
  const persistChat = async (chat) => {
    try {
      const response = await fetch("/api/conversations", {
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
    await fetch(`/api/conversations?id=${encodeURIComponent(id)}`, {
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
  };
  const send = async (text = input) => {
    const clean = text.trim();
    if (!clean || loading) return;
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
    try {
      await persistChat(baseChat);
      if (activeMatterId) {
        const workflowResponse = await fetch("/api/workflows", {
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
          const finalChat = {
            ...baseChat,
            messages: [
              ...next,
              {
                role: "assistant",
                content: `${workflow.content}\n\n## Workflow execution\n\n**Completed**\n${completed || "- Workflow prepared"}\n\n${pending ? `**Needs review / incomplete**\n${pending}` : "**Status:** Completed"}`,
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
          updateActive(() => finalChat);
          await persistChat(finalChat);
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
        const decisionResponse = await fetch('/api/document-tools', {
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
      const documentRequest = Boolean(fileRequest || detectDocumentRequest(clean));

      if (exportPrevious) {
        const generated = await fetch("/api/generate-file", {
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
        updateActive(() => finalChat);
        await persistChat(finalChat);
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
      let data = null;
      const stream = await fetch("/api/chat-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: requestMessages, conversation_id: baseChat.id, matter_id: activeMatterId || null, deep_research: deepResearch }),
      });
      const contentType = stream.headers.get("content-type") || "";
      if (stream.ok && contentType.includes("text/event-stream")) {
        // Live SSE stream: append tokens into the assistant bubble as they arrive.
        updateActive((chat) => ({
          ...chat,
          messages: [...next, { role: "assistant", content: "", streaming: true }],
        }));
        const reader = stream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamError = null;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === "delta" && event.delta) {
                answer += event.delta;
                const cleanStreamingAnswer = sanitizeModelResponse(answer);
                updateActive((chat) => {
                  const messages = [...chat.messages];
                  const last = messages[messages.length - 1];
                  messages[messages.length - 1] = { ...last, content: cleanStreamingAnswer };
                  return { ...chat, messages };
                });
              } else if (event.type === "meta") {
                data = event;
              } else if (event.type === "error") {
                throw new Error(event.message || "Stream failed");
              }
            } catch (parseError) {
              if (parseError instanceof SyntaxError) continue; // partial line
              streamError = parseError;
              break;
            }
          }
          if (streamError) break;
        }
        if (streamError) throw streamError;
        if (!data && !answer) throw new Error("No response was returned.");
        // The completed answer may include server-side source disclosures that
        // are intentionally applied after token generation.
        if (data?.answer) answer = sanitizeModelResponse(data.answer);
        else answer = sanitizeModelResponse(answer);
      } else {
        // Development may return the classic response from this URL because
        // its middleware uses prefix matching. For a missing/failed streaming
        // route (including production deployments), retry the real JSON API.
        const response = stream.ok && contentType.includes("application/json")
          ? stream
          : await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ messages: requestMessages, conversation_id: baseChat.id, matter_id: activeMatterId || null, deep_research: deepResearch }),
            });
        data = await response.json();
        if (!response.ok)
          throw new Error(data?.error?.message || "SallyIP could not respond");
        answer = sanitizeModelResponse(data.choices?.[0]?.message?.content || "No response was returned.");
      }
      let artifact = documentRequest || revisionRequest
        ? makeArtifact({
            title: fileRequest?.title || previousArtifact?.title || titleFor(clean),
            content: answer,
            previous: revisionRequest ? previousArtifact : null,
          })
        : null;
      if (artifact) {
        artifact = await persistArtifact({
          artifact,
          conversationId: baseChat.id,
          revision: revisionRequest,
        });
      }
      let attachments = [];
      if (fileRequest) {
        const generated = await fetch("/api/generate-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...fileRequest,
            title: artifact.title,
            content: artifact.content,
            artifact_id: artifact.id,
            artifact_version: artifact.version,
            conversation_id: baseChat.id,
          }),
        });
        if (generated.ok) {
          const generatedData = await generated.json();
          if (generatedData.file) attachments = [generatedData.file];
        }
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
              : answer,
            artifact,
            attachments,
            provenance: data.sally_meta || {},
          },
        ],
      };
      updateActive(() => finalChat);
      await persistChat(finalChat);
    } catch (error) {
      const finalChat = {
        ...baseChat,
        messages: [
          ...next,
          {
            role: "assistant",
            content: `I couldn't connect right now. ${error.message}`,
            failed: true,
            retryText: clean,
          },
        ],
      };
      updateActive(() => finalChat);
      await persistChat(finalChat).catch(() => {});
    } finally {
      setLoading(false);
    }
  };
  const messages = active?.messages || [];
  const retry = (failed) => {
    if (loading || !failed?.retryText) return;
    const recall = failed.retryText;
    const pruned = { ...active, messages: (active?.messages || []).filter((m) => m !== failed) };
    updateActive(() => pruned);
    persistChat(pruned).catch(() => {});
    setLoading(true);
    setTimeout(() => send(recall), 0);
  };
  useEffect(() => {
    if (!messages.length) return;
    const frame = requestAnimationFrame(() => {
      threadEndRef.current?.scrollIntoView({
        behavior: "auto",
        block: "end",
      });
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
    if (user?.name) return user.name.split(" ")[0];
    return "Judha";
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

  return (
    <div className="beebotLayout">
      {/* Top App Tabs Bar with Window Controls */}
      <header className="beebotTopTabs">
        <div className="beebotTabsList">
          <button className="beebotTabPlus" onClick={newChat} title="New Chat">
            <Plus className="w-3.5 h-3.5" />
          </button>

          <button
            className="beebotTabBtn"
            onClick={() => {
              const name = prompt("Enter Matter / Client Name:");
              if (name) createMatter(name);
            }}
            title="Matter workspace"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block shrink-0" />
            <span>{matters.find((m) => m.id === activeMatterId)?.name || "Judha | Dribbble"}</span>
          </button>

          <button
            className="beebotTabBtn"
            onClick={() => setToolsOpen(true)}
            title="Studio workspace"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shrink-0" />
            <span>Emura Studio</span>
          </button>

          <div className="beebotTabBtn active">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="max-w-[140px] truncate">{active?.title || "BeeBot"}</span>
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

          <button className="beebotTabBtn" onClick={() => setToolsOpen((v) => !v)} title="Workspaces">
            <span>•••</span>
          </button>
        </div>

        {/* Window controls (Minimize, Maximize, Close) */}
        <div className="beebotWindowControls">
          <button className="beebotWindowBtn" title="Minimize"><Minus className="w-3 h-3" /></button>
          <button className="beebotWindowBtn" title="Maximize"><Square className="w-2.5 h-2.5" /></button>
          <button className="beebotWindowBtn" title="Close"><X className="w-3 h-3" /></button>
        </div>
      </header>

      {/* Main Body */}
      <div className="beebotBody">
        {/* Left Sidebar */}
        <aside className="beebotSidebar">
          <div className="beebotBrand" onClick={onHome}>
            <div className="beebotLogoIcon">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="beebotLogoText">BeeBot</div>
          </div>

          <div className="beebotSearchWrap">
            <input
              type="text"
              className="beebotSearchInput"
              placeholder="Search"
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
              className={`beebotNavItem ${activeNav === "library" ? "active" : ""}`}
              onClick={() => {
                setActiveNav("library");
                uploadInputRef.current?.click();
              }}
            >
              <BookOpen className="w-4 h-4" />
              <span>Library</span>
            </button>
            <button
              className={`beebotNavItem ${activeNav === "history" ? "active" : ""}`}
              onClick={() => setActiveNav("history")}
            >
              <Clock3 className="w-4 h-4" />
              <span>History</span>
            </button>
          </nav>

          {/* Grouped History with clean hover delete */}
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
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* User Profile Card (Matches Reference Image) */}
          <div className="beebotUserCard" onClick={logout} title="Click to log out or switch account">
            <div className="beebotUserMeta">
              <div className="beebotUserAvatar">
                {user?.name?.[0] || "J"}
              </div>
              <div className="beebotUserTexts">
                <div className="beebotUserName">{user?.name || "Judha Maygustya"}</div>
                <div className="beebotUserEmail">{user?.email || "judha.design@gmail.com"}</div>
              </div>
            </div>
            <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </div>
        </aside>

        {/* Main Chat Work Area */}
        <main className="beebotMainArea">
          {/* Main Top Bar */}
          <div className="beebotMainTop">
            <div className="relative">
              <button
                className="beebotModelPicker"
                onClick={() => setModelMenuOpen((v) => !v)}
              >
                <div className="beebotModelIcon">
                  <Sparkles className="w-3 h-3" />
                </div>
                <span>iBeeBot 4o</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {modelMenuOpen && (
                <div className="absolute top-11 left-0 z-30 w-56 p-2 rounded-xl bg-white border border-slate-200 shadow-xl space-y-1 text-xs">
                  <div className="px-2 py-1 font-semibold text-slate-400 uppercase text-[10px]">
                    Active AI Engines
                  </div>
                  <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 font-medium">
                    ⚡ OpenRouter Free Router (Active)
                  </div>
                  <div className="p-2 rounded-lg hover:bg-slate-50 text-slate-600">
                    🔬 Nemotron 3.5 Lightning (Legal reasoning)
                  </div>
                  <div className="p-2 rounded-lg hover:bg-slate-50 text-slate-600">
                    📄 Nex N2.5 Pro (Drafting)
                  </div>
                </div>
              )}
            </div>

            <div className="beebotTopRightActions">
              <button className="beebotNewChatBtn" onClick={newChat}>
                <Plus className="w-3.5 h-3.5" />
                <span>New Chat</span>
              </button>
              <div className="beebotAvatarPill" title={user?.name || "User Profile"}>
                <span>{user?.name?.[0] || "J"}</span>
              </div>
            </div>
          </div>

          {/* Empty Hero State or Chat Thread */}
          {messages.length === 0 ? (
            <div className="beebotHero">
              {/* Iridescent 3D Pearl Sphere */}
              <div className="beebotPearlSphere" />

              <div className="beebotHeroGreeting">
                {greeting}, {displayName}
              </div>

              <div className="beebotHeroHeadline">
                How Can I <span>Assist You Today?</span>
              </div>

              {/* Floating Center Composer */}
              <div className="beebotComposerCard">
                <textarea
                  className="beebotComposerInput"
                  placeholder="✦ Initiate a query or send a command to the AI..."
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
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
                      title="Open US Patent Drafting Workspace"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Patent Drafter</span>
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
                  </div>

                  <button
                    className="beebotSendBtn"
                    disabled={!input.trim() || loading}
                    onClick={() => send()}
                  >
                    <Send className="w-3.5 h-3.5" />
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
            </div>
          ) : (
            /* Active Message Thread */
            <div className="beebotThread" ref={threadRef}>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`beebotMessage ${message.role}`}
                >
                  {message.role === "assistant" && (
                    <div className="beebotAvatar assistant">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}

                  <div className="beebotMessageBody">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
                      <span>{message.role === "assistant" ? "SallyIP 4.2 Pro" : "You"}</span>
                    </div>

                    <div className="prose prose-slate max-w-none text-slate-800 text-xs leading-relaxed">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {sanitizeModelResponse(message.content)}
                      </ReactMarkdown>
                    </div>

                    {message.attachments?.length > 0 && (
                      <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2">
                        {message.attachments.map((file) => (
                          <a
                            href={file.url}
                            key={file.id}
                            download={file.name}
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs border border-slate-200"
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

                    {message.role === "assistant" && (
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                        <button
                          onClick={() => navigator.clipboard.writeText(message.content)}
                          className="hover:text-indigo-600 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                    )}
                  </div>

                  {message.role === "user" && (
                    <div className="beebotAvatar user">
                      {user?.initials || "YOU"}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="beebotMessage assistant">
                  <div className="beebotAvatar assistant">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="beebotMessageBody flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full shrink-0 animate-pulse bg-gradient-to-tr from-indigo-500 via-purple-400 to-pink-300 shadow-md shadow-indigo-500/30 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white/90" />
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      {thinkingStages[thinkingStage]?.label || "Thinking…"}
                    </span>
                  </div>
                </div>
              )}

              <div ref={threadEndRef} />

              {/* Bottom Sticky Composer when messages exist */}
              <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-white via-white to-transparent">
                <div className="beebotComposerCard max-w-3xl mx-auto shadow-lg">
                  <textarea
                    className="beebotComposerInput"
                    placeholder="Ask SallyIP a follow-up or command..."
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                  />
                  <div className="beebotComposerBottom">
                    <div className="beebotActionPills">
                      <button
                        type="button"
                        className="beebotPillBtn"
                        onClick={() => uploadInputRef.current?.click()}
                      >
                        <Paperclip />
                      </button>
                      <button
                        type="button"
                        className={`beebotPillBtn ${deepResearch ? "active" : ""}`}
                        onClick={() => setDeepResearch((v) => !v)}
                      >
                        <Telescope />
                        <span>Reasoning</span>
                      </button>
                      <button
                        type="button"
                        className="beebotPillBtn"
                        onClick={() => setActiveWorkspace("patent_draft")}
                        title="Open US Patent Drafting Workspace"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Patent Drafter</span>
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
                    </div>
                    <button
                      className="beebotSendBtn"
                      disabled={!input.trim() || loading}
                      onClick={() => send()}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
                <h3 className="beebotModalTitle">Specialist Legal Workspaces</h3>
                <p className="beebotModalSubtitle">Select a specialized module for active matter analysis.</p>
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
                  <div className="beebotTileName">US Patent Drafter</div>
                </div>
                <div className="beebotTileDesc">
                  § 101 Alice screen, § 112 antecedent basis checks, claims, and full USPTO specification.
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
                  <div className="beebotTileName">Contract Review</div>
                </div>
                <div className="beebotTileDesc">
                  Automated contract redlining, risk flags, and institutional playbook enforcement.
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
                    <Sparkles className="w-4 h-4 text-cyan-600" />
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
                  setActiveWorkspace("knowledge_graph");
                }}
              >
                <div className="beebotTileHeader">
                  <div className="beebotTileIcon">
                    <FolderKanban className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="beebotTileName">Knowledge Graph & Citations</div>
                </div>
                <div className="beebotTileDesc">
                  Patent families, citation ledgers, prosecution histories, and litigation evidence.
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
      </Suspense>
        </main>
      </div>
    </div>
  );
}
