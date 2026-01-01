import React from 'react';
import { type AnalysisResult } from '../api/analysisClient';

interface ScoreCardProps {
    result: AnalysisResult | null;
}

const ScoreBar = ({ score, categoryName }: { score: number; categoryName: string }) => {
    const barRef = (node: HTMLDivElement | null) => {
        if (node) {
            node.style.setProperty('--score-width', `${score}%`);
        }
    };

    return (
        <div className="score-bar-container">
            <div
                ref={barRef}
                className={`score-bar-fill ${categoryName}`}
            />
        </div>
    );
};

export const ScoreCard: React.FC<ScoreCardProps> = ({ result }) => {
    if (!result) return null;

    const { score, status, categories } = result;

    const size = 160;
    const strokeWidth = 12;
    const center = size / 2;
    const radius = center - strokeWidth;
    const circumference = 2 * Math.PI * radius;

    type CategoryItem = { name: string; score: number; weight?: number; violationCount?: number };
    const categoryArray: CategoryItem[] = Array.isArray(categories)
        ? categories as CategoryItem[]
        : Object.entries(categories).map(([key, val]) =>
            typeof val === 'object' && val !== null ? val as CategoryItem : { name: key, score: val as number, weight: 0, violationCount: 0 }
        );

    const totalCategories = categoryArray.length;
    const segmentLength = circumference / totalCategories;
    const gapLength = 4;

    const getCategoryColor = (categoryName: string, index: number) => {
        const colorMap: Record<string, string> = {
            'security': '#ef4444',
            'structural': '#06b6d4',
            'documentation': '#3b82f6',
            'apiDesign': '#8b5cf6',
            'dataModels': '#f59e0b',
            'errorHandling': '#10b981',
        };
        return colorMap[categoryName] || ['#ef4444', '#8b5cf6', '#3b82f6', '#f59e0b', '#10b981', '#06b6d4'][index % 6];
    };

    return (
        <div className="flex flex-col gap-6 mb-8 animate-fade-in w-full">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex flex-col items-center justify-center shadow-lg shadow-slate-900/50 hover:border-blue-500/30 transition-all duration-300 shrink-0">
                <h3 className="text-xs font-semibold mb-6 uppercase tracking-widest text-slate-400">
                    Quality Score
                </h3>

                <div className="relative flex items-center justify-center mb-2">
                    <svg width={size} height={size} className="transform -rotate-90">
                        <circle
                            cx={center}
                            cy={center}
                            r={radius}
                            fill="transparent"
                            stroke="#334155"
                            strokeWidth={strokeWidth}
                        />

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

            <div className="w-full bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-lg shadow-slate-900/50 hover:border-blue-500/30 transition-all duration-300">
                <h3 className="text-xs font-semibold mb-5 uppercase tracking-widest text-slate-400">
                    Category Breakdown
                </h3>

                <div className="flex flex-col gap-4">
                    {categoryArray.map((category) => {
                        return (
                            <div key={category.name} className="flex items-center gap-4 w-full">
                                <div className="w-32 flex-shrink-0">
                                    <span className="text-sm font-medium text-slate-200 capitalize truncate block">
                                        {category.name}
                                    </span>
                                </div>

                                <div className="flex-grow min-w-0">
                                    <ScoreBar score={category.score} categoryName={category.name} />
                                </div>

                                <div className="w-10 text-right flex-shrink-0">
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
