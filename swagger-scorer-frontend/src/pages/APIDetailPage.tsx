import { useParams, useNavigate, Link } from 'react-router-dom';
import { mockProducts } from '../mocks';

export const APIDetailPage = () => {
    const { productId, apiId } = useParams<{ productId: string; apiId: string }>();
    const navigate = useNavigate();

    const product = mockProducts.find(p => p.id === productId);
    const api = product?.apis.find(a => a.id === apiId);

    if (!product || !api) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">API Not Found</h1>
                    <p className="text-gray-600 mb-4">The API you're looking for doesn't exist.</p>
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

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                        <Link to="/" className="hover:text-indigo-600">Dashboard</Link>
                        <span>›</span>
                        <Link to={`/products/${productId}`} className="hover:text-indigo-600">
                            {product.displayName}
                        </Link>
                        <span>›</span>
                        <span className="text-gray-900 font-semibold">{api.displayName}</span>
                    </nav>

                    {/* API Header */}
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{api.displayName}</h1>
                        <p className="text-gray-600 mt-2">{api.description}</p>
                        <div className="flex items-center gap-4 mt-3">
                            <span className="text-sm text-gray-600">
                                📍 Base Path: <span className="font-mono font-semibold">{api.path}</span>
                            </span>
                            <span className="text-sm text-gray-600">
                                🔗 {api.operations.length} endpoints
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">
                        Endpoints ({api.operations.length})
                    </h2>

                    <div className="space-y-3">
                        {api.operations.map(operation => {
                            const methodColors = {
                                GET: 'bg-blue-100 text-blue-700 border-blue-200',
                                POST: 'bg-green-100 text-green-700 border-green-200',
                                PUT: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                                PATCH: 'bg-orange-100 text-orange-700 border-orange-200',
                                DELETE: 'bg-red-100 text-red-700 border-red-200',
                            };

                            return (
                                <Link
                                    key={operation.id}
                                    to={`/products/${productId}/apis/${apiId}/operations/${operation.id}`}
                                    className="block p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <span className={`px-3 py-1 rounded-lg text-sm font-bold border-2 ${methodColors[operation.method]}`}>
                                            {operation.method}
                                        </span>
                                        <div className="flex-1">
                                            <p className="font-mono text-sm font-semibold text-gray-900">
                                                {operation.urlTemplate}
                                            </p>
                                            <p className="text-sm text-gray-600 mt-1">{operation.description}</p>
                                        </div>
                                        <span className="text-indigo-600 font-semibold">→</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
};
