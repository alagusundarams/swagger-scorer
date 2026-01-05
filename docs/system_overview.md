# System Overview: APIM Self-Service Portal

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
