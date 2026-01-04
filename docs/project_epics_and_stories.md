# Enterprise Master Backlog (100+ Stories)

## Overview
This backlog represents the complete work breakdown structure (WBS) for the APIM Self-Service Portal. It includes all implemented engineering tasks, infrastructure setup, and refactoring efforts.

**Total Estimated Points:** 480  
**Phase:** Sprint 1 (Completed) & Sprint 2 (Backlog)

---

## Epic 1: Infrastructure & Foundation (DevOps)
**Goal:** Provision the secure runtime environment.

1.  **[Infra] VNET Provisioning:** Create Azure VNET `10.0.0.0/16` with `app` and `db` subnets.
2.  **[Infra] Key Vault Setup:** Provision Standard Tier KV and enable RBAC.
3.  **[Infra] PostgreSQL:** Deploy Azure Flexible Server (Burstable B1ms) with Private Endpoint.
4.  **[Infra] APIM Deployment:** Provision APIM Premium and join to VNET (Internal Mode).
5.  **[Infra] DNS Zones:** Configure Private DNS Zones for Postgres and KeyVault.
6.  **[DevOps] Dockerfile (Backend):** Create multi-stage Node.js build (Alpine).
7.  **[DevOps] Dockerfile (Frontend):** Create Nginx-based production build for React.
8.  **[DevOps] CI Pipeline:** GitHub Action/ADO Pipeline to lint, build, and push to ACR.
9.  **[DevOps] Helm Charts:** Create `deployment.yaml`, `service.yaml`, `ingress.yaml`.
10. **[DevOps] App Configuration:** Setup `config/loader.ts` to read `process.env`.
11. **[Local] Docker Compose:** Create `docker-compose.yml` for local DB and API.
12. **[DB] Seeding Script:** Create `seed.ts` to populate initial Teams data.
13. **[Infra] Managed Identity:** Provision User-Assigned MI for the Container App.
14. **[Infra] RBAC Assignments:** Assign `Key Vault Secrets User` to the Managed Identity.

---

## Epic 2: Authentication & Identity (SecOps)
**Goal:** Zero-Trust implementation.

15. **[FE] MSAL Setup:** Install `@azure/msal-react` and configure Public Client App.
16. **[FE] Login Component:** Create `Login.tsx` with Redirect flow.
17. **[BE] JWT Strategy:** Implement `fastify-jwt` to verify Entra ID signatures.
18. **[BE] Auth Guard:** Create `auth.middleware.ts` to block 401 requests.
19. **[BE] User Hydration:** Extract OID from token and upsert into `users` table.
20. **[BE] Graph Integration:** Implement `GraphClient` to fetch `/me/memberOf`.
21. **[BE] Role Mapper:** Map AD Groups (GUIDs) to App Roles (Admin/Producer).
22. **[FE] Route Guards:** Create `<RequireAuth>` wrapper for React Router.
23. **[FE] Token Refresh:** Implement silent token acquisition interceptor.
24. **[FE] Logout Logic:** Clear LocalStorage and redirect to Entra Logout.
25. **[Sec] CSP Headers:** Configure Helmet to enforce Content Security Policy.

---

## Epic 3: Core Inventory Management
**Goal:** The "CRUD" backbone of the application.

26. **[DB] Schema Migration:** Create `001_initial_schema.sql` (Products, APIs).
27. **[BE] Products Service:** Implement `getAllProducts()` with specific columns.
28. **[BE] Create Logic:** Implement `createProduct()` with transaction handling.
29. **[BE] Input Validation:** Add `zod` schema for `CreateProductDTO`.
30. **[FE] Inventory Store:** Create `inventorySlice.ts` in Zustand.
31. **[FE] Product List:** functionality for DataGrid with sorting/filtering.
32. **[FE] Detail View:** Create `ProductDetail.page.tsx` scaffold.
33. **[FE] API List Component:** Render list of APIs within a product.
34. **[BE] Pagination:** Add `limit` and `offset` support to list endpoints.
35. **[BE] Soft Delete:** Implement `deleted_at` logic for archival.
36. **[FE] Empty States:** Design "No Products Found" UI.

---

## Epic 4: Just-In-Time (JIT) Sync Engine
**Goal:** The intellectual property—syncing git to DB.

37. **[BE] ADO Client:** Create `AzureDevOpsService` class.
38. **[BE] Fetch File:** Implement `metrics/items` REST call to get raw YAML.
39. **[BE] Swagger Parser:** Integrate `@apidevtools/swagger-parser`.
40. **[BE] Operation Hash:** Logic to compute SHA256 of an operation to detect changes.
41. **[BE] Sync Job:** `syncProductOperations(id)` logic flow.
42. **[BE] Error Handling:** Handle "File Not Found" (404) natively.
43. **[DB] Operations Table:** Design schema for `method`, `url`, `notes`.
44. **[FE] Sync UI:** Add "Sync Now" button with spinner state.
45. **[FE] Last Synced:** Display `last_updated` timestamp in UI.
46. **[BE] Webhook Handler:** `POST /webhooks/ado` to trigger sync on git push.
47. **[BE] Fallback Logic:** Try `openapi.json` if `openapi.yaml` fails.

---

## Epic 5: Policy Studio (Visual Editor)
**Goal:** No-Code interface.

48. **[FE] Drag Logic:** Implement `react-dnd` monitors.
49. **[FE] Policy Tiles:** Components for Rate Limit, IP Filter, CORS.
50. **[FE] Inbound/Outbound:** Visual swimlanes for policy sections.
51. **[Eng] XML Parser:** Logic to regex/parse `<inbound>` tags.
52. **[Eng] XML Generator:** Logic to serialize State -> XML string.
53. **[FE] Monaco Editor:** Integrate `react-monaco-editor`.
54. **[FE] Dual Mode:** Toggle switch between Visual and Code view.
55. **[FE] Validation UI:** Red squiggles for invalid XML.
56. **[BE] Policy Service:** Endpoint to receive XML and validate.
57. **[BE] Spectral Integration:** run `spectral lint` on payload.
58. **[FE] Ghost Cards:** Logic to render inherited policies as read-only.
59. **[FE] Custom Blocks:** Preservation of unknown XML tags.

---

## Epic 6: Automatic Onboarding Wizard
**Goal:** Self-Service creation flow.

60. **[FE] Stepper UI:** "Dots" navigation (Step 1 -> 2 -> 3).
61. **[FE] Wizard State:** `WizardStore` to hold transient form data.
62. **[BE] ID Check:** `GET /check-availability` endpoint.
63. **[FE] Async Select:** Component to search AD Groups via backend proxy.
64. **[FE] Review Step:** Summary screen before final submit.
65. **[BE] SAGA Orchestrator:** Manage the multi-step transaction.
66. **[BE] Repo Provisioning:** Logic to call ADO API to create Git Repo.
67. **[BE] Default Spec:** Commit a "Hello World" `openapi.yaml` to new repo.
68. **[FE] Confetti:** Animation on successful creation.

---

## Epic 7: Consumer Portal (Subscriptions)
**Goal:** Access management.

69. **[DB] Subscriptions Table:** Schema for `state`, `primary_key_ref`.
70. **[KM] Key Vault Logic:** Logic to generate generic Secret Identifier URI.
71. **[BE] Request Access:** `POST /subscriptions` endpoint.
72. **[FE] My Key:** UI to "Reveal" the generic key (simulated).
73. **[BE] Approval Logic:** Auto-approve logic for "Open" products.
74. **[FE] Linked App:** Form to input `ClientId` for OAuth.
75. **[BE] App Registration:** Endpoint to link ClientId to Product Scope.
76. **[BE] Rotation:** Logic to rotate secret in APIM/KV.

---

## Epic 8: Governance & Auditing
**Goal:** Compliance.

77. **[BE] Audit Middleware:** Interceptor for all POST/PUT/DELETE.
78. **[Eng] Diff Logic:** Utility to compare `old_row` vs `new_payload`.
79. **[DB] Audit Schema:** `entity_type`, `action`, `diff_json`.
80. **[FE] History Tab:** UI to render the diff log.
81. **[BE] Orphan Job:** Cron to find deleted AD Groups.
82. **[FE] Orphan Alert:** Banner on dashboard if ownership is lost.
83. **[BE] Admin Stats:** Aggregation queries for Dashboard.

---

## Epic 9: Frontend Architecture (MFE) Refactor
**Goal:** Technical debt paydown.

84. **[Refactor] Hook Extraction:** Move `fetch` from Views to `useHooks`.
85. **[Refactor] Client Layer:** Create `api/*Client.ts` files.
86. **[Refactor] Type Definitions:** Fix `any` types in `teams.service`.
87. **[Refactor] Slice Pattern:** Split `RootStore` into domain slices.
88. **[Refactor] UI Kit:** Move Buttons/Inputs to `shared/components`.
89. **[Tech] Error Boundaries:** Add `ErrorBoundary` to catch React crashes.
90. **[Tech] Suspense:** Add lazy loading for Routes.
91. **[Tech] Toast System:** Implement `react-hot-toast` for notifications.

---

## Epic 10: Quality Assurance & Handover
**Goal:** Production readiness.

92. **[QA] Unit Tests (BE):** Jest tests for `products.service`.
93. **[QA] Integration Tests:** Supertest for API endpoints.
94. **[QA] Component Tests:** React Testing Library for `Button`.
95. **[Doc] Architecture:** Generate Master Architecture Doc.
96. **[Doc] API Reference:** Generate Swagger UI for internal API.
97. **[Doc] User Guide:** Write "How to Onboard" guide.
98. **[Doc] Runbook:** "How to Rotate Keys" disaster recovery doc.
99. **[QA] Load Test:** k6 script for Inventory endpoint.
100. **[QA] Accessibility:** Audit and fix contrast ratio issues.
101. **[Meta] HTML Bundle:** Generate single-file HTML documentation.
