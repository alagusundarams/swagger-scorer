import React, { useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';

export const Breadcrumbs: React.FC = () => {
    const location = useLocation();
    const { productId, apiId, operationId } = useParams<{ productId: string; apiId: string; operationId: string }>();
    const { products } = useStore();

    // Resolve Entities based on URL Params
    const breadcrumbs = useMemo(() => {
        const items = [
            { label: 'Home', href: '/', current: location.pathname === '/' }
        ];

        // Check for Dynamic Context (passed via navigation state or sessionStorage)
        const state = location.state as { breadcrumbContext?: Array<{ label: string; href: string }> } | null;

        // Fallback to sessionStorage if state is missing (e.g., after refresh)
        let breadcrumbContext = state?.breadcrumbContext;
        if (!breadcrumbContext && location.pathname.startsWith('/analyzer')) {
            const saved = sessionStorage.getItem('analyzerBreadcrumbs');
            if (saved) {
                try {
                    breadcrumbContext = JSON.parse(saved);
                } catch (e) {
                    console.error('Failed to parse breadcrumb context from sessionStorage');
                }
            }
        }

        if (breadcrumbContext) {
            items.push(...breadcrumbContext.map(b => ({ ...b, current: false })));

            if (location.pathname.startsWith('/analyzer')) {
                items.push({ label: 'API Analyzer', href: '/analyzer', current: true });
                return items;
            }
        }

        // 1. Product Level
        if (productId) {
            const product = products.find(p => p.id === productId);
            items.push({
                label: product?.name || 'Product',
                href: `/products/${productId}`,
                current: !apiId && !operationId
            });
        }

        // 2. API Level
        if (productId && apiId) {
            const product = products.find(p => p.id === productId);
            const api = product?.apis.find(a => a.id === apiId);
            items.push({
                label: api?.name || 'API',
                href: `/products/${productId}/apis/${apiId}`,
                current: !operationId
            });
        }

        // 3. Operation Level
        if (productId && apiId && operationId) {
            const product = products.find(p => p.id === productId);
            const api = product?.apis.find(a => a.id === apiId);
            const operation = api?.operations.find(o => o.id === operationId);
            items.push({
                label: operation?.urlTemplate || 'Operation',
                href: location.pathname, // Current Page
                current: true
            });
        }

        // Other Routes (Browse, Analyzer, etc.) - Fallback to simple matching if not an Entity Route
        if (!state?.breadcrumbContext && !productId && location.pathname !== '/') {
            const path = location.pathname;
            if (path.startsWith('/browse')) {
                items.push({ label: 'Browse APIs', href: '/browse', current: true });
            } else if (path.startsWith('/analyzer')) {
                items.push({ label: 'API Analyzer', href: '/analyzer', current: true });
            } else if (path.startsWith('/onboard')) {
                items.push({ label: 'Onboard Product', href: '/onboard', current: true });
            }
        }

        return items;
    }, [location.pathname, location.state, productId, apiId, operationId, products]);

    // Don't render if only Home (optional, but cleaner)
    if (breadcrumbs.length <= 1) return null;

    return (
        <nav className="bg-gray-50 px-6 py-2 mb-0" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-xs list-none">
                {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={crumb.href + index}>
                        {index > 0 && (
                            <li className="text-gray-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </li>
                        )}

                        <li>
                            {crumb.current ? (
                                <span className="text-blue-600 font-semibold flex items-center gap-1" aria-current="page">
                                    {index === 0 && (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                        </svg>
                                    )}
                                    {crumb.label}
                                </span>
                            ) : (
                                <Link
                                    to={crumb.href}
                                    className="text-gray-500 hover:text-gray-900 transition-colors font-medium flex items-center gap-1"
                                >
                                    {index === 0 && (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                        </svg>
                                    )}
                                    {crumb.label}
                                </Link>
                            )}
                        </li>
                    </React.Fragment>
                ))}
            </ol>
        </nav>
    );
};
