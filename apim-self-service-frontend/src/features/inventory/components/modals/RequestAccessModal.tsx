import { type AppRegistration } from '../../../shared/types/domain';

interface RequestAccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => void;
    requestTeamId: string;
    setRequestTeamId: (teamId: string) => void;
    selectedAppId: string;
    setSelectedAppId: (appId: string) => void;
    businessReason: string;
    setBusinessReason: (reason: string) => void;
    userTeams: string[];
    appRegistrations: AppRegistration[];
}

export function RequestAccessModal({
    isOpen,
    onClose,
    onSubmit,
    requestTeamId,
    setRequestTeamId,
    selectedAppId,
    setSelectedAppId,
    businessReason,
    setBusinessReason,
    userTeams,
    appRegistrations
}: RequestAccessModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-white/10 p-10 transform scale-110 overflow-hidden relative">
                {/* Decorative background element */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-600/10 rounded-full blur-3xl"></div>

                <div className="relative">
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-4">Request Access</h2>
                    <p className="text-gray-500 dark:text-slate-400 mb-8 font-medium">To proceed with integration, please specify the consuming team and a business justification for architectural review.</p>

                    <div className="space-y-8 mt-10">
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block ml-1">Assigned Consumer Team</label>
                            <select
                                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl text-sm font-bold outline-none ring-offset-2 focus:ring-2 focus:ring-emerald-600/20 transition-all cursor-pointer"
                                value={requestTeamId}
                                onChange={(e) => setRequestTeamId(e.target.value)}
                            >
                                <option value="" disabled>Select a team</option>
                                {userTeams.map(teamId => (
                                    <option key={teamId} value={teamId}>{teamId.replace('team-', '').toUpperCase()} TEAM</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block ml-1">Consuming Application Identity</label>
                            <select
                                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl text-sm font-bold outline-none ring-offset-2 focus:ring-2 focus:ring-emerald-600/20 transition-all cursor-pointer"
                                value={selectedAppId}
                                onChange={(e) => setSelectedAppId(e.target.value)}
                                disabled={!requestTeamId}
                            >
                                <option value="" disabled>Select an application</option>
                                {appRegistrations
                                    .filter(app => app.ownerTeamId === requestTeamId)
                                    .map(app => (
                                        <option key={app.id} value={app.id}>
                                            [{app.environment}] {app.displayName} ({app.clientId.slice(0, 8)}...)
                                        </option>
                                    ))}
                            </select>
                            {requestTeamId && appRegistrations.filter(app => app.ownerTeamId === requestTeamId).length === 0 && (
                                <p className="text-[10px] text-rose-500 font-bold mt-2 ml-1">No apps linked to this team. Please link an app first.</p>
                            )}
                        </div>

                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block ml-1">Business Justification</label>
                            <textarea
                                placeholder="Explain how this API will be utilized by your team..."
                                className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl text-sm font-medium h-32 outline-none ring-offset-2 focus:ring-2 focus:ring-emerald-600/20 transition-all"
                                value={businessReason}
                                onChange={(e) => setBusinessReason(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-4 pt-4">
                            <button
                                onClick={onClose}
                                className="flex-1 px-8 py-5 border border-gray-100 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-900 transition-all font-bold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onSubmit}
                                disabled={!requestTeamId || !businessReason.trim()}
                                className="flex-[2] px-8 py-5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all font-bold disabled:opacity-50"
                            >
                                Submit Request
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
