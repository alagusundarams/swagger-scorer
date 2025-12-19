import { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Product, User, Subscription, API } from '../../../types/entities';
import { useStore } from '../../../store/useStore';
import { ManageProductModal } from '../components/ManageProductModal';

// Lazy load Contract Editor (only loads Monaco when needed)
const ContractEditorModal = lazy(() =>
    import('../../../modules/contract-editor').then(module => ({
        default: module.ContractEditorModal
    }))
);

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
 * ProductDetailProducer Component
 * 
 * **Purpose**: Producer-specific view for product owners to manage their API products.
 * 
 * **Key Features**:
 * - Real-time quality metrics dashboard
 * - Complete subscriber list with management controls
 * - Access management (revoke)
 * - API catalog with quality scores and analyzer integration
 * - Product lifecycle actions (deploy, deprecate)
 * **Performance Optimizations**:
 * - `useMemo` for filtering product subscriptions
 * - `useCallback` for event handlers to prevent child re-renders
 * 
 * ** Data Flow **:
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
 * - Real-time updates via WebSocket when subscribers change
 * 
 * @component
 */
export const ProductDetailProducer = ({ product, user }: ProductDetailProducerProps) => {
    const {
        subscriptions: allSubscriptions,
        teams: allTeams,
        updateProduct,
        addNotification
    } = useStore();
    const navigate = useNavigate();

    // === Modal State ===
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [selectedApi, setSelectedApi] = useState<API | null>(null);
    const [selectedSubscriberMenu, setSelectedSubscriberMenu] = useState<string | null>(null);
    const [revokeModalOpen, setRevokeModalOpen] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState<string | null>(null);
    const [revocationReason, setRevocationReason] = useState('');
    const [activeTab, setActiveTab] = useState<'subscribers' | 'apis' | 'audit'>('subscribers');
    const [localToast, setLocalToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);
    const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
    const [isOutOfSync, setIsOutOfSync] = useState(false);

    const location = useLocation();

    // Handle Deep-Linking to Tabs
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab === 'audit' || tab === 'apis' || tab === 'subscribers') {
            setActiveTab(tab as any);
        }
    }, [location]);

    // === Governance / Role Logic ===
    const isOwnerLead = user?.leadsTeams.includes(product.ownerTeamId) || user?.role === 'admin';

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

    const maskKey = useCallback((key: string) =>
        key.substring(0, 4) + '••••••••' + key.substring(key.length - 4),
        []);

    const toggleKeyReveal = (subscriptionId: string) => {
        setRevealedKeys(prev => {
            const next = new Set(prev);
            if (next.has(subscriptionId)) next.delete(subscriptionId);
            else next.add(subscriptionId);
            return next;
        });
    };

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
        if (!isOwnerLead) {
            setLocalToast({ message: 'Authorization Denied: Only Team Leads can revoke access.', type: 'warning' });
            return;
        }

        // TODO [BACKEND]: Implement actual revocation API call
        console.log('[TODO] Revoking subscription:', selectedSubscription, 'Reason:', revocationReason);

        // Proactive Intimation
        addNotification({
            type: 'governance',
            title: 'Critical: Access Revoked',
            message: `Lead ${user.name} revoked access for a subscriber of ${product.displayName}. Reason: ${revocationReason}`,
            navigateTo: '/'
        });

        // Show local feedback
        setLocalToast({ message: `Access Revoked. Governance audit entry created.`, type: 'warning' });
        setTimeout(() => setLocalToast(null), 3000);

        setRevokeModalOpen(false);
        setSelectedSubscription(null);
        setRevocationReason('');
    }, [selectedSubscription, revocationReason, isOwnerLead, user.name, product.displayName, addNotification]);


    /**
     * Handle product metadata and governance updates
     * 
     * **Flow**:
     * 1. Receive updated data from ManageProductModal
     * 2. Dispatch updateProduct to store
     * 3. Close modal
     * 
     * @param {Partial<Product>} data - Updated product data
     */
    const handleUpdateProduct = useCallback((data: Partial<Product>) => {
        updateProduct(product.id, data);
        setIsManageModalOpen(false);

        // If product is in PROD/STAGE, metadata changes trigger an "Out of Sync" state
        if (product.environment === 'PROD' || product.environment === 'STAGE') {
            setIsOutOfSync(true);
            addNotification({
                type: 'warning',
                title: 'Deployment Required',
                message: `Changes to ${product.displayName} will not be live until a new promotion cycle is completed.`,
                navigateTo: `/products/${product.id}`
            });
        }
    }, [product.id, product.displayName, product.environment, updateProduct, addNotification]);

    /**
     * Handle product promotion between environments
     */
    const handlePromote = useCallback(() => {
        const stages: Product['environment'][] = ['DEV', 'QA', 'STAGE', 'PROD'];
        const currentIndex = stages.indexOf(product.environment || 'DEV');

        if (currentIndex < stages.length - 1) {
            const nextStage = stages[currentIndex + 1];
            updateProduct(product.id, { environment: nextStage });

            addNotification({
                type: 'success',
                title: 'Product Promoted',
                message: `${product.displayName} has been successfully promoted to ${nextStage}.`,
                navigateTo: `/products/${product.id}`
            });

            setLocalToast({ message: `Successfully promoted to ${nextStage}`, type: 'success' });
            setTimeout(() => setLocalToast(null), 3000);
        }
    }, [product.id, product.displayName, product.environment, updateProduct, addNotification]);

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

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Out of Sync Banner */}
            {isOutOfSync && (
                <div className="mb-6 p-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 animate-slide-up">
                    <div className="flex items-center gap-4">
                        <span className="text-3xl">🔄</span>
                        <div>
                            <p className="text-sm font-black text-amber-700 dark:text-amber-500 uppercase tracking-widest">Environment Out of Sync</p>
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                The current draft has unpromoted changes. To reflect these in Production, you must initiate a new deployment cycle.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            updateProduct(product.id, { environment: 'DEV' });
                            setIsOutOfSync(false);
                            setLocalToast({ message: 'Product returned to DEV for re-promotion.', type: 'success' });
                        }}
                        className="px-6 py-3 bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:bg-amber-700 transition-all flex items-center gap-2"
                    >
                        <span>Initiate Re-Deployment (DEV)</span>
                        <span>→</span>
                    </button>
                </div>
            )}

            {/* Terraform Management Mode Banner */}
            {product.management_mode === 'TERRAFORM_MANAGED' && (
                <div className="mb-6 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-3xl flex items-center gap-4 animate-slide-up">
                    <span className="text-3xl">🔧</span>
                    <div className="flex-1">
                        <p className="text-sm font-black text-blue-700 dark:text-blue-500 uppercase tracking-widest">Terraform Managed</p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            This product is currently managed via Terraform. Changes must be made through the Azure DevOps pipeline.
                        </p>
                    </div>
                </div>
            )}

            {/* ============================================
                HEADER: Product Info & Management Actions
                ============================================ */}
            <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl shadow-xl shadow-blue-500/10">
                            📦
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-black text-gray-900 dark:text-white">
                                    {product.displayName}
                                </h1>
                                <span className="bg-gray-100 dark:bg-slate-900 px-2 py-1 rounded text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 dark:border-slate-800">
                                    V{product.version}
                                </span>
                                {/* Visibility Badge */}
                                <span className={`px-2 py-1 text-[10px] font-black rounded-lg border uppercase ${product.visibility === 'private'
                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                    : product.visibility === 'owner-only'
                                        ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                        : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                    }`}>
                                    {product.visibility || 'public'}
                                </span>
                            </div>
                            <p className="text-gray-600 dark:text-slate-400 mt-1">{product.description}</p>
                        </div>
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
                        onClick={() => {
                            const mode = product.management_mode || 'PORTAL_MANAGED';

                            if (mode === 'TERRAFORM_MANAGED' && product.terraform_pipeline_url) {
                                // Open Azure DevOps pipeline in new tab
                                window.open(product.terraform_pipeline_url, '_blank');
                            } else if (mode === 'HYBRID') {
                                // Trigger Terraform pipeline via webhook (placeholder)
                                console.log('[Hybrid Mode] Would trigger Terraform pipeline');
                                setLocalToast({ message: 'Terraform pipeline triggered', type: 'success' });
                                setTimeout(() => setLocalToast(null), 3000);
                            } else {
                                //  Portal managed - open modal (existing behavior)
                                setIsManageModalOpen(true);
                            }
                        }}
                        className="px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-900 dark:text-white rounded-lg font-semibold text-sm transition"
                        aria-label="Deploy product"
                    >
                        {product.management_mode === 'TERRAFORM_MANAGED' ? 'View Pipeline' : 'Deploy'}
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

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-100 dark:border-slate-800 mb-8">
                {[
                    { id: 'subscribers', label: 'Subscribers' },
                    { id: 'apis', label: 'API Inventory' },
                    { id: 'audit', label: 'Audit Log' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`py-4 px-6 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tab.id
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* ============================================
                TAB CONTENT
                ============================================ */}
            {activeTab === 'subscribers' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700 mb-8 animate-fade-in">
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

                                            {/* Security Credentials Reveal */}
                                            <div className="mt-4 flex flex-wrap gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{subscription.primaryKey.name} Key</span>
                                                    <div className="flex items-center gap-2">
                                                        <code className="bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded text-[10px] font-mono text-slate-600 dark:text-emerald-400">
                                                            {revealedKeys.has(subscription.id) ? subscription.primaryKey.value : maskKey(subscription.primaryKey.value)}
                                                        </code>
                                                        <button
                                                            onClick={() => toggleKeyReveal(subscription.id)}
                                                            className="text-[10px] text-blue-600 font-bold hover:underline"
                                                        >
                                                            {revealedKeys.has(subscription.id) ? 'Hide' : 'Reveal'}
                                                        </button>
                                                    </div>
                                                </div>
                                                {subscription.secondaryKey && (
                                                    <div className="flex flex-col border-l border-gray-100 dark:border-slate-800 pl-4">
                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{subscription.secondaryKey.name} Key</span>
                                                        <code className="bg-slate-50 dark:bg-slate-950 px-3 py-1 rounded text-[10px] font-mono text-slate-400 dark:text-slate-600">
                                                            {revealedKeys.has(subscription.id) ? subscription.secondaryKey.value : maskKey(subscription.secondaryKey.value)}
                                                        </code>
                                                    </div>
                                                )}
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
                                                        {isOwnerLead ? (
                                                            <>
                                                                <button
                                                                    onClick={() => handleRevokeAccess(subscription.id)}
                                                                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                                                    role="menuitem"
                                                                >
                                                                    Revoke Access
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <div className="px-4 py-3 bg-gray-50 dark:bg-slate-900 rounded-lg">
                                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">
                                                                    🔒 Governance Locked
                                                                </p>
                                                                <p className="text-[9px] text-gray-500 font-medium mt-1 leading-relaxed">
                                                                    Only Team Leads can modify subscriptions.
                                                                </p>
                                                            </div>
                                                        )}
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
            )}

            {activeTab === 'apis' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700 animate-fade-in">
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
                                    {/* Unified Edit & Analyze Button - ALL PRODUCTS */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedApi(api);
                                            setIsEditorOpen(true);
                                        }}
                                        className="px-3 py-1.5 text-xs font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center gap-1.5"
                                        aria-label={`Edit and analyze contract for ${api.displayName}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                        </svg>
                                        Edit & Analyze
                                    </button>    </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'audit' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-slate-700 animate-fade-in">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-widest">Governance Audit Log</h2>
                            <p className="text-xs text-slate-500 font-medium mt-1">Immutable record of all access and lifecycle events</p>
                        </div>
                        <button className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline">Export CSV</button>
                    </div>

                    <div className="space-y-4">
                        {/* PENDING VETTING SECTION */}
                        <div className="mb-12">
                            <h3 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                                Pending Review Decisions
                            </h3>
                            <div className="space-y-4">
                                {/* Mocking a pending request for context if we're in audit tab */}
                                <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/20 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Visibility Change</span>
                                            <span className="text-[10px] font-mono text-slate-400">#REQ-9921</span>
                                        </div>
                                        <div className="font-black text-slate-900 dark:text-white text-sm mb-1">PROD Exposure Request</div>
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed">Requested by <span className="text-blue-600 font-bold">Identity Team</span> to enable cross-region discovery for internal clients.</p>
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            onClick={() => {
                                                setLocalToast({ message: 'Request Approved. Access updated successfully.', type: 'success' });
                                                setTimeout(() => setLocalToast(null), 3000);
                                            }}
                                            className="px-6 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                                        >
                                            Approve
                                        </button>
                                        <button
                                            onClick={() => {
                                                setLocalToast({ message: 'Request Rejected. Feedback sent to requester.', type: 'warning' });
                                                setTimeout(() => setLocalToast(null), 3000);
                                            }}
                                            className="px-6 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Historical Audit Logs</h3>
                            <div className="space-y-4">
                                {[
                                    { date: '2025-12-18 14:30', user: 'Admin User', event: 'Visibility Changed', details: 'Public → Private', impact: 'Medium' },
                                    { date: '2025-12-17 09:15', user: 'System', event: 'Team Authorized', details: 'CloudOps added to PROD', impact: 'Low' },
                                    { date: '2025-12-16 16:45', user: 'Product Owner', event: 'Access Revoked', details: 'Team-Alpha revoked (Breach of terms)', impact: 'High' }
                                ].map((log, i) => (
                                    <div key={i} className="flex items-center gap-6 p-4 bg-gray-50 dark:bg-slate-900/50 rounded-xl border border-gray-100 dark:border-slate-800 group hover:border-blue-500/30 transition-all">
                                        <div className="text-[10px] font-mono text-slate-400 w-32 shrink-0">{log.date}</div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-wider">{log.event}</span>
                                                <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-widest ${log.impact === 'High' ? 'bg-red-500/10 text-red-500' : log.impact === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                                                    }`}>
                                                    {log.impact} Impact
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                {log.details} • Modified by <span className="text-slate-900 dark:text-slate-200 font-bold">{log.user}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-500 transition-colors">📄</button>
                                            <button className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline">Details</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Local Toast */}
            {localToast && (
                <div className={`fixed bottom-8 right-8 p-4 rounded-2xl border shadow-2xl flex items-center gap-3 animate-slide-up z-[100] ${localToast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'
                    }`}>
                    <span className="text-xl">{localToast.type === 'success' ? '✨' : '⚠️'}</span>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60">System Notification</p>
                        <p className="text-xs font-bold uppercase tracking-widest">{localToast.message}</p>
                    </div>
                </div>
            )}

            {/* ============================================
                MODALS: Revoke, Modify Permissions, Manage Product
                ============================================ */}

            {/* Revoke Access Confirmation Modal */}
            {
                revokeModalOpen && (
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
                            <div className="mb-6">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Reason for Revocation</label>
                                <textarea
                                    value={revocationReason}
                                    onChange={(e) => setRevocationReason(e.target.value)}
                                    placeholder="e.g., Compliance breach, Project termination..."
                                    className="w-full p-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-red-500/20 outline-none h-24 resize-none"
                                />
                            </div>
                            <div className="flex gap-3 justify-end">
                                <button
                                    onClick={() => setRevokeModalOpen(false)}
                                    className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition font-bold text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmRevoke}
                                    disabled={!revocationReason.trim()}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-bold text-xs disabled:opacity-50"
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
                        currentStage={product.environment || 'DEV'}
                        onPromote={handlePromote}
                        onUpdate={handleUpdateProduct}
                    />
                )
            }

            {/* Contract Editor Modal - Lazy Loaded */}
            {
                isEditorOpen && selectedApi && (
                    <Suspense fallback={
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
                            <div className="text-white text-lg">Loading editor...</div>
                        </div>
                    }>
                        <ContractEditorModal
                            product={product}
                            api={selectedApi}
                            isOpen={isEditorOpen}
                            onClose={() => {
                                setIsEditorOpen(false);
                                setSelectedApi(null);
                            }}
                            onCommit={async (message, description) => {
                                // TODO: Call Git API to create PR
                                console.log('[Contract Editor] Create PR:', {
                                    product: product.id,
                                    api: selectedApi.id,
                                    message,
                                    description
                                });

                                addNotification({
                                    type: 'success',
                                    title: 'Pull Request Created',
                                    message: `PR created for ${selectedApi.displayName}. View in Azure DevOps to merge.`,
                                    navigateTo: `/products/${product.id}`
                                });
                            }}
                        />
                    </Suspense>
                )
            }
        </div >
    );
};
