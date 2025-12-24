import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../../layouts/MainLayout/MainLayout.view';
import { useStore } from '../../../store/useStore';
import { getGlobalInventory } from '../../inventory/api/inventoryClient';
import { GlobalProduct, GlobalAPI } from '../../../types/entities';
import toast from 'react-hot-toast';

export const GlobalInventoryView = () => {
    const { user, setPageTitle } = useStore();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'products' | 'apis'>('products');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{ products: GlobalProduct[]; apis: GlobalAPI[] } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        setPageTitle('Global Inventory');
        if (user && user.role !== 'admin') {
            navigate('/');
            return;
        }

        const fetchData = async () => {
            try {
                const response = await getGlobalInventory();
                setData(response.data);
            } catch (error) {
                toast.error('Failed to fetch global inventory');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, navigate, setPageTitle]);

    const filteredProducts = useMemo(() => {
        if (!data) return [];
        return data.products.filter(p =>
            p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [data, searchQuery]);

    const filteredAPIs = useMemo(() => {
        if (!data) return [];
        return data.apis.filter(a =>
            a.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [data, searchQuery]);

    const mismatchCount = useMemo(() => {
        if (!data) return 0;
        return data.products.filter(p => {
            const envs = p.deployments.map(d => d.environment);
            return !(envs.includes('DEV') && envs.includes('PROD'));
        }).length;
    }, [data]);

    if (!user || user.role !== 'admin') return null;

    const renderEnvIcon = (envs: string[], target: string) => {
        const found = envs.includes(target);
        return (
            <div className={`flex items-center justify-center w-8 h-8 rounded-lg border ${found
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 opacity-40'
                }`} title={target}>
                <span className="text-[10px] font-bold">{target}</span>
            </div>
        );
    };

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto px-6 w-full pt-16 pb-24">
                {/* Header & Hero Section */}
                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4">
                            Global Inventory <span className="text-blue-500">.</span>
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
                            Unified visualization of all products and APIs across regions. Reconcile gaps between DEV and PROD in one view.
                        </p>
                    </div>

                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="Find products or APIs..."
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl py-3 pl-12 pr-6 w-full md:w-80 shadow-premium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-premium">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 11v.01" /></svg>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Logical Products</h3>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{data?.products.length || 0}</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 font-medium italic">Across 4 environments</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-premium">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Gaps Detected</h3>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{mismatchCount}</p>
                            </div>
                        </div>
                        <p className="text-xs text-emerald-500 font-bold uppercase tracking-tight">Need Attention</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-premium">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 rounded-2xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Orphan APIs</h3>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">5</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">Unlinked to products</p>
                    </div>

                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-premium">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Portal Managed</h3>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">12%</p>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">Non-Terraform Drift</p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-8 border-b border-gray-200 dark:border-slate-800 mb-8">
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`pb-4 text-sm font-bold tracking-wide uppercase transition-all duration-200 border-b-2 ${activeTab === 'products'
                            ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                            : 'text-gray-500 hover:text-gray-800 dark:text-slate-500 dark:hover:text-slate-200 border-transparent'
                            }`}
                    >
                        Products Inventory
                    </button>
                    <button
                        onClick={() => setActiveTab('apis')}
                        className={`pb-4 text-sm font-bold tracking-wide uppercase transition-all duration-200 border-b-2 ${activeTab === 'apis'
                            ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                            : 'text-gray-500 hover:text-gray-800 dark:text-slate-500 dark:hover:text-slate-200 border-transparent'
                            }`}
                    >
                        APIs Inventory
                    </button>
                </div>

                {/* Table Area */}
                <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/20 shadow-premium min-h-[400px]">
                    {loading ? (
                        <div className="flex h-64 items-center justify-center">
                            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                    ) : activeTab === 'products' ? (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800">
                                    <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Product Name</th>
                                    <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Owner Team</th>
                                    <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Regional Status</th>
                                    <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredProducts.map((p, idx) => {
                                    const envs = p.deployments.map(d => d.environment);
                                    const isDrifted = !(envs.includes('DEV') && envs.includes('PROD'));

                                    return (
                                        <tr key={idx} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div>
                                                        <p className="font-bold text-slate-900 dark:text-white capitalize">{p.displayName}</p>
                                                        <p className="text-xs text-slate-500 font-mono">{p.name}</p>
                                                    </div>
                                                    {isDrifted && (
                                                        <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-200 dark:border-amber-800">Mismatch</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                {p.ownerTeamName ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-[10px] font-bold text-white">
                                                            {p.ownerTeamName.substring(0, 1)}
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{p.ownerTeamName}</span>
                                                    </div>
                                                ) : (
                                                    <span className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 text-xs font-bold italic">Orphaned</span>
                                                )}
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex gap-2">
                                                    {renderEnvIcon(envs, 'DEV')}
                                                    {renderEnvIcon(envs, 'QA')}
                                                    {renderEnvIcon(envs, 'STAGE')}
                                                    {renderEnvIcon(envs, 'PROD')}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <button
                                                    onClick={() => navigate(`/admin/mapping?product=${p.name}`)}
                                                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                >
                                                    Manage
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800">
                                    <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">API Name</th>
                                    <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest">Base Path</th>
                                    <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Deployments</th>
                                    <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredAPIs.map((a, idx) => (
                                    <tr key={idx} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-8 py-6">
                                            <p className="font-bold text-slate-900 dark:text-white">{a.displayName}</p>
                                            <p className="text-xs text-slate-500 font-mono">{a.name}</p>
                                        </td>
                                        <td className="px-8 py-6 text-sm text-slate-600 dark:text-slate-400 font-medium">
                                            {a.path}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex justify-center gap-1">
                                                {a.deployments.map((d, i) => (
                                                    <div key={i} className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 text-[10px] font-black border border-blue-100 dark:border-blue-900/30">
                                                        {d.environment}
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button className="text-blue-500 text-xs font-black uppercase tracking-widest hover:text-blue-600 transition-colors">
                                                Edit Contract
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </MainLayout>
    );
};
