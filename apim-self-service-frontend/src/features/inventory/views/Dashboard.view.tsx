import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { type Product, type Subscription, type Environment } from '../../../types/entities';
import { type ApprovalRequest } from '../../../types/workflow';
import { MainLayout } from '../../../layouts/MainLayout/MainLayout.view';
import '../inventory.css';
import { useStore } from '../../../store/useStore';
import { DashboardPagination } from '../components/DashboardPagination';
import { DashboardHero } from '../components/DashboardHero';
import { DashboardFilters } from '../components/DashboardFilters';
import { canAccessProduct } from '../../../utils/productRoleDetection';

type ProductWithSubscription = Product & { subscription: Subscription };

import { DashboardStatsGrid } from '../components/DashboardStatsGrid';
import { DashboardTabs } from '../components/DashboardTabs';
import { DashboardContent } from '../components/DashboardContent';
import { useEffect } from 'react';
import { USE_MOCKS } from '../../../config/env';

export const DashboardPage = () => {
    const navigate = useNavigate();
    const { setPageTitle } = useStore();

    useEffect(() => {
        setPageTitle('Dashboard');
    }, [setPageTitle]);

    const {
        user,
        activeTeamId,
        setActiveTeamId,
        products: allProducts,
        subscriptions: allSubscriptions,
        teams: allTeams,
        approvalRequests: enhancedApprovals
    } = useStore();

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
    const [isLoading, setIsLoading] = useState(false);
    const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

    const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: '', show: false });
    const pageSize = 9;

    const adminMockData = useMemo(() => {
        if (!USE_MOCKS) return [];
        return Array.from({ length: 112 }).map((_, i) => ({
            id: `admin-api-${i}`,
            name: `ent-api-${i}`,
            displayName: `Enterprise ${['Core', 'Security', 'Data', 'Audit', 'Finance'][i % 5]} API ${i + 1}`,
            description: `Global administrative endpoint for ${['identity management', 'transaction auditing', 'real-time analytics', 'ledger synchronization', 'policy enforcement'][i % 5]} across all production gateways.`,
            version: `v${(i % 3) + 1}.0.${i % 10}`,
            state: (i % 15 === 0 ? 'Review' : 'Published'),
            ownerTeamId: i % 2 === 0 ? 'team-cloudops' : 'team-security',
            apis: Array.from({ length: (i % 8) + 1 }),
            qualityScore: 70 + (i % 30),
            subscriberCount: (i * 12) % 200,
            environments: ['Dev', 'QA', 'Prod'],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isMock: true
        } as unknown as Product));
    }, []);

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
        return enhancedApprovals.filter(req => req.status === 'PENDING');
    }, [enhancedApprovals, user]);

    const handleTabChange = (tab: 'produced' | 'consumed' | 'admin' | 'approvals') => {
        setIsLoading(true);
        setActiveTab(tab);
        setCurrentPage(1);
        setTimeout(() => setIsLoading(false), 450);
    };

    const handlePageChange = (newPage: number) => {
        setIsLoading(true);
        setCurrentPage(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => setIsLoading(false), 400);
    };

    const baseData = useMemo(() => {
        if (activeTab === 'produced') return myProducts;
        if (activeTab === 'consumed') return subscribedProducts;
        if (activeTab === 'approvals') return pendingApprovals;
        if (!USE_MOCKS && activeTab === 'admin') return allProducts;
        return adminMockData;
    }, [activeTab, myProducts, subscribedProducts, adminMockData, pendingApprovals, allProducts]);

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
                { label: 'Global Inventory', value: USE_MOCKS ? adminMockData.length : allProducts.length, icon: '🌐' },
                { label: 'Deployments (Demo)', value: '342', icon: '🚀' },
                { label: 'Compliance (Demo)', value: '94%', icon: '⚖️' },
                { label: 'Load (Demo)', value: '12%', icon: '📉' }
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
    }, [activeTab, myProducts, subscribedProducts, adminMockData, pendingApprovals, allProducts]);

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
                <div className="fixed top-24 right-8 bg-slate-900 dark:bg-blue-600 text-white px-8 py-5 rounded-[1.5rem] shadow-2xl z-50 animate-fade-in flex items-center gap-4 font-black text-xs uppercase tracking-widest border border-white/10 backdrop-blur-md">
                    <span className="bg-white/20 p-2 rounded-full text-lg">💡</span> {toast.message}
                </div>
            )}

            <div className="max-w-7xl mx-auto px-6 w-full pt-16 pb-24">
                <DashboardHero activeTab={activeTab} />

                <DashboardFilters
                    searchQuery={searchQuery}
                    onSearchChange={(q) => { setSearchQuery(q); setCurrentPage(1); }}
                    selectedEnvironment={selectedEnvironment}
                    onEnvironmentChange={(e) => { setSelectedEnvironment(e); setCurrentPage(1); }}
                    activeTeamId={activeTeamId}
                    onTeamChange={(t) => { setActiveTeamId(t); setCurrentPage(1); }}
                    userTeams={userTeams}
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
