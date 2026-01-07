import { useState, useEffect, useMemo } from 'react';
import { useAppData } from '../../../shared/context/AppDataContext';
import { eventBus } from '../../../shared/events/eventBus';
import { getSubscriptions, adoptSubscription } from '../api/adminClient';
import { bulkDeleteOrphans } from '../api/adminDeleteClient';
import toast from 'react-hot-toast';

/**
 * OrphanSubscriptionManager
 * 
 * 📍 Purpose:
 * Dedicated UI for Platform Admins to identify "Day 1" orphaned subscriptions
 * (those without a valid team owner) and assign them to active teams.
 */
export const OrphanSubscriptionManager = () => {
    const { teams } = useAppData();
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSubscriptions = async () => {
        setIsLoading(true);
        try {
            const data = await getSubscriptions();
            setSubscriptions(data);
        } catch (err) {
            console.error('Failed to fetch subscriptions', err);
            toast.error('Failed to load subscriptions');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscriptions();

        const unsubscribe = eventBus.on('data:refresh', (payload) => {
            if (payload.dataType === 'subscriptions' || payload.dataType === 'all') {
                fetchSubscriptions();
            }
        });

        return () => unsubscribe();
    }, []);

    const [selectedSubIds, setSelectedSubIds] = useState<Set<string>>(new Set());
    const [targetTeamId, setTargetTeamId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [envFilter, setEnvFilter] = useState<string>('ALL');

    // Identify Orphans: No subscriberTeamId
    const orphans = useMemo(() => {
        const teamIds = new Set(teams.map(t => t.id));
        // Ensure subscriptions is an array
        const subsList = Array.isArray(subscriptions) ? subscriptions : [];
        return subsList.filter(s => !s.subscriberTeamId || !teamIds.has(s.subscriberTeamId));
    }, [subscriptions, teams]);

    // Apply filters
    const filteredOrphans = useMemo(() => {
        let filtered = orphans;

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(s =>
                s.appDisplayName?.toLowerCase().includes(query) ||
                s.id?.toLowerCase().includes(query) ||
                s.productName?.toLowerCase().includes(query)
            );
        }

        if (envFilter !== 'ALL') {
            filtered = filtered.filter(s => s.environment === envFilter);
        }

        return filtered;
    }, [orphans, searchQuery, envFilter]);

    const handleSelect = (id: string) => {
        const next = new Set(selectedSubIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedSubIds(next);
    };

    const handleSelectAll = () => {
        if (selectedSubIds.size === filteredOrphans.length) {
            setSelectedSubIds(new Set());
        } else {
            setSelectedSubIds(new Set(filteredOrphans.map(s => s.id)));
        }
    };

    const handleAdopt = async () => {
        if (!targetTeamId) {
            toast.error('Please select a target team');
            return;
        }

        const count = selectedSubIds.size;
        const toastId = toast.loading(`Adopting ${count} subscriptions...`);

        try {
            await Promise.all(
                Array.from(selectedSubIds).map(id => adoptSubscription(id, targetTeamId))
            );
            toast.success(`${count} subscriptions adopted successfully`, { id: toastId });
            setSelectedSubIds(new Set());
            setTargetTeamId('');
            fetchSubscriptions();
        } catch (error) {
            toast.error('Failed to adopt subscriptions', { id: toastId });
            console.error(error);
        }
    };

    const handleDelete = async () => {
        if (selectedSubIds.size === 0) return;

        // Confirmation
        const confirmed = confirm(
            `⚠️ DELETE ${selectedSubIds.size} orphaned subscriptions?\n\n` +
            `This will:\n` +
            `• Permanently remove subscriptions\n` +
            `• Create audit trail\n` +
            `• Cannot be undone\n\n` +
            `Proceed?`
        );

        if (!confirmed) return;

        // Get reason
        const reason = prompt(
            'REQUIRED: Enter reason for deletion\n\n' +
            'Examples:\n' +
            '• "Expired/Unused"\n' +
            '• "Test data cleanup"\n\n' +
            'Minimum 10 characters:'
        );

        if (!reason || reason.trim().length < 10) {
            toast.error('Deletion reason required (minimum 10 characters)');
            return;
        }

        const count = selectedSubIds.size;
        const toastId = toast.loading(`Deleting ${count} subscriptions...`);

        try {
            // Subscriptions in this view might not have the :env: suffix if they rely on envFilter
            // But checking the API client, getSubscriptions returns what backend gives.
            // We'll pass the IDs as is. The backend saga expects "subscription" resource type.

            // Note: The backend saga splits ID by :env: to find environment. 
            // If these IDs don't have it, we might need to rely on the backend to handle it or the UI to append it?
            // Existing subscription IDs usually are GUIDs or names. 
            // In OrphanProductManager, we used the ID directly. 
            // Let's assume the ID format is compatible or handled by the backend logic.

            const result = await bulkDeleteOrphans(
                'subscription',
                Array.from(selectedSubIds),
                reason.trim()
            );

            if (result.deleted > 0) {
                toast.success(
                    `✅ Deleted ${result.deleted} subscriptions. ` +
                    (result.failed > 0 ? `${result.failed} failed.` : ''),
                    { id: toastId }
                );
            } else if (result.failed > 0) {
                toast.error(`Failed to delete subscriptions. Check console.`, { id: toastId });
            }

            setSelectedSubIds(new Set());
            setTargetTeamId('');
            fetchSubscriptions();

        } catch (error: any) {
            toast.error(`Delete failed: ${error.message || 'Unknown error'}`, { id: toastId });
            console.error(error);
        }
    };

    if (isLoading && subscriptions.length === 0) {
        return <div className="p-12 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest text-xs">Scanning for Orphans...</div>;
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Filters Bar */}
            <div className="flex gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex-1">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                        <input
                            type="text"
                            placeholder="Search by app name, ID, or product..."
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
                    Showing {filteredOrphans.length} of {orphans.length} orphans
                </div>
            </div>

            {/* Action Bar */}
            <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-200 dark:border-blue-900/30 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-blue-900 dark:text-blue-400 flex items-center gap-2 tracking-tight">
                        <span className="text-2xl animate-bounce-slow">🍼</span> Orphan Subscription Reclamation
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-500/80 font-medium">
                        Found <span className="font-bold underline">{orphans.length}</span> active keys without a registered team owner.
                    </p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <select
                        className="w-full md:w-64 bg-white dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-900/50 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white transition-all shadow-sm"
                        value={targetTeamId}
                        onChange={(e) => setTargetTeamId(e.target.value)}
                    >
                        <option value="">Select Adoptive Team...</option>
                        {teams.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>

                    <button
                        onClick={handleAdopt}
                        disabled={selectedSubIds.size === 0 || !targetTeamId}
                        className="px-8 py-2.5 bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 h-11 whitespace-nowrap"
                    >
                        <span>Adopt Selected</span>
                        {selectedSubIds.size > 0 && (
                            <span className="bg-white/30 px-2 py-0.5 rounded-full text-[10px]">{selectedSubIds.size}</span>
                        )}
                    </button>

                    <button
                        onClick={handleDelete}
                        disabled={selectedSubIds.size === 0 || isLoading}
                        className="px-6 py-2.5 bg-red-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-500/20 transition-all flex items-center gap-2 h-11 whitespace-nowrap"
                    >
                        <span>Delete</span>
                        {selectedSubIds.size > 0 && (
                            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{selectedSubIds.size}</span>
                        )}
                    </button>
                </div>
            </div>

            {/* List Table */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-premium">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                        <tr>
                            <th className="p-5 w-14 text-center">
                                <input
                                    type="checkbox"
                                    checked={filteredOrphans.length > 0 && selectedSubIds.size === filteredOrphans.length}
                                    onChange={handleSelectAll}
                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                            </th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Subscription / App</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Target Product</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Created</th>
                            <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                        {filteredOrphans.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-16 text-center">
                                    <div className="text-4xl mb-4 text-white">✨</div>
                                    <div className="text-slate-900 dark:text-white font-black text-lg mb-1">Zero Orphans Found</div>
                                    <div className="text-slate-500 text-sm font-medium">All active subscriptions are properly mapped to teams.</div>
                                </td>
                            </tr>
                        ) : (
                            filteredOrphans.map(sub => (
                                <tr key={sub.id} className={`group hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${selectedSubIds.has(sub.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                                    <td className="p-5 text-center">
                                        <input
                                            type="checkbox"
                                            checked={selectedSubIds.has(sub.id)}
                                            onChange={() => handleSelect(sub.id)}
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                    </td>
                                    <td className="p-5">
                                        <div className="font-bold text-slate-900 dark:text-white">{sub.appDisplayName || 'Legacy App'}</div>
                                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{sub.id}</div>
                                    </td>
                                    <td className="p-5 font-medium text-slate-900 dark:text-white">
                                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                            {sub.productName}
                                        </span>
                                    </td>
                                    <td className="p-5 text-xs text-slate-500 font-medium">
                                        {new Date(sub.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="p-5 text-right">
                                        <button
                                            onClick={() => handleSelect(sub.id)}
                                            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tighter transition-all ${selectedSubIds.has(sub.id) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                        >
                                            {selectedSubIds.has(sub.id) ? 'Selected' : 'Mark for Adoption'}
                                        </button>
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
