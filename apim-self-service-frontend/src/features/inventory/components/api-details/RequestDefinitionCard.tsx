/**
 * RequestDefinitionCard
 * 
 * Displays the request schema or definition for an API operation.
 * Helps consumers understand the expected input structure.
 */
import { type Operation, type API } from '../../types/inventoryTypes';

interface RequestDefinitionCardProps {
    api: API;
    operation: Operation;
}

export function RequestDefinitionCard({ api, operation }: RequestDefinitionCardProps) {
    return (
        <section className="bg-white dark:bg-slate-800 p-10 rounded-[2.5rem] border border-gray-100 dark:border-slate-700/30 shadow-sm transition-all hover:shadow-premium">
            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                <span className="w-2 h-2 bg-blue-600 rounded-full"></span> Request Definition
            </h2>

            <div className="space-y-8">
                <div>
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Invocation URI</h3>
                    <div className="bg-gray-50 dark:bg-slate-900 p-5 rounded-2xl font-mono text-sm border border-gray-100 dark:border-slate-800">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-gray-400 w-16 text-[9px] uppercase font-bold">Mount:</span>
                            <span className="text-blue-600 font-bold">{api.path}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400 w-16 text-[9px] uppercase font-bold">Path:</span>
                            <span className="text-gray-900 dark:text-white font-bold">{operation.urlTemplate}</span>
                        </div>
                    </div>
                </div>

                {operation.urlTemplate && operation.urlTemplate.includes('{') && (
                    <div>
                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Path Variable Manifest</h3>
                        <div className="bg-blue-50/30 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100/30 dark:border-blue-800/30">
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold italic">
                                Active Parameter: <span className="bg-blue-600 text-white px-2 py-0.5 rounded ml-1 not-italic">{operation.urlTemplate.match(/\{([^}]+)\}/)?.[1]}</span>
                            </p>
                        </div>
                    </div>
                )}

                {['POST', 'PUT', 'PATCH'].includes(operation.method) && (
                    <div>
                        <div className="flex items-center gap-2 mb-3 ml-1">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Request Schema</h3>
                            <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-[8px] font-bold rounded">PLACEHOLDER</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800">
                            <pre className="text-xs text-gray-900 dark:text-slate-300 font-mono leading-relaxed opacity-60">
                                {`{
  "context": "Enterprise Data Hub",
  "identity": "GUID",
  "payload": {
    "type": "Object",
    "description": "Actual schema from OpenAPI spec"
  }
}`}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
