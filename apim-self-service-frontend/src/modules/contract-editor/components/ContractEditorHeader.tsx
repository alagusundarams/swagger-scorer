import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { API, Product } from '../../../types/entities';

interface ContractEditorHeaderProps {
    api: API;
    product: Product;
    isModified: boolean;
    content: string;
    onClose: () => void;
}

export const ContractEditorHeader: React.FC<ContractEditorHeaderProps> = ({
    api,
    product,
    isModified,
    content,
    onClose
}) => {
    const navigate = useNavigate();

    return (
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                    ⚙️ Edit Contract: {api.displayName}
                </h2>
                <span className={`px-3 py-1 text-xs font-black rounded-lg ${product.environment === 'PROD'
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-blue-500/10 text-blue-500'
                    }`}>
                    {product.environment}
                </span>
                {isModified && (
                    <span className="px-3 py-1 text-xs font-black rounded-lg bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400">
                        ● Modified
                    </span>
                )}
            </div>
            <div className="flex items-center gap-3">
                <button
                    onClick={() => {
                        navigate('/analyzer', {
                            state: {
                                startWithSpec: content,
                                breadcrumbContext: [
                                    { label: product.displayName, href: `/products/${product.id}` },
                                    { label: api.displayName, href: `/products/${product.id}/apis/${api.id}` }
                                ]
                            }
                        });
                    }}
                    className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-black rounded-xl transition flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                    Analyze
                </button>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold"
                >
                    ×
                </button>
            </div>
        </div>
    );
};
