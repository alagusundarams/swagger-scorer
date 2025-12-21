import React from 'react';
import type { Product, API } from '../../../types/entities';

interface GitContextPanelProps {
    product: Product;
    api: API;
    filename: string;
    isModified: boolean;
}

export const GitContextPanel: React.FC<GitContextPanelProps> = ({
    product,
    api,
    filename,
    isModified
}) => {
    return (
        <div className="px-8 py-4 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-start gap-6 text-sm">
                <div className="flex items-center gap-2">
                    <span className="text-gray-400 dark:text-slate-500">📂</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">
                        {product.name}-product
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-gray-400 dark:text-slate-500">🌿</span>
                    <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                        portal/{api.name}-{new Date().toISOString().split('T')[0]}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded">
                        NEW
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-gray-400 dark:text-slate-500">📄</span>
                    <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                        apis/{api.name}/{filename}
                    </span>
                </div>

                {isModified && (
                    <div className="flex items-center gap-2 ml-auto">
                        <span className="text-gray-400 dark:text-slate-500">💾</span>
                        <span className="text-xs text-gray-500 dark:text-slate-400">
                            Draft in browser (auto-saved)
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
