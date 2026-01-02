import React from 'react';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'circular' | 'rectangular';
}

/**
 * Premium Skeleton Loader Component
 * 
 * Provides a subtle pulsed fallback for content during data fetching.
 */
export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rectangular' }) => {
    const baseClass = "animate-pulse bg-gray-100 dark:bg-slate-800/50";
    const variantClass = variant === 'circular' ? 'rounded-full' : 'rounded-2xl';

    return (
        <div className={`${baseClass} ${variantClass} ${className}`} />
    );
};

export const DashboardSkeleton = () => (
    <div className="space-y-12 py-12">
        {/* Hero Skeleton */}
        <div className="space-y-4">
            <Skeleton className="h-12 w-1/3" />
            <Skeleton className="h-6 w-1/2" />
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
            ))}
        </div>

        {/* Filters Skeleton */}
        <div className="flex gap-4 items-center">
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-12 w-32" />
        </div>

        {/* Content Tabs Skeleton */}
        <div className="space-y-6">
            <div className="flex gap-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <Skeleton key={i} className="h-64 w-full" />
                ))}
            </div>
        </div>
    </div>
);
