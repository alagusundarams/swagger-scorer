# APIM Database Scripts & Tools

This directory contains the database interactions for the Self-Service Portal, separating data governance from the backend application logic.

## 🚀 Windows Developer Workflow

Use the following sequences to manage your local or development database state.

### 1. Reset Environment

#### Option A: 🧨 Global Reset (Destructive)
> **WARNING:** This drops and recreates the entire schema. All data for ALL environments (DEV, QA, STAGE, PROD) will be lost.

```powershell
# From apim-database directory
npm run setup-db
```

#### Option B: 🛡️ Safe DEV-Only Reset (Recommended)
Use this to clear only `DEV` data without affecting other environments or the global schema.

```powershell
# Run these commands in your terminal (ensure DATABASE_URL is set)
# Alternatively, use pgAdmin or a SQL tool to execute:

DELETE FROM drafts WHERE product_id IN (SELECT id FROM products WHERE environment = 'DEV');
DELETE FROM app_registrations WHERE environment = 'DEV';
DELETE FROM permission_matrix WHERE environment = 'DEV';
DELETE FROM governance_backends WHERE environment = 'DEV';
DELETE FROM products WHERE environment = 'DEV';
```

### 2. Extraction & Sync (Load Data)

After resetting, run the discovery logic to pull fresh data from APIM and ADO, then update the database.

```powershell
# 1. Run Discovery & Reconciliation (Extracts + Updates DB)
npm run discover -- --env=DEV

# 2. (Optional) Run Master Real-Time Sync if using the new Direct Access mode
npm run sync -- --env=DEV
```

---

## 📜 Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **Setup DB** | `npm run setup-db` | Drops public schema and re-applies `01-god-schema.sql`. Destructive. |
| **Discover** | `npm run discover` | Runs Extraction (APIM/ADO) -> Reconciliation. Main daily sync tool. |
| **Sync** | `npm run sync` | Real-time APIM -> DB sync. |
| **Reset** | `npm run reset` | Alias for setup-db logic. |
| **Fetch Data** | `npm run fetch` | Only extracts APIM data to JSON (no DB update). |

## 📁 Project Structure

- **`schema/`**: Contains the master SQL DDL files.
- **`scripts/core/`**: Main logic for sync, discovery, and reconciliation.
- **`scripts/utils/`**: Helper scripts for setup, seeding, and migration.
- **`docs/`**: Detailed documentation.
