# App Registration Strategy: "Linked Identity"

## Executive Summary
To maintain the APIM Self Service Portal as a "Single Stop Shop" without incurring the complexity of managing Azure AD App Registrations (secrets, manifests, certificates), we adopt a **"Link & Bind"** strategy.

We enforce a **1:1 relationship between an APIM Product and an Azure AD App Registration** (Resource Server).

---

## 1. Core Principles

### 1.1 Product-Level Enforcement
App Registrations must be linked at the **Product Level**, not the API level.

*   **Rationale:** A "Product" represents a consumable service boundary. Consumers authenticate once (getting an Access Token for an Audience) and use multiple API endpoints.
*   **User Impact:** Simplifies the consumer experience (one token per product) and aligns with microservice architecture (One Service = One App ID).

### 1.2 "Link Only" Data Model
The Portal acts as a **Registry**, not a **Manager**. We never create or update App Registrations; we only reference them.

**Data We Store:**
| Field | Purpose | Source |
|-------|---------|--------|
| `ClientId` (GUID) | **Primary Search Key** & Unique Identifier | User Input |
| `DisplayName` | Visual Verification ("Is this the right app?") | Graph API (Read-Only) |
| `AppIdUri` | Validating `aud` (Audience) claims in policies | Graph API (Read-Only) |
| `ServicePrincipalId`| Validating permissions (optionally) | Graph API (Read-Only) |

**Data We NEVER Touch:**
*   ❌ Client Secrets / Certificates
*   ❌ Redirect URIs
*   ❌ Manifest JSON
*   ❌ App Roles / Scopes definition

### 1.3 Multi-Environment Alignment
Since code moves through environments (Dev → QA → Prod), the Linked Identity must follow.

*   **Config Per Environment:** Each Environment Config for a Product has its own `LinkedAppRegistration` slot.
*   **Validation:** When promoting to PROD, the system enforces that the Linked App is a **PROD-designated** App Registration (naming convention check).

---

## 2. The User Workflows

### 2.1 Provider: Onboarding & Linkage
*Zero data entry, visual validation.*

1.  User selects **"Secure this Product"**.
2.  User pastes **Client ID** (Application ID).
3.  Portal performs **Live Lookup**:
    *   `GET /applications/{clientId}` via Graph API.
    *   *Success:* Displays "✅ Found: **User Service [DEV]** (api://user-service-dev)".
    *   *Error:* "⚠️ App ID not found or you do not have access."
4.  User confirms **"Link Identity"**.

### 2.2 Consumer: "Client ID Search"
*Solving the "Where is that API?" problem.*

Developers often debug logs seeing only a Client ID.
1.  User pastes a Client ID GUID into the Dashboard **Search Bar**.
2.  System searches the `LinkedAppRegistration.ClientId` field.
3.  Result: The specific Product associated with that App ID appears.

---

## 3. Governance & Guidelines

### 3.1 Naming Conventions (Recommended)
To ensure clarity, we recommend teams name their App Registrations to match the hierarchy:

*   **Format:** `APIM-{Team}-{Product}-{Env}`
*   **Example:** `APIM-Platform-UserService-DEV`

### 3.2 "Orphan" Prevention
*   **Check:** When an App Registration is deleted in Azure AD, our Sync Job flags the Product as "Identity Broken".
*   **Alert:** Product Owner receives notification: "The Identity for User Service [QA] is missing."

---

## 4. Migration & Bulk Onboarding (Brownfield)

For the existing **~200 products** and **~300 APIs**, relying on manual "Link & Bind" is inefficient. We propose a hybrid migration strategy.

### 4.1 Scenario A: App Registrations Already Exist
*   **Tooling:** We provide a **Bulk Import Script** (Python/PowerShell) that accepts a CSV mapping.
*   **Input CSV:** `ProductId, Environment, ClientId`
*   **Action:** Script calls our APIM Internal API to programmatically update the `LinkedAppRegistration` fields for all 200 products in one go.

### 4.2 Scenario B: App Registrations Do NOT Exist
*   **Tooling:** **Bulk Provisioning Script** (run by IT/Platform Team).
*   **Process:**
    1.  Script scans APIM Database for all Products without Identity.
    2.  Loops through each:
        *   Generates Name: `APIM-{Team}-{Product}-{Env}`
        *   Creates App Registration in Azure AD via Graph CLI.
        *   Outputs `ClientId` to a mapping file.
    3.  Runs the **Bulk Import Script** (from Scenario A) to bind the new IDs to the products.

This ensures the "One-Time Setup" burden is handled via automation, while day-to-day operations remain Self Service.

---

## 5. Technical Implementation

### 5.1 Schema Addition
```typescript
interface ProductEnvironmentConfig {
  environment: 'DEV' | 'QA' | 'STAGE' | 'PROD';
  // ... existing config
  identity?: {
    clientId: string;        // Indexed for search
    displayName: string;     // Read-only from AD
    audience: string;        // App ID URI
    tenantId: string;
  }
}
```

### 5.2 Dashboard Visuals
**Product Card UI:**
```
┌──────────────────────────────────────────────────────────┐
│ User Service API                           [DEV] 🛡️      │
│ 🆔 Client ID: a1b2...c3d4  (Copy)                        │
└──────────────────────────────────────────────────────────┘
```
*   **Shield Icon:** Indicates "Protected" status.
*   **Client ID:** Visible verification.

---

## 6. FAQ for Developers

**Q: Do I create the App Registration here?**
*A: No. Create it in the Azure Portal or using the `port-io` templates. Paste the ID here to enforce access.*

**Q: Can I use the same App ID for Dev and Prod?**
*A: Technically yes, but **Forbidden** by governance. The Portal will warn you if a Prod environment links to an App named with "-DEV".*
