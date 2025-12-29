import { useState, useEffect } from 'react';
import type { Product } from '../../inventory/types/inventoryTypes';
import { inventoryApi } from '../../inventory/api/inventoryClient';

interface ConfigurationManifestModalProps {
    product: Product;
    isOpen: boolean;
    onClose: () => void;
}

export const ConfigurationManifestModal = ({ product, isOpen, onClose }: ConfigurationManifestModalProps) => {
    const [format, setFormat] = useState<'json' | 'tfvars'>('json');
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchManifest = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await inventoryApi.getManifest(product.id, format);
                setContent(res.content);
            } catch (err) {
                setError('Failed to load manifest.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen && product.id) {
            fetchManifest();
        }
    }, [isOpen, format, product.id]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden border border-gray-100 dark:border-slate-700 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                            GitOps Manifest Preview
                        </h2>
                        <p className="text-xs text-gray-500 mt-1">
                            This is the exact configuration that will be pushed to the repository.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        ✕
                    </button>
                </div>

                <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex gap-4 items-center bg-white dark:bg-slate-800">
                    <div className="flex bg-gray-100 dark:bg-slate-900 rounded-lg p-1">
                        <button
                            onClick={() => setFormat('json')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${format === 'json'
                                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                }`}
                        >
                            JSON (APIM)
                        </button>
                        <button
                            onClick={() => setFormat('tfvars')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${format === 'tfvars'
                                ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                                }`}
                        >
                            Terraform (.tfvars)
                        </button>
                    </div>
                    <div className="flex-1"></div>
                    <button
                        onClick={() => navigator.clipboard.writeText(content)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        disabled={loading || !!error}
                    >
                        📋 Copy to Clipboard
                    </button>
                </div>

                <div className="flex-1 overflow-auto bg-slate-900 p-6 relative group">
                    {loading ? (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            Loading Source of Truth...
                        </div>
                    ) : error ? (
                        <div className="text-red-400 p-4">{error}</div>
                    ) : (
                        <pre className="font-mono text-sm text-green-400 whitespace-pre-wrap leading-relaxed">
                            {content}
                        </pre>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>ℹ️</span>
                        <span>Secrets are masked in this preview.</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-900 dark:bg-slate-700 text-white font-bold rounded-lg hover:bg-gray-800 transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
