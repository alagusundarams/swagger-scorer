import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mockProducts, mockSubscriptions, mockUser, mockTeams } from '../mocks';

export const BrowsePage = () => {
    const navigate = useNavigate();
    const [selectedTeam, setSelectedTeam] = useState<string>(mockUser.teams[0]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSubscribeModal, setShowSubscribeModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

    const userTeams = mockTeams.filter(t => mockUser.teams.includes(t.id));

    // Get available products (not already subscribed)
    const subscribedProductIds = mockSubscriptions
        .filter(s => mockUser.teams.includes(s.subscriberTeamId))
        .map(s => s.productId);

    const availableProducts = mockProducts.filter(p => !subscribedProductIds.includes(p.id));

    // Filter by search
    const filteredProducts = availableProducts.filter(p =>
        p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSubscribe = (productId: string) => {
        setSelectedProduct(productId);
        setShowSubscribeModal(true);
    };

    const confirmSubscribe = () => {
        alert(`Subscription request submitted for approval!\nTeam: ${userTeams.find(t => t.id === selectedTeam)?.name}`);
        setShowSubscribeModal(false);
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Browse APIs</h1>
                            <p className="text-sm text-gray-600 mt-1">Discover and subscribe to available products</p>
                        </div>
                        <Link
                            to="/"
                            className="px-4 py-2 border-2 border-gray-200 text-gray-700 font-semibold rounded-lg hover:border-indigo-400"
                        >
                            ← Back to Dashboard
                        </Link>
                    </div>

                    {/* Search */}
                    <input
                        type="search"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full px-6 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-400"
                    />
                </div>
            </header>

            {/* Products Grid */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="mb-4">
                    <p className="text-sm text-gray-600">
                        {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''} available
                    </p>
                </div>

                {filteredProducts.length === 0 ? (
                    <div className="bg-white rounded-xl p-12 text-center border-2 border-gray-200">
                        <div className="text-6xl mb-4">🔍</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Products Found</h3>
                        <p className="text-gray-600">Try adjusting your search</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredProducts.map(product => {
                            const ownerTeam = mockTeams.find(t => t.id === product.ownerTeamId);
                            return (
                                <div
                                    key={product.id}
                                    className="bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-indigo-300 transition-all"
                                >
                                    <div className="mb-4">
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">{product.displayName}</h3>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-semibold">
                                                {product.version}
                                            </span>
                                            {ownerTeam && (
                                                <span className="text-xs text-gray-600">by {ownerTeam.name}</span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                                    </div>

                                    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                                        <span>📊 {product.apis.length} APIs</span>
                                        {product.subscriberCount !== undefined && (
                                            <span>👥 {product.subscriberCount} subscribers</span>
                                        )}
                                    </div>

                                    {product.qualityScore && (
                                        <div className="mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2 rounded-full"
                                                        style={{ width: `${product.qualityScore}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-bold text-gray-900">{product.qualityScore}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <Link
                                            to={`/products/${product.id}`}
                                            className="flex-1 px-4 py-2 border-2 border-gray-200 text-gray-700 font-semibold rounded-lg hover:border-indigo-400 text-center text-sm"
                                        >
                                            View Details
                                        </Link>
                                        <button
                                            onClick={() => handleSubscribe(product.id)}
                                            className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-700 text-sm"
                                        >
                                            Subscribe
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Subscribe Modal */}
            {showSubscribeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Subscribe to Product</h2>
                        <p className="text-gray-600 mb-6">
                            {mockProducts.find(p => p.id === selectedProduct)?.displayName}
                        </p>

                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Subscribe as Team *
                            </label>
                            <select
                                value={selectedTeam}
                                onChange={e => setSelectedTeam(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-400 focus:outline-none"
                            >
                                {userTeams.map(team => (
                                    <option key={team.id} value={team.id}>
                                        {team.name}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-2">
                                The subscription will be owned by this team
                            </p>
                        </div>

                        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-6">
                            <p className="text-sm text-yellow-800">
                                ⚠️ Subscription requires approval (1-2 business days)
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSubscribeModal(false)}
                                className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-lg hover:border-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmSubscribe}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-600 hover:to-purple-700"
                            >
                                Submit Request
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
