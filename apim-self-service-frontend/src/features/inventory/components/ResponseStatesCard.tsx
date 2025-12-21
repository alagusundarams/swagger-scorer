
export function ResponseStatesCard() {
    return (
        <section className="bg-white dark:bg-slate-800 p-10 rounded-[2.5rem] border border-gray-100 dark:border-slate-700/30 shadow-sm transition-all hover:shadow-premium">
            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Response States
            </h2>

            <div className="space-y-6">
                {/* HTTP 200 Success */}
                <div className="group">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-lg text-[10px] font-black border border-emerald-100 dark:border-emerald-800">200 SUCCESS</span>
                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Optimal Execution</span>
                        <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-[8px] font-bold rounded ml-auto">PLACEHOLDER</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800">
                        <pre className="text-xs text-gray-900 dark:text-slate-300 font-mono leading-relaxed opacity-60">
                            {`{
  "status": "success",
  "data": { ... },
  "metadata": {
    "timestamp": "ISO8601"
  }
}`}
                        </pre>
                    </div>
                </div>

                {/* HTTP 400 Client Error */}
                <div className="flex items-center justify-between p-5 bg-gray-50/50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-4">
                        <span className="font-black text-amber-500 text-xs">400</span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Client Malformation</span>
                    </div>
                    <span className="text-xs font-bold text-gray-300 cursor-help">ℹ️</span>
                </div>

                {/* HTTP 500 Network Error */}
                <div className="flex items-center justify-between p-5 bg-gray-50/50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-800/50">
                    <div className="flex items-center gap-4">
                        <span className="font-black text-rose-500 text-xs">500</span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Internal Logic Failure</span>
                    </div>
                    <span className="text-xs font-bold text-gray-300 cursor-help">ℹ️</span>
                </div>
            </div>
        </section>
    );
}
