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
    AKS ---|HPA Scaling| AKS
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

    subgraph "Data Sync & Background Jobs"
        ETL["fa:fa-database Scheduled ETL Sync"]:::compute
    end

    subgraph "Infrastructure & External"
        DB[("fa:fa-database PostgreSQL")]:::db
        APIM_API["fa:fa-cogs APIM ARM API"]:::azure
        ADO_API["fa:fa-code-branch ADO REST API"]:::azure
        KV["fa:fa-key Azure Key Vault"]:::azure
        Entra_API["fa:fa-id-card Entra ID (Graph API)"]:::azure
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
    ETL --> APIM_API & ADO_API & DB & Entra_API
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
        direction LR
        subgraph RequestPath["Request Path"]
            direction TB
            Ingress["fa:fa-network-wired Ingress/Reverse Proxy (Nginx)"]:::compute
            FE["fa:fa-laptop-code React MFE (Nginx)"]:::compute
            BE["fa:fa-server Node.js API (Fastify)"]:::compute
            Ingress -->|Path: /| FE
            Ingress -->|Path: /api| BE
        end

        %% Connections to Internal Services (Now on the right due to LR direction of Lane3)
        subgraph InternalServices["Internal Services"]
            direction TB
            Scorer["fa:fa-check-circle Spectral Engine"]:::compute
            ETL["fa:fa-database Scheduled ETL Sync Pod"]:::compute
        end

        BE <--> Scorer
        ETL -.-> BE
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
    AGW == Routing ==> Ingress
    BE --> DB
    BE --> Storage
    BE --> KV
    BE --> APIM
    BE --> ADO
    BE -.-> Dynatrace
    BE -.-> EntraID
    ETL -.-> EntraID
\`\`\`

---

## 🚀 3. Detailed Onboarding Saga (Sequence)
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

    database_schema: `# Database Schema & ER Diagram

This document provides a detailed representation of the authoritative database schema used by the APIM Self-Service Portal.

---

## 📊 Entity Relationship Diagram (ERD)

The following diagram captures the relationships between core entities such as Teams, Products, APIs, and Governance logs.

\`\`\`mermaid
erDiagram
    teams ||--o{ products : owns
    teams ||--o{ users : "default team"
    teams ||--o{ app_registrations : "managed by"
    users ||--o{ audit_log : "performs"
    users ||--o{ drafts : "creates"
    users ||--o{ policy_help_requests : "requests help"
    
    products ||--o{ apis : contains
    products ||--o{ product_deployments : "tracked in"
    products ||--o{ subscriptions : "grants access"
    products ||--o{ named_values : "has config"
    products ||--o{ app_registrations : "authenticated by"
    products ||--o{ permission_matrix : "access control"
    products ||--o{ drafts : "staging context"
    products ||--o{ product_named_values : references
    products ||--o{ governance_backends : "points to"

    apis ||--o{ operations : defines
    apis ||--o{ app_registrations : "isolated identities"
    apis ||--o{ named_values : "api-scoped config"
    apis ||--o{ governance_backends : "points to"
    apis ||--o{ api_backends : "bound to"

    named_values ||--o{ product_named_values : "shared across"
    approval_requests ||--o{ drafts : "triggers"
    policy_help_requests ||--o{ policy_help_messages : "message thread"
    drafts ||--o{ blob_history : "lifecycle tracking"
    
    governance_backends ||--o{ api_backends : "mapping"

    teams {
        text id PK
        text name
        text azure_ad_group_id
        text type "producer/consumer"
        text contact_email
        int member_count
    }
    users {
        text id PK
        text email
        text name
        text azure_ad_object_id
        text default_team_id FK
        text role "user/admin"
    }
    products {
        text id PK
        text name
        text display_name
        text environment "DEV/QA/STAGE/PROD"
        text region
        text management_mode "TERRAFORM_MANAGED/HYBRID"
        text git_repo_url
        text owner_team_id FK
        decimal quality_score
        jsonb detected_anomalies
    }
    apis {
        text id PK
        text product_id FK
        text name
        text path
        text gateway_url
        decimal quality_score
    }
    operations {
        text id PK
        text api_id FK
        text method "GET/POST/..."
        text url_template
    }
    app_registrations {
        text id PK
        text client_id
        text display_name
        text product_id FK
        text api_id FK
        text type "PRODUCT/API"
    }
    subscriptions {
        text id PK
        text product_id FK
        text subscriber_team_id FK
        text app_registration_id FK
        text state "active/pending/..."
    }
    named_values {
        text id PK
        text product_id FK
        text scope_id FK "API scope"
        text system_name
        text value
        boolean is_secret
    }
    governance_backends {
        text id PK
        text environment PK
        text url
        text scope "API/GLOBAL"
        text product_id FK
        text api_id FK
    }
    approval_requests {
        text id PK
        text type "SUBSCRIPTION/PROMOTION/..."
        text status "PENDING/APPROVED/..."
        text requester_team_id FK
        jsonb details
    }
    audit_log {
        uuid id PK
        text user_id
        text action
        text resource_type
        jsonb details
        timestamp created_at
    }
\`\`\`

---

## 📖 Data Dictionary

### Core Identity & Access
| Table | Column | Type | Description |
| :--- | :--- | :--- | :--- |
| **teams** | \`id\` | TEXT (PK) | Unique identifier for the team. |
| | \`name\` | TEXT | Human-readable name of the team. |
| | \`azure_ad_group_id\` | TEXT | Link to Entra ID (formerly Azure AD) group. |
| **users** | \`id\` | TEXT (PK) | Unique identifier for the user. |
| | \`azure_ad_object_id\`| TEXT | Link to Entra ID user object. |
| | \`role\` | TEXT | Portal role: \`user\` or \`admin\`. |
| **permission_matrix** | \`product_id\` | TEXT | The logical product the permission applies to. |
| | \`ad_group_id\` | TEXT | The Entra ID group granted access. |
| | \`role\` | TEXT | Role level: \`Reader\`, \`Contributor\`, \`Owner\`. |

### Inventory & Management
| Table | Column | Type | Description |
| :--- | :--- | :--- | :--- |
| **products** | \`id\` | TEXT (PK) | Unique identifier (e.g., \`prod-inventory-dev\`). |
| | \`management_mode\` | TEXT | \`TERRAFORM_MANAGED\`, \`HYBRID\`, or \`UNTRACKED\`. |
| | \`identity_client_id\` | TEXT | Primary App Registration bound to this product. |
| **apis** | \`id\` | TEXT (PK) | Unique identifier for the API implementation. |
| | \`product_id\` | TEXT (FK) | Parent product link. |
| | \`path\` | TEXT | Gateway relative path (e.g., \`/api/v1/users\`). |
| **operations** | \`method\` | TEXT | HTTP Verb (GET, POST, etc.). |
| | \`url_template\` | TEXT | REST path template for the operation. |

### Configuration & Connectivity
| Table | Column | Type | Description |
| :--- | :--- | :--- | :--- |
| **named_values** | \`system_name\` | TEXT | Variable name in APIM (e.g., \`backend-url\`). |
| | \`value\` | TEXT | Value or KeyVault reference. |
| | \`scope_id\` | TEXT (FK) | Optional link to a specific API for isolated config. |
| **governance_backends**| \`url\` | TEXT | The actual backend service URL. |
| | \`scope\` | TEXT | \`API-level\` or \`GLOBAL\` scope. |

### Lifecycle & Governance
| Table | Column | Type | Description |
| :--- | :--- | :--- | :--- |
| **subscriptions** | \`state\` | TEXT | Lifecycle state: \`active\`, \`pending\`, \`expired\`, etc. |
| | \`app_registration_id\`| TEXT (FK) | Link to the consumer's App Registration. |
| **approval_requests** | \`type\` | TEXT | Type of request (e.g., \`PROMOTION_REQUEST\`). |
| | \`details\` | JSONB | Payload containing the specific changes requested. |
| **audit_log** | \`action\` | TEXT | Action performed (e.g., \`DELETE\`, \`READ_KEYS\`). |
| | \`resource_id\` | TEXT | ID of the affected resource. |

---

> [!NOTE]
> This schema is synchronized with the PostgreSQL database. Any manual changes to the schema must be reflected here.
`,

    user_flows_and_sequences: `# Detailed User Flows & Sequence Diagrams

Comprehensive documentation of the specific interactions between users, the Portal Backend, and external systems (Azure APIM, ADO, DB).

---

## 👨‍💻 1. Producer Persona Flows
The Producer manages the lifecycle of their API Products.

### 1.1 API Product Onboarding (Discovery to Provisioning)
Covers the flow from initial spec upload to a fully provisioned environment in Azure, including identity enforcement.

\`\`\`mermaid
sequenceDiagram
    autonumber
    participant P as Producer
    participant UI as Portal Frontend
    participant BE as Portal Backend
    participant SC as Scorer Engine
    participant DB as Postgres DB
    participant AZURE as Entra ID / ARM
    participant ADO as Azure DevOps
    participant APIM as Azure APIM

    P->>UI: Select "Onboard New Product"
    P->>UI: Upload OpenAPI Spec (.yaml/.json)
    UI->>BE: POST /onboarding/validate
    BE->>SC: Run Spectral Lint & Scoring
    SC-->>BE: Score (e.g., 85/100) + Warnings
    BE-->>UI: Returning Score & Validation Result
    UI-->>P: Display Score & Governance Feedback

    P->>UI: Provide App Registration (Client ID)
    Note right of P: Admin/Lead selection (Product vs API Level)
    UI->>BE: POST /onboarding/check-identity
    BE->>AZURE: Validate Client ID exists
    BE->>DB: Check for One-Time Binding (Unicity)
    BE-->>UI: Identity Validated (Display Name, Scopes)

    P->>UI: Confirm Onboarding & Assign Team
    UI->>BE: POST /onboarding/finalize
    BE->>DB: INSERT product (status="PROVISIONING")
    BE->>DB: INSERT app_registration record
    
    par Component Creation (Saga)
        BE->>ADO: Create Repository & Branch
        BE->>ADO: Commit openapi.yaml
        BE->>APIM: Create/Update APIM Product & APIs
    end
    
    BE->>DB: UPDATE product (status="ACTIVE", owner_team_id)
    BE-->>UI: Onboarding Successful
    UI-->>P: Product available in Catalog
\`\`\`

### 1.2 Onboarding Saga: Compensation (Rollback) Flow
Detailed flow showing how the system handles failures during the multi-system provisioning process.

\`\`\`mermaid
sequenceDiagram
    autonumber
    participant BE as Portal Backend
    participant DB as Postgres DB
    participant ADO as Azure DevOps
    participant APIM as Azure APIM

    BE->>DB: Product State -> "PROVISIONING"
    
    BE->>ADO: Create Repository (SUCCESS)
    
    BE->>APIM: Create Product (FAILURE - Timeout/Conflict)
    
    rect rgb(255, 230, 230)
        Note over BE, DB: Compensation Logic Triggered
        BE->>ADO: DELETE Repository (Cleanup)
        BE->>DB: UPDATE product (status="FAILED", error="APIM_TIMEOUT")
        BE->>DB: Log Audit: "PROVISIONING_ROLLBACK_COMPLETE"
    end
\`\`\`

### 1.3 Identity Inheritance (Existing Product Onboarding)
Flow for adding a new API to an existing Product while inheriting its security identity.

\`\`\`mermaid
sequenceDiagram
    autonumber
    participant P as Producer
    participant BE as Portal Backend
    participant DB as Postgres DB
    participant APIM as Azure APIM

    P->>BE: Select Existing Product (id="prod-123")
    BE->>DB: Fetch Product Identity (clientId="...")
    BE-->>P: Status: Identity "prod-123-identity" will be inherited
    
    P->>BE: Submit API Onboarding
    BE->>DB: INSERT api (product_id="prod-123")
    BE->>APIM: Bind API to existing Product Identity
    BE-->>P: API Onboarded (Inherited Security)
\`\`\`

### 1.2 Environment Promotion (STAGE Approval Flow)
Detailed flow showing the **Producer Lead** approval logic and technical execution options.

\`\`\`mermaid
sequenceDiagram
    autonumber
    participant PL as Producer Lead
    participant P as Producer/Dev
    participant BE as Portal Backend
    participant DB as Postgres DB
    participant ADO as Azure DevOps
    participant APIM as Azure APIM

    P->>BE: Request Promotion (DEV -> QA)
    Note over BE: Promotion to QA/STAGE requires Lead Approval
    BE->>DB: Create Approval Request (status="PENDING")
    BE-->>P: Request Submitted
    
    PL->>BE: Review Request & Approve
    BE->>DB: Update Request (status="APPROVED")

    alt Option A: DevOps Orchestration (GitOps)
        BE->>ADO: Trigger Promotion Pipeline
        ADO->>APIM: Apply Infrastructure-as-Code (Terraform)
        ADO->>BE: Webhook: Deployment Success
        BE->>DB: Update last_deployed_commit
    else Option B: Saga Orchestration (Direct)
        BE->>APIM: Apply ARM Template / REST Calls
        APIM-->>BE: 200 OK
        BE->>DB: Update last_deployed_at
    end

    BE-->>P: Notification: Promotion Successful
\`\`\`

---

## 👥 2. Consumer Persona Flows
The Consumer discovers and integrates with available APIs.

### 2.1 Product Discovery & Documentation
How consumers find APIs and understand their technical interface before requesting access.

\`\`\`mermaid
sequenceDiagram
    autonumber
    participant C as Consumer
    participant UI as Portal Frontend
    participant BE as Portal Backend
    participant DB as Postgres DB
    participant Blob as Azure Blob Storage

    C->>UI: Global Search (Topic/Team/Feature)
    UI->>BE: GET /products?search=...
    BE->>DB: Query Catalog with partial matching
    DB-->>BE: Return Results (Digital Twin metadata)
    BE-->>UI: Display List with Quality Scores
    
    C->>UI: Select Product -> "View Spec"
    UI->>BE: GET /products/:id/spec
    BE->>Blob: Fetch OpenAPI raw content
    BE-->>UI: Return Spec Template
    UI->>UI: Render Swagger UI / Documentation Playground
    UI-->>C: Consumer reviews Schema & Policies
\`\`\`

### 2.2 Subscription & Access Procurement (Lead Approval)
The flow of requesting access, specifically highlighting the requirement for approval by the **Producing Team Lead**.

\`\`\`mermaid
sequenceDiagram
    autonumber
    participant C as Consumer
    participant UI as Portal Frontend
    participant BE as Portal Backend
    participant DB as Postgres DB
    participant PTL as Producing Team Lead
    participant APIM as Azure APIM

    C->>UI: Request Subscription
    C->>UI: Select Target Environment & App Registration
    UI->>BE: POST /subscriptions/request
    BE->>DB: INSERT subscription (status="PENDING_APPROVAL")
    BE-->>UI: Request Submitted
    
    PTL->>UI: View "Team Approval Queue"
    PTL->>UI: Approve Request
    UI->>BE: POST /approvals/:id/decide (action="APPROVE")
    
    rect rgb(240, 255, 240)
        Note over BE, APIM: Fulfillment Phase
        BE->>APIM: Create/Update Subscription Key
        BE->>DB: UPDATE subscription (status="ACTIVE")
    end
    
    BE-->>C: Notification: Access Granted
\`\`\`

---

## 🛡️ 3. Admin Persona Flows
The Platform Admin ensures system health, compliance, and handles infrastructure drift.

### 3.1 Governance & Orphan Management
How the portal identifies resources in Azure/ADO that are not tracked in the database ("Orphans") and reconciles them.

\`\`\`mermaid
sequenceDiagram
    autonumber
    participant A as Platform Admin
    participant ORCH as Sync Orchestrator
    participant APIM as Azure APIM
    participant ADO as Azure DevOps
    participant DB as Postgres DB

    A->>ORCH: Trigger "Orphan Discovery"
    
    par Cloud Inventory
        ORCH->>APIM: Fetch ALL Products/APIs
        ORCH->>ADO: Fetch ALL Repositories
    end
    
    ORCH->>DB: Compare against current 'Digital Twin'
    
    rect rgb(255, 240, 240)
        Note over ORCH, DB: Drift Detection
        ORCH->>ORCH: Identify identities in cloud MISSING from DB
        ORCH->>DB: Flag as "ORPHANED_RESOURCE"
    end
    
    A->>UI: Review Orphan Dashboard
    
    alt Remediation: Link
        A->>BE: Action: "Link to Existing Product"
        BE->>DB: Associate ORPHAN with product_id
    else Remediation: Decommission
        A->>BE: Action: "Cleanup / Decommission"
        BE->>APIM: DELETE Resource
        BE->>ADO: Archive Repository
        BE->>DB: Log Audit: DECOMMISSIONED
    end
\`\`\`

---

## 🔐 4. Entity-Specific Granular Flows

### 4.1 Team Synchronization (AD Group Integration)
How teams are established from enterprise directory groups.

\`\`\`mermaid
sequenceDiagram
    participant AD as Active Directory (Graph API)
    participant SYNC as Scheduled ETL Sync Pod (AKS)
    participant DB as Postgres DB
    participant RBAC as Portal RBAC

    Note over SYNC: Runs daily cron job
    SYNC->>AD: GET /groups (Fetch memberships)
    SYNC->>DB: UPSERT teams (id = group_id)
    SYNC->>DB: UPSERT user_teams junction
    RBAC->>DB: Query Team Membership
    DB-->>RBAC: Return Permissions Dashboard
\`\`\`

### 4.2 API Key Rotation (Self-Service)
The process of rolling credentials without downtime.

\`\`\`mermaid
sequenceDiagram
    participant C as Consumer
    participant BE as Portal Backend
    participant APIM as Azure APIM
    participant DB as Postgres DB
    participant AUDIT as Audit Service

    C->>BE: POST /subscriptions/:id/regenerate-key
    BE->>APIM: Regenerate Secondary Key
    APIM-->>BE: New Key Generated
    BE->>DB: Update subscription metadata
    BE->>AUDIT: Log "KEY_ROTATION" (Action=Secondary)
    
    Note over C, BE: Consumer updates client app with Secondary Key
    
    C->>BE: POST /subscriptions/:id/swap-keys
    BE->>APIM: Swap Primary/Secondary Keys
    BE->>AUDIT: Log "KEY_SWAP" (Action=Complete)
\`\`\`

### 4.3 Approval Request Lifecycle
Granular state transitions from submission to implementation.

\`\`\`mermaid
sequenceDiagram
    participant R as Requester
    participant BE as Portal Backend
    participant DB as Postgres DB
    participant App as Approver (Lead/Admin)

    R->>BE: Submit Request (e.g. Quota Increase)
    BE->>DB: INSERT approval_requests (status="PENDING")
    BE-->>R: Notified: Stage 1/2 Pending
    
    App->>BE: GET /approvals/pending
    App->>BE: POST /approvals/:id/decide (action="APPROVE")
    BE->>DB: UPDATE approval_requests (status="APPROVED", resolved_by)
    
    Note over BE, DB: Automatic Implementation Trigger
    BE->>APIM: Update Product Quota
    BE->>DB: Log Final Status & Resolution Notes
\`\`\`

### 4.4 Connectivity Matrix Diagnostics
How the portal verifies network-level connectivity between the Gateway and Backend API endpoints.

\`\`\`mermaid
sequenceDiagram
    autonumber
    participant A as Admin
    participant BE as Portal Backend
    participant AGW as Application Gateway
    participant BND as Backend Node (AKS)
    participant EXT as External API Endpoint

    A->>BE: Trigger Connectivity Test (Path: /api/v1/user)
    BE->>AGW: Query Routing Rules
    AGW-->>BE: Destination IP: 10.0.0.5 (AKS Node)
    
    BE->>BND: Request Synthetic Probe (HTTP GET)
    BND->>EXT: Invoke Endpoint
    
    alt Success
        EXT-->>BND: 200 OK (Latency: 45ms)
        BND-->>BE: Connectivity Confirmed
        BE->>A: Display results: ✅ REACHABLE
    else Failure
        EXT-->>BND: 504 Timeout / 403 Forbidden
        BND-->>BE: Error: Connection Refused
        BE->>A: Display results: ❌ UNREACHABLE (Check NSG/Firewall)
    end
\`\`\`

### 4.5 Resource Decommissioning (Admin Flow)
The end-of-life journey for a Product or API resource.

\`\`\`mermaid
sequenceDiagram
    autonumber
    participant A as Platform Admin
    participant BE as Portal Backend
    participant DB as Postgres DB
    participant APIM as Azure APIM
    participant ADO as Azure DevOps

    A->>BE: DELETE /products/:id (Decommission)
    BE->>DB: UPDATE product (status="DECOMMISSIONING")
    
    par Cleanup Phase
        BE->>APIM: DELETE Product & Subscriptions
        BE->>ADO: Archive Repository (ReadOnly)
        BE->>ADO: Delete Deployment Pipelines
    end
    
    BE->>DB: UPDATE product (status="ARCHIVED", deleted_at=NOW())
    BE->>DB: Log Audit: "PRODUCT_DECOMMISSIONED"
    BE-->>A: Decommissioning Complete
\`\`\`

`,

    etl_documentation: `# ETL & Synchronization Strategy

The APIM Self-Service Portal maintains an authoritative "Digital Twin" of the enterprise API ecosystem by continuously synchronizing state from Azure APIM and Azure DevOps (ADO) into the Portal Database.

## 🔄 Core Sync Pipeline

The synchronization process is divided into specialized jobs that handle different aspects of the environment state.

### 1. APIM Inventory Sync (\`sync-apim-to-db.ts\`)
**Purpose:** Primary state synchronization from Azure APIM instances.
- **Orchestration:** Multi-process runner that forks workers per environment (DEV, QA, STAGE, PROD) for parallel execution.
- **Data Extracted:**
    - **Products:** Display names, descriptions, states, and XML policies.
    - **APIs & Operations:** Full path mapping, protocols, and backend service URLs.
    - **Subscriptions:** Active keys and owner mappings.
    - **Named Values:** Configuration constants and Key Vault references.
- **Logic:** Merges raw ARM metadata with "Governance Tags" (e.g., \`TeamID\`) to establish ownership in the portal.

### 2. ADO Metadata Extraction (\`extract-ado-metadata.ts\`)
**Purpose:** Linking API Products to their source repositories and CI/CD pipelines.
- **Discovery Engine:** Uses "Surgical Strikes" (targeted REST calls) to find repositories matching product names.
- **Deployment Tracking:**
    - Identifies the specific **Git Commit Hash** currently deployed in each environment.
    - Captures deployment metadata: Author, Message, Date, and Pipeline execution URL.
- **Spec Recovery:** Scans repositories for OpenAPI/Swagger specifications to ensure the Portal has the latest contract.

### 3. Governance Reconciliation (\`reconcile-governance.ts\`)
**Purpose:** Detection of "Drift" and "Orphans".
- Identifies resources in APIM that lack mandatory governance tags.
- Flags "Manual Creations" (resources in APIM not tracked by the Portal's GitOps flow).
- Generates compliance reports for platform admins.

### 4. Azure AD / Identity Sync
**Purpose:** Synchronizing enterprise team structures into the Portal.
- **Component:** \`sync-apim-to-db.ts\` (Integrated Logic) or \`fetch-ad-groups.ts\` (Utility).
- **Process:**
    - The Scheduled ETL Job authenticates as a Service Principal.
    - It queries **Microsoft Graph API** (\`/memberOf\` or \`/groups\`) to fetch AD Group memberships.
    - Upserts records into \`teams\` and \`users\` tables to establish the Portal's RBAC baseline.
- **Responsibility:** Initiated by the **Scheduled ETL Sync Pod** in AKS.

---

## 🛠️ Execution Model

The ETL jobs are designed to run in two modes:

1.  **Scheduled (Cron):** Full system reconciliation running **once a day** (configurable) as a Background Pod in the AKS Cluster.
2.  **Just-In-Time (JIT):** Triggered via Webhooks when a user performs an onboarding action in the Portal or pushes code to a managed repository.

---

## 🗺️ Roadmap: Sync Evolution

### Phase 3/4: Individual Resource Sync
In upcoming phases, the "All-or-Nothing" sync model will be enhanced with:
- **On-Demand Single Sync:** Button in the Admin/Product view to manually trigger a sync for a *specific* product ID.
- **Selective Table Sync:** Ability to refresh only "Named Values" or "Subscriptions" without a full inventory sweep.
- **Granular Error Handling:** If one environment (e.g., PROD) fails, the sync continues for others, reporting status per region.

---

## 📊 Data Flow Block Diagram

\`\`\`mermaid
graph LR
    subgraph "External Sources"
        APIM["Azure APIM"]
        ADO["Azure DevOps"]
    end

    subgraph "ETL Layer (Node.js)"
        Orchestrator["Sync Orchestrator"]
        WorkerAPIM["APIM Worker"]
        WorkerADO["ADO Worker"]
    end

    subgraph "Persistence"
        DB[("PostgreSQL")]
    end

    APIM -->|ARM REST API| WorkerAPIM
    ADO -->|ADO REST API| WorkerADO
    Orchestrator --> WorkerAPIM
    Orchestrator --> WorkerADO
    WorkerAPIM -->|Upsert| DB
    WorkerADO -->|Update Metadata| DB
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
    Metric["CPU / HTTP Request Count"] --> HPA["HPA / KEDA Scaler"]
    HPA -- "Scale Out Pods (1->N)" --> Pods["Backend API Pods"]
    Pods -- "Load Balance" --> DB["Database Connection Pool"]
\`\`\`

*   **Statelessness:** The backend stores NO session state (JWT only). This ensures we can scale from 1 replica to 50 instantly within AKS.
*   **Database Pooling:** We use \`pg-pool\` to ensure that 50 pods don't exhaust the Postgres connection limit (Max 100 connections).
*   **Heavy Workloads:** Heavy jobs (Spec Parsing) are offloaded to **Background Worker Pods** within the same AKS cluster, preventing CPU contention with the interactive API.

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
        Idle --> SelectingTemplate : User selects policy block
        SelectingTemplate --> Applying : Template applied
        Applying --> Regenerating : Trigger XML Gen
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
63. **[FE] Orphaned API Manager:** Admin UI to identify and assign orphaned APIs that are not linked to any product (Future - currently APIs are tightly coupled to products).
64. **[BE] Executive Reporting:** Aggregated stats for Platform Administrators.

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
79. **[Ops] Database Script Categorization:** Analyze and categorize existing scripts in \`apim-database\` into Day 1 (Setup/Provisioning) and Day 2 (Maintenance/Operations) workflows (Golden Copy Analysis).
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
