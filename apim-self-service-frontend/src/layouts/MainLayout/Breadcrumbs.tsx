import React, { useMemo } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useStore } from '../../store/useStore';

/**
 * @fileoverview Decoupled Breadcrumbs
 * 
 * Instead of hardcoding all routes, this component:
 * 1. Always starts with Home.
 * 2. Uses explicit context from navigation state if present.
 * 3. Resolves Product/API entities if IDs are in the URL.
 * 4. Falls back to the global pageTitle.
 */
import { useProductQuery } from '../../features/inventory/api/inventoryQueries';

export const Breadcrumbs: React.FC = () => {
    const location = useLocation();
    const { productId, apiId, operationId } = useParams<{ productId: string; apiId: string; operationId: string }>();
    const { pageTitle } = useStore();
    // We fetch the product needed for the breadcrumb context. 
    // If we are deep in a product route, we need that product's details.
    const { data: product } = useProductQuery(productId || '', undefined);

    const breadcrumbs = useMemo(() => {
        const items = [
            { label: 'Home', href: '/', current: location.pathname === '/' }
        ];

        // 1. Check for manual context
        const state = location.state as { breadcrumbContext?: Array<{ label: string; href: string }> } | null;
        if (state?.breadcrumbContext) {
            items.push(...state.breadcrumbContext.map(b => ({ ...b, current: false })));
        }

        // 2. Resolve Core Entities
        if (productId) {
            items.push({
                label: product?.name || 'Product',
                href: `/products/${productId}`,
                current: !apiId && !operationId && !state?.breadcrumbContext
            });

            if (apiId) {
                const api = (product as any)?.apis.find((a: any) => a.id === apiId);
                items.push({
                    label: api?.name || 'API',
                    href: `/products/${productId}/apis/${apiId}`,
                    current: !operationId && !state?.breadcrumbContext
                });

                if (operationId) {
                    const operation = (api as any)?.operations.find((o: any) => o.id === operationId);
                    items.push({
                        label: operation?.urlTemplate || 'Operation',
                        href: location.pathname,
                        current: true
                    });
                }
            }
        }

        // 3. Fallback to Page Title
        const lastItem = items[items.length - 1];
        if (!lastItem.current && location.pathname !== '/') {
            items.push({
                label: pageTitle,
                href: location.pathname,
                current: true
            });
        }

        return items;
    }, [location.pathname, location.state, productId, apiId, operationId, product, pageTitle]);

    if (breadcrumbs.length <= 1) return null;

    return (
        <nav className="bg-gray-50 px-6 py-2 mb-0" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-xs list-none p-0 m-0">
                {breadcrumbs.map((crumb, index) => (
                    <React.Fragment key={crumb.href + index}>
                        {index > 0 && (
                            <li className="text-gray-400 flex items-center">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </li>
                        )}

                        <li className="flex items-center">
                            {crumb.current ? (
                                <span className="text-blue-600 font-semibold flex items-center gap-1" aria-current="page">
                                    {index === 0 && <HomeIcon />}
                                    {crumb.label}
                                </span>
                            ) : (
                                <Link
                                    to={crumb.href}
                                    className="text-gray-500 hover:text-gray-900 transition-colors font-medium flex items-center gap-1"
                                >
                                    {index === 0 && <HomeIcon />}
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

const HomeIcon = () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);
