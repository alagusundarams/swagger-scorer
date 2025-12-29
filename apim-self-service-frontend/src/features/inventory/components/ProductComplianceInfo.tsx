import { type Team } from '../../teams/types/teamTypes';

interface ProductComplianceInfoProps {
    activeTeam?: Team;
}

export function ProductComplianceInfo({ activeTeam }: ProductComplianceInfoProps) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-10 border border-gray-100 dark:border-slate-700/30 shadow-sm mb-12 animate-fade-in">
            <div className="flex flex-col md:flex-row gap-12 text-sm">
                <div className="flex-1">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        <span className="text-emerald-500">⚖️</span> Compliance Status
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                            <span className="font-bold text-emerald-800 dark:text-emerald-400">Governance Standing</span>
                            <span className="bg-emerald-500 text-white text-[8px] font-black uppercase px-2 py-1 rounded">Good</span>
                        </div>
                        <p className="text-gray-500 dark:text-slate-400 font-medium leading-relaxed">
                            Your team (<span className="text-gray-900 dark:text-slate-100 font-bold">{activeTeam?.name || 'Assigned Team'}</span>) is currently in full compliance with the terms of this API Product.
                        </p>
                    </div>
                </div>

                <div className="flex-1 border-t md:border-t-0 md:border-l border-gray-100 dark:border-slate-700/50 pt-12 md:pt-0 md:pl-12">
                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6">Terms of Usage</h3>
                    <ul className="space-y-3 text-gray-500 dark:text-slate-400 font-medium list-disc list-inside">
                        <li>Access is granted for internal development use only.</li>
                        <li>Rate limits of 1000 req/sec apply globally.</li>
                        <li>Production usage requires specific PII clearance.</li>
                        <li>Owner reserves the right to revoke access with 48h notice.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
