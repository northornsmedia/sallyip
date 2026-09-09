import { resolveJurisdiction } from './jurisdiction-registry.js'

// Map free-form jurisdiction strings (matter jurisdictions, route output) to
// pack codes. Returns [] when nothing mappable is present.
export function packCodesFor(jurisdictions) {
  const codes = new Set()
  for (const item of Array.isArray(jurisdictions) ? jurisdictions : [jurisdictions]) {
    if (!item) continue
    const text = String(item).trim()
    if (/^[A-Z]{2}$/.test(text)) {
      codes.add(text.toUpperCase() === 'UK' ? 'GB' : text.toUpperCase())
      continue
    }
    const region = resolveJurisdiction(text)
    if (!region) continue
    codes.add(region.code === 'UK' ? 'GB' : region.code)
  }
  return [...codes]
}

export async function listPacks(sql) {
  const packs = await sql`
    SELECT p.code, p.name, p.version, p.status, p.notes, p.updated_at,
           (SELECT count(*)::int FROM legal_sources s WHERE s.source_type = 'jurisdiction_pack' AND s.jurisdiction = p.code) AS authority_count,
           (SELECT count(*)::int FROM source_passages sp JOIN legal_sources s ON s.id = sp.source_id WHERE s.source_type = 'jurisdiction_pack' AND s.jurisdiction = p.code) AS passage_count
    FROM jurisdiction_packs p ORDER BY p.code`
  return { packs }
}
