import React, { type ReactNode } from 'react';

interface FooterProps {
    children?: ReactNode; // Allows embedding custom links, copyright, version info, etc.
}

export const Footer: React.FC<FooterProps> = ({ children }) => {
    return (
        <footer className="mt-12 py-6 border-t border-gray-800 text-center text-gray-500 text-sm">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    &copy; {new Date().getFullYear()} Swagger Scorer. All rights reserved.
                </div>

                {/* Embedded content area */}
                {children && (
                    <div className="flex gap-6 items-center">
                        {children}
                    </div>
                )}
            </div>
        </footer>
    );
};
