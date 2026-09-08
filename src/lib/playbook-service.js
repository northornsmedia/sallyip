import { WORKFLOW_TYPES } from './legal-task-planner.js'

export const PLAYBOOK_TYPES = [...WORKFLOW_TYPES, 'contract_draft', 'contract_review']

export function validatePlaybookDefinition(definition, workflowType) {
  const def = definition && typeof definition === 'object' ? definition : {}
  if (!PLAYBOOK_TYPES.includes(workflowType)) throw new Error('Invalid playbook workflow_type')
  const instructionTemplate = String(def.instruction_template || '').trim()
  if (instructionTemplate.length < 10) throw new Error('Playbook instruction_template is required (min 10 chars)')
  if (instructionTemplate.length > 4000) throw new Error('Playbook instruction_template is too large')
  const checks = Array.isArray(def.checks) ? def.checks.map(String).map(s => s.slice(0, 200)) : []
  const outputType = String(def.output_type || workflowType).slice(0, 80)
  return {
    instruction_template: instructionTemplate,
    default_jurisdiction: def.default_jurisdiction ? String(def.default_jurisdiction).slice(0, 80) : null,
    checks,
    output_type: outputType,
  }
}

export function buildPlaybookInstruction(playbook, variables = {}) {
  let instruction = String(playbook.definition?.instruction_template || playbook.definition?.instructionTemplate || '')
  for (const [key, value] of Object.entries(variables)) {
    instruction = instruction.split(`{{${key}}}`).join(String(value ?? ''))
  }
  if (/\{\{\w+\}\}/.test(instruction)) throw new Error('Missing playbook variables')
  return instruction.trim()
}

async function playbookForUser(sql, userId, playbookId) {
  const [playbook] = await sql`SELECT * FROM legal_playbooks WHERE id=${playbookId} AND user_id=${userId}`
  if (!playbook) throw new Error('Playbook not found')
  return playbook
}

export async function listPlaybooks(sql, userId) {
  const rows = await sql`SELECT p.*, (SELECT max(version) FROM legal_playbook_versions v WHERE v.playbook_id=p.id) AS latest_version, (SELECT count(*)::int FROM legal_workflow_runs r WHERE r.playbook_id=p.id) AS run_count FROM legal_playbooks p WHERE p.user_id=${userId} ORDER BY p.updated_at DESC`
  return { playbooks: rows }
}

export async function getPlaybook(sql, userId, playbookId) {
  const playbook = await playbookForUser(sql, userId, playbookId)
  const versions = await sql`SELECT id, version, definition, created_by, created_at FROM legal_playbook_versions WHERE playbook_id=${playbook.id} ORDER BY version DESC LIMIT 20`
  return { playbook, versions }
}

export async function createPlaybook(sql, userId, body) {
  const name = String(body.name || '').trim()
  if (name.length < 2) throw new Error('Playbook name is required')
  const definition = validatePlaybookDefinition(body.definition, body.workflow_type)
  const [playbook] = await sql`INSERT INTO legal_playbooks(user_id, name, description, workflow_type, definition, default_jurisdiction, is_template) VALUES(${userId}, ${name.slice(0, 160)}, ${String(body.description || '').slice(0, 2000)}, ${body.workflow_type}, ${JSON.stringify(definition)}::jsonb, ${definition.default_jurisdiction}, ${Boolean(body.is_template)}) RETURNING *`
  await sql`INSERT INTO legal_playbook_versions(playbook_id, version, definition, created_by) VALUES(${playbook.id}, 1, ${JSON.stringify(definition)}::jsonb, ${userId})`
  return getPlaybook(sql, userId, playbook.id)
}

export async function updatePlaybook(sql, userId, playbookId, body) {
  const playbook = await playbookForUser(sql, userId, playbookId)
  const definition = validatePlaybookDefinition(body.definition || playbook.definition, body.workflow_type || playbook.workflow_type)
  const [row] = await sql`SELECT coalesce(max(version), 0) + 1 AS next_version FROM legal_playbook_versions WHERE playbook_id=${playbook.id}`
  await sql`UPDATE legal_playbooks SET name=${String(body.name || playbook.name).slice(0, 160)}, description=${String(body.description ?? playbook.description).slice(0, 2000)}, workflow_type=${body.workflow_type || playbook.workflow_type}, definition=${JSON.stringify(definition)}::jsonb, default_jurisdiction=${definition.default_jurisdiction}, updated_at=now() WHERE id=${playbook.id}`
  await sql`INSERT INTO legal_playbook_versions(playbook_id, version, definition, created_by) VALUES(${playbook.id}, ${row.next_version}, ${JSON.stringify(definition)}::jsonb, ${userId})`
  return getPlaybook(sql, userId, playbook.id)
}
