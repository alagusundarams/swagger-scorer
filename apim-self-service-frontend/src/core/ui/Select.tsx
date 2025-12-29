import React, { type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    fullWidth?: boolean;
    options: { value: string; label: string }[];
    containerClassName?: string;
}

export const Select: React.FC<SelectProps> = ({
    label,
    error,
    className = '',
    fullWidth = false,
    options,
    containerClassName = '',
    ...props
}) => {
    return (
        <div className={`${fullWidth ? "w-full" : ""} ${containerClassName}`}>
            {label && (
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    {label}
                </label>
            )}
            <div className="relative">
                <select
                    className={`dashboard-input dashboard-input-select ${error ? 'dashboard-input-error' : ''} ${className}`}
                    {...props}
                >
                    {options.map(opt => (
                        <option key={opt.value} value={opt.value} className="bg-slate-800">
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none z-50">
                    <svg className="h-6 w-6 text-slate-100" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        </div>
    );
};
