
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import jsyaml from 'js-yaml';
import { ApiOperation, parseSwaggerOperations } from '../../../utils/swaggerParser';
import { type PolicyStep, type PolicySection } from './types';
import { parsePolicyXml, generateFullPolicyXml } from './templates';

export interface OperationPolicyState {
    enabled: boolean;
    mode: 'simple' | 'xml';
    steps: PolicyStep[];
    xmlContent?: string;
    isOverridden: boolean;
}

export interface UsePolicyStudioProps {
    specContent?: string;
    preParsedOperations?: ApiOperation[];
    productPolicyXml?: string;
    initialApiPolicies?: Record<string, string>;
    onSync?: (xml: string) => void;
}

export function usePolicyStudio({
    specContent,
    preParsedOperations,
    productPolicyXml,
    initialApiPolicies,
    onSync
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
        targetScopeId ? (policies[targetScopeId] || { enabled: true, mode: 'simple', steps: [], isOverridden: false }) : null,
        [targetScopeId, policies]);

    const activeSteps = useMemo(() => currentPolicy?.steps || [], [currentPolicy]);

    // Refs for stable comparison to prevent loops
    const initialLoadDone = useRef(false);
    const prevSpecContent = useRef(specContent);
    const prevOpsLen = useRef(preParsedOperations?.length || 0);

    // 1. Loader Effect
    useEffect(() => {
        const hasSpecChanged = specContent !== prevSpecContent.current;
        const hasOpsChanged = (preParsedOperations?.length || 0) !== prevOpsLen.current;

        // Skip if already loaded and nothing material changed
        if (initialLoadDone.current && !hasSpecChanged && !hasOpsChanged) {
            return;
        }

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

            // Only hydrate policies on FIRST load to avoid overwriting user changes in-memory
            if (!initialLoadDone.current) {
                const opMap: Record<string, OperationPolicyState> = {};

                // Hydrate initial policies
                if (initialApiPolicies) {
                    Object.entries(initialApiPolicies).forEach(([id, xml]) => {
                        opMap[id] = {
                            enabled: true,
                            mode: 'xml',
                            steps: parsePolicyXml(xml),
                            xmlContent: xml,
                            isOverridden: true
                        };
                    });
                }

                // Hydrate product policy
                if (!opMap['product']) {
                    opMap['product'] = {
                        enabled: true,
                        mode: 'simple',
                        steps: productPolicyXml ? parsePolicyXml(productPolicyXml) : [],
                        xmlContent: productPolicyXml || '',
                        isOverridden: !!productPolicyXml
                    };
                }

                // Fill empty slots from spec
                try {
                    // Determine source for paths: either from parsed ops or raw spec
                    // If we have ops, use them to seed the map keys
                    if (ops.length > 0) {
                        ops.forEach(op => {
                            if (!opMap[op.id] && op.id !== 'global') {
                                opMap[op.id] = { enabled: false, mode: 'simple', steps: [], isOverridden: false };
                            }
                        });
                    } else if (specContent) {
                        const spec = jsyaml.load(specContent || '') as any;
                        if (spec?.paths) {
                            Object.entries(spec.paths).forEach(([path, methods]: [string, any]) => {
                                Object.keys(methods).forEach((method) => {
                                    const opId = `${method.toUpperCase()} ${path} `; // Note: Check space/trim consistency with parser
                                    if (!opMap[opId]) {
                                        opMap[opId] = { enabled: false, mode: 'simple', steps: [], isOverridden: false };
                                    }
                                });
                            });
                        }
                    }
                } catch { /* silent fail on spec parsing */ }

                setPolicies(opMap);
                setSelectedOpId('product');
                setScanned(true);
            }

            // Update refs
            initialLoadDone.current = true;
            prevSpecContent.current = specContent;
            prevOpsLen.current = preParsedOperations?.length || 0;
        };
        loadOps();
    }, [specContent, preParsedOperations, productPolicyXml, initialApiPolicies]);

    // 3. Handlers
    const handleAddStep = useCallback((templateId: string, section: PolicySection = 'inbound') => {
        if (!targetScopeId) return;
        setPolicies(prev => {
            const current = prev[targetScopeId] || { enabled: true, mode: 'simple', steps: [], isOverridden: true };
            const newSteps = [
                ...current.steps,
                { id: crypto.randomUUID(), templateId, section, values: {} }
            ];

            const inbound = newSteps.filter(s => s.section === 'inbound');
            const backend = newSteps.filter(s => s.section === 'backend');
            const outbound = newSteps.filter(s => s.section === 'outbound');
            const onError = newSteps.filter(s => s.section === 'on-error');
            const xml = generateFullPolicyXml(inbound, backend, outbound, onError);

            if (isProductScope && onSync) onSync(xml);

            return {
                ...prev,
                [targetScopeId]: { ...current, steps: newSteps, xmlContent: xml, isOverridden: true }
            };
        });
    }, [targetScopeId, isProductScope, onSync]);

    const handleUpdateStep = useCallback((id: string, newValues: Record<string, any>) => {
        if (!targetScopeId) return;
        setPolicies(prev => {
            const current = prev[targetScopeId];
            if (!current) return prev;

            const newSteps = current.steps.map(step =>
                step.id === id ? { ...step, values: { ...step.values, ...newValues } } : step
            );

            const inbound = newSteps.filter(s => s.section === 'inbound');
            const backend = newSteps.filter(s => s.section === 'backend');
            const outbound = newSteps.filter(s => s.section === 'outbound');
            const onError = newSteps.filter(s => s.section === 'on-error');
            const xml = generateFullPolicyXml(inbound, backend, outbound, onError);

            if (isProductScope && onSync) onSync(xml);

            return {
                ...prev,
                [targetScopeId]: { ...current, steps: newSteps, xmlContent: xml, isOverridden: true }
            };
        });
    }, [targetScopeId, isProductScope, onSync]);

    const handleRemoveStep = useCallback((id: string) => {
        if (!targetScopeId) return;
        setPolicies(prev => {
            const current = prev[targetScopeId];
            if (!current) return prev;

            const newSteps = current.steps.filter(step => step.id !== id);

            const inbound = newSteps.filter(s => s.section === 'inbound');
            const backend = newSteps.filter(s => s.section === 'backend');
            const outbound = newSteps.filter(s => s.section === 'outbound');
            const onError = newSteps.filter(s => s.section === 'on-error');
            const xml = generateFullPolicyXml(inbound, backend, outbound, onError);

            if (isProductScope && onSync) onSync(xml);

            return {
                ...prev,
                [targetScopeId]: { ...current, steps: newSteps, xmlContent: xml, isOverridden: true }
            };
        });
    }, [targetScopeId, isProductScope, onSync]);

    const handleReorderSteps = useCallback((section: PolicySection, steps: PolicyStep[]) => {
        if (!targetScopeId) return;
        setPolicies(prev => {
            const current = prev[targetScopeId];
            if (!current) return prev;

            const otherSteps = current.steps.filter(s => s.section !== section);
            const newSteps = [...otherSteps, ...steps];

            const inbound = newSteps.filter(s => s.section === 'inbound');
            const backend = newSteps.filter(s => s.section === 'backend');
            const outbound = newSteps.filter(s => s.section === 'outbound');
            const onError = newSteps.filter(s => s.section === 'on-error');
            const xml = generateFullPolicyXml(inbound, backend, outbound, onError);

            if (isProductScope && onSync) onSync(xml);

            return {
                ...prev,
                [targetScopeId]: { ...current, steps: newSteps, xmlContent: xml, isOverridden: true }
            };
        });
    }, [targetScopeId, isProductScope, onSync]);

    const handleToggleMode = useCallback(() => {
        if (!targetScopeId) return;
        setPolicies(prev => {
            const current = prev[targetScopeId];
            if (!current) return prev;
            const newMode = current.mode === 'xml' ? 'simple' : 'xml';
            let updatedSteps = current.steps;
            if (newMode === 'simple' && current.mode === 'xml' && current.xmlContent) {
                try {
                    updatedSteps = parsePolicyXml(current.xmlContent);
                } catch {
                    alert("Failed to parse XML for Visual Mode.");
                    return prev;
                }
            }
            return {
                ...prev,
                [targetScopeId]: { ...current, mode: newMode, steps: updatedSteps }
            };
        });
    }, [targetScopeId]);

    const handleXmlChange = useCallback((newXml: string | undefined) => {
        if (!targetScopeId || newXml === undefined) return;
        setPolicies(prev => ({
            ...prev,
            [targetScopeId]: { ...prev[targetScopeId], xmlContent: newXml, isOverridden: true }
        }));
        if (isProductScope && onSync) {
            onSync(newXml);
        }
    }, [targetScopeId, isProductScope, onSync]);

    return {
        operations,
        selectedOpId,
        setSelectedOpId,
        scanned,
        xmlError,
        setXmlError,
        policies,
        isProductScope,
        currentOp,
        currentPolicy,
        activeSteps,
        handleAddStep,
        handleUpdateStep,
        handleRemoveStep,
        handleReorderSteps,
        handleToggleMode,
        handleXmlChange
    };
}
