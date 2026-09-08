import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ThinkingOrb } from "thinking-orbs";
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
import {
  ArrowRight,
  ChevronDown,
  Copy,
  Check,
  Download,
  FileText,
  FolderKanban,
  LogOut,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  Send,
  SlidersHorizontal,
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
  const [user, setUser] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [editingMessage, setEditingMessage] = useState(null);
  const [matters, setMatters] = useState([]);
  const [activeMatterId, setActiveMatterId] = useState("");
  const [deepResearch, setDeepResearch] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [uploadedSource, setUploadedSource] = useState(null);
  const [toolsOpen, setToolsOpen] = useState(false);
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
        const data = await response.json();
        if (!response.ok) throw new Error("auth");
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) onAuthRequired();
      });
    return () => {
      cancelled = true;
    };
  }, [onAuthRequired]);
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
        if (response.status === 401) {
          onAuthRequired();
          return Promise.reject();
        }
        return response.ok ? response.json() : Promise.reject();
      })
      .then((remote) => {
        if (cancelled) return;
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
        const available = loaded.length ? loaded : [makeChat()];
        setChats(available);
        setActiveId(available[0].id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [onAuthRequired]);
  const logout = async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    }).catch(() => {});
    localStorage.removeItem(STORAGE_KEY);
    onAuthRequired();
  };
  const persistChat = async (chat) => {
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: chat.id,
        title: chat.title,
        messages: chat.messages,
      }),
    });
    if (response.status === 401) onAuthRequired();
    if (!response.ok) throw new Error("Could not save this conversation");
    return response;
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
  return (
    <div className="sallyChat">
      <aside className="chatRail">
        <button className="chatBrand" onClick={onHome}>
          <Mark />
          <span>
            <b>SallyIP</b>
            <small>Labs</small>
          </span>
        </button>
        <button className="newChat" onClick={newChat}>
          <Plus /> New chat
        </button>
        <div className="matterSwitcher">
          <div><FolderKanban/><span>ACTIVE MATTER</span><button onClick={createMatter}>+</button></div>
          <select value={activeMatterId} onChange={(event) => setActiveMatterId(event.target.value)}>
            <option value="">No matter selected</option>
            {matters.map((matter) => <option value={matter.id} key={matter.id}>{matter.name}</option>)}
          </select>
        </div>
        <div className="chatHistory">
          <small>RECENT</small>
          {chats.map((chat) => (
            <div
              className={`chatHistoryRow ${chat.id === activeId ? "active" : ""}`}
              key={chat.id}
            >
              {renamingId === chat.id ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    saveRename(chat.id);
                  }}
                >
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(event) => setRenameValue(event.target.value)}
                    onBlur={() => saveRename(chat.id)}
                    maxLength={80}
                  />
                  <button type="submit" aria-label="Save name">
                    <Check />
                  </button>
                </form>
              ) : (
                <>
                  <button
                    className="chatHistoryOpen"
                    onClick={() => openChat(chat.id)}
                  >
                    <MessageSquare />
                    <span>{chat.title}</span>
                  </button>
                  <div className="chatHistoryActions">
                    <button
                      onClick={() => beginRename(chat)}
                      aria-label="Rename conversation"
                    >
                      <Pencil />
                    </button>
                    <button
                      onClick={() => deleteChat(chat.id)}
                      aria-label="Delete conversation"
                    >
                      <Trash2 />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="chatUser">
          <span>{user?.initials || "S"}</span>
          <div>
            <b>{user?.name || "SallyIP researcher"}</b>
            <small>Research workspace</small>
          </div>
          <button className="chatLogout" onClick={logout} aria-label="Log out">
            <LogOut />
          </button>
        </div>
      </aside>
      <main className="chatMain">
        <header className="chatTop">
          <button className="mobileChatLogo" onClick={onHome}>
            <Mark />
          </button>
          <button className="modelPicker">
            <span>SallyIP 4.1 Pro</span>
            <small>Research model</small>
            <ChevronDown />
          </button>
          <div>
            <span className="modelLive">
              <i /> ONLINE
            </span>
            <button className="iconBtn" onClick={onHome}>
              <X />
            </button>
          </div>
        </header>
        <section
          ref={threadRef}
          className={`chatThread ${messages.length ? "hasMessages" : ""}`}
        >
          {messages.length === 0 ? (
            <motion.div
              className="chatWelcome"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Mark className="chatHeroMark" />
              <span>SALLYIP 4.1 PRO</span>
              <h1>
                What are we
                <br />
                <em>researching today?</em>
              </h1>
              <p>
                Explore patents, trademarks, copyright, prior art, and
                intellectual-property strategy with a specialist AI research
                partner.
              </p>
              <div className="promptGrid">
                {suggestions.map((text, index) => (
                  <button key={text} onClick={() => send(text)}>
                    <span>0{index + 1}</span>
                    {text}
                    <ArrowRight />
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="messageList">
              {messages.map((message, index) => (
                <motion.article
                  className={`chatMessage ${message.role}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={index}
                >
                  {message.role === "assistant" ? (
                    <Mark />
                  ) : (
                    <span className="messageAvatar">
                      {user?.initials || "YOU"}
                    </span>
                  )}
                  <div>
                    <small>
                      {message.role === "assistant" ? "SALLYIP 4.1 PRO" : "YOU"}
                    </small>
                    {editingMessage?.index === index ? (
                      <div className="messageEditor">
                        <textarea
                          autoFocus
                          value={editingMessage.value}
                          onChange={(event) =>
                            setEditingMessage({
                              index,
                              value: event.target.value,
                            })
                          }
                        />
                        <div>
                          <button onClick={() => setEditingMessage(null)}>
                            Cancel
                          </button>
                          <button
                            className="saveMessage"
                            onClick={saveMessageEdit}
                          >
                            <Check /> Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="markdownAnswer">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {sanitizeModelResponse(message.content)}
                        </ReactMarkdown>
                      </div>
                    )}
                    {editingMessage?.index !== index && (
                      <div className="messageActions">
                        <button
                          className="copyAnswer"
                          onClick={() =>
                            setEditingMessage({ index, value: message.content })
                          }
                        >
                          <Pencil /> Edit
                        </button>
                        {message.role === "assistant" && (
                          <button
                            className="copyAnswer"
                            onClick={() =>
                              navigator.clipboard.writeText(message.content)
                            }
                          >
                            <Copy /> Copy
                          </button>
                        )}
                      </div>
                    )}
                    {message.attachments?.length > 0 && (
                      <div className="generatedFiles">
                        {message.attachments.map((file) => (
                          <a href={file.url} key={file.id} download={file.name}>
                            <span><FileText /></span>
                            <div><b>{file.name}</b><small>{file.format?.toUpperCase()} · {file.size ? `${Math.max(1, Math.round(file.size / 1024))} KB` : "Ready"}</small></div>
                            <Download />
                          </a>
                        ))}
                      </div>
                    )}
                    {message.failed && message.retryText && (
                      <button
                        className="retryBtn"
                        onClick={() => retry(message)}
                        disabled={loading}
                        aria-label="Retry this message"
                      >
                        <RotateCw className={loading ? "spin" : ""} /> Retry
                      </button>
                    )}
                    {message.role === "assistant" && message.provenance?.route && (
                      <div className="answerProvenance">
                        <div><Telescope/><b>{message.provenance.route.task_class.replaceAll("_", " ")}</b><span>{message.provenance.verification?.source_basis === "retrieved_source" ? `${message.provenance.verification.sources_retrieved} retrieved sources` : "Model knowledge · verification required"}</span></div>
                        {message.provenance.sources?.length > 0 && <div className="sourceChips">{message.provenance.sources.map((source,index) => source.official_url ? <a href={source.official_url} target="_blank" rel="noreferrer" key={source.passage_id}>S{index+1} · {source.citation || source.title} · {source.locator}</a> : <span key={source.passage_id}>S{index+1} · {source.citation || source.title} · {source.locator}</span>)}</div>}
                      </div>
                    )}
                  </div>
                </motion.article>
              ))}
              {loading && (
                <motion.article
                  className="chatMessage assistant orbThinkingMessage"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="thinkingOrbShell">
                    <ThinkingOrb
                      state={thinkingStages[thinkingStage].state}
                      size={64}
                      speed={1.7}
                      theme="dark"
                    />
                  </div>
                  <div className="orbThinkingCopy">
                    <small>SALLYIP 4.1 PRO</small>
                    <motion.span
                      key={thinkingStage}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {thinkingStages[thinkingStage].label}
                    </motion.span>
                  </div>
                </motion.article>
              )}
              <div ref={threadEndRef} aria-hidden="true" />
            </div>
          )}
        </section>
        <div className="composerWrap">
          <div className={`workspaceDock ${toolsOpen ? "open" : ""}`}>
            <button
              className="workspaceDockToggle"
              onClick={() => setToolsOpen(value => !value)}
              aria-expanded={toolsOpen}
            >
              <SlidersHorizontal />
              <span>Advanced Review</span>
              <small>{activeMatterId ? "Inspect workflow details" : "Select a matter first"}</small>
              <ChevronDown />
            </button>
            {toolsOpen && (
              <motion.div
                className="workspaceToolGrid"
                initial={{ opacity: 0, y: 8, scale: .985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
              >
                <Suspense fallback={<span className="workspaceLoading">Loading workspaces…</span>}>
                  <IpToolsPanel matterId={activeMatterId} onResult={recordToolResult}/>
                  <ClaimChartWorkspace matterId={activeMatterId} onResult={recordToolResult}/>
                  <TrademarkClearanceWorkspace matterId={activeMatterId} onResult={recordToolResult}/>
                  <PatentFamilyWorkspace matterId={activeMatterId} onResult={recordToolResult}/>
                  <ProsecutionHistoryWorkspace matterId={activeMatterId} onResult={recordToolResult}/>
                  <IpKnowledgeGraphWorkspace matterId={activeMatterId}/>
                  <PriorArtWorkspace matterId={activeMatterId} onResult={recordToolResult}/>
                  <NoveltyWorkspace matterId={activeMatterId} onResult={recordToolResult}/>
                  <InventiveStepWorkspace matterId={activeMatterId} onResult={recordToolResult}/>
                  <FtoWorkspace matterId={activeMatterId} onResult={recordToolResult}/>
                  <TrademarkIntelligenceWorkspace matterId={activeMatterId} onResult={recordToolResult}/>
                  <LitigationEvidenceWorkspace matterId={activeMatterId} onResult={recordToolResult}/>
                  <VerificationDeskWorkspace matterId={activeMatterId} onResult={recordToolResult}/>
                  <PlaybookWorkspace matterId={activeMatterId} conversationId={active?.id} onResult={recordToolResult}/>
                  <ContractWorkspace matterId={activeMatterId} onResult={recordToolResult}/>
                </Suspense>
              </motion.div>
            )}
          </div>
          <div className="composer">
            <input ref={uploadInputRef} className="chatFileInput" type="file" accept=".pdf,.docx,.txt,.md,.csv,.xlsx" onChange={(event) => ingestDocument(event.target.files?.[0])}/>
            <button aria-label="Attach file" disabled={ingesting} onClick={() => uploadInputRef.current?.click()}>
              <Paperclip />
            </button>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
              placeholder="Ask SallyIP 4.1 Pro"
              rows="1"
            />
            <button
              className="sendChat"
              disabled={!input.trim() || loading}
              onClick={() => send()}
            >
              <Send />
            </button>
          </div>
          {(ingesting || uploadedSource) && <div className="ingestionStatus"><FileText/><span>{ingesting ? "Extracting and indexing document…" : `${uploadedSource.name} · ${uploadedSource.passage_count} pinpoint passages ready`}</span></div>}
          <button className={`deepResearchToggle ${deepResearch ? "active" : ""}`} onClick={() => setDeepResearch(value => !value)}><Telescope/>{deepResearch ? "Deep Research on" : "Deep Research"}</button>
          <small>
            SallyIP provides AI-assisted legal research and drafting.
            Professional review may be appropriate before reliance or filing.
          </small>
        </div>
      </main>
    </div>
  );
}
