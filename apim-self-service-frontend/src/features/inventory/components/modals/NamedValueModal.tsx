import { useState, useEffect } from 'react';
import type { Product } from '../../types/inventoryTypes';

interface NamedValueModalProps {
    product: Product;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: any) => Promise<void>;
}

export const NamedValueModal = ({ product, isOpen, onClose, onConfirm }: NamedValueModalProps) => {
    const [displayName, setDisplayName] = useState('');
    const [systemName, setSystemName] = useState('');
    const [value, setValue] = useState('');
    const [isSecret, setIsSecret] = useState(false);
    const [type, setType] = useState<'literal' | 'key_vault'>('literal');
    const [scopeId, setScopeId] = useState<string>(''); // Empty = Product Level
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [duplicateDetected, setDuplicateDetected] = useState(false);
    const [existingNV, setExistingNV] = useState<any>(null);

    // Auto-generate system name from display name
    useEffect(() => {
        if (displayName) {
            setSystemName(displayName.toLowerCase().replace(/[^a-z0-9]/g, '-'));
        }
    }, [displayName]);

    useEffect(() => {
        setDuplicateDetected(false);
        setExistingNV(null);
        setError(null);
    }, [scopeId, systemName]);

    if (!isOpen) return null;

    const checkDuplicate = async () => {
        if (!systemName || !product.environment) return;

        try {
            const response = await fetch(`/api/v1/products/${product.id}/named-values/check-duplicate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ systemName, environment: product.environment })
            });
            const result = await response.json();

            if (result.exists) {
                setDuplicateDetected(true);
                setExistingNV(result.existing);
            }
        } catch (err) {
            console.error('Duplicate check failed:', err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            await onConfirm({
                displayName,
                systemName,
                value,
                type,
                isSecret,
                scopeId: scopeId || null
            });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save value.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-slate-700">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
                    <h2 className="text-xl font-black text-gray-900 dark:text-white">Add Configuration Value</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg mb-4 flex items-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    {duplicateDetected && existingNV && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4 animate-fade-in">
                            <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-1">
                                <span>⚠️</span> Named Value Already Exists
                            </h4>
                            <p className="text-xs text-amber-700 mb-2">
                                A value with the name <strong>{systemName}</strong> already exists.
                            </p>
                            <div className="text-xs text-amber-800 mb-3">
                                <strong>Currently used by:</strong>
                                <ul className="mt-1 ml-4 list-disc">
                                    {existingNV.owners?.map((o: any, i: number) => (
                                        <li key={i}>{o.productName} ({o.teamName}) {o.isOwner && '👑'}</li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDuplicateDetected(false);
                                        setSystemName('');
                                    }}
                                    className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold uppercase rounded shadow-sm transition"
                                >
                                    Rename Mine
                                </button>
                                <button
                                    type="button"
                                    className="flex-1 py-2 bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold uppercase rounded shadow-sm transition"
                                    disabled
                                >
                                    Reference (Coming Soon)
                                </button>
                            </div>
                        </div>
                    )}


                    {/* Scope Selection - Critical for GRP/API separation */}
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Scope Ownership</label>
                        <select
                            value={scopeId}
                            onChange={(e) => setScopeId(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">Product Level (Shared)</option>
                            <optgroup label="Specific API">
                                {product.apis?.map(api => (
                                    <option key={api.id} value={api.id}>
                                        {api.displayName} ({api.name})
                                    </option>
                                ))}
                            </optgroup>
                        </select>
                        <p className="text-[10px] text-gray-400 mt-1">
                            {scopeId ? 'Value will only be available to this specific API.' : 'Value is available to all APIs in this product.'}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Display Name</label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="e.g. Backend Timeout"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1">System Name</label>
                            <input
                                type="text"
                                value={systemName}
                                onChange={(e) => setSystemName(e.target.value)}
                                onBlur={checkDuplicate}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                                placeholder="backend-timeout"
                                required
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Auto-checked for duplicates</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Value Type</label>
                        <div className="flex gap-4 mb-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="type"
                                    checked={type === 'literal'}
                                    onChange={() => setType('literal')}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm dark:text-gray-300">Literal Value</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="type"
                                    checked={type === 'key_vault'}
                                    onChange={() => {
                                        setType('key_vault');
                                        setIsSecret(true); // KV implies secret
                                    }}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm dark:text-gray-300">Key Vault Reference</span>
                            </label>
                        </div>
                    </div>

                    {type === 'key_vault' && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex gap-3 text-xs text-blue-800 dark:text-blue-300 items-start mb-2">
                            <span className="text-lg">🔐</span>
                            <div>
                                <strong className="block mb-1">Governance Reminder</strong>
                                Need a new secret? <a href="#" className="underline text-blue-600 hover:text-blue-800">Request via ServiceNow</a> (Catalog #1023).
                                <br />Ensure the APIM Identity has <code>GET</code> access to the vault.
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                            {type === 'key_vault' ? 'Secret Identifier (URL)' : 'Value'}
                        </label>
                        <input
                            type={isSecret && type === 'literal' ? "password" : "text"}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                            placeholder={type === 'key_vault' ? "https://mykv.vault.azure.net/secrets/my-secret" : "Enter value..."}
                            required
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={isSecret}
                            onChange={(e) => setIsSecret(e.target.checked)}
                            disabled={type === 'key_vault'} // Forced secret for KV
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm dark:text-gray-300">Mark as Secret (Mask in UI)</span>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || confirmOverwrite} // Disable if asking for confirmation
                            className={`px-6 py-2 font-bold rounded-lg transition disabled:opacity-50 ${confirmOverwrite
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                                }`}
                        >
                            {isSubmitting ? 'Saving...' : 'Add Value'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
