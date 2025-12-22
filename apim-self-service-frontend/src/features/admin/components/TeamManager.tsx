import { useState } from 'react';
import { useStore } from '../../../store/useStore';
import { type Team } from '../../../types/entities';
import { Input } from '../../../core/ui/Input';
import toast from 'react-hot-toast';

export const TeamManager = () => {
    const { teams, updateTeam, user } = useStore();
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Team>>({});

    // Filter teams if needed, or show all
    // Admins see all teams.

    const handleEditClick = (team: Team) => {
        setEditingTeamId(team.id);
        setEditForm({ ...team, adGroupMapping: { ...team.adGroupMapping } });
    };

    const handleCancel = () => {
        setEditingTeamId(null);
        setEditForm({});
    };

    const handleSave = async () => {
        if (!editingTeamId) return;

        try {
            await updateTeam(editingTeamId, editForm);
            toast.success('Team updated successfully');
            setEditingTeamId(null);
        } catch (error) {
            toast.error('Failed to update team');
            console.error(error);
        }
    };

    const handleInputChange = (field: keyof Team, value: any) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    const handleMappingChange = (env: 'DEV' | 'QA' | 'STAGE' | 'PROD', value: string) => {
        setEditForm(prev => ({
            ...prev,
            adGroupMapping: {
                ...prev.adGroupMapping,
                [env]: value
            }
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Active Teams ({teams.length})</h2>
                {/* Future: Add 'Create Team' button */}
            </div>

            <div className="grid grid-cols-1 gap-6">
                {teams.map(team => {
                    const isEditing = editingTeamId === team.id;

                    return (
                        <div key={team.id} className={`bg-white dark:bg-slate-800 rounded-xl p-6 border transition-all ${isEditing ? 'border-blue-500 shadow-lg ring-1 ring-blue-500' : 'border-gray-200 dark:border-slate-700 hover:border-blue-300'}`}>

                            {/* Header / Summary */}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{team.name}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${team.type === 'producer' ? 'bg-purple-100 text-purple-700' : team.type === 'consumer' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {team.type}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1 font-mono">ID: {team.id} | Members: {team.memberCount}</div>
                                </div>
                                {!isEditing && (
                                    <button
                                        onClick={() => handleEditClick(team)}
                                        className="text-sm font-semibold text-blue-500 hover:text-blue-600"
                                    >
                                        Edit Config
                                    </button>
                                )}
                            </div>

                            {/* Detailed View / Edit Form */}
                            {isEditing ? (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                                            <Input
                                                value={editForm.description || ''}
                                                onChange={(e) => handleInputChange('description', e.target.value)}
                                                fullWidth
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">Primary AD Group (General)</label>
                                            <Input
                                                value={editForm.azureAdGroupId || ''}
                                                onChange={(e) => handleInputChange('azureAdGroupId', e.target.value)}
                                                fullWidth
                                            />
                                        </div>
                                    </div>

                                    {/* Environment Mapping Section */}
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                                            <span>🛡️ Environment Access Map</span>
                                            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-slate-500 font-normal">Map AD Groups to specific environments</span>
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">DEV Group ID</label>
                                                <Input
                                                    value={editForm.adGroupMapping?.DEV || ''}
                                                    onChange={(e) => handleMappingChange('DEV', e.target.value)}
                                                    placeholder="e.g. group-payments-dev"
                                                    fullWidth
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-blue-400 uppercase">QA Group ID</label>
                                                <Input
                                                    value={editForm.adGroupMapping?.QA || ''}
                                                    onChange={(e) => handleMappingChange('QA', e.target.value)}
                                                    placeholder="e.g. group-payments-qa"
                                                    fullWidth
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-purple-400 uppercase">STAGE Group ID</label>
                                                <Input
                                                    value={editForm.adGroupMapping?.STAGE || ''}
                                                    onChange={(e) => handleMappingChange('STAGE', e.target.value)}
                                                    placeholder="e.g. group-payments-stage"
                                                    fullWidth
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-green-500 uppercase">PROD Group ID</label>
                                                <Input
                                                    value={editForm.adGroupMapping?.PROD || ''}
                                                    onChange={(e) => handleMappingChange('PROD', e.target.value)}
                                                    placeholder="e.g. group-payments-prod"
                                                    fullWidth
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-2">
                                        <button
                                            onClick={handleCancel}
                                            className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-lg"
                                        >
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // Read-only View
                                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8 text-sm">
                                    <div className="flex justify-between border-b border-gray-100 dark:border-slate-700/50 py-2">
                                        <span className="text-slate-500">General Group</span>
                                        <span className="font-mono text-slate-700 dark:text-slate-300">{team.azureAdGroupId}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-100 dark:border-slate-700/50 py-2">
                                        <span className="text-slate-500">PROD Access</span>
                                        <span className="font-mono text-slate-700 dark:text-slate-300">
                                            {team.adGroupMapping?.PROD ? (
                                                <span className="text-green-600 font-bold">{team.adGroupMapping.PROD}</span>
                                            ) : (
                                                <span className="text-slate-400 italic">Not Mapped</span>
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-100 dark:border-slate-700/50 py-2">
                                        <span className="text-slate-500">Non-Prod Access</span>
                                        <span className="font-mono text-slate-700 dark:text-slate-300">
                                            {[team.adGroupMapping?.DEV, team.adGroupMapping?.QA].filter(Boolean).length > 0 ? 'Mapped' : 'Default'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
