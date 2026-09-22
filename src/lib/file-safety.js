// File safety — Phase 10. Single source of truth for upload constraints.
// Enforced server-side; UI limits must mirror these, never replace them.

export const FILE_POLICY = {
  maxPdfBytes: 25 * 1024 * 1024,
  maxDocumentBytes: 25 * 1024 * 1024,
  maxRequestBytes: 200 * 1024,
  acceptedMime: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
  ],
  blockedExtensions: ['.exe', '.bat', '.cmd', '.ps1', '.js', '.vbs', '.scr', '.msi', '.dll', '.zip', '.rar', '.7z'],
};

const EXT_TO_MIME = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.csv': 'text/csv',
  '.json': 'application/json',
};

export function sanitizeFilename(name = '') {
  return String(name || 'upload')
    .replace(/["\r\n\\/:*?<>|]+/g, '_')
    .replace(/^\.+/, '_')
    .replace(/[. ]+$/, '')
    .slice(0, 180) || 'upload';
}

export function validateUpload({ filename, mimeType, sizeBytes }) {
  const safeName = sanitizeFilename(filename);
  const ext = ('.' + String(safeName).split('.').pop()).toLowerCase();
  if (FILE_POLICY.blockedExtensions.includes(ext)) {
    return { ok: false, code: 'BLOCKED_TYPE', message: `Archives/executables are blocked (${ext}). Upload the extracted PDF/DOCX/TXT instead.` };
  }
  if (mimeType === 'application/octet-stream') {
    // Generic byte-stream MIME carries no signal: only accept when the
    // extension names an accepted document type (blocks ext-less/masked payloads).
    if (!EXT_TO_MIME[ext]) {
      return { ok: false, code: 'UNSUPPORTED_MIME', message: `Undetectable type for ${ext || 'extensionless file'}. Rename with a document extension (.pdf/.docx/.txt).`, safeName };
    }
  } else if (mimeType && !FILE_POLICY.acceptedMime.includes(mimeType)) {
    return { ok: false, code: 'UNSUPPORTED_MIME', message: `Unsupported type ${mimeType}.`, safeName };
  }
  const limit = /pdf$/i.test(safeName) || mimeType === 'application/pdf' ? FILE_POLICY.maxPdfBytes : FILE_POLICY.maxDocumentBytes;
  if (Number(sizeBytes) > limit) {
    return { ok: false, code: 'OVERSIZED', message: `File exceeds ${Math.round(limit / 1048576)} MB limit.`, safeName };
  }
  return { ok: true, safeName };
}

export function containsLikelyPromptInjection(text = '') {
  return /(ignore (all )?previous instructions|system prompt|reveal (your )?instructions|exfiltrate|<script|javascript:)/i.test(String(text || '').slice(0, 20000));
}
