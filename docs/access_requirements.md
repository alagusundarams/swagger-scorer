# System Prerequisites: Access & Infrastructure

## Overview
This document outlines the infrastructure dependencies and access scopes required to successfully deploy and operate the **APIM Self-Service Portal**. It serves as a reference for DevOps engineers, Security compliance officers, and IT Administrators to understand *what* the system connects to and *why*.

The architecture adheres to the principle of **Least Privilege**, requesting only the specific scopes necessary to automate API management workflows.

---

## 1. Azure API Management (APIM)
The portal acts as a control plane for APIM, automating routine tasks like creating APIs and updating Policies.

**Identity:** User-Assigned Managed Identity
**Recommended Role:** `API Management Service Contributor`

| Feature | Scope | Technical Requirement |
| :--- | :--- | :--- |
| **API Publishing** | APIM Service | Capability to `PUT` new APIs and Operations when a producer syncs from Git. |
| **Policy Studio** | APIM Policies | Capability to `PUT` policy XML fragments (e.g., Rate Limits, IP filters) at the API level. |
| **Resource Discovery** | Resource Group | Capability to `LIST` available APIM instances to display in the Environment selector. |

---

## 2. Azure DevOps (ADO)
The system uses ADO as the "Source of Truth" for OpenAPI specifications and Policy definitions. It does not store these files permanently in its own database.

**Identity:** Service Connection / PAT
**Scope:** Project or Organization Level

| Feature | Permission | Technical Requirement |
| :--- | :--- | :--- |
| **Spec Synchronization** | `Code (Read)` | Fetch `openapi.yaml` content to parse endpoints and validate Linting rules. |
| **Automated PRs** | `Code (Write)` | Create branches and commit changes when a user requests a "Promotion" to a higher environment. |
| **Promotion Workflow** | `PullRequest (Contribute)` | Automatically open Pull Requests to merge changes from `Dev` to `QA`. |

---

## 3. Database (PostgreSQL)
The application uses a persistent store for metadata that lives outside of APIM (e.g., Team ownership, Audit logs, Subscription requests).

**Database Name:** `apim_inventory`

| Role | Operations | Technical Requirement |
| :--- | :--- | :--- |
| **Runtime User** | `SELECT, INSERT, UPDATE` | Standard CRUD operations for application entities (Products, Teams, Audit Logs). |
| **Migration User** | `DDL (CREATE/ALTER)` | Used primarily by the CI/CD pipeline to apply schema updates during deployments. |

---

## 4. Identity & Governance (Entra ID)
The portal integrates with Entra ID (formerly Azure AD) to manage Team membership and resolve identities.

**Identity:** App Registration

| Feature | Graph Permission | Technical Requirement |
| :--- | :--- | :--- |
| **Orphaned Resource Check** | `GroupMember.Read.All` | Periodically verify if the "Owner Group" of an API still has active members. |
| **Audit Logging** | `User.Read.All` | Resolve Object IDs (OIDs) to readable names (e.g., "John Doe") in the Audit Trail. |
| **Team Onboarding** | `Directory.Read.All` | specific scope to search for existing Security Groups to onboard as new Teams. |

---

## Network Requirements
For the application to function correctly within a VNET or Firewalled environment:

*   **Azure ARM API:** `management.azure.com:443` (APIM Control Plane)
*   **Azure DevOps:** `dev.azure.com:443` (Source Control)
*   **PostgreSQL:** Internal connection to the database (typically port `5432`)
