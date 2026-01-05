
import { type PolicyTemplate, type PolicyStep } from './types';

// Helper to safely get XML definition
const getXml = (t: PolicyTemplate): string => {
    return t.templateSchema?.xmlTemplate || t.xmlTemplate || '';
};

// Helper to safely get Inputs definition
const getInputs = (t: PolicyTemplate) => {
    return t.templateSchema?.fields || t.inputs || [];
};

// REMOVED: import policyRegistry from './policies-registry.json';
// REMOVED: export const POLICY_TEMPLATES: PolicyTemplate[] = policyRegistry as any[];

/**
 * 🛠 XML Generation Engine (Fixed)
 * ------------------------------------------------------------------
 * This centralizes the logic for turning JSON state into APIM XML.
 * It removes previous bugs where spaces were added inside tags.
 */
// Helper to generate XML from config values (Generic Handlebars-lite)
export const generatePolicyXml = (template: PolicyTemplate, config: Record<string, unknown>): string => {
    // Special handling for Custom XML (Direct Pass-through)
    if (template.id === 'custom-xml') {
        return (config['xml'] as string) || '';
    }

    let xml = getXml(template);
    const fields = getInputs(template);

    // 1. Handle {{#each ...}} blocks
    // Pattern: {{#each fieldName}}...{{this}}...{{/each}}
    const eachRegex = /\{\{#each\s+([a-zA-Z0-9_]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
    xml = xml.replace(eachRegex, (_, fieldName, innerTemplate) => {
        let value = config[fieldName];

        // Handle comma-separated strings as arrays (Common in our UI)
        if (typeof value === 'string' && (value.includes(',') || fields.find(f => f.name === fieldName)?.type === 'array')) {
            const parts = value.split(',').map(v => v.trim()).filter(Boolean);
            return parts.map(p => innerTemplate.replace(/\{\{this\}\}/g, p)).join('\n        ');
        }

        if (Array.isArray(value)) {
            return value.map(item => innerTemplate.replace(/\{\{this\}\}/g, String(item).trim())).join('\n        ');
        }

        return '';
    });

    // 2. Replace regular {{fieldName}} with values
    fields.forEach(input => {
        const val = config[input.name] !== undefined ? config[input.name] : (input.default || '');
        const placeholder = `{{${input.name}}}`;

        // Handle Arrays in simple placeholders (join with comma)
        if (Array.isArray(val)) {
            xml = xml.replace(new RegExp(placeholder, 'g'), val.join(', '));
        } else {
            xml = xml.replace(new RegExp(placeholder, 'g'), String(val).trim());
        }
    });

    // 3. Clean up unhandled conditionals (e.g. {{#if ...}})
    // Simple stripping for cleaner output if logic isn't processed
    xml = xml.replace(/\{\{#if.*?\}\}([\s\S]*?)\{\{\/if\}\}/g, '$1');

    return xml;
};

/**
 * Compiles a full flow into a <policies> block
 */
export const generateFullPolicyXml = (inbound: PolicyStep[], backend: PolicyStep[], outbound: PolicyStep[], onError: PolicyStep[], templates: PolicyTemplate[]): string => {
    const renderSection = (steps: PolicyStep[]) => {
        // Start with base policy as standard
        let sectionXml = '    <base />\n';

        steps.forEach(step => {
            const template = templates.find(t => t.id === step.templateId);
            if (template) {
                const fragment = generatePolicyXml(template, step.values);
                // Proper indentation for each line
                const indentedFragment = fragment.split('\n').map(line => `    ${line}`).join('\n');
                sectionXml += `${indentedFragment}\n`;
            }
        });
        return sectionXml;
    };

    return `<policies>
  <inbound>
${renderSection(inbound)}  </inbound>
  <backend>
${renderSection(backend)}  </backend>
  <outbound>
${renderSection(outbound)}  </outbound>
  <on-error>
${renderSection(onError)}  </on-error>
</policies>`;
};

// --- REVERSE PARSER (Moved from policyTemplates.ts) ---

const sanitizeApimXml = (xml: string): string => {
    if (!xml) return xml;
    let output = '';
    let mode: 'XML' | 'CS_BRACE' | 'CS_PAREN' = 'XML';
    let depth = 0;
    let inString = false;
    for (let i = 0; i < xml.length; i++) {
        const char = xml[i];
        const nextChar = xml[i + 1] || '';
        if (mode === 'XML') {
            if (char === '@' && nextChar === '{') {
                mode = 'CS_BRACE'; depth = 1; output += char + nextChar; i++; continue;
            } else if (char === '@' && nextChar === '(') {
                mode = 'CS_PAREN'; depth = 1; output += char + nextChar; i++; continue;
            }
            output += char; continue;
        }
        if (char === '"') { output += '&quot;'; inString = !inString; continue; }
        if (inString) {
            if (char === '&') output += '&amp;';
            else if (char === '<') output += '&lt;';
            else output += char;
            continue;
        }
        if (mode === 'CS_BRACE') {
            if (char === '{') { depth++; output += char; }
            else if (char === '}') { depth--; output += char; if (depth === 0) mode = 'XML'; }
            else if (char === '&') output += '&amp;';
            else if (char === '<') output += '&lt;';
            else output += char;
        } else if (mode === 'CS_PAREN') {
            if (char === '(') { depth++; output += char; }
            else if (char === ')') { depth--; output += char; if (depth === 0) mode = 'XML'; }
            else if (char === '&') output += '&amp;';
            else if (char === '<') output += '&lt;';
            else output += char;
        }
    }
    return output;
};

export const parsePolicyXml = (xmlString: string, templates: PolicyTemplate[]): PolicyStep[] => {
    const steps: PolicyStep[] = [];
    if (!xmlString) return steps;
    try {
        const parser = new DOMParser();
        const safeXml = sanitizeApimXml(xmlString);
        const doc = parser.parseFromString(safeXml, "application/xml");
        const possibleError = doc.getElementsByTagName("parsererror");
        if (possibleError.length > 0) throw new Error("Complex XML");

        const sections = ['inbound', 'backend', 'outbound', 'on-error'] as const;
        sections.forEach(sectionName => {
            const sectionNode = doc.getElementsByTagName(sectionName)[0];
            if (!sectionNode) return;

            Array.from(sectionNode.children).forEach((node) => {
                const element = node as Element;
                const tagName = element.tagName;
                if (tagName === 'base') return;

                const template = templates.find(t => (t.tagName || t.id) === tagName);
                if (template) {
                    const values: Record<string, any> = {};

                    if (template.id === 'validate-jwt') {
                        // Custom Parser for Validate JWT
                        values['header'] = element.getAttribute('header-name') || 'Authorization';

                        const openIdConfig = element.getElementsByTagName('openid-config')[0];
                        values['issuer'] = openIdConfig?.getAttribute('url') || '';

                        const requiredClaims = element.getElementsByTagName('required-claims')[0];
                        if (requiredClaims) {
                            const claims = Array.from(requiredClaims.getElementsByTagName('claim'));
                            const getClaimValues = (name: string) => {
                                const claim = claims.find(c => c.getAttribute('name') === name);
                                if (!claim) return '';
                                const valNodes = claim.getElementsByTagName('value');
                                return Array.from(valNodes).map(v => v.textContent).join(', ');
                            };

                            values['audiences'] = getClaimValues('aud');
                            values['azp'] = getClaimValues('azp');
                            values['roles'] = getClaimValues('roles');
                        }
                    } else if (template.id === 'cors') {
                        // Custom Parser for CORS
                        values['allowcredentials'] = element.getAttribute('allow-credentials') === 'true';

                        const getList = (parentTag: string, childTag: string) => {
                            const parent = element.getElementsByTagName(parentTag)[0];
                            if (!parent) return '';
                            return Array.from(parent.getElementsByTagName(childTag))
                                .map(el => el.textContent)
                                .join(', ');
                        };

                        values['origins'] = getList('allowed-origins', 'origin');
                        values['methods'] = getList('allowed-methods', 'method');
                        values['allowheaders'] = getList('allowed-headers', 'header');
                        values['exposeheaders'] = getList('expose-headers', 'header');

                    } else {
                        // Generic Parser
                        getInputs(template).forEach(input => {
                            const attrVal = element.getAttribute(input.name);
                            if (attrVal !== null) { values[input.name] = attrVal; return; }
                            const nested = element.getElementsByTagName(input.name)[0];
                            if (nested) { values[input.name] = nested.textContent || ''; return; }
                            if (input.type === 'textarea' && !element.children.length) {
                                values[input.name] = element.textContent || '';
                            }
                        });
                    }

                    steps.push({
                        id: crypto.randomUUID(),
                        templateId: template.id,
                        section: sectionName,
                        values
                    });
                } else {
                    steps.push({
                        id: crypto.randomUUID(),
                        templateId: 'custom-xml',
                        section: sectionName,
                        values: { xml: element.outerHTML }
                    });
                }
            });
        });
    } catch (e) {
        console.error("Failed to parse XML", e);
        steps.push({
            id: crypto.randomUUID(),
            templateId: 'custom-xml',
            section: 'inbound',
            values: { xml: xmlString }
        });
    }
    return steps;
};
