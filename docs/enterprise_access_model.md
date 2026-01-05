# Enterprise Governance & Access Model

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
    *   For **STAGE** and **PROD**, the user **MUST** belong to a specific Azure AD Group mapped in the `permission_matrix` for that product.
    *   Failure at this gate results in an immediate `NONE` access level (Automatic Data Stripping).
3.  **Gate 3: Deployment State**
    *   The system verifies if the product is actually deployed in the requested region (via Git Hash validation). If not, write actions are disabled even for owners.

---

## 📝 Responsibility & Ownership Matrix
| Component | Responsible Party | Access Requirement | Ownership Context |
| :--- | :--- | :--- | :--- |
| **API Specifications** | Producer / Squad | **WRITE** | Owned by the specific team defined in `owner_team_id`. |
| **Policy Logic (XML)** | Producer / Squad | **WRITE** | Governed by the team; changes require valid Git Sync. |
| **Orphan Resources** | Governance Admin | **WRITE** | Resources with no `scope` are reclaimed by Admins. |
| **Global Config** | Platform Team | **WRITE** | Managed exclusively by Admins at the platform level. |
| **Consumer Access** | Consumers | **READ** | Self-service discovery and subscription management. |

---

## 🕵️ Auditing & Compliance
Every **WRITE** action, whether internal or external (APIM/ADO), is subject to mandatory institutional auditing.

### System-to-Human Audit Linkage
The system maintains a rigid link between the **Platform Identity** (Managed Identity/Service Account) and the **Human User**:
*   **Internal Capture**: All modifications are captured in the `audit_log` table with the unique User ID, timestamp, and business justification.
*   **External Correlation**: Every action performed on Azure or ADO by the Portal's identity is logged in the Portal DB first. This allows auditors to trace an Azure Activity Log entry (e.g., "MI updated Policy") back to the specific human who clicked the button in the Portal.

### Responsibility for Audit Review
*   **Management**: Responsible for periodic review of `audit_log` exports to verify squad compliance.
*   **System Integrity**: The Portal DB preserves an immutable history of *who* authorized *what* platform change.

> [!IMPORTANT]
> **Audit Completeness**: No platform change (APIM or ADO) is executed unless it is first successfully durably recorded in the Portal's Audit Database.
