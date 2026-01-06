import React, { useState, useEffect } from 'react';
import {
    getOrphanBackends,
    adoptBackend
} from '../api/adminClient';
import { getProducts } from '../../inventory/api/inventoryClient';
import { toast } from 'react-hot-toast';

interface Backend {
    id: string;
    environment: string;
    url: string;
    title?: string;
    productId?: string;
    scope?: 'PRODUCT' | 'API' | 'GLOBAL' | null;
    updatedAt?: string;
}

export const OrphanBackendManager: React.FC = () => {
    const [orphans, setOrphans] = useState<Backend[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [env, setEnv] = useState('DEV');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Adoption State
    const [targetProductId, setTargetProductId] = useState('');
    const [targetScope, setTargetScope] = useState<'PRODUCT' | 'API' | 'GLOBAL'>('PRODUCT');
    const [adopting, setAdopting] = useState(false);

    const environments = ['DEV', 'QA', 'PROD'];

    useEffect(() => {
        loadData();
        loadProducts();
    }, [env]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getOrphanBackends(env);
            setOrphans(data || []);
        } catch (err) {
            toast.error('Failed to load orphaned backends');
        } finally {
            setLoading(false);
        }
    };

    const loadProducts = async () => {
        try {
            const data = await getProducts();
            // Handle both paginated and non-paginated responses
            const productsList = Array.isArray(data) ? data : data.products;
            setProducts(productsList || []);
        } catch (err) {
            console.error('Failed to load products', err);
        }
    };

    const handleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleAdopt = async () => {
        if (selectedIds.length === 0) return;
        if (targetScope !== 'GLOBAL' && !targetProductId) {
            toast.error('Please select a target product');
            return;
        }

        setAdopting(true);
        try {
            for (const id of selectedIds) {
                await adoptBackend(id, env, {
                    productId: targetScope === 'GLOBAL' ? undefined : targetProductId,
                    scope: targetScope
                });
            }
            toast.success(`Successfully reclaimed ${selectedIds.length} backends`);
            setSelectedIds([]);
            loadData();
        } catch (err) {
            toast.error('Reclamation failed');
        } finally {
            setAdopting(false);
        }
    };

    const handleDelete = async () => {
        if (selectedIds.length === 0) return;

        if (!confirm(`Are you sure you want to DELETE ${selectedIds.length} orphaned backends? This cannot be undone.`)) {
            return;
        }

        setAdopting(true);
        try {
            // TODO: Implement delete API endpoint
            toast.error('Delete functionality coming soon');
        } catch (err) {
            toast.error('Delete failed');
        } finally {
            setAdopting(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Filters Bar - Matching other tabs */}
            <div className="flex gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex-1">
                    <span className="text-xs font-bold uppercase text-slate-500 tracking-widest">Environment:</span>
                </div>
                <select
                    value={env}
                    onChange={(e) => setEnv(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                    {environments.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
                <div className="text-xs text-slate-500">
                    Found {orphans.length} orphans in {env}
                </div>
            </div>

            {/* Action Bar */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Orphaned Backends</h3>
                    <p className="text-sm text-slate-500">Found <span className="font-bold text-amber-600">{orphans.length}</span> unassigned backends requiring action.</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <select
                        value={targetScope}
                        onChange={(e) => setTargetScope(e.target.value as any)}
                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="PRODUCT">Assign to Product</option>
                        <option value="GLOBAL">Mark as GLOBAL</option>
                    </select>

                    {targetScope === 'PRODUCT' && (
                        <select
                            value={targetProductId}
                            onChange={(e) => setTargetProductId(e.target.value)}
                            disabled={adopting}
                            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Select Target Product...</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    )}

                    <button
                        onClick={handleAdopt}
                        disabled={selectedIds.length === 0 || adopting}
                        className="px-6 py-2 bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-lg transition-all whitespace-nowrap"
                    >
                        {adopting ? 'Processing...' : `Reclaim (${selectedIds.length})`}
                    </button>

                    <button
                        onClick={handleDelete}
                        disabled={selectedIds.length === 0 || adopting}
                        className="px-6 py-2 bg-red-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed hover:bg-red-700 text-white text-sm font-bold rounded-lg shadow-lg transition-all whitespace-nowrap"
                    >
                        Delete ({selectedIds.length})
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-800/80 border-b border-gray-100 dark:border-slate-700">
                        <tr>
                            <th className="p-4 w-12 text-center">
                                <input
                                    type="checkbox"
                                    checked={orphans.length > 0 && selectedIds.length === orphans.length}
                                    onChange={() => {
                                        if (selectedIds.length === orphans.length) {
                                            setSelectedIds([]);
                                        } else {
                                            setSelectedIds(orphans.map(b => b.id));
                                        }
                                    }}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                            </th>
                            <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Backend ID</th>
                            <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Target URL</th>
                            <th className="p-4 font-bold text-slate-600 dark:text-slate-300 w-24">Scope</th>
                            <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Last Updated</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="p-12 text-center">
                                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-4">Loading...</p>
                                </td>
                            </tr>
                        ) : orphans.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-16 text-center">
                                    <div className="text-4xl mb-4">✨</div>
                                    <div className="text-slate-900 dark:text-white font-black text-lg mb-1">No Orphans Found</div>
                                    <div className="text-slate-500 text-sm">All backends in {env} are properly assigned.</div>
                                </td>
                            </tr>
                        ) : (
                            orphans.map(b => (
                                <tr key={b.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${selectedIds.includes(b.id) ? 'bg-blue-50 dark:bg-blue-900/10' : ''}`}>
                                    <td className="p-4 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(b.id)}
                                            onChange={() => handleSelect(b.id)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </td>
                                    <td className="p-4">
                                        <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-mono text-blue-600 dark:text-blue-400">{b.title || b.id}</code>
                                    </td>
                                    <td className="p-4 font-medium text-slate-900 dark:text-white">
                                        <code className="text-xs">{b.url}</code>
                                    </td>
                                    <td className="p-4">
                                        <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded text-xs font-bold uppercase">
                                            {b.scope || 'ORPHAN'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-slate-500">
                                        {b.updatedAt ? new Date(b.updatedAt).toLocaleDateString() : 'N/A'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
