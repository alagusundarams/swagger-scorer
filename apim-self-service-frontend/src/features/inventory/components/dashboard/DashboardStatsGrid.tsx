import React from 'react';
import { StatCard } from './StatCard';

interface DashboardStatsGridProps {
    heroStats: {
        label: string;
        value: string | number;
        icon: string;
        trend?: {
            value: string;
            isPositive: boolean;
        };
    }[];
}

export const DashboardStatsGrid: React.FC<DashboardStatsGridProps> = ({ heroStats }) => {
    return (
        <div className={`grid grid-cols-1 md:grid-cols-2 ${heroStats.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-8 mb-20`}>
            {heroStats.map((stat, idx) => (
                <StatCard
                    key={idx}
                    label={stat.label}
                    value={stat.value}
                    icon={stat.icon}
                    trend={stat.trend}
                />
            ))}
        </div>
    );
};
