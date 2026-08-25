import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { neon } from '@neondatabase/serverless'
import { buildGenerateFileToolCall, classifyDocumentIntent, resolveArtifactReference } from '../src/lib/document-tool-service.js'

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
const sql = neon(process.env.DATABASE_URL)
const [user] = await sql`SELECT id FROM users ORDER BY created_at LIMIT 1`
assert.ok(user, 'A test user is required')
const conversationId = randomUUID()
const artifactId = randomUUID()
try {
  await sql`INSERT INTO conversations(id,user_id,title) VALUES(${conversationId},${user.id},'Artifact export integration')`
  await sql`INSERT INTO artifacts(id,user_id,conversation_id,title,document_type,active_version) VALUES(${artifactId},${user.id},${conversationId},'IP Licence Agreement','agreement',2)`
  await sql`INSERT INTO artifact_versions(artifact_id,version,content) VALUES(${artifactId},1,'VERSION ONE - governing law England'),(${artifactId},2,'VERSION TWO - governing law Ireland')`
  await sql`UPDATE conversations SET last_active_artifact_id=${artifactId} WHERE id=${conversationId}`

  const active = await resolveArtifactReference(sql,user.id,conversationId)
  assert.equal(active.version,2)
  assert.match(active.content,/VERSION TWO/)
  const historical = await resolveArtifactReference(sql,user.id,conversationId,{artifact_version:1})
  assert.equal(historical.version,1)
  assert.match(historical.content,/VERSION ONE/)
  const toolCall = buildGenerateFileToolCall(classifyDocumentIntent('Export version 1 as PDF'),historical)
  assert.equal(toolCall.arguments.artifact_version,1)
  assert.equal(toolCall.arguments.content,undefined,'document content must be resolved inside the generator')
  assert.equal(await resolveArtifactReference(sql,randomUUID(),conversationId),null,'another user cannot resolve the artifact')
  console.log('document artifact integration passed')
} finally {
  await sql`DELETE FROM conversations WHERE id=${conversationId} AND user_id=${user.id}`
}

