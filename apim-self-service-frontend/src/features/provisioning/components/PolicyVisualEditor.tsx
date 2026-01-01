import { ConfiguredPolicy, POLICY_TEMPLATES } from './policyTemplates';
import { GenericPolicyRenderer } from './GenericPolicyRenderer';

/**
 * ------------------------------------------------------------------
 * 📍 Component: PolicyVisualEditor
 * ------------------------------------------------------------------
 * 🔄 RESPONSIBILITY:
 * - Renders the visual representation of active policies for a scope.
 * - Bridges the logic between raw `ConfiguredPolicy` data and widget rendering.
 * - Handles the reordering and section-based grouping (Inbound/Outbound etc).
 * 
 * 📥 DATA INFLOW:
 * - `activePolicies`: The list of policy instances currently applied.
 * 
 * 📤 ACTIONS:
 * - `handleUpdatePolicyValue`: Propagates field-level changes back to the 
 *   orchestration store (`usePolicyStudio`).
 * - `handleRemovePolicy`: Triggers deletion of a policy instance.
 * ------------------------------------------------------------------
 */
interface PolicyVisualEditorProps {
    activePolicies: ConfiguredPolicy[];
    handleUpdatePolicyValue: (id: string, newValues: Record<string, unknown>) => void;
    handleRemovePolicy: (id: string) => void;
    handleSectionChange: (id: string, newSection: 'inbound' | 'backend' | 'outbound' | 'on-error') => void;
    readOnly: boolean;
}

export const PolicyVisualEditor = ({
    activePolicies,
    handleUpdatePolicyValue,
    handleRemovePolicy,
    handleSectionChange,
    readOnly
}: PolicyVisualEditorProps) => {
    if (activePolicies.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">🪄</span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Policies Configured</h3>
                <p className="text-sm text-slate-500 max-w-xs mt-2">
                    Select a policy from the palette on the right to get started.
                </p>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="max-w-4xl mx-auto space-y-4 pb-20">
                {activePolicies.map((policy) => {
                    const template = POLICY_TEMPLATES.find(t => t.id === policy.templateId);
                    if (!template) return null;

                    return (
                        <GenericPolicyRenderer
                            key={policy.id}
                            template={template}
                            values={policy.values || {}}
                            onChange={(vals) => handleUpdatePolicyValue(policy.id, vals)}
                            onRemove={() => handleRemovePolicy(policy.id)}
                            section={policy.section}
                            onSectionChange={(sec) => handleSectionChange(policy.id, sec)}
                            readOnly={readOnly}
                        />
                    );
                })}
            </div>
        </div>
    );
};
