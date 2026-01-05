import type { Team } from '../../../shared/types/domain';

/**
 * ------------------------------------------------------------------
 * 📍 Component: TeamSearch
 * ------------------------------------------------------------------
 * 🔄 RESPONSIBILITY:
 * - Autocomplete search for Team ownership during onboarding.
 * - Fetches teams from the shared domain registry.
 * - Ensures a valid AD team is selected for resource tagging.
 * ------------------------------------------------------------------
 */
interface TeamSearchProps {
    onToggleTeam: (teamId: string) => void;
    selectedTeams: string[];
    userTeams?: Team[];
    allTeams?: Team[]; // Added for temporary compatibility during migration
}

export const TeamSearch: React.FC<TeamSearchProps> = ({
    onToggleTeam,
    selectedTeams,
    userTeams = [],
    allTeams = []
}) => {
    const teamsToDisplay = allTeams.length > 0 ? allTeams : userTeams;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                {teamsToDisplay.map(team => (
                    <button
                        key={team.id}
                        onClick={() => onToggleTeam(team.id)}
                        className={`p-4 rounded-xl border font-bold text-sm transition-all ${Array.isArray(selectedTeams) && selectedTeams.includes(team.id) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-100 text-gray-600 hover:border-gray-200'}`}
                    >
                        {team.name}
                    </button>
                ))}
            </div>
        </div>
    );
};
