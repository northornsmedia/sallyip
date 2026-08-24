import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ThinkingOrb } from "thinking-orbs";
import {
  ArrowRight,
  ChevronDown,
  Copy,
  Check,
  Download,
  FileText,
  LogOut,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";

const STORAGE_KEY = "sallyip-chat-history-v1";
const suggestions = [
  "Summarize a patent claim",
  "Compare two trademarks",
  "Build an IP research plan",
  "Explain prior-art searching",
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
  if (!/\b(create|generate|make|export|prepare|download|convert|provide|give|turn .+ into)\b/i.test(text)) return null;
  const match = text.match(/\b(pdf|docx?|word document|pptx?|powerpoint|xlsx?|excel|csv|markdown|md|html|json|txt|text file)\b/i);
  if (!match) return null;
  const value = match[1].toLowerCase();
  const format = value === "doc" || value === "word document" ? "docx" : value === "ppt" || value === "powerpoint" ? "pptx" : value === "xls" || value === "excel" ? "xlsx" : value === "markdown" ? "md" : value === "text file" ? "txt" : value;
  return { format, title: titleFor(text).replace(/\.(pdf|docx?|pptx?|xlsx?|csv|md|html|json|txt)$/i, "") };
};
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
  const active = useMemo(
    () => chats.find((chat) => chat.id === activeId) || chats[0],
    [chats, activeId],
  );
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
      const fileRequest = detectFileRequest(clean);
      const previousArtifact = latestArtifact(active?.messages || []);
      const revisionRequest = Boolean(
        previousArtifact && detectRevisionRequest(clean),
      );
      const exportPrevious = Boolean(
        fileRequest &&
          previousArtifact &&
          referencesPreviousArtifact(clean) &&
          !revisionRequest,
      );
      const documentRequest = Boolean(fileRequest || detectDocumentRequest(clean));

      if (exportPrevious) {
        const generated = await fetch("/api/generate-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...fileRequest,
            title: previousArtifact.title,
            content: previousArtifact.content,
            conversation_id: baseChat.id,
          }),
        });
        const generatedData = await generated.json();
        if (!generated.ok)
          throw new Error(generatedData?.error || "The file generator could not finish");
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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: requestMessages }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.error?.message || "SallyIP could not respond");
      const answer = data.choices?.[0]?.message?.content || "No response was returned.";
      const artifact = documentRequest || revisionRequest
        ? makeArtifact({
            title: fileRequest?.title || previousArtifact?.title || titleFor(clean),
            content: answer,
            previous: revisionRequest ? previousArtifact : null,
          })
        : null;
      let attachments = [];
      if (fileRequest) {
        const generated = await fetch("/api/generate-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...fileRequest,
            title: artifact.title,
            content: artifact.content,
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
                          {message.content}
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
            </div>
          )}
        </section>
        <div className="composerWrap">
          <div className="composer">
            <button aria-label="Attach file">
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
          <small>
            SallyIP can make mistakes. Verify important legal information with
            authoritative sources.
          </small>
        </div>
      </main>
    </div>
  );
}
