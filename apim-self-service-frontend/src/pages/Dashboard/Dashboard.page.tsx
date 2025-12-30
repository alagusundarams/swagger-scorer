import { useState, useMemo, useEffect, useCallback, Suspense, lazy } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { type Product, type Environment } from '../../features/inventory/types/inventoryTypes';
import { type Subscription } from '../../features/consumer/types/consumerTypes';
import { MainLayout } from '../../layouts/MainLayout/MainLayout.view';
import { useStore } from '../../store/useStore';
import { useInventoryStore } from '../../features/inventory/hooks/useInventoryStore';
import { useTeamsStore } from '../../features/teams/store/teamsStore';
import { useConsumerStore } from '../../features/consumer/store/consumerStore';
import { useGovernanceStore } from '../../features/governance/store/governanceStore';
import { DashboardPagination } from '../../features/inventory/components/dashboard/DashboardPagination';
import { DashboardHero } from '../../features/inventory/components/dashboard/DashboardHero';
import { DashboardFilters } from '../../features/inventory/components/dashboard/DashboardFilters';
import { getAccessibleEnvironments } from '../../features/inventory/utils/productRoleDetection';
import { DashboardStatsGrid } from '../../features/inventory/components/dashboard/DashboardStatsGrid';
import { DashboardTabs } from '../../features/inventory/components/dashboard/DashboardTabs';
import { DashboardContent } from '../../features/inventory/components/dashboard/DashboardContent';
// const GlobalInventory = lazy(() => import('../../features/admin/views/GlobalInventory.view').then(module => ({ default: module.GlobalInventory })));
import '../../features/inventory/inventory.css';
import { filterProducts, matchesSearchQuery } from '../../utils/filterUtils';


export const DashboardPage = () => {
    const navigate = useNavigate();
    const { setPageTitle, user, activeTeamId, setActiveTeamId } = useStore();

    const {
        products: allProducts,
        isLoading: invLoading,
        fetchInventory
    } = useInventoryStore();

    const {
        subscriptions: allSubscriptions,
        isLoading: subLoading,
        fetchSubscriptions
    } = useConsumerStore();

    const {
        teams: allTeams,
        isLoading: teamsLoading,
        fetchTeams
    } = useTeamsStore();

    const {
        approvalRequests: enhancedApprovals,
        isLoading: govLoading,
        fetchApprovals
    } = useGovernanceStore();

    const isLoading = invLoading || subLoading || teamsLoading || govLoading;

    useEffect(() => {
        fetchInventory();
        fetchSubscriptions();
        fetchTeams();
        fetchApprovals();
    }, [fetchInventory, fetchSubscriptions, fetchTeams, fetchApprovals]);

    useEffect(() => {
        setPageTitle('Dashboard');
    }, [setPageTitle]);

    // --- Search Params ---
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = (searchParams.get('tab') || 'produced') as 'produced' | 'consumed' | 'approvals' | 'admin';
    const activeEnv = (searchParams.get('env') || 'ALL') as Environment;
    const activeRegion = searchParams.get('region') || 'ALL';
    const itemsPerPage = 6;
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');

    // --- Local UI State for Content ---
    const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
    const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: '', show: false });

    // --- Permissions Hub ---
    const currentTeam = useMemo(() => allTeams.find(t => t.id === activeTeamId) || null, [allTeams, activeTeamId]);
    const allowedEnvironments = useMemo(() => getAccessibleEnvironments(user, currentTeam), [user, currentTeam]);
    const userTeams = useMemo(() => allTeams.filter(t => user?.teams.includes(t.id)), [allTeams, user]);

    // Ensure selected environment is allowed for current team/role
    useEffect(() => {
        if (activeEnv !== 'ALL' && !allowedEnvironments.includes(activeEnv)) {
            setSearchParams(prev => {
                prev.set('env', 'ALL');
                return prev;
            });
        }
    }, [activeEnv, allowedEnvironments, setSearchParams]);

    // --- Data Derivation & Filtering ---
    const producerProducts = useMemo(() => {
        return filterProducts(allProducts, {
            ownerTeamId: activeTeamId,
            environment: activeEnv,
            searchQuery
        });
    }, [allProducts, activeTeamId, activeEnv, searchQuery]);

    const consumerProducts = useMemo(() => {
        let baseProducts = allSubscriptions
            .filter(s => {
                const isSubscribed = activeTeamId === 'all'
                    ? user?.teams.includes(s.subscriberTeamId)
                    : s.subscriberTeamId === activeTeamId;
                return isSubscribed && (s.state === 'active' || s.state === 'pending');
            })
            .map(s => {
                const product = allProducts.find(p => p.id === s.productId);
                if (!product) return null;
                return {
                    ...product,
                    subscription: s
                };
            })
            .filter(Boolean) as (Product & { subscription: Subscription })[];

        return filterProducts(baseProducts, {
            environment: activeEnv,
            searchQuery
        });
    }, [allSubscriptions, allProducts, activeTeamId, user, activeEnv, searchQuery]);

    const approvalRequests = useMemo(() => {
        let result = enhancedApprovals;

        if (activeTeamId !== 'all') {
            result = result.filter(r => r.approverTeamId === activeTeamId);
        } else if (user) {
            result = result.filter(r => user.leadsTeams.includes(r.approverTeamId) || user.role === 'admin');
        }

        if (searchQuery) {
            result = result.filter(r =>
                matchesSearchQuery({
                    displayName: r.requester.name,
                    description: r.details.reason || ''
                }, searchQuery)
            );
        }

        return result;
    }, [enhancedApprovals, activeTeamId, user, searchQuery]);

    const currentItems = activeTab === 'produced' ? producerProducts : activeTab === 'consumed' ? consumerProducts : approvalRequests;
    const totalPages = Math.ceil(currentItems.length / itemsPerPage);
    const paginatedItems = currentItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // --- Selection Handlers ---
    const handleTabChange = (tab: 'produced' | 'consumed' | 'approvals' | 'admin') => {
        setSearchParams(prev => {
            prev.set('tab', tab);
            return prev;
        });
        setCurrentPage(1);
    };

    const handleEnvChange = (env: Environment) => {
        setSearchParams(prev => {
            prev.set('env', env);
            return prev;
        });
        setCurrentPage(1);
    };

    const handleRegionChange = (region: string) => {
        setSearchParams(prev => {
            prev.set('region', region);
            return prev;
        });
        setCurrentPage(1);
    };

    const showToast = useCallback((message: string) => {
        setToast({ message, show: true });
        setTimeout(() => setToast({ message: '', show: false }), 3000);
    }, []);

    const handleToggleReveal = useCallback((id: string) => {
        setRevealedKeys(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handleCopyKey = useCallback((key: string) => {
        navigator.clipboard.writeText(key);
        showToast('API Key copied to clipboard');
    }, [showToast]);

    if (isLoading) {
        return (
            <MainLayout>
                <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading your assets...</p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    const heroStats = [
        { label: 'PROVIDER', value: producerProducts.length, icon: '🏢' },
        { label: 'CONSUMER', value: consumerProducts.length, icon: '🔌' },
        { label: 'PENDING', value: approvalRequests.length, icon: '⚖️' }
    ];

    return (
        <MainLayout>
            {toast.show && (
                <div className="fixed top-24 right-8 bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl z-[100] animate-fade-in font-bold text-sm tracking-widest border border-white/10 backdrop-blur-md">
                    ✨ {toast.message}
                </div>
            )}

            <div className="max-w-7xl mx-auto w-full px-6 py-12 relative z-20">
                <DashboardHero activeTab={activeTab} />
                <DashboardStatsGrid heroStats={heroStats} />
                <DashboardFilters
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    selectedEnvironment={activeEnv}
                    onEnvironmentChange={handleEnvChange}
                    selectedRegion={activeRegion}
                    onRegionChange={handleRegionChange}
                    activeTeamId={activeTeamId}
                    onTeamChange={setActiveTeamId}
                    userTeams={userTeams}
                    accessibleEnvironments={allowedEnvironments}
                />

                <div className="flex flex-col min-h-[600px] mt-12">
                    {(user?.role === 'admin' && activeTeamId === 'all') ? (
                        <div className="animate-fade-in">
                            <div className="flex justify-end mb-4">
                                <button
                                    onClick={() => navigate('/admin/mapping')}
                                    className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-indigo-100 transition-all flex items-center gap-2"
                                >
                                    <span>⚠️</span>
                                    <span>Manage Orphans</span>
                                </button>
                            </div>
                            {/* TODO: Restore GlobalInventory when component is ready */}
                            {/* <Suspense fallback={<div className="p-20 text-center animate-pulse text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Global Inventory...</div>}>
                                <GlobalInventory embedded />
                            </Suspense> */}
                        </div>
                    ) : (
                        <>
                            <DashboardTabs
                                activeTab={activeTab}
                                onTabChange={handleTabChange}
                                pendingApprovalsCount={approvalRequests.length}
                                showAdminTab={user?.role === 'admin'}
                            />

                            <div className="flex-1 mt-8">
                                <DashboardContent
                                    isLoading={isLoading}
                                    activeTab={activeTab}
                                    paginatedItems={paginatedItems}
                                    revealedKeys={revealedKeys}
                                    handleToggleReveal={handleToggleReveal}
                                    handleCopyKey={handleCopyKey}
                                    showToast={showToast}
                                    navigate={navigate}
                                />
                            </div>

                            {totalPages > 1 && (
                                <div className="mt-12">
                                    <DashboardPagination
                                        currentPage={currentPage}
                                        totalPages={totalPages}
                                        totalItems={currentItems.length}
                                        onPageChange={setCurrentPage}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </MainLayout>
    );
};
