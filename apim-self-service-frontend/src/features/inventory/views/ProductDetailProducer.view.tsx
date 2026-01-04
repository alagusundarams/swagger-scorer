import { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { type Product, type API, type Subscription, type ApprovalRequest } from '../../../shared/types/domain';
import { type User } from '../../../core/types/commonTypes';
import { getScoreTheme, getNextEnvironment } from '../../../utils/statusUtils';
import { useStore } from '../../../store/useStore';
import { useInventoryStore } from '../../inventory/hooks/useInventoryStore';
import { useAppData } from '../../../shared/context/AppDataContext';
import { ManageProductModal }
    from '../components/product/ManageProductModal';
import { SubscriberCard } from '../components/producer/SubscriberCard';
import { ProducerHeader } from '../components/product/ProducerHeader';
import { ProductAuditLog } from '../../governance/components/ProductAuditLog';
import { RevokeAccessModal } from '../components/modals/RevokeAccessModal';
import { ConfigurationTab } from '../components/api-details/ConfigurationTab';
import { ApiInterfaceCatalog } from '../components/api-details/ApiInterfaceCatalog';
import { AddApiModal } from '../components/api-details/AddApiModal';
import { inventoryApi } from '../../inventory/api/inventoryClient';
import { PromotionWizard } from '../components/product/PromotionWizard';

// Lazy load Contract Editor (only loads Monaco when needed)
const ContractEditorModal = lazy(() =>
    import('../../contract-editor').then(module => ({
        default: module.ContractEditorModal
    }))
);

const PolicyStudioModal = lazy(() =>
    import('../../policy-studio/components/PolicyStudioModal').then(module => ({
        default: module.PolicyStudioModal
    }))
);

/**
 * Props for the ProductDetailProducer component
 */
interface ProductDetailProducerProps {
    product: Product;
    user: User;
}

/**
 * ProductDetailProducer Component
 */
export const ProductDetailProducer = ({ product, user }: ProductDetailProducerProps) => {
    const { addNotification } = useStore();
    const { updateProduct, removeApiFromProduct } = useInventoryStore();

    /**
     * MFE-Compliant: Using local state instead of cross-feature store access
     * TODO: Fetch subscriptions via inventory's own API client
     */
    const [allSubscriptions, _setAllSubscriptions] = useState<Subscription[]>([]);

    /**
     * MFE-Compliant Data Access:
     * Using shared AppDataContext for read-only team data instead of directly
     * importing useTeamsStore from the teams feature.
     */
    const { teams: allTeams } = useAppData();

    /**
     * TODO: Replace with proper governance API client
     * These placeholder functions maintain functionality while we refactor
     * to eliminate cross-feature store dependencies.
     */
    const [approvalRequests, _setApprovalRequests] = useState<ApprovalRequest[]>([]);


    // TODO: Implement processApproval via inventoryApi when ready
    const navigate = useNavigate();

    // === Modal State ===
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [isPolicyStudioOpen, setIsPolicyStudioOpen] = useState(false);
    const [isPromotionWizardOpen, setIsPromotionWizardOpen] = useState(false);
    const [isAddApiOpen, setIsAddApiOpen] = useState(false);
    const [selectedApi, setSelectedApi] = useState<API | null>(null);

    const [revokeModalOpen, setRevokeModalOpen] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState<string | null>(null);
    const [revocationReason, setRevocationReason] = useState('');
    const [activeTab, setActiveTab] = useState<'subscribers' | 'apis' | 'audit' | 'configuration'>('subscribers');
    const [localToast, setLocalToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);

    const [isOutOfSync, setIsOutOfSync] = useState(false);

    const location = useLocation();

    // Handle Deep-Linking to Tabs
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab === 'audit' || tab === 'apis' || tab === 'subscribers' || tab === 'configuration') {
            setActiveTab(tab as any);
        }
    }, [location]);

    // === Governance / Role Logic ===
    const isOwnerLead = user?.leadsTeams.includes(product.ownerTeamId) || user?.role === 'admin';
    const isInfraLocked = product.managementMode === 'TERRAFORM_MANAGED' || product.managementMode === 'HYBRID';

    // === Memoized Computations ===
    const productSubscriptions = useMemo<Subscription[]>(() => {
        const validSubscriptions = allSubscriptions.filter((s: Subscription) => s.productId === product.id);
        return validSubscriptions.filter(sub => sub.state === 'active');
    },
        [allSubscriptions, product.id]
    );


    // Removed unused score variable

    // === Event Handlers ===
    const handleRevokeAccess = useCallback((subscriptionId: string) => {
        setSelectedSubscription(subscriptionId);
        setRevokeModalOpen(true);
    }, []);

    const confirmRevoke = useCallback(() => {
        if (!isOwnerLead) {
            setLocalToast({ message: 'Authorization Denied: Only Team Leads can revoke access.', type: 'warning' });
            return;
        }

        console.log('[TODO] Revoking subscription:', selectedSubscription, 'Reason:', revocationReason);

        addNotification({
            type: 'governance',
            title: 'Critical: Access Revoked',
            message: `Lead ${user.name} revoked access for a subscriber of ${product.displayName}. Reason: ${revocationReason}`,
            navigateTo: '/'
        });

        setLocalToast({ message: `Access Revoked. Governance audit entry created.`, type: 'warning' });
        setTimeout(() => setLocalToast(null), 3000);

        setRevokeModalOpen(false);
        setSelectedSubscription(null);
        setRevocationReason('');
    }, [selectedSubscription, revocationReason, isOwnerLead, user.name, product.displayName, addNotification]);


    const handleUpdateProduct = useCallback((data: Partial<Product>) => {
        updateProduct(product.id, data);
        setIsManageModalOpen(false);

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

    const handlePromote = useCallback(async () => {
        const nextStage = getNextEnvironment(product.environment);

        if (nextStage === product.environment) {
            setLocalToast({ message: `Already at PROD. No further promotion possible.`, type: 'warning' });
            setTimeout(() => setLocalToast(null), 3000);
            return;
        }

        setIsPromotionWizardOpen(true);
    }, [product.environment]);

    const handleDeprecate = useCallback(() => {
        if (confirm(`Are you sure you want to deprecate ${product.displayName}? This will prevent new subscriptions.`)) {
            updateProduct(product.id, { visibility: 'private' });

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

    const navigateToAPI = useCallback((apiId: string) => {
        navigate(`/products/${product.id}/apis/${apiId}`);
    }, [navigate, product.id]);

    // === Derived State ===
    const isPromotionPending = useMemo(() => {
        return approvalRequests.some(r =>
            r.productId === product.id &&
            r.type === 'PROMOTION_REQUEST' &&
            r.status === 'PENDING'
        );
    }, [approvalRequests, product.id]);

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            <ProducerHeader
                product={product}
                isOutOfSync={isOutOfSync}
                isPromotionPending={isPromotionPending}
                onInitiateRedeploy={() => {
                    updateProduct(product.id, { environment: 'DEV' });
                    setIsOutOfSync(false);
                    setLocalToast({ message: 'Product returned to DEV for re-promotion.', type: 'success' });
                }}
                onManageClick={() => setIsManageModalOpen(true)}
                onPromoteClick={handlePromote}
                onDeprecateClick={handleDeprecate}
            />

            {/* GRP Policy Action Block */}
            {product.type === 'grp' && (
                <div className="mb-8 p-6 bg-purple-50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800 rounded-3xl flex justify-between items-center animate-fade-in shadow-premium">
                    <div>
                        <h3 className="text-sm font-black text-purple-900 dark:text-purple-300 uppercase tracking-widest">GRP Product Governance</h3>
                        <p className="text-xs text-purple-700 dark:text-purple-400 mt-1">
                            As a GRP Product owner, you can edit product-level policies but API contracts remain under producer control.
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setSelectedApi(null); // Indicates Product level
                            setIsPolicyStudioOpen(true);
                        }}
                        className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg"
                    >
                        Edit Product Policy
                    </button>
                </div>
            )}

            {/* Reconciliation & Data Integrity Alerts */}
            <div className="mb-8 space-y-4">
                {/* 1. Orphaned Product Check */}
                {!allTeams.find(t => t.id === product.ownerTeamId) && (
                    <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-6 rounded-r-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
                        <div>
                            <h3 className="text-lg font-black text-red-800 dark:text-red-400 flex items-center gap-2">
                                <span>⚠️</span> Orphaned Product Detected
                            </h3>
                            <p className="text-red-600 dark:text-red-300 text-sm mt-1">
                                This product is linked to a non-existent team ID (`{product.ownerTeamId}`). It cannot be managed effectively.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsManageModalOpen(true)}
                            className="px-5 py-2.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/60 font-bold text-xs uppercase tracking-widest transition-colors whitespace-nowrap"
                        >
                            Claim Ownership
                        </button>
                    </div>
                )}

                {/* 2. Critical Governance Violations */}
                {(product.qualityScore || 0) < 50 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-6 rounded-r-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
                        <div>
                            <h3 className="text-lg font-black text-amber-800 dark:text-amber-400 flex items-center gap-2">
                                <span>🛡️</span> Critical Governance Violations
                            </h3>
                            <p className="text-amber-700 dark:text-amber-300 text-sm mt-1">
                                This product's quality score is critical ({product.qualityScore}%). It may be blocked from promotion to PROD.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                if (product.apis.length > 0) {
                                    setSelectedApi(product.apis[0]);
                                    setIsEditorOpen(true); // Open Analyzer for first API
                                } else {
                                    setLocalToast({ message: 'No APIs to analyze.', type: 'warning' });
                                }
                            }}
                            className="px-5 py-2.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/60 font-bold text-xs uppercase tracking-widest transition-colors whitespace-nowrap"
                        >
                            Fix Violations
                        </button>
                    </div>
                )}

                {/* 3. Draft Mode Warning */}
                {product.state === "notPublished" && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-6 rounded-r-xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-fade-in">
                        <div>
                            <h3 className="text-lg font-black text-blue-800 dark:text-blue-400 flex items-center gap-2">
                                <span>📝</span> Draft Mode
                            </h3>
                            <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                                This product is not visible to consumers. Publish it to make it discoverable.
                            </p>
                        </div>
                        <button
                            onClick={() => handleUpdateProduct({ state: 'published' })}
                            className="px-5 py-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/60 font-bold text-xs uppercase tracking-widest transition-colors whitespace-nowrap"
                        >
                            Publish Now
                        </button>
                    </div>
                )}
            </div>

            {/* TODO: Restore ProducerMetrics when implemented */}
            {/* <ProducerMetrics
                qualityScore={score}
                subscriberCount={productSubscriptions.length}
                apiCount={product.apis.length}
                getScoreColor={(s: number) => getScoreTheme(s).split(' ')[0]}
            /> */}

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-100 dark:border-slate-800 mb-8">
                {[
                    { id: 'subscribers', label: 'Subscribers' },
                    { id: 'apis', label: 'API Inventory' },
                    { id: 'configuration', label: 'Configuration' },
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

            {/* Content: Subscribers */}
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

            {/* Content: APIs */}
            {activeTab === 'apis' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700 animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-black text-gray-900 dark:text-white">APIs in this Product</h2>
                        <button
                            onClick={() => setIsAddApiOpen(true)}
                            className="px-4 py-2 bg-blue-600 text-white text-xs font-bold uppercase rounded-lg hover:bg-blue-700 transition"
                        >
                            + Add API
                        </button>
                    </div>
                    <div className="space-y-3">
                        {product.apis.map((api) => (
                            <div
                                key={api.id}
                                onClick={() => navigateToAPI(api.id)}
                                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer transition"
                                role="button"
                                tabIndex={0}
                                onKeyPress={(e) => e.key === 'Enter' && navigateToAPI(api.id)}
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
                                        <div className={`text-sm font-bold ${getScoreTheme(api.qualityScore).split(' ')[0]}`}>
                                            {api.qualityScore}%
                                        </div>
                                    )}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedApi(api);
                                            setIsEditorOpen(true);
                                        }}
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${isInfraLocked
                                            ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                            : 'bg-blue-500 text-white hover:bg-blue-600'
                                            }`}
                                        data-testid="edit-contract-btn"
                                    >
                                        {isInfraLocked ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                            </svg>
                                        ) : (
                                            <span>✏️</span>
                                        )}
                                        {isInfraLocked ? 'View Contract' : 'Edit Contract'}
                                    </button>

                                    {/* Policy Visualizer Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedApi(api);
                                            setIsPolicyStudioOpen(true);
                                        }}
                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/40"
                                    >
                                        <span className="text-lg">👓</span>
                                        {product.type === 'grp' ? 'View API Policy' : 'Visual Policy'}
                                    </button>

                                    {/* DELETE ACTION - Corrected Logic */}
                                    {!isInfraLocked && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm(`Are you sure you want to remove ${api.displayName}? This action cannot be undone.`)) {
                                                    removeApiFromProduct(product.id, api.id)
                                                        .then(() => setLocalToast({ message: 'API removed successfully', type: 'success' }))
                                                        .catch((err: any) => setLocalToast({ message: 'Failed to remove API: ' + err.message, type: 'warning' }));
                                                }
                                            }}
                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                            title="Remove API"
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700 animate-fade-in">
                        <ApiInterfaceCatalog
                            product={product}
                            onManage={(api) => navigateToAPI(api.id)}
                            onViewContract={(api) => {
                                setSelectedApi(api);
                                setIsEditorOpen(true);
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Content: Configuration */}
            {activeTab === 'configuration' && (
                <ConfigurationTab product={product} />
            )}

            {/* Content: Audit Log */}
            {activeTab === 'audit' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg border border-gray-100 dark:border-slate-700 animate-fade-in mb-8">
                    <ProductAuditLog
                        productId={product.id}
                        onAction={(msg: string, type: 'success' | 'warning') => {
                            setLocalToast({ message: msg, type });
                            setTimeout(() => setLocalToast(null), 3000);
                        }}
                    />
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
                MODALS
            ============================================ */}

            <RevokeAccessModal
                isOpen={revokeModalOpen}
                onClose={() => setRevokeModalOpen(false)}
                onConfirm={confirmRevoke}
                revocationReason={revocationReason}
                setRevocationReason={setRevocationReason}
                apiCount={product.apis.length}
            />

            <AddApiModal
                productId={product.id}
                isOpen={isAddApiOpen}
                onClose={() => setIsAddApiOpen(false)}
            />

            {isManageModalOpen && (
                <ManageProductModal
                    product={product}
                    isOpen={isManageModalOpen}
                    onClose={() => setIsManageModalOpen(false)}
                    currentStage={(product.environment as any) || 'DEV'}
                    onPromote={handlePromote}
                    onUpdate={handleUpdateProduct}
                />
            )}

            {isEditorOpen && selectedApi && (
                <Suspense fallback={
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
                        <div className="text-white text-lg">Loading editor...</div>
                    </div>
                }>
                    <ContractEditorModal
                        product={product}
                        api={selectedApi}
                        isOpen={isEditorOpen}
                        readOnly={isInfraLocked || product.type === 'grp'}
                        fetchSpec={inventoryApi.getProductSpec}
                        onClose={() => {
                            setIsEditorOpen(false);
                            setSelectedApi(null);
                        }}
                        onCommit={async (message, description) => {
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
            )}

            {selectedApi && (
                <Suspense fallback={null}>
                    <PolicyStudioModal
                        isOpen={isPolicyStudioOpen}
                        onClose={() => {
                            setIsPolicyStudioOpen(false);
                            setSelectedApi(null);
                        }}
                        apiName={selectedApi?.displayName || 'Product Level'}
                        productName={product.displayName}
                        isReadOnly={product.type === 'grp' && !!selectedApi}
                        resourceId={selectedApi?.id || product.id}
                        level={selectedApi ? 'api' : 'product'}
                        initialXml={`
                            <policies>
                                <inbound>
                                    <base />
                                    <rate-limit calls="50" renewal-period="60" />
                                    <validate-jwt header-name="Authorization" failed-validation-error-message="Access token is missing or invalid.">
                                        <openid-config url="https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration" />
                                        <required-claims>
                                            <claim name="aud">
                                                <value>api://my-api</value>
                                            </claim>
                                        </required-claims>
                                    </validate-jwt>
                                </inbound>
                                <backend>
                                    <base />
                                </backend>
                                <outbound>
                                    <base />
                                </outbound>
                                <on-error>
                                    <base />
                                </on-error>
                            </policies>
                        `}
                    />
                </Suspense>
            )}

            <PromotionWizard
                isOpen={isPromotionWizardOpen}
                onClose={() => setIsPromotionWizardOpen(false)}
                product={product}
                onComplete={() => {
                    // Refresh or trigger state update
                    setIsOutOfSync(false);
                }}
            />
        </div>
    );
};
