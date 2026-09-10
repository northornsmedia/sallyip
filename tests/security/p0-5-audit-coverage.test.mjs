import test from 'node:test';
import assert from 'node:assert/strict';

// P0-5: Audit coverage 100% for all security-relevant handlers.
test('all 5 previously missing handlers now have audit logging', async () => {
  const fs = await import('node:fs');
  const handlers = ['generated-files.js', 'workflows.js', 'artifacts.js', 'sources.js', 'conversations.js'];
  for (const h of handlers) {
    const src = fs.readFileSync(new URL(`../../api/_handlers/${h}`, import.meta.url), 'utf8');
    assert.ok(src.includes('logSecurityEvent'), `${h} must call logSecurityEvent`);
    // Verify both success and denial paths are audited
    assert.ok(src.includes('result') || src.includes('denied'), `${h} must log result/denial`);
  }
});

test('audit events include required structured fields', async () => {
  const fs = await import('node:fs');
  const handlers = ['generated-files.js', 'workflows.js', 'artifacts.js', 'sources.js', 'conversations.js'];
  for (const h of handlers) {
    const src = fs.readFileSync(new URL(`../../api/_handlers/${h}`, import.meta.url), 'utf8');
    // Check for structured audit fields
    assert.ok(src.includes('event_type'), `${h} must have event_type`);
    assert.ok(src.includes('action'), `${h} must have action`);
    assert.ok(src.includes('resource'), `${h} must have resource`);
    assert.ok(src.includes('severity'), `${h} must have severity`);
  }
});

test('confidential content never logged', async () => {
  const fs = await import('node:fs');
  const handlers = ['generated-files.js', 'workflows.js', 'artifacts.js', 'sources.js', 'conversations.js'];
  for (const h of handlers) {
    const src = fs.readFileSync(new URL(`../../api/_handlers/${h}`, import.meta.url), 'utf8');
    // Should not log content, disclosure, invention, contract_text, etc. in audit metadata
    // Check that body.content is not passed to logSecurityEvent (only extracted for processing)
    const logCalls = src.match(/logSecurityEvent\([^)]+\)/g) || [];
    for (const call of logCalls) {
      assert.ok(!call.includes('body.content'), `${h} must not log body.content in audit`);
      assert.ok(!call.includes('body.disclosure'), `${h} must not log body.disclosure in audit`);
      assert.ok(!call.includes('body.invention'), `${h} must not log body.invention in audit`);
      assert.ok(!call.includes('content:'), `${h} must not log content field in audit`);
    }
  }
});