import { type Operation, type API, type Product } from '../../../types/entities';

interface EndpointImplementationGuideProps {
    product: Product;
    api: API;
    operation: Operation;
}

export function EndpointImplementationGuide({ product, api, operation }: EndpointImplementationGuideProps) {
    const getPayload = () => {
        if (!operation.urlTemplate) return '';

        if (operation.method === 'POST' && operation.urlTemplate.includes('payment')) {
            return `{
    "amount": 99.99,
    "currency": "USD",
    "customerId": "cust_123abc",
    "description": "Product purchase"
  }`;
        } else if (operation.method === 'PATCH' && operation.urlTemplate.includes('customer')) {
            return `{
    "email": "customer@example.com",
    "preferences": {
      "newsletter": true
    }
  }`;
        } else if (['POST', 'PUT', 'PATCH'].includes(operation.method)) {
            return '{ "key": "value" }';
        }
        return '';
    };

    const copySnippet = () => {
        const payload = getPayload();
        const snippet = `curl -X ${operation.method} "https://api.ionosphere.io${api.path}${operation.urlTemplate}" \\
  -H "Authorization: Bearer <YOUR_TOKEN>" \\
  -H "Accept: application/json"${payload ? ` \\
  -H "Content-Type: application/json" \\
  -d '${payload}'` : ''}`;
        navigator.clipboard.writeText(snippet);
    };

    return (
        <section className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-slate-700/30 shadow-sm relative overflow-hidden group mb-6">
            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-3">
                <span className="w-2 h-2 bg-purple-500 rounded-full"></span> Implementation Guide
            </h2>

            {/* Dynamic Code Snippet */}
            <div className="bg-slate-900 rounded-2xl p-6 mb-6 overflow-x-auto group/code relative">
                <div className="absolute top-4 right-4 opacity-0 group-hover/code:opacity-100 transition-opacity">
                    <button
                        onClick={copySnippet}
                        className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold px-3 py-1 rounded-lg uppercase tracking-wider backdrop-blur-md transition-all"
                    >
                        Copy
                    </button>
                </div>
                <div className="flex gap-4 mb-4 border-b border-white/10 pb-2">
                    <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">cURL Example</span>
                </div>
                <pre className="font-mono text-xs leading-relaxed text-slate-300">
                    <span className="text-purple-400">curl</span> -X {operation.method} "https://api.ionosphere.io{api.path}{operation.urlTemplate}" \<br />
                    &nbsp;&nbsp;-H "Authorization: Bearer &lt;YOUR_TOKEN&gt;" \<br />
                    &nbsp;&nbsp;-H "Accept: application/json"
                    {['POST', 'PUT', 'PATCH'].includes(operation.method) && (
                        <>
                            {" \\"}<br />
                            &nbsp;&nbsp;-H "Content-Type: application/json" \<br />
                            &nbsp;&nbsp;-d '{getPayload() || `"key": "value"`}'
                        </>
                    )}
                </pre>
            </div>

            {/* Example Response */}
            <div className="bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl p-6 border border-emerald-100 dark:border-emerald-800/30 mb-6">
                <h3 className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-4">Example Response (200 OK)</h3>
                <pre className="font-mono text-xs leading-relaxed text-gray-800 dark:text-gray-300">
                    {`{
  "status": "success",
  "data": {
    "id": "${operation.urlTemplate && operation.urlTemplate.includes('payment') ? 'txn_8h3j2k1' : 'res_abc123'}",
    "timestamp": "2024-12-20T15:30:00Z"
  }
}`}
                </pre>
            </div>

            {/* Support Reference */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
                <div>
                    <p className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-1">Owner Contact</p>
                    <p className="text-xs font-bold text-gray-900 dark:text-white">{product.ownerTeamId}@company.com</p>
                </div>
                <a href={`mailto:${product.ownerTeamId}@company.com`} className="text-xs font-bold text-blue-600 hover:underline">
                    Request Support
                </a>
            </div>
        </section>
    );
}
