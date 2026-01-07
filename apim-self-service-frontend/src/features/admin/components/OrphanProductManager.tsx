import { useState, useEffect, useMemo } from 'react';
import { useAppData } from '../../../shared/context/AppDataContext';
import { eventBus } from '../../../shared/events/eventBus';
import type { Product } from '../../../shared/types/domain';
import { updateProduct } from '../api/adminClient';
import { getProducts, type PaginatedResponse } from '../../../features/inventory/api/inventoryClient';
import toast from 'react-hot-toast';

export const OrphanProductManager = () => {
    /**
     * MFE-Compliant Data Access:
     * Using shared AppDataContext for read-only team data.
     * For product operations, we'll use the admin feature's own API client.
     */
    const { teams } = useAppData();
    const [products, _setProducts] = useState<Product[]>([]);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
    const [searchQuery, setSearchQuery] = useState('');
    const [envFilter, setEnvFilter] = useState<string>('ALL');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Fetch products with pagination
        const controller = new AbortController();
        const fetchOrphans = async () => {
            setIsLoading(true);
            try {
                const response = await getProducts(pagination.page, pagination.limit) as PaginatedResponse<Product>;
                _setProducts(response.products);
                if (response.pagination) {
                    setPagination(response.pagination);
                }
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    console.error('Failed to fetch products for orphan check', err);
                    toast.error('Failed to load products');
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrphans();

        // Listen for refresh events
        const unsubscribe = eventBus.on('data:refresh', (payload) => {
            if (payload.dataType === 'products' || payload.dataType === 'all') {
                fetchOrphans();
            }
        });

        return () => {
            controller.abort();
            unsubscribe();
        };
    }, [pagination.page, pagination.limit]);
    const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
    const [targetTeamId, setTargetTeamId] = useState<string>('');
    const [targetAdGroupId, setTargetAdGroupId] = useState<string>('');

    // Identify Orphans: No ownerTeamId or invalid team ID
    // For demo/mock purposes, we might need to assume some are orphans if we don't have bad data mocked.
    // Let's treat any product where ownerTeamId is NOT in the active teams list as an orphan?
    // Or just look for specific 'legacy' markers.
    // Since our mock data is 'clean', let's pretend products with 'team-security' are legacy/orphaned for demo 
    // or just list ALL products and allow re-assignment (easier for Admin).
    // Let's stick to "Re-assignment Manager" logic: List all, highlight those without valid teams.

    // Apply local filters (search + environment) to fetched products
    const filteredProducts = useMemo(() => {
        let filtered = products;

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.displayName?.toLowerCase().includes(query) ||
                p.name.toLowerCase().includes(query) ||
                p.id.toLowerCase().includes(query)
            );
        }

        // Environment filter
        if (envFilter !== 'ALL') {
            filtered = filtered.filter(p => p.environment === envFilter);
        }

        return filtered;
    }, [products, searchQuery, envFilter]);

    const orphans = useMemo(() => {
        const teamIds = new Set(teams.map(t => t.id));
        return filteredProducts.filter(p => !p.ownerTeamId || !teamIds.has(p.ownerTeamId) || p.ownerTeamId === 'legacy-pool');
    }, [filteredProducts, teams]);

    const activeInventory = useMemo(() => {
        const teamIds = new Set(teams.map(t => t.id));
        return filteredProducts.filter(p => p.ownerTeamId && teamIds.has(p.ownerTeamId) && p.ownerTeamId !== 'legacy-pool');
    }, [filteredProducts, teams]);

    const targetTeam = useMemo(() => teams.find(t => t.id === targetTeamId), [teams, targetTeamId]);

    const handleSelect = (id: string) => {
        const next = new Set(selectedProductIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedProductIds(next);
    };

    const handleSelectAll = () => {
        if (selectedProductIds.size === orphans.length) {
            setSelectedProductIds(new Set());
        } else {
            setSelectedProductIds(new Set(orphans.map(p => p.id)));
        }
    };

    const handleAssign = async () => {
        if (!targetTeamId) {
            toast.error('Please select a target team');
            return;
        }

        const toastId = toast.loading(`Assigning ${selectedProductIds.size} products...`);
        try {
            await Promise.all(
                Array.from(selectedProductIds).map(id => updateProduct(id, {
                    ownerTeamId: targetTeamId,
                    ownerAdGroupId: targetAdGroupId || (targetTeam?.azureAdGroupId) // Default to primary if not selected
                }))
            );
            toast.success('Products assigned successfully', { id: toastId });
            setSelectedProductIds(new Set());
            setTargetTeamId('');
            setTargetAdGroupId('');
        } catch (error) {
            toast.error('Failed to assign products', { id: toastId });
            console.error(error);
        }
    };

    const handleDelete = async () => {
        if (selectedProductIds.size === 0) return;

        // Confirmation
        const confirmed = confirm(
            `⚠️ DELETE ${selectedProductIds.size} orphaned products?\n\n` +
            `This will:\n` +
            `• Permanently remove from active inventory\n` +
            `• Create audit trail\n` +
            `• Cannot be undone\n\n` +
            `Proceed?`
        );

        if (!confirmed) return;

        // Get reason (required)
        const reason = prompt(
            'REQUIRED: Enter reason for deletion\n\n' +
            'Examples:\n' +
            '• "Migrated to new API"\n' +
            '• "Test data cleanup"\n' +
            '• "Deprecated service"\n\n' +
            'Minimum 10 characters:'
        );

        if (!reason || reason.trim().length < 10) {
            toast.error('Deletion reason required (minimum 10 characters)');
            return;
        }

        // Call API
        setIsLoading(true);
        try {
            const { bulkDeleteOrphans } = await import('../api/adminDeleteClient');

            const result = await bulkDeleteOrphans(
                'product',
                Array.from(selectedProductIds),
                reason.trim()
            );

            if (result.deleted > 0) {
                toast.success(
                    `✅ Deleted ${result.deleted} products. ` +
                    (result.failed > 0 ? `${result.failed} failed. ` : '') +
                    `Audit: ${result.auditLogId.substring(0, 8)}...`
                );
            }

            if (result.failed > 0) {
                console.warn('[Delete] Failures:', result.failures);
                toast.error(`${result.failed} products failed to delete`);
            }

            setSelectedProductIds(new Set());
            // Trigger refetch by resetting to page 1
            setPagination(prev => ({ ...prev, page: prev.page })); // Force update

        } catch (err: any) {
            toast.error(`Delete failed: ${err.response?.data?.error || err.message}`);
            console.error('[Delete] Error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    return (
        <div className="space-y-8">
            {/* Filters Bar */}
            <div className="flex gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex-1">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                        <input
                            type="text"
                            placeholder="Search by name or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Environment</span>
                    <select
                        value={envFilter}
                        onChange={(e) => setEnvFilter(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 dark:text-white"
                    >
                        <option value="ALL">All Environments</option>
                        <option value="DEV">DEV</option>
                        <option value="QA">QA</option>
                        <option value="STAGE">STAGE</option>
                        <option value="PROD">PROD</option>
                    </select>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Showing {orphans.length} of {pagination.total} products (Page {pagination.page}/{pagination.totalPages})
                </div>
            </div>

            {/* Action Bar */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Orphaned / Legacy Products</h3>
                    <p className="text-sm text-slate-500 mt-1">Found <span className="font-bold text-red-600 text-base">{orphans.length}</span> unassigned APIs requiring governance.</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex flex-col gap-2">
                        <div className="w-64">
                            <select
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white transition-all shadow-sm"
                                value={targetTeamId}
                                onChange={(e) => {
                                    setTargetTeamId(e.target.value);
                                    setTargetAdGroupId(''); // Reset AD Group when team changes
                                }}
                            >
                                <option value="">Select Target Team...</option>
                                {teams.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Secondary Dropdown for Specific AD Group */}
                        {targetTeam && (targetTeam.additionalAdGroups?.length ?? 0) > 0 && (
                            <div className="w-64 animate-fade-in-down">
                                <select
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-gray-300"
                                    value={targetAdGroupId}
                                    onChange={(e) => setTargetAdGroupId(e.target.value)}
                                >
                                    <option value="">Default Group ({targetTeam.azureAdGroupId})</option>
                                    {targetTeam.additionalAdGroups?.map(group => (
                                        <option key={group} value={group}>{group}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleAssign}
                        disabled={selectedProductIds.size === 0 || !targetTeamId}
                        className="px-8 py-2.5 bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/10 transition-all flex items-center gap-2 h-11"
                    >
                        <span>Assign Selected</span>
                        {selectedProductIds.size > 0 && (
                            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">{selectedProductIds.size}</span>
                        )}
                    </button>

                    <button
                        onClick={handleDelete}
                        disabled={selectedProductIds.size === 0 || isLoading}
                        className="px-6 py-2.5 bg-red-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-500/10 transition-all flex items-center gap-2 h-11"
                    >
                        <span>Delete</span>
                        {selectedProductIds.size > 0 && (
                            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{selectedProductIds.size}</span>
                        )}
                    </button>
                </div>
            </div>

            {/* Orphan List */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-premium">
                {isLoading && (
                    <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-10">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                        <tr>
                            <th className="p-5 w-14 text-center">
                                <input
                                    type="checkbox"
                                    checked={orphans.length > 0 && selectedProductIds.size === orphans.length}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                            </th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Product Name</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Version</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Last Updated</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Current Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                        {orphans.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-16 text-center text-slate-500 italic">
                                    No orphan products found. Good job! 🎉
                                </td>
                            </tr>
                        ) : (
                            orphans.map(product => (
                                <tr key={product.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <td className="p-5 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedProductIds.has(product.id)}
                                            onChange={() => handleSelect(product.id)}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                    </td>
                                    <td className="p-5">
                                        <div className="font-bold text-slate-900 dark:text-white">{product.displayName || product.name}</div>
                                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{product.id}</div>
                                    </td>
                                    <td className="p-5">
                                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-mono font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                            {product.version}
                                        </span>
                                    </td>
                                    <td className="p-5 text-xs text-slate-500 font-medium">
                                        {new Date(product.updatedAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-5 text-right">
                                        <span className="inline-block text-[10px] font-black text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-full border border-red-100 dark:border-red-900/30 uppercase tracking-tighter">
                                            No Owner
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold uppercase disabled:opacity-30 hover:bg-slate-200 transition-all"
                    >
                        Previous
                    </button>
                    <div className="flex gap-1">
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                            .filter(page =>
                                page === 1 ||
                                page === pagination.totalPages ||
                                (page >= pagination.page - 2 && page <= pagination.page + 2)
                            )
                            .map(page => (
                                <button
                                    key={page}
                                    onClick={() => handlePageChange(page)}
                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${pagination.page === page
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    {page}
                                </button>
                            ))}
                    </div>
                    <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page === pagination.totalPages}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold uppercase disabled:opacity-30 hover:bg-slate-200 transition-all"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Stats */}
            <div className="text-center text-xs text-slate-400 mt-4">
                Total Managed Inventory: {activeInventory.length} Products · Showing {orphans.length} orphans
            </div>
        </div>
    );
};
