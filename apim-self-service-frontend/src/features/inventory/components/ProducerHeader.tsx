import { type Product } from '../../../types/entities';

interface ProducerHeaderProps {
    product: Product;
    isOutOfSync: boolean;
    onInitiateRedeploy: () => void;
    onManageClick: () => void;
    onPromoteClick: () => void;
    onDeprecateClick: () => void;
}

export function ProducerHeader({
    product,
    isOutOfSync,
    onInitiateRedeploy,
    onManageClick,
    onPromoteClick,
    onDeprecateClick
}: ProducerHeaderProps) {
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
            {product.management_mode === 'TERRAFORM_MANAGED' && (!product.detectedAnomalies || product.detectedAnomalies.length === 0) && (
                <div className="mb-6 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-3xl flex items-center gap-4 animate-slide-up">
                    <span className="text-3xl">🔧</span>
                    <div className="flex-1">
                        <p className="text-sm font-black text-blue-700 dark:text-blue-500 uppercase tracking-widest">Terraform Managed</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            This product is currently managed via Terraform. Changes must be made through the Azure DevOps pipeline.
                        </p>
                    </div>
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
                            <span className={`px-2 py-1 text-[10px] font-black rounded-lg border uppercase ${product.visibility === 'private'
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                : product.visibility === 'owner-only'
                                    ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                }`}>
                                {product.visibility || 'public'}
                            </span>
                        </div>
                        <p className="text-gray-600 dark:text-slate-400 mt-1">{product.description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 text-xs font-black rounded-lg border uppercase ${product.environment === 'PROD'
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                        }`}>
                        {product.environment}
                    </span>
                    {product.lastDeployedCommitHash && (
                        <a
                            href={product.terraform_pipeline_url || '#'}
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
                    {product.management_mode === 'TERRAFORM_MANAGED' ? 'View Pipeline' : 'Deploy'}
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
