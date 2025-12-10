/**
 * @fileoverview ScoreCard Component
 * 
 * Displays the overall API quality score with a multi-segment donut chart
 * and a category breakdown showing individual scores for each rule category.
 * 
 * Features:
 * - SVG donut chart with colored segments per category
 * - RAG status indicator (Red/Amber/Green)
 * - Category progress bars with glow effects
 * - Dark theme optimized styling
 * 
 * @component
 */

import React from 'react';
import { useAnalysis } from '../store/useAnalysis';

export const ScoreCard: React.FC = () => {
    const { result } = useAnalysis();

    // Don't render if no analysis results
    if (!result) return null;

    const { score, status, categories } = result;

    // === SVG DONUT CHART CONSTANTS ===
    const size = 160;                          // Chart size in pixels
    const strokeWidth = 12;                    // Thickness of donut ring
    const center = size / 2;                   // Center point
    const radius = center - strokeWidth;       // Inner radius
    const circumference = 2 * Math.PI * radius; // Full circle length

    // === CATEGORY DATA PROCESSING ===
    // Handle categories as array (from backend API)
    type CategoryItem = { name: string; score: number; weight?: number; violationCount?: number };
    const categoryArray: CategoryItem[] = Array.isArray(categories)
        ? categories as CategoryItem[]
        : Object.entries(categories).map(([key, val]) =>
            typeof val === 'object' && val !== null ? val as CategoryItem : { name: key, score: val as number, weight: 0, violationCount: 0 }
        );
    const totalCategories = categoryArray.length;
    const segmentLength = circumference / totalCategories;
    const gapLength = 4; // Visual gap between donut segments

    // === COLOR MAPPING ===
    /**
     * Get the color for a specific category.
     * Each category has a distinct color for visual differentiation.
     * 
     * @param categoryName - Name of the category
     * @param index - Index for fallback color
     * @returns Hex color string
     */
    const getCategoryColor = (categoryName: string, index: number) => {
        const colorMap: Record<string, string> = {
            'security': '#ef4444',        // Red - High priority
            'structural': '#06b6d4',      // Cyan - Compliance
            'documentation': '#3b82f6',   // Blue - Docs
            'apiDesign': '#8b5cf6',       // Violet - Design
            'dataModels': '#f59e0b',      // Amber - Schemas
            'errorHandling': '#10b981',   // Emerald - Errors
        };
        return colorMap[categoryName] || ['#ef4444', '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#06b6d4'][index % 6];
    };

    /**
     * Get vibrant category colors for progress bars.
     * These are slightly brighter versions for better visibility.
     */
    const getBarColor = (categoryName: string) => {
        const colors: Record<string, string> = {
            'security': '#f87171',      // Bright red
            'structural': '#22d3ee',    // Bright cyan
            'documentation': '#60a5fa', // Bright blue
            'apiDesign': '#a78bfa',     // Bright purple
            'dataModels': '#fbbf24',    // Bright amber
            'errorHandling': '#34d399', // Bright emerald
        };
        return colors[categoryName] || '#94a3b8';
    };

    // === RENDER ===
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in">

            {/* === DONUT CHART SECTION === */}
            <div style={{
                backgroundColor: '#1e293b',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #334155',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <h3 style={{
                    color: '#94a3b8',
                    fontWeight: '600',
                    marginBottom: '24px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontSize: '12px'
                }}>Quality Score</h3>

                {/* SVG Donut Chart */}
                <div className="relative flex items-center justify-center mb-2">
                    <svg width={size} height={size} className="transform -rotate-90">
                        {/* Background Ring */}
                        <circle
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="transparent"
                            stroke="#334155"
                            strokeWidth={strokeWidth}
                        />

                        {/* Category Segments */}
                        {categoryArray.map((category, index) => {
                            const color = getCategoryColor(category.name, index);
                            const dashArray = `${segmentLength - gapLength} ${circumference - (segmentLength - gapLength)}`;
                            const dashOffset = -(segmentLength * index);

                            return (
                                <circle
                                    key={category.name}
                                    cx={center}
                                    cy={center}
                                    r={radius}
                                    fill="transparent"
                                    stroke={color}
                                    strokeWidth={strokeWidth}
                                    strokeDasharray={dashArray}
                                    strokeDashoffset={dashOffset}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000 ease-out hover:opacity-80 cursor-pointer"
                                >
                                    <title>{category.name}</title>
                                </circle>
                            );
                        })}
                    </svg>

                    {/* Center Score Display */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className={`text-4xl font-extrabold tracking-tight ${status === 'green' ? 'text-emerald-500' : status === 'amber' ? 'text-amber-500' : 'text-red-500'}`}>
                            {score}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mt-1">
                            {status?.toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>

            {/* === CATEGORY BREAKDOWN SECTION === */}
            <div style={{
                gridColumn: 'span 2',
                backgroundColor: '#1e293b',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #334155'
            }}>
                <h3 style={{
                    color: '#94a3b8',
                    fontWeight: '600',
                    marginBottom: '20px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontSize: '11px'
                }}>Category Breakdown</h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {categoryArray.map((category) => {
                        const barColor = getBarColor(category.name);

                        return (
                            <div key={category.name} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px'
                            }}>
                                {/* Category Name */}
                                <div style={{ width: '120px', flexShrink: 0 }}>
                                    <span style={{
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: '#e2e8f0',
                                        textTransform: 'capitalize'
                                    }}>{category.name}</span>
                                </div>

                                {/* Progress Bar */}
                                <div style={{
                                    flexGrow: 1,
                                    height: '10px',
                                    backgroundColor: '#334155',
                                    borderRadius: '5px',
                                    overflow: 'hidden',
                                    position: 'relative'
                                }}>
                                    <div style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        height: '100%',
                                        width: `${category.score}%`,
                                        backgroundColor: barColor,
                                        borderRadius: '5px',
                                        transition: 'width 1s ease-out',
                                        boxShadow: `0 0 10px ${barColor}50`
                                    }}></div>
                                </div>

                                {/* Percentage */}
                                <div style={{ width: '48px', textAlign: 'right', flexShrink: 0 }}>
                                    <span style={{
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        color: '#f1f5f9'
                                    }}>{Math.round(category.score)}%</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
