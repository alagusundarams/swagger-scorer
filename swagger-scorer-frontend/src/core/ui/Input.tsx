import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    fullWidth?: boolean;
    icon?: React.ReactNode;
    containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    className = '',
    fullWidth = false,
    icon,
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
                {icon && (
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 z-10">
                        {icon}
                    </div>
                )}
                <input
                    className={`dashboard-input ${icon ? 'dashboard-input-with-icon' : ''} ${error ? 'dashboard-input-error' : ''} ${className}`}
                    {...props}
                />
            </div>
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        </div>
    );
};
