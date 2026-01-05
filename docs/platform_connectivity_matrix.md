# Platform Connectivity & External Access Requirements

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
2.  **Portal Audit Trail**: Internal `audit_log` linking the Azure action to the **specific human requester** (User ID) and their business justification.
    *   *Example*: If a policy is updated, the internal log records: "User X updated Policy Y via Portal Identity for Approval ID Z."

---

## 🚀 Azure DevOps (ADO) Connectivity
The Portal ensures consistency between the APIM runtime and your source code repositories.

### 🔓 Permission Scope: Project-Level Management
The Service Account (SP/PAT) requires permissions beyond simple git pushes:
*   **Repository Creation**: Automatically provision new Git Repositories for squads during the Product Onboarding wizard.
*   **Branch Management**: Initializing `main` branches and setting mandatory governance folders (`/policies`, `/specs`).
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
