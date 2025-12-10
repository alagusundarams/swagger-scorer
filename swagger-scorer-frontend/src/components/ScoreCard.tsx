import React from 'react';
import { useAnalysis } from '../store/useAnalysis';

export const ScoreCard: React.FC = () => {
    const { result } = useAnalysis();

    if (!result) return null;

    const { score, status, categories } = result;

    const getRagColor = (status: string) => {
        switch (status) {
            case 'GREEN': return 'text-green-400 border-green-500/50 bg-green-500/10';
            case 'AMBER': return 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10';
            case 'RED': return 'text-red-400 border-red-500/50 bg-red-500/10';
            default: return 'text-gray-400 border-gray-500/50 bg-gray-500/10';
        }
    };

    // SVG Constants
    const size = 160;
    const strokeWidth = 12;
    const center = size / 2;
    const radius = center - strokeWidth;
    const circumference = 2 * Math.PI * radius;

    // Handle categories as array (from backend)
    type CategoryItem = { name: string; score: number; weight?: number; violationCount?: number };
    const categoryArray: CategoryItem[] = Array.isArray(categories)
        ? categories as CategoryItem[]
        : Object.entries(categories).map(([key, val]) =>
            typeof val === 'object' && val !== null ? val as CategoryItem : { name: key, score: val as number, weight: 0, violationCount: 0 }
        );
    const totalCategories = categoryArray.length;
    const segmentLength = circumference / totalCategories;
    const gapLength = 4; // visual gap between segments

    // Category Color Mapping (Distinct Palette)
    const getCategoryColor = (categoryName: string, index: number) => {
        // Map specific category names to colors
        const colorMap: Record<string, string> = {
            'security': '#ef4444',        // Red-500
            'documentation': '#3b82f6',   // Blue-500  
            'apiDesign': '#8b5cf6',       // Violet-500
            'dataModels': '#f59e0b',      // Amber-500
            'errorHandling': '#10b981',   // Emerald-500
            'completeness': '#06b6d4',    // Cyan-500
        };

        // Return mapped color or fallback to index-based color
        return colorMap[categoryName] || ['#ef4444', '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#06b6d4'][index % 6];
    };

    // Determine RAG Color Helper
    const getScoreColor = (s: number) => {
        if (s >= 80) return '#10b981'; // Emerald-500
        if (s >= 50) return '#f59e0b'; // Amber-500
        return '#ef4444'; // Red-500
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in">
            {/* Overall Score with Multi-Segment Donut Chart - DARK THEME */}
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
                        {/* Background Ring (Faint) */}
                        <circle
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="transparent"
                            stroke="#334155"
                            strokeWidth={strokeWidth}
                        />

                        {/* Segments */}
                        {categoryArray.map((category: { name: string; score: number }, index: number) => {
                            const categoryName = category.name;

                            // Use categorical color based on category name
                            const color = getCategoryColor(categoryName, index);

                            // Calculate stroke dash array for segment
                            // dasharray: "length visible, length gap"
                            // We want uniform segments, but colored by their score
                            // Wait, "replication of violations"? 
                            // Creating segments proportional to score is one way, but preserving the "ring" shape with gaps works best for "categories".
                            // Let's do equal segments, colored by their individual status.

                            const dashArray = `${segmentLength - gapLength} ${circumference - (segmentLength - gapLength)}`;
                            const dashOffset = -(segmentLength * index);

                            return (
                                <circle
                                    key={categoryName}
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
                                    <title>{categoryName}</title>
                                </circle>
                            );
                        })}
                    </svg>

                    {/* Score Text Centered */}
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

            {/* Category Breakdown - DARK THEME */}
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
                        const categoryScore = category.score;
                        const categoryName = category.name;

                        // Vibrant colors that pop on dark background
                        const colors: Record<string, string> = {
                            'security': '#f87171',      // Bright red
                            'documentation': '#60a5fa', // Bright blue
                            'apiDesign': '#a78bfa',     // Bright purple
                            'dataModels': '#fbbf24',    // Bright amber
                            'errorHandling': '#34d399', // Bright emerald
                            'completeness': '#22d3ee',  // Bright cyan
                        };
                        const barColor = colors[categoryName] || '#94a3b8';

                        return (
                            <div key={categoryName} style={{
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
                                    }}>{categoryName}</span>
                                </div>

                                {/* Progress Bar Track */}
                                <div style={{
                                    flexGrow: 1,
                                    height: '10px',
                                    backgroundColor: '#334155',
                                    borderRadius: '5px',
                                    overflow: 'hidden',
                                    position: 'relative'
                                }}>
                                    {/* Colored Progress Bar */}
                                    <div style={{
                                        position: 'absolute',
                                        left: 0,
                                        top: 0,
                                        height: '100%',
                                        width: `${categoryScore}%`,
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
                                    }}>{Math.round(categoryScore)}%</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
