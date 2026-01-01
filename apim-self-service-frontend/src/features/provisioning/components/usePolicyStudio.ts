/**
 * ------------------------------------------------------------------
 * 📍 Custom Hook: usePolicyStudio
 * ------------------------------------------------------------------
 * 🔄 RESPONSIBILITY:
 * - Orchestrates the complex bi-directional state of the Policy Studio.
 * - Manages the lifecycle of PolicyState (JSON) <-> XML syncing.
 * - Handles the 'Hybrid' mode transitions between Visual and XML views.
 * 
 * 📥 INPUTS:
 * - `specContent`: The raw OpenAPI spec to parse for operations.
 * - `initialApiPolicies`: Hydration data for operation-level policies.
 * - `productPolicyXml`: Hydration data for the product-level baseline.
 * 
 * 📤 ACTIONS:
 * - `handleToggleMode`: Switches between Visual/XML mode for a specific scope.
 * - `handleUpdatePolicyValue`: Mutations in the Visual editor reflect in the XML state.
 * - `handleStepNext`: Consolidates all volatile state for the parent wizard.
 * ------------------------------------------------------------------
 */
import { useState, useEffect, useMemo } from 'react';
import jsyaml from 'js-yaml';
import { ApiOperation, parseSwaggerOperations } from '../../../utils/swaggerParser';
import { POLICY_TEMPLATES, PolicyTemplate, generatePolicyXml, parsePolicyXml, ConfiguredPolicy } from './policyTemplates';

export interface OperationPolicyState {
    enabled: boolean;
    mode: 'simple' | 'xml';
    activePolicies: ConfiguredPolicy[];
    xmlContent?: string;
    isOverridden: boolean;
}

export interface UsePolicyStudioProps {
    specContent?: string;
    preParsedOperations?: ApiOperation[];
    productPolicyXml?: string;
    initialApiPolicies?: Record<string, string>;
    onNext: (policies: Record<string, string>, productPolicyXml: string) => void;
}

export function usePolicyStudio({
    specContent,
    preParsedOperations,
    productPolicyXml,
    initialApiPolicies,
    onNext
}: UsePolicyStudioProps) {
    const [operations, setOperations] = useState<ApiOperation[]>([]);
    const [selectedOpId, setSelectedOpId] = useState<string | null>(null);
    const [scanned, setScanned] = useState(false);
    const [xmlError, setXmlError] = useState<string | null>(null);
    const [policies, setPolicies] = useState<Record<string, OperationPolicyState>>({});

    const isProductScope = selectedOpId === 'product';
    const targetScopeId = isProductScope ? 'product' : selectedOpId;

    const currentOp = useMemo(() =>
        operations.find(o => o.id === selectedOpId),
        [operations, selectedOpId]);

    const currentPolicy = useMemo(() =>
        targetScopeId ? (policies[targetScopeId] || { enabled: true, mode: 'simple', activePolicies: [], isOverridden: false }) : null,
        [targetScopeId, policies]);

    const activePolicies = useMemo(() => currentPolicy?.activePolicies || [], [currentPolicy]);

    // 1. Loader Effect
    useEffect(() => {
        const loadOps = async () => {
            const globalOp: ApiOperation = {
                id: 'global',
                method: 'API',
                path: 'All Operations',
                summary: 'Apply policies to all operations in this API'
            };

            let ops: ApiOperation[] = [];
            if (preParsedOperations && preParsedOperations.length > 0) {
                ops = preParsedOperations;
            } else if (specContent) {
                ops = await parseSwaggerOperations(specContent);
            }

            setOperations([globalOp, ...ops]);
            const opMap: Record<string, OperationPolicyState> = {};

            if (initialApiPolicies) {
                Object.entries(initialApiPolicies).forEach(([id, xml]) => {
                    opMap[id] = {
                        enabled: true,
                        mode: 'xml',
                        activePolicies: parsePolicyXml(xml),
                        xmlContent: xml,
                        isOverridden: true
                    };
                });
            }

            if (!opMap['product']) {
                opMap['product'] = {
                    enabled: true,
                    mode: 'simple',
                    activePolicies: productPolicyXml ? parsePolicyXml(productPolicyXml) : [],
                    xmlContent: productPolicyXml || '',
                    isOverridden: !!productPolicyXml
                };
            }

            try {
                const spec = jsyaml.load(specContent || '') as { paths?: Record<string, Record<string, unknown>> };
                if (spec?.paths) {
                    Object.entries(spec.paths).forEach(([path, methods]) => {
                        Object.keys(methods).forEach((method) => {
                            const opId = `${method.toUpperCase()} ${path} `;
                            if (!opMap[opId]) {
                                opMap[opId] = { enabled: false, mode: 'simple', activePolicies: [], isOverridden: false };
                            }
                        });
                    });
                }
            } catch { /* silent fail on spec parsing */ }

            setPolicies(opMap);
            setSelectedOpId('product');
            setScanned(true);
        };
        loadOps();
    }, [specContent, preParsedOperations, productPolicyXml, initialApiPolicies]);

    // 2. XML Auto-Sync Effect
    useEffect(() => {
        if (!targetScopeId || !currentPolicy || currentPolicy.mode === 'xml') return;
        if (!currentPolicy.isOverridden) return;

        let xml = '<policies>\n';
        const sections = ['inbound', 'backend', 'outbound', 'on-error'] as const;

        sections.forEach(section => {
            xml += `  < ${section}>\n < base />\n`;
            const sectionPolicies = activePolicies.filter(p => p.section === section);
            sectionPolicies.forEach(p => {
                const match = POLICY_TEMPLATES.find(t => t.id === p.templateId);
                if (match) {
                    const fragment = generatePolicyXml(match, p.values || {});
                    xml += `    ${fragment.replace(/\n/g, '\n    ')} \n`;
                }
            });
            xml += `  </${section}>\n`;
        });
        xml += '</policies>';

        if (currentPolicy.xmlContent !== xml) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPolicies(prev => ({
                ...prev,
                [targetScopeId]: { ...prev[targetScopeId], xmlContent: xml }
            }));
        }
    }, [activePolicies, targetScopeId, currentPolicy]);

    // 3. Handlers
    const handleAddPolicy = (template: PolicyTemplate) => {
        if (!targetScopeId) return;
        setPolicies(prev => ({
            ...prev,
            [targetScopeId]: {
                ...(prev[targetScopeId] || { enabled: true, mode: 'simple', activePolicies: [], isOverridden: true }),
                isOverridden: true,
                activePolicies: [
                    ...(prev[targetScopeId]?.activePolicies || []),
                    { id: crypto.randomUUID(), templateId: template.id, section: template.defaultSection || 'inbound', values: {} }
                ]
            }
        }));
    };

    const handleUpdatePolicyValue = (id: string, newValues: Record<string, unknown>) => {
        if (!targetScopeId) return;
        setPolicies(prev => ({
            ...prev,
            [targetScopeId]: {
                ...prev[targetScopeId],
                isOverridden: true,
                activePolicies: prev[targetScopeId].activePolicies.map(pol =>
                    pol.id === id ? { ...pol, values: { ...pol.values, ...newValues } } : pol
                )
            }
        }));
    };

    const handleRemovePolicy = (id: string) => {
        if (!targetScopeId) return;
        setPolicies(prev => ({
            ...prev,
            [targetScopeId]: {
                ...prev[targetScopeId],
                isOverridden: true,
                activePolicies: prev[targetScopeId].activePolicies.filter(pol => pol.id !== id)
            }
        }));
    };

    const handleSectionChange = (policyId: string, newSection: 'inbound' | 'backend' | 'outbound' | 'on-error') => {
        if (!targetScopeId) return;
        setPolicies(prev => ({
            ...prev,
            [targetScopeId]: {
                ...prev[targetScopeId],
                isOverridden: true,
                activePolicies: prev[targetScopeId].activePolicies.map(pol =>
                    pol.id === policyId ? { ...pol, section: newSection } : pol
                )
            }
        }));
    };

    const handleToggleMode = () => {
        if (!targetScopeId) return;

        setPolicies(prev => {
            const current = prev[targetScopeId];
            if (!current) return prev;

            const newMode = current.mode === 'xml' ? 'simple' : 'xml';
            let updatedPolicies = current.activePolicies;

            if (newMode === 'simple' && current.mode === 'xml' && current.xmlContent) {
                try {
                    updatedPolicies = parsePolicyXml(current.xmlContent);
                } catch {
                    alert("Failed to parse XML for Visual Mode.");
                    return prev;
                }
            }

            return {
                ...prev,
                [targetScopeId]: {
                    ...current,
                    mode: newMode,
                    activePolicies: updatedPolicies
                }
            };
        });
    };

    const handleXmlChange = (newXml: string | undefined) => {
        if (!targetScopeId || newXml === undefined) return;

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(newXml, "application/xml");
            const parseError = doc.getElementsByTagName("parsererror");
            if (parseError.length > 0) {
                setXmlError("Invalid XML Syntax");
            } else {
                setXmlError(doc.documentElement.tagName !== 'policies' ? "Root element must be <policies>" : null);
            }
        } catch {
            setXmlError("XML Parsing Error");
        }

        setPolicies(prev => ({
            ...prev,
            [targetScopeId]: { ...prev[targetScopeId], xmlContent: newXml, isOverridden: true }
        }));
    };

    const handleStepNext = () => {
        const xmlMap: Record<string, string> = {};
        Object.entries(policies).forEach(([id, state]) => {
            if (state.xmlContent) xmlMap[id] = state.xmlContent;
        });
        onNext(xmlMap, policies['product']?.xmlContent || '');
    };

    return {
        operations,
        selectedOpId,
        setSelectedOpId,
        scanned,
        xmlError,
        policies,
        isProductScope,
        currentOp,
        currentPolicy,
        activePolicies,
        handleAddPolicy,
        handleUpdatePolicyValue,
        handleRemovePolicy,
        handleSectionChange,
        handleToggleMode,
        handleXmlChange,
        handleStepNext
    };
}
