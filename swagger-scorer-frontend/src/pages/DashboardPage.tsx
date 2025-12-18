import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mockUser, mockTeams, mockProducts, mockSubscriptions, type Product, type Subscription, type Team, type Environment } from '../mocks';
import { MainLayout } from '../layouts/MainLayout';
import { useStore } from '../store/useStore';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { StatCard } from '../components/dashboard/StatCard';
import { ProductProducerCard } from '../components/dashboard/ProductProducerCard';
import { ProductConsumerCard } from '../components/dashboard/ProductConsumerCard';

type ProductWithSubscription = Product & { subscription: Subscription };
type ApprovalItem = Product & { subscription: Subscription; requesterTeam: Team };

export const DashboardPage = () => {
    const navigate = useNavigate();
    const { activeTeamId, setActiveTeamId } = useStore();

    // Tab state: 'produced' | 'consumed' | 'approvals'
    const [activeTab, setActiveTab] = useState<'produced' | 'consumed' | 'approvals'>('produced');
    // const [selectedTeamId, setSelectedTeamId] = useState<string>('all'); // Removed local state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedEnvironment, setSelectedEnvironment] = useState<Environment>('ALL'); // Environment filter
    const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
    const [processedApprovals, setProcessedApprovals] = useState<Set<string>>(new Set()); // IDs of approved/rejected items
    const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: '', show: false });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const userTeams = useMemo(() => mockTeams.filter(t => mockUser.teams.includes(t.id)), []);

    // --- Data Selectors ---

    // 1. My Products (Produced)
    const myProducts = useMemo(() => {
        const teamIds = activeTeamId === 'all' ? mockUser.teams : [activeTeamId];
        let products = mockProducts.filter(p => teamIds.includes(p.ownerTeamId));

        // Filter by environment
        if (selectedEnvironment !== 'ALL') {
            products = products.filter(p => p.environment === selectedEnvironment);
        }

        return products;
    }, [activeTeamId, selectedEnvironment]);

    // 2. Subscriptions (Consumed)
    const subscribedProducts = useMemo((): ProductWithSubscription[] => {
        const teamIds = activeTeamId === 'all' ? mockUser.teams : [activeTeamId];
        // Only APPROVED subscriptions
        const subscriptions = mockSubscriptions.filter(s =>
            teamIds.includes(s.subscriberTeamId) && s.state === 'active'
        );
        return subscriptions.map(sub => {
            const product = mockProducts.find(p => p.id === sub.productId);
            if (!product) return null;
            return { ...product, subscription: sub };
        }).filter((p): p is ProductWithSubscription => p !== null);
    }, [activeTeamId]);

    // 3. Pending Approvals (Requests requiring my team's approval)
    const pendingApprovals = useMemo((): ApprovalItem[] => {
        const myTeamIds = activeTeamId === 'all' ? mockUser.teams : [activeTeamId];
        const myProductIds = mockProducts
            .filter(p => myTeamIds.includes(p.ownerTeamId))
            .map(p => p.id);

        // Find subscriptions TO my products that are PENDING
        const pendingSubs = mockSubscriptions.filter(s =>
            myProductIds.includes(s.productId) && s.state === 'pending'
        );

        return pendingSubs.map(sub => {
            const product = mockProducts.find(p => p.id === sub.productId);
            const requesterTeam = mockTeams.find(t => t.id === sub.subscriberTeamId);
            if (!product || !requesterTeam) return null;
            // Filter out items that were just approved/rejected in this session
            if (processedApprovals.has(sub.id)) return null;
            return { ...product, subscription: sub, requesterTeam };
        }).filter((item): item is ApprovalItem => item !== null);
    }, [activeTeamId, processedApprovals]);


    // Combined Filter
    const displayData = useMemo(() => {
        let result: any[] = [];
        if (activeTab === 'produced') result = myProducts;
        else if (activeTab === 'consumed') result = subscribedProducts;
        else result = pendingApprovals;

        if (!searchQuery) return result;
        const query = searchQuery.toLowerCase();

        return result.filter((item) =>
            item.displayName?.toLowerCase().includes(query) ||
            item.name?.toLowerCase().includes(query) ||
            item.identity?.clientId.toLowerCase().includes(query) // Linked App Registration Search
        );
    }, [activeTab, myProducts, subscribedProducts, pendingApprovals, searchQuery]);

    // Pagination Logic
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return displayData.slice(start, start + itemsPerPage);
    }, [displayData, currentPage]);
    const totalPages = Math.ceil(displayData.length / itemsPerPage);

    // Hero Stats
    const heroStats = useMemo(() => {
        if (activeTab === 'produced') {
            return [
                { label: 'Total Products', value: myProducts.length, icon: '📦' },
                { label: 'Avg Quality Score', value: `${Math.round(myProducts.reduce((acc, p) => acc + (p.qualityScore || 0), 0) / (myProducts.length || 1))}%`, icon: '📈' },
                { label: 'Active Subscribers', value: myProducts.reduce((acc, p) => acc + (p.subscriberCount || 0), 0), icon: '👥' },
                { label: 'Pending Approvals', value: pendingApprovals.length, icon: '⏱️', trend: pendingApprovals.length > 0 ? { value: pendingApprovals.length.toString(), isPositive: false } : undefined }
            ];
        }
        // Consumer view hero stats - Premium Metrics
        return [
            { label: 'Active Subscriptions', value: subscribedProducts.length, icon: '📥' },
            { label: 'Avg Latency', value: '124ms', icon: '⚡', trend: { value: '8ms', isPositive: true } },
            { label: 'System Uptime', value: '99.9%', icon: '🛡️' },
            { label: 'Requests Sent', value: '0', icon: '📤' }
        ];
    }, [activeTab, myProducts, subscribedProducts, pendingApprovals]);


    // Actions
    const handleApprove = (subId: string) => {
        setToast({ message: 'Request approved! Notification sent to requester.', show: true });
        setProcessedApprovals(prev => new Set(prev).add(subId));
        setTimeout(() => setToast({ message: '', show: false }), 3000);
        // Logic to update state would go here (requires updating mock or store)
    };

    const handleReject = (subId: string) => {
        setToast({ message: 'Request rejected.', show: true });
        setProcessedApprovals(prev => new Set(prev).add(subId));
        setTimeout(() => setToast({ message: '', show: false }), 3000);
    };

    const showToast = (message: string) => {
        setToast({ message, show: true });
        setTimeout(() => setToast({ message: '', show: false }), 3000);
    };

    const handleCopyKey = async (keyValue: string) => {
        await navigator.clipboard.writeText(keyValue);
        showToast('Key copied!');
        setTimeout(() => setToast({ message: '', show: false }), 2000);
    };

    // Environment badge helper
    const getEnvironmentBadge = (env?: 'DEV' | 'QA' | 'STAGE' | 'PROD') => {
        if (!env) return <span className="text-xs text-gray-400">-</span>;

        const badges = {
            DEV: { color: 'bg-gray-100 text-gray-700', icon: '⚪' },
            QA: { color: 'bg-blue-100 text-blue-700', icon: '🔵' },
            STAGE: { color: 'bg-purple-100 text-purple-700', icon: '🟣' },
            PROD: { color: 'bg-green-100 text-green-700', icon: '🟢' }
        };

        const badge = badges[env];
        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.color}`}>
                {badge.icon} {env}
            </span>
        );
    };

    const handleToggleReveal = (subscriptionId: string) => {
        const newRevealed = new Set(revealedKeys);
        if (newRevealed.has(subscriptionId)) newRevealed.delete(subscriptionId);
        else {
            newRevealed.add(subscriptionId);
            setTimeout(() => {
                setRevealedKeys(prev => {
                    const u = new Set(prev); u.delete(subscriptionId); return u;
                });
            }, 10000);
        }
        setRevealedKeys(newRevealed);
    };

    return (
        <MainLayout>
            {/* Toast */}
            {toast.show && (
                <div className="fixed top-20 right-6 bg-gray-900 text-white px-4 py-3 rounded shadow-xl z-50 animate-fade-in flex items-center gap-2">
                    <span>✅</span> {toast.message}
                </div>
            )}

            {/* Content Wrapper */}
            <div className="max-w-7xl mx-auto px-6 w-full pt-8 pb-20">

                {/* Dashboard Control Bar Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 bg-white dark:bg-slate-800/40 p-6 rounded-3xl border border-gray-100 dark:border-slate-700/30 backdrop-blur-md shadow-premium">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] uppercase font-black text-gray-400 dark:text-slate-500 tracking-widest ml-1">Search Products</label>
                        <Input
                            type="text"
                            placeholder="Type to filter..."
                            value={searchQuery}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            fullWidth
                            containerClassName="w-full"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] uppercase font-black text-gray-400 dark:text-slate-500 tracking-widest ml-1">Environment</label>
                        <Select
                            value={selectedEnvironment}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setSelectedEnvironment(e.target.value as Environment); setCurrentPage(1); }}
                            options={[
                                { value: 'ALL', label: 'All Environments' },
                                { value: 'DEV', label: '⚪ Dev' },
                                { value: 'QA', label: '🔵 QA' },
                                { value: 'STAGE', label: '🟣 Stage' },
                                { value: 'PROD', label: '🟢 Prod' }
                            ]}
                            fullWidth
                            containerClassName="w-full"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] uppercase font-black text-gray-400 dark:text-slate-500 tracking-widest ml-1">Responsible Team</label>
                        <Select
                            value={activeTeamId}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => { setActiveTeamId(e.target.value); setCurrentPage(1); }}
                            options={[
                                { value: 'all', label: 'All My Teams' },
                                ...userTeams.map(t => ({ value: t.id, label: t.name }))
                            ]}
                            fullWidth
                            containerClassName="w-full"
                        />
                    </div>
                </div>

                {/* --- Summary Hero Section --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {heroStats.map((stat, idx) => (
                        <StatCard
                            key={idx}
                            label={stat.label}
                            value={stat.value}
                            icon={stat.icon}
                            trend={stat.trend}
                        />
                    ))}
                </div>

                {/* --- Tabs (Modern Underline Style) with Actions --- */}
                <div className="border-b border-gray-200 dark:border-slate-700 mb-8 flex justify-between items-end">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button
                            onClick={() => { setActiveTab('produced'); setCurrentPage(1); }}
                            className={`${activeTab === 'produced'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-all`}
                        >
                            📤 My Products
                            <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 py-0.5 px-2.5 rounded-full text-[10px] ml-1">{myProducts.length}</span>
                        </button>

                        <button
                            onClick={() => { setActiveTab('consumed'); setCurrentPage(1); }}
                            className={`${activeTab === 'consumed'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-all`}
                        >
                            📥 Subscriptions
                            <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 py-0.5 px-2.5 rounded-full text-[10px] ml-1">{subscribedProducts.length}</span>
                        </button>

                        <button
                            onClick={() => { setActiveTab('approvals'); setCurrentPage(1); }}
                            className={`${activeTab === 'approvals'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-all`}
                        >
                            ⏱️ Pending Approvals
                            {pendingApprovals.length > 0 && <span className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-500 py-0.5 px-2.5 rounded-full text-[10px] ml-1 font-black">{pendingApprovals.length}</span>}
                        </button>
                    </nav>

                    {/* Action Buttons - Right Side */}
                    <div className="flex items-center gap-3 pb-4">
                        {activeTab === 'consumed' && (
                            <Link to="/browse" className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 font-bold py-2 px-4 rounded-xl text-xs shadow-sm transition-all uppercase tracking-wider">
                                🔍 Browse Public APIs
                            </Link>
                        )}
                        {activeTab === 'produced' && (
                            <Link to="/onboard" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-md transition-all flex items-center gap-2 uppercase tracking-wider">
                                <span>+</span> New Product
                            </Link>
                        )}
                    </div>
                </div>

                {/* --- Content Area --- */}
                <div className="min-h-[400px]">
                    {displayData.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 dark:bg-slate-800/30 rounded-3xl border-2 border-dashed border-gray-100 dark:border-slate-800">
                            <p className="text-gray-300 dark:text-slate-600 text-xl font-bold mb-2">No items found</p>
                            <p className="text-gray-400 dark:text-slate-500 text-sm">Use the filters or buttons above to find what you're looking for.</p>
                        </div>
                    ) : activeTab === 'produced' ? (
                        /* PREMIUM PRODUCER GRID */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {paginatedData.map((product) => (
                                <ProductProducerCard
                                    key={product.id}
                                    product={product}
                                    onClick={() => navigate(`/products/${product.id}`)}
                                    onManage={() => {/* Manage action */ }}
                                />
                            ))}
                        </div>
                    ) : activeTab === 'consumed' ? (
                        /* PREMIUM CONSUMER GRID */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                            {paginatedData.map((item: any) => (
                                <ProductConsumerCard
                                    key={item.id}
                                    product={item}
                                    isRevealed={revealedKeys.has(item.subscription.id)}
                                    onToggleReveal={() => handleToggleReveal(item.subscription.id)}
                                    onCopyKey={(key) => handleCopyKey(key)}
                                    onClick={() => navigate(`/products/${item.id}`)}
                                />
                            ))}
                        </div>
                    ) : (
                        /* LEGACY TABLE VIEW (For Approvals only now) */
                        <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-700">
                                <thead className="bg-gray-50/50 dark:bg-slate-900/50">
                                    <tr>
                                        <th scope="col" className="px-8 py-4 text-left text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.1em]">Name</th>
                                        <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.1em]">Ver</th>
                                        <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.1em]">State</th>
                                        <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.1em]">Env</th>
                                        <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.1em]">Requesting Team</th>
                                        <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.1em]">Date</th>
                                        <th scope="col" className="relative px-8 py-4"><span className="sr-only">Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-50 dark:divide-slate-700/50">
                                    {paginatedData.map((item: any) => (
                                        <tr key={item.id} className="group hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors">
                                            <td className="px-8 py-5 whitespace-nowrap">
                                                <div className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{item.displayName}</div>
                                                <div className="text-[10px] font-mono text-gray-400 dark:text-slate-500">{item.name}</div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-xs text-gray-500 dark:text-slate-400 font-mono italic">{item.version}</td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <span className={`px-2 py-0.5 inline-flex text-[9px] font-black rounded-md border ${item.state === 'published'
                                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-500 border-green-100 dark:border-green-800'
                                                    : 'bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-slate-400 border-gray-100 dark:border-slate-600'
                                                    }`}>
                                                    {item.state.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                {getEnvironmentBadge(item.environment)}
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="text-sm font-bold text-gray-800 dark:text-slate-200">{item.requesterTeam?.name}</div>
                                                <div className="text-[10px] text-gray-400 dark:text-slate-500 italic">via Automated Request</div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-xs text-gray-400 dark:text-slate-500">
                                                2 hours ago
                                            </td>
                                            <td className="px-8 py-5 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={e => { e.stopPropagation(); handleApprove(item.subscription.id) }} className="bg-green-600 hover:bg-green-700 text-white text-[9px] font-black px-3 py-1.5 rounded-lg shadow-sm transition-all uppercase tracking-wider">Approve</button>
                                                    <button onClick={e => { e.stopPropagation(); handleReject(item.subscription.id) }} className="bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-500 text-[9px] font-black px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-all uppercase tracking-wider">Reject</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center mt-12 gap-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(c => c - 1)}
                            className="px-4 py-2 text-xs font-bold border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all uppercase tracking-widest"
                        >
                            prev
                        </button>
                        <div className="flex items-center px-4 text-xs font-mono text-gray-400 dark:text-slate-500 uppercase tracking-tighter">
                            Page <span className="text-gray-900 dark:text-white font-bold mx-1">{currentPage}</span> / {totalPages}
                        </div>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(c => c + 1)}
                            className="px-4 py-2 text-xs font-bold border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all uppercase tracking-widest"
                        >
                            next
                        </button>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};
