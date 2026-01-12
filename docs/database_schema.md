# Database Schema & ER Diagram

This document provides a detailed representation of the authoritative database schema used by the APIM Self-Service Portal.

---

## 📊 Entity Relationship Diagram (ERD)

The following diagram captures the relationships between core entities such as Teams, Products, APIs, and Governance logs.

```mermaid
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
```

---

## 📖 Data Dictionary

### Core Identity & Access
| Table | Column | Type | Description |
| :--- | :--- | :--- | :--- |
| **teams** | `id` | TEXT (PK) | Unique identifier for the team. |
| | `name` | TEXT | Human-readable name of the team. |
| | `azure_ad_group_id` | TEXT | Link to Entra ID (formerly Azure AD) group. |
| **users** | `id` | TEXT (PK) | Unique identifier for the user. |
| | `azure_ad_object_id`| TEXT | Link to Entra ID user object. |
| | `role` | TEXT | Portal role: `user` or `admin`. |
| **permission_matrix** | `product_id` | TEXT | The logical product the permission applies to. |
| | `ad_group_id` | TEXT | The Entra ID group granted access. |
| | `role` | TEXT | Role level: `Reader`, `Contributor`, `Owner`. |

### Inventory & Management
| Table | Column | Type | Description |
| :--- | :--- | :--- | :--- |
| **products** | `id` | TEXT (PK) | Unique identifier (e.g., `prod-inventory-dev`). |
| | `management_mode` | TEXT | `TERRAFORM_MANAGED`, `HYBRID`, or `UNTRACKED`. |
| | `identity_client_id` | TEXT | Primary App Registration bound to this product. |
| **apis** | `id` | TEXT (PK) | Unique identifier for the API implementation. |
| | `product_id` | TEXT (FK) | Parent product link. |
| | `path` | TEXT | Gateway relative path (e.g., `/api/v1/users`). |
| **operations** | `method` | TEXT | HTTP Verb (GET, POST, etc.). |
| | `url_template` | TEXT | REST path template for the operation. |

### Configuration & Connectivity
| Table | Column | Type | Description |
| :--- | :--- | :--- | :--- |
| **named_values** | `system_name` | TEXT | Variable name in APIM (e.g., `backend-url`). |
| | `value` | TEXT | Value or KeyVault reference. |
| | `scope_id` | TEXT (FK) | Optional link to a specific API for isolated config. |
| **governance_backends**| `url` | TEXT | The actual backend service URL. |
| | `scope` | TEXT | `API-level` or `GLOBAL` scope. |

### Lifecycle & Governance
| Table | Column | Type | Description |
| :--- | :--- | :--- | :--- |
| **subscriptions** | `state` | TEXT | Lifecycle state: `active`, `pending`, `expired`, etc. |
| | `app_registration_id`| TEXT (FK) | Link to the consumer's App Registration. |
| **approval_requests** | `type` | TEXT | Type of request (e.g., `PROMOTION_REQUEST`). |
| | `details` | JSONB | Payload containing the specific changes requested. |
| **audit_log** | `action` | TEXT | Action performed (e.g., `DELETE`, `READ_KEYS`). |
| | `resource_id` | TEXT | ID of the affected resource. |

---

> [!NOTE]
> This schema is synchronized with the PostgreSQL database. Any manual changes to the schema must be reflected here.
