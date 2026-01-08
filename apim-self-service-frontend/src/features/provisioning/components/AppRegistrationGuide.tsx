import React from 'react';

/**
 * ------------------------------------------------------------------
 * 📍 Component: AppRegistrationGuide
 * ------------------------------------------------------------------
 * 🔄 RESPONSIBILITY:
 * - Displays the "App Identity & Security" guide content.
 * - Styled with the "Enlightened & Airy" aesthetic.
 * - Used as an in-app resource to avoid external redirects.
 * ------------------------------------------------------------------
 */
interface AppRegistrationGuideProps {
    onClose: () => void;
}

export const AppRegistrationGuide: React.FC<AppRegistrationGuideProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex justify-end animate-in slide-in-from-right duration-500">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm -z-10"
                onClick={onClose}
            />

            {/* Content Panel */}
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl overflow-y-auto flex flex-col border-l border-slate-100 dark:border-slate-800">
                {/* Header */}
                <div className="sticky top-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between z-10">
                    <div>
                        <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Resource Guide</div>
                        <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Understanding Identity</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="p-12 prose dark:prose-invert max-w-none">
                    <section className="mb-12">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-wider mb-6">
                            🔑 The Passport for your software
                        </div>
                        <h3 className="text-xl font-black mb-4">What is an App Registration?</h3>
                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                            Think of an <strong>App Registration</strong> as a Passport. Without it, your application is "anonymous" and untrusted. With it, we know exactly who is calling, and we can grant specific permissions.
                        </p>

                        <div className="grid grid-cols-1 gap-4 mt-8">
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div className="font-bold text-slate-900 dark:text-white mb-1">Client ID (UUID)</div>
                                <div className="text-sm text-slate-500">The Public User ID of your app. Safe to share.</div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div className="font-bold text-slate-900 dark:text-white mb-1">App ID URI (api://...)</div>
                                <div className="text-sm text-slate-500">The unique global address of your API.</div>
                            </div>
                        </div>
                    </section>

                    <section className="mb-12">
                        <h3 className="text-xl font-black mb-6">Product vs. API Identity</h3>
                        <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-2xl">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 dark:bg-slate-800/50">
                                    <tr>
                                        <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Feature</th>
                                        <th className="p-4 text-[10px] font-black uppercase tracking-wider text-blue-500">Shared</th>
                                        <th className="p-4 text-[10px] font-black uppercase tracking-wider text-purple-500">Isolated</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    <tr className="border-t border-slate-100 dark:border-slate-800">
                                        <td className="p-4 font-bold">Security</td>
                                        <td className="p-4 text-slate-500">Shared Risk</td>
                                        <td className="p-4 text-slate-500">Strict Contianment</td>
                                    </tr>
                                    <tr className="border-t border-slate-100 dark:border-slate-800">
                                        <td className="p-4 font-bold">Maintenance</td>
                                        <td className="p-4 text-slate-500">Low (1 Secret)</td>
                                        <td className="p-4 text-slate-500">High (Many Secrets)</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="mt-4 text-[10px] text-slate-400 italic">
                            ⚠️ Security Note: True Zero Trust architecture demands 1 API = 1 Identity. We allow "Product Identity" for low-risk scenarios.
                        </p>
                    </section>

                    <section className="mb-12">
                        <h3 className="text-xl font-black mb-4">Why we enforce this?</h3>
                        <ul className="space-y-4 text-sm text-slate-500 dark:text-slate-400">
                            <li className="flex gap-3">
                                <span className="text-blue-500 font-bold">01.</span>
                                <span><strong>No Anonymous APIs</strong>: Every API must belong to a known identity.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-blue-500 font-bold">02.</span>
                                <span><strong>Audit Trails</strong>: We know exactly which App ID was involved in any request.</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="text-blue-500 font-bold">03.</span>
                                <span><strong>Automated Policy</strong>: We auto-generate security logic, saving you 100s of lines of XML.</span>
                            </li>
                        </ul>
                    </section>

                    <div className="p-8 bg-emerald-50 dark:bg-emerald-900/10 rounded-[2rem] border border-emerald-100 dark:border-emerald-800/30">
                        <h4 className="font-bold text-emerald-900 dark:text-emerald-100 mb-2">Ready to create?</h4>
                        <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-6">
                            Contact Cloud Ops via ServiceNow or use the self-service portal at Port.io to generate your Client ID and URI.
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-white dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest text-[10px] rounded-xl border border-emerald-100 dark:border-emerald-800 shadow-sm hover:scale-[1.02] transition-all"
                        >
                            Got it, I'm ready
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
