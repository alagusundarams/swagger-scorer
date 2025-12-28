import { useState, useMemo } from 'react';
import { useInventoryStore } from '../../inventory/hooks/useInventoryStore';
import toast from 'react-hot-toast';

export const OrphanProductManager = () => {
    const { products, teams, updateProduct } = useInventoryStore();
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

    const orphans = useMemo(() => {
        const teamIds = new Set(teams.map(t => t.id));
        return products.filter(p => !p.ownerTeamId || !teamIds.has(p.ownerTeamId) || p.ownerTeamId === 'legacy-pool');
    }, [products, teams]);

    const activeInventory = useMemo(() => {
        const teamIds = new Set(teams.map(t => t.id));
        return products.filter(p => p.ownerTeamId && teamIds.has(p.ownerTeamId) && p.ownerTeamId !== 'legacy-pool');
    }, [products, teams]);

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

    return (
        <div className="space-y-8">
            {/* Action Bar */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Orphaned / Legacy Products</h3>
                    <p className="text-sm text-slate-500">Found <span className="font-bold text-red-500">{orphans.length}</span> unassigned APIs requiring governance.</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex flex-col gap-2">
                        <div className="w-64">
                            <select
                                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white"
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
                        className="px-6 py-2 bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-lg transition-all flex items-center gap-2 h-10 self-start"
                    >
                        <span>Assign Selected</span>
                        {selectedProductIds.size > 0 && (
                            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{selectedProductIds.size}</span>
                        )}
                    </button>
                </div>
            </div>

            {/* Orphan List */}
            <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-800/80 border-b border-gray-100 dark:border-slate-700">
                        <tr>
                            <th className="p-4 w-12 text-center">
                                <input
                                    type="checkbox"
                                    checked={orphans.length > 0 && selectedProductIds.size === orphans.length}
                                    onChange={handleSelectAll}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                            </th>
                            <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Product Name</th>
                            <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Version</th>
                            <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Last Updated</th>
                            <th className="p-4 font-bold text-slate-600 dark:text-slate-300">Current Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {orphans.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                                    No orphan products found. Good job! 🎉
                                </td>
                            </tr>
                        ) : (
                            orphans.map(product => (
                                <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedProductIds.has(product.id)}
                                            onChange={() => handleSelect(product.id)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </td>
                                    <td className="p-4 font-medium text-slate-900 dark:text-white">
                                        {product.displayName || product.name}
                                        <div className="text-xs text-slate-400 font-mono mt-0.5">{product.id}</div>
                                    </td>
                                    <td className="p-4 text-slate-600 dark:text-slate-400">
                                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-mono">{product.version}</span>
                                    </td>
                                    <td className="p-4 text-slate-500">
                                        {new Date(product.updatedAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-4">
                                        <span className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                                            No Owner
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Just for Context: Active Inventory Count */}
            <div className="text-center text-xs text-slate-400 mt-8">
                Total Managed Inventory: {activeInventory.length} Products
            </div>
        </div>
    );
};
