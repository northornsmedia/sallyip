export async function getPassage(sql, userId, passageId) {
  const [row] = await sql`
    SELECT sp.id AS passage_id, sp.locator_type, sp.locator, sp.content,
           s.id AS source_id, s.title, s.citation, s.source_type, s.jurisdiction,
           s.authority_tier, s.authority_status, s.official_url, s.verified_at
    FROM source_passages sp
    JOIN legal_sources s ON s.id = sp.source_id
    WHERE sp.id = ${passageId} AND s.user_id = ${userId}`
  if (!row) throw new Error('Source passage not found')
  return row
}
