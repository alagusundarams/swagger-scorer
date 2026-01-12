# Enterprise Architecture Diagrams

This document provides visual representations of the APIM Self-Service Portal's architecture, deployment model, data flows, and database schema.

---

## 🛠️ 0. Technology Stack Overview
High-level breakdown of the chosen technologies for each layer of the application.

```mermaid
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
```

---

## 🧩 1. System Component Architecture (C4 Component)
Modular breakdown of the system components and their interactions, highlighting the separation between UI, Service Layer, and Infrastructure.

```mermaid
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
```

---

## 🏗️ 2. Deployment Architecture (Azure AKS)
The system is designed for high availability and scalability using a containerized micro-frontend and micro-service architecture on **Azure Kubernetes Service (AKS)**.

```mermaid
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
```

---

## 🚀 3. Detailed Onboarding Saga (Sequence)
API Onboarding is a distributed transaction ("Saga") ensuring consistency across DB, Git, and Azure APIM.

```mermaid
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
```

---

## 🔄 5. Multi-Environment Promotion (Saga Pattern)
Lifecycle of a change from DEV to PROD. This can be orchestrated via an external CI/CD pipeline OR internally by the Node.js Service ("Saga" orchestrator) using ARM templates.

```mermaid
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
```

---

## 🧠 6. Scorer Engine Logic (Flow)
Internal decision-making process for evaluating API Quality and Security compliance.

```mermaid
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
```

---

## 🎨 7. Policy Editor State Machine
The Policy Editor manages the lifecycle of the XML policy document, ensuring structural integrity and compliance.

```mermaid
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
```
```
