import React, { useState, useEffect } from 'react';
import {
    getOrphanNamedValues,
    adoptNamedValue
} from '../api/adminClient';
import { bulkDeleteOrphans } from '../api/adminDeleteClient';
import { getProducts } from '../../inventory/api/inventoryClient';
import { toast } from 'react-hot-toast';
import './OrphanManager.css'; // Assume shared styles

interface NamedValue {
    id: string;
    systemName: string;
    displayName?: string;
    environment: string;
    value: string;
    productId?: string;
    scopeId?: string;
    scope?: 'PRODUCT' | 'API' | 'GLOBAL' | null;
    updatedAt?: string;
}

export const OrphanNamedValueManager: React.FC = () => {
    const [orphans, setOrphans] = useState<NamedValue[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [env, setEnv] = useState('DEV');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Adoption State
    const [targetProductId, setTargetProductId] = useState('');
    const [targetScope, setTargetScope] = useState<'PRODUCT' | 'API' | 'GLOBAL'>('PRODUCT');
    const [adopting, setAdopting] = useState(false);

    const environments = ['DEV', 'QA', 'STAGE', 'PROD'];

    useEffect(() => {
        loadData();
        loadProducts();
    }, [env]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getOrphanNamedValues(env);
            setOrphans(data || []);
        } catch (err) {
            toast.error('Failed to load orphaned named values');
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
                await adoptNamedValue(id, env, {
                    productId: targetScope === 'GLOBAL' ? undefined : targetProductId,
                    scope: targetScope
                });
            }
            toast.success(`Successfully reclaimed ${selectedIds.length} named values`);
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

        // Confirmation
        const confirmed = confirm(
            `⚠️ DELETE ${selectedIds.length} orphaned named values?\n\n` +
            `This will:\n` +
            `• Permanently remove values\n` +
            `• Create audit trail\n` +
            `• Cannot be undone\n\n` +
            `Proceed?`
        );

        if (!confirmed) return;

        // Get reason
        const reason = prompt(
            'REQUIRED: Enter reason for deletion\n\n' +
            'Examples:\n' +
            '• "Deprecated/Unused"\n' +
            '• "Cleanup"\n' +
            'Minimum 10 characters:'
        );

        if (!reason || reason.trim().length < 10) {
            toast.error('Deletion reason required (minimum 10 characters)');
            return;
        }

        setAdopting(true);
        const toastId = toast.loading(`Deleting ${selectedIds.length} named values...`);

        try {
            const result = await bulkDeleteOrphans(
                'named_value',
                selectedIds,
                reason.trim()
            );

            if (result.deleted > 0) {
                toast.success(
                    `✅ Deleted ${result.deleted} named values. ` +
                    (result.failed > 0 ? `${result.failed} failed.` : ''),
                    { id: toastId }
                );
            } else if (result.failed > 0) {
                toast.error(`Failed to delete items. Check console.`, { id: toastId });
            }

            setSelectedIds([]);
            loadData();

        } catch (err: any) {
            toast.error(`Delete failed: ${err.message || 'Unknown error'}`, { id: toastId });
            console.error(err);
        } finally {
            setAdopting(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Filters Bar - Matching other tabs */}
            <div className="flex gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex-1">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                        <input
                            type="text"
                            placeholder="Filter by name..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Environment</span>
                    <select
                        value={env}
                        onChange={(e) => setEnv(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 dark:text-white"
                    >
                        {environments.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Found {orphans.length} orphans in {env}
                </div>
            </div>

            {/* Action Bar */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">Orphaned Named Values</h3>
                    <p className="text-sm text-slate-500 mt-1">Found <span className="font-bold text-amber-600">{orphans.length}</span> unassigned values requiring action.</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <select
                        value={targetScope}
                        onChange={(e) => setTargetScope(e.target.value as any)}
                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 dark:text-white"
                    >
                        <option value="PRODUCT">Assign to Product</option>
                        <option value="GLOBAL">Mark as GLOBAL</option>
                    </select>

                    {targetScope === 'PRODUCT' && (
                        <select
                            value={targetProductId}
                            onChange={(e) => setTargetProductId(e.target.value)}
                            disabled={adopting}
                            className="w-full md:w-64 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white transition-all shadow-sm"
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
                        className="px-8 py-2.5 bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/10 transition-all whitespace-nowrap h-11"
                    >
                        {adopting ? 'Processing...' : `Reclaim (${selectedIds.length})`}
                    </button>

                    <button
                        onClick={handleDelete}
                        disabled={selectedIds.length === 0 || adopting}
                        className="px-6 py-2.5 bg-red-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-500/10 transition-all whitespace-nowrap h-11"
                    >
                        Delete ({selectedIds.length})
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-premium">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                        <tr>
                            <th className="p-5 w-14 text-center">
                                <input
                                    type="checkbox"
                                    checked={orphans.length > 0 && selectedIds.length === orphans.length}
                                    onChange={() => {
                                        if (selectedIds.length === orphans.length) {
                                            setSelectedIds([]);
                                        } else {
                                            setSelectedIds(orphans.map(nv => nv.id));
                                        }
                                    }}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                            </th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">System Name</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Display Name</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 w-48 text-center">Value (Preview)</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 w-24 text-center">Scope</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Last Updated</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="p-16 text-center">
                                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-4">Hydrating...</p>
                                </td>
                            </tr>
                        ) : orphans.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-16 text-center">
                                    <div className="text-4xl mb-4 text-white">✨</div>
                                    <div className="text-slate-900 dark:text-white font-black text-lg mb-1">No Orphans Found</div>
                                    <div className="text-slate-500 text-sm font-medium">All named values in {env} are properly assigned.</div>
                                </td>
                            </tr>
                        ) : (
                            orphans.map(nv => (
                                <tr key={nv.id} className={`group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${selectedIds.includes(nv.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                    <td className="p-5 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(nv.id)}
                                            onChange={() => handleSelect(nv.id)}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                    </td>
                                    <td className="p-5">
                                        <code className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded font-mono text-blue-600 dark:text-blue-400 uppercase font-black">{nv.systemName}</code>
                                    </td>
                                    <td className="p-5 font-bold text-slate-900 dark:text-white">{nv.displayName || '-'}</td>
                                    <td className="p-5 text-center">
                                        <code className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[200px] inline-block bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-100 dark:border-slate-800" title={nv.value}>
                                            {nv.value.length > 20 ? nv.value.substring(0, 20) + '...' : nv.value}
                                        </code>
                                    </td>
                                    <td className="p-5 text-center">
                                        <span className={`inline-block text-[10px] font-black px-3 py-1 rounded-full border uppercase tracking-tighter ${nv.scope === 'GLOBAL' ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-900/30' : 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30'}`}>
                                            {nv.scope || 'ORPHAN'}
                                        </span>
                                    </td>
                                    <td className="p-5 text-right text-xs text-slate-500 font-medium tracking-tight">
                                        {nv.updatedAt ? new Date(nv.updatedAt).toLocaleDateString() : 'N/A'}
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
