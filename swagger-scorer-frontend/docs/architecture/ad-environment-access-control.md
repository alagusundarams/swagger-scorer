# Environment-Based Access Control via Azure AD Groups

## Overview
The APIM Self Service portal uses **Azure AD group membership** to control:
1. **Environment Visibility**: Which environments (Dev/QA/Stage/Prod) a user can see
2. **Environment Actions**: What actions users can perform in each environment
3. **Approval Permissions**: Which users can approve promotions (Team Leads)

---

## 1. AD Group Naming Convention

### 1.1 Standard Group Naming Pattern

**Format:**
```
APIM-{TeamName}-{Environment}-{Role}
```

**Examples:**
```
APIM-PlatformEngineering-DEV-Developer
APIM-PlatformEngineering-DEV-Lead

APIM-PlatformEngineering-QA-Developer
APIM-PlatformEngineering-QA-Lead

APIM-PlatformEngineering-STAGE-Developer
APIM-PlatformEngineering-STAGE-Lead

APIM-PlatformEngineering-PROD-Developer
APIM-PlatformEngineering-PROD-Lead
```

### 1.2 Group Hierarchy

```
Platform Engineering Team
├── APIM-PlatformEngineering-DEV-Developer (10 members)
├── APIM-PlatformEngineering-DEV-Lead (2 members)
├── APIM-PlatformEngineering-QA-Developer (5 members)
├── APIM-PlatformEngineering-QA-Lead (1 member)
├── APIM-PlatformEngineering-STAGE-Developer (3 members)
├── APIM-PlatformEngineering-STAGE-Lead (1 member)
├── APIM-PlatformEngineering-PROD-Developer (2 members)
└── APIM-PlatformEngineering-PROD-Lead (1 member)
```

**Key Principles:**
- **Separate groups per environment** (Dev, QA, Stage, Prod)
- **Separate groups per role** (Developer, Lead)
- **Leads are in BOTH Lead and Developer groups** (inheritance)
- **Prod access is most restricted** (fewest members)

---

## 2. Role Definitions

### 2.1 Developer Role

**AD Group Pattern:** `APIM-{Team}-{Env}-Developer`

**Permissions in Environment:**
| Action | Dev | QA | Stage | Prod |
|--------|-----|-------|-------|------|
| View products | ✅ | ✅ | ✅ | ✅ |
| View subscribers | ✅ | ✅ | ✅ | ✅ |
| Edit product | ✅ | ❌ | ❌ | ❌ |
| Deploy new version | ✅ | ❌ | ❌ | ❌ |
| Request promotion | ✅ | ✅ | ✅ | ❌ |
| Approve promotion | ❌ | ❌ | ❌ | ❌ |
| Rollback | ❌ | ❌ | ❌ | ❌ |

**Typical Members:**
- Software Engineers
- Frontend Developers
- Backend Developers
- QA Engineers

---

### 2.2 Lead Role

**AD Group Pattern:** `APIM-{Team}-{Env}-Lead`

**Permissions in Environment:**
| Action | Dev | QA | Stage | Prod |
|--------|-----|-------|-------|------|
| All Developer permissions | ✅ | ✅ | ✅ | ✅ |
| Approve Dev→QA promotion | ✅ | ✅ | ❌ | ❌ |
| Approve QA→Stage promotion | ❌ | ✅ | ✅ | ❌ |
| Rollback (Dev/QA) | ✅ | ✅ | ❌ | ❌ |
| Disable subscriptions | ✅ | ✅ | ✅ | ❌ |

**Typical Members:**
- Tech Leads
- Engineering Managers
- Senior Engineers (designated)

---

### 2.3 Admin Role (Global)

**AD Group:** `APIM-Admins` (not environment-specific)

**Permissions (All Environments):**
| Action | Permissions |
|--------|-------------|
| View all products | ✅ Across all teams |
| Approve Stage→Prod | ✅ Required |
| Approve decommission | ✅ Required |
| Reassign orphaned APIs | ✅ Only admins |
| Configure system settings | ✅ Only admins |
| View audit logs | ✅ Full access |
| Rollback Prod | ✅ With approval |

**Typical Members:**
- Platform Administrators
- DevOps Leads
- CTO/VP Engineering
- Security Team Leads

---

## 3. Environment Visibility Model

### 3.1 User Environment Access

**Example User: Alice Lee**

**AD Group Memberships:**
```
- APIM-PlatformEngineering-DEV-Developer
- APIM-PlatformEngineering-QA-Developer
- APIM-PlatformEngineering-STAGE-Developer
```

**What Alice Sees in Portal:**

**Dashboard Environment Filter:**
```
┌─────────────────────────┐
│ Environment: [All ▼]    │
│ ─────────────────────   │
│ ⦿ All Environments      │
│ ○ Dev (✅ Access)       │
│ ○ QA (✅ Access)        │
│ ○ Stage (✅ Access)     │
│ ○ Prod (🔒 No Access)  │
└─────────────────────────┘
```

**Product Card Display:**
```
┌──────────────────────────────────────────────────────────┐
│ User Service API v1.0            [DEV] [QA] [STAGE]      │
│ user-service-api                 🔒 PROD (No Access)     │
└──────────────────────────────────────────────────────────┘
```

---

### 3.2 User Role Detection

**How portal determines user roles:**

**On Login (via Microsoft Graph API):**
```typescript
// Fetch user's AD group memberships
GET https://graph.microsoft.com/v1.0/me/memberOf

Response:
{
  "@odata.context": "...",
  "value": [
    {
      "id": "abc-123",
      "displayName": "APIM-PlatformEngineering-DEV-Developer",
      ...
    },
    {
      "id": "def-456",
      "displayName": "APIM-PlatformEngineering-DEV-Lead",
      ...
    },
    {
      "id": "ghi-789",
      "displayName": "APIM-PlatformEngineering-QA-Developer",
      ...
    }
  ]
}
```

**Parse and classify:**
```typescript
interface UserEnvironmentAccess {
  team: string;           // "PlatformEngineering"
  environments: {
    DEV: { role: 'Lead' },
    QA: { role: 'Developer' },
    STAGE: null,          // No access
    PROD: null
  };
  isAdmin: boolean;       // Member of APIM-Admins
}

function parseUserAccess(adGroups: ADGroup[]): UserEnvironmentAccess {
  const apimGroups = adGroups.filter(g => 
    g.displayName.startsWith('APIM-')
  );
  
  const access = {};
  
  apimGroups.forEach(group => {
    const matches = group.displayName.match(
      /APIM-(.+)-(DEV|QA|STAGE|PROD)-(Developer|Lead)/
    );
    
    if (matches) {
      const [_, team, env, role] = matches;
      
      if (!access[team]) access[team] = {};
      
      // Lead role overrides Developer
      if (!access[team][env] || role === 'Lead') {
        access[team][env] = { role };
      }
    }
  });
  
  return {
    teams: access,
    isAdmin: adGroups.some(g => g.displayName === 'APIM-Admins')
  };
}
```

---

## 4. Approval Permission Model

### 4.1 Promotion Approval Matrix

**Dev → QA Promotion:**
```
Required Approver: Lead in DEV or QA environment

Eligible Approvers:
- Members of: APIM-{Team}-DEV-Lead
- OR Members of: APIM-{Team}-QA-Lead
```

**QA → Stage Promotion:**
```
Required Approver: Lead in QA or STAGE environment

Eligible Approvers:
- Members of: APIM-{Team}-QA-Lead
- OR Members of: APIM-{Team}-STAGE-Lead
```

**Stage → Prod Promotion:**
```
Required Approvers: 
1. Lead in STAGE or PROD (Product Owner)
2. Admin (APIM-Admins member)

Both approvals required before deployment.
```

---

### 4.2 UI Permission Indicators

**Promote Button Visibility:**

**Developer (Alice) sees:**
```
┌──────────────────────────────────────────────────────────┐
│ DEV Environment                                          │
│ Version: v1.3.0                                         │
│                                                          │
│ [Request Promotion to QA →]                             │
│ ℹ️ Your team lead will review this request              │
└──────────────────────────────────────────────────────────┘
```

**Lead (Bob) sees:**
```
┌──────────────────────────────────────────────────────────┐
│ DEV Environment                                          │
│ Version: v1.3.0                                         │
│                                                          │
│ [Promote to QA →] (Direct promotion - no approval needed)│
│ OR                                                       │
│ [Request Promotion] (Optional: add co-approver)         │
└──────────────────────────────────────────────────────────┘
```

**Lead can also see pending approval requests:**
```
🔔 Notifications (2 new)

✋ Approval Required - Dev → QA Promotion
   User Service API v1.3.0
   Requested by: Alice Lee
   [Review Request]
   30 minutes ago
```

---

## 5. Database Schema

### 5.1 User Environment Access (Cached)

```sql
-- Cache user's AD group memberships
CREATE TABLE user_environment_access (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  team_id UUID REFERENCES teams(id),
  
  environment VARCHAR(10) NOT NULL, -- 'DEV', 'QA', 'STAGE', 'PROD'
  role VARCHAR(20) NOT NULL, -- 'Developer', 'Lead'
  
  ad_group_id VARCHAR(255) NOT NULL,
  ad_group_name VARCHAR(255) NOT NULL,
  
  cached_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- Re-query after 24 hours
  
  UNIQUE(user_id, team_id, environment)
);

CREATE INDEX idx_user_env_access ON user_environment_access(user_id, environment);
```

### 5.2 Teams with Environment AD Groups

```sql
ALTER TABLE teams ADD COLUMN ad_groups JSONB;

-- Example data:
{
  "DEV": {
    "developer": {
      "groupId": "abc-123",
      "groupName": "APIM-PlatformEngineering-DEV-Developer"
    },
    "lead": {
      "groupId": "def-456",
      "groupName": "APIM-PlatformEngineering-DEV-Lead"
    }
  },
  "QA": {
    "developer": { ... },
    "lead": { ... }
  },
  "STAGE": { ... },
  "PROD": { ... }
}
```

---

## 6. Permission Check Examples

### 6.1 Can User View Environment?

```typescript
function canViewEnvironment(
  userId: string, 
  teamId: string, 
  environment: string
): boolean {
  const access = getUserEnvironmentAccess(userId, teamId, environment);
  return access !== null; // Any role grants view access
}
```

### 6.2 Can User Promote API?

```typescript
function canPromoteAPI(
  userId: string,
  productId: string,
  fromEnv: string,
  toEnv: string
): boolean {
  const product = getProduct(productId);
  const access = getUserEnvironmentAccess(userId, product.teamId, fromEnv);
  
  // Developers can only REQUEST promotion (needs approval)
  // Leads can directly promote (or request with co-approvers)
  
  if (fromEnv === 'DEV' && toEnv === 'QA') {
    return access?.role === 'Lead' || access?.role === 'Developer';
  }
  
  if (fromEnv === 'QA' && toEnv === 'STAGE') {
    return access?.role === 'Lead' || access?.role === 'Developer';
  }
  
  if (fromEnv === 'STAGE' && toEnv === 'PROD') {
    // Must be Lead + Admin approval
    const isLead = access?.role === 'Lead';
    const isAdmin = isUserAdmin(userId);
    return isLead || isAdmin; // Can REQUEST, but needs both approvals
  }
  
  return false;
}
```

### 6.3 Can User Approve Promotion?

```typescript
function canApprovePromotion(
  userId: string,
  promotionRequest: PromotionRequest
): boolean {
  const { productId, fromEnvironment, toEnvironment } = promotionRequest;
  const product = getProduct(productId);
  
  if (fromEnvironment === 'DEV' && toEnvironment === 'QA') {
    // Need to be Lead in DEV or QA
    const devAccess = getUserEnvironmentAccess(userId, product.teamId, 'DEV');
    const qaAccess = getUserEnvironmentAccess(userId, product.teamId, 'QA');
    
    return devAccess?.role === 'Lead' || qaAccess?.role === 'Lead';
  }
  
  if (fromEnvironment === 'QA' && toEnvironment === 'STAGE') {
    const qaAccess = getUserEnvironmentAccess(userId, product.teamId, 'QA');
    const stageAccess = getUserEnvironmentAccess(userId, product.teamId, 'STAGE');
    
    return qaAccess?.role === 'Lead' || stageAccess?.role === 'Lead';
  }
  
  if (fromEnvironment === 'STAGE' && toEnvironment === 'PROD') {
    const stageAccess = getUserEnvironmentAccess(userId, product.teamId, 'STAGE');
    const prodAccess = getUserEnvironmentAccess(userId, product.teamId, 'PROD');
    const isAdmin = isUserAdmin(userId);
    
    // Requires BOTH: Lead AND Admin
    const isLead = stageAccess?.role === 'Lead' || prodAccess?.role === 'Lead';
    
    return isLead || isAdmin; // Can provide one of two required approvals
  }
  
  return false;
}
```

---

## 7. AD Group Setup Guide (for IT Admins)

### 7.1 Creating Environment Groups

**For each team and environment:**

1. **Create Developer Group:**
   ```
   Name: APIM-PlatformEngineering-DEV-Developer
   Description: Platform Engineering team developers with DEV environment access
   Type: Security
   Members: Add all team developers
   ```

2. **Create Lead Group:**
   ```
   Name: APIM-PlatformEngineering-DEV-Lead
   Description: Platform Engineering team leads with DEV approval permissions
   Type: Security
   Members: Add team lead(s)
   ```

3. **Nested Membership (Important!):**
   - Leads should ALSO be members of Developer groups
   - This gives them both roles' permissions
   - Example: John (Lead) is in both:
     - `APIM-PlatformEngineering-DEV-Lead`
     - `APIM-PlatformEngineering-DEV-Developer`

### 7.2 Group Ownership

**Best Practice:**
- **Owner**: IT Admin or Platform Team
- **Co-Owner**: Engineering Manager for that team
- **Member Management**: Automated via HR system (e.g., Workday → AD sync)

### 7.3 Naming Consistency

**CRITICAL:** Group names must follow exact pattern:
```
APIM-{TeamName}-{Environment}-{Role}
```

**Valid:**
- ✅ `APIM-PlatformEngineering-DEV-Developer`
- ✅ `APIM-BackendServices-PROD-Lead`

**Invalid:**
- ❌ `APIM-Platform_Engineering-DEV-Developer` (underscore)
- ❌ `APIM-PlatformEng-Development-Developer` (wrong env name)
- ❌ `PlatformEngineering-DEV-Developer` (missing APIM prefix)

---

## 8. User Onboarding Flow

### 8.1 New Team Member Joins

**Scenario:** Sarah joins Platform Engineering team

**IT Admin Actions:**
1. Add Sarah to base AD groups:
   ```
   - APIM-PlatformEngineering-DEV-Developer
   - APIM-PlatformEngineering-QA-Developer
   ```

2. Sarah logs into APIM Self Service portal
3. Portal queries Microsoft Graph API for Sarah's groups
4. Portal detects she's in DEV/QA Developer groups
5. Sarah sees:
   - Dev environment (full access)
   - QA environment (view + request promotion)
   - Stage/Prod grayed out (no access)

**Auto-provisioning complete!** No manual portal configuration needed.

---

### 8.2 Promotion to Team Lead

**Scenario:** Sarah promoted to Team Lead

**IT Admin Actions:**
1. Add Sarah to Lead groups:
   ```
   - APIM-PlatformEngineering-DEV-Lead
   - APIM-PlatformEngineering-QA-Lead
   - APIM-PlatformEngineering-STAGE-Developer (expanded access)
   ```

2. Sarah's next portal login:
   - Automatic role update (cached permissions refreshed)
   - New "Approve Promotions" notifications appear
   - Unlock Lead-only actions (direct promotions, rollbacks)

---

## 9. Security & Access Issues

### 9.1 Access Denied Handling

**User tries to access restricted environment:**

```
┌──────────────────────────────────────────────────────────┐
│ ⚠️ Access Denied                                         │
│                                                          │
│ You do not have permission to view the PROD environment. │
│                                                          │
│ Required: Member of APIM-PlatformEngineering-PROD-*     │
│                                                          │
│ [Contact Your Manager] [Request Access]                 │
└──────────────────────────────────────────────────────────┘
```

### 9.2 Missing Lead for Approval

**Scenario:** No one in Lead group for a team

**Portal Handling:**
1. Detect missing approver when promotion requested
2. Escalate to Admin group
3. Send alert email to IT Admin:
   ```
   Subject: ⚠️ Missing Team Lead for Approval
   
   Platform Engineering team has no members in:
   APIM-PlatformEngineering-QA-Lead
   
   Promotion requests are blocked until this is resolved.
   
   Action Required: Assign a team lead or temporarily grant admin approval.
   ```

### 9.3 Stale Group Membership Cache

**Problem:** User removed from AD group but still has access

**Solution:**
- Cache expires after 24 hours (force re-query)
- Admin can manually invalidate cache: `POST /api/admin/users/{id}/refresh-permissions`
- On critical actions (Prod promotion), always re-query AD in real-time

---

## 10. Implementation Checklist

### MVP2
- [ ] AD group parsing logic (extract team/env/role)
- [ ] User environment access detection
- [ ] Environment filter dropdown with access indicators
- [ ] Permission checks for view/edit/promote
- [ ] Lead role detection for approvals
- [ ] Access denied UI/messaging

### MVP3
- [ ] Real-time AD group sync (webhooks)
- [ ] Group membership cache with expiry
- [ ] Self-service access request workflow
- [ ] Audit logging of permission checks
- [ ] Admin dashboard for user access management
- [ ] Automated alert for missing approvers

---

## Summary

This AD-based access control model provides:
- ✅ **Environment Isolation**: Users only see environments they have access to
- ✅ **Role-Based Permissions**: Developers vs. Leads have different capabilities
- ✅ **Zero Manual Setup**: AD group membership = automatic portal access
- ✅ **Secure Promotions**: Multi-level approval based on environment sensitivity
- ✅ **Self-Service**: IT admins manage via AD groups (familiar process)
- ✅ **Audit Trail**: All permissions tied to AD groups (compliance-ready)

**Key Advantage:** Leverage existing AD infrastructure instead of building custom RBAC!
