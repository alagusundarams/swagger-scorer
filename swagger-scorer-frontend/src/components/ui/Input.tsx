import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    fullWidth?: boolean;
    icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    className = '',
    fullWidth = false,
    icon,
    ...props
}) => {
    // Styles derived from design-system.md / login-form-element
    // We omit width: 100% and margin unless fullWidth is true to allow flexibility
    // Using manual styles to avoid global class conflicts (login-form-element forces width)
    const baseStyles = "border-2 border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 text-base focus:border-indigo-400 focus:bg-white focus:outline-none rounded-xl font-semibold transition-colors";

    // Add left padding if icon is present
    const paddingStyles = icon ? "pl-10 pr-6 py-2.5" : "px-6 py-2.5";

    const widthStyles = fullWidth ? "w-full" : "";
    const errorStyles = error ? "border-red-300 bg-red-50 focus:border-red-500" : "";

    return (
        <div className={`${fullWidth ? 'w-full' : ''}`}>
            {label && (
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        {icon}
                    </div>
                )}
                <input
                    className={`${baseStyles} ${paddingStyles} ${widthStyles} ${errorStyles} ${className}`}
                    {...props}
                />
            </div>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
};
