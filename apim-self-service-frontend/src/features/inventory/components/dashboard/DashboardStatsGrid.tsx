import React from 'react';
import { StatCard } from '../producer/StatCard';

interface DashboardStatsGridProps {
    heroStats: Array<{
        label: string;
        value: string | number;
        icon: string;
        trend?: {
            value: string;
            isPositive: boolean;
        };
    }>;
}

export const DashboardStatsGrid = ({ heroStats }: DashboardStatsGridProps) => {
    return (
        <div className="stats-grid">
            {heroStats.map((stat, idx) => (
                <StatCard key={idx} {...stat} />
            ))}
        </div>
    );
};
