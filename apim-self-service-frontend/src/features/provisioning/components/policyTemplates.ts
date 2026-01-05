/**
 * ------------------------------------------------------------------
 * 📘 POLICY REGISTRY (Configuration as Code)
 * ------------------------------------------------------------------
 * This file acts as the "Database" for all Policy Studio widgets.
 * To add a new Policy:
 * 1. Add a definition to `POLICY_TEMPLATES` (UI Schema + XML Template).
 * 2. Update `parsePolicyXml` to recognize the XML tag (Reverse Sync).
 * 
 * Future Improvement: This could be extracted to a `policies.json` file
 * loaded at runtime if dynamic updates without redeployment are required.
 * ------------------------------------------------------------------
 */

/**
 * ------------------------------------------------------------------
 * 📍 Feature Module: Policy Templates & XML Engine
 * ------------------------------------------------------------------
 * 🔄 RESPONSIBILITY:
 * - Defines the JSON schema for "Configurable Policies".
 * - Provides the logic for parsing existing XML into active UI state.
 * - Handles the 'Compilation' step that turns Visual state back into valid APIM XML.
 * 
 * 🧩 DATA STRUCTURES:
 * - `ConfiguredPolicy`: The runtime instance of a policy in the visual editor.
 * - `POLICY_TEMPLATES`: Registry of all available policy types (Rate Limit, CORS, etc.).
 * ------------------------------------------------------------------
 */
export interface PolicyInput {
    name: string;
    label: string;
    type: 'text' | 'number' | 'boolean' | 'select' | 'textarea'; // Added textarea
    options?: (string | { label: string; value: string })[]; // Support objects
    default?: string;
    placeholder?: string;
    helperText?: string;
    required?: boolean;
}

export interface PolicyTemplate {
    id: string;
    name: string;
    category: 'Traffic' | 'Transformation' | 'Security' | 'Mocking' | 'Restriction'; // Added Restriction
    intent: string;
    description: string;
    inputs: PolicyInput[];
    xmlTemplate: string;
    defaultSection: 'inbound' | 'backend' | 'outbound' | 'on-error'; // Smart Default
    tagName?: string; // Optional: Override tag name for parsing
}


// Removed static import
// import policyRegistry from '../../../shared/features/policy/policies-registry.json';

// DEPRECATED: Do not use. Use useStore().policyTemplates instead.
export const POLICY_TEMPLATES: PolicyTemplate[] = [];

// Helper to generate XML from config values
export const generatePolicyXml = (template: PolicyTemplate, config: Record<string, unknown>): string => {
    // Special handling for Custom XML (Direct Pass-through)
    if (template.id === 'custom-xml') {
        return (config['xml'] as string) || '';
    }

    let xml = template.xmlTemplate;
    template.inputs.forEach(input => {
        const val = config[input.name] !== undefined ? (config[input.name] as string) : (input.default || '');
        xml = xml.replace(new RegExp(`{{${input.name}}}`, 'g'), val);
    });
    return xml;
};

// Interface for ConfiguredPolicy (Needs to match OnboardingApiPolicyStep)
export interface ConfiguredPolicy {
    id: string;
    templateId: string;
    section: 'inbound' | 'backend' | 'outbound' | 'on-error';
    values: Record<string, unknown>;
}

// ------------------------------------------------------------------
// REVERSE PARSER: DOM Strategy (Hybrid)
// ------------------------------------------------------------------

/**
 * Sanitizes APIM XML by escaping double quotes, ampersands, and angle brackets INSIDE C# expressions.
 * Implements a simple State Machine to track C# context boundaries correctly.
 * Performance: O(N) linear scan. Safe for client-side execution on typical policy sizes.
 */
const sanitizeApimXml = (xml: string): string => {
    if (!xml) return xml;

    let output = '';
    let mode: 'XML' | 'CS_BRACE' | 'CS_PAREN' = 'XML';
    let depth = 0;
    let inString = false; // Track if we are inside a C# string "..." to ignore brace matching

    for (let i = 0; i < xml.length; i++) {
        const char = xml[i];
        const nextChar = xml[i + 1] || '';

        // Check for transition TO C# Mode
        if (mode === 'XML') {
            if (char === '@' && nextChar === '{') {
                mode = 'CS_BRACE';
                depth = 1;
                output += char + nextChar;
                i++; // Skip next
                continue;
            } else if (char === '@' && nextChar === '(') {
                mode = 'CS_PAREN';
                depth = 1;
                output += char + nextChar;
                i++; // Skip next
                continue;
            }
            // Just XML char
            output += char;
            continue;
        }

        // --- Inside C# Context ---

        // Handle String toggling (to ignore braces inside strings)
        if (char === '"') {
            // Check for escaped quote? (Simplification: assuming mostly standard strings)
            // In XML attribute, " is the delimiter. In C#, " starts string.
            // We MUST escape it to &quot; so XML parser doesn't end attribute.
            output += '&quot;';
            inString = !inString; // Toggle string state
            continue;
        }

        // If inside a string, we ignore structural braces, but we MUST still escape XML entities
        if (inString) {
            if (char === '&') output += '&amp;';
            else if (char === '<') output += '&lt;';
            else output += char;
            continue;
        }

        // Structural Handling (Not in string)
        if (mode === 'CS_BRACE') {
            if (char === '{') {
                depth++;
                output += char;
            } else if (char === '}') {
                depth--;
                output += char;
                if (depth === 0) mode = 'XML';
            } else if (char === '&') {
                output += '&amp;';
            } else if (char === '<') {
                output += '&lt;';
            } else {
                output += char;
            }
        } else if (mode === 'CS_PAREN') {
            if (char === '(') {
                depth++;
                output += char;
            } else if (char === ')') {
                depth--;
                output += char;
                if (depth === 0) mode = 'XML';
            } else if (char === '&') {
                output += '&amp;';
            } else if (char === '<') {
                output += '&lt;';
            } else {
                output += char;
            }
        }
    }

    return output;
};

export const parsePolicyXml = (xmlString: string, templates: PolicyTemplate[]): ConfiguredPolicy[] => {
    const policies: ConfiguredPolicy[] = [];
    if (!xmlString) return policies;

    try {
        const parser = new DOMParser();
        // pre-process to save quotes
        const safeXml = sanitizeApimXml(xmlString);
        const doc = parser.parseFromString(safeXml, "application/xml");

        // CRITICAL: Check for Parse Errors (complex C# expressions often break DOMParser)
        const possibleError = doc.getElementsByTagName("parsererror");
        if (possibleError.length > 0) {
            console.warn("Complex/Invalid XML detected, falling back to Raw Custom Policy.");
            throw new Error("Complex XML");
        }

        const sections = ['inbound', 'backend', 'outbound', 'on-error'];

        sections.forEach(secName => {
            // Cast to strictly typed section name
            const sectionName = secName as 'inbound' | 'backend' | 'outbound' | 'on-error';
            const sectionNode = doc.getElementsByTagName(sectionName)[0];
            if (!sectionNode) return;

            let customXmlBuffer: string[] = [];

            const flushBuffer = () => {
                if (customXmlBuffer.length > 0) {
                    const raw = customXmlBuffer.join('\n').trim();
                    if (raw) {
                        policies.push({
                            id: crypto.randomUUID(),
                            templateId: 'custom-xml',
                            section: sectionName,
                            values: { xml: raw }
                        });
                    }
                    customXmlBuffer = [];
                }
            };

            Array.from(sectionNode.children).forEach((node) => {
                const element = node as Element;
                const tagName = element.tagName;
                const outerXml = element.outerHTML;

                // Ignore base, it's implicit in our generator
                if (tagName === 'base') return;

                // GENERIC MATCHING: Look for a template with matching tagName or ID
                const template = templates.find(t => (t.tagName || t.id) === tagName);

                if (template) {
                    flushBuffer();
                    const values: Record<string, unknown> = {};

                    template.inputs.forEach(input => {
                        // Priority 1: Attribute
                        const attrVal = element.getAttribute(input.name);
                        if (attrVal !== null) {
                            values[input.name] = attrVal;
                            return;
                        }

                        // Priority 2: Named Nested Element (e.g. <value>)
                        const nested = element.getElementsByTagName(input.name)[0];
                        if (nested) {
                            values[input.name] = nested.textContent || '';
                            return;
                        }

                        // Priority 3: Text Content (for set-body)
                        if (input.type === 'textarea' && !element.children.length) {
                            values[input.name] = element.textContent || '';
                        }
                    });

                    // Special Cases (Post-processing for non-standard mappings)
                    if (template.id === 'quota') {
                        // quota uses renewal-period attribute but input name is period (historical)
                        const period = element.getAttribute('renewal-period');
                        if (period) values['period'] = period;
                    }
                    if (template.id === 'cors') {
                        values['origins'] = element.getElementsByTagName('origin')[0]?.textContent || '*';
                        values['methods'] = element.getElementsByTagName('method')[0]?.textContent || 'GET, POST';
                    }
                    if (template.id === 'validate-jwt') {
                        values['header'] = element.getAttribute('header-name') || 'Authorization';
                        values['issuer'] = element.getElementsByTagName('openid-config')[0]?.getAttribute('url')?.replace('/.well-known/openid-configuration', '') || '';
                        values['audience'] = element.getElementsByTagName('value')[0]?.textContent || '';
                    }

                    policies.push({
                        id: crypto.randomUUID(),
                        templateId: template.id,
                        section: sectionName,
                        values
                    });
                } else {
                    // Unrecognized -> Buffer
                    customXmlBuffer.push(outerXml);
                }
            });

            // Final flush for the section
            flushBuffer();
        });

    } catch (e) {
        console.error("Failed to parse XML", e);
        // Fallback: Dump everything into inbound as custom xml if parsing fails significantly
        policies.push({
            id: crypto.randomUUID(),
            templateId: 'custom-xml',
            section: 'inbound',
            values: { xml: xmlString }
        });
    }

    return policies;
};
