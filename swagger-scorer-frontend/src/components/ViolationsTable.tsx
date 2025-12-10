import React, { useState } from 'react';
import { useAnalysis } from '../store/useAnalysis';

export const ViolationsTable: React.FC = () => {
    const { result, selectLine } = useAnalysis();

    if (!result || !result.violations || result.violations.length === 0) return null;

    // Group violations by category
    const groupedViolations = React.useMemo(() => {
        const groups: Record<string, typeof result.violations> = {};
        result.violations.forEach(v => {
            const cat = v.category || 'General';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(v);
        });
        return groups;
    }, [result.violations]);

    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [allExpanded, setAllExpanded] = useState(false);

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
        <div style={{
            width: '100%',
            backgroundColor: '#1e293b',
            borderRadius: '12px',
            border: '1px solid #334155',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header */}
            <div style={{
                padding: '16px 24px',
                borderBottom: '1px solid #334155',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#0f172a'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <h3 style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        margin: 0
                    }}>
                        Violations
                        <span style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#94a3b8',
                            backgroundColor: '#334155',
                            padding: '4px 10px',
                            borderRadius: '12px',
                            border: '1px solid #475569'
                        }}>
                            {result.violations.length}
                        </span>
                    </h3>
                    <button
                        onClick={toggleAll}
                        style={{
                            fontSize: '13px',
                            fontWeight: '500',
                            color: '#60a5fa',
                            backgroundColor: '#1e3a5f',
                            padding: '6px 14px',
                            borderRadius: '6px',
                            border: '1px solid #3b82f6',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
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
                    style={{
                        padding: '6px 14px',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#e2e8f0',
                        backgroundColor: '#334155',
                        border: '1px solid #475569',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.2s'
                    }}
                >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export CSV
                </button>
            </div>

            {/* Scrollable Content */}
            <div style={{ overflowY: 'auto', maxHeight: '400px' }}>
                {Object.entries(groupedViolations).map(([category, violations]) => {
                    const isExpanded = expandedGroups[category];
                    const categoryColor = getCategoryColor(category);

                    return (
                        <div key={category} style={{ borderBottom: '1px solid #334155' }}>
                            {/* Category Header - Clickable */}
                            <div
                                onClick={() => toggleGroup(category)}
                                style={{
                                    padding: '16px 24px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    backgroundColor: isExpanded ? '#0f172a' : '#1e293b',
                                    transition: 'background-color 0.2s',
                                    userSelect: 'none'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    {/* Chevron Icon */}
                                    <div style={{
                                        width: '24px',
                                        height: '24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: '#334155',
                                        borderRadius: '6px'
                                    }}>
                                        <svg
                                            width="14"
                                            height="14"
                                            fill="none"
                                            stroke="#94a3b8"
                                            viewBox="0 0 24 24"
                                            style={{
                                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.2s ease-out'
                                            }}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>

                                    {/* Category Color Dot with Glow */}
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        backgroundColor: categoryColor,
                                        boxShadow: `0 0 8px ${categoryColor}`
                                    }}></div>

                                    {/* Category Name */}
                                    <span style={{
                                        fontSize: '15px',
                                        fontWeight: '600',
                                        color: '#f1f5f9',
                                        textTransform: 'capitalize'
                                    }}>{category}</span>

                                    {/* Violation Count */}
                                    <span style={{
                                        fontSize: '12px',
                                        fontWeight: '500',
                                        color: '#94a3b8',
                                        backgroundColor: '#334155',
                                        padding: '3px 10px',
                                        borderRadius: '10px'
                                    }}>
                                        {violations.length} issue{violations.length !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                {/* Severity Indicators */}
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    {violations.filter(v => v.severity === 'error').length > 0 && (
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            color: '#f87171',
                                            backgroundColor: '#450a0a',
                                            padding: '3px 8px',
                                            borderRadius: '4px',
                                            border: '1px solid #7f1d1d'
                                        }}>
                                            {violations.filter(v => v.severity === 'error').length} errors
                                        </span>
                                    )}
                                    {violations.filter(v => v.severity === 'warning').length > 0 && (
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            color: '#fbbf24',
                                            backgroundColor: '#451a03',
                                            padding: '3px 8px',
                                            borderRadius: '4px',
                                            border: '1px solid #78350f'
                                        }}>
                                            {violations.filter(v => v.severity === 'warning').length} warnings
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div style={{
                                    backgroundColor: '#0f172a',
                                    borderTop: '1px solid #334155'
                                }}>
                                    {sortViolations(violations).map((violation, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => selectLine(violation.line)}
                                            style={{
                                                padding: '16px 24px 16px 64px',
                                                borderBottom: idx < violations.length - 1 ? '1px solid #334155' : 'none',
                                                display: 'flex',
                                                gap: '16px',
                                                alignItems: 'flex-start',
                                                cursor: 'pointer',
                                                backgroundColor: '#1e293b',
                                                transition: 'background-color 0.15s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
                                        >
                                            {/* Severity Icon */}
                                            <div style={{ paddingTop: '2px', flexShrink: 0 }}>
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
                                            <div style={{ flexGrow: 1, minWidth: 0 }}>
                                                {/* Line & Rule */}
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    marginBottom: '6px'
                                                }}>
                                                    <span style={{
                                                        fontFamily: 'monospace',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        color: '#60a5fa',
                                                        backgroundColor: '#1e3a5f',
                                                        padding: '2px 8px',
                                                        borderRadius: '4px'
                                                    }}>
                                                        Line {violation.line}
                                                    </span>
                                                    <span style={{
                                                        fontFamily: 'monospace',
                                                        fontSize: '12px',
                                                        color: '#64748b'
                                                    }}>
                                                        {violation.rule}
                                                    </span>
                                                </div>

                                                {/* Message */}
                                                <p style={{
                                                    fontSize: '14px',
                                                    fontWeight: '500',
                                                    color: '#e2e8f0',
                                                    lineHeight: '1.5',
                                                    margin: '0 0 6px 0'
                                                }}>
                                                    {violation.message}
                                                </p>

                                                {/* Path */}
                                                <p style={{
                                                    fontSize: '12px',
                                                    fontFamily: 'monospace',
                                                    color: '#64748b',
                                                    margin: 0,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
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
