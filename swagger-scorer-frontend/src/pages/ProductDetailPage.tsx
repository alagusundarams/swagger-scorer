import { useParams, useNavigate, Link } from 'react-router-dom';
import { mockProducts, mockSubscriptions, mockTeams, mockUser } from '../mocks';

export const ProductDetailPage = () => {
    const { productId } = useParams<{ productId: string }>();
    const navigate = useNavigate();

    const product = mockProducts.find(p => p.id === productId);
    const subscription = mockSubscriptions.find(s => s.productId === productId);
    const ownerTeam = mockTeams.find(t => t.id === product?.ownerTeamId);

    if (!product) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h1>
                    <p className="text-gray-600 mb-4">The product you're looking for doesn't exist.</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const isOwner = mockUser.teams.includes(product.ownerTeamId);

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                        <Link to="/" className="hover:text-indigo-600">Dashboard</Link>
                        <span>›</span>
                        <span className="text-gray-900 font-semibold">{product.displayName}</span>
                    </nav>

                    {/* Product Header */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{product.displayName}</h1>
                            <div className="flex items-center gap-4 mt-2">
                                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold">
                                    {product.version}
                                </span>
                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                                    {product.state}
                                </span>
                                {ownerTeam && (
                                    <span className="text-sm text-gray-600">
                                        by <span className="font-semibold">{ownerTeam.name}</span>
                                    </span>
                                )}
                            </div>
                            <p className="text-gray-600 mt-3 max-w-2xl">{product.description}</p>
                        </div>

                        {isOwner && (
                            <button className="px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-indigo-400 hover:text-indigo-600 transition-all">
                                Manage Product
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Stats & Subscription */}
                    <div className="space-y-6">
                        {/* Stats Card */}
                        <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Statistics</h2>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-gray-600">APIs</p>
                                    <p className="text-2xl font-bold text-gray-900">📊 {product.apis.length}</p>
                                </div>
                                {product.subscriberCount !== undefined && (
                                    <div>
                                        <p className="text-sm text-gray-600">Subscribers</p>
                                        <p className="text-2xl font-bold text-gray-900">👥 {product.subscriberCount}</p>
                                    </div>
                                )}
                                {product.qualityScore && (
                                    <div>
                                        <p className="text-sm text-gray-600 mb-2">Quality Score</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full"
                                                    style={{ width: `${product.qualityScore}%` }}
                                                />
                                            </div>
                                            <span className="text-lg font-bold text-gray-900">{product.qualityScore}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Subscription Card */}
                        {subscription && (
                            <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
                                <h2 className="text-lg font-bold text-gray-900 mb-4">Your Subscription</h2>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Status</p>
                                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                                            {subscription.state}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-600 mb-1">Primary Key</p>
                                        <p className="text-xs font-mono text-gray-900 break-all bg-gray-50 p-2 rounded">
                                            {subscription.primaryKey.value.substring(0, 20)}...
                                        </p>
                                    </div>
                                    {subscription.expirationDate && (
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Expires</p>
                                            <p className="text-sm text-gray-900">
                                                {new Date(subscription.expirationDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                    )}
                                    <button className="w-full px-4 py-2 border-2 border-gray-200 text-gray-700 font-semibold rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition-all">
                                        Manage Subscription
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: APIs List */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">
                                APIs ({product.apis.length})
                            </h2>

                            <div className="space-y-4">
                                {product.apis.map(api => (
                                    <Link
                                        key={api.id}
                                        to={`/products/${productId}/apis/${api.id}`}
                                        className="block p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="text-lg font-bold text-gray-900">{api.displayName}</h3>
                                                <p className="text-sm text-gray-600 mt-1">{api.description}</p>
                                                <div className="flex items-center gap-4 mt-3">
                                                    <span className="text-sm text-gray-600">
                                                        📍 {api.path}
                                                    </span>
                                                    <span className="text-sm text-gray-600">
                                                        🔗 {api.operations.length} endpoints
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-indigo-600 font-semibold">→</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
