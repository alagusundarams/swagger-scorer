# Architecture Decision Log (ADR)

## ADR-001: Micro-Frontend (MFE) Readiness
*   **Status:** Adopted
*   **Context:** The portal is growing. We need to prevent "prop drilling" and massive monolithic components.
*   **Decision:** Components must accept callback props (e.g., `onManage`, `onNavigate`) rather than using `useNavigate()` directly. This allows them to be embedded in different parent contexts (Admin Dashboard vs. Product Page) without tight coupling to the router.
*   **Outcome:** `ApiInterfaceCatalog` was refactored to allow the parent to control navigation.

## ADR-002: Just-In-Time (JIT) Spec Synchronization
*   **Status:** Adopted
*   **Context:** We need to search and display API endpoints (operations), but the "Source of Truth" for the spec is in Git (ADO), not our DB. Replicating the full spec in DB introduces drift.
*   **Decision:** We implement a "JIT Sync". When a spec is fetched for viewing (via `/products/:id/spec`), the backend asynchronously parses it and upserts the operation signatures (method, path) into the `operations` table.
*   **Outcome:** The "Interface Catalog" endpoint count is self-healing. As users view specs, the search index populates automatically.

## ADR-003: Linked Identity for Applications
*   **Status:** Adopted
*   **Context:** Subscriptions need to call APIs securely.
*   **Decision:** We do not handle OAuth tokens directly. Instead, we link an **App Registration** (ClientId) to a **Subscription**. This separate "Linked Identity" model allows us to rotate keys without changing the app identity.

## ADR-004: Policy Studio "No-Code" Abstraction
*   **Status:** Adopted
*   **Context:** Users struggle with XML policies.
*   **Decision:** We provide a UI-first "Policy Studio" that treats policies as configurable tiles (Rate Limit, IP Filter). The frontend generates the XML.
*   **Outcome:** Reduced XML syntax errors in production.
