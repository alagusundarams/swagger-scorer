/**
 * Product Role Detection Utility
 * 
 * **Purpose**: Determine user's role and permissions for a specific product.
 * 
 * **Role Types**:
 * - **Producer**: Product owner, can manage product and subscribers
 * - **Consumer**: Subscribed to product, can use APIs
 * - **Sales**: Sales team member, read-only discovery access
 * 
 * **Use Cases**:
 * 1. Conditional UI rendering (show Producer vs Consumer views)
 * 2. Permission checks before actions (manage product, revoke access)
 * 3. Visibility enforcement (who can see private products)
 * 
 * **Performance**: All functions are pure and side-effect free
 * 
 * @module productRoleDetection
 */

import type { Product, User, Subscription } from '../types/entities';

/**
 * User's role in relation to a specific product
 * @typedef {'producer' | 'consumer' | 'sales'} ProductRole
 */
export type ProductRole = 'producer' | 'consumer' | 'sales';

/**
 * Get user's role for a specific product
 * 
 * **Role Hierarchy** (checked in order):
 * 1. **Producer**: User's team owns the product
 * 2. **Consumer**: User has active subscription OR product is public
 * 3. **Sales**: User is in sales team (read-only discovery)
 * 
 * **Decision Logic**:
 * ```
 * user.teams includes product.ownerTeamId? → Producer
 * ↓
 * user in team-sales? → Sales
 * ↓
 * Default → Consumer (discovery/subscription)
 * ```
 * 
 * **Note**: Actual subscription status is checked separately in `canAccessProduct()`
 * 
 * @param {Product} product - The product to check
 * @param {User | null} user - Current user (null if not authenticated)
 * @returns {ProductRole} User's role for this product
 * 
 * @example
 * ```typescript
 * const role = getUserRoleForProduct(product, currentUser);
 * 
 * if (role === 'producer') {
 *   // Show management controls
 *   return <ProductDetailProducer />;
 * } else if (role === 'consumer') {
 *   // Show subscription/usage view
 *   return <ProductDetailConsumer />;
 * }
 * ```
 */
export function getUserRoleForProduct(
    product: Product,
    user: User | null
): ProductRole {
    if (!user) {
        // Unauthenticated users are always consumers (discovery only)
        return 'consumer';
    }

    // Producer: User's team owns this product
    // Producers have full management rights
    if (user.teams.includes(product.ownerTeamId)) {
        return 'producer';
    }

    // Sales: User is in sales team
    // Sales team has read-only discovery access to all products
    // Note: Adjust team ID based on actual sales team identifier
    // TODO [CONFIG]: Load sales team ID from environment/config
    if (user.teams.includes('team-sales')) {
        return 'sales';
    }

    // Consumer: Default role
    // Can discover products and request/use subscriptions
    return 'consumer';
}

/**
 * Check if user can manage a product
 * 
 * **Management Permissions**:
 * - Edit product metadata
 * - Manage subscribers (revoke access, modify permissions)
 * - Deploy to environments
 * - Deprecate product
 * 
 * **Logic**: Only producers (product owners) can manage
 * 
 * @param {Product} product - The product to check
 * @param {User | null} user - Current user
 * @returns {boolean} true if user can manage this product
 * 
 * @example
 * ```typescript
 * if (canManageProduct(product, user)) {
 *   <button onClick={handleRevoke}>Revoke Access</button>
 * }
 * ```
 */
export function canManageProduct(
    product: Product,
    user: User | null
): boolean {
    if (!user) {
        return false;
    }

    // Only producers can manage
    return getUserRoleForProduct(product, user) === 'producer';
}

/**
 * Check if user can access a product
 * 
 * **Access Rules** (based on product visibility):
 * 
 * 1. **Public products**: Everyone can discover/view
 * 2. **Private products**: Only authorized teams
 * 3. **Owner-only products**: Only product owner team
 * 
 * **Subscription Note**: This checks visibility only.
 * Actual API access requires an active subscription (checked separately).
 * 
 * **Visibility Flow**:
 * ```
 * Public? → ✅ Allow (discovery)
 *    ↓
 * Owner? → ✅ Allow (full access)
 *    ↓
 * In authorizedTeams? → ✅ Allow
 *    ↓
 * Owner-only + not owner? → ❌ Deny
 *    ↓
 * Private + not authorized? → ❌ Deny
 * ```
 * 
 * @param {Product} product - The product to check
 * @param {User | null} user - Current user
 * @param {Subscription[]} subscriptions - All user's subscriptions (for filtering)
 * @returns {boolean} true if user can view/access this product
 * 
 * @example
 * ```typescript
 * // In product list filtering
 * const visibleProducts = allProducts.filter(product => 
 *   canAccessProduct(product, currentUser, subscriptions)
 * );
 * 
 * // In route guard
 * if (!canAccessProduct(product, user, subscriptions)) {
 *   return <Navigate to="/unauthorized" />;
 * }
 * ```
 */
export function canAccessProduct(
    product: Product,
    user: User | null,
    subscriptions: Subscription[]
): boolean {
    // Public products are visible to everyone
    if (product.visibility === 'public') {
        return true;
    }

    // Unauthenticated users can only access public products
    if (!user) {
        return false;
    }

    // Product owner has full access
    if (user.teams.includes(product.ownerTeamId)) {
        return true;
    }

    // Owner-only products: Only owner can access
    if (product.visibility === 'owner-only') {
        return false;
    }

    // Private products: Check authorized teams
    if (product.visibility === 'private') {
        const authorizedTeams = product.authorizedTeams || [];

        // User must be in an authorized team OR have active subscription
        const isInAuthorizedTeam = user.teams.some(teamId =>
            authorizedTeams.includes(teamId)
        );

        const hasActiveSubscription = subscriptions.some(sub =>
            sub.productId === product.id &&
            user.teams.includes(sub.subscriberTeamId) &&
            sub.state === 'active'
        );

        return isInAuthorizedTeam || hasActiveSubscription;
    }

    // Default: allow access (fallback for undefined visibility)
    return true;
}

/**
 * Filter products based on user's access rights
 * 
 * **Helper Function**: Convenience wrapper around `canAccessProduct()`
 * 
 * **Use Case**: Filter product lists in dashboards, marketplaces
 * 
 * @param {Product[]} products - All products
 * @param {User | null} user - Current user
 * @param {Subscription[]} subscriptions - User's subscriptions
 * @returns {Product[]} Filtered list of accessible products
 * 
 * @example
 * ```typescript
 * // In Dashboard
 * const accessibleProducts = filterAccessibleProducts(
 *   allProducts,
 *   currentUser,
 *   userSubscriptions
 * );
 * ```
 */
export function filterAccessibleProducts(
    products: Product[],
    user: User | null,
    subscriptions: Subscription[]
): Product[] {
    return products.filter(product =>
        canAccessProduct(product, user, subscriptions)
    );
}

