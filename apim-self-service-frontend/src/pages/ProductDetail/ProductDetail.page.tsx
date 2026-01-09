import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { MainLayout } from '../../layouts/MainLayout/MainLayout.view';
import { useAuth } from '../../features/auth';
import { useProductQuery, useNamedValuesQuery } from '../../features/inventory/api/inventoryQueries';
import { getUserRoleForProduct, canAccessProduct, ProductDetailProducer, ProductDetailConsumer, RequestAccessModal } from '../../features/inventory';
import { useSubscriptionsQuery } from '../../features/consumer';

/**
 * ProductDetailPage Controller
 * 
 * ------------------------------------------------------------------
 * 📍 Purpose:
 * This page serves as the Route Entry Point for `/products/:productId`.
 * It acts as an "Orchestrator" that decides which Feature View to load.
 * 
 * 🔄 Data Flow:
 * 1. URL Params -> extracts `productId`
 * 2. `useInventoryStore` -> fetches Product Data
 * 3. `useConsumerStore` -> fetches Subscription Data (for current user)
 * 4. `productRoleDetection` -> calculates User Role (Producer vs Consumer)
 * 5. Props -> Passes derived data down to `ProductDetailProducer` or `ProductDetailConsumer`
 * 
 * 🧩 MFE Boundaries:
 * - This Page OWNS the route.
 * - This Page IMPORTS from `inventory`, `consumer`, and `auth` features (Standard MFE Page Pattern).
 * - This Page WRAPS the content in `MainLayout`.
 * ------------------------------------------------------------------
 */
export const ProductDetailPage = () => {
    const { productId } = useParams<{ productId: string }>();
    const [searchParams] = useSearchParams();
    const environmentParam = searchParams.get('environment');

    // --- Store Integration ---
    const { user } = useAuth();

    // Replaced useInventoryStore with TanStack Query
    const {
        data: product,
        isLoading: productLoading,
        error: productError
    } = useProductQuery(productId || '', environmentParam || undefined);

    // Fetch Named Values (Configuration)
    useNamedValuesQuery(productId || '');

    const {
        data: allSubscriptions = [],
        isLoading: subLoading,
        error: subError
    } = useSubscriptionsQuery(productId);

    const isLoading = productLoading || subLoading;
    const error = (productError as Error)?.message || (subError as Error)?.message;

    // --- State ---
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [requestTeamId, setRequestTeamId] = useState(user?.defaultTeamId || (user?.teams ? user.teams[0] : ''));

    // --- Effects ---
    // Update requestTeamId when user is loaded
    useEffect(() => {
        if (user && !requestTeamId) {
            setRequestTeamId(user.defaultTeamId || user.teams[0] || '');
        }
    }, [user, requestTeamId]);

    // FETCHING EFFECTS REMOVED: Managed by TanStack Query now.

    // --- Data Selectors ---
    // Product is now derived directly from the query hook above

    const subscription = useMemo(() => {
        if (!user || !product) return null;
        return allSubscriptions.find(s => s.productId === product.id && user.teams.includes(s.subscriberTeamId));
    }, [user, product, allSubscriptions]);

    const hasPendingRequest = subscription?.state === 'pending';

    // --- Role Detection ---
    // Prioritize backend accessLevel if available, otherwise fallback to local logic
    const effectiveRole = useMemo(() => {
        if (product?.accessLevel) {
            return product.accessLevel === 'WRITE' ? 'producer' : 'consumer';
        }
        return getUserRoleForProduct(product || {} as any, user);
    }, [product, user]);

    // --- Handlers ---

    // --- Render Logic ---

    // 0. Loading State
    if (isLoading) {
        return (
            <MainLayout>
                <div className="max-w-7xl mx-auto px-6 py-12 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-8"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-12"></div>
                    <div className="grid grid-cols-3 gap-6">
                        <div className="h-40 bg-gray-200 rounded-2xl col-span-2"></div>
                        <div className="h-40 bg-gray-200 rounded-2xl"></div>
                    </div>
                </div>
            </MainLayout>
        );
    }

    // 0.5. Error State
    if (error) {
        return (
            <MainLayout>
                <div className="max-w-7xl mx-auto px-6 py-20 text-center">
                    <h1 className="text-2xl font-bold text-red-500 mb-4">Connection Failed</h1>
                    <p className="text-gray-500 mb-8">{error}</p>
                    <button onClick={() => window.location.reload()} className="px-6 py-2 bg-blue-600 text-white rounded-lg">Retry</button>
                </div>
            </MainLayout>
        );
    }

    // 1. Access Denied (Triple-Gate: Gate 2)
    if (product?.accessLevel === 'NONE') {
        return (
            <MainLayout>
                <div className="max-w-7xl mx-auto px-6 py-24 text-center animate-fade-in">
                    <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center text-4xl mx-auto mb-8 shadow-xl">
                        🔒
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white mb-4 tracking-tight uppercase">Access Restricted</h1>
                    <p className="text-gray-500 dark:text-slate-400 mb-10 max-w-lg mx-auto font-medium text-lg">
                        This environment ({environmentParam || 'STAGE/PROD'}) requires explicit AD Group membership.
                        Please contact the {product.ownerTeamName || 'Product Owner'} for authorization.
                    </p>
                    <div className="flex flex-col items-center gap-6">
                        <Link to="/" className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all">
                            Back to Dashboard
                        </Link>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Context: {user?.id} | Region: {product.region || 'Default'}
                        </p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    // 2. Not Deployed (Triple-Gate: Gate 3)
    if (product && !product.isDeployed && environmentParam && environmentParam !== 'DEV') {
        return (
            <MainLayout>
                <div className="max-w-7xl mx-auto px-6 py-20 text-center animate-fade-in">
                    <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-lg">
                        🚧
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">Environment Not Active</h1>
                    <p className="text-gray-500 dark:text-slate-400 mb-8 font-medium">
                        Product <span className="text-amber-600 font-bold">{product.displayName}</span> has not been promoted to <span className="font-bold border-b-2 border-amber-500">{environmentParam}</span> yet.
                    </p>
                    <Link to={`/products/${productId}?environment=DEV`} className="text-blue-600 hover:underline font-black uppercase tracking-widest text-[10px]">
                        Switch to DEV Draft
                    </Link>
                </div>
            </MainLayout>
        );
    }

    // 1. Loading / Access Enforcement
    if (!product || (product.visibility !== 'public' && !canAccessProduct(product, user))) {
        return (
            <MainLayout>
                <div className="max-w-7xl mx-auto px-6 py-20 text-center">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">Product not found</h1>
                    <p className="text-gray-500 dark:text-slate-500 mb-8 font-medium">This product may be private or you may not have authorization to view it.</p>
                    <Link to="/" className="text-blue-600 hover:underline font-black uppercase tracking-widest text-xs">Back to Dashboard</Link>
                </div>
            </MainLayout>
        );
    }

    // 2. Producer View (or Admin)
    if ((effectiveRole === 'producer' || user?.role === 'admin') && user) {
        return (
            <MainLayout>
                <ProductDetailProducer product={product} user={user} />
            </MainLayout>
        );
    }

    // 3. Consumer View (Default for everyone else)
    return (
        <MainLayout>

            <ProductDetailConsumer
                product={product}
                user={user!}
                subscription={subscription || null}
                hasPendingRequest={hasPendingRequest}
                onRequestAccess={() => setIsRequestModalOpen(true)}
            />

            <RequestAccessModal
                isOpen={isRequestModalOpen}
                onClose={() => setIsRequestModalOpen(false)}
                product={product}
            />
        </MainLayout>
    );
};
