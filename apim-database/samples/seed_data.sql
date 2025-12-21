-- =============================================================================
-- SAMPLE SEED DATA (REFERENCE ONLY)
-- =============================================================================

-- 1. TEAMS
INSERT INTO teams (id, name, azure_ad_group_id, type, description, member_count) VALUES
('team-platform', 'Platform Engineering', 'aad-001', 'producer', 'Responsible for core infrastructure and APIM platform.', 12),
('team-payments', 'Payments & Billing', 'aad-002', 'producer', 'Domain team for all transaction and invoicing APIs.', 8),
('team-core', 'Core Systems', 'aad-003', 'consumer', 'Internal team building customer-facing apps.', 25),
('team-cloudops', 'Cloud Operations', 'aad-004', 'both', 'Hybrid team managing cloud resources and consuming APIs.', 15)
ON CONFLICT (id) DO NOTHING;

-- 2. USERS
INSERT INTO users (id, email, name, azure_ad_object_id, default_team_id, role) VALUES
('admin-001', 'admin@apim.portal', 'Portal Admin', 'oid-001', 'team-platform', 'admin'),
('user-payments-lead', 'sarah@payments.dev', 'Sarah Lead', 'oid-002', 'team-payments', 'user'),
('user-core-dev', 'mike@core.sys', 'Mike Dev', 'oid-003', 'team-core', 'user')
ON CONFLICT (id) DO NOTHING;

-- 3. USER TEAMS
INSERT INTO user_teams (user_id, team_id, is_lead) VALUES
('admin-001', 'team-platform', TRUE),
('user-payments-lead', 'team-payments', TRUE),
('user-core-dev', 'team-core', FALSE)
ON CONFLICT DO NOTHING;

-- 4. PRODUCTS
INSERT INTO products (id, name, display_name, version, description, state, owner_team_id, environment, visibility, management_mode, subscriber_count, quality_score) VALUES
('prod-payment', 'payment-gateway', 'Payment Gateway API', 'v2.1', 'Core payment processing for all digital channels.', 'published', 'team-payments', 'PROD', 'public', 'TERRAFORM_MANAGED', 42, 98.50),
('prod-customer', 'customer-service', 'Customer Service API', 'v1.0', 'Unified view of customer data and interactions.', 'published', 'team-core', 'PROD', 'internal', 'HYBRID', 15, 92.00),
('prod-delivery', 'delivery-tracking', 'Delivery Tracking', 'v0.9-beta', 'Real-time tracking for logistics partners.', 'notPublished', 'team-core', 'DEV', 'private', 'PORTAL_MANAGED', 0, 85.00)
ON CONFLICT (id) DO NOTHING;

-- 5. APIS
INSERT INTO apis (id, product_id, name, display_name, description, path, quality_score) VALUES
('api-pay-process', 'prod-payment', 'process-payment', 'Transaction Processing', 'Execute secure payments.', '/payments/v2/process', 95.00),
('api-pay-status', 'prod-payment', 'payment-status', 'Payment Status', 'Check status of a transaction.', '/payments/v2/status', 100.00),
('api-cust-profile', 'prod-customer', 'customer-profile', 'Customer Profiles', 'Fetch/Update customer metadata.', '/customers/v1/profiles', 90.00)
ON CONFLICT (id) DO NOTHING;

-- 6. OPERATIONS (for Operation Catalog with curl examples)
INSERT INTO operations (id, api_id, name, display_name, method, url_template, description) VALUES
-- Payment Processing API operations
('op-pay-create', 'api-pay-process', 'createPayment', 'Create Payment', 'POST', '/payments/v2/process', 'Initiate a new payment transaction with customer and amount details.'),
('op-pay-capture', 'api-pay-process', 'capturePayment', 'Capture Payment', 'POST', '/payments/v2/process/{id}/capture', 'Capture a previously authorized payment.'),
('op-pay-refund', 'api-pay-process', 'refundPayment', 'Refund Payment', 'POST', '/payments/v2/process/{id}/refund', 'Issue a full or partial refund for a completed payment.'),

-- Payment Status API operations  
('op-pay-get', 'api-pay-status', 'getPaymentStatus', 'Get Payment Status', 'GET', '/payments/v2/status/{transactionId}', 'Retrieve the current status and details of a payment transaction.'),
('op-pay-list', 'api-pay-status', 'listPayments', 'List Payments', 'GET', '/payments/v2/status', 'List all payments with optional filtering by date, status, or customer.'),

-- Customer Profile API operations
('op-cust-get', 'api-cust-profile', 'getCustomer', 'Get Customer Profile', 'GET', '/customers/v1/profiles/{customerId}', 'Retrieve complete customer profile including preferences and history.'),
('op-cust-update', 'api-cust-profile', 'updateCustomer', 'Update Customer', 'PATCH', '/customers/v1/profiles/{customerId}', 'Update specific fields in a customer profile.'),
('op-cust-create', 'api-cust-profile', 'createCustomer', 'Create Customer', 'POST', '/customers/v1/profiles', 'Create a new customer profile in the system.')
ON CONFLICT (id) DO NOTHING;

-- 7. AUDIT LOGS (Historical Context)
INSERT INTO audit_log (entity_type, entity_id, action, user_id, changes, timestamp) VALUES
('product', 'prod-payment', 'deployed', 'admin-001', '{"environment": "PROD", "status": "SUCCESS", "commitHash": "a1b2c3d"}', NOW() - INTERVAL '3 days'),
('product', 'prod-customer', 'updated', 'user-payments-lead', '{"description": "Updated version notes"}', NOW() - INTERVAL '1 day'),
('api', 'api-pay-process', 'created', 'admin-001', '{"path": "/payments/v2/process"}', NOW() - INTERVAL '10 days')
ON CONFLICT DO NOTHING;
