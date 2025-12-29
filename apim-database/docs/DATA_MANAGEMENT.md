# Data Management Scripts Overview

## 1. Export to Excel/CSV Script

**Purpose:** Export PostgreSQL data for manual review, backup, or bulk updates

```powershell
# Usage
npx tsx scripts/export-to-csv.ts --tables products,apis,subscriptions --env DEV
```

**Features:**
- Export to CSV (Excel-compatible)
- Filter by environment
- Separate file per table
- Timestamps in filename
- Output: `exports/products_2024-12-19.csv`

**Columns in CSV:**
```csv
# products.csv
id,name,display_name,environment,state,owner_team_id,management_mode,quality_score,created_at

# apis.csv  
id,product_id,product_name,name,display_name,path,quality_score

# subscriptions.csv
id,product_name,state,created_at
```

**Implementation:** ~100 lines (pg query → CSV write)

---

## 2. Daily Reconciliation Script

**Purpose:** Detect drift between APIM (source of truth during TF phase) and PostgreSQL

### How It Works

```
┌─────────────────────────────────────┐
│ 1. Fetch current APIM data          │
│    (products, APIs, subscriptions)   │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 2. Fetch current PostgreSQL data    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 3. Compare & Detect Differences      │
│    - New in APIM → INSERT to DB      │
│    - Deleted from APIM → WARN only   │
│    - Changed state → UPDATE DB       │
│    - Changed in DB but not APIM →    │
│      CONFLICT - manual review        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 4. Generate Report                   │
│    - Summary: X new, Y updated       │
│    - Conflicts: List for review      │
│    - Email/Slack notification        │
└──────────────────────────────────────┘
```

### Diff Logic

```typescript
interface DiffResult {
    newInAPIM: Product[];        // Add to DB
    deletedFromAPIM: Product[];  // Warn only (soft delete?)
    stateChanged: Product[];     // Update DB
    conflicts: Product[];        // Manual review needed
}

// Conflict = Changed in DB (owner assigned) but also changed in APIM
```

### Actions

| Scenario | APIM | PostgreSQL | Action |
|----------|------|------------|--------|
| New product | EXISTS | NOT EXISTS | ✅ INSERT to DB |
| Deleted product | NOT EXISTS | EXISTS | ⚠️ WARN (may be intentional) |
| State changed | `published` | `notPublished` | ✅ UPDATE DB (APIM wins) |
| Owner assigned in DB | No change | `owner_team_id` set | ✅ KEEP DB (user input wins) |
| Both changed | State changed | Owner changed | 🔴 CONFLICT - flag for review |

### Configuration

```typescript
// config/reconciliation.yaml
reconciliation:
  schedule: "0 2 * * *"  # 2 AM daily
  autoSync: true         # Auto-apply safe changes
  conflictPolicy: "manual"  # "manual" or "apim-wins" or "db-wins"
  notifications:
    email: ["team-leads@company.com"]
    slack: "#apim-alerts"
```

---

## 3. Docker Setup Commands

**For Windows Docker Desktop:**

```powershell
# Start PostgreSQL
docker run --name apim-postgres `
  -e POSTGRES_PASSWORD=dev_password `
  -e POSTGRES_DB=apim_portal `
  -p 5432:5432 `
  -v apim-db-data:/var/lib/postgresql/data `
  -d postgres:15

# Connect to verify
docker exec -it apim-postgres psql -U postgres -d apim_portal

# Backup database to file
docker exec apim-postgres pg_dump -U postgres apim_portal > backup.sql

# Restore from backup
Get-Content backup.sql | docker exec -i apim-postgres psql -U postgres -d apim_portal
```

---

## Implementation Priority

### Phase 1 (Now)
1. ✅ Initial migration script (DONE)
2. ⏳ CSV export script (Simple - 1 hour)

### Phase 2 (After First Migration)
3. ⏳ Admin UI for team assignment (2-3 days)
4. ⏳ Basic reconciliation script (1-2 days)

### Phase 3 (Production)
5. ⏳ Conflict resolution UI (3-4 days)
6. ⏳ Automated daily cron job (1 day)
7. ⏳ Notification system (email/Slack) (1 day)

---

## Reconciliation Script Skeleton

```typescript
// scripts/reconcile-apim.ts

async function reconcile() {
    // 1. Fetch APIM data
    const apimProducts = await fetchAPIMProducts();
    
    // 2. Fetch DB data
    const dbProducts = await fetchDBProducts();
    
    // 3. Compute diff
    const diff = computeDiff(apimProducts, dbProducts);
    
    //4. Apply changes (if autoSync enabled)
    if (config.autoSync) {
        await applyDiff(diff);
    }
    
    // 5. Generate report
    const report = generateReport(diff);
    
    // 6. Send notifications
    await sendNotifications(report);
}

function computeDiff(apim: Product[], db: Product[]): DiffResult {
    const apimMap = new Map(apim.map(p => [p.id, p]));
    const dbMap = new Map(db.map(p => [p.id, p]));
    
    const newInAPIM = apim.filter(p => !dbMap.has(p.id));
    const deletedFromAPIM = db.filter(p => !apimMap.has(p.id));
    const stateChanged = /* ... */;
    const conflicts = /* ... */;
    
    return { newInAPIM, deletedFromAPIM, stateChanged, conflicts };
}
```

---

## Notes for Future

**Why Reconciliation is Complex:**
- APIM changes (Terraform deploys) happen outside Portal
- Portal changes (team assignments) happen in DB
- Need to merge both sources of truth
- Conflicts require human decisions

**Exit Criteria:**
- When ALL products are `PORTAL_MANAGED`
- When Terraform pipelines are decommissioned
- Then APIM becomes read-only, DB is source of truth
- Reconciliation script can be retired

**Until then:** Daily reconciliation ensures Portal shows accurate state
