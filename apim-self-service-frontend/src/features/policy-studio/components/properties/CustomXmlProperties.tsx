import { PolicyStep } from '../../types/policyTypes';

interface Props {
    step: PolicyStep;
}

export const CustomXmlProperties = ({ step }: Props) => {
    const rawContent = step.properties.xmlContent || '<xml>No Content</xml>';

    return (
        <div className="space-y-6">
            {/* Context Warning */}
            <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                <h4 className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 text-sm mb-1">
                    <span>{step.properties.icon || '🧩'}</span>
                    <span>Advanced / Legacy Logic</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    This block contains complex policy logic or C# expressions (like <code>@&#123;...&#125;</code>).
                    It is preserved exactly as-is to ensure functionality.
                </p>
            </div>

            {/* Extracted Details - The "Smart" Insight */}
            {step.properties.details && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 animate-slide-up">
                    <h5 className="font-black text-xs uppercase tracking-widest text-blue-500 mb-1">Detected Configuration</h5>
                    <p className="font-mono text-sm font-bold text-blue-900 dark:text-blue-100 break-all">
                        {step.properties.details}
                    </p>
                </div>
            )}

            {/* The Safe Viewer */}
            <div className="relative group">
                <div className="absolute -top-3 left-2 bg-white dark:bg-slate-800 px-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    Raw Policy Definition
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-700 overflow-x-auto shadow-inner">
                    <pre className="font-mono text-xs text-green-400 whitespace-pre-wrap break-all leading-5">
                        {rawContent}
                    </pre>
                </div>
                <div className="mt-2 flex justify-end">
                    <button
                        onClick={() => navigator.clipboard.writeText(rawContent)}
                        className="text-[10px] uppercase font-bold text-blue-500 hover:text-blue-400 hover:underline"
                    >
                        Copy Snippet
                    </button>
                </div>
            </div>
        </div>
    );
};
