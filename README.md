# SallyIP

Verification-first AI for patent research, drafting, prosecution, and IP contracts. Every material conclusion is traceable to retrieved evidence with exact-quote verification; eval methodology is published (see `benchmarks/`, `evals/`).

> Status: `CONFIDENTIAL_PILOT_BLOCKED` — see `CONFIDENTIAL_PILOT_P0_CLOSURE_REPORT.md` and `SECURITY_ACTIVATION_REPORT.md`. Do not admit confidential IP beyond PUBLIC_RESEARCH until the gate passes.

## Stack

Vite + React client, Vercel serverless `api/`, Neon Postgres, Gemini primary via `SALLYIP_PRIMARY_*` with OpenRouter fallbacks. Python helpers in `api/` and `scripts/` need Python 3 + `requirements.txt`.

## Local dev

Requires Node ≥ 20.6 (`--env-file` flag is used by test scripts).

```bash
npm install
cp .env.example .env.local   # fill DATABASE_URL + provider keys (all key names documented in .env.example)
pip install -r requirements.txt   # only for test:files / test:foundation python checks
npm run dev                  # vite, reads .env + .env.local (local wins)
npm run build
```

## DB

Live DB already has migrations through ~054; `055_tenant_isolation` is NOT applied live. Fresh/second database, in order from the project root (see `sqlrun.md` for the full chain and the duplicate-`048` note):

```bash
node --env-file=.env.local scripts/apply-migration.mjs database/schema.sql
# then 002 → 041, then 042 → 055 in numeric order
```

## Tests / gates

```bash
npm run test:verification
npm run test:foundation        # needs live DATABASE_URL + seeded user for integration files
npm run test:security          # 18 files, 70/70 expected
npm run test:files             # needs requirements.txt installed
npm run test:visual            # needs: npx playwright install (chromium/firefox/webkit)
node scripts/secret-scan.mjs   # or: npm run secret:scan
node scripts/confidential-pilot-gate.mjs
```

## Docs map

Start here: `docs/INDEX.md`. Then `DIRECTORIES.md`, `DESIGN_SYSTEM_VERSION.md`, `docs/provider-confidentiality-policy.md`, `docs/security-architecture.md`, `docs/P0-7-production-migration-plan.md`, `public/llms.txt`, `recentchanges.md`.

Word add-in: generate via `scripts/generate-word-manifest.mjs` — do not hand-edit `public/word-addin/manifest.xml` (domain comes from `APP_ORIGIN`).

## License

Proprietary — all rights reserved (no license file ships with this repo; do not redistribute).
