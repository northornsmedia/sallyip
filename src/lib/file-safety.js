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

export function sanitizeFilename(name = '') {
  return String(name || 'upload')
    .replace(/["\r\n\\/:*?<>|]+/g, '_')
    .replace(/^\.+/, '_')
    .slice(0, 180) || 'upload';
}

export function validateUpload({ filename, mimeType, sizeBytes }) {
  const safeName = sanitizeFilename(filename);
  const ext = ('.' + String(safeName).split('.').pop()).toLowerCase();
  if (FILE_POLICY.blockedExtensions.includes(ext)) {
    return { ok: false, code: 'BLOCKED_TYPE', message: `Archives/executables are blocked (${ext}). Upload the extracted PDF/DOCX/TXT instead.` };
  }
  if (mimeType && !FILE_POLICY.acceptedMime.includes(mimeType) && mimeType !== 'application/octet-stream') {
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
