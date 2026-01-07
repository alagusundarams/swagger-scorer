
import { query } from '../core/db.js';

export interface PolicyTemplate {
    id: string;
    name: string;
    description: string;
    category: string;
    section: string;
    templateSchema: any;
    displayOrder: number;
    tagName?: string;
    // Allow any other properties from the schema
    [key: string]: any;
}

/**
 * Get all active policy templates
 */
export const getPolicyTemplates = async (): Promise<PolicyTemplate[]> => {
    const res = await query(`
SELECT
id,
    name,
    description,
    category,
    section,
    template_schema as "templateSchema",
    display_order as "displayOrder"
        FROM policy_templates 
        WHERE is_active = true 
        ORDER BY display_order ASC
    `);

    // Parse the tagName from the schema if it exists to keep the frontend types happy
    return res.rows.map((row: any) => {
        const schema = row.templateSchema;
        const tagName = schema.tagName;
        // Clean up schema to match expected frontend structure (if needed)
        // Frontend expects: { ...props, xmlTemplate: "..." }
        // DB stores: { fields: [...], xmlTemplate: "..." } or similar based on seed.

        // Based on our seed script, we stored the frontend-compatible object directly in template_schema.
        // But we added tagName property to the root in the seed script too? 
        // Let's verify: The seed script inserted `templateSchema` which was the frontend object (inputs + xmlTemplate + tagName).

        // We need to spread that schema back out if the frontend expects a flat object, 
        // OR returns the schema as a nested object.
        // Looking at policyTemplates.ts, inputs are on the root of PolicyTemplate.

        // Let's return a merged object to match the frontend 'PolicyTemplate' interface
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            category: row.category,
            section: row.section,
            intent: row.description, // Mapping description to intent for now or schema.intent
            // Spread the JSON schema content: inputs, xmlTemplate, tagName
            ...row.templateSchema,
            tagName: tagName || row.id // fallback
        };
    });
};
