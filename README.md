# TWAIN Functional Prototype

Lightning-style prototype of Urban Utilities' TWAIN (Trade Waste Access Information Network), linked to WasteID by PSID (pre-treatment system ↔ WasteID device `ref`) and Permit / agreement number.

Vue 3 + Vite + Element Plus front end; Hono API (`server/app.js`) with Drizzle ORM. Production runs on Cloudflare Pages + D1; the same API runs on Node + SQLite (`server/node.js`).

## Local development

```bash
npm install
echo "AUTH_SECRET=$(openssl rand -hex 32)" > .dev.vars
npm run dev:api   # Node API on :8789, SQLite at .wrangler/dev.db
npm run dev       # Vite on :5173, proxies /api to :8789
```

Demo users (password `twain123`): `coordinator`, `coordinator2` (Trade Waste Coordinators), `officer`, `officer2`, `officer3` (Trade Waste Officers). An empty database is filled with demo data on first sign-in; Coordinators can reset it from the user menu.

## How it is built

- `shared/objects.js` – object metadata (fields, picklists, layouts sections, list columns). Server and client both use it.
- All business records live in one `records` table (JSON `data` plus indexed `parent_id`, `approval_id`, `owner_id`, `status`); every change writes field history.
- `server/logic.js` – derived fields and business actions: enrolment for billing, meter consumption, 24h discharge, exceedances, LIMS simulation, mass load, billing run (batches of 5 approvals per request), approval work items (a Coordinator cannot decide their own item).
- `server/seed.js` – demo data generated from a WasteID snapshot (`server/seed/wasteid.json`), loaded in chunks to stay inside Worker limits.
- `src/layouts.js` – record page tabs, related lists and actions per object.

Placeholders until Urban Utilities supplies the real rules: billing formula and rates (`DEFAULT_BILLING_CONFIG`, editable in Setup → Billing Parameters) and grease arrestor sizing (`recommendCapacity`).

## WasteID link

Set `WASTEID_API_URL` and `WASTEID_API_KEY`; the WasteID deployment needs the same value in `INTEGRATION_KEY`. TWAIN calls `GET /api/integration/devices/:ref` on WasteID for the device card on a pre-treatment system. WasteID's device page links to `/#/psid/<ref>` here.

## Deployment

Pages project `twain-prototype` (D1 `twain`) deploys from `main` through GitHub Actions. UAT is the `uat` branch (worktree `../twain-prototype-uat`, Pages project `twain-uat`, D1 `twain-uat`), deployed manually:

```bash
npm run build && npx wrangler d1 migrations apply twain-uat --remote && npx wrangler pages deploy dist --project-name twain-uat --branch main
```

Secrets per Pages project: `AUTH_SECRET`, `WASTEID_API_URL`, `WASTEID_API_KEY`.
