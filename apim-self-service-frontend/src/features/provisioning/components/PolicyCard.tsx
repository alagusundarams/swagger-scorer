import { ReactNode, useState } from 'react';
import { PolicyTemplate } from './policyTemplates';

interface PolicyCardProps {
    template: PolicyTemplate;
    onRemove?: () => void;
    children: ReactNode;
}

/**
 * PolicyCard Component
 * 
 * A reusable "Shell" for any policy widget.
 * Handles the visual frame: Border, Header, Collapse Logic, Remove Button.
 * This separates the "Container" UI from the "Form" Logic.
 */
export const PolicyCard = ({ template, onRemove, children }: PolicyCardProps) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Color coding based on category
    const getCategoryColor = (cat: string) => {
        switch (cat) {
            case 'Traffic': return 'bg-amber-500';
            case 'Security': return 'bg-red-500';
            case 'Mocking': return 'bg-green-500';
            default: return 'bg-blue-500';
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm relative group overflow-hidden transition-all hover:shadow-md">
            {/* Colored Category Stripe */}
            <div className={`absolute top-0 left-0 w-1 h-full ${getCategoryColor(template.category)}`} />

            {/* Header */}
            <div className="flex justify-between items-start p-4 pl-5 border-b border-transparent dark:border-slate-800 hover:border-slate-100 dark:hover:border-slate-700">
                <div onClick={() => setIsCollapsed(!isCollapsed)} className="cursor-pointer flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{template.name}</h4>
                        <span className="text-[9px] uppercase font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {template.category}
                        </span>
                    </div>
                    <p className="text-[10px] text-slate-400 max-w-md truncate">{template.description}</p>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        {isCollapsed ? '▼' : '▲'}
                    </button>
                    {onRemove && (
                        <button
                            onClick={onRemove}
                            className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                            title="Remove Policy"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Content Body (Collapsible) */}
            {!isCollapsed && (
                <div className="p-4 pl-5 pt-2 bg-slate-50/50 dark:bg-slate-900/50">
                    {children}
                </div>
            )}
        </div>
    );
};
