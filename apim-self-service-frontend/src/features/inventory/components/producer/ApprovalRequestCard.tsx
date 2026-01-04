import { useState } from 'react';
import type { ApprovalRequest } from '../../../../shared/types/domain';

interface ApprovalRequestCardProps {
    request: ApprovalRequest;
    onToast: (message: string) => void;
}

export function ApprovalRequestCard({ request, onToast }: ApprovalRequestCardProps) {
    // navigate removed as we use inline expansion for review


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

    const [repoUrl, setRepoUrl] = useState('');
    const [validationStatus, setValidationStatus] = useState<'IDLE' | 'VALIDATING' | 'VALID' | 'INVALID'>('IDLE');
    const [isExpanded, setIsExpanded] = useState(false);

    const handleValidate = async () => {
        setValidationStatus('VALIDATING');
        // Simulate API latency
        setTimeout(() => {
            if (repoUrl.startsWith('https://') && repoUrl.includes('.git')) {
                setValidationStatus('VALID');
                onToast('Repository validated successfully.');
            } else {
                setValidationStatus('INVALID');
                onToast('Invalid Repository URL. Must be HTTPS and end with .git');
            }
        }, 1000);
    };

    return (
        <div className="bg-white dark:bg-slate-800/50 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col gap-6 group hover:shadow-lg transition-all">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center w-full">
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
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`px-6 py-3 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 group shadow-xl whitespace-nowrap ${isExpanded
                            ? 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'
                            : 'bg-slate-900 dark:bg-slate-700 text-white hover:bg-black dark:hover:bg-slate-600 shadow-slate-900/10'
                            }`}
                    >
                        <span>{isExpanded ? 'Close Review' : 'Review & Decide'}</span>
                        <span className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'group-hover:translate-x-1'}`}>
                            {isExpanded ? '▲' : '→'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Expanded Review Section */}
            {isExpanded && (
                <div className="mt-4 pt-6 border-t border-gray-100 dark:border-slate-700 animate-slide-up">
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Validation Gate */}
                        {(request.type === 'PRODUCT_ONBOARDING' || request.type === 'API_ONBOARDING') && (
                            <div className="flex-1 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
                                <h4 className="text-xs font-black text-blue-800 dark:text-blue-300 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <span>🛡️</span> Validation Gate Required
                                </h4>
                                <p className="text-[10px] text-blue-600 dark:text-blue-400 mb-4">
                                    A valid Git Repository URL is required to provision the infrastructure for this product.
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={repoUrl}
                                        onChange={(e) => {
                                            setRepoUrl(e.target.value);
                                            setValidationStatus('IDLE');
                                        }}
                                        placeholder="https://dev.azure.com/org/project/_git/repo"
                                        className="flex-1 px-4 py-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        onClick={handleValidate}
                                        disabled={!repoUrl || validationStatus === 'VALIDATING'}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    >
                                        {validationStatus === 'VALIDATING' ? 'checking...' : 'Validate'}
                                    </button>
                                </div>
                                {validationStatus === 'VALID' && (
                                    <p className="mt-2 text-[10px] font-bold text-green-600 flex items-center gap-1">
                                        <span>✓</span> Repository is valid and reachable.
                                    </p>
                                )}
                                {validationStatus === 'INVALID' && (
                                    <p className="mt-2 text-[10px] font-bold text-red-500 flex items-center gap-1">
                                        <span>✕</span> Invalid URL or Repository not found.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-3 justify-end min-w-[200px]">
                            <button
                                disabled={((request.type === 'PRODUCT_ONBOARDING' || request.type === 'API_ONBOARDING') && validationStatus !== 'VALID')}
                                onClick={() => onToast('Approving request requires backend integration (Mock: Approved)')}
                                className="w-full py-4 bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                Approve Request
                            </button>
                            <button
                                onClick={() => onToast('Request Rejected (Mock)')}
                                className="w-full py-3 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
