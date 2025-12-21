import { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Product, User, Subscription, API } from '../../../types/entities';
import { useStore } from '../../../store/useStore';
import { ManageProductModal } from '../components/ManageProductModal';
import { SubscriberCard } from '../components/SubscriberCard';
import { ProducerHeader } from '../components/ProducerHeader';
import { ProducerMetrics } from '../components/ProducerMetrics';
import { ProducerAuditLog } from '../components/ProducerAuditLog';
import { RevokeAccessModal } from '../components/RevokeAccessModal';

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

    const [revokeModalOpen, setRevokeModalOpen] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState<string | null>(null);
    const [revocationReason, setRevocationReason] = useState('');
    const [activeTab, setActiveTab] = useState<'subscribers' | 'apis' | 'audit'>('subscribers');
    const [localToast, setLocalToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);

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
        } else {
            setLocalToast({ message: `Already at PROD. No further promotion possible.`, type: 'warning' });
            setTimeout(() => setLocalToast(null), 3000);
        }
    }, [product.id, product.displayName, product.environment, updateProduct, addNotification]);

    /**
     * Handle product deprecation
     */
    const handleDeprecate = useCallback(() => {
        if (confirm(`Are you sure you want to deprecate ${product.displayName}? This will prevent new subscriptions.`)) {
            updateProduct(product.id, { visibility: 'private' }); // Or a specific 'deprecated' state if available

            addNotification({
                type: 'warning',
                title: 'Product Deprecated',
                message: `${product.displayName} is now deprecated.`,
                navigateTo: `/products/${product.id}`
            });

            setLocalToast({ message: 'Product marked as Deprecated', type: 'warning' });
            setTimeout(() => setLocalToast(null), 3000);
        }
    }, [product.id, product.displayName, updateProduct, addNotification]);

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
            <ProducerHeader
                product={product}
                isOutOfSync={isOutOfSync}
                onInitiateRedeploy={() => {
                    updateProduct(product.id, { environment: 'DEV' });
                    setIsOutOfSync(false);
                    setLocalToast({ message: 'Product returned to DEV for re-promotion.', type: 'success' });
                }}
                onManageClick={() => setIsManageModalOpen(true)}
                onPromoteClick={handlePromote}
                onDeprecateClick={handleDeprecate}
            />

            <ProducerMetrics
                qualityScore={score}
                subscriberCount={productSubscriptions.length}
                apiCount={product.apis.length}
                getScoreColor={getScoreColor}
            />

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
                                const team = allTeams.find(t => t.id === subscription.subscriberTeamId);
                                return (
                                    <SubscriberCard
                                        key={subscription.id}
                                        subscription={subscription}
                                        team={team}
                                        isOwnerLead={isOwnerLead}
                                        onRevokeAccess={handleRevokeAccess}
                                    />
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
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'audit' && (
                <ProducerAuditLog onAction={(msg, type) => {
                    setLocalToast({ message: msg, type });
                    setTimeout(() => setLocalToast(null), 3000);
                }} />
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

            <RevokeAccessModal
                isOpen={revokeModalOpen}
                onClose={() => setRevokeModalOpen(false)}
                onConfirm={confirmRevoke}
                revocationReason={revocationReason}
                setRevocationReason={setRevocationReason}
                apiCount={product.apis.length}
            />

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
