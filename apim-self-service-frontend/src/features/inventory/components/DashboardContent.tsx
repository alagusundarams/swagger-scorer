import React from 'react';
import { ProductProducerCard } from './ProductProducerCard';
import { ProductConsumerCard } from './ProductConsumerCard';
import { ApprovalRequestCard } from './ApprovalRequestCard';
import { type ApprovalRequest } from '../../../types/workflow';

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
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-12 border border-gray-100 dark:border-slate-700 h-[28rem] animate-pulse shadow-sm">
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
        return (
            <div className="flex flex-col items-center justify-center py-48 bg-slate-50/30 dark:bg-slate-800/20 rounded-[4rem] border-2 border-dashed border-gray-100 dark:border-slate-800">
                <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full shadow-premium flex items-center justify-center text-4xl mb-8">👻</div>
                <p className="text-slate-300 dark:text-slate-600 text-2xl font-black uppercase tracking-widest mb-4">No Records Encountered</p>
                <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">Verify your search criteria or team context.</p>
            </div>
        );
    }

    if (activeTab === 'approvals') {
        return (
            <div className="grid grid-cols-1 gap-6">
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
