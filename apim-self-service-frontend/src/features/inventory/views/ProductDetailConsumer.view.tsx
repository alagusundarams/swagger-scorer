import { useMemo } from 'react';
import type { Product, User, Subscription } from '../../../types/entities';
import { useStore } from '../../../store/useStore';
import { ProductConsumerHeader } from '../components/ProductConsumerHeader';
import { ProductGettingStarted } from '../components/ProductGettingStarted';
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

            {isSubscribed && subscription && (
                <ProductGettingStarted
                    product={product}
                    subscription={subscription}
                />
            )}

            <ApiInterfaceCatalog product={product} />

            {isSubscribed && (
                <ProductComplianceInfo activeTeam={activeTeam} />
            )}
        </div>
    );
};
