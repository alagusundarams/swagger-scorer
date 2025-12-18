import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Breadcrumbs: React.FC = () => {
    const location = useLocation();

    // Generate breadcrumb items from current path
    const generateBreadcrumbs = () => {
        const paths = location.pathname.split('/').filter(Boolean);

        if (paths.length === 0) {
            return [];
        }

        const breadcrumbs = paths.map((path, index) => {
            const href = '/' + paths.slice(0, index + 1).join('/');
            // Convert path segment to readable label
            const label = path
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');

            return {
                label,
                href,
                current: index === paths.length - 1
            };
        });

        return breadcrumbs;
    };

    const breadcrumbs = generateBreadcrumbs();

    // Always render breadcrumbs, even on home page
    return (
        <nav className="bg-gray-50 px-6 py-1.5 mb-0" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2 text-xs list-none">
                {breadcrumbs.length === 0 ? (
                    // On home page, show just "Home" as active
                    <li>
                        <span className="text-blue-600 font-semibold flex items-center gap-1" aria-current="page">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Home
                        </span>
                    </li>
                ) : (
                    <>
                        {/* Home link */}
                        <li>
                            <Link
                                to="/"
                                className="text-gray-500 hover:text-gray-900 transition-colors font-medium flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                Home
                            </Link>
                        </li>

                        {/* Breadcrumb items */}
                        {breadcrumbs.map((crumb) => (
                            <React.Fragment key={crumb.href}>
                                {/* Separator */}
                                <li className="text-gray-400">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                    </svg>
                                </li>

                                {/* Breadcrumb link/text */}
                                <li>
                                    {crumb.current ? (
                                        <span className="text-blue-600 font-semibold" aria-current="page">
                                            {crumb.label}
                                        </span>
                                    ) : (
                                        <Link
                                            to={crumb.href}
                                            className="text-gray-500 hover:text-gray-900 transition-colors font-medium"
                                        >
                                            {crumb.label}
                                        </Link>
                                    )}
                                </li>
                            </React.Fragment>
                        ))}
                    </>
                )}
            </ol>
        </nav>
    );
};
