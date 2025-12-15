import React, { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    fullWidth?: boolean;
    options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
    label,
    error,
    className = '',
    fullWidth = false,
    options,
    ...props
}) => {
    // Shared consistent styles
    // Shared consistent styles
    // Matches login-form-element exactly but implemented manually to avoid global class conflicts
    const baseStyles = "appearance-none border-2 border-gray-200 bg-gray-50 text-gray-900 text-base font-semibold rounded-xl focus:border-indigo-400 focus:bg-white focus:outline-none block transition-colors pr-10";
    const paddingStyles = "px-6 py-2.5"; // Match Input padding
    const widthStyles = fullWidth ? "w-full" : "";
    const errorStyles = error ? "border-red-300 bg-red-50 focus:border-red-500" : "";

    return (
        <div className={`${fullWidth ? 'w-full' : ''} relative`}>
            {label && (
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    {label}
                </label>
            )}
            <div className="relative">
                <select
                    className={`${baseStyles} ${paddingStyles} ${widthStyles} ${errorStyles} ${className}`}
                    {...props}
                >
                    {options.map(opt => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
};
