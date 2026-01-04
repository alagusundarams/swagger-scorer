import { useSearchParams } from 'react-router-dom';
import { type Product } from '../../types/inventoryTypes';
import { getEnvironmentTheme } from '../../../../utils/statusUtils';
import { getStatusTheme, getNextEnvironment } from '../../../../utils/statusUtils';
import { inventoryApi } from '../../api/inventoryClient';

interface ProducerHeaderProps {
    product: Product;
    isOutOfSync: boolean;
    onInitiateRedeploy: () => void;
    onManageClick: () => void;
    onPromoteClick: () => void;
    onDeprecateClick: () => void;
    isPromotionPending?: boolean;
}


export function ProducerHeader({
    product,
    isOutOfSync,
    onInitiateRedeploy,
    onManageClick,
    onPromoteClick,
    onDeprecateClick,
    isPromotionPending = false
}: ProducerHeaderProps) {
    const [searchParams, setSearchParams] = useSearchParams();
    const currentEnv = searchParams.get('environment') || product.environment || 'DEV';

    const handleEnvChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newEnv = e.target.value;
        setSearchParams(prev => {
            prev.set('environment', newEnv);
            return prev;
        });
    };

    return (
        <div className="mb-8">
            {/* Governance Anomaly Banner */}
            {product.detectedAnomalies && product.detectedAnomalies.length > 0 && (
                <div className="mb-6 p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-3xl flex items-center gap-4 animate-slide-up">
                    <span className="text-3xl">🚨</span>
                    <div className="flex-1">
                        <p className="text-sm font-black text-red-700 dark:text-red-500 uppercase tracking-widest">Governance Issue Detected</p>
                        <ul className="list-disc pl-4 mt-1">
                            {product.detectedAnomalies.map(a => (
                                <li key={a} className="text-xs text-red-600 dark:text-red-400 font-bold">
                                    {a === 'MANUAL_CREATION' ? 'No Git History (Manually Created)' : a}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Out of Sync Banner */}
            {isOutOfSync && (
                <div className="mb-6 p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 animate-slide-up">
                    <div className="flex items-center gap-4">
                        <span className="text-3xl">🔄</span>
                        <div>
                            <p className="text-sm font-black text-amber-700 dark:text-amber-500 uppercase tracking-widest">Environment Out of Sync</p>
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                The current draft has unpromoted changes. To reflect these in Production, you must initiate a new deployment cycle.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onInitiateRedeploy}
                        className="px-6 py-3 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:bg-amber-700 transition-all flex items-center gap-2"
                    >
                        <span>Initiate Re-Deployment (DEV)</span>
                        <span>→</span>
                    </button>
                </div>
            )}

            {/* Terraform Management Mode Banner (Only if NO Anomalies) */}
            {product.managementMode === 'TERRAFORM_MANAGED' && (!product.detectedAnomalies || product.detectedAnomalies.length === 0) && (
                <div className="mb-6 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-3xl flex items-center justify-between gap-4 animate-slide-up">
                    <div className="flex items-center gap-4">
                        <span className="text-3xl">🔧</span>
                        <div className="flex-1">
                            <p className="text-sm font-black text-blue-700 dark:text-blue-500 uppercase tracking-widest">Terraform Managed</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                                This product is currently managed via Terraform. Changes must be made through the Azure DevOps pipeline.
                            </p>
                        </div>
                    </div>
                    {/* Eject Button for Admin/Leads */}
                    <button
                        onClick={() => {
                            if (confirm('Are you sure you want to Eject this product from Terraform? This will switch it to Portal-Managed mode and enable local overrides via the Policy Studio.')) {
                                inventoryApi.ejectProduct(product.id)
                                    .then(() => {
                                        window.location.reload();
                                    })
                                    .catch(err => alert('Failed to eject: ' + err.message));
                            }
                        }}
                        className="px-5 py-2.5 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all border border-blue-200 shadow-sm whitespace-nowrap"
                    >
                        🚀 Eject to Self-Service
                    </button>
                </div>
            )}

            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl shadow-xl shadow-blue-500/10">
                        📦
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white">
                                {product.displayName}
                            </h1>
                            <span className="bg-gray-100 dark:bg-slate-900 px-2 py-1 rounded text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 dark:border-slate-800">
                                V{product.version}
                            </span>
                            <span className={`px-2 py-1 text-[10px] font-black rounded-lg border uppercase ${getStatusTheme(product.visibility || 'public').bg} ${getStatusTheme(product.visibility || 'public').text} ${getStatusTheme(product.visibility || 'public').border}`}>
                                {product.visibility || 'public'}
                            </span>
                        </div>
                        <p className="text-gray-600 dark:text-slate-400 mt-1">{product.description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* Redeploy Button */}
                    {isOutOfSync && (
                        <button
                            onClick={onInitiateRedeploy}
                            className="bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60 px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                            title="Reset to DEV to start a new promotion cycle"
                        >
                            <span className="mr-2">↺</span> Redeploy
                        </button>
                    )}

                    {/* Promote Button */}
                    {product.environment !== 'PROD' && (
                        isPromotionPending ? (
                            <button
                                disabled
                                className="bg-amber-50 text-amber-500 dark:bg-amber-900/10 dark:text-amber-500/50 cursor-wait px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border border-amber-100 dark:border-amber-900/30 flex items-center gap-2 shadow-sm"
                            >
                                <span className="animate-spin text-lg">⏳</span> Awaiting Approval
                            </button>
                        ) : (
                            <button
                                onClick={onPromoteClick}
                                disabled={isOutOfSync}
                                className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl flex items-center gap-2 border ${isOutOfSync
                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600 dark:border-slate-700'
                                    : 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-emerald-400 hover:scale-105 hover:shadow-emerald-500/30 active:scale-95'
                                    }`}
                                title={isOutOfSync ? "Cannot promote modified product. Please redeploy." : "Promote to next environment"}
                            >
                                <span className="text-lg">🚀</span>
                                <span className="mt-0.5">Promote to {getNextEnvironment(product.environment)}</span>
                            </button>
                        )
                    )}

                    <div className="h-8 w-px bg-gray-200 dark:bg-slate-700 mx-2"></div>

                    {/* Region Selector (formerly static badge) */}
                    <div className="relative group">
                        <select
                            value={currentEnv}
                            onChange={handleEnvChange}
                            className={`appearance-none cursor-pointer pl-3 pr-8 py-1 text-xs font-black rounded-lg border uppercase outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 transition-all ${getEnvironmentTheme(currentEnv).bg} ${getEnvironmentTheme(currentEnv).text} ${getEnvironmentTheme(currentEnv).border}`}
                        >
                            <option value="DEV">DEV (Draft)</option>
                            <option value="QA">QA</option>
                            <option value="STAGE">STAGE</option>
                            <option value="PROD">PROD</option>
                        </select>
                        <div className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] ${getEnvironmentTheme(currentEnv).text}`}>
                            ▼
                        </div>
                    </div>

                    {product.lastDeployedCommitHash && (
                        <a
                            href={product.terraformPipelineUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-1 flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-slate-700 transition"
                            title={`Deployed at: ${product.lastDeployedAt || 'Unknown'}`}
                        >
                            <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">GIT</span>
                            <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
                                {product.lastDeployedCommitHash.substring(0, 7)}
                            </span>
                        </a>
                    )}
                </div>
            </div>

            <div className="flex gap-3">
                <button
                    onClick={onManageClick}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold text-sm transition"
                >
                    Manage Product
                </button>
                <button
                    onClick={onPromoteClick}
                    className="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-900 dark:text-white rounded-lg font-semibold text-sm transition"
                >
                    {product.managementMode === 'TERRAFORM_MANAGED' ? 'View Pipeline' : 'Deploy'}
                </button>
                {product.state === 'published' && (
                    <button
                        onClick={onDeprecateClick}
                        className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-semibold text-sm transition"
                    >
                        Mark as Deprecated
                    </button>
                )}
            </div>
        </div>
    );
}
