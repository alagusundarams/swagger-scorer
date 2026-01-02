
export type PolicySection = 'inbound' | 'backend' | 'outbound' | 'on-error';

export interface PolicyStep {
    id: string;
    templateId: string;
    section: PolicySection;
    values: Record<string, any>;
    isLocked?: boolean;
    displayName?: string;
    description?: string;
    scope?: 'global' | 'product' | 'api' | 'operation';
}

export interface PolicyFlow {
    inbound: PolicyStep[];
    backend: PolicyStep[];
    outbound: PolicyStep[];
    onError: PolicyStep[];
}

export interface PolicyInput {
    name: string;
    label: string;
    type: 'text' | 'number' | 'boolean' | 'select' | 'textarea' | 'array';
    options?: { value: string; label: string }[] | string[];
    default?: any;
    placeholder?: string;
    helperText?: string;
    required?: boolean;
}

export interface PolicyTemplate {
    id: string;
    name: string;
    category: string;
    description: string;
    inputs: PolicyInput[];
    xmlTemplate: string;
    defaultSection: PolicySection;
    tagName?: string;
}
