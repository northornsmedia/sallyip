const MAX_SOURCES = 2000

export function validateColumns(columns) {
  if (!Array.isArray(columns) || !columns.length) throw new Error('At least one column is required')
  if (columns.length > 24) throw new Error('Too many columns (max 24)')
  return columns.map((c, i) => {
    const key = String(c.key || `col_${i + 1}`).toLowerCase().replace(/[^a-z0-9_]+/g, '_').slice(0, 40)
    const label = String(c.label || key).slice(0, 120)
    if (!key) throw new Error(`Column ${i + 1} needs a key`)
    let pattern = null
    if (c.pattern) {
      try { new RegExp(c.pattern, 'i'); pattern = String(c.pattern).slice(0, 500) }
      catch { throw new Error(`Column "${label}" has an invalid pattern`) }
    }
    const keywords = Array.isArray(c.keywords) ? c.keywords.map(String).map(s => s.slice(0, 80)).filter(Boolean).slice(0, 8) : []
    return { key, label, pattern, keywords }
  })
}

export function extractCell(text, column) {
  const content = String(text || '')
  if (column.pattern) {
    const m = content.match(new RegExp(column.pattern, 'i'))
    if (m) return (m[1] !== undefined ? m[1] : m[0]).trim().slice(0, 500)
  }
  for (const kw of column.keywords) {
    const idx = content.toLowerCase().indexOf(kw.toLowerCase())
    if (idx >= 0) return content.slice(Math.max(0, idx - 60), idx + kw.length + 120).replace(/\s+/g, ' ').trim().slice(0, 500)
  }
  return null
}

async function tableForUser(sql, userId, tableId) {
  const [t] = await sql`SELECT * FROM vault_review_tables WHERE id=${tableId} AND user_id=${userId}`
  if (!t) throw new Error('Review table not found')
  return t
}

export async function listReviewTables(sql, userId, matterId) {
  const tables = await sql`SELECT t.*, (SELECT count(*)::int FROM vault_review_rows r WHERE r.table_id=t.id) AS row_count FROM vault_review_tables t WHERE t.user_id=${userId} AND (${matterId}::uuid IS NULL OR t.matter_id=${matterId}) ORDER BY t.updated_at DESC LIMIT 100`
  return { tables }
}

export async function getReviewTable(sql, userId, tableId) {
  const table = await tableForUser(sql, userId, tableId)
  const rows = await sql`SELECT r.*, s.title source_title FROM vault_review_rows r LEFT JOIN legal_sources s ON s.id=r.source_id WHERE r.table_id=${table.id} ORDER BY s.title NULLS LAST, r.created_at LIMIT 2000`
  return { table, rows }
}

export async function createReviewTable(sql, userId, body) {
  const [matter] = await sql`SELECT id FROM matters WHERE id=${body.matter_id} AND user_id=${userId}`
  if (!matter) throw new Error('Matter not found')
  const name = String(body.name || '').trim()
  if (name.length < 2) throw new Error('Table name is required')
  const columns = validateColumns(body.columns || [])
  const [table] = await sql`INSERT INTO vault_review_tables(user_id, matter_id, name, columns) VALUES(${userId}, ${matter.id}, ${name.slice(0, 160)}, ${JSON.stringify(columns)}::jsonb) RETURNING *`
  return { table, rows: [] }
}

export async function runReviewTable(sql, userId, tableId) {
  const table = await tableForUser(sql, userId, tableId)
  const columns = table.columns || []
  await sql`UPDATE vault_review_tables SET status='running', updated_at=now() WHERE id=${table.id}`
  try {
    const sources = await sql`SELECT s.id, s.title FROM legal_sources s WHERE s.user_id=${userId} AND s.matter_id=${table.matter_id} ORDER BY s.created_at LIMIT ${MAX_SOURCES}`
    let extracted = 0
    for (const source of sources) {
      const passages = await sql`SELECT content FROM source_passages WHERE source_id=${source.id} ORDER BY created_at LIMIT 200`
      const joined = passages.map(p => p.content).join('\n').slice(0, 60000)
      const cells = {}
      let hits = 0
      for (const col of columns) {
        const value = extractCell(joined, col)
        cells[col.key] = value
        if (value) hits++
      }
      await sql`INSERT INTO vault_review_rows(table_id, source_id, cells, status) VALUES(${table.id}, ${source.id}, ${JSON.stringify(cells)}::jsonb, ${hits ? 'extracted' : 'needs_review'}) ON CONFLICT(table_id, source_id) DO UPDATE SET cells=excluded.cells, status=excluded.status`
      if (hits) extracted++
    }
    await sql`UPDATE vault_review_tables SET status='ready', result_summary=${`${extracted} of ${sources.length} sources yielded at least one data point.`}, updated_at=now() WHERE id=${table.id}`
    return getReviewTable(sql, userId, table.id)
  } catch (error) {
    await sql`UPDATE vault_review_tables SET status='failed', result_summary=${String(error.message).slice(0, 500)}, updated_at=now() WHERE id=${table.id}`
    throw error
  }
}
