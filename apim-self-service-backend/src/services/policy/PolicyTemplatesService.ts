/**
 * @fileoverview Policy Templates Service
 * 
 * Backend-driven policy templates
 * Add/modify templates without frontend redeployment
 */

import { query } from '../core/db.js';

export interface PolicyTemplate {
    id: string;
    name: string;
    description?: string;
    category: 'security' | 'transformation' | 'traffic' | 'backend';
    section: 'inbound' | 'backend' | 'outbound' | 'on-error';
    templateSchema: {
        fields: PolicyField[];
        xmlTemplate: string;
    };
    isActive: boolean;
    displayOrder: number;
}

export interface PolicyField {
    name: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'textarea' | 'array';
    required?: boolean;
    options?: { value: string; label: string }[];
    placeholder?: string;
    defaultValue?: any;
}

/**
 * Get all active policy templates
 */
export async function getAllPolicyTemplates(): Promise<PolicyTemplate[]> {
    const result = await query(`
        SELECT id, name, description, category, section, template_schema, is_active, display_order
        FROM policy_templates
        WHERE is_active = true
        ORDER BY display_order ASC, name ASC
    `);

    return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        section: row.section,
        templateSchema: row.template_schema,
        isActive: row.is_active,
        displayOrder: row.display_order
    }));
}

/**
 * Get templates for a specific section
 */
export async function getTemplatesBySection(section: string): Promise<PolicyTemplate[]> {
    const result = await query(`
        SELECT id, name, description, category, section, template_schema, is_active, display_order
        FROM policy_templates
        WHERE section = $1 AND is_active = true
        ORDER BY display_order ASC, name ASC
    `, [section]);

    return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        section: row.section,
        templateSchema: row.template_schema,
        isActive: row.is_active,
        displayOrder: row.display_order
    }));
}

/**
 * Get a specific template
 */
export async function getPolicyTemplate(id: string): Promise<PolicyTemplate | null> {
    const result = await query(`
        SELECT id, name, description, category, section, template_schema, is_active, display_order
        FROM policy_templates
        WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
        return null;
    }

    const row = result.rows[0];
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        section: row.section,
        templateSchema: row.template_schema,
        isActive: row.is_active,
        displayOrder: row.display_order
    };
}

/**
 * Generate XML from template and values
 * Simple template engine (no Handlebars for now - use string replacement)
 */
export function generateXmlFromTemplate(template: PolicyTemplate, values: Record<string, any>): string {
    let xml = template.templateSchema.xmlTemplate;

    // 1. Handle {{#each ...}} blocks first
    // Pattern: {{#each fieldName}}...{{this}}...{{/each}}
    const eachRegex = /\{\{#each\s+([a-zA-Z0-9_]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    xml = xml.replace(eachRegex, (_, fieldName, innerTemplate) => {
        const value = values[fieldName];
        if (!Array.isArray(value)) {
            // Handle comma-separated strings as arrays if needed (for legacy/simple inputs)
            if (typeof value === 'string' && value.includes(',')) {
                const parts = value.split(',').map(v => v.trim()).filter(Boolean);
                return parts.map(p => innerTemplate.replace(/\{\{this\}\}/g, p)).join('\n        ');
            }
            return '';
        }
        return value.map(item => innerTemplate.replace(/\{\{this\}\}/g, String(item).trim())).join('\n        ');
    });

    // 2. Replace regular {{fieldName}} with values
    Object.entries(values).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;

        if (Array.isArray(value)) {
            // If it's an array but not used in an #each block, just join it
            xml = xml.replace(new RegExp(placeholder, 'g'), value.map(v => String(v).trim()).join(', '));
        } else {
            // Trim string values to avoid invalid XML spacing
            const sanitizedValue = typeof value === 'string' ? value.trim() : String(value);
            xml = xml.replace(new RegExp(placeholder, 'g'), sanitizedValue);
        }
    });

    // 3. Clean up any remaining Handlebars-style helpers (like #if) if present but unhandled
    // This is a minimal implementation; in production, use a real parser
    xml = xml.replace(/\{\{#if.*?\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');

    return xml;
}

/**
 * Create or update a policy template (admin only)
 */
export async function upsertPolicyTemplate(params: {
    id: string;
    name: string;
    description?: string;
    category: string;
    section: string;
    templateSchema: any;
    displayOrder?: number;
}): Promise<PolicyTemplate> {
    const result = await query(`
        INSERT INTO policy_templates (id, name, description, category, section, template_schema, display_order)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id)
        DO UPDATE SET
            name = $2,
            description = $3,
            category = $4,
            section = $5,
            template_schema = $6,
            display_order = $7,
            updated_at = NOW()
        RETURNING id, name, description, category, section, template_schema, is_active, display_order
    `, [
        params.id,
        params.name,
        params.description,
        params.category,
        params.section,
        JSON.stringify(params.templateSchema),
        params.displayOrder || 0
    ]);

    const row = result.rows[0];
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        category: row.category,
        section: row.section,
        templateSchema: row.template_schema,
        isActive: row.is_active,
        displayOrder: row.display_order
    };
}
