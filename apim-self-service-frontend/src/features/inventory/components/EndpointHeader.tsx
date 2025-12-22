import { type Operation } from '../../../types/entities';

interface EndpointHeaderProps {
    operation: Operation;
}

export function EndpointHeader({ operation }: EndpointHeaderProps) {
    const methodTheme = {
        GET: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800',
        POST: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800',
        PUT: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800',
        PATCH: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-900/20 dark:border-violet-800',
        DELETE: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800',
    };

    return (
        <div className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800/50">
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
                    <span className={`w-24 h-24 flex items-center justify-center rounded-[2rem] text-2xl font-black border-2 shadow-sm shrink-0 ${methodTheme[operation.method as keyof typeof methodTheme]}`}>
                        {operation.method}
                    </span>
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest bg-gray-50 dark:bg-slate-800/50 px-3 py-1 rounded-lg">
                                Managed Operation
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 uppercase">DEV</span>
                        </div>

                        {/* Interactive Full URL */}
                        <div className="flex items-center gap-3 mb-4 group">
                            <div className="flex items-center font-mono text-2xl lg:text-3xl font-black tracking-tight bg-white dark:bg-slate-800 p-2 rounded-xl border border-transparent hover:border-gray-200 dark:hover:border-slate-700 transition cursor-text select-all">
                                <span className={`mr-3 px-2 py-0.5 rounded text-lg ${methodTheme[operation.method as keyof typeof methodTheme]}`}>
                                    {operation.method}
                                </span>
                                <span className="text-gray-400 dark:text-slate-600 select-none">https://api-dev.contoso.com/pay</span>
                                <span className="text-gray-900 dark:text-white">{operation.urlTemplate}</span>
                            </div>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`https://api-dev.contoso.com/pay${operation.urlTemplate}`);
                                    alert('Full Operation URL copied!');
                                }}
                                className="p-3 bg-gray-100 dark:bg-slate-800 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition shadow-sm opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 duration-300"
                                title="Copy Full Invocation URL"
                            >
                                📋
                            </button>
                        </div>

                        <p className="text-gray-500 dark:text-slate-400 text-lg font-medium max-w-3xl leading-relaxed">
                            {operation.description}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
