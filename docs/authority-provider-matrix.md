# Authority provider matrix (Phase 6)

Hierarchy: OFFICIAL PRIMARY > OFFICIAL GUIDANCE > COURT/TRIBUNAL > TRUSTED SECONDARY > DISCOVERY/ENRICHMENT.
Google patent public data = discovery/enrichment only; never overrides official office records.

| provider | jurisdiction | tier | status | creds | canonical record |
|---|---|---|---|---|---|
| EPO OPS | EP/WO | OFFICIAL PRIMARY | live, key-gated | EPO_OPS_KEY/SECRET | publication no, country, kind, title, espacenet URL (`official-search-service.js:20`) |
| EUIPO | EU | OFFICIAL PRIMARY | live, key-gated, sandbox blocked | EUIPO_CLIENT_ID/EUIPO_CLIENT_SECRET | app no, mark, classes, owner, status |
| USPTO Patent Search | US | OFFICIAL PRIMARY | live beta, key-gated | USPTO_API_KEY | patent/publication no, title, date |
| CourtListener | US | COURT/TRIBUNAL | live, token-gated | COURTLISTENER_TOKEN | case name, court, opinion |
| WIPO | WO | OFFICIAL PRIMARY | NOT WIRED — P1 gap | — | TODO adapter |
| UKIPO | GB | OFFICIAL PRIMARY | NOT WIRED — P1 gap | — | TODO adapter |
| CIPO | CA | OFFICIAL PRIMARY | NOT WIRED — P2 gap | — | TODO adapter |
| IP Australia | AU | OFFICIAL PRIMARY | NOT WIRED — P2 gap | — | TODO adapter |
| InPASS / India Journal | IN | OFFICIAL PRIMARY | adapter exists (`india-journal-service.js`) | — | partial |
| Google Patents public data | multi | DISCOVERY | NOT WIRED — enrichment only | — | never authoritative |

Each adapter must expose: provider, jurisdiction, authority_tier, retrieved_at, version/source, raw + canonical record (see `database/054_provider_records.sql`). Family resolution: `family_status=unresolved` unless evidence; never force-merge (Phase 7 rule).
Official search without keys reports `PROVIDER_NOT_CONFIGURED` honestly — no simulated results.
