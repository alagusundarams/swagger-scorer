import { useParams, useNavigate, Link } from 'react-router-dom';
import { mockProducts } from '../mocks';

export const EndpointDetailPage = () => {
    const { productId, apiId, operationId } = useParams<{ productId: string; apiId: string; operationId: string }>();
    const navigate = useNavigate();

    const product = mockProducts.find(p => p.id === productId);
    const api = product?.apis.find(a => a.id === apiId);
    const operation = api?.operations.find(o => o.id === operationId);

    if (!product || !api || !operation) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Endpoint Not Found</h1>
                    <p className="text-gray-600 mb-4">The endpoint you're looking for doesn't exist.</p>
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

    const methodColors = {
        GET: 'bg-blue-100 text-blue-700 border-blue-200',
        POST: 'bg-green-100 text-green-700 border-green-200',
        PUT: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        PATCH: 'bg-orange-100 text-orange-700 border-orange-200',
        DELETE: 'bg-red-100 text-red-700 border-red-200',
    };

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
                        <Link to={`/products/${productId}/apis/${apiId}`} className="hover:text-indigo-600">
                            {api.displayName}
                        </Link>
                        <span>›</span>
                        <span className="text-gray-900 font-semibold">
                            {operation.method} {operation.urlTemplate}
                        </span>
                    </nav>

                    {/* Endpoint Header */}
                    <div className="flex items-center gap-4">
                        <span className={`px-4 py-2 rounded-lg text-lg font-bold border-2 ${methodColors[operation.method]}`}>
                            {operation.method}
                        </span>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 font-mono">{operation.urlTemplate}</h1>
                            <p className="text-gray-600 mt-1">{operation.description}</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="space-y-6">
                    {/* Request Section */}
                    <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Request</h2>

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-700 mb-2">URL</h3>
                                <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                                    <span className="text-gray-600">Base: </span>
                                    <span className="text-gray-900">{api.path}</span>
                                    <br />
                                    <span className="text-gray-600">Path: </span>
                                    <span className="text-gray-900">{operation.urlTemplate}</span>
                                </div>
                            </div>

                            {operation.urlTemplate.includes('{') && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Path Parameters</h3>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <p className="text-sm text-gray-600">
                                            This endpoint requires path parameters (e.g., {operation.urlTemplate.match(/\{([^}]+)\}/)?.[1]})
                                        </p>
                                    </div>
                                </div>
                            )}

                            {operation.method === 'POST' || operation.method === 'PUT' || operation.method === 'PATCH' ? (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Request Body</h3>
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                        <pre className="text-sm text-gray-900 font-mono">
                                            {`{
  // Request body schema
  // (Would be populated from OpenAPI spec)
}`}
                                        </pre>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    {/* Response Section */}
                    <div className="bg-white rounded-xl p-6 border-2 border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Responses</h2>

                        <div className="space-y-4">
                            {/* 200 Success */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-bold">200</span>
                                    <span className="text-sm font-semibold text-gray-700">Success</span>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <pre className="text-sm text-gray-900 font-mono">
                                        {`{
  // Response schema
  // (Would be populated from OpenAPI spec)
}`}
                                    </pre>
                                </div>
                            </div>

                            {/* 400 Bad Request */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-bold">400</span>
                                    <span className="text-sm font-semibold text-gray-700">Bad Request</span>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-600">Invalid request parameters or body</p>
                                </div>
                            </div>

                            {/* 500 Server Error */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-bold">500</span>
                                    <span className="text-sm font-semibold text-gray-700">Server Error</span>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-600">Internal server error</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Try It Out Section */}
                    <div className="bg-white rounded-xl p-6 border-2 border-indigo-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Try It Out</h2>
                        <p className="text-gray-600 mb-4">
                            Interactive API testing will be available once you have an active subscription.
                        </p>
                        <button className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all">
                            Test Endpoint
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
};
