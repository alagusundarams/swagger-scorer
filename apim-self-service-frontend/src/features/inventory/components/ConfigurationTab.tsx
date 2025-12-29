import { useEffect, useState } from 'react';
import type { Product, NamedValue } from '../../inventory/types/inventoryTypes';
import { useInventoryStore } from '../hooks/useInventoryStore';
import { NamedValueModal } from './NamedValueModal';
import { ConfigurationManifestModal } from './ConfigurationManifestModal';

interface ConfigurationTabProps {
    product: Product;
}

export const ConfigurationTab = ({ product }: ConfigurationTabProps) => {
    const { fetchConfiguration, addNamedValue, deleteNamedValue } = useInventoryStore();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [showManifest, setShowManifest] = useState(false);

    useEffect(() => {
        if (product.id) {
            fetchConfiguration(product.id);
        }
    }, [product.id, fetchConfiguration]);

    const handleAddValue = async (data: Partial<NamedValue>) => {
        await addNamedValue(product.id, data);
    };

    const handleDelete = async (valueId: string) => {
        if (!confirm('Are you sure you want to delete this configuration value?')) return;
        await deleteNamedValue(product.id, valueId);
    };

    // GRP Read-Only Mode Check
    const isGrp = product.type === 'grp';

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        Configuration & Secrets
                        <span className="text-xs font-normal text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                            Named Values
                        </span>
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Manage constants, secrets, and Key Vault references for your policies.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowManifest(true)}
                        className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition flex items-center gap-2"
                    >
                        <span className="font-mono text-xs">{"{ }"}</span> GitOps Preview
                    </button>
                    {!isGrp && (
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="px-4 py-2 bg-blue-600 text-white text-xs font-bold uppercase rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                        >
                            <span>+</span> Add Value
                        </button>
                    )}
                </div>
            </div>

            {isGrp && (
                <div className="mb-6 bg-purple-50 dark:bg-purple-900/10 border-l-4 border-purple-500 p-4 rounded-r-lg">
                    <p className="text-sm text-purple-800 dark:text-purple-300">
                        <strong>GRP Mode:</strong> As a consumer product owner, you can view configuration for connected APIs but cannot modify their internal secrets.
                    </p>
                </div>
            )}

            <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-slate-700">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-500 dark:text-gray-400 uppercase text-xs font-bold">
                        <tr>
                            <th className="px-6 py-4">Display Name</th>
                            <th className="px-6 py-4">System Name</th>
                            <th className="px-6 py-4">Value</th>
                            <th className="px-6 py-4">Scope</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                        {product.namedValues?.map((nv) => (
                            <tr key={nv.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition">
                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                    {nv.displayName}
                                </td>
                                <td className="px-6 py-4 font-mono text-cyan-600 dark:text-cyan-400">
                                    {`{{${nv.systemName}}}`}
                                </td>
                                <td className="px-6 py-4 text-gray-600 dark:text-gray-300 font-mono text-xs">
                                    {nv.isSecret ? (
                                        <span className="flex items-center gap-1 text-gray-400">
                                            <span>🔒</span> ********
                                        </span>
                                    ) : (
                                        nv.value
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-md text-[10px] uppercase font-bold ${!nv.scopeId
                                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-100 dark:border-blue-800'
                                        : 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-300 border border-orange-100 dark:border-orange-800'
                                        }`}>
                                        {nv.scopeName || 'Product Level'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-xs text-gray-500">
                                    {nv.type === 'key_vault' ? 'Key Vault' : 'Literal'}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {!isGrp && (
                                        <button
                                            onClick={() => handleDelete(nv.id)}
                                            className="text-gray-400 hover:text-red-500 transition"
                                            title="Delete Value"
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {(!product.namedValues || product.namedValues.length === 0) && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400 dark:text-slate-500">
                                    No named values configured.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <NamedValueModal
                product={product}
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onConfirm={handleAddValue}
            />

            <ConfigurationManifestModal
                product={product}
                isOpen={showManifest}
                onClose={() => setShowManifest(false)}
            />
        </div>
    );
};
