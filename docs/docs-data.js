/**
 * AUTO-GENERATED FILE - DO NOT EDIT MANUALLY
 * Run 'node scripts/sync-docs.js' to update.
 */
window.EMBEDDED_DOCS = {
    system_overview: `# System Overview: APIM Self-Service Portal

The **APIM Self-Service Portal** is an enterprise-grade Internal Developer Platform (IDP) designed to streamline the lifecycle of Azure API Management resources through automation, governance, and GitOps.

## 🌟 Core Mission
To provide developer squads with **autonomy** to manage their own APIs while ensuring absolute **compliance** with corporate security and quality standards.

---

## 🚀 Key Capabilities

### 🛡️ Automated Governance
*   **Spectral Scoring**: Every API spec is automatically audited against OWASP and internal standards.
*   **Policy Guardrails**: Pre-approved policy templates prevent insecure XML configurations.

### 🔄 Multi-Environment Lifecycle
*   **One-Click Promotion**: Seamlessly move products from DEV to QA, STAGE, and PROD.
*   **Approval Gates**: Built-in validation gates ensure only quality-verified APIs reach production.

### 🔍 Discovery & Marketplace
*   **API Catalog**: Centralized registry for all internal and external APIs.
*   **Team Ownership**: Every resource is mapped to an owner team, ensuring accountability.

### 🧹 Drift & Orphan Management
*   **Smart Reconciliation**: Automatically identifies resources in APIM that are not tracked in Git or the Portal.
*   **Admin Reclamation**: Provides governance teams with tools to "adopt" and properly tag orphaned resources.

---

## 🏛️ Strategic Alignment
*   **Security First**: Integrated with Microsoft Entra ID (Azure AD) for granular RBAC.
*   **GitOps Driven**: All state changes are persisted to Azure DevOps Git, providing a complete audit trail.
*   **Scalable Architecture**: Targeted for Azure Kubernetes Service (AKS) with horizontal scaling capabilities.

> [!TIP]
> This platform reduces API onboarding time from **weeks** to **minutes** by automating manual ticket-based workflows.
`,

    architecture_diagrams: `# Enterprise Architecture Diagrams

This document provides visual representations of the APIM Self-Service Portal's architecture, deployment model, data flows, and database schema.

---

## 🛠️ 0. Technology Stack Overview
High-level breakdown of the chosen technologies for each layer of the application.

\`\`\`mermaid
graph TD
    %% Styles
    classDef azure fill:#0072C6,stroke:#fff,stroke-width:2px,color:#fff;
    classDef compute fill:#4caf50,stroke:#fff,stroke-width:2px,color:#fff;
    classDef db fill:#ff9800,stroke:#fff,stroke-width:2px,color:#fff;
    classDef ext fill:#607d8b,stroke:#fff,stroke-width:2px,color:#fff;
    classDef react fill:#61dafb,stroke:#fff,stroke-width:2px,color:#000;

    subgraph Frontend
        React["fa:fa-react React 18"]:::react
        TS_FE["fa:fa-code TypeScript"]:::react
        Tailwind["fa:fa-css3 Tailwind CSS"]:::react
        Zustand["fa:fa-database Zustand State"]:::react
        Vite["fa:fa-bolt Vite Bundler"]:::react
    end
    subgraph Backend
        NodeJS["fa:fa-node Node.js 20"]:::compute
        Fastify["fa:fa-server Fastify"]:::compute
        TS_BE["fa:fa-code TypeScript"]:::compute
        Spectral["fa:fa-check-circle Spectral Engine"]:::compute
    end
    subgraph Infrastructure
        AKS["fa:fa-dharmachakra AKS"]:::azure
        Postgres["fa:fa-database Azure Postgres"]:::db
        APIM["fa:fa-cogs Azure APIM"]:::azure
        KV["fa:fa-key Key Vault"]:::azure
    end
    subgraph Observability
        Dynatrace["fa:fa-chart-line Dynatrace"]:::ext
    end
    subgraph DevOps
        ADO["fa:fa-code-branch Azure DevOps"]:::azure
    end

    React --> NodeJS
    NodeJS --> AKS
    NodeJS --> Postgres
    NodeJS --> APIM
    NodeJS -.-> Dynatrace
    NodeJS <-->|Sync| ADO
\`\`\`

---

## 🧩 1. System Component Architecture (C4 Component)
Modular breakdown of the system components and their interactions, highlighting the separation between UI, Service Layer, and Infrastructure.

\`\`\`mermaid
graph LR
    %% Styles
    classDef azure fill:#0072C6,stroke:#fff,stroke-width:2px,color:#fff;
    classDef compute fill:#4caf50,stroke:#fff,stroke-width:2px,color:#fff;
    classDef db fill:#ff9800,stroke:#fff,stroke-width:2px,color:#fff;
    classDef ext fill:#607d8b,stroke:#fff,stroke-width:2px,color:#fff;
    classDef fe fill:#61dafb,stroke:#fff,stroke-width:2px,color:#000;

    subgraph "UI Layer (Micro-Frontends)"
        Catalog["fa:fa-book Catalog MFE"]:::fe
        Editor["fa:fa-edit Policy Editor MFE"]:::fe
        Admin["fa:fa-tachometer-alt Admin Dashboard MFE"]:::fe
        SharedUI["fa:fa-layer-group Shared UI Kit"]:::fe
    end

    subgraph "Service Layer (Node.js)"
        ProductSvc["fa:fa-box Product Service"]:::compute
        AuditSvc["fa:fa-clipboard-list Audit Service"]:::compute
        SyncEngine["fa:fa-sync JIT Sync Engine"]:::compute
        GitSvc["fa:fa-code-branch ADO Git Service"]:::compute
        AuthSvc["fa:fa-shield-alt Auth & RBAC Service"]:::compute
    end

    subgraph "Infrastructure & External"
        DB[("fa:fa-database PostgreSQL")]:::db
        APIM_API["fa:fa-cogs APIM ARM API"]:::azure
        ADO_API["fa:fa-code-branch ADO REST API"]:::azure
        KV["fa:fa-key Azure Key Vault"]:::azure
    end

    Catalog & Editor & Admin --> ProductSvc
    Editor --> SyncEngine
    ProductSvc --> AuditSvc
    ProductSvc --> SyncEngine
    ProductSvc --> GitSvc
    SyncEngine --> APIM_API
    GitSvc --> ADO_API
    AuditSvc --> DB
    ProductSvc --> DB
    ProductSvc -->|Resolve Secrets| KV
\`\`\`

---

## 🏗️ 2. Deployment Architecture (Azure AKS)
The system is designed for high availability and scalability using a containerized micro-frontend and micro-service architecture on **Azure Kubernetes Service (AKS)**.

\`\`\`mermaid
graph LR
    %% Styles
    classDef azure fill:#0072C6,stroke:#fff,stroke-width:2px,color:#fff;
    classDef compute fill:#4caf50,stroke:#fff,stroke-width:2px,color:#fff;
    classDef db fill:#ff9800,stroke:#fff,stroke-width:2px,color:#fff;
    classDef ext fill:#607d8b,stroke:#fff,stroke-width:2px,color:#fff;

    subgraph Lane1["User Zone"]
        direction TB
        User["fa:fa-user User (Browser)"]:::ext
    end

    subgraph Lane2["Ingress & Identity"]
        direction TB
        AGW["fa:fa-shield-alt App Gateway (WAF)"]:::azure
        EntraID["fa:fa-id-card Entra ID (Auth)"]:::azure
    end

    subgraph Lane3["AKS Cluster (App Zone)"]
        direction TB
        FE["fa:fa-laptop-code React MFE (Nginx)"]:::compute
        BE["fa:fa-server Node.js API (Fastify)"]:::compute
        Scorer["fa:fa-check-circle Spectral Engine"]:::compute
        FE --> BE
        BE <--> Scorer
    end

    subgraph Lane4["Data & Observability"]
        direction TB
        DB[("fa:fa-database Azure SQL (Postgres)")]:::db
        Storage["fa:fa-hdd Blob Storage"]:::db
        KV["fa:fa-key Key Vault"]:::azure
        Dynatrace["fa:fa-chart-line Dynatrace"]:::ext
    end

    subgraph Lane5["External Ecosystem"]
        direction TB
        APIM["fa:fa-cogs Azure APIM"]:::azure
        ADO["fa:fa-code-branch Azure DevOps"]:::azure
    end

    %% Flows
    User == HTTPS ==> AGW
    AGW == Routing ==> FE
    BE --> DB
    BE --> Storage
    BE --> KV
    BE --> APIM
    BE --> ADO
    BE -.-> Dynatrace
    BE -.-> EntraID
\`\`\`

---

## 📊 3. Database ER Diagram (Authoritative Model)
The following ERD captures the authoritative source of truth for the portal, showing relationships between teams, products, APIs, and governance resources.

\`\`\`mermaid
erDiagram
    teams ||--o{ products : owns
    teams ||--o{ user_teams : "has members"
    users ||--o{ user_teams : "belongs to"
    users ||--o{ audit_log : "performs actions"
    
    products ||--o{ apis : "contains"
    products ||--o{ subscriptions : "grants access"
    products ||--o{ named_values : "has config"
    products ||--o{ permission_matrix : "access rules"
    products ||--o{ drafts : "has staging files"

    apis ||--o{ operations : "cached endpoints"
    apis ||--o{ api_backends : "bound to"
    governance_backends ||--o{ api_backends : "is bound to"

    approval_requests ||--o{ drafts : "references"
    teams ||--o{ approval_requests : "requests"
    
    policy_help_requests ||--o{ policy_help_messages : "contains"
    users ||--o{ policy_help_messages : "sends"
    products ||--o{ policy_help_requests : "context"

    teams {
        text id PK
        text name
        text azure_ad_group_id
        text type "producer/consumer"
    }
    users {
        text id PK
        text email
        text role "user/admin"
    }
    products {
        text id PK
        text display_name
        text environment "DEV/QA/STAGE/PROD"
        text dev_hash "Git commit"
        text qa_hash "Git commit"
        jsonb authorized_teams
        text management_mode
    }
    apis {
        text id PK
        text product_id FK
        text path
        decimal quality_score
    }
    subscriptions {
        text id PK
        text product_id FK
        text subscriber_team_id FK
        text state "active/suspended"
    }
    named_values {
        text id PK
        text product_id FK
        text system_name
        text value
        boolean is_secret
    }
    audit_log {
        serial id PK
        text entity_type
        text action
        jsonb changes
        timestamptz timestamp
    }
\`\`\`

---

## 🚀 4. Detailed Onboarding Saga (Sequence)
API Onboarding is a distributed transaction ("Saga") ensuring consistency across DB, Git, and Azure APIM.

\`\`\`mermaid
sequenceDiagram
    autonumber
    participant User as Producer
    participant UI as React MFE
    participant API as Node.js Backend
    participant DB as PostgreSQL
    participant Blob as Azure Blob Storage
    participant Scorer as Scorer Engine
    participant ADO as Azure DevOps API
    participant ARM as Azure APIM (ARM)

    User->>UI: Upload Spec (Swagger/OpenAPI)
    UI->>API: POST /onboarding/upload
    API->>Blob: Store Draft Spec
    API->>Scorer: Request Linting & Audit
    Scorer-->>API: Return Score & Findings
    API-->>UI: Upload Successful (Score + Flags)
    
    User->>UI: Configure Product metadata (Team, Env)
    UI->>API: POST /onboarding/finalize
    
    rect rgb(240, 248, 255)
        Note over API, DB: Phase 1: Local Transaction
        API->>DB: INSERT products (State=PROVISIONING)
        API->>DB: INSERT apis & operations
    end

    rect rgb(255, 248, 240)
        Note over API, ARM: Phase 2: External Provisioning
        API->>ADO: Create Git Repository
        API->>ADO: Commit Initial Spec (openapi.yaml)
        API->>ARM: PUT Product (Provision in APIM)
    end

    rect rgb(240, 255, 240)
        Note over API, DB: Phase 3: Consensus
        API->>DB: UPDATE products (State=ACTIVE)
        API->>DB: Log Audit Entry
    end

    API-->>UI: Onboarding Complete
    UI-->>User: Success Message
\`\`\`

---

## 🔄 5. Multi-Environment Promotion (Saga Pattern)
Lifecycle of a change from DEV to PROD. This can be orchestrated via an external CI/CD pipeline OR internally by the Node.js Service ("Saga" orchestrator) using ARM templates.

\`\`\`mermaid
sequenceDiagram
    participant P as Portal (Admin)
    participant DB as Postgres
    participant Svc as Node.js Service
    participant ADO as Azure DevOps
    participant ARM as Azure APIM (ARM)

    P->>DB: Check Promotion Readiness (Quality > 80)
    P->>Svc: Trigger Promotion (dev -> qa)
    
    rect rgb(240, 248, 255)
        Note over Svc, ADO: Option A: GitOps (CI/CD)
        Svc->>ADO: Trigger Branch Merge
        ADO-->>Svc: Success (Pipeline Starts)
    end

    rect rgb(255, 248, 240)
        Note over Svc, ARM: Option B: Direct Orchestration (Saga)
        Svc->>ARM: Apply ARM Template (QA)
        ARM-->>Svc: 200 OK
    end
    
    Svc->>DB: Update 'qa_hash' for Product
    Svc-->>P: Promotion Complete
\`\`\`

---

## 🧠 6. Scorer Engine Logic (Flow)
Internal decision-making process for evaluating API Quality and Security compliance.

\`\`\`mermaid
flowchart TD
    Start([Receive API Spec]) --> Parse{Parse JSON/YAML}
    Parse -- Failure --> Err[Return Schema Error]
    Parse -- Success --> Spectral[Run Spectral Linter]
    
    Spectral --> Rules{Check Custom Rules}
    Rules --> Sec[Security Rules: OAuth/Scopes Check]
    Rules --> Std[Standard Rules: Versioning/Naming Check]
    
    Sec --> Calc[Calculate Weighted Quality Score]
    Std --> Calc
    
    Calc --> Threshold{Score > 75?}
    Threshold -- No --> Warn[Mark as 'Governance Warning']
    Threshold -- Yes --> Pass[Mark as 'Compliant']
    
    Pass --> End([Return Payload])
    Warn --> End
\`\`\`

---

## 🎨 7. Policy Editor State Machine
The Policy Editor manages the lifecycle of the XML policy document, ensuring structural integrity and compliance.

\`\`\`mermaid
stateDiagram-v2
    [*] --> Initializing
    Initializing --> FetchingData : Load XML from Repo
    FetchingData --> Parsing : Decompose XML
    
    state Parsing {
        [*] --> StructuralCheck
        StructuralCheck --> Valid : Schema Pass
        StructuralCheck --> Invalid : Schema Fail
    }

    Valid --> EditorMode : Ready
    Invalid --> EditorMode : Fallback (Raw Text)
    
    state EditorMode {
        [*] --> Idle
        Idle --> Editing : User Typing
        Editing --> Debouncing : 500ms Delay
        Debouncing --> Validating : Spectral Lint
        Validating --> Idle
    }

    EditorMode --> Saving : Click Save
    Saving --> [*]
\`\`\`
\`\`\`
`,

    enterprise_access_model: `# Enterprise Governance & Access Model

This document outlines the security architecture, access control levels, and responsibility matrix for the APIM Self-Service Portal. It is designed for management review to ensure compliance with enterprise governance standards.

## 🛡️ Access Control Philosophy
The system operates on an **Integrated RBAC & Attribute-Based Access Control (ABAC)** model, using a "Triple-Gate" verification process for every request.

### 1. Access Levels
| Level | Description | Target User |
| :--- | :--- | :--- |
| **NONE** | Zero visibility. Product/Resource is invisible in the UI. | Unauthorized users in protected environments (STAGE/PROD). |
| **READ** | View-only access. Can see documentation, specs, and own subscriptions. | Consumers and general developers. |
| **WRITE** | Full management access. Can edit policies, update contracts, and manage lifecycle. | Resource Owners (Producers) and Governance Admins. |

---

## 🔐 The Triple-Gate Security Model
Every resource request (Product, API, Named Value) must pass three security gates before the Backend returns data.

1.  **Gate 1: Ownership Check**
    *   Is the user a member of the **Owner Team** or an **Authorized Team**?
2.  **Gate 2: Environment Protection**
    *   For **STAGE** and **PROD**, the user **MUST** belong to a specific Azure AD Group mapped in the \`permission_matrix\` for that product.
    *   Failure at this gate results in an immediate \`NONE\` access level (Automatic Data Stripping).
3.  **Gate 3: Deployment State**
    *   The system verifies if the product is actually deployed in the requested region (via Git Hash validation). If not, write actions are disabled even for owners.

---

## 📝 Responsibility & Ownership Matrix
| Component | Responsible Party | Access Requirement | Ownership Context |
| :--- | :--- | :--- | :--- |
| **API Specifications** | Producer / Squad | **WRITE** | Owned by the specific team defined in \`owner_team_id\`. |
| **Policy Logic (XML)** | Producer / Squad | **WRITE** | Governed by the team; changes require valid Git Sync. |
| **Orphan Resources** | Governance Admin | **WRITE** | Resources with no \`scope\` are reclaimed by Admins. |
| **Global Config** | Platform Team | **WRITE** | Managed exclusively by Admins at the platform level. |
| **Consumer Access** | Consumers | **READ** | Self-service discovery and subscription management. |

---

## 🕵️ Auditing & Compliance
Every **WRITE** action, whether internal or external (APIM/ADO), is subject to mandatory institutional auditing.

### System-to-Human Audit Linkage
The system maintains a rigid link between the **Platform Identity** (Managed Identity/Service Account) and the **Human User**:
*   **Internal Capture**: All modifications are captured in the \`audit_log\` table with the unique User ID, timestamp, and business justification.
*   **External Correlation**: Every action performed on Azure or ADO by the Portal's identity is logged in the Portal DB first. This allows auditors to trace an Azure Activity Log entry (e.g., "MI updated Policy") back to the specific human who clicked the button in the Portal.

### Responsibility for Audit Review
*   **Management**: Responsible for periodic review of \`audit_log\` exports to verify squad compliance.
*   **System Integrity**: The Portal DB preserves an immutable history of *who* authorized *what* platform change.

> [!IMPORTANT]
> **Audit Completeness**: No platform change (APIM or ADO) is executed unless it is first successfully durably recorded in the Portal's Audit Database.

---

## 🤝 Automated Platform Entitlements (Negotiation & Compliance)
To deliver a true Self-Service experience while respecting enterprise constraints, we require the following specific entitlements.

### 1. Azure API Management (APIM)
*   **Requirement**: The Portal's Managed Identity requires \`Contributor\` access (Create/Update/Delete) to the APIM instance.
*   **Justification**: The Portal completely abstracts the Azure Portal for developers. It automates complex, error-prone tasks like XML Policy assembly and API versioning.
*   **Control Mechanism (Double Audit)**:
    1.  **Internal**: Every action is logged in our ACID-compliant \`audit_log\` linking the *Human User* to the intent.
    2.  **External**: The action is executed by the *Managed Identity*, leaving a trace in Azure Monitor / Entra ID.
    *   *Result*: Security can correlate "What happened in Azure" (ID) with "Who requested it" (User) at any time.

### 2. Azure DevOps (ADO)
*   **Primary Request**: We request \`Create Repository\`, \`Create Branch\`, and \`Git Commit\` permissions.
    *   *Why?* To streamline onboarding (One-Click Product Creation) and GitOps (Policy Synchronization).
*   **Fallback Strategy (If "Create Repo" is Restricted)**:
    *   We understand if specific Governance tools (like **Port.io** or ServiceNow) own the "Repo Creation" lifecycle.
    *   **Compromise**: The upstream tool can provision the repository and grant our Service Account \`Contributor\` access.
    *   **Non-Negotiable**: We **must** retain \`Git Commit\` and \`Branch Creation\` access to manage the content (OpenAPI specs, Policies) within those repositories to ensure the system functions as a developer platform.
`,

    platform_connectivity_matrix: `# Platform Connectivity & External Access Requirements

This document details the external permissions required by the APIM Self-Service Portal to interact with Azure and Azure DevOps (ADO). It is intended for management decision-making and security review.

---

## ☁️ Azure API Management (APIM) Connectivity
The Portal acts as the primary automation engine for the APIM management plane.

### 🔑 Authentication: Managed Identity (MI)
*   **Requirement**: The Portal requires a **System-Assigned Managed Identity**.
*   **Rationale**: This enables passwordless, certificate-free authentication, significantly reducing the risk of secret leakage while providing a unique identity for all automation.

### 🔓 Permission Scope: Full Resource Lifecycle
To provide self-service autonomy, the Portal identity requires **Contributor** permissions within the APIM Scope to perform the following:
*   **CREATE/UPDATE**: Provisioning new Products, APIs, Backends, and Named Values.
*   **DELETE**: Cleaning up retired APIs or reclaiming orphaned resources.
*   **WRITE**: Synchronizing complex XML policies and Git-managed manifests.

### 🕵️ Institutional Auditing & Accountability
Every action initiated by the Managed Identity is cross-referenced for 100% accountability:
1.  **Azure Activity Log**: Standard platform-level audit showing *what* the Identity changed in Azure.
2.  **Portal Audit Trail**: Internal \`audit_log\` linking the Azure action to the **specific human requester** (User ID) and their business justification.
    *   *Example*: If a policy is updated, the internal log records: "User X updated Policy Y via Portal Identity for Approval ID Z."

---

## 🚀 Azure DevOps (ADO) Connectivity
The Portal ensures consistency between the APIM runtime and your source code repositories.

### 🔓 Permission Scope: Project-Level Management
The Service Account (SP/PAT) requires permissions beyond simple git pushes:
*   **Repository Creation**: Automatically provision new Git Repositories for squads during the Product Onboarding wizard.
*   **Branch Management**: Initializing \`main\` branches and setting mandatory governance folders (\`/policies\`, \`/specs\`).
*   **Contributor Access**: Ongoing synchronization of manifests and version-controlled artifacts.

### 🕵️ Audit Logic
*   **Traceability**: All automated repo creations and commits are tagged with the Portal's Service Account.
*   **Compliance**: Ensures that no production API exists in APIM without a corresponding, accurately versioned repository in Azure DevOps.

---

## 🏛️ Responsibility Matrix (External)
*   **Platform Team**: Responsible for provisioning the Managed Identity and ADO Service Account.
*   **Security Team**: Responsible for reviewing Azure Activity Logs and ADO Audit Logs.
*   **Owner Teams**: Responsible for the *content* of the policies pushed via the Portal.

---

> [!NOTE]
> **Zero-Secret Strategy**: By leveraging Managed Identity for Azure and **Azure Key Vault** for ADO secrets, the Portal maintains a high security posture with minimal overhead.
`,

    backend_documentation: `# Backend Engineer's Reference: Architecture & Scaling

## 1. Transactional Flow: The "Onboarding" SAGA
Creating a product is not a single DB insert. It is a distributed transaction across 3 systems. We manage this ensuring eventual consistency.

\`\`\`mermaid
sequenceDiagram
    autonumber
    participant Client
    participant Backend
    participant DB as Postgres
    participant APIM as Azure APIM
    participant ADO as Azure DevOps

    Client->>Backend: POST /products (Name, Team)
    
    rect rgb(240, 248, 255)
        note right of Backend: Phase 1: Local Persistence
        Backend->>DB: INSERT INTO products (State=PROVISIONING)
        DB-->>Backend: Product ID (UUID)
    end
    
    rect rgb(255, 248, 240)
        note right of Backend: Phase 2: External Resources
        Backend->>ADO: Create Repo "api-{name}"
        ADO-->>Backend: git_repo_url
        
        Backend->>APIM: Create Product (ARM PUT)
        APIM-->>Backend: Resource ID
    end
    
    rect rgb(240, 255, 240)
        note right of Backend: Phase 3: Consensus
        Backend->>DB: UPDATE products SET State=ACTIVE, repo_url=...
        Backend->>Backend: commit()
    end
    
    Backend-->>Client: 201 Created
\`\`\`

---

## 2. Microservices Architecture
The system is architected as a set of distributed **Microservices** to support scaling to **10 million daily API calls**.

### The Service Mesh

### Service Architecture

\`\`\`mermaid
graph TD
    classDef micro fill:#bbdefb,stroke:#0d47a1,stroke-width:2px;

    User[User Request]

    Gateway[API Gateway / Ingress]
    
    Svc1[Core Inventory Service]:::micro
    Svc2[ARM/IaC Worker]:::micro
    Svc3[Audit & Compliance Service]:::micro
    Svc4[Policy Intelligence Engine]:::micro
    
    DB1[(Inventory DB)]
    DB2[(Audit DB)]

    User --> Gateway
    Gateway --> Svc1
    Gateway --> Svc4
    
    Svc1 -- "Async Event (ServiceBus)" --> Svc2
    Svc1 -- "Async Event" --> Svc3
    
    Svc1 -.-> DB1
    Svc3 -.-> DB2
\`\`\`

### Why & When to Split?
1.  **ARM Logic (\`teams.service.ts\`):** Azure operations are slow (2-3s). Moving this to a **Worker Queue** pattern allows the API to respond instantly.
2.  **Audit Logs:** High write volume. Dedicated ingestion service prevents blocking the main thread.

---

## 3. Horizontal Scaling & KEDA
How do we handle traffic spikes?

\`\`\`mermaid
graph LR
    Metric[CPU / HTTP Request Count] --> KEDA[KEDA Scaler]
    KEDA -- "Scale Out (1->10)" --> Pods[Backend Pods]
    Pods -- "Load Balance" --> DB[Database Connection Pool]
\`\`\`

*   **Statelessness:** The backend stores NO session state (JWT only). This means we can scale from 1 replica to 50 instantly.
*   **Database Pooling:** We use \`pg-pool\` to ensure that 50 pods don't exhaust the Postgres connection limit (Max 100 connections).
*   **Async Processing:** Heavy jobs (Spec Parsing) are candidates for **Azure Functions** triggered by Event Grid, offloading CPU work from the main API.

---

## 4. JIT Sync Logic (Internal Flow)
The "Just-In-Time" sync is the most CPU-intensive operation.

\`\`\`mermaid
flowchart TD
    Req["User requests API Details"] --> Cache{"Check Ops Cache?"}
    Cache -- Hit --> Return["Return DB Rows"]
    Cache -- Miss/Stale --> Fetch["Fetch YAML from ADO"]
    
    Fetch --> Parse["SwaggerParser.parse()"]
    Parse --> Validate{"Spectral Lint Pass?"}
    
    Validate -- Valid --> Upsert["Bulk UPSERT to DB"]
    Validate -- Invalid --> Error["Mark as Broken"]
    
    Upsert --> Return
\`\`\`

---

## 5. Error Handling & Observability
We use a combination of structured logging, distributed tracing, and alerting.

\`\`\`mermaid
graph TD
    UserRequest[User Request] --> API[Node.js API]
    API --> Logger[Winston Logger]
    API --> Tracer[OpenTelemetry Tracer]
    API --> DB[PostgreSQL]
    
    Logger --> Dynatrace[Dynatrace]
    Tracer --> Dynatrace
    
    Dynatrace --> Alerts[Dynatrace Alerts]
    Dynatrace --> Dashboards[Dynatrace Dashboards]
\`\`\`

*   **Structured Logging:** All logs are JSON formatted, allowing for easy querying in Dynatrace.
*   **Correlation IDs:** Every request gets a unique correlation ID, propagated through all downstream calls.
*   **Health Checks:** \`/health\` endpoint for liveness/readiness probes.

---

## 6. Database Migrations (Native SQL)
We use raw SQL scripts for schema management to ensure zero-dependency portability.

\`\`\`mermaid
sequenceDiagram
    participant Dev as Developer
    participant Script as npm run setup-db
    participant DB as PostgreSQL

    Dev->>Script: Execute 01-god-schema.sql
    Script->>DB: DROP SCHEMA public CASCADE
    DB-->>Script: Schema Dropped
    Script->>DB: EXECUTE DDL (CREATE TABLES)
    DB-->>Script: Schema Created
    Script-->>Dev: DB Reset & Ready
\`\`\`

*   **Logic:** \`apim-database/scripts/utils/setup-db.ts\`
*   **Schema:** \`apim-database/schema/01-god-schema.sql\`
*   **Philosophy:** We avoid ORMs for DDL to keep the database layer decoupled from the backend application logic.
`,

    frontend_documentation: `# Frontend Developer Guide: Architecture & Scaling

## 1. Visual Architecture Overview
The frontend is designed as a **Federated Host** application. It is not just a collection of pages, but a composition of autonomous feature modules.

\`\`\`mermaid
graph TD
    classDef scope fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef store fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;

    subgraph User["User Interaction"]
        Click["Click 'Edit Policy'"]
    end

    subgraph Feature["Feature: Policy Studio"]
        View["Smart Container (PolicyStudio.tsx)"]:::scope
        Hook["usePolicyStudio Hook"]:::scope
        UI["Dumb UI (PolicyCanvas.tsx)"]:::scope
    end

    subgraph State["Global State (Zustand)"]
        Slice["PolicySlice"]:::store
        Action["updateXml()"]:::store
    end

    subgraph Ext["External System"]
        API["Backend API"]
    end

    Click --> UI
    UI -- "onEdit(xml)" --> View
    View --> Hook
    Hook --> Action
    Action -- "State Update" --> Slice
    Slice -- "Re-render" --> View
    
    Hook -- "Async Fetch" --> API
\`\`\`

---

## 2. Policy Studio: State Machine Diagram
The Policy Studio is a complex engine that transitions between "Visual" and "Code" states. Ensuring these states never drift is critical.

\`\`\`mermaid
stateDiagram-v2
    [*] --> Loading
    
    Loading --> VisualMode : XML Parsed Successfully
    Loading --> CodeMode : XML Parsing Failed (Fallback)

    state VisualMode {
        [*] --> Idle
        Idle --> Dragging : User Starts Drag
        Dragging --> Dropped : Item Placed
        Dropped --> Regenerating : Trigger XML Gen
        Regenerating --> Idle : State Updated
    }

    state CodeMode {
        [*] --> Typing
        Typing --> Parsing : On Blur / Debounce
        Parsing --> Valid : Structure OK
        Parsing --> Invalid : Syntax Error
        Invalid --> Typing : User Fixes
    }

    VisualMode --> CodeMode : User clicks "View Code"
    CodeMode --> VisualMode : User clicks "Visual Editor" (If Valid)
\`\`\`

---

## 3. Data Flow Sequence: The "Hook Pattern"
We strictly enforce a unidirectional data flow. Components never talk to APIs directly.

\`\`\`mermaid
sequenceDiagram
    participant UI as Component
    participant Hook as useInventory()
    participant Store as Zustand Store
    participant Client as Axios Client
    participant API as Backend Service

    UI->>Hook: loadInventory()
    activate Hook
    Hook->>Store: setIsLoading(true)
    
    Hook->>Client: getProducts()
    activate Client
    Client->>API: GET /v1/products
    API-->>Client: 200 OK [JSON]
    deactivate Client
    
    Client-->>Hook: Data
    Hook->>Store: setProducts(data)
    Hook->>Store: setIsLoading(false)
    deactivate Hook
    
    Store-->>UI: Re-render with Data
\`\`\`

---

## 4. Scaling The Frontend
How do we go from 5 developers to 50?

### Strategy 1: Federation (Module Splitting)
Currently, modules are imported statically. To scale, we can convert \`src/features/*\` into **Webpack Module Federation** remotes.
*   **Team A** owns \`git/inventory-mfe\` -> Deploys \`inventory.js\`.
*   **Team B** owns \`git/policy-mfe\` -> Deploys \`policy.js\`.
*   **App Host** consumes them at runtime.

### Strategy 2: State Isolation
We intentionally avoided a single \`RootState\` type exported from \`store/index.ts\` to prevent circular dependencies.
*   **Rule:** Feature A cannot import Feature B's slice directly.
*   **Communication:** Uses the \`Global Event Bus\` (or lightweight UI slice) for cross-feature signaling (e.g., "Toast Notification").

### Strategy 3: Component Library (Design System)
To maintain consistency at scale, \`src/shared/ui\` should be extracted to a private NPM package (\`@company/ui-kit\`).
*   **Before:** Import local button.
*   **After:** \`import { Button } from '@company/ui-kit'\`.
*   **Benefit:** Versioned breaking changes for UI.
`,

    project_epics_and_stories: `# Portal Feature Backlog & Roadmap

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
48. **[BE] Scaffolding:** Generation of initial \`openapi.yaml\` templates.
49. **[FE] Success Feedback:** Visual confirmation and routing upon completion.

---

## Epic 6: Consumer Portal & Subscriptions
**Goal:** Access management and API consumption.

50. **[DB] Subscription Model:** Schema for managing Consumer-to-Product relationships.
51. **[KM] Secret Management:** Secure generation of Subscription Key identifiers.
52. **[BE] Application Linkage:** Association of Client IDs (App Registrations) to Subscriptions.
53. **[FE] Key Reveal UI:** Secure "Show/Hide" mechanism for API Keys.
54. **[BE] Auto-Approval Logic:** Rule engine for "Open" vs "Protected" products.
55. **[BE] Manual Approval Flow:** Workflow for Producers to grant/deny access.
56. **[BE] Key Rotation:** Logic to invalidate and regenerate keys via APIM.

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
`,

    decision_log: `# Architecture Decision Log (ADR)

## ADR-001: Micro-Frontend (MFE) Readiness
*   **Status:** Adopted
*   **Context:** The portal is growing. We need to prevent "prop drilling" and massive monolithic components.
*   **Decision:** Components must accept callback props (e.g., \`onManage\`, \`onNavigate\`) rather than using \`useNavigate()\` directly. This allows them to be embedded in different parent contexts (Admin Dashboard vs. Product Page) without tight coupling to the router.
*   **Outcome:** \`ApiInterfaceCatalog\` was refactored to allow the parent to control navigation.

## ADR-002: Just-In-Time (JIT) Spec Synchronization
*   **Status:** Adopted
*   **Context:** We need to search and display API endpoints (operations), but the "Source of Truth" for the spec is in Git (ADO), not our DB. Replicating the full spec in DB introduces drift.
*   **Decision:** We implement a "JIT Sync". When a spec is fetched for viewing (via \`/products/:id/spec\`), the backend asynchronously parses it and upserts the operation signatures (method, path) into the \`operations\` table.
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
`,

    access_requirements: `# System Prerequisites: Access & Infrastructure

## Overview
This document outlines the infrastructure dependencies and access scopes required to successfully deploy and operate the **APIM Self-Service Portal**. It serves as a reference for DevOps engineers, Security compliance officers, and IT Administrators to understand *what* the system connects to and *why*.

The architecture adheres to the principle of **Least Privilege**, requesting only the specific scopes necessary to automate API management workflows.

---

## 1. Azure API Management (APIM)
The portal acts as a control plane for APIM, automating routine tasks like creating APIs and updating Policies.

**Identity:** User-Assigned Managed Identity
**Recommended Role:** \`API Management Service Contributor\`

| Feature | Scope | Technical Requirement |
| :--- | :--- | :--- |
| **API Publishing** | APIM Service | Capability to \`PUT\` new APIs and Operations when a producer syncs from Git. |
| **Policy Studio** | APIM Policies | Capability to \`PUT\` policy XML fragments (e.g., Rate Limits, IP filters) at the API level. |
| **Resource Discovery** | Resource Group | Capability to \`LIST\` available APIM instances to display in the Environment selector. |

---

## 2. Azure DevOps (ADO)
The system uses ADO as the "Source of Truth" for OpenAPI specifications and Policy definitions. It does not store these files permanently in its own database.

**Identity:** Service Connection / PAT
**Scope:** Project or Organization Level

| Feature | Permission | Technical Requirement |
| :--- | :--- | :--- |
| **Spec Synchronization** | \`Code (Read)\` | Fetch \`openapi.yaml\` content to parse endpoints and validate Linting rules. |
| **Automated PRs** | \`Code (Write)\` | Create branches and commit changes when a user requests a "Promotion" to a higher environment. |
| **Promotion Workflow** | \`PullRequest (Contribute)\` | Automatically open Pull Requests to merge changes from \`Dev\` to \`QA\`. |

---

## 3. Database (PostgreSQL)
The application uses a persistent store for metadata that lives outside of APIM (e.g., Team ownership, Audit logs, Subscription requests).

**Database Name:** \`apim_inventory\`

| Role | Operations | Technical Requirement |
| :--- | :--- | :--- |
| **Runtime User** | \`SELECT, INSERT, UPDATE\` | Standard CRUD operations for application entities (Products, Teams, Audit Logs). |
| **Migration User** | \`DDL (CREATE/ALTER)\` | Used primarily by the CI/CD pipeline to apply schema updates during deployments. |

---

## 4. Identity & Governance (Entra ID)
The portal integrates with Entra ID (formerly Azure AD) to manage Team membership and resolve identities.

**Identity:** App Registration

| Feature | Graph Permission | Technical Requirement |
| :--- | :--- | :--- |
| **Orphaned Resource Check** | \`GroupMember.Read.All\` | Periodically verify if the "Owner Group" of an API still has active members. |
| **Audit Logging** | \`User.Read.All\` | Resolve Object IDs (OIDs) to readable names (e.g., "John Doe") in the Audit Trail. |
| **Team Onboarding** | \`Directory.Read.All\` | specific scope to search for existing Security Groups to onboard as new Teams. |

---

## Network Requirements
For the application to function correctly within a VNET or Firewalled environment:

*   **Azure ARM API:** \`management.azure.com:443\` (APIM Control Plane)
*   **Azure DevOps:** \`visualstudio.com:443\` (Source Control)
*   **PostgreSQL:** Internal connection to the database (typically port \`5432\`)
`
};
