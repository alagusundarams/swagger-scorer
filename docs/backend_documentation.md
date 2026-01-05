# Backend Engineer's Reference: Architecture & Scaling

## 1. Transactional Flow: The "Onboarding" SAGA
Creating a product is not a single DB insert. It is a distributed transaction across 3 systems. We manage this ensuring eventual consistency.

```mermaid
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
```

---

## 2. Microservices Architecture
The system is architected as a set of distributed **Microservices** to support scaling to **10 million daily API calls**.

### The Service Mesh

### Service Architecture

```mermaid
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
```

### Why & When to Split?
1.  **ARM Logic (`teams.service.ts`):** Azure operations are slow (2-3s). Moving this to a **Worker Queue** pattern allows the API to respond instantly.
2.  **Audit Logs:** High write volume. Dedicated ingestion service prevents blocking the main thread.

---

## 3. Horizontal Scaling & KEDA
How do we handle traffic spikes?

```mermaid
graph LR
    Metric[CPU / HTTP Request Count] --> KEDA[KEDA Scaler]
    KEDA -- "Scale Out (1->10)" --> Pods[Backend Pods]
    Pods -- "Load Balance" --> DB[Database Connection Pool]
```

*   **Statelessness:** The backend stores NO session state (JWT only). This means we can scale from 1 replica to 50 instantly.
*   **Database Pooling:** We use `pg-pool` to ensure that 50 pods don't exhaust the Postgres connection limit (Max 100 connections).
*   **Async Processing:** Heavy jobs (Spec Parsing) are candidates for **Azure Functions** triggered by Event Grid, offloading CPU work from the main API.

---

## 4. JIT Sync Logic (Internal Flow)
The "Just-In-Time" sync is the most CPU-intensive operation.

```mermaid
flowchart TD
    Req["User requests API Details"] --> Cache{"Check Ops Cache?"}
    Cache -- Hit --> Return["Return DB Rows"]
    Cache -- Miss/Stale --> Fetch["Fetch YAML from ADO"]
    
    Fetch --> Parse["SwaggerParser.parse()"]
    Parse --> Validate{"Spectral Lint Pass?"}
    
    Validate -- Valid --> Upsert["Bulk UPSERT to DB"]
    Validate -- Invalid --> Error["Mark as Broken"]
    
    Upsert --> Return
```

---

## 5. Error Handling & Observability
We use a combination of structured logging, distributed tracing, and alerting.

```mermaid
graph TD
    UserRequest[User Request] --> API[Node.js API]
    API --> Logger[Winston Logger]
    API --> Tracer[OpenTelemetry Tracer]
    API --> DB[PostgreSQL]
    
    Logger --> Dynatrace[Dynatrace]
    Tracer --> Dynatrace
    
    Dynatrace --> Alerts[Dynatrace Alerts]
    Dynatrace --> Dashboards[Dynatrace Dashboards]
```

*   **Structured Logging:** All logs are JSON formatted, allowing for easy querying in Dynatrace.
*   **Correlation IDs:** Every request gets a unique correlation ID, propagated through all downstream calls.
*   **Health Checks:** `/health` endpoint for liveness/readiness probes.

---

## 6. Database Migrations (TypeORM)
We use TypeORM for database migrations, ensuring schema evolution is managed.

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant CLI as TypeORM CLI
    participant DB as PostgreSQL

    Dev->>CLI: yarn typeorm migration:create -n AddProductsTable
    CLI-->>Dev: Created migration file
    
    Dev->>Dev: Write SQL in migration file
    
    Dev->>CLI: yarn typeorm migration:run
    CLI->>DB: SELECT * FROM migrations
    DB-->>CLI: Applied migrations
    CLI->>DB: EXECUTE migration SQL
    DB-->>CLI: Success
    CLI-->>Dev: Migrations applied
```
