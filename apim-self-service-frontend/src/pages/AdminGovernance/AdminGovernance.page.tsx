import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../layouts/MainLayout/MainLayout.view';
import { useStore } from '../../store/useStore';
import {
    TeamManager,
    OrphanProductManager,
    OrphanSubscriptionManager,
    OrphanNamedValueManager,
    OrphanBackendManager
} from '../../features/admin';
import { useGovernanceStore } from '../../features/governance';

/**
 * AdminGovernancePage Controller
 * 
 * ------------------------------------------------------------------
 * 📍 Purpose:
 * Route Entry Point for `/admin/governance`.
 * Central Hub for Platform Admins to manage Teams, Orphaned Products, and Global Policies.
 * 
 * 🔄 Data Flow:
 * 1. Checks `user.role` -> Redirects if not 'admin'.
 * 2. `useGovernanceStore` -> Fetches Approval Requests and Audit Logs.
 * 3. `TeamManager` (Admin Feature) -> Manages Team entities.
 * 4. `OrphanProductManager` (Admin Feature) -> Reclaims products with missing owners.
 * 
 * 🧩 MFE Boundaries:
 * - This Page orchestrates the "Admin", "Governance", and "Teams" features.
 * - It serves as a secure, role-gated entry point.
 * ------------------------------------------------------------------
 */
export const AdminGovernancePage = () => {
    const { user, setPageTitle } = useStore();
    const { approvalRequests: _approvalRequests } = useGovernanceStore();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'teams' | 'orphans' | 'subscriptions' | 'named-values' | 'backends'>('teams');

    useEffect(() => {
        setPageTitle('Admin Governance');
        if (user && user.role !== 'admin') {
            navigate('/');
        }
    }, [user, navigate, setPageTitle]);

    if (!user || user.role !== 'admin') {
        return null;
    }

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto px-6 w-full pt-16 pb-24">
                <div className="mb-10">
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4">
                        Platform Governance <span className="text-blue-500">.</span>
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl">
                        Manage teams, map AD groups to environments, and reclaim orphan resources (Products, Subscriptions, Named Values, Backends) to ensure Day 1 operational readiness.
                    </p>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-8 border-b border-gray-200 dark:border-slate-800 mb-8 overflow-x-auto whitespace-nowrap scrollbar-hide">
                    <button
                        onClick={() => setActiveTab('teams')}
                        className={`pb-4 text-sm font-bold tracking-wide uppercase transition-all duration-200 border-b-2 ${activeTab === 'teams'
                            ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                            : 'text-gray-500 hover:text-gray-800 dark:text-slate-500 dark:hover:text-slate-200 border-transparent'
                            }`}
                    >
                        Team & Identity Map
                    </button>
                    <button
                        onClick={() => setActiveTab('orphans')}
                        className={`pb-4 text-sm font-bold tracking-wide uppercase transition-all duration-200 border-b-2 ${activeTab === 'orphans'
                            ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                            : 'text-gray-500 hover:text-gray-800 dark:text-slate-500 dark:hover:text-slate-200 border-transparent'
                            }`}
                    >
                        Product Reclamation
                    </button>
                    <button
                        onClick={() => setActiveTab('subscriptions')}
                        className={`pb-4 text-sm font-bold tracking-wide uppercase transition-all duration-200 border-b-2 ${activeTab === 'subscriptions'
                            ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                            : 'text-gray-500 hover:text-gray-800 dark:text-slate-500 dark:hover:text-slate-200 border-transparent'
                            }`}
                    >
                        Subscription Reclamation
                    </button>
                    <button
                        onClick={() => setActiveTab('named-values')}
                        className={`pb-4 text-sm font-bold tracking-wide uppercase transition-all duration-200 border-b-2 ${activeTab === 'named-values'
                            ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                            : 'text-gray-500 hover:text-gray-800 dark:text-slate-500 dark:hover:text-slate-200 border-transparent'
                            }`}
                    >
                        Named Value Reclamation
                    </button>
                    <button
                        onClick={() => setActiveTab('backends')}
                        className={`pb-4 text-sm font-bold tracking-wide uppercase transition-all duration-200 border-b-2 ${activeTab === 'backends'
                            ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                            : 'text-gray-500 hover:text-gray-800 dark:text-slate-500 dark:hover:text-slate-200 border-transparent'
                            }`}
                    >
                        Backend Reclamation
                    </button>
                </div>

                {/* Content Area */}
                <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-premium min-h-[500px]">
                    {activeTab === 'teams' && <TeamManager />}
                    {activeTab === 'orphans' && <OrphanProductManager />}
                    {activeTab === 'subscriptions' && <OrphanSubscriptionManager />}
                    {activeTab === 'named-values' && <OrphanNamedValueManager />}
                    {activeTab === 'backends' && <OrphanBackendManager />}
                </div>
            </div>
        </MainLayout>
    );
};
