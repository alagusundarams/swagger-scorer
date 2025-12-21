import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '../../../layouts/MainLayout/MainLayout.view';
import { useAuth } from '../../../hooks/useAuth';
import { useStore } from '../../../store/useStore';
import { getUserRoleForProduct, canAccessProduct } from '../../../utils/productRoleDetection';
import { ProductDetailProducer } from './ProductDetailProducer.view';
import { ProductDetailConsumer } from './ProductDetailConsumer.view';
import { RequestAccessModal } from '../components/RequestAccessModal';

/**
 * ProductDetailPage: Controller view that routes to role-specific layouts.
 * 
 * **Responsibility**:
 * - Data fetching (Store integration)
 * - Role detection
 * - Global UI state (Toasts, Request Modal)
 * - High-level routing (Producer vs Consumer)
 */
export const ProductDetailPage = () => {
    const { productId } = useParams<{ productId: string }>();

    // --- Store Integration ---
    const { getToken } = useAuth();
    const {
        user,
        products: allProducts,
        subscriptions: allSubscriptions,
        addSubscription
    } = useStore();

    // --- State ---
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [requestTeamId, setRequestTeamId] = useState(user?.defaultTeamId || '');
    const [isPending, setIsPending] = useState(false);
    const [businessReason, setBusinessReason] = useState('');
    const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: '', show: false });

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
        addSubscription(productId, requestTeamId, getToken);

        setToast({ message: 'Access request submitted for review.', show: true });
        setTimeout(() => setToast({ message: '', show: false }), 4000);
    };

    // --- Render Logic ---

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

    // 2. Producer View
    if (userRole === 'producer' && user) {
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
                onSubmit={handleRequestAccess}
                requestTeamId={requestTeamId}
                setRequestTeamId={setRequestTeamId}
                businessReason={businessReason}
                setBusinessReason={setBusinessReason}
                userTeams={user?.teams || []}
            />
        </MainLayout>
    );
};
