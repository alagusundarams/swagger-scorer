import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../../layouts/MainLayout/MainLayout.view';
import { MOCK_ORPHANED_DATA, ExtractedResource } from '../api/mockOrphanedData';
import { Typeahead } from '../../../components/ui/Typeahead';
import { MOCK_AD_GROUPS } from '../api/mockAdGroups';
import { useStore } from '../../../store/useStore';
import { toast } from 'react-hot-toast';

export const AdminMappingView = () => {
    const { teams, addTeam, updateProduct } = useStore();
    const [orphans, setOrphans] = useState<ExtractedResource[]>(MOCK_ORPHANED_DATA);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Navigation & Breadcrumbs

    const navigate = useNavigate();

    // Ensure breadcrumb context is set (simulated via route state or just manual header)
    // Note: The MainLayout/Breadcrumbs component typically reads from location.state or path.
    // For this view, we want "Inventory > Admin Mapping".

    // Team Creation State
    const [isCreatingTeam, setIsCreatingTeam] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [newAdGroup, setNewAdGroup] = useState('');

    // Pre-fill AD Groups with User's groups to simulate "My Groups" realism
    const adGroupOptions = useMemo(() => {
        // In a real app, this would merge Directory Search results with User's Token Groups
        // For demo, we prioritize MOCK items but could highlight if they matched user groups
        return MOCK_AD_GROUPS.map(g => ({
            id: g.id,
            label: g.displayName,
            subLabel: g.description
        }));
    }, []);

    const filteredOrphans = useMemo(() => {
        return orphans.filter(o =>
            o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [orphans, searchTerm]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(filteredOrphans.map(o => o.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleSelectOne = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleCreateTeam = () => {
        if (!newTeamName || !newAdGroup) {
            toast.error('Team Name and AD Group are required');
            return;
        }

        // Mock Team Creation
        addTeam({
            id: `team-${newTeamName.toLowerCase().replace(/\s+/g, '-')}`,
            name: newTeamName,
            azureAdGroupId: newAdGroup,
            type: 'producer',
            description: 'Created via Admin Mapping',
            memberCount: 1
        });

        toast.success(`Team "${newTeamName}" created!`);
        setIsCreatingTeam(false);
        setNewTeamName('');
        setNewAdGroup('');
    };

    const handleAssign = async () => {
        if (!selectedTeamId) {
            toast.error('Please select a target team');
            return;
        }

        const team = teams.find(t => t.id === selectedTeamId);
        let successCount = 0;

        // Process each selected resource
        // Logic: 
        // 1. If GRP Product -> Update Product Owner ONLY. Do NOT update APIs (they remain with origin teams).
        // 2. If Standard Product -> Update Product Owner AND associated APIs.
        // 3. If Standalone API -> Update API Owner (if supported by backend model, else just log).

        const resourcesToProcess = orphans.filter(o => selectedIds.has(o.id));
        console.log(`[AdminMapping] Processing ${resourcesToProcess.length} items for assignment to team ${selectedTeamId}`);

        for (const res of resourcesToProcess) {
            try {
                if (res.type === 'Product') {
                    const isGrp = res.details?.type === 'grp';
                    console.log(`[AdminMapping] processing product ${res.id} (isGrp: ${isGrp})`);

                    // 1. Update Product Ownership
                    await updateProduct(res.id, { ownerTeamId: selectedTeamId });

                    // 2. Handle Associated APIs
                    if (isGrp) {
                        console.log(`[AdminMapping] GRP Rule Active: Skipping API updates for GRP Product ${res.id}. APIs retain origin owners.`);
                        // GRP Rule: APIs keep their original owners (e.g., Payments vs Identity)
                    } else {
                        console.log(`[AdminMapping] Standard Rule: Cascading ownership update to APIs for Standard Product ${res.id}`);
                        // Note: In a real app we would fetch APIs for this product and update them.
                    }
                    successCount++;
                } else if (res.type === 'API') {
                    console.log(`[AdminMapping] Direct API Assignment: ${res.id} -> ${selectedTeamId}`);
                    // Direct API assignment (e.g. orphaned API not in product)
                    // TODO: Implement updateAPI in store if needed.
                    // For this mock, we'll just log and increment success.
                    // In a real app, you'd call an updateAPI function here.
                    // await updateAPI(res.id, { ownerTeamId: selectedTeamId });
                    successCount++;
                }
            } catch (err) {
                console.error(`[AdminMapping] Failed to assign ${res.id}`, err);
                toast.error(`Failed to assign ${res.name}`);
            }
        }

        // Remove processed items from the list
        setOrphans(prev => prev.filter(o => !selectedIds.has(o.id)));
        setSelectedIds(new Set());

        toast.success(`Allocated ${successCount} resources to ${team?.name}. GRP rules applied.`);
    };

    return (
        <MainLayout>
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Breadcrumbs (Simulated visual for now, MainLayout handles real structure) */}
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-6 uppercase tracking-wider font-medium">
                    <span className="cursor-pointer hover:text-blue-600" onClick={() => navigate('/dashboard')}>Inventory</span>
                    <span>/</span>
                    <span className="text-gray-900 dark:text-gray-300 font-bold">Admin Mapping</span>
                </div>

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Admin Mapping</h1>
                        <p className="text-slate-500 mt-2">Reconcile orphaned APIM resources with Teams.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                            <span>⚠️</span> {orphans.length} Orphans Found
                        </div>
                    </div>
                </div>

                {/* Info Card for GRP Logic */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl mb-8 flex items-start gap-3">
                    <span className="text-lg">ℹ️</span>
                    <div>
                        <h3 className="text-sm font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wide">Assignment Logic</h3>
                        <p className="text-xs text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                            <span className="font-bold">Standard Products:</span> Assigning a team updates the Product and all its APIs. <br />
                            <span className="font-bold">GRP Products:</span> Assigning a team updates <span className="underline">only</span> the Product container. Associated APIs retain their original Producer Team ownership.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* LEFT: Resource List */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden flex flex-col h-[700px]">
                        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex gap-4">
                            <input
                                type="text"
                                placeholder="Search orphaned resources..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="flex-1 bg-gray-50 dark:bg-slate-900 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="overflow-y-auto flex-1">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-slate-900 sticky top-0">
                                    <tr>
                                        <th className="p-4 w-10">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.size === filteredOrphans.length && filteredOrphans.length > 0}
                                                onChange={handleSelectAll}
                                                className="rounded border-gray-300 dark:border-slate-600 focus:ring-blue-500"
                                            />
                                        </th>
                                        <th className="p-4 font-bold text-gray-500 uppercase tracking-wider text-xs">Name</th>
                                        <th className="p-4 font-bold text-gray-500 uppercase tracking-wider text-xs">Type</th>
                                        <th className="p-4 font-bold text-gray-500 uppercase tracking-wider text-xs">Env</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                    {filteredOrphans.map(orphan => (
                                        <tr
                                            key={orphan.id}
                                            className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 transition cursor-pointer ${selectedIds.has(orphan.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                            onClick={() => handleSelectOne(orphan.id)}
                                        >
                                            <td className="p-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(orphan.id)}
                                                    onChange={() => { }} // Handled by row click
                                                    className="rounded border-gray-300 dark:border-slate-600 focus:ring-blue-500"
                                                />
                                            </td>
                                            <td className="p-4 font-medium text-gray-900 dark:text-white">
                                                {orphan.name}
                                                <div className="text-xs text-cool-gray-400 font-mono mt-0.5">{orphan.id}</div>
                                                {orphan.details?.type === 'grp' && (
                                                    <span className="inline-block mt-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-bold uppercase rounded">GRP Bundle</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${orphan.type === 'Product' ? 'bg-purple-100 text-purple-700' :
                                                    orphan.type === 'API' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {orphan.type}
                                                </span>
                                            </td>
                                            <td className="p-4 text-xs font-mono text-gray-500">{orphan.environment}</td>
                                        </tr>
                                    ))}
                                    {filteredOrphans.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="p-8 text-center text-gray-400">
                                                No orphans found matching your search.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-4 border-t border-gray-100 dark:border-slate-700 text-xs text-gray-400 flex justify-between">
                            <span>{selectedIds.size} selected</span>
                            <span>Total: {orphans.length}</span>
                        </div>
                    </div>

                    {/* RIGHT: Action Panel */}
                    <div className="space-y-6">


                        {/* Target Team Selector */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Assign Ownership</h2>

                            <div className="mb-4">
                                <Typeahead
                                    label="Target Team"
                                    placeholder="Search for a team..."
                                    options={teams.map(t => ({ id: t.id, label: t.name, subLabel: t.azureAdGroupId }))}
                                    value={selectedTeamId}
                                    onChange={setSelectedTeamId}
                                />
                            </div>

                            <button
                                onClick={handleAssign}
                                disabled={selectedIds.size === 0 || !selectedTeamId}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition shadow-md flex items-center justify-center gap-2"
                            >
                                <span>Link Resources</span>
                                <span className="bg-blue-800/50 px-2 py-0.5 rounded text-xs">{selectedIds.size}</span>
                            </button>
                        </div>

                        {/* Create Team Quick Action */}
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-dashed border-gray-300 dark:border-slate-600">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-gray-700 dark:text-slate-300">Missing a Team?</h3>
                                {isCreatingTeam ? (
                                    <button onClick={() => setIsCreatingTeam(false)} className="text-xs text-red-500 hover:underline">Cancel</button>
                                ) : (
                                    <button
                                        onClick={() => setIsCreatingTeam(true)}
                                        className="text-xs text-blue-600 font-bold hover:underline"
                                    >
                                        + Create New
                                    </button>
                                )}
                            </div>

                            {isCreatingTeam && (
                                <div className="space-y-3 animate-fade-in">
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="Team Name (e.g. Checkout Squad)"
                                            className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm"
                                            value={newTeamName}
                                            onChange={e => setNewTeamName(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Typeahead
                                            label="AD Group (1000+ Items)"
                                            placeholder="Search directory..."
                                            options={adGroupOptions}
                                            value={newAdGroup}
                                            onChange={setNewAdGroup}
                                        />
                                    </div>
                                    <button
                                        onClick={handleCreateTeam}
                                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition"
                                    >
                                        Create & Sync
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};
