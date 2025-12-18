import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product, User } from '../../../types/entities';
import { useStore } from '../../../store/useStore';
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
    const [selectedSubscriberMenu, setSelectedSubscriberMenu] = useState<string | null>(null);
    const [revokeModalOpen, setRevokeModalOpen] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState<string | null>(null);

    const score = product.qualityScore || 0;

    // Get subscriptions for this product from store
    const { subscriptions: allSubscriptions, teams: allTeams } = useStore();
    const productSubscriptions = allSubscriptions.filter(sub =>
        sub.productId === product.id && sub.state === 'active'
    );

    // Color coding for quality score
    const getScoreColor = (s: number) => {
        if (s >= 90) return 'text-green-500';
        if (s >= 70) return 'text-amber-500';
        return 'text-red-500';
    };

    const handleRevokeAccess = (subscriptionId: string) => {
        setSelectedSubscription(subscriptionId);
        setRevokeModalOpen(true);
        setSelectedSubscriberMenu(null);
    };

    const confirmRevoke = () => {
        // In real app: call API to revoke subscription
        console.log('Revoking subscription:', selectedSubscription);
        setRevokeModalOpen(false);
        setSelectedSubscription(null);
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
                        {productSubscriptions.length}
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

            {/* All Subscribers Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700 mb-8">
                <h2 className="text-xl font-black text-gray-900 dark:text-white mb-4">All Subscribers</h2>
                {productSubscriptions.length > 0 ? (
                    <div className="space-y-3">
                        {productSubscriptions.map((subscription) => {
                            const team = allTeams.find(t => t.id === subscription.subscriberTeamId);
                            const isMenuOpen = selectedSubscriberMenu === subscription.id;

                            return (
                                <div key={subscription.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                                    <div className="flex-1">
                                        <div className="font-semibold text-gray-900 dark:text-white">
                                            {team?.name || subscription.subscriberTeamId}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-slate-500">
                                            {team?.description || 'Team'} • Subscribed {new Date(subscription.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-semibold px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                                            {subscription.state}
                                        </span>
                                        <div className="relative">
                                            <button
                                                onClick={() => setSelectedSubscriberMenu(isMenuOpen ? null : subscription.id)}
                                                className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition"
                                            >
                                                <svg className="w-5 h-5 text-gray-600 dark:text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                </svg>
                                            </button>

                                            {isMenuOpen && (
                                                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 z-10">
                                                    <button
                                                        onClick={() => handleRevokeAccess(subscription.id)}
                                                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-t-lg transition"
                                                    >
                                                        Revoke Access
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedSubscriberMenu(null)}
                                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                                                    >
                                                        View Usage Stats
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedSubscriberMenu(null)}
                                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-b-lg transition"
                                                    >
                                                        Modify Permissions
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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
                            onClick={() => navigate(`/products/${product.id}/apis/${api.id}`)}
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
                                    className="px-3 py-1.5 text-xs font-semibold bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition flex items-center gap-1.5"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                                    </svg>
                                    Analyze
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Revoke Confirmation Modal */}
            {
                revokeModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Revoke Access?</h3>
                            <p className="text-gray-600 dark:text-slate-400 mb-6">
                                This will immediately disable API keys and remove access to all {product.apis.length} APIs in this product.
                                The team will be notified.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setRevokeModalOpen(false)}
                                    className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmRevoke}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                                >
                                    Revoke Access
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Manage Product Modal */}
            {
                isManageModalOpen && (
                    <ManageProductModal
                        product={product}
                        isOpen={isManageModalOpen}
                        onClose={() => setIsManageModalOpen(false)}
                        currentStage="DEV"
                        onPromote={() => { }}
                        onUpdate={() => { }}
                    />
                )
            }
        </div >
    );
};
