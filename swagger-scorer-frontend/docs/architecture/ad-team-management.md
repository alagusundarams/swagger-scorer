# Team Management & Approval Flow Documentation

## Overview
The APIM Self Service portal integrates with **Azure Active Directory (AD) groups** for team management. APIs/Products are owned by teams, and teams are synchronized with AD groups.

---

## 1. Approval Flow (Already Implemented)

### Current Implementation
The **Pending Approvals** tab on the Dashboard shows subscription requests that require approval.

**Flow:**
1. Team A wants to consume Team B's API product
2. Team A clicks "Subscribe" (from Browse page or Product detail page)
3. Subscription request is created with `state: 'pending'`
4. Team B (product owners) see the request in their **"Pending Approvals"** tab
5. Team B can **Approve** or **Reject** the request
6. On approval: `state` changes to `'active'` and Team A gets access
7. On rejection: Team A is notified

**UI Components:**
- `DashboardPage.tsx` - Pending Approvals tab
- Shows: Requesting team, Product name, Date requested
- Actions: Approve button (green), Reject button (red)
- Notifications: Toast messages on approve/reject

**Mock Data:**
- See `src/mocks/subscriptions.ts` for pending subscription examples

---

## 2. Azure AD Group Integration

### Team-to-AD-Group Mapping

**Concept:**
- Each **Team** in the system maps to an **Azure AD Security Group**
- Team membership is **NOT** stored in the portal database
- Team membership is **always queried** from Azure AD Graph API in real-time

**Data Model:**
```typescript
interface Team {
  id: string;           // Internal team ID
  name: string;         // Display name
  adGroupId: string;    // Azure AD Group Object ID
  adGroupName: string;  // Azure AD Group Display Name
  createdAt: Date;
  isActive: boolean;    // Flag for orphan detection
}
```

**Important:**
- User membership is determined by querying Microsoft Graph API
- Users do NOT have a `teams` array stored locally
- Query: `GET https://graph.microsoft.com/v1.0/me/memberOf`

---

## 3. Orphaned API Detection

### Problem Statement
If an Azure AD group is **deleted** (e.g., team disbanded, reorganization), the APIs owned by that team become **orphaned** — they have no owners and cannot be managed.

### Detection Flow

**1. Scheduled Background Job (Backend Service)**
```
Every 24 hours (or configurable interval):
  1. Fetch all teams from database
  2. For each team:
     - Query Microsoft Graph API: GET /groups/{adGroupId}
     - If API returns 404 (group deleted):
       - Mark team as orphaned: team.isActive = false
       - Mark all products owned by this team as orphaned
       - Create admin notification
```

**2. Database Schema**
```sql
-- Teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  ad_group_id VARCHAR(255) UNIQUE NOT NULL,
  ad_group_name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  orphaned_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  owner_team_id UUID REFERENCES teams(id),
  is_orphaned BOOLEAN DEFAULT false,
  orphaned_at TIMESTAMP NULL,
  -- other fields...
);

-- Admin notifications table
CREATE TABLE admin_notifications (
  id UUID PRIMARY KEY,
  type VARCHAR(50), -- 'ORPHANED_API', 'ORPHANED_TEAM'
  severity VARCHAR(20), -- 'HIGH', 'MEDIUM', 'LOW'
  title VARCHAR(255),
  message TEXT,
  metadata JSONB, -- { teamId, productIds, adGroupId }
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**3. Frontend UI Indicators**

**Dashboard - My Products Tab:**
- Orphaned products show a **warning badge**: 
  ```
  ⚠️ Orphaned - No owner team
  ```
- Background color: `bg-amber-50`
- Product actions disabled (cannot edit, delete, or manage)

**Product Detail Page:**
```
┌─────────────────────────────────────────────┐
│ ⚠️ Warning: Orphaned Product                │
│ This product's owner team has been deleted. │
│ Contact your administrator to reassign      │
│ ownership or archive this product.          │
└─────────────────────────────────────────────┘
```

**Admin Dashboard (Future):**
- New page: `/admin/orphaned-resources`
- Lists all orphaned teams and products
- Actions: 
  - Reassign to another team
  - Archive/Delete product
  - Restore team (if AD group recreated)

---

## 4. Admin Notification System

### Notification Flow

**When AD Group is Deleted:**
1. Backend detects deletion via Graph API
2. Creates admin notification record:
   ```json
   {
     "type": "ORPHANED_API",
     "severity": "HIGH",
     "title": "Team 'Platform Engineering' deleted - 5 APIs orphaned",
     "message": "Azure AD group 'Platform-Engineering-Team' (ID: abc-123) has been deleted. The following APIs are now orphaned: User Service API, Order API, Analytics API, Payment Gateway API, Notification Service API",
     "metadata": {
       "teamId": "team-uuid",
       "teamName": "Platform Engineering",
       "adGroupId": "abc-123",
       "productIds": ["prod-1", "prod-2", "prod-3", "prod-4", "prod-5"],
       "detectedAt": "2024-12-15T14:00:00Z"
     }
   }
   ```

**Admin Notification UI:**
- Bell icon in header (with red badge count)
- Notification panel:
  ```
  🔔 Notifications (2 unread)
  
  ⚠️ HIGH - Team deleted, 5 APIs orphaned
     Platform Engineering team's AD group was deleted
     5 APIs need reassignment
     [View Details] [Mark as Read]
     2 hours ago
  ```

### Email Notifications
- Send email to all **admin users** when orphaned APIs detected
- Email template includes:
  - Team name and AD group ID
  - List of orphaned product names
  - Link to admin dashboard
  - Suggested actions

**Admin Users:**
- Defined in `users` table with `role: 'admin'`
- Or members of a special AD group (e.g., "APIM-Admins")

---

## 5. Recovery & Reassignment

### Reassignment Flow (Admin Action)

**Admin Dashboard UI:**
```
Orphaned Product: User Service API
Current Owner: Platform Engineering (deleted)

Select New Owner Team:
┌─────────────────────────────────────┐
│ [Dropdown] Choose team...           │
│  - Data Platform Team               │
│  - Backend Services Team            │
│  - Infrastructure Team              │
└─────────────────────────────────────┘

[Reassign Ownership]  [Archive Product]
```

**API Endpoint:**
```
POST /api/admin/products/{productId}/reassign
Body: { "newTeamId": "team-uuid" }

Response:
{
  "success": true,
  "message": "Product reassigned to Data Platform Team",
  "product": { ... }
}
```

### Archive Flow
- If product is no longer needed, admin can **archive** it
- Archiving:
  - Sets `is_archived: true`
  - Keeps historical data (for audit trail)
  - Hides from Browse catalog
  - Revokes all active subscriptions

---

## 6. Implementation Checklist

- [ ] **Backend Service: AD Group Sync Job**
  - [ ] Scheduled job (e.g., Azure Functions Timer Trigger)
  - [ ] Graph API integration to check group existence
  - [ ] Mark teams/products as orphaned
  - [ ] Create admin notifications

- [ ] **Database Schema**
  - [ ] Add `is_active`, `orphaned_at` to teams table
  - [ ] Add `is_orphaned`, `orphaned_at` to products table
  - [ ] Create `admin_notifications` table

- [ ] **Frontend UI**
  - [ ] Orphaned product badges in Dashboard
  - [ ] Warning banners on product detail pages
  - [ ] Admin notification bell icon in header
  - [ ] Admin dashboard for reassignment

- [ ] **Notification System**
  - [ ] Email service integration (SendGrid, Azure Email)
  - [ ] Admin email templates
  - [ ] In-app notification panel

- [ ] **API Endpoints**
  - [ ] `GET /api/admin/orphaned-resources` - List orphaned teams/products
  - [ ] `POST /api/admin/products/{id}/reassign` - Reassign ownership
  - [ ] `POST /api/admin/products/{id}/archive` - Archive product
  - [ ] `GET /api/admin/notifications` - Get admin notifications
  - [ ] `PATCH /api/admin/notifications/{id}` - Mark as read

---

## 7. Current State vs. Future Implementation

### ✅ Already Implemented (MVP1)
- Approval flow UI (Pending Approvals tab)
- Mock data for teams and subscriptions
- Basic team switching (global state with Zustand)
- Approve/Reject actions with optimistic UI updates

### 🔄 Needs Implementation (MVP2 / Production)
- Azure AD Graph API integration
- Real-time team membership queries
- Orphan detection background job
- Admin notification system
- Reassignment workflow
- Email notifications

---

## 8. Security Considerations

### Access Control
1. **Team Membership Verification:**
   - Always verify against Azure AD (Graph API)
   - Never trust local cache for authorization decisions
   - Cache membership for performance, but revalidate on sensitive operations

2. **Admin Actions:**
   - Require admin role verification (AD group check)
   - Log all reassignment actions (audit trail)
   - Require multi-factor authentication for destructive actions

3. **Orphaned Product Access:**
   - Block all modifications to orphaned products
   - Existing subscriptions remain active until reassignment/archive
   - Read-only access for non-admin users

### Audit Trail
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  action VARCHAR(100), -- 'REASSIGN_PRODUCT', 'ARCHIVE_PRODUCT'
  resource_type VARCHAR(50), -- 'PRODUCT', 'TEAM'
  resource_id UUID,
  performed_by_user_id UUID,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 9. Error Handling

### Graph API Failures
- If Graph API is unreachable:
  - Use cached team membership (warn users it may be stale)
  - Queue orphan detection for retry
  - Alert admins if failures persist > 24 hours

### False Positives
- AD group temporarily unavailable ≠ deleted
- Implement retry logic (3 attempts over 6 hours)
- Only mark as orphaned after confirmed deletion

### Recovery from Mistakes
- Admin can "un-orphan" a product if AD group is restored
- Provides "Restore Team" button in admin UI
- Re-queries Graph API to confirm group existence

---

## Notes
- This is a **critical production requirement** for enterprise deployments
- Orphaned APIs can cause security risks (no owner to approve requests)
- Admin notification is **mandatory** for compliance/governance
- Consider integration with incident management (ServiceNow, Jira)
