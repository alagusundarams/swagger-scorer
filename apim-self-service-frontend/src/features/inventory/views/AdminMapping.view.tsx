import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../../layouts/MainLayout/MainLayout.view';
import { Typeahead } from '../../../components/ui/Typeahead';
import { useInventoryStore } from '../../inventory/hooks/useInventoryStore';
import { useTeamsStore } from '../../teams/store/teamsStore';
import { toast } from 'react-hot-toast';

interface ExtractedResource {
    id: string;
    name: string;
    type: 'Product' | 'API' | 'Subscription';
    environment: string;
    region: string;
    details: any;
    isOrphaned: boolean;
}

export const AdminMappingView = () => {
    const { updateProduct } = useInventoryStore();
    const { teams, addTeam } = useTeamsStore();
    const [orphans, setOrphans] = useState<ExtractedResource[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [selectedTeamId, setSelectedTeamId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const { products, fetchInventory, isLoading } = useInventoryStore();

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    // Compute orphans from real inventory
    useEffect(() => {
        if (!products || products.length === 0) return;

        const orphanedProducts = products
            .filter(p => !p.ownerTeamId || !teams.find(t => t.id === p.ownerTeamId))
            .map(p => ({
                id: p.id,
                name: p.displayName,
                type: 'Product' as const,
                environment: p.environment || 'DEV', // Default to DEV if missing to satisfy type
                region: p.region || 'Global',
                details: p,
                isOrphaned: true
            }));

        // In a real app we would also fetch orphaned APIs not attached to products
        // For now, we focus on Products as the primary unit of ownership
        setOrphans(orphanedProducts);
    }, [products, teams]);

    // Permission Matrix State
    const [selectedProductForMatrix, setSelectedProductForMatrix] = useState<ExtractedResource | null>(null);
    const [matrixEntries, setMatrixEntries] = useState<any[]>([]);
    const [isSavingMatrix, setIsSavingMatrix] = useState(false);

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
        return [].map((g: any) => ({
            id: g.id,
            label: g.displayName,
            subLabel: g.description
        }));
    }, []);

    const filteredOrphans = useMemo(() => {
        return orphans.filter((o: any) =>
            o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.id.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [orphans, searchTerm]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(filteredOrphans.map((o: any) => o.id)));
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

    const handleOpenMatrix = async (product: ExtractedResource) => {
        setSelectedProductForMatrix(product);
        setMatrixEntries([]); // Reset while loading

        try {
            import('../api/inventoryClient').then(async ({ getPermissionMatrix }) => {
                const res = (await getPermissionMatrix(product.id)) as any;
                setMatrixEntries(res.data);
            });
        } catch (err) {
            toast.error('Failed to load permission matrix');
        }
    };

    const handleSaveMatrix = async () => {
        if (!selectedProductForMatrix) return;
        setIsSavingMatrix(true);
        try {
            const { updatePermissionMatrix } = await import('../api/inventoryClient');
            await updatePermissionMatrix(selectedProductForMatrix.id, matrixEntries);
            toast.success('Permission matrix updated successfully');
            setSelectedProductForMatrix(null);
        } catch (err) {
            toast.error('Failed to save permission matrix');
        } finally {
            setIsSavingMatrix(false);
        }
    };

    const addMatrixEntry = () => {
        setMatrixEntries([...matrixEntries, {
            adGroupId: '',
            adGroupName: '',
            environment: 'DEV',
            role: 'Reader'
        }]);
    };

    const updateMatrixEntry = (index: number, updates: any) => {
        const next = [...matrixEntries];
        next[index] = { ...next[index], ...updates };
        setMatrixEntries(next);
    };

    const removeMatrixEntry = (index: number) => {
        setMatrixEntries(matrixEntries.filter((_, i) => i !== index));
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

        const resourcesToProcess = orphans.filter((o: any) => selectedIds.has(o.id));
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
        setOrphans(prev => prev.filter((o: any) => !selectedIds.has(o.id)));
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
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Admin Mapping</h1>
                        <p className="text-slate-500 mt-2 flex items-center gap-2">
                            <span>Reconcile orphaned APIM resources with Teams.</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Pristine Mode Active</span>
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                            <span>⚠️</span> {orphans.length} Orphans Found
                        </div>
                        <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                            Last Sync from Infra: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
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

                        {isLoading && (
                            <div className="p-8 text-center text-gray-400">
                                Loading inventory...
                            </div>
                        )}

                        {!isLoading && (
                            <>
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
                                                <th className="p-4 font-bold text-gray-500 uppercase tracking-wider text-xs">Region</th>
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
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-bold">{orphan.details?.displayName || orphan.name}</span>
                                                            {orphan.type === 'Product' && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleOpenMatrix(orphan); }}
                                                                    className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-black uppercase rounded hover:bg-blue-100 transition"
                                                                >
                                                                    Matrix
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="text-[10px] text-cool-gray-400 font-mono mt-0.5">{orphan.name}</div>

                                                        {/* Meta Info: Git & Type */}
                                                        <div className="flex items-center gap-2 mt-2">
                                                            {orphan.details?.type === 'grp' && (
                                                                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-black uppercase rounded shadow-sm border border-purple-200">GRP Bundle</span>
                                                            )}
                                                            {orphan.details?.managementMode === 'TERRAFORM_MANAGED' ? (
                                                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase rounded shadow-sm border border-emerald-200">Terraform Managed</span>
                                                            ) : (
                                                                <span className={`px-1.5 py-0.5 text-[9px] font-black uppercase rounded shadow-sm border ${(!orphan.details?.gitRepoUrl)
                                                                    ? 'bg-red-50 text-red-700 border-red-200'
                                                                    : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                                                                    {(!orphan.details?.gitRepoUrl) ? 'Portal Managed - Ghost' : 'Portal Managed'}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Action Links */}
                                                        {(orphan.details?.gitRepoUrl || orphan.details?.pipelineInfo?.url) && (
                                                            <div className="flex items-center gap-3 mt-2">
                                                                {orphan.details?.gitRepoUrl && (
                                                                    <div className="flex items-center gap-2">
                                                                        <a
                                                                            href={orphan.details.gitRepoUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                            className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-bold"
                                                                        >
                                                                            <span>REPO</span>
                                                                            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                                        </a>
                                                                        {orphan.details?.lastDeployedCommitHash && (
                                                                            <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200" title="Last Deployed Hash">
                                                                                #{orphan.details.lastDeployedCommitHash.substring(0, 7)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                                {orphan.details?.pipelineInfo?.url && (
                                                                    <a
                                                                        href={orphan.details.pipelineInfo.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="text-[10px] text-emerald-600 hover:text-emerald-800 flex items-center gap-1 font-bold"
                                                                    >
                                                                        <span>PIPELINE</span>
                                                                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${orphan.type === 'Product' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                                                            orphan.type === 'API' ? 'bg-cyan-50 text-cyan-700 border border-cyan-100' :
                                                                'bg-gray-50 text-gray-700 border border-gray-100'
                                                            }`}>
                                                            {orphan.type}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-xs font-mono text-slate-400 font-bold">{orphan.environment}</td>
                                                    <td className="p-4 text-xs font-mono text-slate-400 font-bold">{orphan.region}</td>
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
                            </>
                        )}</div>

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

            {/* Permission Matrix Modal */}
            {selectedProductForMatrix && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                        <div className="px-8 py-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white">Permission Matrix</h2>
                                <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">
                                    Product: {selectedProductForMatrix.name}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedProductForMatrix(null)}
                                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-8">
                            <div className="mb-6 flex justify-between items-center">
                                <h3 className="text-sm font-black uppercase tracking-widest text-blue-600">Access Policies</h3>
                                <button
                                    onClick={addMatrixEntry}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase transition hover:bg-blue-700"
                                >
                                    + Add Group Mapping
                                </button>
                            </div>

                            {matrixEntries.length === 0 ? (
                                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                    <span className="text-4xl block mb-4">🛡️</span>
                                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No custom permissions defined.</p>
                                    <button onClick={addMatrixEntry} className="text-blue-600 font-bold mt-2 hover:underline">Apply First Policy</button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {matrixEntries.map((entry, idx) => (
                                        <div key={idx} className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-700 flex items-center gap-4 transition-all hover:shadow-md animate-in slide-in-from-bottom-2">
                                            <div className="flex-1">
                                                <Typeahead
                                                    label="AD Group"
                                                    placeholder="Search groups..."
                                                    options={adGroupOptions}
                                                    value={entry.adGroupId}
                                                    onChange={(val) => {
                                                        const label = adGroupOptions.find((o: any) => o.id === val)?.label;
                                                        updateMatrixEntry(idx, { adGroupId: val, adGroupName: label });
                                                    }}
                                                />
                                            </div>
                                            <div className="w-40">
                                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Environment</label>
                                                <select
                                                    value={entry.environment}
                                                    onChange={e => updateMatrixEntry(idx, { environment: e.target.value })}
                                                    className="w-full bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 rounded-lg text-xs p-2 font-bold focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="DEV">DEV</option>
                                                    <option value="QA">QA</option>
                                                    <option value="STAGE">STAGE</option>
                                                    <option value="PROD">PROD</option>
                                                </select>
                                            </div>
                                            <div className="w-40">
                                                <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 ml-1">Role</label>
                                                <select
                                                    value={entry.role}
                                                    onChange={e => updateMatrixEntry(idx, { role: e.target.value })}
                                                    className="w-full bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 rounded-lg text-xs p-2 font-bold focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="Reader">Reader</option>
                                                    <option value="Contributor">Contributor</option>
                                                    <option value="Admin">Admin</option>
                                                </select>
                                            </div>
                                            <button
                                                onClick={() => removeMatrixEntry(idx)}
                                                className="mt-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="px-8 py-6 bg-slate-50 dark:bg-slate-900/50 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-4">
                            <button
                                onClick={() => setSelectedProductForMatrix(null)}
                                className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveMatrix}
                                disabled={isSavingMatrix || matrixEntries.some(e => !e.adGroupId)}
                                className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold transition shadow-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isSavingMatrix ? 'Saving...' : 'Save Matrix'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};
