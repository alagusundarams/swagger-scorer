# Day 1: APIM Database Setup & Sync Guide 🚀

This guide details the sequence of commands to perform a **Nuclear Reset** of the database and populate it with **Real-Time Data** from Azure (Identity, Products, App Registrations).

**Target Audience**: DevOps Engineers, Developers setting up the portal for the first time.
**Prerequisites**:
*   Node.js (v18+)
*   Azure CLI (`az`)
*   PostgreSQL Database (Running)

---

## 1. Preparation

First, ensure you have the latest code and dependencies.

```powershell
# 1. Pull latest changes
git pull origin main

# 2. Navigate to the database project
cd apim-database

# 3. Install dependencies
npm install
```

---

## 2. Authentication (Critical) 🔑

The sync script requires an authenticated Azure session to fetch:
*   APIM Products & APIs (ARM)
*   User Groups (Microsoft Graph)
*   App Registrations (Microsoft Graph)

```powershell
# Login to Azure
az login

# (Optional) Set your subscription if you have multiple
# az account set --subscription "YOUR_SUBSCRIPTION_ID"
```

---

## 3. Nuclear Database Reset ☢️

This step **DROPS** the existing schema (if any) and recreates all tables from scratch. **All existing data will be lost.**

```powershell
# Run the setup script (executes init-db/01-schema.sql)
npm run setup-db
```

*Output should look like:*
> `✅ Database schema created successfully`

---

## 4. Master Data Sync (The "Truth" Load) 🔄

This script pulls live data from Azure and populates the database. It handles:
*   **Identity**: Syncs your AD Groups into the `teams` table.
*   **Products**: Syncs products and assigns ownership based on Tags (`TeamID: ...`).
*   **App Registrations**: Scans API policies for Client IDs and links them to products.

```powershell
# Run the Master Sync
npx tsx scripts/sync-apim-to-db.ts
```

*Output should conclude with:*
> `✅ Sync Complete.`

---

## 5. Verification ✅

Run these queries (using `psql` or your preferred DB tool) to verify the data integrity.

### A. Check Your Team (Identity)
Verify that your AD groups were synced.
```sql
SELECT * FROM teams WHERE description LIKE '%Azure AD%';
```

### B. Check Product Ownership
Verify that products have real Owners (not just 'orphaned').
```sql
SELECT id, display_name, owner_team_id FROM products;
```

### C. Check App Registrations (New Feature)
Verify that Client IDs found in policies were resolved to names or KeyVault URLs.
```sql
SELECT * FROM app_registrations;
```

---

## Troubleshooting

*   **Error: `relation "teams" does not exist`**: You skipped Step 3 (Setup DB).
*   **Error: `get-access-token` failed**: You skipped Step 2 (Auth). Run `az login`.
*   **Config Issues**: Ensure `config.json` is present in `apim-database/` with the correct Database URL.
