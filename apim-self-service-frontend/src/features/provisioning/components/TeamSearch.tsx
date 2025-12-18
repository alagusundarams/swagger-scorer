
import { useState, useMemo } from 'react';
import { type Team } from '../../../types/entities';

interface TeamSearchProps {
    allTeams: Team[];
    selectedTeamIds: string[];
    onToggleTeam: (teamId: string) => void;
}

/**
 * TeamSearch: A scalable "Identity Picker" for handling 100+ teams.
 * 
 * Replaces simple checkboxes with a "Search & Chip" pattern.
 * - Search: Filters teams by name locally (simulates async).
 * - Chips: Shows selected teams as removable tags.
 * - Suggestions: Shows matches as you type.
 */
export const TeamSearch = ({ allTeams, selectedTeamIds, onToggleTeam }: TeamSearchProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    // Filter logic: Exclude already selected, match name
    const suggestions = useMemo(() => {
        if (!searchTerm.trim()) return [];
        const term = searchTerm.toLowerCase();
        return allTeams
            .filter(t => !selectedTeamIds.includes(t.id))
            .filter(t => t.name.toLowerCase().includes(term))
            .slice(0, 5); // Limit results
    }, [allTeams, searchTerm, selectedTeamIds]);

    const selectedTeams = useMemo(() => {
        return allTeams.filter(t => selectedTeamIds.includes(t.id));
    }, [allTeams, selectedTeamIds]);

    return (
        <div className="w-full">
            {/* Selected Chips Area */}
            {selectedTeams.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4 animate-fade-in">
                    {selectedTeams.map(team => (
                        <span
                            key={team.id}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                        >
                            {team.name}
                            <button
                                onClick={() => onToggleTeam(team.id)}
                                className="hover:text-red-500 transition-colors"
                            >
                                ✕
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Search Input & Inline Results */}
            <div className={`border-2 transition-all duration-300 overflow-hidden ${isFocused && searchTerm
                    ? 'bg-white dark:bg-slate-800 border-blue-500 rounded-2xl shadow-lg'
                    : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 rounded-2xl'
                }`}>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-gray-400">🔍</span>
                    </div>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setTimeout(() => setIsFocused(false), 200)} // Delay to allow click
                        placeholder="Search teams by name (e.g. 'Payment', 'Platform')..."
                        className="w-full pl-11 pr-4 py-4 bg-transparent border-none focus:outline-none transition-all font-medium text-sm text-gray-900 dark:text-white"
                    />
                </div>

                {/* Inline Results Area */}
                {isFocused && searchTerm && (
                    <div className="border-t border-gray-100 dark:border-slate-700 animate-slide-down">
                        {suggestions.length > 0 ? (
                            <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                {suggestions.map(team => (
                                    <button
                                        key={team.id}
                                        onClick={() => {
                                            onToggleTeam(team.id);
                                            setSearchTerm('');
                                        }}
                                        className="w-full text-left px-6 py-4 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors flex items-center justify-between group/item"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-900 flex items-center justify-center text-gray-500 group-hover/item:bg-blue-100 group-hover/item:text-blue-600 transition-colors">
                                                🏢
                                            </div>
                                            <span className="text-sm font-bold text-gray-700 dark:text-slate-300 group-hover/item:text-blue-600">
                                                {team.name.toUpperCase()}
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-black text-blue-500 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                            ADD +
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-6 text-center text-gray-400 text-xs font-medium italic">
                                No teams found matching "{searchTerm}"
                            </div>
                        )}
                    </div>
                )}
            </div>

            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 px-1">
                {selectedTeams.length} Identities Authorized
            </p>
        </div>
    );
};
