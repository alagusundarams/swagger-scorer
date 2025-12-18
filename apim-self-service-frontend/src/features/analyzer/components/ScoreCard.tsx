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
 * - Dark theme optimized styling with Tailwind
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8 animate-fade-in">

            {/* === DONUT CHART SECTION === */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex flex-col items-center justify-center shadow-lg shadow-slate-900/50 hover:border-blue-500/30 transition-all duration-300">
                <h3 className="text-xs font-semibold mb-6 uppercase tracking-widest text-slate-400">
                    Quality Score
                </h3>

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
                        <span className={`text-5xl font-extrabold tracking-tight transition-colors duration-300 ${status === 'green' ? 'text-emerald-500' : status === 'amber' ? 'text-amber-500' : 'text-red-500'}`}>
                            {score}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-2">
                            {status?.toUpperCase()}
                        </span>
                    </div>
                </div>
            </div>

            {/* === CATEGORY BREAKDOWN SECTION === */}
            <div className="col-span-1 lg:col-span-2 bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg shadow-slate-900/50 hover:border-blue-500/30 transition-all duration-300">
                <h3 className="text-xs font-semibold mb-5 uppercase tracking-widest text-slate-400">
                    Category Breakdown
                </h3>

                <div className="flex flex-col gap-4">
                    {categoryArray.map((category) => {
                        const barColor = getBarColor(category.name);

                        return (
                            <div key={category.name} className="flex items-center gap-4">
                                {/* Category Name */}
                                <div className="w-32 flex-shrink-0">
                                    <span className="text-sm font-medium text-slate-200 capitalize">
                                        {category.name}
                                    </span>
                                </div>

                                {/* Progress Bar */}
                                <div className="flex-grow h-2.5 bg-slate-700 rounded-full overflow-hidden relative">
                                    <div 
                                        className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000 ease-out"
                                        style={{
                                            width: `${category.score}%`,
                                            backgroundColor: barColor,
                                            boxShadow: `0 0 10px ${barColor}50`
                                        }}
                                    />
                                </div>

                                {/* Percentage */}
                                <div className="w-12 text-right flex-shrink-0">
                                    <span className="text-sm font-bold text-slate-100">
                                        {Math.round(category.score)}%
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
