import dotenv from 'dotenv';
dotenv.config();

import { query } from '../src/services/db.js';

async function seed() {
    console.log('🌱 Seeding MVP1 Proof of Concept Data...');

    try {
        // 1. Teams
        await query("INSERT INTO teams (id, name, description) VALUES ('team-alpha', 'Team Alpha', 'The core platform team') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description");
        await query("INSERT INTO teams (id, name, description) VALUES ('team-beta', 'Team Beta', 'External consumer team') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description");

        // 2. Products
        await query("INSERT INTO products (id, name, display_name, description, owner_team_id, state) VALUES ('product-1', 'payments-api', 'Payments API', 'High performance payment processing', 'team-alpha', 'active') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, display_name = EXCLUDED.display_name, description = EXCLUDED.description, state = EXCLUDED.state");


        // 3. Subscriptions
        await query("INSERT INTO subscriptions (id, product_id, subscriber_team_id, state, app_id, app_display_name) VALUES ('sub-1', 'product-1', 'team-beta', 'active', 'app-1', 'Consumer App One') ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, app_display_name = EXCLUDED.app_display_name");

        console.log('✅ Seeding complete.');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seed();
