import React, { useState } from 'react';
import { useAnalysis } from '../store/useAnalysis';

export const ViolationsTable: React.FC = () => {
    const { result, selectLine } = useAnalysis();

    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [allExpanded, setAllExpanded] = useState(false);

    // Group violations by category
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

    // Sort by line number
    const sortViolations = (violations: typeof result.violations) => {
        return [...violations].sort((a, b) => a.line - b.line);
    };

    // Vibrant category colors for dark theme
    const getCategoryColor = (category: string): string => {
        const colors: Record<string, string> = {
            'security': '#f87171',
            'structural': '#22d3ee',
            'documentation': '#60a5fa',
            'apiDesign': '#a78bfa',
            'dataModels': '#fbbf24',
            'errorHandling': '#34d399',
        };
        return colors[category] || '#94a3b8';
    };

    return (
        <div className="w-full bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col shadow-lg shadow-slate-900/50">
            {/* Header */}
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

                <button
                    onClick={() => {
                        const headers = ['Category', 'Line', 'Severity', 'Rule', 'Message', 'Path'];
                        const rows = result.violations.map(v => [
                            v.category || 'General',
                            v.line,
                            v.severity,
                            v.rule,
                            `"${v.message.replace(/"/g, '""')}"`,
                            v.path
                        ].join(','));

                        const csvContent = [headers.join(','), ...rows].join('\n');
                        const blob = new Blob([csvContent], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `violations-${new Date().toISOString().split('T')[0]}.csv`;
                        a.click();
                        window.URL.revokeObjectURL(url);
                    }}
                    className="px-3.5 py-1.5 text-sm font-medium text-slate-200 bg-slate-700 border border-slate-600 rounded-md cursor-pointer flex items-center gap-2 transition-all duration-200 hover:bg-slate-600 hover:border-slate-500"
                >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export CSV
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto max-h-[400px]">
                {Object.entries(groupedViolations).map(([category, violations]) => {
                    const isExpanded = expandedGroups[category];
                    const categoryColor = getCategoryColor(category);

                    return (
                        <div key={category} className="border-b border-slate-700 last:border-b-0">
                            {/* Category Header - Clickable */}
                            <div
                                onClick={() => toggleGroup(category)}
                                className={`px-6 py-4 flex justify-between items-center cursor-pointer transition-colors duration-200 select-none ${isExpanded ? 'bg-slate-900' : 'bg-slate-800 hover:bg-slate-750'
                                    }`}
                            >
                                <div className="flex items-center gap-3.5">
                                    {/* Chevron Icon */}
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

                                    {/* Category Color Dot with Glow */}
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{
                                            backgroundColor: categoryColor,
                                            boxShadow: `0 0 8px ${categoryColor}`
                                        }}
                                    />

                                    {/* Category Name */}
                                    <span className="text-[15px] font-semibold text-slate-100 capitalize">
                                        {category}
                                    </span>

                                    {/* Violation Count */}
                                    <span className="text-xs font-medium text-slate-400 bg-slate-700 px-2.5 py-0.5 rounded-lg">
                                        {violations.length} issue{violations.length !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                {/* Severity Indicators */}
                                <div className="flex gap-2 items-center">
                                    {violations.filter(v => v.severity === 'error').length > 0 && (
                                        <span className="text-[11px] font-semibold text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-900">
                                            {violations.filter(v => v.severity === 'error').length} errors
                                        </span>
                                    )}
                                    {violations.filter(v => v.severity === 'warning').length > 0 && (
                                        <span className="text-[11px] font-semibold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-900">
                                            {violations.filter(v => v.severity === 'warning').length} warnings
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="bg-slate-900 border-t border-slate-700">
                                    {sortViolations(violations).map((violation, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => selectLine(violation.line)}
                                            className="px-6 py-4 pl-16 flex gap-4 items-start cursor-pointer bg-slate-800 transition-colors duration-150 hover:bg-slate-700 border-b border-slate-700 last:border-b-0"
                                        >
                                            {/* Severity Icon */}
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

                                            {/* Content */}
                                            <div className="flex-grow min-w-0">
                                                {/* Line & Rule */}
                                                <div className="flex items-center gap-2.5 mb-1.5">
                                                    <span className="font-mono text-[13px] font-semibold text-blue-400 bg-blue-950/50 px-2 py-0.5 rounded">
                                                        Line {violation.line}
                                                    </span>
                                                    <span className="font-mono text-xs text-slate-500">
                                                        {violation.rule}
                                                    </span>
                                                </div>

                                                {/* Message */}
                                                <p className="text-sm font-medium text-slate-200 leading-relaxed m-0 mb-1.5">
                                                    {violation.message}
                                                </p>

                                                {/* Path */}
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
