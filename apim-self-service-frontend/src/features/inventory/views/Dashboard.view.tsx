import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { type Product, type Subscription, type Environment } from '../../../types/entities';
import { type ApprovalRequest } from '../../../types/workflow';
import { MainLayout } from '../../../layouts/MainLayout/MainLayout.view';
import { useStore } from '../../../store/useStore';
import { DashboardPagination } from '../components/DashboardPagination';
import { DashboardHero } from '../components/DashboardHero';
import { DashboardFilters } from '../components/DashboardFilters';
import { canAccessProduct, getAccessibleEnvironments } from '../../../utils/productRoleDetection';
import { DashboardStatsGrid } from '../components/DashboardStatsGrid';
import { DashboardTabs } from '../components/DashboardTabs';
import { DashboardContent } from '../components/DashboardContent';
import '../inventory.css';

type ProductWithSubscription = Product & { subscription: Subscription };

export const DashboardPage = () => {
    const navigate = useNavigate();
    const { setPageTitle } = useStore();

    const {
        user,
        activeTeamId,
        setActiveTeamId,
        products: allProducts,
        subscriptions: allSubscriptions,
        teams: allTeams,
        approvalRequests: enhancedApprovals,
        error,
        isLoading
    } = useStore();

    useEffect(() => {
        setPageTitle('Dashboard');

        // Refined Admin Day 1: Land admins on the Global Inventory by default
        if (user?.role === 'admin' && activeTeamId === 'all') {
            navigate('/admin/global-inventory');
        }
    }, [user, activeTeamId, navigate, setPageTitle]);

    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<'produced' | 'consumed' | 'admin' | 'approvals'>(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam === 'produced' || tabParam === 'consumed' || tabParam === 'admin' || tabParam === 'approvals') {
            return tabParam;
        }
        return 'produced';
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEnvironment, setSelectedEnvironment] = useState<Environment>('ALL');
    const [currentPage, setCurrentPage] = useState(1);
    const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

    const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: '', show: false });
    const pageSize = 9;

    const [adminProducts, setAdminProducts] = useState<Product[]>([]);

    useEffect(() => {
        if (activeTab === 'admin') {
            import('../api/inventoryClient').then(({ getAdminProducts }) => {
                getAdminProducts().then(res => {
                    const sanitizedData = res.data.map((p: any) => ({
                        ...p,
                        state: (p.state?.toLowerCase() === 'published' ? 'published' : (p.state?.toLowerCase() === 'draft' ? 'draft' : 'notPublished')) as any
                    }));
                    setAdminProducts(sanitizedData);
                });
            });
        }
    }, [activeTab]);

    const userTeams = useMemo(() => allTeams.filter(t => user?.teams.includes(t.id)), [allTeams, user]);

    const myProducts = useMemo(() => {
        if (!user) return [];
        const teamIds = activeTeamId === 'all' ? user.teams : [activeTeamId];
        let filtered = allProducts.filter(p => teamIds.includes(p.ownerTeamId));
        if (selectedEnvironment !== 'ALL') {
            filtered = filtered.filter(p => p.environment === selectedEnvironment);
        }
        return filtered;
    }, [user, activeTeamId, selectedEnvironment, allProducts]);

    const subscribedProducts = useMemo((): ProductWithSubscription[] => {
        if (!user) return [];
        const teamIds = activeTeamId === 'all' ? user.teams : [activeTeamId];
        const subscriptions = allSubscriptions.filter(s =>
            teamIds.includes(s.subscriberTeamId) && s.state === 'active'
        );
        return subscriptions.map(sub => {
            const product = allProducts.find(p => p.id === sub.productId);
            if (!product || !canAccessProduct(product, user)) return null;
            return { ...product, subscription: sub };
        }).filter((p): p is ProductWithSubscription => p !== null);
    }, [user, activeTeamId, allProducts, allSubscriptions]);

    const pendingApprovals = useMemo(() => {
        if (!user) return [];
        return enhancedApprovals.filter(req => {
            if (req.status !== 'PENDING') return false;
            if (user.role === 'admin') return true;
            if (req.approverTeamId && user.leadsTeams.includes(req.approverTeamId)) {
                return true;
            }
            return false;
        });
    }, [enhancedApprovals, user]);

    const accessibleEnvironments = useMemo(() => {
        const currentActiveTeam = allTeams.find(t => t.id === activeTeamId);
        return getAccessibleEnvironments(user, currentActiveTeam || null);
    }, [user, activeTeamId, allTeams]);

    const handleTabChange = (tab: 'produced' | 'consumed' | 'admin' | 'approvals') => {
        setActiveTab(tab);
        setCurrentPage(1);
    };

    const handlePageChange = (newPage: number) => {
        setCurrentPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const baseData = useMemo(() => {
        if (activeTab === 'produced') return myProducts;
        if (activeTab === 'consumed') return subscribedProducts;
        if (activeTab === 'approvals') return pendingApprovals;
        if (activeTab === 'admin') return adminProducts;
        return [];
    }, [activeTab, myProducts, subscribedProducts, adminProducts, pendingApprovals]);

    const filteredData = useMemo(() => {
        if (!searchQuery) return baseData;
        const query = searchQuery.toLowerCase();

        return baseData.filter((item: Product | ProductWithSubscription | ApprovalRequest) => {
            if ('displayName' in item && 'ownerTeamId' in item) {
                const product = item as Product;
                return (
                    product.displayName?.toLowerCase().includes(query) ||
                    product.description?.toLowerCase().includes(query)
                );
            }
            if ('type' in item && 'requester' in item) {
                const approval = item as ApprovalRequest;
                return (
                    approval.type.toLowerCase().includes(query) ||
                    approval.requester.name.toLowerCase().includes(query) ||
                    approval.requester.email.toLowerCase().includes(query) ||
                    approval.requester.teamName.toLowerCase().includes(query) ||
                    approval.details?.targetName?.toLowerCase().includes(query)
                );
            }
            return false;
        });
    }, [baseData, searchQuery]);

    const totalPages = Math.ceil(filteredData.length / pageSize);
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredData.slice(start, start + pageSize);
    }, [filteredData, currentPage]);

    const heroStats = useMemo(() => {
        if (activeTab === 'produced') {
            return [
                { label: 'Total Products', value: myProducts.length, icon: '📦' },
                { label: 'Avg Quality Score', value: `${Math.round(myProducts.reduce((acc: number, p: Product) => acc + (p.qualityScore || 0), 0) / (myProducts.length || 1))}%`, icon: '📈' },
                { label: 'Active Subscribers', value: myProducts.reduce((acc: number, p: Product) => acc + (p.subscriberCount || 0), 0), icon: '👥' }
            ];
        }
        if (activeTab === 'admin') {
            return [
                { label: 'Global Inventory', value: adminProducts.length, icon: '🌐' },
                { label: 'Avg Quality', value: `${Math.round(adminProducts.reduce((acc, p) => acc + (p.qualityScore || 0), 0) / (adminProducts.length || 1))}%`, icon: '⚖️' },
                { label: 'Production APIs', value: adminProducts.filter(p => p.environment === 'PROD').length, icon: '🚀' },
                { label: 'Draft APIs', value: adminProducts.filter(p => p.state === 'draft').length, icon: '📝' }
            ];
        }
        if (activeTab === 'approvals') {
            const highRiskCount = pendingApprovals.filter((a: ApprovalRequest) => a.details.environment === 'PROD' || a.details.environment === 'STAGE').length;
            const uniqueTeams = new Set(pendingApprovals.map((a: ApprovalRequest) => a.requester.teamId)).size;

            return [
                { label: 'Pending Decisions', value: pendingApprovals.length, icon: '⏱️' },
                { label: 'High Risk (PROD)', value: highRiskCount, icon: '🚩' },
                { label: 'Blocked Teams', value: uniqueTeams, icon: '👥' },
                { label: 'SLA Status', value: '4 At Risk', icon: '🔴' }
            ];
        }
        return [
            { label: 'Active Subscriptions', value: subscribedProducts.length, icon: '📥' },
            { label: 'Provider Diversity', value: new Set(subscribedProducts.map((p: ProductWithSubscription) => p.ownerTeamId)).size, icon: '🌐' },
            { label: 'Environment Mix', value: 'PROD / DEV', icon: '🏗️' }
        ];
    }, [activeTab, myProducts, subscribedProducts, adminProducts, pendingApprovals]);

    const showToast = (message: string) => {
        setToast({ message, show: true });
        setTimeout(() => setToast({ message: '', show: false }), 3000);
    };

    const handleCopyKey = async (keyValue: string) => {
        await navigator.clipboard.writeText(keyValue);
        showToast('Key copied to clipboard!');
    };

    const handleToggleReveal = (subscriptionId: string) => {
        setRevealedKeys((prev: Set<string>) => {
            const next = new Set(prev);
            if (next.has(subscriptionId)) next.delete(subscriptionId);
            else next.add(subscriptionId);
            return next;
        });
    };

    return (
        <MainLayout>
            {toast.show && (
                <div className="fixed top-24 right-8 bg-slate-900 border-white/10 border dark:bg-blue-600 text-white px-8 py-5 rounded-3xl shadow-2xl z-50 animate-fade-in flex items-center gap-4 font-bold text-xs uppercase tracking-widest backdrop-blur-md">
                    <span className="bg-white/20 p-2 rounded-full text-lg">💡</span> {toast.message}
                </div>
            )}

            <div className="max-w-7xl mx-auto px-6 w-full pt-16 pb-24">
                <DashboardHero activeTab={activeTab} />

                {user?.role === 'admin' && (
                    <div className="flex justify-end mb-4 animate-fade-in">
                        <button
                            onClick={() => navigate('/admin/mapping')}
                            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:scale-105 transition shadow-lg flex items-center gap-2"
                        >
                            <span>⚡</span> Admin Mapping
                        </button>
                    </div>
                )}

                {error && (
                    <div className="mb-8 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-between text-red-500 animate-fade-in backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <h3 className="font-bold text-lg">System Alert</h3>
                                <p className="text-sm opacity-80">{error}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-bold text-xs uppercase tracking-widest"
                        >
                            Reconnect
                        </button>
                    </div>
                )}

                <DashboardFilters
                    searchQuery={searchQuery}
                    onSearchChange={(q) => { setSearchQuery(q); setCurrentPage(1); }}
                    selectedEnvironment={selectedEnvironment}
                    onEnvironmentChange={(e) => { setSelectedEnvironment(e); setCurrentPage(1); }}
                    activeTeamId={activeTeamId}
                    onTeamChange={(t) => { setActiveTeamId(t); setCurrentPage(1); }}
                    userTeams={userTeams}
                    accessibleEnvironments={accessibleEnvironments}
                    isFiltersDisabled={{
                        environment: activeTab === 'admin' || activeTab === 'approvals',
                        team: activeTab === 'admin'
                    }}
                />

                <DashboardStatsGrid heroStats={heroStats} />

                <DashboardTabs
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    pendingApprovalsCount={pendingApprovals.length}
                    showAdminTab={user?.role === 'admin'}
                />

                <div className="min-h-[500px]">
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

                    {!isLoading && (
                        <DashboardPagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filteredData.length}
                            onPageChange={handlePageChange}
                        />
                    )}
                </div>
            </div>
        </MainLayout>
    );
};
