import { useMemo, useState } from 'react';
import type { Product, User, Subscription } from '../../../types/entities';
import { useStore } from '../../../store/useStore';
import { ProductConsumerHeader } from '../components/ProductConsumerHeader';
import { ProductGettingStarted } from '../components/ProductGettingStarted';
import { ConfigurationTab } from '../components/ConfigurationTab';
import { ApiInterfaceCatalog } from '../components/ApiInterfaceCatalog';
import { ProductComplianceInfo } from '../components/ProductComplianceInfo';

/**
 * Props for the ProductDetailConsumer component
 * 
 * @interface ProductDetailConsumerProps
 * @property {Product} product - The product being viewed
 * @property {User} user - Current authenticated user
 * @property {Subscription | null} subscription - Active subscription if any
 * @property {boolean} hasPendingRequest - Whether a request is currently pending
 * @property {() => void} onRequestAccess - Handler to open the access request modal
 */
interface ProductDetailConsumerProps {
    product: Product;
    user: User;
    subscription: Subscription | null;
    hasPendingRequest: boolean;
    onRequestAccess: () => void;
}

/**
 * ProductDetailConsumer Component
 * 
 * **Purpose**: Consumer-specific view for discovering and using API products.
 * 
 * **Key Features**:
 * - Discoverability: Clear API operation browsing
 * - Onboarding: "Getting Started" section with CURL examples for subscribers
 * - Subscription Status: Visual indicators for access levels
 * - Role-Based Content: Dynamic sections based on subscription state
 * 
 * **Aesthetics**: Premium, dark-mode friendly, high-contrast badges, and sleek interactions.
 * 
 * @component
 */
export const ProductDetailConsumer = ({
    product,
    subscription,
    hasPendingRequest,
    onRequestAccess
}: ProductDetailConsumerProps) => {
    const { teams: allTeams } = useStore();
    const [activeTab, setActiveTab] = useState<'overview' | 'config'>('overview');

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
                <div className="animate-fade-in">
                    {/* Subscription Status Alerts */}
                    {subscription && subscription.state !== 'active' && (
                        <div className="mb-8">
                            {subscription.state === 'suspended' && (
                                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-6 rounded-r-xl shadow-sm flex items-center gap-4 animate-fade-in">
                                    <span className="text-2xl">🚫</span>
                                    <div>
                                        <h3 className="text-lg font-black text-red-800 dark:text-red-400">Access Suspended</h3>
                                        <p className="text-red-600 dark:text-red-300 text-sm mt-1">
                                            Your team's access to this API has been suspended by the owner. Please contact {allTeams.find(t => t.id === product.ownerTeamId)?.name || 'the product owner'} for details.
                                        </p>
                                    </div>
                                </div>
                            )}
                            {subscription.state === 'rejected' && (
                                <div className="bg-gray-100 dark:bg-slate-800 border-l-4 border-gray-500 p-6 rounded-r-xl shadow-sm flex items-center gap-4 animate-fade-in">
                                    <span className="text-2xl">❌</span>
                                    <div>
                                        <h3 className="text-lg font-black text-gray-800 dark:text-gray-400">Request Rejected</h3>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                                            Your previous access request was declined. You may submit a new request if business requirements have changed.
                                        </p>
                                    </div>
                                </div>
                            )}
                            {subscription.state === 'expired' && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-6 rounded-r-xl shadow-sm flex items-center gap-4 animate-fade-in">
                                    <span className="text-2xl">⏳</span>
                                    <div>
                                        <h3 className="text-lg font-black text-amber-800 dark:text-amber-400">Subscription Expired</h3>
                                        <p className="text-amber-700 dark:text-amber-300 text-sm mt-1">
                                            Your access keys have expired. Please renew your subscription to continue using this API.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Orphaned Product Warning (Consumer Side) */}
                    {!allTeams.find(t => t.id === product.ownerTeamId) && (
                        <div className="mb-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 p-4 rounded-xl flex items-center gap-3">
                            <span className="text-xl">⚠️</span>
                            <p className="text-amber-800 dark:text-amber-300 text-sm font-medium">
                                This product has no active owner team. Access requests may not be processed actively.
                            </p>
                        </div>
                    )}

                    {isSubscribed && subscription && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            {/* Rate Limit Status (Mocked/Derived) */}
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 animate-fade-in">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-2xl">⚡</span>
                                    <div>
                                        <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest">Rate Limit Usage</h3>
                                        <p className="text-xm text-gray-400 font-medium">Standard Tier</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-sm font-bold mb-2">
                                            <span className="text-gray-900 dark:text-white">Requests / Minute</span>
                                            <span className="text-emerald-600">45 / 1000</span>
                                        </div>
                                        <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 w-[4.5%]"></div>
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
                                        <span className="text-xs text-gray-400">Resets in 45s</span>
                                        <button className="text-xs text-blue-600 font-bold hover:underline">Request Quota Increase</button>
                                    </div>
                                </div>
                            </div>

                            <ProductGettingStarted
                                product={product}
                                subscription={subscription}
                            />
                        </div>
                    )}

                    <ApiInterfaceCatalog product={product} />

                    {isSubscribed && (
                        <ProductComplianceInfo activeTeam={activeTeam} />
                    )}
                </div>
            )}

            {activeTab === 'config' && (
                <ConfigurationTab product={product} isReadOnly={true} />
            )}
        </div>
    );
};
