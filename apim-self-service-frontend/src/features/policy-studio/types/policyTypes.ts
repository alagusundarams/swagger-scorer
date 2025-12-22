export type PolicyScope = 'global' | 'product' | 'api' | 'operation';

export type PolicySection = 'inbound' | 'backend' | 'outbound' | 'on-error';

export type PolicyStepType =
    | 'base' // <base />
    | 'set-header'
    | 'rate-limit'
    | 'validate-jwt'
    | 'ip-filter'
    | 'cors'
    | 'mock-response'
    | 'set-variable'
    | 'fragment' // <include-fragment />
    | 'fragment' // <include-fragment />
    | 'custom-xml'; // The "Escape Hatch" for complex C#/Advanced logic

export interface PolicyStep {
    id: string;
    type: PolicyStepType;
    displayName: string;
    description?: string;
    scope: PolicyScope;
    isLocked: boolean;
    xmlSnippet?: string; // For standard blocks
    customXmlContent?: string; // For 'custom-xml' type: The raw, editable content
    properties: Record<string, any>;
}

export interface PolicyFlow {
    inbound: PolicyStep[];
    backend: PolicyStep[];
    outbound: PolicyStep[];
    onError: PolicyStep[];
}

export interface PolicyFragment {
    id: string;
    name: string;
    description: string;
    steps: PolicyStep[];
}
