import React, { useState } from 'react';
import { type AnalysisResult } from '../api/analysisClient';

interface ViolationsTableProps {
    result: AnalysisResult | null;
    onSelectLine: (line: number) => void;
}

export const ViolationsTable: React.FC<ViolationsTableProps> = ({ result, onSelectLine }) => {
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [allExpanded, setAllExpanded] = useState(false);

    const groupedViolations = React.useMemo(() => {
        if (!result || !result.violations || result.violations.length === 0) return {};
        const groups: Record<string, typeof result.violations> = {};
        result.violations.forEach(v => {
            const cat = v.category || 'General';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(v);
        });
        return groups;
    }, [result]);

    if (!result || !result.violations || result.violations.length === 0) return null;

    const toggleGroup = (category: string) => {
        setExpandedGroups(prev => ({ ...prev, [category]: !prev[category] }));
    };

    const toggleAll = () => {
        const newState = !allExpanded;
        setAllExpanded(newState);
        const newExpandedState: Record<string, boolean> = {};
        Object.keys(groupedViolations).forEach(cat => {
            newExpandedState[cat] = newState;
        });
        setExpandedGroups(newExpandedState);
    };

    const sortViolations = (violations: typeof result.violations) => {
        return [...violations].sort((a, b) => a.line - b.line);
    };

    return (
        <div className="w-full bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col shadow-lg shadow-slate-900/50">
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-900">
                <div className="flex items-center gap-4">
                    <h3 className="text-base font-bold text-slate-100 flex items-center gap-3 m-0">
                        Violations
                        <span className="text-xs font-semibold text-slate-400 bg-slate-700 px-2.5 py-1 rounded-xl border border-slate-600">
                            {result.violations.length}
                        </span>
                    </h3>
                    <button
                        onClick={toggleAll}
                        className="text-sm font-medium text-blue-400 bg-blue-950/50 px-3.5 py-1.5 rounded-md border border-blue-600/50 cursor-pointer transition-all duration-200 hover:bg-blue-900/50 hover:border-blue-500"
                    >
                        {allExpanded ? 'Collapse All' : 'Expand All'}
                    </button>
                </div>
            </div>

            <div className="overflow-y-auto max-h-[400px]">
                {Object.entries(groupedViolations).map(([category, violations]) => {
                    const isExpanded = expandedGroups[category];

                    return (
                        <div key={category} className="border-b border-slate-700 last:border-b-0">
                            <div
                                onClick={() => toggleGroup(category)}
                                className={`px-6 py-4 flex justify-between items-center cursor-pointer transition-colors duration-200 select-none ${isExpanded ? 'bg-slate-900' : 'bg-slate-800 hover:bg-slate-750'
                                    }`}
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className="w-6 h-6 flex items-center justify-center bg-slate-700 rounded-md">
                                        <svg
                                            width="14"
                                            height="14"
                                            fill="none"
                                            stroke="#94a3b8"
                                            viewBox="0 0 24 24"
                                            className={`transition-transform duration-200 ease-out ${isExpanded ? 'rotate-90' : 'rotate-0'
                                                }`}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                    <div className={`category-dot ${category}`} />
                                    <span className="text-[15px] font-semibold text-slate-100 capitalize">
                                        {category}
                                    </span>
                                    <span className="text-xs font-medium text-slate-400 bg-slate-700 px-2.5 py-0.5 rounded-lg">
                                        {violations.length} issue{violations.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="bg-slate-900 border-t border-slate-700">
                                    {sortViolations(violations).map((violation, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => onSelectLine(violation.line)}
                                            className="px-6 py-4 pl-16 flex gap-4 items-start cursor-pointer bg-slate-800 transition-colors duration-150 hover:bg-slate-700 border-b border-slate-700 last:border-b-0"
                                        >
                                            <div className="pt-0.5 flex-shrink-0">
                                                {violation.severity === 'error' ? (
                                                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#f87171">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                ) : violation.severity === 'warning' ? (
                                                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#fbbf24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                    </svg>
                                                ) : (
                                                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#60a5fa">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                )}
                                            </div>

                                            <div className="flex-grow min-w-0">
                                                <div className="flex items-center gap-2.5 mb-1.5">
                                                    <span className="font-mono text-[13px] font-semibold text-blue-400 bg-blue-950/50 px-2 py-0.5 rounded">
                                                        Line {violation.line}
                                                    </span>
                                                    <span className="font-mono text-xs text-slate-500">
                                                        {violation.rule}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium text-slate-200 leading-relaxed m-0 mb-1.5">
                                                    {violation.message}
                                                </p>
                                                <p className="text-xs font-mono text-slate-500 m-0 overflow-hidden text-ellipsis whitespace-nowrap">
                                                    {violation.path}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
