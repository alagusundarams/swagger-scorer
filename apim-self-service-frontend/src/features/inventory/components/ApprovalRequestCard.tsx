import { useNavigate } from 'react-router-dom';
import type { ApprovalRequest } from '../../governance/types/governanceTypes';

interface ApprovalRequestCardProps {
    request: ApprovalRequest;
    onToast: (message: string) => void;
}

export function ApprovalRequestCard({ request, onToast }: ApprovalRequestCardProps) {
    const navigate = useNavigate();

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'PRODUCT_ONBOARDING': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
            case 'API_ONBOARDING': return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
            case 'MODIFICATION': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
            case 'SUBSCRIPTION': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
            case 'PROMOTION_REQUEST': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
            case 'QUOTA_EXTENSION': return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300';
            case 'DEPRECATION_REQUEST': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800/50 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center group hover:shadow-lg transition-all">
            {/* Requester Info */}
            <div className="flex flex-col min-w-[200px]">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">Requesting Team</div>
                <div className="font-black text-slate-900 dark:text-white text-lg leading-tight mb-2">{request.requester.teamName}</div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{request.requester.name}</span>
                    <span className="text-xs text-slate-500 font-medium">{request.requester.email}</span>
                </div>
            </div>

            {/* Request Details */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                {/* Type & Target */}
                <div>
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${getTypeBadge(request.type)}`}>
                        {request.type.replace('_', ' ')}
                    </span>
                    <div className="mt-2 font-bold text-slate-700 dark:text-slate-200 text-sm">
                        {request.details.targetName}
                        {request.details.targetVersion && <span className="ml-2 opacity-50 text-xs text-slate-500">{request.details.targetVersion}</span>}
                    </div>
                </div>

                {/* Specific Metadata */}
                <div className="text-xs text-slate-500 font-medium">
                    {request.type === 'PROMOTION_REQUEST' && (
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700 dark:text-white">{request.details.promotionPath?.source}</span>
                            <span>→</span>
                            <span className="font-bold text-green-600 dark:text-green-400">{request.details.promotionPath?.target}</span>
                        </div>
                    )}
                    {request.type === 'QUOTA_EXTENSION' && (
                        <div>
                            Requesting: <span className="font-bold text-slate-700 dark:text-white">{request.details.requestedQuota}</span>
                        </div>
                    )}
                    {request.type === 'MODIFICATION' && (
                        <div>
                            <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[9px] font-bold mr-2">{request.details.modificationType}</span>
                            <div className="mt-1 italic opacity-75">{request.details.diffSummary}</div>
                        </div>
                    )}
                    {request.details.environment && (
                        <div className="mt-1 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                            <span>{request.details.environment}</span>
                        </div>
                    )}
                </div>

                {/* Reason */}
                <div className="text-xs text-slate-400 italic border-l-2 border-slate-100 dark:border-slate-700 pl-3">
                    "{request.details.reason || 'No specific reason provided.'}"
                </div>
            </div>

            {/* Triage Action */}
            <div className="flex gap-2 min-w-[200px] justify-end">
                <button
                    onClick={() => {
                        if (request.details.targetId) {
                            navigate(`/products/${request.details.targetId}?tab=audit`);
                        } else {
                            onToast('Target product context missing.');
                        }
                    }}
                    className="px-6 py-3 bg-slate-900 dark:bg-slate-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-black dark:hover:bg-slate-600 transition-all flex items-center gap-2 group shadow-xl shadow-slate-900/10 whitespace-nowrap"
                >
                    <span>Review & Decide</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
            </div>
        </div>
    );
}
