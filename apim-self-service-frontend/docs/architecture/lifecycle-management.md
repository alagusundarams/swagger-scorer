# API Lifecycle Management & Notification System

## Overview
This document covers the complete lifecycle management for APIs/Products including decommissioning, subscription management, and notification systems for keeping teams informed.

---

## 1. API/Product Decommissioning Flow

### 1.1 Decommissioning Stages

**Stage 1: Deprecation Warning (30-90 days before sunset)**
- Product owner marks API as "Deprecated"
- Status changes to: `DEPRECATED`
- All consuming teams receive notifications
- Product remains fully functional

**Stage 2: Sunset Notice (15-30 days before)**
- Product owner sets sunset date
- Status changes to: `SUNSET_SCHEDULED`
- Final reminder sent to all consumers
- Migration guide must be provided

**Stage 3: Decommissioned**
- API is turned off on sunset date
- Status changes to: `DECOMMISSIONED`
- All subscriptions revoked
- Historical data archived

---

### 1.2 UI Workflow - Product Detail Page

**"Decommission Product" Button** (visible only to product owners)

```
┌─────────────────────────────────────────────────────────┐
│ Product Actions                                         │
│ [Edit Product]  [Decommission Product ⚠️]              │
└─────────────────────────────────────────────────────────┘
```

**Clicking "Decommission Product" opens a multi-step wizard:**

#### Step 1: Impact Analysis
```
┌──────────────────────────────────────────────────────────┐
│ Decommission User Service API v1.0                      │
│                                                          │
│ ⚠️ Impact Analysis                                       │
│                                                          │
│ Active Subscribers: 8 teams                             │
│ Total Subscriptions: 12 active                          │
│                                                          │
│ Consuming Teams:                                        │
│ • Frontend Team (3 subscriptions)                       │
│ • Mobile App Team (2 subscriptions)                     │
│ • Analytics Team (1 subscription)                       │
│ • Data Platform (2 subscriptions)                       │
│ • Partner Integrations (2 subscriptions)                │
│ • Reporting Services (1 subscription)                   │
│ • Notification Service (1 subscription)                 │
│                                                          │
│ [Cancel]  [Next: Set Sunset Date →]                    │
└──────────────────────────────────────────────────────────┘
```

#### Step 2: Deprecation & Sunset Schedule
```
┌──────────────────────────────────────────────────────────┐
│ Set Decommission Timeline                                │
│                                                          │
│ Mark as Deprecated:                                      │
│ ⦿ Immediately                                            │
│ ○ Schedule for later: [Date Picker]                    │
│                                                          │
│ Sunset Date (API will be turned off):                   │
│ [Date Picker] 📅 2025-03-15                             │
│ ⚠️ Minimum 30 days notice required                      │
│                                                          │
│ Reminder Schedule:                                       │
│ ☑ Initial announcement (upon saving)                    │
│ ☑ 30 days before sunset                                 │
│ ☑ 15 days before sunset                                 │
│ ☑ 7 days before sunset                                  │
│ ☑ 1 day before sunset                                   │
│                                                          │
│ [← Back]  [Next: Migration Guide →]                    │
└──────────────────────────────────────────────────────────┘
```

#### Step 3: Migration Guide
```
┌──────────────────────────────────────────────────────────┐
│ Provide Migration Information                            │
│                                                          │
│ Replacement API (Optional):                              │
│ [Dropdown] → User Service API v2.0                      │
│                                                          │
│ Migration Guide:                                         │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Please migrate to User Service API v2.0 by        │  │
│ │ March 15, 2025.                                    │  │
│ │                                                    │  │
│ │ Key changes:                                       │  │
│ │ - New authentication method (OAuth 2.0)           │  │
│ │ - Updated endpoint paths (/v2/users)              │  │
│ │ - Response format changed to JSON:API spec        │  │
│ │                                                    │  │
│ │ Migration documentation:                           │  │
│ │ https://docs.company.com/migration/v1-to-v2       │  │
│ │                                                    │  │
│ │ Support: api-team@company.com                     │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Contact Email for Questions:                             │
│ [Input] api-support@company.com                         │
│                                                          │
│ [← Back]  [Review & Schedule Decommission →]           │
└──────────────────────────────────────────────────────────┘
```

#### Step 4: Confirmation & Approval
```
┌──────────────────────────────────────────────────────────┐
│ Review & Confirm Decommission                            │
│                                                          │
│ Product: User Service API v1.0                          │
│ Deprecation: Immediate                                   │
│ Sunset Date: March 15, 2025 (45 days from now)          │
│ Affected Teams: 8 teams, 12 subscriptions               │
│                                                          │
│ ☑ I confirm that all consuming teams will be notified   │
│ ☑ I have provided migration guidance                    │
│ ☑ I understand this action requires admin approval      │
│                                                          │
│ Justification (required):                                │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Migrating to v2.0 with improved security and       │  │
│ │ performance. All teams have been briefed.          │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ [← Back]  [Submit for Approval]                        │
└──────────────────────────────────────────────────────────┘
```

---

### 1.3 Admin Approval Workflow

**After submission:**
1. Admin users receive notification: "Decommission request pending approval"
2. Admin reviews in `/admin/pending-actions`
3. Admin sees impact analysis + justification
4. Admin can:
   - **Approve** → Deprecation starts, notifications sent
   - **Reject** → Product owner is notified to revise
   - **Request Changes** → Add comments, send back to owner

---

### 1.4 Consumer Notifications

**When API is marked as DEPRECATED:**

**Email to all consuming teams:**
```
Subject: ⚠️ User Service API v1.0 Deprecated - Action Required

Dear Frontend Team,

User Service API v1.0 has been deprecated and will be decommissioned on March 15, 2025.

Your team has 3 active subscriptions to this API.

Action Required:
• Review migration guide: [Link]
• Migrate to User Service API v2.0 before sunset date
• Contact api-support@company.com for assistance

Sunset Timeline:
• Today: Deprecation notice
• Feb 13: 30-day reminder
• Feb 28: 15-day reminder
• March 8: 7-day reminder
• March 14: Final reminder

Migration Guide:
[Full migration guide text]

Questions? Contact: api-support@company.com

---
APIM Self Service Portal
[View in Portal] [Unsubscribe from this API]
```

**In-App Notification:**
```
🔔 Notifications (1 new)

⚠️ API Deprecation - Action Required
   User Service API v1.0 will be sunset on March 15, 2025
   You have 3 active subscriptions
   [View Migration Guide] [Dismiss]
   Just now
```

**Dashboard Warning Banner:**
```
┌──────────────────────────────────────────────────────────┐
│ ⚠️ DEPRECATED API                                        │
│ This API will be decommissioned on March 15, 2025       │
│ 45 days remaining                                        │
│ [View Migration Guide] [Unsubscribe]                    │
└──────────────────────────────────────────────────────────┘
```

---

## 2. Subscription Management (Disable/Delete)

### 2.1 Product Owner Actions

**Product owners can disable or revoke individual subscriptions**

**Scenario:** A team is abusing API rate limits or no longer needs access

**UI - Product Detail Page → Subscribers Tab:**
```
┌──────────────────────────────────────────────────────────┐
│ Active Subscribers (8)                                   │
│                                                          │
│ Frontend Team                                            │
│ • 3 subscriptions                                        │
│ • Last used: 2 hours ago                                │
│ [Disable Access] [View Usage] [More ▼]                 │
│ ─────────────────────────────────────────────────────────│
│ Mobile App Team                                          │
│ • 2 subscriptions                                        │
│ • Last used: 5 minutes ago                              │
│ [Disable Access] [View Usage] [More ▼]                 │
└──────────────────────────────────────────────────────────┘
```

**Clicking "Disable Access" opens confirmation:**
```
┌──────────────────────────────────────────────────────────┐
│ Disable Subscription for Frontend Team?                 │
│                                                          │
│ This action will:                                        │
│ • Immediately revoke API access                         │
│ • Invalidate subscription keys                          │
│ • Notify Frontend Team via email + in-app notification │
│                                                          │
│ Reason (required):                                       │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Rate limit violations detected. Please contact    │  │
│ │ us to discuss your usage needs.                    │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ [Cancel]  [Disable Subscription]                        │
└──────────────────────────────────────────────────────────┘
```

---

### 2.2 Consumer Team Actions

**Consumers can also delete their own subscriptions**

**UI - Dashboard → Subscriptions Tab:**
```
┌──────────────────────────────────────────────────────────┐
│ User Service API v1.0                                    │
│ Status: Active | Last used: 2 hours ago                 │
│ [View Details] [Delete Subscription] [More ▼]          │
└──────────────────────────────────────────────────────────┘
```

**Clicking "Delete Subscription":**
```
┌──────────────────────────────────────────────────────────┐
│ Delete Subscription to User Service API?                │
│                                                          │
│ ⚠️ This will immediately revoke your access              │
│                                                          │
│ ☐ Notify product owner of cancellation                  │
│                                                          │
│ Reason (optional):                                       │
│ [Text area] No longer using this API                    │
│                                                          │
│ [Cancel]  [Confirm Deletion]                            │
└──────────────────────────────────────────────────────────┘
```

---

### 2.3 Subscription Disable/Delete Notifications

**When subscription is DISABLED by product owner:**

**Email to consuming team:**
```
Subject: ⚠️ Your subscription to User Service API has been disabled

Dear Frontend Team,

Your subscription to User Service API v1.0 has been disabled by the product owner.

Reason:
Rate limit violations detected. Please contact us to discuss your usage needs.

Effective: Immediately
Status: Access revoked
Subscription Keys: Invalidated

Next Steps:
• Contact the API owner: api-team@company.com
• Review your usage patterns
• Request reinstatement or alternative solution

If you believe this was done in error, please reach out immediately.

---
APIM Self Service Portal
[Contact API Owner] [View Details]
```

**In-App Notification:**
```
🔔 Notifications (1 new)

🚫 Subscription Disabled
   User Service API v1.0 access has been revoked
   Reason: Rate limit violations
   [Contact Owner] [View Details]
   2 minutes ago
```

---

**When subscription is DELETED by consumer:**

**Email to product owner:**
```
Subject: 📊 Subscription Cancelled - User Service API

Dear API Team,

Frontend Team has cancelled their subscription to User Service API v1.0.

Subscription Details:
• Team: Frontend Team
• Cancelled: Dec 15, 2024 4:00 PM
• Reason: No longer using this API
• Usage last 30 days: 45,234 requests

This is for your records. No action required.

---
APIM Self Service Portal
[View Analytics] [View Team Profile]
```

**In-App Notification (to product owner):**
```
🔔 Notifications (1 new)

📉 Subscription Cancelled
   Frontend Team unsubscribed from User Service API v1.0
   Reason: No longer using this API
   [View Analytics]
   5 minutes ago
```

---

## 3. In-App Notification Center

### 3.1 Header Notification Bell

**Header component update:**
```tsx
// In Header.tsx
<div className="relative">
  <button className="relative p-2 text-gray-600 hover:text-gray-900">
    🔔
    {/* Unread badge */}
    {unreadCount > 0 && (
      <span className="absolute top-0 right-0 bg-red-500 text-white text-xs 
                       rounded-full h-5 w-5 flex items-center justify-center">
        {unreadCount}
      </span>
    )}
  </button>
</div>
```

---

### 3.2 Notification Panel UI

**Clicking the bell opens a dropdown:**
```
┌──────────────────────────────────────────────────────────┐
│ 🔔 Notifications                          [Mark All Read]│
│                                                          │
│ ⚠️ API Deprecation - Action Required                    │
│    User Service API v1.0 will sunset March 15, 2025    │
│    45 days remaining                                     │
│    [View Details] [Dismiss]                             │
│    2 hours ago                                          │
│ ──────────────────────────────────────────────────────  │
│ ✅ Subscription Approved                                 │
│    Your request for Analytics API was approved          │
│    [View Subscription]                                  │
│    Yesterday                                            │
│ ──────────────────────────────────────────────────────  │
│ 🚫 Subscription Disabled                                 │
│    Payment API access revoked - Rate limit exceeded    │
│    [Contact Owner]                                      │
│    3 days ago                                           │
│ ──────────────────────────────────────────────────────  │
│ 📢 Announcement: New API Available                      │
│    Check out the new Recommendation Engine API         │
│    [Browse APIs]                                        │
│    1 week ago                                           │
│ ──────────────────────────────────────────────────────  │
│                                                          │
│ [View All Notifications →]                              │
└──────────────────────────────────────────────────────────┘
```

---

### 3.3 Notification Types & Priorities

| Type | Priority | Icon | Email? | In-App? |
|------|----------|------|--------|---------|
| API Deprecation | HIGH | ⚠️ | ✅ Yes | ✅ Yes |
| Subscription Disabled | HIGH | 🚫 | ✅ Yes | ✅ Yes |
| Subscription Approved | MEDIUM | ✅ | ✅ Yes | ✅ Yes |
| Subscription Rejected | MEDIUM | ❌ | ✅ Yes | ✅ Yes |
| New Subscription Request | MEDIUM | 📬 | ✅ Yes | ✅ Yes |
| API Decommissioned | HIGH | 🔴 | ✅ Yes | ✅ Yes |
| Subscription Deleted by Consumer | LOW | 📉 | ✅ Yes (owner) | ✅ Yes (owner) |
| Sunset Reminder (30d) | HIGH | ⏰ | ✅ Yes | ✅ Yes |
| Sunset Reminder (15d) | CRITICAL | 🚨 | ✅ Yes | ✅ Yes |
| Sunset Reminder (1d) | CRITICAL | 🔥 | ✅ Yes | ✅ Yes |
| Announcement | LOW | 📢 | Optional | ✅ Yes |
| Orphaned API Detected | HIGH (admin) | ⚠️ | ✅ Yes (admin) | ✅ Yes (admin) |

---

## 4. Announcement System

### 4.1 Creating Announcements

**Admin-only feature for broadcasting messages**

**UI - Admin Panel → Announcements:**
```
┌──────────────────────────────────────────────────────────┐
│ Create Announcement                                      │
│                                                          │
│ Title:                                                   │
│ [Input] New Recommendation Engine API Now Available     │
│                                                          │
│ Message:                                                 │
│ ┌────────────────────────────────────────────────────┐  │
│ │ We're excited to announce the Recommendation       │  │
│ │ Engine API v1.0 is now available!                  │  │
│ │                                                    │  │
│ │ Features:                                          │  │
│ │ - Real-time personalization                       │  │
│ │ - ML-powered suggestions                          │  │
│ │ - Easy integration                                │  │
│ │                                                    │  │
│ │ Learn more: https://docs.company.com/rec-api      │  │
│ └────────────────────────────────────────────────────┘  │
│                                                          │
│ Target Audience:                                         │
│ ⦿ All users                                              │
│ ○ Specific teams: [Multi-select dropdown]              │
│                                                          │
│ Delivery:                                                │
│ ☑ In-app notification                                   │
│ ☑ Email                                                  │
│ ☐ Dashboard banner                                       │
│                                                          │
│ Priority:                                                │
│ ○ Low    ⦿ Medium    ○ High                            │
│                                                          │
│ [Cancel]  [Schedule Send]  [Send Now]                  │
└──────────────────────────────────────────────────────────┘
```

---

### 4.2 Dashboard Announcement Banner

**High-priority announcements can appear as banners:**
```
┌──────────────────────────────────────────────────────────┐
│ APIM Self Service                        Mock Developer │
└──────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────┐
│ 📢 New Recommendation Engine API Now Available!         │
│ Discover ML-powered personalization for your apps       │
│ [Learn More] [Dismiss]                                  │
└──────────────────────────────────────────────────────────┘

Dashboard content...
```

---

## 5. Database Schema

### 5.1 Notifications Table
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  team_id UUID REFERENCES teams(id), -- if team-specific
  type VARCHAR(50) NOT NULL, -- 'API_DEPRECATED', 'SUBSCRIPTION_DISABLED', etc.
  priority VARCHAR(20) NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  title VARCHAR(255) NOT NULL,
  message TEXT,
  metadata JSONB, -- { productId, subscriptionId, sunsetDate, etc. }
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NULL -- auto-delete after certain time
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);
```

### 5.2 Decommission Requests Table
```sql
CREATE TABLE decommission_requests (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  requested_by_user_id UUID REFERENCES users(id),
  status VARCHAR(20) NOT NULL, -- 'PENDING', 'APPROVED', 'REJECTED'
  sunset_date DATE NOT NULL,
  deprecation_date DATE,
  migration_guide TEXT,
  replacement_product_id UUID REFERENCES products(id) NULL,
  justification TEXT NOT NULL,
  admin_comments TEXT NULL,
  approved_by_user_id UUID REFERENCES users(id) NULL,
  approved_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5.3 Product Lifecycle States
```sql
-- Add to products table
ALTER TABLE products ADD COLUMN lifecycle_state VARCHAR(20) DEFAULT 'ACTIVE';
-- Values: 'ACTIVE', 'DEPRECATED', 'SUNSET_SCHEDULED', 'DECOMMISSIONED'

ALTER TABLE products ADD COLUMN deprecated_at TIMESTAMP NULL;
ALTER TABLE products ADD COLUMN sunset_date DATE NULL;
ALTER TABLE products ADD COLUMN decommissioned_at TIMESTAMP NULL;
ALTER TABLE products ADD COLUMN migration_guide TEXT NULL;
ALTER TABLE products ADD COLUMN replacement_product_id UUID REFERENCES products(id) NULL;
```

### 5.4 Announcements Table
```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH'
  target_audience VARCHAR(20) NOT NULL, -- 'ALL', 'SPECIFIC_TEAMS'
  target_team_ids UUID[] NULL, -- if specific teams
  created_by_user_id UUID REFERENCES users(id),
  delivery_channels VARCHAR(50)[], -- ['EMAIL', 'IN_APP', 'BANNER']
  sent_at TIMESTAMP NULL,
  expires_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Track which users have seen/dismissed announcements
CREATE TABLE announcement_views (
  id UUID PRIMARY KEY,
  announcement_id UUID REFERENCES announcements(id),
  user_id UUID REFERENCES users(id),
  viewed_at TIMESTAMP DEFAULT NOW(),
  dismissed_at TIMESTAMP NULL,
  UNIQUE(announcement_id, user_id)
);
```

---

## 6. API Endpoints

### 6.1 Decommissioning
```
POST /api/products/{id}/decommission/request
Body: {
  sunsetDate: "2025-03-15",
  deprecationDate: "2024-12-15", // optional, defaults to immediate
  migrationGuide: "...",
  replacementProductId: "uuid",
  justification: "..."
}

GET /api/admin/decommission-requests
Response: [{ id, product, requestedBy, status, sunsetDate, ... }]

PATCH /api/admin/decommission-requests/{id}/approve
Body: { adminComments: "Approved with conditions..." }

PATCH /api/admin/decommission-requests/{id}/reject
Body: { adminComments: "Please extend sunset to 60 days" }
```

### 6.2 Subscriptions
```
PATCH /api/products/{productId}/subscriptions/{subscriptionId}/disable
Body: { reason: "Rate limit violations" }

DELETE /api/subscriptions/{id}
Body: { reason: "No longer needed", notifyOwner: true }
```

### 6.3 Notifications
```
GET /api/notifications/me
Query: ?unreadOnly=true&limit=20
Response: { notifications: [...], unreadCount: 5 }

PATCH /api/notifications/{id}/read
PATCH /api/notifications/mark-all-read

DELETE /api/notifications/{id} // dismiss
```

### 6.4 Announcements
```
POST /api/admin/announcements
Body: {
  title: "...",
  message: "...",
  priority: "MEDIUM",
  targetAudience: "ALL",
  deliveryChannels: ["EMAIL", "IN_APP"]
}

GET /api/announcements/active
Response: [{ id, title, message, ... }]

PATCH /api/announcements/{id}/dismiss
```

---

## 7. Email Templates

### 7.1 API Deprecation Email
```html
Subject: ⚠️ {{productName}} Deprecated - Action Required by {{sunsetDate}}

<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 16px; margin-bottom: 20px;">
    <h2 style="margin: 0; color: #92400E;">⚠️ API Deprecation Notice</h2>
  </div>
  
  <p>Dear {{teamName}},</p>
  
  <p><strong>{{productName}}</strong> has been deprecated and will be decommissioned on <strong>{{sunsetDate}}</strong>.</p>
  
  <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin: 20px 0;">
    <h3>Impact on Your Team</h3>
    <ul>
      <li>Active Subscriptions: {{subscriptionCount}}</li>
      <li>Days Remaining: {{daysRemaining}}</li>
      <li>Sunset Date: {{sunsetDate}}</li>
    </ul>
  </div>
  
  <h3>Migration Guide</h3>
  <p>{{migrationGuide}}</p>
  
  <p style="margin-top: 30px;">
    <a href="{{portalLink}}" style="background: #2563EB; color: white; padding: 12px 24px; 
                                     text-decoration: none; border-radius: 6px; display: inline-block;">
      View in Portal
    </a>
  </p>
  
  <p>Questions? Contact: {{contactEmail}}</p>
  
  <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
  <p style="color: #6B7280; font-size: 12px;">
    APIM Self Service Portal | <a href="{{unsubscribeLink}}">Unsubscribe from this API</a>
  </p>
</body>
</html>
```

---

## 8. Implementation Checklist

### MVP2 Features
- [ ] Decommissioning workflow UI
- [ ] Admin approval for decommissioning
- [ ] Subscription disable/delete with notifications
- [ ] In-app notification center
- [ ] Email notification service
- [ ] Announcement system
- [ ] Database schema updates
- [ ] Background job for sunset reminders

### MVP3 Features
- [ ] Advanced analytics on API usage before sunset
- [ ] Automated migration testing tools
- [ ] Consumer feedback collection
- [ ] Grace period extensions
- [ ] Rollback mechanisms
- [ ] Integration with incident management systems

---

## 9. Best Practices

1. **Minimum Notice Period:** 30 days for deprecation, 60+ recommended
2. **Clear Migration Paths:** Always provide replacement API or migration guide
3. **Gradual Degradation:** Consider soft deprecation (warnings only) before hard sunset
4. **Consumer Support:** Dedicated support channel during migration period
5. **Usage Monitoring:** Track which teams migrate vs. which don't
6. **Sunset Day Grace:** Consider 7-day grace period for emergencies
7. **Archival:** Keep decommissioned API docs archived for reference

---

## Summary

This lifecycle management system ensures:
- ✅ Transparent communication to all stakeholders
- ✅ Sufficient time for consumers to migrate
- ✅ Admin oversight on critical decommissioning actions
- ✅ Multi-channel notifications (email + in-app)
- ✅ Clear audit trail of all actions
- ✅ Support for consumer questions and migration help
