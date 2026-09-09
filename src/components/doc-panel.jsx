import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Download, FileText, X } from "lucide-react";
import { buildExportPayload, DOC_FORMATS } from "../lib/doc-export.js";

export default function DocPanel({ doc, onClose, onExported }) {
  const [busyFormat, setBusyFormat] = useState(null);
  const [error, setError] = useState("");
  const [files, setFiles] = useState([]);
  const bodyRef = useRef(null);
  const live = Boolean(doc?.live);

  useEffect(() => {
    setFiles([]);
    setError("");
  }, [doc?.artifact?.id, doc?.title]);

  useEffect(() => {
    if (live && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [doc?.content, live]);

  if (!doc) return null;

  const doExport = async (format) => {
    if (!doc.content?.trim() || busyFormat) return;
    setBusyFormat(format);
    setError("");
    try {
      const response = await fetch("/api/generate-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildExportPayload(doc, format)),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.file) {
        throw new Error(data?.message || data?.error || "Export failed");
      }
      setFiles((prev) => [data.file, ...prev].slice(0, 5));
      onExported?.(data.file);
      const a = document.createElement("a");
      a.href = data.file.url;
      a.download = data.file.name || `document.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyFormat(null);
    }
  };

  return (
    <aside className="docPanel">
      <div className="docPanelHead">
        <div className="docPanelTitle">
          <FileText className="w-4 h-4" />
          <div>
            <strong>{doc.title || "Document"}</strong>
            <small>
              {doc.version ? `v${doc.version}` : ""} {live ? "· writing live…" : "· final"}
            </small>
          </div>
        </div>
        <button type="button" className="docPanelClose" onClick={onClose} title="Close panel">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="docPanelBody" ref={bodyRef}>
        <div className="prose prose-slate max-w-none text-slate-800 text-xs leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {doc.content || "*Waiting for content…*"}
          </ReactMarkdown>
          {live && <span className="beebotStreamingCursor" />}
        </div>
      </div>

      <div className="docPanelFoot">
        <div className="docPanelExports">
          {DOC_FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              disabled={!doc.content?.trim() || live || busyFormat}
              onClick={() => doExport(f.id)}
              title={live ? "Available when writing finishes" : `Download as ${f.label}`}
            >
              <Download className="w-3 h-3" />
              {busyFormat === f.id ? "…" : f.label}
            </button>
          ))}
        </div>
        {error && <div className="docPanelError">{error}</div>}
        {files.length > 0 && (
          <div className="docPanelFiles">
            {files.map((file) => (
              <a key={file.id || file.url} href={file.url} download={file.name}>
                <FileText className="w-3 h-3" />
                {file.name}
              </a>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
