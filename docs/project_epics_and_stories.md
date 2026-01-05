# Portal Feature Backlog & Roadmap

## Overview
This backlog outlines the features and capabilities of the APIM Self-Service Portal.

**Phase:** Active Development & Maintenance

---

## Epic 1: Identity & Access Management (IAM)
**Goal:** Zero-Trust implementation and Secure Access.

1.  **[FE] Identity Provider Integration:** Implement Entra ID (MSAL) for centralized authentication.
2.  **[FE] Secure Login Flow:** Redirect-based authentication with state preservation.
3.  **[BE] Token Validation:** JWT signature verification and audience checks.
4.  **[BE] Access Control Layout:** Middleware to enforce Role-Based Access Control (RBAC).
5.  **[BE] User Profile Sync:** Just-In-Time provisioning of user profiles upon first login.
6.  **[BE] Group Entitlements:** Map Corporate AD Groups to Portal Roles (Admin vs. Producer).
7.  **[FE] Protected Routes:** Navigation guards ensuring authorized access only.
8.  **[FE] Session Management:** Secure token storage and silent refresh mechanisms.
9.  **[FE] Sign-Out Protocol:** Global session termination and cleanup.
10. **[Sec] Security Hardening:** Implementation of CSP, HSTS, and Secure Headers.

---

## Epic 2: Digital Asset Inventory
**Goal:** Centralized catalog for API Products and Services.

11. **[BE] Product Catalog API:** Service to retrieve and filter API Products.
12. **[BE] Transactional Creation:** Atomic creation of Product and API metadata.
13. **[BE] Input Validation Layer:** Strict schema validation for incoming asset payload.
14. **[FE] Inventory State Management:** Global store for caching catalog data (Zustand).
15. **[FE] Data Grid Experience:** Rich tabular view with sorting, filtering, and pagination.
16. **[FE] Product Dashboard:** Detail view showing Analytics, APIs, and Subscriptions.
17. **[FE] API Listing:** Nested view of APIs belonging to a Product.
18. **[BE] Pagination Logic:** Efficient cursor/offset based data retrieval.
19. **[BE] Archival Strategy:** Soft-delete mechanisms for data preservation.
20. **[FE] Empty State Handling:** User guidance when no assets are found.

---

## Epic 3: Just-In-Time (JIT) Sync Engine
**Goal:** Ensuring specificiation parity between Git and the Portal.

21. **[BE] Source Control Integration:** Client for Azure DevOps REST API.
22. **[BE] Spec Retrieval:** Logic to fetch raw OpenAPI/Swagger files from remote repos.
23. **[BE] Spec Parsing:** Validation and parsing of OpenAPI 3.0+ documents.
24. **[BE] Change Detection:** Hashing algorithm to detect drift between Git and DB.
25. **[BE] Synchronization Logic:** Orchestration to update DB when Git changes are detected.
26. **[BE] Resilience:** Handling upstream 404s or API failures gracefully.
27. **[DB] Operation Registry:** Structured storage of individual API methods/paths.
28. **[FE] Synchronization Controls:** Manual trigger for on-demand sync.
29. **[FE] Sync Status Indicators:** Visual cues for "Last Synced" timestamps.
30. **[BE] Webhook Listener:** Event-driven updates triggered by Git Push events.
31. **[BE] Format Fallback:** Support for both JSON and YAML specification formats.

---

## Epic 4: Policy Studio (Visual Editor)
**Goal:** Low-Code interface for API Policy generation.

32. **[FE] Policy Visualization:** Swimlane-based rendering of Inbound/Outbound policies.
33. **[Eng] XML Parser:** Engine to convert raw XML into UI-friendly State objects.
34. **[Eng] XML Serializer:** Engine to convert UI State back into valid APIM XML.
35. **[FE] Code Editor:** Monaco-based editor for advanced "Raw Mode" editing.
36. **[FE] Validation Feedback:** Real-time syntax highlighting and error reporting.
37. **[BE] Policy Validator:** Dry-run validation against APIM schema.
38. **[BE] Linting Engine:** Application of Spectral rules to enforce governance.
39. **[Eng] Extension Support:** Handling of custom or unknown policy fragments (Preservation).
40. **[FE] Dual View Mode:** Toggle switch between Low-Code (Templates) and Raw XML Code view.

---

## Epic 5: Self-Service Onboarding Wizard
**Goal:** Streamlined creation of new API Products.

41. **[FE] Multi-Step Wizard:** Guided progression for Product setup.
42. **[FE] Draft Management:** Persistence of "Work in Progress" wizard state.
43. **[BE] Availability Checks:** Validation of unique Product IDs/Names.
44. **[FE] Team Selector:** Searchable interface for AD Group assignment.
45. **[FE] Summary Review:** Final confirmation screen before provisioning.
46. **[BE] SAGA Orchestrator:** Management of the distributed transaction (DB + External).
47. **[BE] Repository Strategy:** Integration with Governance tools (or ADO) to facilitate Repo creation.
48. **[BE] Scaffolding:** Generation of initial `openapi.yaml` templates.
49. **[FE] Success Feedback:** Visual confirmation and routing upon completion.

---

## Epic 6: Consumer Portal & Subscriptions
**Goal:** Access management and API consumption.

50. **[DB] Subscription Model:** Schema for managing Consumer-to-Product relationships.
51. **[KM] Secret Management:** Secure generation of Subscription Key identifiers.
52. **[BE] Application Linkage:** Association of Client IDs (App Registrations) to Subscriptions.
53. **[FE] App Registration Display:** Show linked app registration details (Client ID, Display Name, App ID URI) in product detail view and admin governance pages.
54. **[FE] Key Reveal UI:** Secure "Show/Hide" mechanism for API Keys.
55. **[BE] Auto-Approval Logic:** Rule engine for "Open" vs "Protected" products.
56. **[BE] Manual Approval Flow:** Workflow for Producers to grant/deny access.
57. **[BE] Key Rotation:** Logic to invalidate and regenerate keys via APIM.

---

## Epic 7: Governance & Auditing
**Goal:** Compliance and traceability.

57. **[BE] Audit Middleware:** Interceptor to log all write operations.
58. **[Eng] Diff Engine:** Utility to compare "Before" vs "After" states for Audit logs.
59. **[DB] Audit Store:** Immutable record of Who, What, When, and Why.
60. **[FE] Audit Log UI:** History tab showing chronological changes.
61. **[BE] Compliance Monitor:** Background job to detect orphaned resources.
62. **[FE] Compliance Alerts:** Dashboard notifications for ownership issues.
63. **[BE] Executive Reporting:** Aggregated stats for Platform Administrators.

---

## Epic 8: Frontend Modernization
**Goal:** Scalability and maintainability of the UI.

64. **[Refactor] Data Access Layer:** Centralized API clients for consistency.
65. **[Refactor] Type Safety:** Comprehensive TypeScript interfaces for all Domain objects.
66. **[Refactor] Domain Slicing:** Modular Redux/Zustand stores by feature.
67. **[Refactor] Component Library:** Shared UI Kit for consistent design tokens.
68. **[Tech] Error Handling:** Global Error Boundaries to prevent white-screens.
69. **[Tech] Lazy Loading:** Route-level code splitting for performance.
70. **[Tech] Notification System:** Centralized Toast/Snackbar manager.

---

## Epic 9: Quality Assurance & Launch
**Goal:** Reliability and Production Readiness.

71. **[QA] Backend Coverage:** Unit tests for Core Services and Business Logic.
72. **[QA] API Testing:** Integration tests for REST Endpoints.
73. **[QA] UI Testing:** Component-level tests for critical interactions.
74. **[Doc] System Architecture:** Maintenance of master diagram sets.
75. **[Doc] Developer Guide:** Onboarding documentation for new contributors.
76. **[Doc] Operational Runbooks:** Procedures for Incident Management and Recovery.
77. **[QA] Performance Profiling:** Load testing of critical paths (Inventory/Sync).
78. **[QA] Accessibility Audit:** WCAG compliance checks (Contrast/Screen Readers).
