import { useMemo, useState, lazy, Suspense } from 'react';
import { type Product, type API, type Subscription } from '../../../shared/types/domain';
import { type User } from '../../../core/types/commonTypes';
import { useAppData } from '../../../shared/context/AppDataContext';
import { ProductConsumerHeader } from '../components/product/ProductConsumerHeader';
import { ProductGettingStarted } from '../components/product/ProductGettingStarted';
import { ProductComplianceInfo } from '../components/product/ProductComplianceInfo';
import { ApiInterfaceCatalog } from '../components/api-details/ApiInterfaceCatalog';
import { ConfigurationTab } from '../components/api-details/ConfigurationTab';
import { inventoryApi } from '../../inventory/api/inventoryClient';

// Lazy load Contract Editor
const ContractEditorModal = lazy(() =>
    import('../../contract-editor').then(module => ({
        default: module.ContractEditorModal
    }))
);

/**
 * ProductDetailConsumer View (Feature)
 * 
 * ------------------------------------------------------------------
 * 📍 Purpose:
 * Renders the "Consumer" experience for a product (Read-only + Subscribe).
 * 
 * 🔄 Data Flow:
 * - [PROPS] `product`: Passed from Orchestrator (Page).
 * - [PROPS] `subscription`: Passed from Orchestrator (Page).
 * - [CONTEXT] `useAppData`: Read-only access to teams (MFE-compliant)
 * 
 * 🔒 Security:
 * - This view assumes the user is ALREADY authorized to see this product.
 * - It manages `readOnly` state for the Contract Editor.
 * ------------------------------------------------------------------
 */
export const ProductDetailConsumer = ({
    product,
    subscription,
    hasPendingRequest,
    onRequestAccess
}: ProductDetailConsumerProps) => {
    /**
     * MFE-Compliant Data Access:
     * Instead of importing useTeamsStore from the teams feature (which violates MFE boundaries),
     * we use the shared AppDataContext for read-only access to team data.
     * 
     * The teams data is centrally loaded at the app root level and automatically refreshed
     * when team:created, team:updated, or team:deleted events are emitted.
     */
    const { teams: allTeams } = useAppData();
    const [activeTab, setActiveTab] = useState<'overview' | 'config'>('overview');

    // Contract Editor State
    const [selectedApi, setSelectedApi] = useState<API | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    // === Memoized Helpers ===
    const isSubscribed = useMemo(() => subscription?.state === 'active', [subscription]);

    const activeTeam = useMemo(() =>
        allTeams.find(t => t.id === subscription?.subscriberTeamId),
        [allTeams, subscription]);

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            <ProductConsumerHeader
                product={product}
                isSubscribed={isSubscribed}
                activeTeam={activeTeam}
                hasPendingRequest={hasPendingRequest}
                onRequestAccess={onRequestAccess}
            />

            {/* Tab Navigation */}
            <div className="flex gap-8 border-b border-gray-100 dark:border-slate-700/50 mb-8">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'overview'
                        ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-300'
                        }`}
                >
                    Overview
                </button>
                <button
                    onClick={() => setActiveTab('config')}
                    className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'config'
                        ? 'border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-300'
                        }`}
                >
                    Configuration
                </button>
            </div>

            {activeTab === 'overview' && (
                <div>
                    {/* Subscription Status Alerts... */}
                    {subscription && subscription.state !== 'active' && (
                        <div className="mb-8">
                            {subscription.state === 'suspended' && (
                                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-6 rounded-r-xl shadow-sm flex items-center gap-4 animate-fade-in">
                                    <span className="text-2xl">🚫</span>
                                    <div>
                                        <h3 className="text-lg font-black text-red-800 dark:text-red-400">Access Suspended</h3>
                                        <p className="text-red-600 dark:text-red-300 text-sm mt-1">
                                            Your team's access to this API has been suspended by the owner.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {isSubscribed && subscription && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 animate-fade-in">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-2xl">⚡</span>
                                    <div>
                                        <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest" data-testid="rate-limit-status">Rate Limit Status</h3>
                                        <p className="text-xs text-gray-400 font-medium">Standard Tier</p>
                                    </div>
                                </div>
                                <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 w-[4.5%]"></div>
                                </div>
                            </div>

                            <ProductGettingStarted
                                product={product}
                                subscription={subscription}
                            />
                        </div>
                    )}

                    <ApiInterfaceCatalog
                        product={product}
                        onViewContract={(api) => {
                            setSelectedApi(api);
                            setIsEditorOpen(true);
                        }}
                    />

                    {isSubscribed && (
                        <ProductComplianceInfo activeTeam={activeTeam} />
                    )}
                </div>
            )}

            {activeTab === 'config' && (
                <ConfigurationTab product={product} />
            )}

            {/* Contract Viewer Modal (Read-only for consumers) */}
            {isEditorOpen && selectedApi && (
                <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 text-white">Loading Viewer...</div>}>
                    <ContractEditorModal
                        product={product}
                        api={selectedApi}
                        isOpen={isEditorOpen}
                        readOnly={true}
                        fetchSpec={inventoryApi.getProductSpec}
                        onClose={() => {
                            setIsEditorOpen(false);
                            setSelectedApi(null);
                        }}
                    />
                </Suspense>
            )}
        </div>
    );
};

interface ProductDetailConsumerProps {
    product: Product;
    user: User;
    subscription: Subscription | null;
    hasPendingRequest: boolean;
    onRequestAccess: () => void;
}
