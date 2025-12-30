import React from 'react';
import { Link } from 'react-router-dom';

interface DashboardTabsProps {
    activeTab: 'produced' | 'consumed' | 'admin' | 'approvals';
    onTabChange: (tab: 'produced' | 'consumed' | 'admin' | 'approvals') => void;
    pendingApprovalsCount: number;
    showAdminTab: boolean;
}

export const DashboardTabs: React.FC<DashboardTabsProps> = ({
    activeTab,
    onTabChange,
    pendingApprovalsCount,
    showAdminTab
}) => {
    return (
        <div className="border-b border-gray-100 dark:border-slate-800 mb-14 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <nav className="-mb-px flex space-x-12 overflow-x-auto w-full pb-1 md:pb-0" aria-label="Tabs">
                <button
                    onClick={() => onTabChange('produced')}
                    className={`${activeTab === 'produced' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'} whitespace-nowrap py-5 px-1 border-b-2 font-black text-[10px] uppercase tracking-[0.2em] transition-all`}
                >
                    MANAGED PRODUCTS
                </button>
                <button
                    onClick={() => onTabChange('consumed')}
                    className={`${activeTab === 'consumed' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'} whitespace-nowrap py-5 px-1 border-b-2 font-black text-[10px] uppercase tracking-[0.2em] transition-all`}
                >
                    ACTIVE SUBSCRIPTIONS
                </button>

                {(pendingApprovalsCount > 0 || activeTab === 'approvals') && (
                    <button
                        onClick={() => onTabChange('approvals')}
                        className={`${activeTab === 'approvals' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'} whitespace-nowrap py-5 px-1 border-b-2 font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3`}
                    >
                        <span className="text-sm">⏱️</span> APPROVALS
                        {pendingApprovalsCount > 0 && (
                            <span className="bg-blue-600 text-white py-0.5 px-2 rounded-lg text-[9px] font-black">{pendingApprovalsCount}</span>
                        )}
                    </button>
                )}

                {showAdminTab && (
                    <button
                        onClick={() => onTabChange('admin')}
                        className={`${activeTab === 'admin' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'} whitespace-nowrap py-5 px-1 border-b-2 font-black text-[10px] uppercase tracking-[0.2em] transition-all`}
                    >
                        <span className="text-sm">🌐</span> GLOBAL INVENTORY
                    </button>
                )}
            </nav>

            <div className="pb-5 shrink-0">
                {activeTab === 'produced' && (
                    <Link to="/onboard" className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest py-4 px-8 rounded-2xl shadow-xl shadow-blue-500/30 transition-all flex items-center gap-3 group">
                        <span className="text-lg group-hover:rotate-90 transition-transform duration-300">+</span> REGISTER NEW API
                    </Link>
                )}
                {activeTab === 'consumed' && (
                    <Link to="/browse" className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-700 dark:text-white font-black text-[10px] uppercase tracking-widest py-4 px-8 rounded-2xl shadow-premium hover:shadow-2xl transition-all flex items-center gap-3">
                        <span className="text-lg">🔍</span> EXPLORE ECOSYSTEM
                    </Link>
                )}
            </div>
        </div>
    );
};
