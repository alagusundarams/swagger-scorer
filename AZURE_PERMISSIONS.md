# Azure Permissions & Infrastructure Strategy

## Overview

This document defines:
1. **Minimum required permissions** for Swagger Scorer to discover and catalog APIs from Azure APIM
2. **Infrastructure as Code (IaC) strategy** using ARM templates with audit/compliance parity to Terraform

**Current State**: Organization uses Terraform per-repo for deployment  
**Proposed State**: ARM templates with GitOps workflow, maintaining audit/compliance standards

---

## Infrastructure as Code: ARM vs Terraform

### Strategic Position

**Goal**: Demonstrate ARM can match/exceed Terraform's audit and compliance capabilities for APIM deployment.

### Audit & Compliance Requirements (Non-Negotiable)

| Requirement | Terraform | ARM Template | Status |
|-------------|-----------|--------------|--------|
| **Version Control** | ✅ `.tf` files in Git | ✅ `.json` files in Git | ✅ **Parity** |
| **Deployment History** | ✅ State file tracking | ✅ Deployment History API | ✅ **Parity** |
| **What-If Analysis** | ✅ `terraform plan` | ✅ `az deployment what-if` | ✅ **Parity** |
| **Drift Detection** | ✅ `terraform refresh` | ✅ Azure Policy Guest Config | ✅ **Parity** |
| **Rollback** | ✅ State restore | ✅ Previous deployment | ✅ **Parity** |
| **Audit Logs** | ⚠️ Third-party | ✅ **Azure Activity Log** (native) | ✅ **ARM Better** |
| **Policy as Code** | ⚠️ Sentinel (paid) | ✅ **Azure Policy** (native) | ✅ **ARM Better** |
| **Idempotency** | ✅ Yes | ✅ Yes | ✅ **Parity** |

**Verdict**: ARM can match Terraform's capabilities with proper tooling.

---

### Proposed ARM Workflow (GitOps)

```
Developer commits OpenAPI spec to Git
    ↓
CI/CD pipeline triggered
    ↓
1. Validate spec (Spectral + Swagger Scorer)
2. Generate ARM template from spec
3. Run `az deployment what-if` (dry-run)
4. Human approval gate (Pull Request)
5. Deploy via ARM template
6. Record deployment in Azure Activity Log
7. Update Swagger Scorer catalog
```

**Key Components**:
- **Git**: Single source of truth for API definitions
- **ARM Templates**: Declarative APIM resource definitions
- **Azure DevOps/GitHub Actions**: Orchestration
- **Azure Policy**: Compliance enforcement
- **Activity Log**: Audit trail

---

### ARM Template Example: Deploy API to APIM

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "apimServiceName": { "type": "string" },
    "apiName": { "type": "string" },
    "apiPath": { "type": "string" },
    "openApiSpec": { "type": "string" }
  },
  "resources": [
    {
      "type": "Microsoft.ApiManagement/service/apis",
      "apiVersion": "2021-08-01",
      "name": "[concat(parameters('apimServiceName'), '/', parameters('apiName'))]",
      "properties": {
        "displayName": "[parameters('apiName')]",
        "path": "[parameters('apiPath')]",
        "protocols": ["https"],
        "format": "openapi+json",
        "value": "[parameters('openApiSpec')]"
      }
    }
  ]
}
```

**Deployment**:
```bash
az deployment group create \
  --resource-group rg-apim-prod \
  --template-file apim-api.json \
  --parameters @parameters.json \
  --what-if  # Dry-run first!
```

---

### Compliance Features (ARM Advantages)

#### 1. **Azure Policy Integration** (Native)

**Enforce standards at deployment time**:
```json
{
  "policyRule": {
    "if": {
      "allOf": [
        {"field": "type", "equals": "Microsoft.ApiManagement/service/apis"},
        {"field": "properties.protocols", "notContains": "https"}
      ]
    },
    "then": {
      "effect": "deny"
    }
  }
}
```

**Example Policies**:
- Deny APIs without HTTPS
- Require specific naming conventions
- Enforce versioning in path
- Mandate authentication schemes

**Terraform equivalent**: Sentinel (Terraform Cloud/Enterprise only, paid)

---

#### 2. **Azure Activity Log** (Native Audit Trail)

**Every ARM deployment is logged**:
```json
{
  "caller": "user@company.com",
  "timestamp": "2025-01-20T10:30:00Z",
  "resourceId": "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ApiManagement/service/{apim}/apis/customer-api",
  "operationName": "Microsoft.ApiManagement/service/apis/write",
  "status": "Succeeded",
  "correlationId": "abc-123-def",
  "properties": {
    "template": "apim-api.json",
    "parameters": {...}
  }
}
```

**Query with KQL**:
```kusto
AzureActivity
| where ResourceProvider == "Microsoft.ApiManagement"
| where OperationNameValue == "MICROSOFT.APIMANAGEMENT/SERVICE/APIS/WRITE"
| project TimeGenerated, Caller, OperationNameValue, ResourceGroup, Resource
| order by TimeGenerated desc
```

**Terraform equivalent**: Third-party logging tools

---

#### 3. **Deployment What-If** (Change Preview)

```bash
az deployment group what-if \
  --resource-group rg-apim-prod \
  --template-file apim-api.json \
  --parameters @parameters.json
```

**Output**:
```
Resource and property changes are indicated with this symbol:
  + Create
  ~ Modify
  - Delete

The deployment will update the following:

~ Microsoft.ApiManagement/service/apis/customer-api
  ~ properties.path: "/v1/customers" => "/v2/customers"
  ~ properties.protocols: ["http", "https"] => ["https"]
```

**Terraform equivalent**: `terraform plan`

---

#### 4. **Deployment History** (Rollback Support)

```bash
# List all deployments
az deployment group list \
  --resource-group rg-apim-prod \
  --query "[].{name:name, timestamp:properties.timestamp, status:properties.provisioningState}"

# Rollback to previous
az deployment group create \
  --resource-group rg-apim-prod \
  --template-file previous-deployment.json
```

**Each deployment is versioned and retrievable.**

---

### Addressing Terraform Advantages

#### **Terraform Advantage 1: State Management**

**Problem**: Terraform state file tracks reality vs desired state  
**ARM Solution**: Azure Resource Graph + Policy

```kusto
// Detect drift: Resources not matching ARM template
Resources
| where type == "microsoft.apimanagement/service/apis"
| where properties.protocols contains "http"  // Policy violation
```

**Automated Drift Detection**:
```yaml
# GitHub Action: Daily drift check
schedule:
  - cron: '0 2 * * *'  # 2 AM daily
steps:
  - name: Check for drift
    run: |
      az policy state list --resource-group rg-apim-prod --query "[?complianceState=='NonCompliant']"
```

---

#### **Terraform Advantage 2: Multi-Cloud**

**Not relevant**: You're Azure-only for APIM

**If multi-cloud needed later**: Use Bicep (ARM superset) with cleaner syntax

---

#### **Terraform Advantage 3: Module Ecosystem**

**ARM Solution**: Azure Verified Modules

```bash
# Use community ARM templates
git clone https://github.com/Azure/azure-quickstart-templates
```

Or create your own module library:
```
arm-templates/
├── modules/
│   ├── apim-api.json
│   ├── apim-product.json
│   └── apim-subscription.json
└── environments/
    ├── dev.parameters.json
    ├── qa.parameters.json
    └── prod.parameters.json
```

---

### GitOps Workflow (Audit Trail Guaranteed)

```
main (protected)
    ↓
feature/add-customer-api
    ↓
1. Developer: Edit openapi.yaml
2. Developer: Push to branch
3. CI: Run Spectral validation
4. CI: Generate ARM template
5. CI: Run `az deployment what-if`
6. CI: Post diff as PR comment
    ↓
7. Reviewer: Approves change (audit: who + when)
    ↓
8. CI: Deploy to DEV
9. Wait for QA approval
10. Deploy to QA
11. Wait for Ops approval (2nd reviewer)
12. Deploy to PROD
    ↓
13. Azure Activity Log: Records deployment
14. Swagger Scorer: Catalogs new API
```

**Every step is auditable**:
- Git: Who changed what, when
- PR: Who approved
- Activity Log: Deployment details
- Azure Policy: Compliance validation

---

## Service Principal / Managed Identity Setup

### Recommended Approach: **Managed Identity**

```bash
# Create User-Assigned Managed Identity
az identity create \
  --name swagger-scorer-identity \
  --resource-group rg-platform \
  --location eastus
```

**Why Managed Identity over Service Principal?**
- ✅ No credential management (Azure handles it)
- ✅ Automatic rotation
- ✅ Better security posture

---

## Required Azure Resources & Permissions

### 1. **Azure API Management (APIM)**

#### Resources Needed:
- APIM instances across all environments (DEV, QA, STAGE, PROD)
- Products within APIM
- APIs within Products
- Operations within APIs
- Subscriptions

#### Required RBAC Role:
```
Role: API Management Service Reader
Scope: /subscriptions/{subscription-id}/resourceGroups/{rg}/providers/Microsoft.ApiManagement/service/{apim-name}
```

**What this allows**:
- ✅ Read APIM configuration
- ✅ List Products, APIs, Operations
- ✅ Read Subscriptions (but not keys)
- ❌ Cannot modify anything
- ❌ Cannot read subscription keys (security)

#### API Permissions (Azure Management API):
```
Permission: Microsoft.ApiManagement/service/read
Permission: Microsoft.ApiManagement/service/products/read
Permission: Microsoft.ApiManagement/service/apis/read
Permission: Microsoft.ApiManagement/service/subscriptions/read
```

#### Discovery Endpoints Used:
```
GET https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ApiManagement/service/{serviceName}?api-version=2021-08-01

GET https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ApiManagement/service/{serviceName}/products?api-version=2021-08-01

GET https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ApiManagement/service/{serviceName}/apis?api-version=2021-08-01

GET https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.ApiManagement/service/{serviceName}/apis/{apiId}/operations?api-version=2021-08-01
```

---

### 2. **Azure Active Directory / Microsoft Entra ID**

#### Resources Needed:
- App Registrations (for linked identity feature)
- Service Principals
- Application details (Display Name, App ID URI, Client ID)

#### Required Microsoft Graph API Permissions:

**Application Permissions** (for background jobs):
```
Application.Read.All
```

**Delegated Permissions** (for user-initiated searches):
```
Application.ReadBasic.All
```

**What this allows**:
- ✅ Read App Registration metadata (name, client ID, app ID URI)
- ✅ Search for App Registrations
- ❌ Cannot create/modify App Registrations
- ❌ Cannot read secrets/certificates
- ❌ Cannot read user data

#### Graph API Endpoints Used:
```
GET https://graph.microsoft.com/v1.0/applications
GET https://graph.microsoft.com/v1.0/applications/{id}
GET https://graph.microsoft.com/v1.0/servicePrincipals
```

---

### 3. **Azure Resource Graph** (Optional - for cross-subscription discovery)

#### If you have APIM instances across multiple subscriptions:

**Required RBAC Role**:
```
Role: Reader
Scope: Management Group or Subscription level
```

**What this allows**:
- ✅ Query resources across subscriptions
- ✅ Efficient bulk discovery

#### Resource Graph Query Example:
```kusto
Resources
| where type == "microsoft.apimanagement/service"
| project name, location, resourceGroup, subscriptionId
```

---

### 4. **Azure Key Vault** (for subscription key storage - future)

#### If storing APIM subscription keys securely:

**Required RBAC Role**:
```
Role: Key Vault Secrets User
Scope: /subscriptions/{subscriptionId}/resourceGroups/{rg}/providers/Microsoft.KeyVault/vaults/{vault-name}
```

**What this allows**:
- ✅ Read secrets (subscription keys)
- ❌ Cannot create/modify/delete secrets

---

## Permission Assignment Commands

### Assign APIM Reader Role
```bash
# Get Service Principal Object ID
SP_OBJECT_ID=$(az identity show \
  --name swagger-scorer-identity \
  --resource-group rg-platform \
  --query principalId -o tsv)

# Assign to APIM instance
az role assignment create \
  --assignee $SP_OBJECT_ID \
  --role "API Management Service Reader" \
  --scope /subscriptions/{subscription-id}/resourceGroups/{rg}/providers/Microsoft.ApiManagement/service/{apim-name}
```

### Grant Microsoft Graph Permissions
```bash
# This requires Azure AD admin consent
az ad app permission add \
  --id {app-registration-id} \
  --api 00000003-0000-0000-c000-000000000000 \
  --api-permissions e1fe6dd8-ba31-4d61-89e7-88639da4683d=Role  # Application.Read.All

# Admin consent required
az ad app permission admin-consent \
  --id {app-registration-id}
```

---

## Access Scopes by Environment

### Development
- **APIM**: Read access to DEV APIM instance only
- **Entra ID**: Application.ReadBasic.All (Delegated)
- **Resource Graph**: Not required

### QA/Staging
- **APIM**: Read access to QA and STAGE APIM instances
- **Entra ID**: Application.ReadBasic.All (Delegated)
- **Resource Graph**: Optional (if cross-subscription)

### Production
- **APIM**: Read access to ALL APIM instances (DEV, QA, STAGE, PROD)
- **Entra ID**: Application.Read.All (Application permission)
- **Resource Graph**: Recommended (for enterprise-wide discovery)
- **Key Vault**: Required (if storing subscription keys)

---

## Security Considerations

### Principle of Least Privilege ✅

**What we DO need**:
- Read-only access to APIM configuration
- Read-only access to App Registration metadata

**What we DON'T need** (explicitly deny):
- ❌ Write access to APIM
- ❌ Read APIM subscription keys (use Key Vault reference instead)
- ❌ Modify App Registrations
- ❌ Read user personal data
- ❌ Grant permissions on behalf of users

### Audit Logging

Enable Azure AD audit logs to track:
- When Swagger Scorer reads App Registrations
- When APIM is queried
- Any authentication attempts

### Credential Rotation

**Managed Identity**: Automatic (Azure-managed)  
**Service Principal** (if used): Rotate every 90 days

---

## Testing Permissions

### Validate APIM Access
```bash
# Using Service Principal
az login --service-principal \
  --username {client-id} \
  --password {client-secret} \
  --tenant {tenant-id}

# Test APIM access
az apim show \
  --name {apim-name} \
  --resource-group {rg}
```

### Validate Graph API Access
```bash
# Get token
TOKEN=$(az account get-access-token \
  --resource https://graph.microsoft.com \
  --query accessToken -o tsv)

# Test Graph API
curl -H "Authorization: Bearer $TOKEN" \
  "https://graph.microsoft.com/v1.0/applications"
```

---

## Troubleshooting

### "Insufficient privileges" error

**Cause**: Service Principal lacks required role  
**Fix**: Assign "API Management Service Reader" role

### "Consent required" for Graph API

**Cause**: Admin hasn't granted consent  
**Fix**: Run `az ad app permission admin-consent`

### "Access denied" to subscription keys

**Cause**: This is expected! We shouldn't have access to keys.  
**Fix**: Use Key Vault reference or APIM-managed subscriptions

---

## Summary Table

| Azure Service | Resource | Required Permission | Scope |
|--------------|----------|---------------------|-------|
| **APIM** | All instances | API Management Service Reader | Per APIM instance |
| **Entra ID** | App Registrations | Application.Read.All | Tenant-wide |
| **Resource Graph** | Cross-sub query | Reader | Management Group |
| **Key Vault** | Secrets | Key Vault Secrets User | Per vault |

---

## Document Maintenance

**Last Updated**: 2025-12-18  
**Reviewed By**: Pending  
**Next Review**: When adding new Azure integrations

**Change Log**:
- 2025-12-18: Initial version documenting APIM and Entra ID requirements
