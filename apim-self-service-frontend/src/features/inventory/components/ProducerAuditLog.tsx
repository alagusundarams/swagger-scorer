
interface ProducerAuditLogProps {
    onAction: (message: string, type: 'success' | 'warning') => void;
}

export function ProducerAuditLog({ onAction }: ProducerAuditLogProps) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-slate-700 animate-fade-in">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-widest">Governance Audit Log</h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">Immutable record of all access and lifecycle events</p>
                </div>
                <button className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline">Export CSV</button>
            </div>

            <div className="space-y-4">
                {/* PENDING VETTING SECTION */}
                <div className="mb-12">
                    <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                        Pending Review Decisions
                    </h3>
                    <div className="space-y-4">
                        <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/20 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Visibility Change</span>
                                    <span className="text-[10px] font-mono text-slate-400">#REQ-9921</span>
                                </div>
                                <div className="font-black text-slate-900 dark:text-white text-sm mb-1">PROD Exposure Request</div>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">Requested by <span className="text-blue-600 font-bold">Identity Team</span> to enable cross-region discovery for internal clients.</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button
                                    onClick={() => onAction('Request Approved. Access updated successfully.', 'success')}
                                    className="px-6 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                                >
                                    Approve
                                </button>
                                <button
                                    onClick={() => onAction('Request Rejected. Feedback sent to requester.', 'warning')}
                                    className="px-6 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Historical Audit Logs</h3>
                    <div className="space-y-4">
                        {[
                            { date: '2025-12-18 14:30', user: 'Admin User', event: 'Visibility Changed', details: 'Public → Private', impact: 'Medium' },
                            { date: '2025-12-17 09:15', user: 'System', event: 'Team Authorized', details: 'CloudOps added to PROD', impact: 'Low' },
                            { date: '2025-12-16 16:45', user: 'Product Owner', event: 'Access Revoked', details: 'Team-Alpha revoked (Breach of terms)', impact: 'High' }
                        ].map((log, i) => (
                            <div key={i} className="flex items-center gap-6 p-4 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-800 group hover:border-blue-500/30 transition-all">
                                <div className="text-[10px] font-mono text-slate-400 w-32 shrink-0">{log.date}</div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-wider">{log.event}</span>
                                        <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest ${log.impact === 'High' ? 'bg-red-500/10 text-red-500' : log.impact === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                                            }`}>
                                            {log.impact} Impact
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                        {log.details} • Modified by <span className="text-slate-900 dark:text-slate-200 font-bold">{log.user}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-500 transition-colors">📄</button>
                                    <button className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline">Details</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
