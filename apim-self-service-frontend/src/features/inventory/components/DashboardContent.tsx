import React from 'react';
import { ProductProducerCard } from './ProductProducerCard';
import { ProductConsumerCard } from './ProductConsumerCard';
import { ApprovalRequestCard } from './ApprovalRequestCard';
import { type ApprovalRequest } from '../../governance/types/governanceTypes';

interface DashboardContentProps {
    isLoading: boolean;
    activeTab: 'produced' | 'consumed' | 'admin' | 'approvals';
    paginatedItems: any[];
    revealedKeys: Set<string>;
    handleToggleReveal: (id: string) => void;
    handleCopyKey: (key: string) => void;
    showToast: (msg: string) => void;
    navigate: (url: string) => void;
}

export const DashboardContent: React.FC<DashboardContentProps> = ({
    isLoading,
    activeTab,
    paginatedItems,
    revealedKeys,
    handleToggleReveal,
    handleCopyKey,
    showToast,
    navigate
}) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-3xl p-12 border border-gray-100 dark:border-slate-700 h-[28rem] animate-pulse shadow-sm">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-slate-900 rounded-2xl mb-10"></div>
                        <div className="w-3/4 h-10 bg-gray-50 dark:bg-slate-900 rounded-xl mb-8"></div>
                        <div className="w-full h-4 bg-gray-50 dark:bg-slate-900 rounded-lg mb-4"></div>
                        <div className="w-2/3 h-4 bg-gray-50 dark:bg-slate-900 rounded-lg"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (paginatedItems.length === 0) {
        // Distinguish between "No Search Results" and "Zero State"
        // This is a simplified check; ideally we check 'totalItems' before filtering.
        // For now, we assume if filter is empty, it's a search issue, but we can make it friendlier.
        return (
            <div className="flex flex-col items-center justify-center w-full min-h-[400px] py-16 bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700/50">
                <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl shadow-lg flex items-center justify-center text-4xl mb-6">✨</div>
                <h3 className="text-gray-900 dark:text-white text-xl font-bold mb-2">No APIs Found</h3>
                <p className="text-gray-500 dark:text-slate-400 text-sm mb-8 text-center max-w-sm">
                    {activeTab === 'produced'
                        ? "You haven't onboarded any products yet. Start your journey by defining your first API."
                        : "No matching records found. Try adjusting your filters."}
                </p>
                {activeTab === 'produced' && (
                    <button
                        onClick={() => navigate('/onboard')}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
                    >
                        + Onboard New Product
                    </button>
                )}
            </div>
        );
    }

    if (activeTab === 'approvals') {
        return (
            <div className="grid grid-cols-1 gap-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Audit Decisions</h2>
                    <span className="text-xs text-gray-400">Decision Queue</span>
                </div>
                {paginatedItems.map((item: any) => (
                    <ApprovalRequestCard
                        key={item.id}
                        request={item as ApprovalRequest}
                        onToast={showToast}
                    />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {paginatedItems.map((item) => (
                activeTab === 'consumed' ? (
                    <ProductConsumerCard
                        key={item.id}
                        product={item}
                        isRevealed={item.subscription ? revealedKeys.has(item.subscription.id) : false}
                        onToggleReveal={() => item.subscription && handleToggleReveal(item.subscription.id)}
                        onCopyKey={handleCopyKey}
                        onClick={() => navigate(`/products/${item.id}`)}
                    />
                ) : (
                    <ProductProducerCard
                        key={item.id}
                        product={item}
                        onClick={() => navigate(`/products/${item.id}`)}
                    />
                )
            ))}
        </div>
    );
};
