# Multi-Environment Support & API Promotion Pipeline

## Overview
The APIM Self Service portal supports multiple environments (Dev, QA, Stage, Prod) with environment-specific API deployments and controlled promotion workflows.

---

## 1. Environment Architecture

### 1.1 Environment Definitions

| Environment | Purpose | Approval Required | Auto-Deploy | Access |
|-------------|---------|-------------------|-------------|--------|
| **Dev** | Development & testing | No | Yes | All developers |
| **QA** | Quality assurance testing | Team Lead | Yes | QA team + Dev team |
| **Stage** | Pre-production validation | Product Owner | No | Limited access |
| **Prod** | Production | Admin + Product Owner | No | Production support only |

### 1.2 Environment-Specific Data

Each API/Product exists independently in each environment:

```typescript
interface ProductEnvironment {
  productId: string;
  environment: 'DEV' | 'QA' | 'STAGE' | 'PROD';
  version: string;
  deployedAt: Date;
  deployedBy: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DEPLOYING';
  
  // Environment-specific config
  baseUrl: string; // e.g., https://api-dev.company.com
  rateLimits: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  
  // Quality metrics
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  testCoverage?: number; // only for DEV/QA
  lastTestRun?: Date;
  
  // Promotion tracking
  promotedFrom?: {
    environment: string;
    version: string;
    promotedAt: Date;
  };
}
```

---

## 2. Dashboard Environment Filtering

### 2.1 UI - Environment Filter

**Header Section (next to Team Context dropdown):**

```
┌──────────────────────────────────────────────────────────┐
│ APIM Self Service                        Mock Developer │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Dashboard                                                │
│                                                          │
│ Search: [________________🔍]    Environment: [DEV ▼]   │
│                                 Context: [All My Teams ▼]│
└──────────────────────────────────────────────────────────┘
```

**Environment Dropdown Options:**
```
┌─────────────────────────┐
│ ⦿ All Environments      │
│ ─────────────────────   │
│ ○ Dev                   │
│ ○ QA                    │
│ ○ Stage                 │
│ ○ Prod                  │
└─────────────────────────┘
```

### 2.2 Product Cards with Environment Badges

**My Products Tab - with Environment Filter:**

```
┌──────────────────────────────────────────────────────────┐
│ User Service API v1.0                  [DEV] [QA] [PROD] │
│ user-service-api                                         │
│                                                          │
│ v1.0.0 • Published • 3 subscribers                      │
│ [Manage Environments] [Promote to QA] [View Details]   │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Order API v2.0                              [DEV] [QA]   │
│ order-api                                                │
│                                                          │
│ v2.0.0 • Published • 1 subscriber                       │
│ [Promote to Stage] [View Details]                       │
└──────────────────────────────────────────────────────────┘
```

**Environment Badges:**
- **DEV**: Gray badge `bg-gray-100 text-gray-700`
- **QA**: Blue badge `bg-blue-100 text-blue-700`
- **STAGE**: Purple badge `bg-purple-100 text-purple-700`
- **PROD**: Green badge `bg-green-100 text-green-700`

**When filtered to "Prod" environment:**
- Only shows products deployed to Production
- Badge shows "Latest deployed: 2 weeks ago"
- Different actions available (cannot directly edit Prod)

---

### 2.3 Environment Comparison View

**Product Detail Page → Environments Tab:**

```
┌──────────────────────────────────────────────────────────┐
│ User Service API                                         │
│ [Overview] [Environments] [Subscribers] [Analytics]     │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│ Environment Deployments                                  │
│                                                          │
│ ┌────────────┬──────────┬───────────┬─────────────────┐ │
│ │ Environment│ Version  │ Status    │ Actions         │ │
│ ├────────────┼──────────┼───────────┼─────────────────┤ │
│ │ 🟢 PROD    │ v1.0.0   │ ✅ Healthy│ [View] [Rollback]│ │
│ │ Deployed: 2 weeks ago by John Doe                   │ │
│ │ Subscribers: 15 | Health: 99.8% uptime              │ │
│ ├────────────┼──────────┼───────────┼─────────────────┤ │
│ │ 🟣 STAGE   │ v1.1.0   │ ✅ Healthy│ [View] [Promote]│ │
│ │ Deployed: 3 days ago by Jane Smith                 │ │
│ │ Tests: ✅ All passed | Ready for Prod               │ │
│ │ [Promote to Prod →]                                 │ │
│ ├────────────┼──────────┼───────────┼─────────────────┤ │
│ │ 🔵 QA      │ v1.2.0   │ ✅ Healthy│ [View] [Test]   │ │
│ │ Deployed: Yesterday by Alice Lee                    │ │
│ │ Tests: ⏳ In progress (5/12 passed)                 │ │
│ ├────────────┼──────────┼───────────┼─────────────────┤ │
│ │ ⚪ DEV     │ v1.3.0   │ ⚠️ Breaking │ [View] [Edit]  │ │
│ │ Deployed: 2 hours ago by Bob Chen                  │ │
│ │ Tests: ❌ 3 failing | Breaking changes detected    │ │
│ └────────────┴──────────┴───────────┴─────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 3. API Promotion Workflow

### 3.1 Promotion Pipeline

**Standard Promotion Path:**
```
DEV → QA → STAGE → PROD
```

**Each promotion requires:**
1. ✅ All tests passing
2. ✅ Code quality gates met
3. ✅ Security scan passed (for STAGE/PROD)
4. ✅ Approval from designated approver(s)
5. ✅ Release notes provided

---

### 3.2 Promotion Wizard UI

**Clicking "Promote to QA" button:**

#### Step 1: Pre-Promotion Checks
```
┌──────────────────────────────────────────────────────────┐
│ Promote User Service API v1.3.0 to QA                   │
│                                                          │
│ Pre-Promotion Validation                                 │
│                                                          │
│ ✅ All unit tests passed (45/45)                        │
│ ✅ Integration tests passed (12/12)                     │
│ ✅ Code coverage: 87% (>80% required)                   │
│ ✅ No critical security vulnerabilities                 │
│ ⚠️ 2 minor linting warnings (non-blocking)              │
│ ✅ API contract changes: Backward compatible            │
│ ✅ Documentation updated                                 │
│                                                          │
│ Environment Differences:                                 │
│ • DEV base URL: https://api-dev.company.com             │
│ • QA base URL: https://api-qa.company.com               │
│ • Rate limits: 1000/min (DEV) → 500/min (QA)           │
│                                                          │
│ [Cancel]  [Next: Review Changes →]                     │
└──────────────────────────────────────────────────────────┘
```

#### Step 2: Change Summary & Release Notes
```
┌──────────────────────────────────────────────────────────┐
│ Release Notes for v1.3.0                                 │
│                                                          │
│ Version: v1.3.0 (from DEV)                              │
│ Target: QA Environment                                   │
│                                                          │
│ Changes since v1.2.0:                                    │
│ ┌────────────────────────────────────────────────────┐  │
│ │ • Added new GET /users/{id}/preferences endpoint  │  │
│ │ • Fixed pagination bug in search results          │  │
│ │ • Improved response time by 15%                   │  │
│ │ • Updated authentication token expiry to 24h      │  │
│ │                                                    │  │
│ │ Breaking Changes: None                             │  │
│ │                                                    │  │
│ │ Migration Notes: None required                     │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Database Migrations Required:                            │
│ ○ None    ⦿ Yes - Migration script: migration_v1.3.sql │
│                                                          │
│ ☑ I confirm all changes are documented                  │
│ ☑ I have tested this version in DEV                     │
│                                                          │
│ [← Back]  [Next: Request Approval →]                   │
└──────────────────────────────────────────────────────────┘
```

#### Step 3: Approval Request
```
┌──────────────────────────────────────────────────────────┐
│ Request Promotion Approval                               │
│                                                          │
│ Promotion Details:                                       │
│ • From: DEV v1.3.0                                      │
│ • To: QA                                                │
│ • Approver: Team Lead (auto-assigned)                   │
│ • Deployment: Automated (upon approval)                 │
│                                                          │
│ Additional Approvers (optional):                         │
│ [+ Add Reviewer]                                        │
│                                                          │
│ Notify on Approval:                                      │
│ ☑ Email notification                                     │
│ ☑ In-app notification                                    │
│                                                          │
│ Comments for Approver:                                   │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Ready for QA testing. All unit tests passing.     │  │
│ │ Performance improvements verified in DEV.          │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ [Cancel]  [Submit for Approval]                        │
└──────────────────────────────────────────────────────────┘
```

---

### 3.3 Approver View

**Team Lead receives notification:**

**Email:**
```
Subject: 🔔 Approval Required: Promote User Service API to QA

Alice has requested approval to promote User Service API v1.3.0 to QA.

Version: v1.3.0
From: DEV → QA
Requested by: Alice Lee
Requested: Dec 15, 2024 4:15 PM

Changes:
• Added new preferences endpoint
• Fixed pagination bug
• Performance improvements

Pre-deployment checks: ✅ All passed

[Review in Portal] [Approve] [Reject]
```

**In-App Approval UI:**
```
┌──────────────────────────────────────────────────────────┐
│ Promotion Approval Request                               │
│                                                          │
│ User Service API v1.3.0                                 │
│ DEV → QA                                                │
│                                                          │
│ Requested by: Alice Lee                                  │
│ Requested: 30 minutes ago                               │
│                                                          │
│ Pre-Deployment Validation:                               │
│ ✅ All tests passed                                     │
│ ✅ No security vulnerabilities                          │
│ ✅ Code quality: 87% coverage                           │
│ ✅ API contract: Backward compatible                    │
│                                                          │
│ Changes:                                                 │
│ [View Full Release Notes]                               │
│                                                          │
│ Decision:                                                │
│ ⦿ Approve                                                │
│ ○ Reject                                                 │
│ ○ Request Changes                                        │
│                                                          │
│ Comments:                                                │
│ [Text area]                                             │
│                                                          │
│ [Submit Decision]                                       │
└──────────────────────────────────────────────────────────┘
```

---

### 3.4 Automated Deployment

**Upon approval:**

1. **Deployment Pipeline Triggered:**
```
┌──────────────────────────────────────────────────────────┐
│ 🚀 Deploying to QA...                                    │
│                                                          │
│ ✅ Pre-deployment checks passed                         │
│ ✅ Database migrations applied                          │
│ 🔄 Deploying API containers... (2/5 completed)          │
│ ⏳ Waiting for health checks...                         │
│ ⏳ Running smoke tests...                               │
│                                                          │
│ Estimated time: 3 minutes                               │
│ [View Logs]                                             │
└──────────────────────────────────────────────────────────┘
```

2. **Deployment Complete:**
```
┌──────────────────────────────────────────────────────────┐
│ ✅ Successfully Deployed to QA                           │
│                                                          │
│ User Service API v1.3.0                                 │
│ Environment: QA                                          │
│ Deployed: Dec 15, 2024 4:45 PM                          │
│                                                          │
│ ✅ All health checks passed                             │
│ ✅ Smoke tests: 12/12 passed                            │
│                                                          │
│ QA Base URL: https://api-qa.company.com/users           │
│                                                          │
│ [View in QA] [Notify QA Team] [Close]                  │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Environment-Specific Approval Matrix

| Promotion | Approvers Required | Auto-Deploy | Testing Required |
|-----------|-------------------|-------------|------------------|
| **DEV → QA** | Team Lead | ✅ Yes | Unit + Integration |
| **QA → STAGE** | Product Owner | ❌ No (Manual) | Full regression |
| **STAGE → PROD** | Admin + Product Owner | ❌ No (Manual) | Security scan + Load test |

**Escalation Rules:**
- If approver doesn't respond in 24 hours → Auto-remind
- If approver doesn't respond in 48 hours → Escalate to backup approver
- Prod promotions require 2-of-3 approvers (Product Owner, Admin, CTO)

---

## 5. Rollback Procedures

### 5.1 Rollback UI

**If deployment fails or issues discovered:**

```
┌──────────────────────────────────────────────────────────┐
│ ⚠️ Rollback User Service API in QA                      │
│                                                          │
│ Current Version: v1.3.0 (Deployed 2 hours ago)          │
│ Rollback To: v1.2.0 (Last stable version)               │
│                                                          │
│ Reason for Rollback:                                     │
│ ⦿ Critical bug discovered                                │
│ ○ Performance degradation                                │
│ ○ Failed health checks                                   │
│ ○ Other: [Specify]                                      │
│                                                          │
│ Impact:                                                  │
│ • QA environment subscribers: 3 teams                   │
│ • Estimated rollback time: 2 minutes                    │
│ • Data loss: None (database compatible)                 │
│                                                          │
│ Comments:                                                │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Critical bug in new preferences endpoint causing   │  │
│ │ 500 errors. Rolling back to investigate.           │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ [Cancel]  [Confirm Rollback]                           │
└──────────────────────────────────────────────────────────┘
```

**Rollback Approval:**
- DEV/QA: No approval needed (Team Lead can rollback)
- STAGE: Product Owner approval
- PROD: Admin approval + incident ticket required

---

## 6. Testing Gates & Quality Checks

### 6.1 Quality Gates by Environment

**DEV → QA Promotion:**
```
Required Checks:
✅ Unit test coverage ≥ 80%
✅ No critical security vulnerabilities
✅ Linting passes (warnings allowed)
✅ API contract validation
✅ Documentation updated

Optional:
⚠️ Integration tests (recommended)
⚠️ Performance benchmarks
```

**QA → STAGE Promotion:**
```
Required Checks:
✅ All DEV → QA checks +
✅ Integration tests: 100% pass rate
✅ Manual QA sign-off
✅ No open P1/P2 bugs
✅ Regression tests passed
✅ Load testing completed

Automated:
✅ Dependency security scan
✅ OWASP Top 10 security scan
```

**STAGE → PROD Promotion:**
```
Required Checks:
✅ All previous checks +
✅ Production-like load test (95th percentile < 200ms)
✅ Failover/disaster recovery tested
✅ Monitoring/alerting configured
✅ Runbook documented
✅ Rollback plan tested in STAGE

Manual Approvals:
✅ Product Owner sign-off
✅ Admin approval
✅ Change Advisory Board (CAB) approval
✅ Security team review (for new APIs)
```

---

## 7. Environment Configuration Management

### 7.1 Environment-Specific Settings

**Product Detail → Environment Config:**

```
┌──────────────────────────────────────────────────────────┐
│ QA Environment Configuration                             │
│                                                          │
│ Base URL:                                                │
│ [https://api-qa.company.com/users/v1]                   │
│                                                          │
│ Rate Limits:                                             │
│ • Requests per minute: [500]                            │
│ • Requests per day: [50000]                             │
│ • Burst limit: [100]                                    │
│                                                          │
│ Authentication:                                           │
│ • Method: OAuth 2.0                                      │
│ • Token expiry: [24] hours                              │
│ • Refresh token: ☑ Enabled                              │
│                                                          │
│ Logging:                                                 │
│ • Level: [INFO ▼]                                       │
│ • Retention: [30] days                                  │
│ • PII masking: ☑ Enabled                                │
│                                                          │
│ Feature Flags:                                           │
│ ☑ New authentication flow                               │
│ ☐ Experimental analytics endpoint                       │
│                                                          │
│ [Save Configuration] [Copy from DEV] [Reset]            │
└──────────────────────────────────────────────────────────┘
```

---

## 8. Notifications & Audit Trail

### 8.1 Promotion Notifications

**Subscribers in target environment receive notifications:**

**When API is promoted to their environment:**
```
Subject: 📦 User Service API v1.3.0 Deployed to QA

User Service API has been updated in the QA environment.

Version: v1.3.0 (promoted from DEV)
Deployed: Dec 15, 2024 4:45 PM
Your subscriptions affected: 2

What's New:
• New preferences endpoint
• Performance improvements
• Bug fixes

Breaking Changes: None

Migration Required: No action needed

[View Release Notes] [Test Your Integration]
```

### 8.2 Audit Log

**All promotion activities logged:**

```sql
CREATE TABLE promotion_history (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  from_environment VARCHAR(10) NOT NULL,
  to_environment VARCHAR(10) NOT NULL,
  version VARCHAR(50) NOT NULL,
  
  requested_by_user_id UUID REFERENCES users(id),
  requested_at TIMESTAMP NOT NULL,
  
  approved_by_user_id UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  
  deployment_status VARCHAR(20), -- 'PENDING', 'IN_PROGRESS', 'SUCCESS', 'FAILED', 'ROLLED_BACK'
  deployed_at TIMESTAMP,
  
  rollback_reason TEXT,
  rolled_back_at TIMESTAMP,
  rolled_back_by_user_id UUID,
  
  metadata JSONB -- release notes, test results, etc.
);
```

---

## 9. Database Schema Updates

### 9.1 Products Table
```sql
-- Add environment support
ALTER TABLE products ADD COLUMN environment VARCHAR(10) NOT NULL DEFAULT 'DEV';
ALTER TABLE products ADD COLUMN promoted_from_version VARCHAR(50) NULL;
ALTER TABLE products ADD COLUMN last_promoted_at TIMESTAMP NULL;

-- Create unique constraint per environment
ALTER TABLE products ADD CONSTRAINT unique_product_env 
  UNIQUE (name, environment);
```

### 9.2 Environment Configurations Table
```sql
CREATE TABLE environment_configs (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  environment VARCHAR(10) NOT NULL,
  
  base_url VARCHAR(500) NOT NULL,
  rate_limit_per_minute INT DEFAULT 1000,
  rate_limit_per_day INT DEFAULT 100000,
  
  auth_method VARCHAR(50),
  token_expiry_hours INT,
  
  log_level VARCHAR(10) DEFAULT 'INFO',
  log_retention_days INT DEFAULT 30,
  
  feature_flags JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(product_id, environment)
);
```

### 9.3 Approval Workflows Table
```sql
CREATE TABLE promotion_approvals (
  id UUID PRIMARY KEY,
  promotion_request_id UUID REFERENCES promotion_history(id),
  
  approver_user_id UUID REFERENCES users(id),
  approver_role VARCHAR(50), -- 'TEAM_LEAD', 'PRODUCT_OWNER', 'ADMIN'
  
  decision VARCHAR(20), -- 'PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED'
  decision_at TIMESTAMP,
  comments TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 10. API Endpoints

```
# Environment filtering
GET /api/products?environment=QA&teamId=team-123

# Promotion request
POST /api/products/{id}/promote
Body: {
  fromEnvironment: "DEV",
  toEnvironment: "QA",
  version: "v1.3.0",
  releaseNotes: "...",
  migrationNotes: "..."
}

# Promotion approval
PATCH /api/promotions/{id}/approve
Body: {
  decision: "APPROVED",
  comments: "LGTM"
}

# Deployment status
GET /api/promotions/{id}/status
Response: {
  status: "IN_PROGRESS",
  currentStep: "Running smoke tests",
  progress: 75,
  logs: [...]
}

# Rollback
POST /api/products/{id}/rollback
Body: {
  environment: "QA",
  targetVersion: "v1.2.0",
  reason: "Critical bug"
}

# Environment config
GET /api/products/{id}/environments/{env}/config
PATCH /api/products/{id}/environments/{env}/config
```

---

## 11. CI/CD Integration

### 11.1 Automated Pipeline (Example: Azure DevOps)

```yaml
# azure-pipelines.yml
trigger:
  - main

stages:
  - stage: DeployDEV
    jobs:
      - job: DeployToDevEnvironment
        steps:
          - task: CallAPIMSelfService
            inputs:
              action: 'register-deployment'
              environment: 'DEV'
              version: $(Build.BuildNumber)

  - stage: PromoteToQA
    dependsOn: DeployDEV
    condition: succeeded()
    jobs:
      - job: RequestQAPromotion
        steps:
          - task: CallAPIMSelfService
            inputs:
              action: 'request-promotion'
              fromEnvironment: 'DEV'
              toEnvironment: 'QA'
              waitForApproval: true
              
  # Manual approval gate configured in Azure DevOps
  
  - stage: DeployQA
    dependsOn: PromoteToQA
    jobs:
      - job: DeployToQA
        steps:
          - task: CallAPIMSelfService
            inputs:
              action: 'deploy'
              environment: 'QA'
```

---

## 12. Implementation Checklist

### MVP2
- [ ] Database schema for multi-environment support
- [ ] Environment filter dropdown in Dashboard
- [ ] Environment badges on product cards
- [ ] Basic promotion workflow (Dev → QA)
- [ ] Approval system for Team Leads
- [ ] Deployment status tracking
- [ ] Email notifications for promotions

### MVP3
- [ ] Full QA → Stage → Prod pipeline
- [ ] Automated quality gates
- [ ] Rollback functionality
- [ ] Environment comparison view
- [ ] CI/CD pipeline integration
- [ ] Advanced audit logging
- [ ] CAB approval workflow for Prod
- [ ] Load testing integration

---

## Summary

This multi-environment system provides:
- ✅ **Environment Isolation**: Independent deployments per environment
- ✅ **Controlled Promotions**: Gated approvals prevent bad code from reaching Prod
- ✅ **Automated Testing**: Quality gates ensure stability
- ✅ **Rollback Safety**: Quick recovery from failed deployments
- ✅ **Audit Trail**: Complete history of all promotions
- ✅ **Subscriber Notifications**: Teams notified of environment changes
- ✅ **CI/CD Integration**: Seamless automation pipeline support
