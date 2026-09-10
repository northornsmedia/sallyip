// Temporal + version validation — Phase 5B. Qualify when currentness unknown; never invent.

export function validateAuthorityCurrency(authority = {}, { now = new Date() } = {}) {
  const {
    effective_date, publication_date, version, superseded_by,
    jurisdiction, retrieved_at, authority_status,
  } = authority;
  const issues = [];
  if (!jurisdiction) issues.push('missing jurisdiction');
  if (!effective_date && !publication_date) issues.push('missing effective/publication date');
  if (superseded_by) {
    return {
      verdict: 'SUPERSEDED',
      qualify: true,
      issues: [...issues, `superseded by ${superseded_by}`],
      user_message: `This authority was superseded by ${superseded_by}. Do not rely on it as current law.`,
    };
  }
  if (String(authority_status || '').toLowerCase().includes('repealed') ||
      String(authority_status || '').toLowerCase().includes('withdrawn')) {
    return { verdict: 'NOT_CURRENT', qualify: true, issues, user_message: `Authority status is ${authority_status}. Verify current law.` };
  }
  if (!retrieved_at) issues.push('retrieved_at unknown — staleness cannot be established');
  if (issues.length) {
    return {
      verdict: 'QUALIFY',
      qualify: true,
      issues,
      user_message: 'Current status could not be established from stored metadata. Treat as background only; verify against the official source before filing or advising.',
    };
  }
  const retrieved = new Date(retrieved_at);
  const ageDays = (now - retrieved) / 86400000;
  if (Number.isFinite(ageDays) && ageDays > 180) {
    return { verdict: 'QUALIFY_STALE', qualify: true, issues: [`retrieved ${Math.round(ageDays)} days ago`], user_message: 'Authority was retrieved over 180 days ago. Re-verify currency.' };
  }
  return { verdict: 'CURRENT_OK', qualify: false, issues: [], version: version || null };
}
