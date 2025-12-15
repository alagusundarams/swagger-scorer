import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const Breadcrumbs = () => {
    const location = useLocation();
    const pathnames = location.pathname.split('/').filter((x) => x);

    return (
        <nav aria-label="Breadcrumb" className="px-6 py-3 border-b border-gray-200 bg-white">
            <ol role="list" className="flex items-center space-x-2">
                <li>
                    <Link to="/" className="text-gray-400 hover:text-gray-500">
                        <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                        </svg>
                        <span className="sr-only">Home</span>
                    </Link>
                </li>
                {pathnames.map((value, index) => {
                    const to = `/${pathnames.slice(0, index + 1).join('/')}`;
                    const isLast = index === pathnames.length - 1;

                    return (
                        <li key={to}>
                            <div className="flex items-center">
                                <svg className="h-5 w-5 flex-shrink-0 text-gray-300" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                                    <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                                </svg>
                                <Link
                                    to={to}
                                    className={`ml-2 text-sm font-medium ${isLast ? 'text-gray-700 pointer-events-none' : 'text-gray-500 hover:text-gray-700'}`}
                                    aria-current={isLast ? 'page' : undefined}
                                >
                                    {value.charAt(0).toUpperCase() + value.slice(1)}
                                </Link>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};
