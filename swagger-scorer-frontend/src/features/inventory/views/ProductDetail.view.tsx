import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '../../../layouts/MainLayout/MainLayout.view';
import { useAuth } from '../../../features/auth/hooks/useAuth';
import { useStore } from '../../../store/useStore';
import { getUserRoleForProduct, canAccessProduct } from '../../../utils/productRoleDetection';
import { ProductDetailProducer } from './ProductDetailProducer.view';
import { ProductDetailConsumer } from './ProductDetailConsumer.view';

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

            {/* Access Request Modal - Shared between views if needed, currently for Consumer */}
            {isRequestModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-white/10 p-10 transform scale-110 overflow-hidden relative">
                        {/* Decorative background element */}
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-600/10 rounded-full blur-3xl"></div>

                        <div className="relative">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-4">Request Access</h2>
                            <p className="text-gray-500 dark:text-slate-400 mb-8 font-medium">To proceed with integration, please specify the consuming team and a business justification for architectural review.</p>

                            <div className="space-y-8 mt-10">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block ml-1">Assigned Consumer Team</label>
                                    <select
                                        className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl text-sm font-bold outline-none ring-offset-2 focus:ring-2 focus:ring-emerald-600/20 transition-all cursor-pointer"
                                        value={requestTeamId}
                                        onChange={(e) => setRequestTeamId(e.target.value)}
                                    >
                                        <option value="" disabled>Select a team</option>
                                        {user?.teams.map(teamId => (
                                            <option key={teamId} value={teamId}>{teamId.replace('team-', '').toUpperCase()} TEAM</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block ml-1">Business Justification</label>
                                    <textarea
                                        placeholder="Explain how this API will be utilized by your team..."
                                        className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl text-sm font-medium h-32 outline-none ring-offset-2 focus:ring-2 focus:ring-emerald-600/20 transition-all"
                                        value={businessReason}
                                        onChange={(e) => setBusinessReason(e.target.value)}
                                    />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => setIsRequestModalOpen(false)}
                                        className="flex-1 px-8 py-5 border border-gray-100 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-900 transition-all font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleRequestAccess}
                                        className="flex-[2] px-8 py-5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all font-bold"
                                    >
                                        Submit Request
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
};
