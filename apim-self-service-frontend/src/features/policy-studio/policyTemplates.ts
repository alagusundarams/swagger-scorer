/**
 * Policy Templates for Visual Builder
 * 
 * Common APIM policy templates with configurable fields
 */

export interface PolicyTemplate {
    id: string;
    name: string;
    description: string;
    category: 'security' | 'transformation' | 'traffic' | 'backend';
    section: 'inbound' | 'backend' | 'outbound' | 'on-error';
    fields: PolicyField[];
    generateXml: (values: Record<string, any>) => string;
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

export const policyTemplates: PolicyTemplate[] = [
    // CORS Policy
    {
        id: 'cors',
        name: 'CORS',
        description: 'Enable Cross-Origin Resource Sharing',
        category: 'security',
        section: 'inbound',
        fields: [
            {
                name: 'allowedOrigins',
                label: 'Allowed Origins',
                type: 'array',
                required: true,
                placeholder: 'https://app.company.com',
                defaultValue: ['*']
            },
            {
                name: 'allowedMethods',
                label: 'Allowed Methods',
                type: 'select',
                options: [
                    { value: 'GET,POST,PUT,DELETE', label: 'All (GET, POST, PUT, DELETE)' },
                    { value: 'GET,POST', label: 'GET, POST' },
                    { value: 'GET', label: 'GET only' }
                ],
                defaultValue: 'GET,POST,PUT,DELETE'
            }
        ],
        generateXml: (values) => {
            const origins = values.allowedOrigins.join(',');
            return `<cors>
    <allowed-origins>
        <origin>${origins}</origin>
    </allowed-origins>
    <allowed-methods>
        <method>${values.allowedMethods.split(',').join('</method>\n        <method>')}</method>
    </allowed-methods>
</cors>`;
        }
    },

    // Rate Limiting
    {
        id: 'rate-limit',
        name: 'Rate Limiting',
        description: 'Limit API call rate',
        category: 'traffic',
        section: 'inbound',
        fields: [
            {
                name: 'calls',
                label: 'Max Calls',
                type: 'number',
                required: true,
                defaultValue: 100
            },
            {
                name: 'renewalPeriod',
                label: 'Period (seconds)',
                type: 'number',
                required: true,
                defaultValue: 60
            }
        ],
        generateXml: (values) => {
            return `<rate-limit calls="${values.calls}" renewal-period="${values.renewalPeriod}" />`;
        }
    },

    // Set Header
    {
        id: 'set-header',
        name: 'Set Header',
        description: 'Add or modify HTTP header',
        category: 'transformation',
        section: 'inbound',
        fields: [
            {
                name: 'headerName',
                label: 'Header Name',
                type: 'text',
                required: true,
                placeholder: 'X-Custom-Header'
            },
            {
                name: 'headerValue',
                label: 'Header Value',
                type: 'text',
                required: true,
                placeholder: 'custom-value'
            },
            {
                name: 'action',
                label: 'Action',
                type: 'select',
                options: [
                    { value: 'override', label: 'Override (replace if exists)' },
                    { value: 'skip', label: 'Skip (add only if not exists)' },
                    { value: 'append', label: 'Append (add to existing)' },
                    { value: 'delete', label: 'Delete' }
                ],
                defaultValue: 'override'
            }
        ],
        generateXml: (values) => {
            if (values.action === 'delete') {
                return `<set-header name="${values.headerName}" exists-action="delete" />`;
            }
            return `<set-header name="${values.headerName}" exists-action="${values.action}">
    <value>${values.headerValue}</value>
</set-header>`;
        }
    },

    // JWT Validation
    {
        id: 'jwt-validation',
        name: 'Validate JWT',
        description: 'Validate JWT token',
        category: 'security',
        section: 'inbound',
        fields: [
            {
                name: 'headerName',
                label: 'Header Name',
                type: 'text',
                defaultValue: 'Authorization',
                required: true
            },
            {
                name: 'requiredClaims',
                label: 'Required Claims (comma-separated)',
                type: 'text',
                placeholder: 'iss,sub,aud,exp',
                defaultValue: 'iss,sub,aud,exp'
            }
        ],
        generateXml: (values) => {
            const claims = values.requiredClaims.split(',').map((c: string) => c.trim());
            return `<validate-jwt header-name="${values.headerName}">
    <required-claims>
        ${claims.map((c: string) => `<claim name="${c}" />`).join('\n        ')}
    </required-claims>
</validate-jwt>`;
        }
    },

    // Backend Routing
    {
        id: 'set-backend',
        name: 'Set Backend Service',
        description: 'Route to backend URL',
        category: 'backend',
        section: 'backend',
        fields: [
            {
                name: 'backendUrl',
                label: 'Backend URL',
                type: 'text',
                required: true,
                placeholder: 'https://backend.company.com'
            }
        ],
        generateXml: (values) => {
            return `<set-backend-service base-url="${values.backendUrl}" />`;
        }
    }
];

export function getPolicyTemplate(id: string): PolicyTemplate | undefined {
    return policyTemplates.find(t => t.id === id);
}

export function getTemplatesBySection(section: string): PolicyTemplate[] {
    return policyTemplates.filter(t => t.section === section);
}
