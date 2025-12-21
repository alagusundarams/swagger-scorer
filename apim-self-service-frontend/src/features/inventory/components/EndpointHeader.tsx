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
                        </div>
                        <h1 className="text-4xl font-mono font-black text-gray-900 dark:text-white tracking-tight mb-4">
                            {operation.urlTemplate}
                        </h1>
                        <p className="text-gray-500 dark:text-slate-400 text-lg font-medium max-w-3xl leading-relaxed">
                            {operation.description}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
