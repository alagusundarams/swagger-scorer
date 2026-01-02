
import React, { useEffect } from 'react';
import { useGovernanceStore } from '../store/governanceStore';
import { type AuditLog } from '../../../shared/types/domain';

interface ProductAuditLogProps {
    productId: string;
    onAction?: (msg: string, type: 'success' | 'warning') => void;
}

/**
 * ProductAuditLog Component
 * 
 * Shared component to display audit history for a product.
 * Accessible by both Producers and Consumers.
 */
export const ProductAuditLog: React.FC<ProductAuditLogProps> = ({ productId }) => {
    const { auditLogs, fetchAuditLogs, isLoading, error } = useGovernanceStore();

    useEffect(() => {
        if (productId) {
            fetchAuditLogs(productId);
        }
    }, [productId, fetchAuditLogs]);

    const formatDate = (dateStr: string) => {
        try {
            return new Intl.DateTimeFormat('en-US', {
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).format(new Date(dateStr));
        } catch (e) {
            return dateStr;
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fetching history...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-800">
                <p className="text-red-600 dark:text-red-400 text-sm font-bold uppercase tracking-widest">⚠️ Error Loading Logs</p>
                <p className="text-red-500 dark:text-red-300 text-xs mt-2">{error}</p>
            </div>
        );
    }

    if (auditLogs.length === 0) {
        return (
            <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/40 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-2xl mb-4">📜</p>
                <p className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-wide">No audit history found for this product.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">Product Audit Trail</h3>
                <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full font-bold uppercase">
                    {auditLogs.length} Entries
                </span>
            </div>

            <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3 pl-8 space-y-8">
                {auditLogs.map((log: AuditLog) => (
                    <div key={log.id} className="relative">
                        {/* Timeline Dot */}
                        <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 bg-blue-500 shadow-sm z-10"></div>

                        <div className="bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/40 transition-all shadow-sm group">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {log.action}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded">
                                    {formatDate(log.timestamp)}
                                </span>
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                                {log.details || 'No additional details provided.'}
                            </p>

                            <div className="flex items-center gap-4 pt-4 border-t border-slate-50 dark:border-slate-800/50">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-[10px] font-bold">
                                        {(log.performedBy || 'U').charAt(0)}
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {log.performedBy || 'System'}
                                    </span>
                                </div>
                                {log.entityType && (
                                    <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase italic">
                                        target: {log.entityType}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
