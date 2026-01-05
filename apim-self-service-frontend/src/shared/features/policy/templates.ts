
import { type PolicyTemplate, type PolicyStep } from './types';

// REMOVED: import policyRegistry from './policies-registry.json';
// REMOVED: export const POLICY_TEMPLATES: PolicyTemplate[] = policyRegistry as any[];

/**
 * 🛠 XML Generation Engine (Fixed)
 * ------------------------------------------------------------------
 * This centralizes the logic for turning JSON state into APIM XML.
 * It removes previous bugs where spaces were added inside tags.
 */
export const generatePolicyXml = (template: PolicyTemplate, values: Record<string, any>): string => {
    if (template.id === 'custom-xml') {
        return (values['xml'] as string) || '';
    }

    // Special handling for Validate JWT
    if (template.id === 'validate-jwt') {
        let xml = template.xmlTemplate;

        // 1. Replace simple fields
        xml = xml.replace('{{header}}', (values['header'] as string) || 'Authorization');
        xml = xml.replace('{{issuer}}', (values['issuer'] as string) || '');

        // 2. Build Claims Block
        const claims: string[] = [];

        // Helper to add multi-value claim
        const addClaim = (name: string, csv: string) => {
            if (!csv) return;
            const items = csv.split(',').map(s => s.trim()).filter(Boolean);
            if (items.length === 0) return;

            const valuesXml = items.map(v => `      <value>${v}</value>`).join('\n');
            claims.push(`    <claim name="${name}" match="any">\n${valuesXml}\n    </claim>`);
        };

        addClaim('aud', values['audiences']);
        addClaim('azp', values['azp']);
        addClaim('roles', values['roles']);

        xml = xml.replace('{{claims_block}}', claims.join('\n'));
        return xml;
    }

    // Special handling for CORS
    if (template.id === 'cors') {
        let xml = template.xmlTemplate;

        // 1. Simple fields
        xml = xml.replace('{{allowcredentials}}', (values['allowcredentials'] ? 'true' : 'false'));

        // 2. Helper for multi-value blocks
        const buildBlock = (csv: string, tag: string) => {
            if (!csv) return '';
            return csv.split(',')
                .map(s => s.trim())
                .filter(Boolean)
                .map(v => `    <${tag}>${v}</${tag}>`)
                .join('\n');
        };

        const origins = buildBlock(values['origins'], 'origin');
        const methods = buildBlock(values['methods'], 'method');
        const headers = buildBlock(values['allowheaders'], 'header');
        const exposeHeaders = buildBlock(values['exposeheaders'], 'header');

        xml = xml.replace('{{origins_block}}', origins);
        xml = xml.replace('{{methods_block}}', methods);
        xml = xml.replace('{{headers_block}}', headers);
        xml = xml.replace('{{expose_headers_block}}', exposeHeaders);

        return xml;
    }

    // Special handling for optional attributes (Rate Limit / Quota)
    // To avoid empty attributes like bandwidth="" we clean them up if missing
    if (template.id === 'rate-limit' || template.id === 'quota') {
        // This re-uses generic logic but pre-cleans the values? 
        // Actually simpler to just let generic run then clean up empty attrs using regex in post-processing?
        // No, let's do customized generic logic:
        let xml = template.xmlTemplate;
        template.inputs.forEach(input => {
            const val = values[input.name] !== undefined ? String(values[input.name]).trim() : '';
            if (!val && !input.required) {
                // Remove the attribute entirely if empty and not required
                // Regex: attribute-name="{{placeholder}}"
                // We need to know the attribute name in XML. 
                // Simple hack: replace attribute="" with nothing.
                xml = xml.replace(new RegExp(`{{${input.name}}}`, 'g'), '');
            } else {
                xml = xml.replace(new RegExp(`{{${input.name}}}`, 'g'), val || String(input.default || ''));
            }
        });

        // Cleanup empty attributes [foo=""]
        xml = xml.replace(/\s+[a-zA-Z0-9-GU]+=""/g, '');
        return xml;
    }

    let xml = template.xmlTemplate;

    // Replace placeholders with real values (Generic Fallback)
    template.inputs.forEach(input => {
        const val = values[input.name] !== undefined
            ? String(values[input.name]).trim()
            : String(input.default || '').trim();

        xml = xml.replace(new RegExp(`{{${input.name}}}`, 'g'), val);
    });

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
                        template.inputs.forEach(input => {
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
