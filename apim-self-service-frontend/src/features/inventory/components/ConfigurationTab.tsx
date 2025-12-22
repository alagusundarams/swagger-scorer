import { useMemo, useState } from 'react';
import type { Product, ConfigurationItem } from '../../../types/entities';

interface Props {
    product: Product;
    isReadOnly?: boolean;
}

// Enhanced Mock Data (Scope Aware)
const MOCK_NAMED_VALUES: ConfigurationItem[] = [
    {
        key: 'BackendUrl',
        values: {
            DEV: 'https://dev-api.internal',
            QA: 'https://qa-api.internal',
            STAGE: 'https://stage-api.internal',
            PROD: 'https://api.prod.com'
        },
        isSecret: false,
        scope: 'API',
        context: 'Order Processing API',
        lastEditedBy: 'Alice DevOps',
        lastEditedAt: '2 days ago'
    },
    {
        key: 'Ocp-Apim-Subscription-Key',
        values: { DEV: '********', QA: '********', STAGE: '********', PROD: '********' },
        isSecret: true,
        scope: 'Global',
        context: 'Used by 5 Products',
        lastEditedBy: 'System',
        lastEditedAt: '1 week ago'
    },
    {
        key: 'EnvironmentBanner',
        values: { DEV: 'Development', QA: 'QA Testing', STAGE: 'Staging', PROD: 'Production' },
        isSecret: false,
        scope: 'Product',
        context: 'Product Policy',
        lastEditedBy: 'Bob Architect',
        lastEditedAt: '1 day ago'
    },
    {
        key: 'AuthTokenEndpoint',
        values: {
            DEV: 'https://login.dev.ms.com',
            QA: 'https://login.qa.ms.com',
            STAGE: 'https://login.stage.ms.com',
            PROD: 'https://login.ms.com'
        },
        isSecret: false,
        scope: 'API',
        context: 'Payment API',
        lastEditedBy: 'Carol Sec',
        lastEditedAt: '5 mins ago',
        certificate: {
            thumbprint: '8A3D...FD22',
            expiryDate: '2025-12-31',
            subject: 'CN=*.login.ms.com'
        }
    }
];

const ENVIRONMENTS = ['DEV', 'QA', 'STAGE', 'PROD']; // Can be expanded dynamically

// Helper Component for Large Values
const TruncatedValue = ({ value, isSecret }: { value: string, isSecret: boolean }) => {
    const [showFull, setShowFull] = useState(false);

    if (isSecret) {
        return (
            <span className="flex items-center gap-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded text-xs font-bold w-fit cursor-help" title="Secret Value (KeyVault Reference)">
                <span>🔒</span> Secret
            </span>
        );
    }

    if (!value) return <span className="text-gray-300">-</span>;

    const isLong = value.length > 30;

    return (
        <div className="relative group/val">
            <span
                onClick={() => isLong && setShowFull(!showFull)}
                className={`font-mono text-sm max-w-[200px] inline-block truncate align-bottom ${isLong ? 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 decoration-dotted underline underline-offset-2' : 'text-gray-600 dark:text-slate-300'}`}
                title={isLong ? "Click to toggle full value" : value}
            >
                {showFull ? value : value}
            </span>
            {isLong && !showFull && (
                <span className="text-[10px] text-gray-400 ml-1 opacity-0 group-hover/val:opacity-100 transition">
                    (Click to expand)
                </span>
            )}
        </div>
    );
};

export const ConfigurationTab = ({ product, isReadOnly = false }: Props) => {

    const scanResult = useMemo(() => {
        return {
            totalDetected: 4,
            apiScoped: 2,
            productScoped: 1,
            globalScoped: 1
        };
    }, []);

    const productConfigs = MOCK_NAMED_VALUES.filter(i => i.scope === 'Product' || i.scope === 'Global');
    const apiConfigs = MOCK_NAMED_VALUES.filter(i => i.scope === 'API');

    const handleEdit = (key: string) => {
        if (product.management_mode === 'TERRAFORM_MANAGED') {
            alert(`🔒 GitOps Locked\n\nThis value is managed by Terraform.\n\nTo edit "${key}", you must submit a Pull Request to:\n${product.git_repo_url || 'generated-repo'}`);
        } else {
            alert(`📝 Edit Mode\n\nEditing "${key}" directly in APIM (Manual Mode).\n\nAudit log will record this action.`);
        }
    };

    return (
        <div className="space-y-12 animate-fade-in">
            {/* 1. Smart Scan Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl">
                    <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{scanResult.totalDetected}</div>
                    <div className="text-xs font-bold uppercase tracking-widest text-blue-800 dark:text-blue-300">Total Configs</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 p-4 rounded-xl">
                    <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{scanResult.apiScoped}</div>
                    <div className="text-xs font-bold uppercase tracking-widest text-purple-800 dark:text-purple-300">API Specific</div>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 p-4 rounded-xl">
                    <div className="text-2xl font-black text-orange-600 dark:text-orange-400">{scanResult.productScoped}</div>
                    <div className="text-xs font-bold uppercase tracking-widest text-orange-800 dark:text-orange-300">Product Wide</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-4 rounded-xl">
                    <div className="text-2xl font-black text-slate-600 dark:text-slate-400">{scanResult.globalScoped}</div>
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-slate-300">Global Shared</div>
                </div>
            </div>

            {/* 2. Product Level Configuration */}
            <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <span>📦</span> Product Configuration <span className="text-sm font-normal text-gray-500">(Global Variables)</span>
                </h3>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-slate-900/50 text-xs uppercase tracking-widest text-gray-500 font-bold border-b border-gray-100 dark:border-slate-700">
                                    <th className="px-6 py-3 w-1/4">Key</th>
                                    {ENVIRONMENTS.map(env => <th key={env} className="px-6 py-3">{env}</th>)}
                                    <th className="px-6 py-3 text-right">Last Edited</th>
                                    {!isReadOnly && <th className="px-6 py-3 text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {productConfigs.map((item) => (
                                    <tr key={item.key} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition group">
                                        <td className="px-6 py-4">
                                            <div className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">{`{{${item.key}}}`}</div>
                                            <div className="text-[10px] text-gray-400 mt-1 italic">{item.context}</div>
                                        </td>
                                        {ENVIRONMENTS.map(env => (
                                            <td key={env} className="px-6 py-4 text-sm font-mono align-top">
                                                <TruncatedValue value={item.values[env]} isSecret={item.isSecret} />
                                            </td>
                                        ))}
                                        <td className="px-6 py-4 text-right text-xs text-gray-500">
                                            <div>{item.lastEditedBy || 'System'}</div>
                                            <div className="text-[10px]">{item.lastEditedAt || '-'}</div>
                                        </td>
                                        {!isReadOnly && (
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => handleEdit(item.key)} className="opacity-0 group-hover:opacity-100 transition px-3 py-1.5 text-xs font-bold border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">Edit</button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* 3. API Specific Configuration */}
            <div>
                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <span>🔌</span> API Specific Configuration <span className="text-sm font-normal text-gray-500">(Overrides & Certs)</span>
                </h3>
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-slate-900/50 text-xs uppercase tracking-widest text-gray-500 font-bold border-b border-gray-100 dark:border-slate-700">
                                    <th className="px-6 py-3 w-1/4">Key</th>
                                    <th className="px-6 py-3">Certificate / Value</th>
                                    <th className="px-6 py-3 text-right">Expiry</th>
                                    <th className="px-6 py-3 text-right">Last Edited</th>
                                    {!isReadOnly && <th className="px-6 py-3 text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {apiConfigs.map((item) => (
                                    <tr key={item.key} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition group">
                                        <td className="px-6 py-4">
                                            <div className="font-mono text-sm font-bold text-purple-600 dark:text-purple-400">{`{{${item.key}}}`}</div>
                                            <div className="text-[10px] text-gray-400 mt-1 italic">{item.context}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono align-top">
                                            {item.certificate ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                                    <span>{item.certificate.subject}</span>
                                                    <span className="text-xs text-gray-400" title={item.certificate.thumbprint}>
                                                        (Thumb: {item.certificate.thumbprint.substring(0, 4)}...)
                                                    </span>
                                                </div>
                                            ) : (
                                                <TruncatedValue value={item.values['PROD']} isSecret={item.isSecret} />
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs">
                                            {item.certificate ? (
                                                <span className="text-green-600 font-bold">{item.certificate.expiryDate}</span>
                                            ) : (
                                                <span className="text-gray-300">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs text-gray-500">
                                            <div>{item.lastEditedBy || 'System'}</div>
                                            <div className="text-[10px]">{item.lastEditedAt || '-'}</div>
                                        </td>
                                        {!isReadOnly && (
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => handleEdit(item.key)} className="opacity-0 group-hover:opacity-100 transition px-3 py-1.5 text-xs font-bold border rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700">Edit</button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
