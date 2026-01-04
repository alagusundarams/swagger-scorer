import { useSearchParams } from 'react-router-dom';
import { type Product, type Team } from '../../../../shared/types/domain';
import { getEnvironmentTheme } from '../../../../utils/statusUtils';

interface ProductConsumerHeaderProps {
    product: Product;
    isSubscribed: boolean;
    activeTeam?: Team;
    hasPendingRequest: boolean;
    onRequestAccess: () => void;
}

export function ProductConsumerHeader({
    product,
    isSubscribed,
    activeTeam,
    hasPendingRequest,
    onRequestAccess
}: ProductConsumerHeaderProps) {
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
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-10 mb-12 shadow-premium border border-gray-100 dark:border-slate-700/30">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center text-white text-3xl shadow-xl shadow-emerald-500/20">
                        🔍
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                                {product.displayName}
                            </h1>
                            <span className="bg-gray-50 dark:bg-slate-900 px-3 py-1 rounded-lg text-xs font-black text-gray-400 uppercase tracking-widest border border-gray-100 dark:border-slate-800">
                                V{product.version}
                            </span>
                        </div>
                        <p className="text-gray-500 dark:text-slate-400 text-lg max-w-2xl font-medium">
                            {product.description}
                        </p>
                    </div>
                </div>

                <div className="shrink-0 w-full md:w-auto">
                    {isSubscribed ? (
                        <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold px-8 py-5 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                            <span className="text-xl">✅</span> Active Access via {activeTeam?.name || 'Your Team'}
                        </div>
                    ) : (
                        <button
                            disabled={hasPendingRequest}
                            onClick={onRequestAccess}
                            className={`w - full md: w - auto font - black text - [10px] uppercase tracking - [0.2em] py - 5 px - 10 rounded - 2xl transition - all shadow - xl hover: scale - [1.02] ${hasPendingRequest
                                ? 'bg-amber-50 text-amber-600 cursor-not-allowed border border-amber-100'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                                } `}
                        >
                            {hasPendingRequest ? '⌛ Request Pending Review' : '🚀 Request Integration Access'}
                        </button>
                    )}
                </div>
            </div>

            {/* Metadata Ribbon */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-10 pt-10 border-t border-gray-50 dark:border-slate-700/30">
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">API Documentation</p>
                    <span className="text-sm font-bold text-gray-700 dark:text-white flex items-center gap-1.5">
                        <span className="text-emerald-500">✓</span> OpenAPI 3.0 Verified
                    </span>
                </div>
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Environment</p>
                    <div className="relative group w-fit">
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
                </div>
            </div>
        </div>
    );
}
