import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product, User } from '../../../types/entities';
import { ManageProductModal } from '../components/ManageProductModal';

interface ProductDetailProducerProps {
    product: Product;
    user: User;
}

/**
 * Producer View - For Product Owners
 * 
 * Features:
 * - Quality metrics dashboard
 * - Subscriber list (who's using this API)
 * - API management controls
 * - Deployment history
 * - Management actions (Manage, Deploy, Deprecate)
 */
export const ProductDetailProducer = ({ product }: ProductDetailProducerProps) => {
    const navigate = useNavigate();
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const score = product.qualityScore || 0;

    // Color coding for quality score
    const getScoreColor = (s: number) => {
        if (s >= 90) return 'text-green-500';
        if (s >= 70) return 'text-amber-500';
        return 'text-red-500';
    };

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Header with Actions */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
                            {product.displayName}
                        </h1>
                        <p className="text-gray-600 dark:text-slate-400">{product.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 text-xs font-black rounded-lg border uppercase ${product.environment === 'PROD'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                            }`}>
                            {product.environment}
                        </span>
                    </div>
                </div>

                {/* Management Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsManageModalOpen(true)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold text-sm transition"
                    >
                        Manage Product
                    </button>
                    <button
                        onClick={() => navigate(`/deploy/${product.id}`)}
                        className="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-900 dark:text-white rounded-lg font-semibold text-sm transition"
                    >
                        Deploy
                    </button>
                    {product.state === 'published' && (
                        <button className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-semibold text-sm transition">
                            Mark as Deprecated
                        </button>
                    )}
                </div>
            </div>

            {/* Quality Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Quality Score Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
                    <div className="text-sm font-bold text-gray-500 dark:text-slate-400 mb-4">Quality Score</div>
                    <div className={`text-5xl font-black ${getScoreColor(score)} mb-2`}>
                        {score}%
                    </div>
                    <div className="text-xs text-gray-500 dark:text-slate-500">
                        {score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : 'Needs Improvement'}
                    </div>
                </div>

                {/* Adoption Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
                    <div className="text-sm font-bold text-gray-500 dark:text-slate-400 mb-4">Subscribers</div>
                    <div className="text-5xl font-black text-blue-500 mb-2">
                        {product.subscriberCount || 0}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-slate-500">
                        Active teams using this API
                    </div>
                </div>

                {/* APIs Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
                    <div className="text-sm font-bold text-gray-500 dark:text-slate-400 mb-4">Interfaces</div>
                    <div className="text-5xl font-black text-gray-900 dark:text-white mb-2">
                        {product.apis.length}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-slate-500">
                        APIs in this product
                    </div>
                </div>
            </div>

            {/* Subscribers Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700 mb-8">
                <h2 className="text-xl font-black text-gray-900 dark:text-white mb-4">Top Subscribers</h2>
                {product.subscriberCount && product.subscriberCount > 0 ? (
                    <div className="space-y-3">
                        {/* Placeholder subscriber list - would come from actual data */}
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                            <div>
                                <div className="font-semibold text-gray-900 dark:text-white">Team Alpha</div>
                                <div className="text-xs text-gray-500 dark:text-slate-500">Finance Division</div>
                            </div>
                            <span className="text-xs font-semibold text-green-500">Active</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                            <div>
                                <div className="font-semibold text-gray-900 dark:text-white">Team Beta</div>
                                <div className="text-xs text-gray-500 dark:text-slate-500">Operations</div>
                            </div>
                            <span className="text-xs font-semibold text-green-500">Active</span>
                        </div>
                    </div>
                ) : (
                    <p className="text-gray-500 dark:text-slate-500 text-center py-8">
                        No subscribers yet. Share your API to get started.
                    </p>
                )}
            </div>

            {/* API List */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
                <h2 className="text-xl font-black text-gray-900 dark:text-white mb-4">APIs in this Product</h2>
                <div className="space-y-3">
                    {product.apis.map((api) => (
                        <div
                            key={api.id}
                            onClick={() => navigate(`/api/${api.id}`)}
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition"
                        >
                            <div className="flex-1">
                                <div className="font-semibold text-gray-900 dark:text-white">{api.displayName}</div>
                                <div className="text-xs text-gray-500 dark:text-slate-500">{api.description}</div>
                                <div className="text-xs text-gray-400 dark:text-slate-600 mt-1">
                                    {api.operations.length} operations
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {api.qualityScore && (
                                    <div className={`text-sm font-bold ${getScoreColor(api.qualityScore)}`}>
                                        {api.qualityScore}%
                                    </div>
                                )}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/analyzer?apiId=${api.id}`);
                                    }}
                                    className="px-3 py-1 text-xs font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                                >
                                    Analyze
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Manage Product Modal */}
            {isManageModalOpen && (
                <ManageProductModal
                    product={product}
                    isOpen={isManageModalOpen}
                    onClose={() => setIsManageModalOpen(false)}
                    currentStage="DEV"
                    onPromote={() => { }}
                    onUpdate={() => { }}
                />
            )}
        </div>
    );
};
