import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MainLayout } from '../../../layouts/MainLayout/MainLayout.view';
import { useAuth } from '../../../features/auth/hooks/useAuth';
import { useStore } from '../../../store/useStore';

/**
 * ProductDetailPage: Comprehensive view of an API Product.
 * 
 * FEATURES:
 * - Product Metadata & Scoring
 * - API Inventory within the product
 * - Subscription Management (Request Access Flow)
 * - store-isolated data retrieval
 */

export const ProductDetailPage = () => {
    const { productId } = useParams<{ productId: string }>();
    const navigate = useNavigate();

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
    const [selectedEnv, setSelectedEnv] = useState<'DEV' | 'QA' | 'PROD'>('PROD'); // Default to PROD
    const [isPending, setIsPending] = useState(false);
    const [businessReason, setBusinessReason] = useState('');
    const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: '', show: false });

    // --- Data Selectors ---
    const product = useMemo(() => allProducts.find(p => p.id === productId), [allProducts, productId]);

    const isOwner = useMemo(() => {
        if (!user || !product) return false;
        return user.teams.includes(product.ownerTeamId);
    }, [user, product]);

    const subscription = useMemo(() => {
        if (!user || !product) return null;
        return allSubscriptions.find(s => s.productId === product.id && user.teams.includes(s.subscriberTeamId));
    }, [user, product, allSubscriptions]);

    const isSubscribed = subscription?.state === 'active';
    const hasPendingRequest = subscription?.state === 'pending' || isPending;

    if (!product) {
        return (
            <MainLayout>
                <div className="max-w-7xl mx-auto px-6 py-20 text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h1>
                    <Link to="/" className="text-blue-600 hover:underline">Back to Dashboard</Link>
                </div>
            </MainLayout>
        );
    }

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

    return (
        <MainLayout>
            {/* Feedback Notification */}
            {toast.show && (
                <div className="fixed top-24 right-8 bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl z-50 animate-fade-in font-bold text-sm tracking-widest border border-white/10 backdrop-blur-md">
                    ✨ {toast.message}
                </div>
            )}

            <div className="max-w-7xl mx-auto px-6 w-full py-12">
                {/* Product Header Card */}
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-12 shadow-premium border border-gray-100 dark:border-slate-700/30 mb-12">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-3xl shadow-xl shadow-blue-500/20">
                                📦
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">{product.displayName}</h1>
                                    <span className="bg-gray-50 dark:bg-slate-900 px-3 py-1 rounded-lg text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 dark:border-slate-800">
                                        V{product.version}
                                    </span>
                                </div>
                                <p className="text-gray-500 dark:text-slate-400 text-lg max-w-2xl font-medium">{product.description}</p>
                            </div>
                        </div>

                        {/* Contextual Action: Access Management */}
                        <div className="shrink-0 w-full md:w-auto">
                            {isOwner ? (
                                <button className="w-full md:w-auto bg-slate-900 dark:bg-slate-700 text-white font-black text-[10px] uppercase tracking-[0.2em] py-5 px-10 rounded-2xl shadow-xl transition-all hover:scale-[1.02]">
                                    Product Ownership
                                </button>
                            ) : isSubscribed ? (
                                <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-bold px-8 py-5 rounded-2xl border border-green-100 dark:border-green-800/50">
                                    <span className="text-xl">✅</span> Active Subscription
                                </div>
                            ) : (
                                <button
                                    disabled={hasPendingRequest}
                                    onClick={() => setIsRequestModalOpen(true)}
                                    className={`w-full md:w-auto font-black text-[10px] uppercase tracking-[0.2em] py-5 px-10 rounded-2xl transition-all shadow-xl hover:scale-[1.02] ${hasPendingRequest
                                        ? 'bg-amber-50 text-amber-600 cursor-not-allowed border border-amber-100'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                                        }`}
                                >
                                    {hasPendingRequest ? '⌛ Request Pending Review' : '🚀 Request Integration Access'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Quality Insights Ribbon */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12 pt-12 border-t border-gray-50 dark:border-slate-700/30">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Quality Score</p>
                            <div className="flex items-center gap-2">
                                <span className={`text-2xl font-black ${product.qualityScore && product.qualityScore > 80 ? 'text-green-500' : 'text-amber-500'}`}>
                                    {product.qualityScore}%
                                </span>
                                <div className="w-24 h-2 bg-gray-100 dark:bg-slate-900 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${product.qualityScore}%` }}></div>
                                </div>
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Responsibility</p>
                            <span className="text-lg font-bold text-gray-700 dark:text-white">Platform Team</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Scale</p>
                            <span className="text-lg font-bold text-gray-700 dark:text-white">{product.subscriberCount || 0} Consumers</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Lifecycle</p>
                            <span className="text-lg font-bold text-green-500 uppercase">● {product.state}</span>
                        </div>
                    </div>
                </div>

                {/* Subscription & Connection Details (Visible to Subscribers) */}
                {isSubscribed && subscription && (
                    <div className="bg-slate-900 text-white rounded-[2.5rem] p-10 mb-12 shadow-2xl border border-slate-700 relative overflow-hidden group">
                        {/* Decorative background */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>

                        {/* Strict Deployment Pipeline (Chain of Enforcement) */}
                        <div className="mb-10 px-4">
                            <div className="flex items-center justify-between relative">
                                {/* Connection Line */}
                                <div className="absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-blue-900 via-blue-800 to-emerald-900/50 -translate-y-1/2 z-0 rounded-full"></div>

                                {(['DEV', 'QA', 'PROD'] as const).map((env, index) => {
                                    const isActive = selectedEnv === env;
                                    // const isCompleted = array.indexOf(selectedEnv) >= index; // Logic reserved for future progress visualization

                                    // Region Mock Logic
                                    const region = env === 'DEV' ? 'East US 2' : env === 'QA' ? 'Central US' : 'Traffic Manager (Global)';

                                    return (
                                        <button
                                            key={env}
                                            onClick={() => setSelectedEnv(env)}
                                            className={`relative z-10 flex flex-col items-center group transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100 hover:scale-105 opacity-60 hover:opacity-100'}`}
                                        >
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black shadow-xl border-4 transition-all duration-300 ${isActive
                                                ? 'bg-blue-500 border-white text-white shadow-blue-500/50'
                                                : 'bg-slate-900 border-slate-700 text-slate-500 group-hover:border-blue-500/50'
                                                }`}>
                                                {index + 1}
                                            </div>
                                            <div className={`mt-4 text-center transition-all ${isActive ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-80'}`}>
                                                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isActive ? 'text-white' : 'text-slate-500'}`}>{env} Environment</p>
                                                <p className="text-[9px] font-mono text-slate-400">{region}</p>
                                            </div>

                                            {/* Active Indicator Triangle */}
                                            {isActive && (
                                                <div className="absolute -bottom-16 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-white/10"></div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-12 relative z-10 bg-black/20 p-8 rounded-3xl border border-white/5 backdrop-blur-sm">
                            {/* Connection Info */}
                            <div className="flex-1">
                                <h3 className="text-xl font-black uppercase tracking-widest mb-8 flex items-center gap-3">
                                    <span className="bg-blue-600 p-2 rounded-lg">🔌</span>
                                    Connection Context
                                </h3>

                                <div className="space-y-6">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Primary Gateway URL</p>
                                        <code className="block bg-black/30 p-4 rounded-xl font-mono text-sm text-blue-400 border border-white/5 transition-all duration-300">
                                            https://api.{selectedEnv === 'PROD' ? 'ionosphere' : selectedEnv.toLowerCase() + '.ionosphere'}.io/gateway/{product.name}/v{product.version}
                                        </code>
                                    </div>
                                    <div className="flex gap-8">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Region</p>
                                            <span className={`font-bold transition-all ${selectedEnv === 'PROD' ? 'text-white' : 'text-slate-300'}`}>
                                                {selectedEnv === 'PROD' ? 'Global (Traffic Manager)' : selectedEnv === 'QA' ? 'Central US' : 'East US 2'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Expiration</p>
                                            <span className="font-bold text-amber-500">
                                                {subscription.expirationDate ? new Date(subscription.expirationDate).toLocaleDateString() : 'Never'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="w-px bg-white/10 hidden md:block"></div>

                            {/* Credentials - Simulated per Environment */}
                            <div className="flex-1">
                                <h3 className="text-xl font-black uppercase tracking-widest mb-8 flex items-center gap-3">
                                    <span className="bg-amber-500 p-2 rounded-lg text-black">🔑</span>
                                    Secure Credentials
                                </h3>

                                <div className="space-y-6">
                                    <div className="animate-fade-in" key={selectedEnv}>
                                        <div className="flex justify-between items-center mb-2">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Primary Subscription Key</p>
                                            <button className="text-[10px] font-bold text-blue-400 hover:text-white transition-colors uppercase">Regenerate</button>
                                        </div>
                                        <div className="flex gap-2">
                                            <code className="flex-1 bg-black/30 p-4 rounded-xl font-mono text-sm text-emerald-400 border border-white/5 tracking-wider transition-all">
                                                {/* Simulate discrete keys for display purposes */}
                                                {selectedEnv === 'PROD' ? subscription.primaryKey.value : `${selectedEnv}_${subscription.primaryKey.value.substring(0, 10)}...`}
                                            </code>
                                            <button
                                                onClick={() => {
                                                    const keyVal = selectedEnv === 'PROD' ? subscription.primaryKey.value : `${selectedEnv}_${subscription.primaryKey.value}`;
                                                    navigator.clipboard.writeText(keyVal);
                                                    setToast({ message: `${selectedEnv} Key Copied`, show: true });
                                                    setTimeout(() => setToast({ message: '', show: false }), 2000);
                                                }}
                                                className="bg-white/5 hover:bg-white/10 p-4 rounded-xl border border-white/5 text-white transition-all"
                                                title="Copy Key"
                                            >
                                                📋
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Secondary Subscription Key</p>
                                        <code className="block bg-black/30 p-4 rounded-xl font-mono text-sm text-slate-500 border border-white/5 tracking-wider">
                                            ••••••••••••••••••••••••••••••••
                                        </code>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <div className="mb-12">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-widest">Interface Inventory</h2>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {product.apis.map((api) => (
                            <div
                                key={api.id}
                                onClick={() => navigate(`/products/${product.id}/apis/${api.id}`)}
                                className="group bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700/30 hover:shadow-premium hover:border-blue-100 dark:hover:border-blue-900/30 transition-all flex justify-between items-center cursor-pointer"
                            >
                                <div className="flex items-center gap-8">
                                    <div className="w-14 h-14 bg-gray-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                        🔌
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">{api.displayName}</h3>
                                        <p className="text-sm text-gray-400 font-medium">Route Base: <code className="bg-gray-100 dark:bg-slate-900 px-2 py-0.5 rounded text-blue-600 font-mono italic">{api.path}</code></p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-12 text-right">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Operations</p>
                                        <span className="text-sm font-bold text-gray-500">{api.operations.length} Endpoints</span>
                                    </div>
                                    <div className="w-10 h-10 rounded-full border border-gray-100 dark:border-slate-700 flex items-center justify-center text-gray-300 group-hover:text-blue-600 group-hover:border-blue-100 transition-all">
                                        →
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Access Request Modal - Premium Overlay */}
            {isRequestModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-white/10 p-10 transform scale-110 overflow-hidden relative">
                        {/* Decorative background element */}
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl"></div>

                        <div className="relative">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-4">Request Access</h2>
                            <p className="text-gray-500 dark:text-slate-400 mb- aggregation-8 font-medium">To proceed with integration, please specify the consuming team and a business justification for architectural review.</p>

                            <div className="space-y-8 mt-10">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block ml-1">Assigned Consumer Team</label>
                                    <select
                                        className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl text-sm font-bold outline-none ring-offset-2 focus:ring-2 focus:ring-blue-600/20 transition-all"
                                        value={requestTeamId}
                                        onChange={(e) => setRequestTeamId(e.target.value)}
                                    >
                                        {user?.teams.map(teamId => (
                                            <option key={teamId} value={teamId}>{teamId.replace('team-', '').toUpperCase()} TEAM</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block ml-1">Business Justification</label>
                                    <textarea
                                        placeholder="Explain how this API will be utilized by your team..."
                                        className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 p-5 rounded-2xl text-sm font-medium h-32 outline-none ring-offset-2 focus:ring-2 focus:ring-blue-600/20 transition-all"
                                        value={businessReason}
                                        onChange={(e) => setBusinessReason(e.target.value)}
                                    />
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        onClick={() => setIsRequestModalOpen(false)}
                                        className="flex-1 px-8 py-5 border border-gray-100 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-900 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleRequestAccess}
                                        className="flex-[2] px-8 py-5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all"
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
