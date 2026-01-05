# Enterprise Architecture Diagrams

This document provides visual representations of the APIM Self-Service Portal's architecture, deployment model, data flows, and database schema.

---

## 🧩 1. System Component Architecture (C4 Component)
Modular breakdown of the system components and their interactions, highlighting the separation between UI, Service Layer, and Infrastructure.

```mermaid
graph LR
    subgraph "UI Layer (Micro-Frontends)"
        Catalog["Catalog MFE"]
        Editor["Policy Editor MFE"]
        Admin["Admin Dashboard MFE"]
        SharedUI["Shared UI Kit"]
    end

    subgraph "Service Layer (Node.js)"
        ProductSvc["Product Service"]
        AuditSvc["Audit Service"]
        SyncEngine["JIT Sync Engine"]
        GitSvc["ADO Git Service"]
        AuthSvc["Auth & RBAC Service"]
    end

    subgraph "Infrastructure & External"
        DB[(PostgreSQL)]
        APIM_API[APIM ARM API]
        ADO_API[ADO REST API]
        KV[Azure Key Vault]
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
```

---

## 🏗️ 2. Deployment Architecture (Azure AKS)
The system is designed for high availability and scalability using a containerized micro-frontend and micro-service architecture on **Azure Kubernetes Service (AKS)**.

```mermaid
graph TB
    subgraph "External World"
        User["User (Browser)"]
    end

    subgraph "Azure Tenant"
        subgraph "AKS Cluster (apim-portal-aks)"
            subgraph "Frontend Namespace"
                FE["React MFE (Nginx)"]
            end
            subgraph "Backend Namespace"
                BE["Node.js API (Fastify)"]
                Scorer["Spectral Scorer Engine"]
            end
        end

        subgraph "Data & State"
            DB[("Azure SQL (PostgreSQL)")]
            Storage["Azure Blob Storage (State/Templates/Drafts)"]
        end

        subgraph "External Integrations"
            APIM["Azure API Management"]
            ADO["Azure DevOps (Repos/Pipelines)"]
            KeyVault["Azure Key Vault (Secrets)"]
        end

        subgraph "Ingress & Identity"
            AGW["Azure App Gateway / Ingress Controller"]
            EntraID["Microsoft Entra ID (Auth)"]
        end
    end

    User -->|HTTPS| AGW
    AGW --> FE
    FE -->|API Calls| BE
    BE --> EntraID
    BE --> DB
    BE --> Storage
    BE --> APIM
    BE --> ADO
    BE -->|Resolve Secrets| KeyVault
    BE --> Scorer
```

---

## 📊 3. Database ER Diagram (Authoritative Model)
The following ERD captures the authoritative source of truth for the portal, showing relationships between teams, products, APIs, and governance resources.

```mermaid
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
```

---

## 🚀 4. Detailed Onboarding Saga (Sequence)
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

## 🔄 5. Multi-Environment Promotion (GitOps)
Lifecycle of a change from DEV to PROD, leveraging Git as the single source of truth.

```mermaid
sequenceDiagram
    participant P as Portal (Admin)
    participant DB as Postgres
    participant ADO as Azure DevOps
    participant Pipe as CI/CD Pipeline
    participant APIM as APIM (QA/PROD)

    P->>DB: Check Promotion Readiness (Quality > 80)
    P->>ADO: Trigger Branch Merge (dev -> qa)
    ADO-->>P: Return New Commit Hash
    
    P->>DB: Update 'qa_hash' for Product
    
    Note over ADO, APIM: Pipeline Triggers automatically
    ADO->>Pipe: Start Deployment
    Pipe->>APIM: Terraform/ARM Apply
    APIM-->>Pipe: 200 OK
    Pipe-->>ADO: Success
    
    Note over P, DB: Portal reflects state via hash comparison
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

---

## 🎨 7. Policy Editor State Machine
The Policy Editor manages a complex state transition between Visual (Tile-based) and Code (Monaco) modes, ensuring bi-directional synchronization and data preservation.

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

    Valid --> VisualMode : XML matched to Tiles
    Invalid --> CodeMode : Fallback (Unparseable)
    
    state VisualMode {
        [*] --> Idle
        Idle --> Dragging : User Interaction
        Dragging --> Dropped : Tile Modification
        Dropped --> SyncingCode : "Generate XML Chunk"
        SyncingCode --> Idle
    }

    state CodeMode {
        [*] --> CodeIdle
        CodeIdle --> Editing : Monaco Change
        Editing --> Debouncing : 500ms Delay
        Debouncing --> Validating : Spectral Lint
        Validating --> CodeIdle
    }

    VisualMode --> CodeMode : Switch to "View Code"
    CodeMode --> VisualMode : Switch to "Visual" (If Valid)

    VisualMode --> Saving : Click Save
    CodeMode --> Saving : Click Save
    Saving --> [*]
```
```
