import React from 'react';

interface StatCardProps {
    label: string;
    value: string | number;
    description?: string;
    icon?: React.ReactNode;
    trend?: {
        value: string;
        isPositive: boolean;
    };
    className?: string;
}

/**
 * StatCard - A premium microfrontend component for displaying key metrics.
 * Designed with clean lines, subtle shadows, and a modern aesthetic.
 */
export const StatCard: React.FC<StatCardProps> = ({
    label,
    value,
    description,
    icon,
    trend,
    className = '',
}) => {
    return (
        <div className={`
            bg-white dark:bg-slate-800/80
            rounded-2xl shadow-premium border border-gray-100 dark:border-slate-700/50
            p-6 flex flex-col gap-3
            hover:shadow-premium-hover transition-all duration-400 transform hover:-translate-y-1.5
            cursor-default group relative overflow-hidden
            ${className}
        `}>
            {/* Subtle Gradient Background */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-500/10 transition-colors" />

            <div className="flex justify-between items-center relative z-10">
                <div className="text-[11px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.15em]">
                    {label}
                </div>
                {icon && (
                    <div className="text-xl opacity-80 group-hover:scale-125 transition-transform duration-500 transform-gpu">
                        {icon}
                    </div>
                )}
            </div>

            <div className="flex items-end justify-between relative z-10">
                <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">
                        {value}
                    </div>
                </div>
                {trend && (
                    <div className={`
                        flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full
                        ${trend.isPositive ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' : 'text-rose-600 bg-rose-50 dark:bg-rose-900/20'}
                    `}>
                        {trend.isPositive ? '↗' : '↘'} {trend.value}
                    </div>
                )}
            </div>

            {description && (
                <div className="mt-1 text-[11px] text-gray-400 dark:text-slate-500 truncate font-medium relative z-10">
                    {description}
                </div>
            )}
        </div>
    );
};
