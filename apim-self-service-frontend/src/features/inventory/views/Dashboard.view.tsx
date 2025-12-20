import { useState, useMemo } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { type Product, type Subscription, type Environment } from '../../../types/entities';
import { MainLayout } from '../../../layouts/MainLayout/MainLayout.view';
import { useStore } from '../../../store/useStore';
import { Input } from '../../../core/ui/Input';
import { Select } from '../../../core/ui/Select';
import { StatCard } from '../components/StatCard';
import { ProductProducerCard } from '../components/ProductProducerCard';
import { ProductConsumerCard } from '../components/ProductConsumerCard';
import { canAccessProduct } from '../../../utils/productRoleDetection';
import { USE_MOCKS } from '../../analyzer/api/client';

/**
 * DashboardPage: The central command center for both API Producers and Consumers.
 * 
 * DESIGN PHILOSOPHY:
 * - Clean Isolation: All data flows from the Zustand `useStore`.
 * - Role-Based UX: Dynamic tabs and actions based on user role and team ownership.
 * - Performance: Memoized selectors and simulated pagination for large-scale enterprise data.
 * - Feedback: Rich interactions and micro-animations for high perceived quality.
 */

type ProductWithSubscription = Product & { subscription: Subscription };


export const DashboardPage = () => {
    const navigate = useNavigate();

    // --- Store Integration ---
    // Extracting centralized state to ensure UI reflects the single source of truth.
    const {
        user,
        activeTeamId,
        setActiveTeamId,
        products: allProducts,
        subscriptions: allSubscriptions,
        teams: allTeams,
        approvalRequests: enhancedApprovals
    } = useStore();

    // --- Local UI State ---
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

    // --- Memoized Enterprise Dataset (Administrative Scale Demo) ---
    const adminMockData = useMemo(() => {
        if (!USE_MOCKS) return []; // Skip mock data in "Reality" mode
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

    // Helper: Filter teams for current user
    const userTeams = useMemo(() => allTeams.filter(t => user?.teams.includes(t.id)), [allTeams, user]);

    // --- View Mode Selectors (Data Logic) ---

    // 1. Managed Products (Produced View)
    const myProducts = useMemo(() => {
        if (!user) return [];
        const teamIds = activeTeamId === 'all' ? user.teams : [activeTeamId];
        let filtered = allProducts.filter(p => teamIds.includes(p.ownerTeamId));
        if (selectedEnvironment !== 'ALL') {
            filtered = filtered.filter(p => p.environment === selectedEnvironment);
        }
        return filtered;
    }, [user, activeTeamId, selectedEnvironment, allProducts]);

    // 2. Active Subscriptions (Consumed View)
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

    // 3. Approval Pipeline (Unified)
    const pendingApprovals = useMemo(() => {
        if (!user) return [];

        // Combine legacy pending subscriptions with new enhanced approval requests
        // For this demo, we'll primarily use the mock enhancedApprovals from store
        // but typically you'd merge both sources.

        return enhancedApprovals.filter(req => req.status === 'PENDING');
    }, [enhancedApprovals, user]);

    // --- UI Logic & Handlers ---

    const handleTabChange = (tab: 'produced' | 'consumed' | 'admin' | 'approvals') => {
        setIsLoading(true);
        setActiveTab(tab);
        setCurrentPage(1);
        setTimeout(() => setIsLoading(false), 450); // Fluid transition
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

        // In LIVE mode, the 'admin' tab should ideally show allProducts
        // In MOCK mode, it shows the massive demo dataset
        if (!USE_MOCKS && activeTab === 'admin') return allProducts;

        return adminMockData;
    }, [activeTab, myProducts, subscribedProducts, adminMockData, pendingApprovals, allProducts]);

    const filteredData = useMemo(() => {
        if (!searchQuery) return baseData;
        const query = searchQuery.toLowerCase();

        return baseData.filter((item) => {
            if ('displayName' in item && 'ownerTeamId' in item) {
                // Product
                const product = item as Product;
                return (
                    product.displayName?.toLowerCase().includes(query) ||
                    product.description?.toLowerCase().includes(query)
                );
            }
            if ('type' in item && 'requester' in item) {
                // ApprovalRequest
                const approval = item as any; // Still using any for complex recursive objects for now but narrowing where possible
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

    // Statistics Calculation based on Active View
    const heroStats = useMemo(() => {
        if (activeTab === 'produced') {
            return [
                { label: 'Total Products', value: myProducts.length, icon: '📦' },
                { label: 'Avg Quality Score', value: `${Math.round(myProducts.reduce((acc, p) => acc + (p.qualityScore || 0), 0) / (myProducts.length || 1))}%`, icon: '📈' },
                { label: 'Active Subscribers', value: myProducts.reduce((acc, p) => acc + (p.subscriberCount || 0), 0), icon: '👥' }
            ];
        }
        if (activeTab === 'admin') {
            return [
                { label: 'Global Inventory', value: adminMockData.length, icon: '🌐' },
                { label: 'Cross-Env Deployments', value: '342', icon: '🚀' },
                { label: 'Compliance Score', value: '94%', icon: '⚖️' },
                { label: 'Platform Load', value: '12%', icon: '📉' }
            ];
        }
        if (activeTab === 'approvals') {
            const highRiskCount = pendingApprovals.filter(a => a.details.environment === 'PROD' || a.details.environment === 'STAGE').length;
            const uniqueTeams = new Set(pendingApprovals.map(a => a.requester.teamId)).size;

            return [
                { label: 'Pending Decisions', value: pendingApprovals.length, icon: '⏱️' },
                { label: 'High Risk (PROD)', value: highRiskCount, icon: '🚩' },
                { label: 'Blocked Teams', value: uniqueTeams, icon: '👥' },
                { label: 'SLA Status', value: '4 At Risk', icon: '🔴' }
            ];
        }
        return [
            { label: 'Active Subscriptions', value: subscribedProducts.length, icon: '📥' },
            { label: 'Provider Diversity', value: new Set(subscribedProducts.map(p => p.ownerTeamId)).size, icon: '🌐' },
            { label: 'Environment Mix', value: 'PROD / DEV', icon: '🏗️' }
        ];
    }, [activeTab, myProducts, subscribedProducts, adminMockData, pendingApprovals]);

    // Handle interactive notifications
    const showToast = (message: string) => {
        setToast({ message, show: true });
        setTimeout(() => setToast({ message: '', show: false }), 3000);
    };

    const handleCopyKey = async (keyValue: string) => {
        await navigator.clipboard.writeText(keyValue);
        showToast('Key copied to clipboard!');
    };

    const handleToggleReveal = (subscriptionId: string) => {
        setRevealedKeys(prev => {
            const next = new Set(prev);
            if (next.has(subscriptionId)) next.delete(subscriptionId);
            else next.add(subscriptionId);
            return next;
        });
    };


    // Helper to get badge color for approval type
    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'PRODUCT_ONBOARDING': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
            case 'API_ONBOARDING': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
            case 'MODIFICATION': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
            case 'SUBSCRIPTION': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
            case 'PROMOTION_REQUEST': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
            case 'QUOTA_EXTENSION': return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300';
            case 'DEPRECATION_REQUEST': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <MainLayout>
            {/* Custom Toast Notification */}
            {toast.show && (
                <div className="fixed top-24 right-8 bg-slate-900 dark:bg-blue-600 text-white px-8 py-5 rounded-[1.5rem] shadow-2xl z-50 animate-fade-in flex items-center gap-4 font-black text-xs uppercase tracking-widest border border-white/10 backdrop-blur-md">
                    <span className="bg-white/20 p-2 rounded-full text-lg">💡</span> {toast.message}
                </div>
            )}

            <div className="max-w-7xl mx-auto px-6 w-full pt-16 pb-24">
                {/* Welcome Hero Area */}
                <div className="mb-16">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mb-3 uppercase">
                                {activeTab === 'consumed' ? 'Enterprise API Ecosystem' :
                                    activeTab === 'produced' ? 'Your Provider Portfolio' :
                                        activeTab === 'approvals' ? 'Governance Pipeline' : 'Global API Inventory'}
                            </h1>
                            <p className="text-gray-500 dark:text-slate-400 text-lg font-medium max-w-2xl leading-relaxed">
                                {activeTab === 'consumed' ? 'Securely discover and consume high-integrity interfaces vetted by the Enterprise Architecture board.' :
                                    activeTab === 'produced' ? 'Manage your team\'s API lifecycle, monitor quality scores, and oversee consumer access guardrails.' :
                                        activeTab === 'approvals' ? 'Review pending access requests and visibility changes with a security-first vetting mindset.' : 'Full administrative visibility across the entire Everest Re API landscape.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Dashboard Control Center */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-20 bg-white/60 dark:bg-slate-800/40 p-10 rounded-[2.5rem] border border-gray-100/50 dark:border-slate-700/30 backdrop-blur-2xl shadow-premium">
                    <div className="flex flex-col gap-4">
                        <label className="text-[10px] uppercase font-black text-gray-400 dark:text-slate-500 tracking-widest ml-1">Universal Search</label>
                        <Input
                            type="text"
                            placeholder="Find an interface..."
                            value={searchQuery}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            fullWidth
                        />
                    </div>

                    <div className="flex flex-col gap-4">
                        <label className="text-[10px] uppercase font-black text-gray-400 dark:text-slate-500 tracking-widest ml-1">Environment Context</label>
                        <Select
                            value={selectedEnvironment}
                            disabled={activeTab === 'admin' || activeTab === 'approvals'}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setSelectedEnvironment(e.target.value as Environment); setCurrentPage(1); }}
                            options={[
                                { value: 'ALL', label: 'All Environments' },
                                { value: 'DEV', label: '⚪ Development' },
                                { value: 'QA', label: '🔵 Quality Assurance' },
                                { value: 'STAGE', label: '🟣 Staging' },
                                { value: 'PROD', label: '🟢 Production' }
                            ]}
                            fullWidth
                        />
                    </div>

                    <div className="flex flex-col gap-4">
                        <label className="text-[10px] uppercase font-black text-gray-400 dark:text-slate-500 tracking-widest ml-1">Team Ownership</label>
                        <Select
                            value={activeTeamId}
                            disabled={activeTab === 'admin'}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setActiveTeamId(e.target.value); setCurrentPage(1); }}
                            options={[
                                { value: 'all', label: 'Cross-Team Overview' },
                                ...userTeams.map(t => ({ value: t.id, label: t.name }))
                            ]}
                            fullWidth
                        />
                    </div>
                </div>

                {/* Performance Metrics Hero */}
                <div className={`grid grid-cols-1 md:grid-cols-2 ${heroStats.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-8 mb-20`}>
                    {heroStats.map((stat, idx) => (
                        <StatCard
                            key={idx}
                            label={stat.label}
                            value={stat.value}
                            icon={stat.icon}
                            trend={(stat as any).trend}
                        />
                    ))}
                </div>

                {/* Sub-Navigation Tabs */}
                <div className="border-b border-gray-100 dark:border-slate-800 mb-14 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <nav className="-mb-px flex space-x-12 overflow-x-auto w-full pb-1 md:pb-0" aria-label="Tabs">
                        <button
                            onClick={() => handleTabChange('produced')}
                            className={`${activeTab === 'produced' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'} whitespace-nowrap py-5 px-1 border-b-2 font-black text-[10px] uppercase tracking-[0.2em] transition-all`}
                        >
                            MANAGED PRODUCTS
                        </button>
                        <button
                            onClick={() => handleTabChange('consumed')}
                            className={`${activeTab === 'consumed' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'} whitespace-nowrap py-5 px-1 border-b-2 font-black text-[10px] uppercase tracking-[0.2em] transition-all`}
                        >
                            ACTIVE SUBSCRIPTIONS
                        </button>

                        {(pendingApprovals.length > 0 || activeTab === 'approvals') && (
                            <button
                                onClick={() => handleTabChange('approvals')}
                                className={`${activeTab === 'approvals' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'} whitespace-nowrap py-5 px-1 border-b-2 font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3`}
                            >
                                <span className="text-sm">⏱️</span> APPROVALS
                                {pendingApprovals.length > 0 && (
                                    <span className="bg-blue-600 text-white py-0.5 px-2 rounded-lg text-[9px] font-black">{pendingApprovals.length}</span>
                                )}
                            </button>
                        )}

                        {user?.role === 'admin' && (
                            <button
                                onClick={() => handleTabChange('admin')}
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

                {/* Render Grid / Table Section */}
                <div className="min-h-[500px]">
                    {isLoading ? (
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
                    ) : paginatedItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-48 bg-slate-50/30 dark:bg-slate-800/20 rounded-[4rem] border-2 border-dashed border-gray-100 dark:border-slate-800">
                            <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full shadow-premium flex items-center justify-center text-4xl mb-8">👻</div>
                            <p className="text-slate-300 dark:text-slate-600 text-2xl font-black uppercase tracking-widest mb-4">No Records Encountered</p>
                            <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">Verify your search criteria or team context.</p>
                        </div>
                    ) : activeTab === 'approvals' ? (
                        <div className="bg-white dark:bg-slate-800 shadow-premium rounded-[3rem] border border-gray-100 dark:border-slate-700/30 overflow-hidden">
                            <div className="p-8 grid gap-6">
                                {paginatedItems.map((item: any) => (
                                    <div key={item.id} className="bg-white dark:bg-slate-800/50 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center group hover:shadow-lg transition-all">
                                        {/* Requester Avatar/Info */}
                                        {/* Requester Info (No Avatar) */}
                                        <div className="flex flex-col min-w-[200px]">
                                            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Requesting Team</div>
                                            <div className="font-black text-slate-900 dark:text-white text-lg leading-tight mb-2">{item.requester.teamName}</div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{item.requester.name}</span>
                                                <span className="text-xs text-slate-500 font-medium">{item.requester.email}</span>
                                            </div>
                                        </div>

                                        {/* Request Details */}
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                                            {/* Type & Target */}
                                            <div>
                                                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${getTypeBadge(item.type)}`}>
                                                    {item.type.replace('_', ' ')}
                                                </span>
                                                <div className="mt-2 font-bold text-slate-700 dark:text-slate-200 text-sm">
                                                    {item.details.targetName}
                                                    {item.details.targetVersion && <span className="ml-2 opacity-50 text-xs text-slate-500">{item.details.targetVersion}</span>}
                                                </div>
                                            </div>

                                            {/* Specific Metadata */}
                                            <div className="text-xs text-slate-500 font-medium">
                                                {item.type === 'PROMOTION_REQUEST' && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-700 dark:text-white">{item.details.promotionPath?.source}</span>
                                                        <span>→</span>
                                                        <span className="font-bold text-green-600 dark:text-green-400">{item.details.promotionPath?.target}</span>
                                                    </div>
                                                )}
                                                {item.type === 'QUOTA_EXTENSION' && (
                                                    <div>
                                                        Requesting: <span className="font-bold text-slate-700 dark:text-white">{item.details.requestedQuota}</span>
                                                    </div>
                                                )}
                                                {item.type === 'MODIFICATION' && (
                                                    <div>
                                                        <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[9px] font-bold mr-2">{item.details.modificationType}</span>
                                                        <div className="mt-1 italic opacity-75">{item.details.diffSummary}</div>
                                                    </div>
                                                )}
                                                {item.details.environment && (
                                                    <div className="mt-1 flex items-center gap-1">
                                                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                                        <span>{item.details.environment}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Reason */}
                                            <div className="text-xs text-slate-400 italic border-l-2 border-slate-100 dark:border-slate-700 pl-3">
                                                "{item.details.reason || 'No specific reason provided.'}"
                                            </div>
                                        </div>

                                        {/* Triage Action */}
                                        <div className="flex gap-2 min-w-[180px] justify-end">
                                            <button
                                                onClick={() => {
                                                    if (item.details.targetId) {
                                                        navigate(`/products/${item.details.targetId}?tab=audit`);
                                                    } else {
                                                        showToast('Target product context missing.');
                                                    }
                                                }}
                                                className="px-6 py-3 bg-slate-900 dark:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-black dark:hover:bg-slate-600 transition-all flex items-center gap-2 group shadow-xl shadow-slate-900/10"
                                            >
                                                <span>Review & Decide</span>
                                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                            {paginatedItems.map((item) => (
                                activeTab === 'consumed' ? (
                                    <ProductConsumerCard
                                        key={(item as ProductWithSubscription).id}
                                        product={item as ProductWithSubscription}
                                        isRevealed={(item as ProductWithSubscription).subscription ? revealedKeys.has((item as ProductWithSubscription).subscription!.id) : false}
                                        onToggleReveal={() => (item as ProductWithSubscription).subscription && handleToggleReveal((item as ProductWithSubscription).subscription!.id)}
                                        onCopyKey={(key) => handleCopyKey(key)}
                                        onClick={() => navigate(`/products/${(item as ProductWithSubscription).id}`)}
                                    />
                                ) : (
                                    <ProductProducerCard
                                        key={(item as Product).id}
                                        product={item as Product}
                                        onClick={() => navigate(`/products/${(item as Product).id}`)}
                                    />
                                )
                            ))}
                        </div>
                    )}

                    {/* Dynamic Pagination Bar */}
                    {!isLoading && totalPages > 1 && (
                        <div className="mt-24 flex flex-col items-center gap-8">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="w-16 h-16 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-3xl disabled:opacity-20 hover:shadow-premium transition-all flex items-center justify-center text-xl font-black"
                                >
                                    ‹
                                </button>
                                <div className="flex items-center gap-3">
                                    {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                                        let pageNum = i + 1;
                                        if (totalPages > 5 && currentPage > 3) {
                                            pageNum = currentPage - 2 + i;
                                            if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                                            if (pageNum < 1) pageNum = i + 1;
                                        }
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => handlePageChange(pageNum)}
                                                className={`w-16 h-16 rounded-3xl font-black text-sm transition-all duration-300 ${currentPage === pageNum
                                                    ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/40 transform scale-110'
                                                    : 'bg-white dark:bg-slate-800 text-gray-400 hover:text-blue-500 border border-gray-100 dark:border-slate-700'
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className="w-16 h-16 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-3xl disabled:opacity-20 hover:shadow-premium transition-all flex items-center justify-center text-xl font-black"
                                >
                                    ›
                                </button>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/40 py-3 px-8 rounded-full border border-gray-100/50 dark:border-slate-700/50 backdrop-blur-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    PAGE <span className="text-blue-600">{currentPage}</span> / <span className="text-slate-900 dark:text-white">{totalPages}</span> — {filteredData.length} TOTAL NODES
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
};
