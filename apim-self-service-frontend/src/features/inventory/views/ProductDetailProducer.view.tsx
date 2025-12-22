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
import { ConfigurationTab } from '../components/ConfigurationTab'; // ADDED

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
    const [isPolicyStudioOpen, setIsPolicyStudioOpen] = useState(false);
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
    const isInfraLocked = product.management_mode === 'TERRAFORM_MANAGED' || product.management_mode === 'HYBRID';

    // === Memoized Computations ===
    const productSubscriptions = useMemo<Subscription[]>(() =>
        allSubscriptions.filter(sub =>
            sub.productId === product.id && sub.state === 'active'
        ),
        [allSubscriptions, product.id]
    );

    const getScoreColor = useCallback((score: number): string => {
        if (score >= 90) return 'text-green-500';
        if (score >= 70) return 'text-amber-500';
        return 'text-red-500';
    }, []);

    const score = product.qualityScore || 0;

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
                    { id: 'configuration', label: 'Configuration' }, // ADDED
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
                                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${isInfraLocked
                                            ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                            : 'bg-blue-500 text-white hover:bg-blue-600'
                                            }`}
                                    >
                                        {isInfraLocked ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                            </svg>
                                        ) : (
                                            <span>✏️</span>
                                        )}
                                        {isInfraLocked ? 'View Contract' : 'Edit & Analyze'}
                                    </button>

                                    {/* NEW: Policy Visualizer Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedApi(api);
                                            setIsPolicyStudioOpen(true);
                                        }}
                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/40"
                                    >
                                        <span className="text-lg">👓</span>
                                        Visual Policy
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'configuration' && (
                <ConfigurationTab product={product} />
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
                            readOnly={isInfraLocked}
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

            {/* Policy Studio Modal (Legacy Lens) */}
            {
                selectedApi && (
                    <Suspense fallback={null}>
                        <PolicyStudioModal
                            isOpen={isPolicyStudioOpen}
                            onClose={() => {
                                setIsPolicyStudioOpen(false);
                                setSelectedApi(null);
                            }}
                            apiName={selectedApi.displayName}
                            // [DEMO MAGICAL MOMENT]: We inject a known Legacy API Policy XML to show off the Parser.
                            // In a real app, this comes from selectedApi.apim_raw_data.policyXml
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
        <set-header name="X-Legacy-Header" exists-action="override">
            <value>LegacyValue</value>
        </set-header>
        <choose>
            <when condition="@(context.Request.Headers.GetValueOrDefault("Environment") == "Beta")">
                <set-backend-service base-url="https://beta-api.contoso.com" />
            </when>
        </choose>
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
                )
            }
        </div >
    );
};
