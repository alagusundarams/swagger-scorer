import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useInventoryStore } from '../../inventory/hooks/useInventoryStore';
import { LoginButton } from '../../../layouts/Header/LoginButton';
import { SSO_DOMAINS } from '../../../config/env';
import '../auth.css';

// Configure SSO domains - emails with these domains go to SSO
// Moved to src/config/env.ts

type LoginStep = 'email' | 'password';

export const LoginPage: React.FC = () => {
    const { isAuthenticated, login, isMock } = useAuth();
    const navigate = useNavigate();
    const { setPageTitle } = useInventoryStore();

    useEffect(() => {
        setPageTitle('Sign In');
    }, [setPageTitle]);

    const [step, setStep] = useState<LoginStep>('email');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    const getDomain = (email: string) => {
        const parts = email.split('@');
        return parts.length > 1 ? parts[1].toLowerCase() : '';
    };

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !email.includes('@')) {
            setError('Please enter a valid email address');
            return;
        }

        const domain = getDomain(email);

        // Check if this is an SSO domain
        if (SSO_DOMAINS.some(d => domain.endsWith(d))) {
            // Trigger SSO login
            setIsLoading(true);
            login();
        } else {
            // Show password screen for guest users
            setStep('password');
        }
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!password) {
            setError('Please enter your password');
            return;
        }

        // TODO: Implement guest user authentication
        // For now, just trigger the login (which will use SSO)
        setIsLoading(true);
        login();
        setError('Guest authentication not yet configured');
    };

    const handleBack = () => {
        setStep('email');
        setPassword('');
        setError('');
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center font-sans bg-gray-50 text-gray-900 overflow-hidden relative antialiased">

            {/* TODO (MVP2): Add Carousel Component Here
                - Showcase portal features (API Quality, Ease of Onboarding, etc.)
                - Auto-rotating cards with feature highlights
                - Position: Left side of screen or above login card
            */}
            <div className="w-full max-w-[560px] px-6 relative z-10 flex flex-col items-center">

                {/* Logo Section */}
                <div className="mb-8 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                        <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                            <text x="12" y="14.5" fill="#fbbf24" fontSize="16" fontWeight="900" textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>A</text>
                        </svg>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">APIM Self Service</h1>
                </div>

                {/* Login Card - Emulsified Floating Tile */}
                <div className="w-full max-w-[560px] login-card">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Sign in</h2>
                    <div className="flex justify-center mb-6">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${isMock ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                            Identity Mode: {isMock ? 'Local Mock' : 'SSO (Azure AD)'}
                        </span>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="login-error-banner">
                            {error}
                        </div>
                    )}

                    {step === 'email' ? (
                        <>
                            {/* User Selection */}
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-gray-700 mb-3">Select User (Demo)</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setEmail('sarah@payments.dev'); login('producer'); }}
                                        className="p-4 text-left border-2 border-blue-200 bg-blue-50 rounded-xl hover:border-blue-400 hover:bg-blue-100 transition-all"
                                    >
                                        <div className="font-black text-xs text-blue-900 mb-1">PRODUCER</div>
                                        <div className="text-xs text-blue-700">Sarah (Payments)</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setEmail('mike@core.sys'); login('consumer'); }}
                                        className="p-4 text-left border-2 border-green-200 bg-green-50 rounded-xl hover:border-green-400 hover:bg-green-100 transition-all"
                                    >
                                        <div className="font-black text-xs text-green-900 mb-1">CONSUMER</div>
                                        <div className="text-xs text-green-700">Mike (Core Sys)</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setEmail('admin@apim.portal'); login('admin'); }}
                                        className="p-4 text-left border-2 border-purple-200 bg-purple-50 rounded-xl hover:border-purple-400 hover:bg-purple-100 transition-all"
                                    >
                                        <div className="font-black text-xs text-purple-900 mb-1">ADMIN</div>
                                        <div className="text-xs text-purple-700">Portal Admin</div>
                                    </button>
                                </div>
                            </div>

                            <form className="space-y-5" onSubmit={handleEmailSubmit}>
                                <input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="login-form-element border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:bg-white"
                                    placeholder="Enter your email"
                                />

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="login-form-element border-transparent bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg hover:from-indigo-600 hover:to-purple-700 hover:border-indigo-300/50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Loading...
                                        </>
                                    ) : (
                                        'Next →'
                                    )}
                                </button>
                            </form>

                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-200"></div>
                                </div>
                                <div className="relative flex justify-center text-xs">
                                    <span className="bg-white px-3 text-gray-500 font-medium uppercase tracking-wide">or</span>
                                </div>
                            </div>

                            <LoginButton fullWidth />
                        </>
                    ) : (
                        <>
                            {/* Password Step for Guest Users */}
                            <div className="login-form-element border-gray-200 bg-gray-50 flex items-center justify-between">
                                <span className="text-gray-900 truncate">{email}</span>
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="text-indigo-600 text-sm font-semibold hover:text-indigo-700 hover:bg-indigo-50 ml-4 px-3 py-1 rounded-md transition-all flex-shrink-0"
                                >
                                    Change
                                </button>
                            </div>

                            <form className="space-y-5 password-form" onSubmit={handlePasswordSubmit}>
                                <input
                                    id="password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="login-form-element border-gray-200 bg-gray-50 text-gray-900 placeholder-gray-400 focus:border-indigo-400 focus:bg-white"
                                    placeholder="Enter your password"
                                    autoFocus
                                />

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="login-form-element border-transparent bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg hover:from-indigo-600 hover:to-purple-700 hover:border-indigo-300/50 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Loading...
                                        </>
                                    ) : (
                                        'Sign in'
                                    )}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                {/* Footer Links */}
                <div className="mt-10 flex justify-center gap-8 text-xs text-gray-500">
                    <a href="#" className="hover:text-blue-600 transition-colors duration-200 font-medium">Help</a>
                    <a href="#" className="hover:text-blue-600 transition-colors duration-200 font-medium">Privacy</a>
                    <a href="#" className="hover:text-blue-600 transition-colors duration-200 font-medium">Security</a>
                </div>
            </div>
        </div>
    );
};
