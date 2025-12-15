import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mockUser, mockTeams, mockProducts, mockSubscriptions, type Product, type Subscription, type Team, type Environment } from '../mocks';
import { MainLayout } from '../layouts/MainLayout';
import { useStore } from '../store/useStore';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';

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
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
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
            item.name?.toLowerCase().includes(query)
        );
    }, [activeTab, myProducts, subscribedProducts, pendingApprovals, searchQuery]);

    // Pagination Logic
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return displayData.slice(start, start + itemsPerPage);
    }, [displayData, currentPage]);
    const totalPages = Math.ceil(displayData.length / itemsPerPage);


    // Actions
    const toggleRow = (id: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) newExpanded.delete(id);
        else newExpanded.add(id);
        setExpandedRows(newExpanded);
    };

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

    const handleCopyKey = async (keyValue: string) => {
        await navigator.clipboard.writeText(keyValue);
        setToast({ message: 'Key copied!', show: true });
        setTimeout(() => setToast({ message: '', show: false }), 2000);
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

    const maskKey = (key: string) => key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);

    return (
        <MainLayout>
            {/* Toast */}
            {toast.show && (
                <div className="fixed top-20 right-6 bg-gray-900 text-white px-4 py-3 rounded shadow-xl z-50 animate-fade-in flex items-center gap-2">
                    <span>✅</span> {toast.message}
                </div>
            )}

            <div className="max-w-7xl mx-auto px-6 py-6 w-full">

                {/* Control Bar: Search (Left) and Context/Environment (Right) - Same Horizontal Line */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                    {/* Search - Left */}
                    <div className="w-full md:w-64">
                        <Input
                            label="Search"
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            fullWidth
                            icon={
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            }
                        />
                    </div>

                    {/* Right: Environment + Context */}
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-end w-full md:w-auto">
                        {/* Environment Filter */}
                        <div className="w-full md:w-48">
                            <Select
                                label="Environment"
                                value={selectedEnvironment}
                                onChange={e => { setSelectedEnvironment(e.target.value as Environment); setCurrentPage(1); }}
                                options={[
                                    { value: 'ALL', label: 'All Environments' },
                                    { value: 'DEV', label: '⚪ Dev' },
                                    { value: 'QA', label: '🔵 QA' },
                                    { value: 'STAGE', label: '🟣 Stage' },
                                    { value: 'PROD', label: '🟢 Prod' }
                                ]}
                                fullWidth
                            />
                        </div>

                        {/* Context - Team Switcher */}
                        <div className="w-full md:w-48">
                            <Select
                                label="Context"
                                value={activeTeamId}
                                onChange={e => { setActiveTeamId(e.target.value); setCurrentPage(1); }}
                                options={[
                                    { value: 'all', label: 'All My Teams' },
                                    ...userTeams.map(t => ({ value: t.id, label: t.name }))
                                ]}
                                fullWidth
                            />
                        </div>
                    </div>
                </div>

                {/* --- Tabs (Modern Underline Style) with Actions --- */}
                <div className="border-b border-gray-200 mb-6 flex justify-between items-end">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button
                            onClick={() => { setActiveTab('produced'); setCurrentPage(1); }}
                            className={`${activeTab === 'produced'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                        >
                            📤 My Products
                            <span className="bg-gray-100 text-gray-600 py-0.5 px-2.5 rounded-full text-xs ml-1">{myProducts.length}</span>
                        </button>

                        <button
                            onClick={() => { setActiveTab('consumed'); setCurrentPage(1); }}
                            className={`${activeTab === 'consumed'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                        >
                            📥 Subscriptions
                            <span className="bg-gray-100 text-gray-600 py-0.5 px-2.5 rounded-full text-xs ml-1">{subscribedProducts.length}</span>
                        </button>

                        <button
                            onClick={() => { setActiveTab('approvals'); setCurrentPage(1); }}
                            className={`${activeTab === 'approvals'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                        >
                            ⏱️ Pending Approvals
                            {pendingApprovals.length > 0 && <span className="bg-amber-100 text-amber-700 py-0.5 px-2.5 rounded-full text-xs ml-1 font-bold">{pendingApprovals.length}</span>}
                        </button>
                    </nav>

                    {/* Action Buttons - Right Side */}
                    <div className="flex items-center gap-3 pb-4">
                        {activeTab === 'consumed' && (
                            <Link to="/browse" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg text-sm shadow-sm transition-colors">
                                🔍 Browse Public APIs
                            </Link>
                        )}
                        {activeTab === 'produced' && (
                            <Link to="/onboard" className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm shadow-sm transition-colors flex items-center gap-2">
                                <span>+</span> New Product
                            </Link>
                        )}
                    </div>
                </div>

                {/* --- Content Area --- */}
                <div className="min-h-[400px]">
                    {displayData.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <p className="text-gray-400 text-lg mb-2">No items found</p>
                            <p className="text-gray-500 text-sm">Use the buttons above to add or find items.</p>
                        </div>
                    ) : (
                        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider pl-8">Name</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ver</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">State</th>

                                        {activeTab === 'produced' && <>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">APIs</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscribers</th>
                                        </>}

                                        {activeTab === 'consumed' && <>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscription Key</th>
                                        </>}

                                        {activeTab === 'approvals' && <>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requesting Team</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        </>}

                                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {paginatedData.map((item: any) => (
                                        <>
                                            <tr key={item.id} onClick={() => toggleRow(item.id)} className="group even:bg-gray-50 hover:!bg-blue-50 cursor-pointer transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`text-gray-400 transform transition-transform duration-200 ${expandedRows.has(item.id) ? 'rotate-90' : ''}`}>
                                                            ▶
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600">{item.displayName}</div>
                                                            <div className="text-xs text-gray-500">{item.name}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">{item.version}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${item.state === 'published' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {item.state}
                                                    </span>
                                                </td>

                                                {activeTab === 'produced' && <>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.apis.length}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.subscriberCount}</td>
                                                </>}

                                                {activeTab === 'consumed' && <>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded border border-gray-100 w-fit">
                                                            <span className="font-mono text-xs">
                                                                {revealedKeys.has(item.subscription.id)
                                                                    ? item.subscription.primaryKey.value
                                                                    : maskKey(item.subscription.primaryKey.value)
                                                                }
                                                            </span>
                                                            <button onClick={e => { e.stopPropagation(); handleToggleReveal(item.subscription.id); }} className="text-gray-400 hover:text-gray-600">
                                                                {revealedKeys.has(item.subscription.id) ? '👁️' : '👁️‍🗨️'}
                                                            </button>
                                                            <button onClick={e => { e.stopPropagation(); handleCopyKey(item.subscription.primaryKey.value); }} className="text-blue-500 hover:text-blue-700">
                                                                📋
                                                            </button>
                                                        </div>
                                                    </td>
                                                </>}

                                                {activeTab === 'approvals' && <>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">{item.requesterTeam?.name}</div>
                                                        <div className="text-xs text-gray-500">Just now</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {/* Date col placeholder */}
                                                    </td>
                                                </>}

                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    {activeTab === 'approvals' ? (
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={e => { e.stopPropagation(); handleApprove(item.subscription.id) }} className="text-green-600 hover:text-green-900 text-xs border border-green-200 bg-green-50 px-2 py-1 rounded">Approve</button>
                                                            <button onClick={e => { e.stopPropagation(); handleReject(item.subscription.id) }} className="text-red-600 hover:text-red-900 text-xs border border-red-200 bg-red-50 px-2 py-1 rounded">Reject</button>
                                                        </div>
                                                    ) : (
                                                        <Link to={`/products/${item.id}`} className="text-blue-600 hover:text-blue-900">Details</Link>
                                                    )}
                                                </td>
                                            </tr>

                                            {/* EXPANDED DETAILS */}
                                            {expandedRows.has(item.id) && (
                                                <tr className="bg-gray-50 border-t border-gray-100">
                                                    <td colSpan={100} className="px-6 py-4 pl-14">
                                                        <div className="mb-2 font-semibold text-xs text-gray-500 uppercase tracking-wider">APIs Included</div>
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {item.apis.map((api: any) => (
                                                                <div key={api.id} className="bg-white border boundary-l-4 border-l-blue-500 p-3 rounded shadow-sm flex justify-between items-center max-w-3xl">
                                                                    <div>
                                                                        <div className="font-medium text-sm text-gray-900">{api.displayName}</div>
                                                                        <div className="text-xs text-gray-500 font-mono">{api.path}</div>
                                                                    </div>
                                                                    <div className="flex items-center gap-6">
                                                                        {api.qualityScore && (
                                                                            <div className="flex flex-col items-end">
                                                                                <span className="text-xs text-gray-400">Quality</span>
                                                                                <span className={`text-sm font-bold ${api.qualityScore > 80 ? 'text-green-600' : 'text-amber-600'}`}>
                                                                                    {api.qualityScore}/100
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        <button className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded transition-colors"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                navigate('/analyzer', { state: { apiContract: api } });
                                                                            }}
                                                                        >
                                                                            View Contract
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination - Keeping it simple */}
                {totalPages > 1 && (
                    <div className="flex justify-center mt-8 gap-2">
                        <button disabled={currentPage === 1} onClick={() => setCurrentPage(c => c - 1)} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">prev</button>
                        <span className="px-3 py-1 text-sm text-gray-600">Page {currentPage} / {totalPages}</span>
                        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(c => c + 1)} className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50">next</button>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};
