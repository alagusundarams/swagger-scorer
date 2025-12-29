interface LoginButtonProps {
    fullWidth?: boolean;
}

import React from "react";
import { useAuth } from "../../features/auth/hooks/useAuth";

export const LoginButton: React.FC<LoginButtonProps> = ({ fullWidth = false }) => {
    const { login, isMock } = useAuth();

    const handleLoginClick = () => {
        console.log(`[SYS] LoginButton clicked. isMock: ${isMock}`);
        login();
    };

    const baseClasses = "login-form-element border-transparent bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg hover:from-indigo-600 hover:to-purple-700 flex items-center gap-3";
    const widthClass = fullWidth ? "justify-center" : "";

    return (
        <button
            onClick={handleLoginClick}
            className={`${baseClasses} ${widthClass}`}
        >
            <svg
                className="w-5 h-5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            <span>Sign In with SSO</span>
        </button>
    );
};
