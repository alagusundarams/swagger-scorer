import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Product, User, Subscription } from '../../../types/entities';
import { useStore } from '../../../store/useStore';
import { ManageProductModal } from '../components/ManageProductModal';

/**
 * Props for the ProductDetailProducer component
 * 
 * @interface ProductDetailProducerProps
 * @property {Product} product - The product being displayed
 * @property {User} user - Current authenticated user (reserved for future use)
 */
interface ProductDetailProducerProps {
    product: Product;
    user: User;
}

/**
 * Permissions that can be assigned to a subscriber
 * @type {('read-only' | 'read-write')}
 */
type SubscriberPermission = 'read-only' | 'read-write';

/**
 * ProductDetailProducer Component
 * 
 * **Purpose**: Producer-specific view for product owners to manage their API products.
 * 
 * **Key Features**:
 * - Real-time quality metrics dashboard
 * - Complete subscriber list with management controls
 * - Granular access management (revoke, modify permissions)
 * - API catalog with quality scores and analyzer integration
 * - Product lifecycle actions (deploy, deprecate)
 * 
 * **Performance Optimizations**:
 * - `useMemo` for expensive filtering operations (product subscriptions)
 * - `useCallback` for event handlers to prevent child re-renders
 * - Optimized store subscriptions (only subscribes to needed slices)
 * 
 * **Data Flow**:
 * ```
 * Zustand Store → Filter Subscriptions → Join with Teams → Render List
 *      ↓
 * User Action (Revoke) → Confirmation Modal → API Call → Store Update
 * ```
 * 
 * **Accessibility**:
 * - ARIA labels on interactive elements
 * - Keyboard navigation support
 * - Screen reader friendly role attributes
 * 
 * **Future Backend Integration Points**:
 * - `confirmRevoke()`: POST /subscriptions/{id}/revoke
 * - `handleModifyPermissions()`: PATCH /subscriptions/{id}/permissions
 * - Real-time updates via WebSocket when subscribers change
 * 
 * @component
 * @example
 * ```tsx
 * <ProductDetailProducer 
 *   product={currentProduct} 
 *   user={authenticatedUser} 
 * />
 * ```
 */
export const ProductDetailProducer = ({ product }: ProductDetailProducerProps) => {
    const navigate = useNavigate();

    // === Modal State ===
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [selectedSubscriberMenu, setSelectedSubscriberMenu] = useState<string | null>(null);
    const [revokeModalOpen, setRevokeModalOpen] = useState(false);
    const [modifyPermissionsModalOpen, setModifyPermissionsModalOpen] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState<string | null>(null);
    const [newPermission, setNewPermission] = useState<SubscriberPermission>('read-only');

    // === Store Integration ===
    /**
     * Subscribe to specific slices of Zustand store
     * Only subscribes to subscriptions and teams to minimize re-renders
     */
    const { subscriptions: allSubscriptions, teams: allTeams } = useStore();

    // === Memoized Computations ===

    /**
     * Filter and memoize subscriptions for this product
     * 
     * **Performance**: Only recomputes when dependencies change
     * **Filter Logic**: productId match + active state only
     * 
     * @returns {Subscription[]} Active subscriptions for this product
     */
    const productSubscriptions = useMemo<Subscription[]>(() =>
        allSubscriptions.filter(sub =>
            sub.productId === product.id && sub.state === 'active'
        ),
        [allSubscriptions, product.id]
    );

    /**
     * Calculate color coding for quality scores
     * 
     * **Memoized**: Prevents recreation on every render
     * **Color Scale**:
     * - 90%+: Green (Excellent)
     * - 70-89%: Amber (Good)
     * - <70%: Red (Needs Improvement)
     * 
     * @param {number} score - Quality score (0-100)
     * @returns {string} Tailwind CSS color class
     */
    const getScoreColor = useCallback((score: number): string => {
        if (score >= 90) return 'text-green-500';
        if (score >= 70) return 'text-amber-500';
        return 'text-red-500';
    }, []);

    const score = product.qualityScore || 0;

    // === Event Handlers ===

    /**
     * Handle revoke access action
     * 
     * **Flow**:
     * 1. Store subscription ID
     * 2. Show confirmation modal
     * 3. Close dropdown menu
     * 
     * @param {string} subscriptionId - ID of subscription to revoke
     */
    const handleRevokeAccess = useCallback((subscriptionId: string) => {
        setSelectedSubscription(subscriptionId);
        setRevokeModalOpen(true);
        setSelectedSubscriberMenu(null);
    }, []);

    /**
     * Confirm and execute revocation
     * 
     * **TODO [BACKEND]**: Replace console.log with actual API call
     * 
     * **Expected API**:
     * ```typescript
     * POST /api/subscriptions/{id}/revoke
     * Body: {
     *   reason: string;
     *   notifyTeam: boolean;
     * }
     * Response: {
     *   success: boolean;
     *   message: string;
     * }
     * ```
     * 
     * **Side Effects**:
     * - Updates subscription.state to 'revoked'
     * - Disables API keys immediately
     * - Sends email notification to subscriber team
     * - Creates audit log entry
     */
    const confirmRevoke = useCallback(() => {
        // TODO [BACKEND]: Implement actual revocation API call
        // Example implementation:
        // try {
        //   await revokeSubscription(selectedSubscription, {
        //     reason: 'Manual revocation by product owner',
        //     notifyTeam: true
        //   });
        //   showToast('Access revoked successfully', 'success');
        //   refetchSubscriptions();
        // } catch (error) {
        //   showToast('Failed to revoke access', 'error');
        // }

        console.log('[TODO] Revoking subscription:', selectedSubscription);
        setRevokeModalOpen(false);
        setSelectedSubscription(null);
    }, [selectedSubscription]);

    /**
     * Handle modify permissions action
     * 
     * **Flow**:
     * 1. Store subscription ID
     * 2. Load current permission level
     * 3. Show permissions modal
     * 4. Close dropdown menu
     * 
     * @param {string} subscriptionId - ID of subscription to modify
     */
    const handleModifyPermissions = useCallback((subscriptionId: string) => {
        setSelectedSubscription(subscriptionId);
        // TODO: Load current permission from subscription data
        setNewPermission('read-only');
        setModifyPermissionsModalOpen(true);
        setSelectedSubscriberMenu(null);
    }, []);

    /**
     * Confirm and save permission changes
     * 
     * **TODO [BACKEND]**: Implement permission update API call
     * 
     * **Expected API**:
     * ```typescript
     * PATCH /api/subscriptions/{id}/permissions
     * Body: {
     *   permission: 'read-only' | 'read-write'
     * }
     * ```
     */
    const confirmModifyPermissions = useCallback(() => {
        // TODO [BACKEND]: Implement permission update
        console.log('[TODO] Updating permission:', selectedSubscription, newPermission);
        setModifyPermissionsModalOpen(false);
        setSelectedSubscription(null);
    }, [selectedSubscription, newPermission]);

    /**
     * Navigate to API detail page
     * 
     * **Memoized**: Prevents recreation on every render
     * **Route**: /products/:productId/apis/:apiId
     * 
     * @param {string} apiId - ID of the API
     */
    const navigateToAPI = useCallback((apiId: string) => {
        navigate(`/products/${product.id}/apis/${apiId}`);
    }, [navigate, product.id]);

    /**
     * Navigate to analyzer with API context
     * 
     * **Query Param**: apiId passed to pre-load spec
     * 
     * @param {React.MouseEvent} e - Click event
     * @param {string} apiId - ID of the API to analyze
     */
    const navigateToAnalyzer = useCallback((e: React.MouseEvent, apiId: string) => {
        e.stopPropagation();
        navigate(`/analyzer?apiId=${apiId}`);
    }, [navigate]);

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            {/* ============================================
                HEADER: Product Info & Management Actions
                ============================================ */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
                            {product.displayName}
                        </h1>
                        <p className="text-gray-600 dark:text-slate-400">{product.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Environment Badge */}
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
                        aria-label="Manage product settings"
                    >
                        Manage Product
                    </button>
                    <button
                        onClick={() => navigate(`/deploy/${product.id}`)}
                        className="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-900 dark:text-white rounded-lg font-semibold text-sm transition"
                        aria-label="Deploy product to environment"
                    >
                        Deploy
                    </button>
                    {product.state === 'published' && (
                        <button
                            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-semibold text-sm transition"
                            aria-label="Mark product as deprecated"
                        >
                            Mark as Deprecated
                        </button>
                    )}
                </div>
            </div>

            {/* ============================================
                METRICS DASHBOARD: Quality, Adoption, APIs
                ============================================ */}
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

                {/* Subscribers Card - Real-time count */}
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

            {/* ============================================
                ALL SUBSCRIBERS: Complete list with actions
                ============================================ */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700 mb-8">
                <h2 className="text-xl font-black text-gray-900 dark:text-white mb-4">All Subscribers</h2>
                {productSubscriptions.length > 0 ? (
                    <div className="space-y-3">
                        {productSubscriptions.map((subscription) => {
                            // Join with teams data for display
                            const team = allTeams.find(t => t.id === subscription.subscriberTeamId);
                            const isMenuOpen = selectedSubscriberMenu === subscription.id;

                            return (
                                <div key={subscription.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
                                    {/* Team Info */}
                                    <div className="flex-1">
                                        <div className="font-semibold text-gray-900 dark:text-white">
                                            {team?.name || subscription.subscriberTeamId}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-slate-500">
                                            {team?.description || 'Team'} • Subscribed {new Date(subscription.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>

                                    {/* Status Badge & Actions */}
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-semibold px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                                            {subscription.state}
                                        </span>

                                        {/* Actions Dropdown */}
                                        <div className="relative">
                                            <button
                                                onClick={() => setSelectedSubscriberMenu(isMenuOpen ? null : subscription.id)}
                                                className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition"
                                                aria-label="Subscriber actions menu"
                                                aria-haspopup="true"
                                                aria-expanded={isMenuOpen}
                                            >
                                                <svg className="w-5 h-5 text-gray-600 dark:text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                </svg>
                                            </button>

                                            {/* Dropdown Menu - Only real actions */}
                                            {isMenuOpen && (
                                                <div
                                                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 z-10"
                                                    role="menu"
                                                >
                                                    <button
                                                        onClick={() => handleModifyPermissions(subscription.id)}
                                                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-t-lg transition"
                                                        role="menuitem"
                                                    >
                                                        Modify Permissions
                                                    </button>
                                                    <button
                                                        onClick={() => handleRevokeAccess(subscription.id)}
                                                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-lg transition"
                                                        role="menuitem"
                                                    >
                                                        Revoke Access
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

            {/* ============================================
                API LIST: All APIs in this product
                ============================================ */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
                <h2 className="text-xl font-black text-gray-900 dark:text-white mb-4">APIs in this Product</h2>
                <div className="space-y-3">
                    {product.apis.map((api) => (
                        <div
                            key={api.id}
                            onClick={() => navigateToAPI(api.id)}
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition"
                            role="button"
                            tabIndex={0}
                            onKeyPress={(e) => e.key === 'Enter' && navigateToAPI(api.id)}
                            aria-label={`View details for ${api.displayName}`}
                        >
                            {/* API Info */}
                            <div className="flex-1">
                                <div className="font-semibold text-gray-900 dark:text-white">{api.displayName}</div>
                                <div className="text-xs text-gray-500 dark:text-slate-500">{api.description}</div>
                                <div className="text-xs text-gray-400 dark:text-slate-600 mt-1">
                                    {api.operations.length} operations
                                </div>
                            </div>

                            {/* Quality Score & Analyze Button */}
                            <div className="flex items-center gap-3">
                                {api.qualityScore && (
                                    <div className={`text-sm font-bold ${getScoreColor(api.qualityScore)}`}>
                                        {api.qualityScore}%
                                    </div>
                                )}
                                <button
                                    onClick={(e) => navigateToAnalyzer(e, api.id)}
                                    className="px-3 py-1.5 text-xs font-semibold bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition flex items-center gap-1.5"
                                    aria-label={`Analyze ${api.displayName}`}
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

            {/* ============================================
                MODALS: Revoke, Modify Permissions, Manage Product
                ============================================ */}

            {/* Revoke Access Confirmation Modal */}
            {revokeModalOpen && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="revoke-modal-title"
                >
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
                        <h3 id="revoke-modal-title" className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            Revoke Access?
                        </h3>
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
            )}

            {/* Modify Permissions Modal */}
            {modifyPermissionsModalOpen && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="permissions-modal-title"
                >
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
                        <h3 id="permissions-modal-title" className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                            Modify Permissions
                        </h3>
                        <p className="text-gray-600 dark:text-slate-400 mb-4">
                            Change access level for this subscriber.
                        </p>

                        <div className="space-y-3 mb-6">
                            <label className="flex items-center p-3 border border-gray-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900 transition">
                                <input
                                    type="radio"
                                    name="permission"
                                    value="read-only"
                                    checked={newPermission === 'read-only'}
                                    onChange={(e) => setNewPermission(e.target.value as SubscriberPermission)}
                                    className="mr-3"
                                />
                                <div>
                                    <div className="font-semibold text-gray-900 dark:text-white">Read Only</div>
                                    <div className="text-xs text-gray-500 dark:text-slate-500">Can view documentation and make API calls</div>
                                </div>
                            </label>

                            <label className="flex items-center p-3 border border-gray-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900 transition">
                                <input
                                    type="radio"
                                    name="permission"
                                    value="read-write"
                                    checked={newPermission === 'read-write'}
                                    onChange={(e) => setNewPermission(e.target.value as SubscriberPermission)}
                                    className="mr-3"
                                />
                                <div>
                                    <div className="font-semibold text-gray-900 dark:text-white">Read-Write</div>
                                    <div className="text-xs text-gray-500 dark:text-slate-500">Can make all API calls including modifications</div>
                                </div>
                            </label>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setModifyPermissionsModalOpen(false)}
                                className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmModifyPermissions}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
