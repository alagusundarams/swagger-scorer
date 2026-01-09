# Database Reconciliation Rules

> [!IMPORTANT]
> The source of truth for schema is `apim-database/schema/01-god-schema.sql`.
> Do NOT use ad-hoc migration scripts. Update the master schema definition.

## 1. Product Identification Strategy
We reconcile products from three sources using a strict priority:
1.  **APIM Inventory** (Real-time state)
2.  **Database** (Governance state)
3.  **Git Repo** (Contract state)

### Case Sensitivity
- **Product IDs** are treated as **Case-Insensitive** for matching.
- We map `CaseTest-Product` (APIM) to `casetest-product` (Inventory/DB) to prevent orphan flagging.
- Always normalize comparisons: `id.toLowerCase().trim()`.

## 2. Subscription Handling
### Orphan Logic
- A subscription is "Orphaned" if its `productId` (normalized) matches no known Product ID (normalized).
- We **exclude** specific known APIM internal products if necessary.
- We **alert** via logs but do NOT delete orphans automatically.

### Security
> [!CAUTION]
> **NEVER STORE KEYS.**
- Subscription Primary/Secondary keys must **never** be stored in the Postgres database.
- The `subscriptions` table contains metadata only (state, owner, dates).
- Keys are fetched on-demand from APIM (`listSecrets`) via the secure proxy ONLY when requested by an authorized user.
- Any sync script MUST redact or omit key fields.

## 3. Product Deployments
- Deployment history is tracked in `product_deployments`.
- The `reconcile-governance.ts` script populates this from ADO Metadata.
- This table's schema must exist in `01-god-schema.sql`.
