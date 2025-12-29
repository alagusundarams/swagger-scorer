# APIM Database & Data Integration

This folder contains all database-related scripts, schema, and data management tools for the APIM Self-Service Portal.

**Separate from backend code** - This keeps data integration concerns isolated from application logic.

## Structure

```
apim-database/
├── schema/
│   └── schema.sql              # PostgreSQL schema definition
├── scripts/
│   ├── fetch-apim-data.ts      # Pull data from Azure APIM
│   ├── migrate-to-postgres.ts  # Initial migration script
│   ├── export-to-csv.ts        # (Future) Export to Excel/CSV
│   └── reconcile-apim.ts       # (Future) Daily sync script
├── SETUP.md                    # PostgreSQL setup guide
├── DATA_MANAGEMENT.md          # Export & reconciliation overview
└── README.md                   # This file
```

## Quick Start

### 1. Fetch APIM Data

```powershell
cd apim-database/scripts

$env:APIM_INSTANCE="your-apim-dev"
$env:RESOURCE_GROUP="your-rg"
$env:SUBSCRIPTION_ID="your-sub-id"

npx tsx fetch-apim-data.ts
```

Output: `../data/apim-data-2024-12-19.json`

### 2. Setup PostgreSQL

See [SETUP.md](./SETUP.md) for Docker or Windows installation.

### 3. Migrate Data

```powershell
$env:DATABASE_URL="postgresql://postgres:password@localhost:5432/apim_portal"
$env:GIT_REPO_URL="https://dev.azure.com/org/main-repo"

npx tsx migrate-to-postgres.ts ../data/apim-data-2024-12-19.json
```

## Scripts Overview

| Script | Purpose | Runs | Frequency |
|--------|---------|------|-----------|
| `fetch-apim-data.ts` | Pull current state from APIM | Manual/Scheduled | On-demand or daily |
| `migrate-to-postgres.ts` | Initial data load | Manual | Once (initial setup) |
| `export-to-csv.ts` | Export to Excel for review | Manual | As needed |
| `reconcile-apim.ts` | Sync APIM ↔ PostgreSQL | Scheduled | Daily (during TF→Portal migration) |

## Dependencies

Install Node.js dependencies:

```bash
npm install pg @types/node
```

## Environment Variables

- `APIM_INSTANCE` - Azure APIM instance name
- `RESOURCE_GROUP` - Azure resource group
- `SUBSCRIPTION_ID` - Azure subscription ID
- `DATABASE_URL` - PostgreSQL connection string
- `GIT_REPO_URL` - Azure DevOps repo (main/DEV/QA/STAGE)
- `GIT_PROD_REPO_URL` - Separate PROD repo URL (if different)

## Documentation

- [SETUP.md](./SETUP.md) - PostgreSQL installation & configuration
- [DATA_MANAGEMENT.md](./DATA_MANAGEMENT.md) - Export & reconciliation details
- [../apim-to-postgres-mapping.md](../brain/.../apim-to-postgres-mapping.md) - Field mappings

## Notes

**Why separate folder?**
- Database operations are independent of backend API
- Makes it clear these are data migration/sync tools
- Can run independently without backend server
- Easier to schedule cron jobs

**During Terraform → Portal migration:**
- APIM remains source of truth
- Daily reconciliation keeps PostgreSQL in sync
- Once all products migrate, APIM becomes read-only
- PostgreSQL becomes authoritative source
