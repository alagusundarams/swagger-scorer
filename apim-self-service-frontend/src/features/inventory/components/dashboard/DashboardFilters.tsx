import { Input } from '../../../../core/ui/Input';
import { Select } from '../../../../core/ui/Select';
import { type Environment, type Team } from '../../../../shared/types/domain';

interface DashboardFiltersProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    selectedEnvironment: Environment;
    onEnvironmentChange: (env: Environment) => void;
    activeTeamId: string;
    onTeamChange: (teamId: string) => void;
    userTeams: Team[];
    accessibleEnvironments: Environment[];
    selectedRegion?: string;
    onRegionChange?: (region: string) => void;
    isFiltersDisabled?: {
        environment?: boolean;
        team?: boolean;
        region?: boolean;
    };
}

export function DashboardFilters({
    searchQuery,
    onSearchChange,
    selectedEnvironment,
    onEnvironmentChange,
    activeTeamId,
    onTeamChange,
    userTeams,
    accessibleEnvironments,
    isFiltersDisabled
}: DashboardFiltersProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-20 bg-white/60 dark:bg-slate-800/40 p-10 rounded-3xl border border-gray-100/50 dark:border-slate-700/30 backdrop-blur-2xl shadow-premium">
            <div className="flex flex-col gap-4">
                <label className="text-[10px] uppercase font-black text-gray-400 dark:text-slate-500 tracking-widest ml-1">Universal Search</label>
                <Input
                    type="text"
                    placeholder="Find an interface..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    fullWidth
                />
            </div>

            <div className="flex flex-col gap-4">
                <label className="text-[10px] uppercase font-black text-gray-400 dark:text-slate-500 tracking-widest ml-1">Environment Context</label>
                <Select
                    value={selectedEnvironment}
                    disabled={isFiltersDisabled?.environment}
                    onChange={(e) => onEnvironmentChange(e.target.value as Environment)}
                    options={[
                        { value: 'ALL', label: 'All Environments' },

                        ...(accessibleEnvironments.includes('DEV') ? [{ value: 'DEV', label: '⚪ Development' }] : []),
                        ...(accessibleEnvironments.includes('QA') ? [{ value: 'QA', label: '🔵 Quality Assurance' }] : []),
                        ...(accessibleEnvironments.includes('STAGE') ? [{ value: 'STAGE', label: '🟣 Staging' }] : []),
                        ...(accessibleEnvironments.includes('PROD') ? [{ value: 'PROD', label: '🟢 Production' }] : [])
                    ]}
                    fullWidth
                />
            </div>

            <div className="flex flex-col gap-4">
                <label className="text-[10px] uppercase font-black text-gray-400 dark:text-slate-500 tracking-widest ml-1">Team Ownership</label>
                <Select
                    value={activeTeamId}
                    disabled={isFiltersDisabled?.team}
                    onChange={(e) => onTeamChange(e.target.value)}
                    options={[
                        { value: 'all', label: 'Cross-Team Overview' },
                        ...userTeams.map(t => ({ value: t.id, label: t.name }))
                    ]}
                    fullWidth
                />
            </div>

            {/* Region Filter REMOVED as per user request (single region context) */}
        </div>
    );
}
