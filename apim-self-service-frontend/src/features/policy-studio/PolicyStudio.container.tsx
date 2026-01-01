/**
 * ------------------------------------------------------------------
 * 📍 Component: PolicyStudio (Container)
 * ------------------------------------------------------------------
 * 🔄 RESPONSIBILITY:
 * - Smart container for the standalone Policy Studio feature.
 * - Handles data fetching for policy templates and existing configurations.
 * - Provides the context providers required by the `PolicyBuilder`.
 * - Acts as the entry point for the "Policy Editor" page.
 * ------------------------------------------------------------------
 */
import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { type PolicyScope, type PolicyFlow, type PolicyStep, type PolicySection, type PolicyStepType } from './types/policyTypes';
import { PolicyPalette } from './components/PolicyPalette';
import { PolicyStepCard } from './components/PolicyStepCard';
import { RateLimitProperties } from './components/properties/RateLimitProperties';
import { GenericPolicyProperties } from './components/properties/GenericPolicyProperties';
import { DeploymentConfirmationModal } from './components/DeploymentConfirmationModal';
import { useStore } from '../../store/useStore';
import { api } from '../../api/baseClient';
import { v4 as uuidv4 } from 'uuid';

// DnD Imports
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    type DragStartEvent,
    type DragEndEvent
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
    arrayMove
} from '@dnd-kit/sortable';

// Placeholder Mock Data
const MOCK_FLOW: PolicyFlow = {
    inbound: [
        { id: '1', type: 'base', displayName: 'Global Policy', scope: 'global', isLocked: true, xmlSnippet: '<base />', properties: {} },
        { id: '2', type: 'cors', displayName: 'CORS (Global)', scope: 'global', isLocked: true, xmlSnippet: '<cors>...</cors>', properties: {} },
        { id: '3', type: 'rate-limit', displayName: 'Rate Limit (API)', scope: 'api', isLocked: false, properties: { calls: 20, renewalPeriod: 90, counterKey: '@(context.Subscription.Id)' } }
    ],
    backend: [
        { id: '4', type: 'base', displayName: 'Forward to Backend', scope: 'global', isLocked: true, xmlSnippet: '<base />', properties: {} }
    ],
    outbound: [],
    onError: []
};

interface Props {
    initialXml?: string;
    resourceName?: string;
    resourceId?: string;
    level?: 'product' | 'api' | 'operation';
    isReadOnly?: boolean;
}

export const PolicyStudioContainer = ({
    initialXml,
    resourceName = 'Unknown Policy',
    resourceId = 'legacy-policy',
    level = 'api',
    isReadOnly = false
}: Props) => {
    const [selectedScope, setSelectedScope] = useState<PolicyScope>(level as PolicyScope);
    const { addNotification } = useStore();

    // State
    const [flow, setFlow] = useState<PolicyFlow>(MOCK_FLOW);
    const [rawXml, setRawXml] = useState(initialXml || '');
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
    const [editMode, setEditMode] = useState<'visual' | 'code'>('visual');
    const [isLoading, setIsLoading] = useState(false);
    const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
    const [isDeploying, setIsDeploying] = useState(false);

    // DnD State
    const [activeDragItem, setActiveDragItem] = useState<any | null>(null);


    // Actually simpler list of sensors is better
    const mouseSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
    const touchSensor = useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 5 } });
    const dndSensors = useSensors(mouseSensor, touchSensor);

    // Fetch Parsed Policy from Backend when Scope or Initial changes
    useEffect(() => {
        const fetchPolicy = async () => {
            // If we switched scope, we want to fetch that scope's policy.
            // If it's initial load, we use initialXml if available AND scope matches level
            // BUT, user wants to see "Global" -> "Product" -> "API" separation.
            // So we should strictly fetch based on `selectedScope`.

            setIsLoading(true);
            try {
                // Determine what to fetch.
                // If selectedScope == level (prop), and we have initialXml, maybe use that?
                // But for "Gap verification", fresh fetch is safer.

                // We need resourceId for the scope. 
                // Assumption: resourceId passed in props works for all scopes (e.g. it's the API ID, and backend knows how to find parent Product).
                // If it's 'global', resourceId might be ignored or special.

                const response = await api.get(`/policy/fetch/${resourceId}`, {
                    params: { level: selectedScope }
                });

                if (response.data && response.data.xml) {
                    setRawXml(response.data.xml);
                    // Then analyze it to get the flow
                    const analysis = await api.post('/policy/analyze', { xml: response.data.xml });
                    if (analysis.data) {
                        setFlow(analysis.data);
                    }
                } else {
                    // Empty or 404
                    setFlow({ inbound: [], backend: [], outbound: [], onError: [] });
                    setRawXml('');
                }

            } catch (error) {
                console.error('Policy Fetch Failed:', error);
                // Fallback to empty flow
                setFlow({ inbound: [], backend: [], outbound: [], onError: [] });
            } finally {
                setIsLoading(false);
            }
        };

        if (editMode === 'visual') {
            fetchPolicy();
        }

    }, [selectedScope, resourceId, editMode]); // Dependencies updated

    const activeStep = selectedStepId
        ? Object.values(flow).flat().find(s => s.id === selectedStepId)
        : null;

    // Helper to update flow and fetch XML from backend
    const updateFlowWithBackend = async (newFlow: PolicyFlow) => {
        setFlow(newFlow);
        try {
            const response = await api.post('/policy/generate', { flow: newFlow });
            if (response.data && response.data.xml) {
                setRawXml(response.data.xml);
            }
        } catch (error) {
            console.error('Failed to generate XML:', error);
            addNotification({
                title: 'Sync Error',
                message: 'Failed to synchronize XML with visual changes.',
                type: 'error'
            });
        }
    };

    const handleUpdateStep = (updates: Record<string, any>) => {
        if (!activeStep) return;

        const updateSection = (list: PolicyStep[]) =>
            list.map(s => s.id === activeStep.id ? { ...s, properties: updates } : s);

        const newFlow = { ...flow };

        // Find which section the step belongs to
        (Object.keys(newFlow) as PolicySection[]).forEach(section => {
            newFlow[section] = updateSection(newFlow[section]);
        });

        updateFlowWithBackend(newFlow);
    };

    const handleDeleteStep = (stepId: string) => {
        const newFlow = { ...flow };

        (Object.keys(newFlow) as PolicySection[]).forEach(section => {
            newFlow[section] = newFlow[section].filter(s => s.id !== stepId);
        });

        if (selectedStepId === stepId) {
            setSelectedStepId(null);
        }

        updateFlowWithBackend(newFlow);
    };

    const handleDeploy = async (justification: string) => {
        setIsDeploying(true);
        try {
            const response = await api.post('/policy/deploy', {
                xml: rawXml,
                resourceId,
                level,
                justification,
                user: 'alagusundaram'
            });

            const result = response.data;
            addNotification({
                title: 'Deployment Successful',
                message: `Commit ${result.commitId} pushed to GitOps branch.` as any,
                type: 'success',
                navigateTo: '/inventory/my-products'
            });
            setIsDeployModalOpen(false);
        } catch (error) {
            console.error('Deploy Failed:', error);
            alert('Deployment failed. Check console for details.');
        } finally {
            setIsDeploying(false);
        }
    };

    // --- DnD Handlers ---

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragItem(event.active.data.current);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragItem(null);

        if (!over) return;

        // Case 1: Reordering within same list
        // Case 2: Moving between lists
        // Case 3: Dropping from Palette

        const activeData = active.data.current;
        const overData = over.data.current;

        // Drop from Palette
        if (activeData?.type === 'palette-item') {
            const section = overData?.sortable?.containerId as PolicySection || 'inbound'; // Default to inbound if dropping on container

            // Create new step
            const newStep: PolicyStep = {
                id: uuidv4(),
                type: activeData.policyType as PolicyStepType,
                displayName: activeData.template.label,
                description: activeData.template.description,
                scope: selectedScope,
                isLocked: false,
                properties: {}
            };

            const newFlow = { ...flow };

            // Insert at index if over a specific item, or end of list
            if (overData?.type === 'step') {
                const overIndex = overData.sortable.index;
                newFlow[section].splice(overIndex, 0, newStep);
            } else {
                newFlow[section].push(newStep);
            }

            setSelectedStepId(newStep.id);
            updateFlowWithBackend(newFlow);
            return;
        }

        // Reordering
        if (active.id !== over.id && activeData?.type === 'step') {
            const section = activeData.sortable.containerId as PolicySection; // Assuming staying in same section for now
            const oldIndex = flow[section].findIndex(s => s.id === active.id);
            const newIndex = flow[section].findIndex(s => s.id === over.id);

            if (oldIndex !== -1 && newIndex !== -1) {
                const newFlow = {
                    ...flow,
                    [section]: arrayMove(flow[section], oldIndex, newIndex)
                };
                updateFlowWithBackend(newFlow);
            }
        }
    };

    return (
        <DndContext
            sensors={dndSensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-full bg-slate-50 dark:bg-slate-900 overflow-hidden">
                {isLoading && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                )}
                <DeploymentConfirmationModal
                    isOpen={isDeployModalOpen}
                    onClose={() => setIsDeployModalOpen(false)}
                    onConfirm={handleDeploy}
                    isDeploying={isDeploying}
                    resourceName={resourceName}
                />

                {/* LEFT COLUMN: Palette */}
                <div className="bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col z-20 shadow-xl h-full">
                    <PolicyPalette />
                </div>

                <div className="flex-1 flex flex-col relative bg-slate-50 dark:bg-slate-900 bg-grid-slate-200/[0.04] min-w-0">
                    {/* Header Toolbar */}
                    <div className="p-4 flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 z-10 sticky top-0">
                        <div className="flex items-center gap-4">
                            <select
                                value={selectedScope}
                                onChange={(e) => setSelectedScope(e.target.value as any)}
                                className="bg-transparent font-black text-lg text-gray-900 dark:text-white outline-none cursor-pointer hover:opacity-80 transition"
                            >
                                <option value="global">Global Scope</option>
                                <option value="product">Product Scope</option>
                                <option value="api">API Scope</option>
                                <option value="operation">Operation Scope</option>
                            </select>
                            <div className="flex bg-slate-200 dark:bg-slate-800 rounded-full p-1">
                                <button
                                    onClick={() => setEditMode('visual')}
                                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition ${editMode === 'visual' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Visual
                                </button>
                                <button
                                    onClick={() => setEditMode('code')}
                                    className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition ${editMode === 'code' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    XML Code
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {!isReadOnly ? (
                                <button
                                    onClick={() => setIsDeployModalOpen(true)}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition transform hover:scale-105 active:scale-95 flex items-center gap-2"
                                >
                                    <span>🚀</span> Save & Deploy
                                </button>
                            ) : (
                                <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-[10px] font-black uppercase border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                                    <span>🔒</span> Read-Only View
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto relative custom-scrollbar">
                        {editMode === 'visual' ? (
                            <div className="min-h-full p-12 flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">

                                {/* INBOUND SECTION */}
                                <div className="w-full max-w-2xl space-y-4 mb-12">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                                        <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 bg-slate-50 dark:bg-slate-900 px-4">Inbound (Request)</h3>
                                        <div className="h-px bg-slate-200 dark:bg-slate-700 flex-1"></div>
                                    </div>

                                    <SortableContext
                                        id="inbound"
                                        items={flow.inbound.map(s => s.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-4 min-h-[100px] p-4 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-300 transition-colors">
                                            {flow.inbound.map((step, idx) => (
                                                <PolicyStepCard
                                                    key={step.id}
                                                    step={step}
                                                    index={idx + 1}
                                                    isSelected={selectedStepId === step.id}
                                                    onClick={() => !step.isLocked && !isReadOnly && setSelectedStepId(step.id)}
                                                    onDelete={handleDeleteStep}
                                                    isReadOnly={isReadOnly}
                                                />
                                            ))}
                                            {flow.inbound.length === 0 && (
                                                <div className="text-center text-slate-400 text-xs font-bold py-8 uppercase tracking-widest">
                                                    Drop policies here
                                                </div>
                                            )}
                                        </div>
                                    </SortableContext>
                                </div>

                                {/* BACKEND SECTION */}
                                <div className="mb-12 scale-110 relative z-10 group cursor-default">
                                    <div className="absolute inset-0 bg-indigo-500 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition duration-500"></div>
                                    <div className="px-10 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-indigo-500/30 flex items-center gap-3">
                                        <span>⚡️</span> Backend Service
                                    </div>
                                </div>

                                {/* BACKEND (OUTBOUND) SECTION - Just linking 'backend' flow here for simplicity, typically separate */}
                                <div className="w-full max-w-2xl space-y-4 mb-24">
                                    <SortableContext
                                        id="backend"
                                        items={flow.backend.map(s => s.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="space-y-4">
                                            {flow.backend.map((step, idx) => (
                                                <PolicyStepCard
                                                    key={step.id}
                                                    step={step}
                                                    index={idx + 1}
                                                    isSelected={selectedStepId === step.id}
                                                    onClick={() => !step.isLocked && !isReadOnly && setSelectedStepId(step.id)}
                                                    onDelete={handleDeleteStep}
                                                    isReadOnly={isReadOnly}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </div>

                            </div>
                        ) : (
                            <div className="h-full animate-in slide-in-from-bottom-4 duration-500">
                                <Editor
                                    height="100%"
                                    defaultLanguage="xml"
                                    theme="vs-dark"
                                    value={rawXml}
                                    onChange={(val) => !isReadOnly && setRawXml(val || '')}
                                    options={{
                                        readOnly: isReadOnly,
                                        minimap: { enabled: false },
                                        fontSize: 14,
                                        lineNumbers: 'on',
                                        scrollBeyondLastLine: false,
                                        automaticLayout: true,
                                        padding: { top: 20 }
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Properties */}
                <div className="w-80 bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-slate-700 p-8 flex flex-col shadow-2xl z-20">
                    <h2 className="font-black text-[10px] uppercase tracking-widest text-gray-400 mb-8">Specification</h2>

                    {activeStep ? (
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="mb-8">
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{activeStep.displayName}</h3>
                                <div className="flex gap-2 mt-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${activeStep.isLocked ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-600'}`}>
                                        {activeStep.scope}
                                    </span>
                                </div>
                            </div>

                            {activeStep.type === 'rate-limit' ? (
                                <RateLimitProperties step={activeStep} onChange={handleUpdateStep} />
                            ) : (
                                <GenericPolicyProperties step={activeStep} onChange={handleUpdateStep} />
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-2xl mb-4 opacity-50 grayscale">
                                ⚙️
                            </div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                                Pick a step to<br />configure logic
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <DragOverlay>
                {activeDragItem ? (
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border-2 border-blue-500 opacity-90 scale-105 cursor-grabbing w-64">
                        <div className="font-bold text-sm text-gray-900 dark:text-white">
                            {activeDragItem.template?.label || activeDragItem.step?.displayName}
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
};
