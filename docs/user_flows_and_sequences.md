# Detailed User Flows & Sequence Diagrams

Comprehensive documentation of the specific interactions between users, the Portal Backend, and external systems (Azure APIM, ADO, DB).

---

## 👨‍💻 1. Producer Persona Flows
The Producer manages the lifecycle of their API Products.

### 1.1 API Product Onboarding (Discovery to Provisioning)
Covers the flow from initial spec upload to a fully provisioned environment in Azure, including identity enforcement.

```mermaid
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
```

### 1.2 Onboarding Saga: Compensation (Rollback) Flow
Detailed flow showing how the system handles failures during the multi-system provisioning process.

```mermaid
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
```

### 1.3 Identity Inheritance (Existing Product Onboarding)
Flow for adding a new API to an existing Product while inheriting its security identity.

```mermaid
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
```

### 1.2 Environment Promotion (STAGE Approval Flow)
Detailed flow showing the **Producer Lead** approval logic and technical execution options.

```mermaid
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
```

---

## 👥 2. Consumer Persona Flows
The Consumer discovers and integrates with available APIs.

### 2.1 Product Discovery & Documentation
How consumers find APIs and understand their technical interface before requesting access.

```mermaid
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
```

### 2.2 Subscription & Access Procurement (Lead Approval)
The flow of requesting access, specifically highlighting the requirement for approval by the **Producing Team Lead**.

```mermaid
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
```

---

## 🛡️ 3. Admin Persona Flows
The Platform Admin ensures system health, compliance, and handles infrastructure drift.

### 3.1 Governance & Orphan Management
How the portal identifies resources in Azure/ADO that are not tracked in the database ("Orphans") and reconciles them.

```mermaid
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
```

---

## 🔐 4. Entity-Specific Granular Flows

### 4.1 Team Synchronization (AD Group Integration)
How teams are established from enterprise directory groups.

```mermaid
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
```

### 4.2 API Key Rotation (Self-Service)
The process of rolling credentials without downtime.

```mermaid
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
```

### 4.3 Approval Request Lifecycle
Granular state transitions from submission to implementation.

```mermaid
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
```

### 4.4 Connectivity Matrix Diagnostics
How the portal verifies network-level connectivity between the Gateway and Backend API endpoints.

```mermaid
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
```

### 4.5 Resource Decommissioning (Admin Flow)
The end-of-life journey for a Product or API resource.

```mermaid
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
```

