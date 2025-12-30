import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '../../layouts/MainLayout/MainLayout.view';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useInventoryStore } from '../../features/inventory/hooks/useInventoryStore';
import { useConsumerStore } from '../../features/consumer/store/consumerStore';
import { getUserRoleForProduct, canAccessProduct } from '../../features/inventory/utils/productRoleDetection';
import { ProductDetailProducer } from '../../features/inventory/views/ProductDetailProducer.view';
import { ProductDetailConsumer } from '../../features/inventory/views/ProductDetailConsumer.view';
import { RequestAccessModal } from '../../features/inventory/components/modals/RequestAccessModal';

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

    // --- Store Integration ---
    const { user } = useAuth();

    const {
        products: allProducts,
        isLoading: invLoading,
        error: invError
    } = useInventoryStore();

    const {
        subscriptions: allSubscriptions,
        requestAccess,
        isLoading: subLoading,
        error: subError
    } = useConsumerStore();

    const {
        appRegistrations,
        fetchAppRegistrations,
        isLoading: appLoading
    } = useConsumerStore();

    const isLoading = invLoading || subLoading || appLoading;
    const error = invError || subError;

    // --- State ---
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [requestTeamId, setRequestTeamId] = useState(user?.defaultTeamId || (user?.teams ? user.teams[0] : ''));
    const [selectedAppId, setSelectedAppId] = useState('');
    const [businessReason, setBusinessReason] = useState('');
    const [isPending, setIsPending] = useState(false);
    const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: '', show: false });

    // --- Effects ---
    useEffect(() => {
        if (user && user.teams.length > 0) {
            fetchAppRegistrations(user.teams[0]);
        }
    }, [user, fetchAppRegistrations]);

    // Update requestTeamId when user is loaded
    useEffect(() => {
        if (user && !requestTeamId) {
            setRequestTeamId(user.defaultTeamId || user.teams[0] || '');
        }
    }, [user, requestTeamId]);

    // --- Data Selectors ---
    const product = useMemo(() => allProducts.find(p => p.id === productId), [allProducts, productId]);

    const subscription = useMemo(() => {
        if (!user || !product) return null;
        return allSubscriptions.find(s => s.productId === product.id && user.teams.includes(s.subscriberTeamId));
    }, [user, product, allSubscriptions]);

    const hasPendingRequest = subscription?.state === 'pending' || isPending;

    // --- Role Detection ---
    const userRole = getUserRoleForProduct(product || {} as any, user);

    // --- Handlers ---
    const handleRequestAccess = () => {
        if (!user || !productId) return;

        setIsPending(true);
        setIsRequestModalOpen(false);

        // --- Store Update ---
        requestAccess(productId, requestTeamId);

        setToast({ message: 'Access request submitted for review.', show: true });
        setTimeout(() => setToast({ message: '', show: false }), 4000);
    };

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

    // 1. Loading / Access Enforcement
    if (!product || !canAccessProduct(product, user)) {
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
    if ((userRole === 'producer' || user?.role === 'admin') && user) {
        return (
            <MainLayout>
                <ProductDetailProducer product={product} user={user} />
            </MainLayout>
        );
    }

    // 3. Consumer View (Default for everyone else)
    return (
        <MainLayout>
            {/* Feedback Notification */}
            {toast.show && (
                <div className="fixed top-24 right-8 bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl z-50 animate-fade-in font-bold text-sm tracking-widest border border-white/10 backdrop-blur-md">
                    ✨ {toast.message}
                </div>
            )}

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
