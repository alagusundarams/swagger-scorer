# APIM Database Scripts & Tools

This directory contains the database schema, discovery scripts, and synchronization tools for the APIM Self-Service Portal.

---

## 🚀 Quick Start (Complete Workflow)

### Step 1: Database Setup (One-time)
```bash
cd apim-database
npm run setup
```
**What it does:** Executes NUCLEAR RESET → drops all tables → creates fresh schema with all 13 tables and seeds 5 policy templates.

### Step 2: Discovery & Sync (Regular workflow)
```bash
# Full sync (APIM + ADO + Operations extraction)
npm run sync --env=DEV

# OR Fast sync (Skip ADO if credentials not available)
npm run sync:fast --env=DEV
```
**What it does:**
1. Extracts APIM inventory (products, APIs, named values, backends)
2. Extracts ADO metadata (repos, pipelines, deployment hashes) → updates `products` table
3. Reconciles governance data
4. **Automatically extracts operations** from OpenAPI specs → populates `operations` table
5. Generates orphaned resources report

### Step 3: Verification (After sync)
```bash
# Verify backend queries work correctly
npm run verify

# Verify operations were extracted from OpenAPI specs
npm run verify:operations

# Inspect database schema
npm run inspect
```

---

## 📋 Available Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run setup` | Reset database (NUCLEAR RESET) | First time setup or clean slate |
| `npm run sync` | Full sync (APIM + ADO + operations) | Daily/weekly sync |
| `npm run sync:fast` | Sync without ADO | When ADO credentials unavailable |
| `npm run sync:db` | Update using DB as source | Skip external API calls |
| `npm run ado` | **ADO metadata extraction only** | Run ADO sync separately |
| `npm run verify` | Verify backend queries | After sync, validate data |
| `npm run verify:operations` | Verify operations extraction | Check OpenAPI spec parsing |
| `npm run inspect` | Inspect database schema | View all tables and columns |
| `npm run orphans` | Generate orphaned resources report | Identify unmanaged resources |
| `npm run seed` | Seed demo data | UI testing only |

---

## 🔄 Data Flow & Sync Process

### What Each Step Does:

**1. APIM Inventory Extraction** (`extract-apim-inventory.ts`)
- Scans APIM environments via Management API
- Extracts products, APIs, named values, backends
- **Caches OpenAPI specs** in `apiContracts` for operations extraction
- Saves to: `scripts/data/apim-inventory.json` and `apim-metadata.json`

**2. ADO Metadata Extraction** (`extract-ado-metadata.ts`)
- Searches ADO for repositories matching product names
- Fetches pipeline information
- Captures deployment hashes and dates for all environments (DEV/QA/STAGE/PROD)
- Saves to: `scripts/data/ado-metadata.json`

**3. Governance Reconciliation** (`reconcile-governance.ts`)
- **Inserts/Updates `products` table** with ADO metadata:
  - `terraform_pipeline_url`, `github_url`
  - `dev_hash`, `qa_hash`, `stage_hash`, `production_hash`
  - Deployment dates, `management_mode`
- Inserts/Updates `apis`, `named_values`, `governance_backends`, `app_registrations`
- **NEW: Automatically extracts operations from OpenAPI specs**
  - Parses `apiContracts` cached in step 1
  - Extracts paths, methods, descriptions
  - Populates `operations` table with GET, POST, PUT, DELETE, etc.

**4. Orphaned Resources Report** (`generate-orphaned-report.ts`)
- Identifies products/resources not managed by Terraform
- Saves report to: `scripts/data/orphaned-resources-{ENV}-{DATE}.json`

---

## 📁 Project Structure

```
apim-database/
├── schema/
│   └── 01-god-schema.sql         # Master schema (13 tables + views + seed data)
├── scripts/
│   ├── setup-db.ts                # Database setup script
│   ├── core/
│   │   ├── discover-sync.ts       # Orchestrator (runs all steps)
│   │   ├── extract-apim-inventory.ts
│   │   ├── extract-ado-metadata.ts
│   │   ├── reconcile-governance.ts  # ⭐ Inserts ADO metadata & operations
│   │   └── generate-orphaned-report.ts
│   ├── debug/
│   │   ├── verify-backend-queries.ts
│   │   ├── verify-operations.ts
│   │   └── inspect-schema.ts
│   └── utils/
│       └── seed-demo.ts           # Demo data for UI testing
└── package.json                   # npm scripts
```

---

## 🗃️ Database Schema (13 Tables)

| Table | Purpose |
|-------|---------|
| `products` | Product catalog (with ADO deployment metadata) |
| `apis` | APIs belonging to products |
| `operations` | **NEW:** API operations extracted from OpenAPI specs |
| `named_values` | Configuration values (environment-scoped) |
| `governance_backends` | Backend service inventory |
| `api_backends` | Links APIs to backends |
| `app_registrations` | Azure AD app registrations |
| `subscriptions` | Consumer subscriptions to products |
| `teams` | Teams (producers/consumers) |
| `users` | Portal users |
| `policy_templates` | Policy templates for UI (5 seeded by default) |
| `approval_requests` | Approval workflow |
| `audit_log` | Audit trail |

---

## 🔍 Operations Table (NEW Feature)

The `operations` table is **automatically populated** during `npm run sync` by parsing OpenAPI specs cached during APIM inventory extraction.

**Schema:**
```sql
CREATE TABLE operations (
    id TEXT PRIMARY KEY,
    api_id TEXT REFERENCES apis(id),
    name TEXT,              -- operationId from OpenAPI
    display_name TEXT,      -- summary from OpenAPI
    method TEXT,            -- GET, POST, PUT, DELETE, etc.
    url_template TEXT,      -- path template (e.g., /payments/{id})
    description TEXT
);
```

**Example data:**
- `GET /products` → `method: GET, url_template: /products`
- `POST /orders/{id}` → `method: POST, url_template: /orders/{id}`

---

## 💡 Tips

**When to use each sync mode:**

- `npm run sync` → Full sync (recommended for daily/weekly runs)
- `npm run sync:fast` → Skip ADO (when Azure DevOps unavailable)
- `npm run sync:db` → Skip external APIs (update from existing DB data only)
- `npm run ado` → Run **only** ADO extraction (updates `products` table with deployment metadata)

**Environment filtering:**
All commands support `--env=DEV` (or QA/STAGE/PROD) to filter by environment.

**Verification workflow:**
1. `npm run sync` (populate database)
2. `npm run verify` (check backend queries)
3. `npm run verify:operations` (check operations extraction)
4. `npm run inspect` (view schema)

---

## 🛠️ Configuration

Set `DATABASE_URL` environment variable or add to `config.json`:
```json
{
  "database": {
    "url": "postgresql://user:pass@localhost:5432/apim_portal"
  }
}
```
