import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../../layouts/MainLayout/MainLayout.view';
import { useStore } from '../../../store/useStore';
import { TeamSearch } from '../components/TeamSearch';

/**
 * OnboardingWizard: Multi-step intake flow for new API Products.
 * 
 * DESIGN:
 * - Guided steps (Info -> Visibility -> Review)
 * - store-integrated user/team context
 * - Enterprise branding & premium form elements
 */

export const OnboardingWizard = () => {
    const navigate = useNavigate();

    // --- Store Integration ---
    const { user, teams: allTeams } = useStore();

    // --- Wizard State ---
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        version: '',
        description: '',
        ownerTeamId: user?.teams[0] || '',
        visibility: 'public' as 'public' | 'private' | 'owner-only',
        selectedTeams: [] as string[],
        requiresAuth: false,
        isAiIntegrated: false,
        aiModel: '',
    });

    // Derived teams for the current user
    const userTeams = allTeams.filter(t => user?.teams.includes(t.id));

    // --- Navigation Handlers ---
    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    const handleSubmit = () => {
        // PERMANENT RECORD: In a real app, this would call the API.
        // For the MVP, we simulate submission feedback.
        alert(`Product "${formData.name}" has been registered and is pending Cloud Ops validation.`);
        navigate('/');
    };

    return (
        <MainLayout>
            <div className="py-16">
                <div className="max-w-3xl mx-auto px-6">

                    {/* Progress Orchestrator */}
                    <div className="mb-12">
                        <div className="flex items-center justify-between mb-6">
                            {[1, 2, 3].map(i => (
                                <div
                                    key={i}
                                    className={`flex-1 h-2 rounded-full mx-1.5 transition-all duration-700 ${i <= step ? 'bg-blue-600 shadow-lg shadow-blue-500/20' : 'bg-gray-100 dark:bg-slate-800'}`}
                                />
                            ))}
                        </div>
                        <p className="text-[10px] font-black text-gray-400 text-center uppercase tracking-[0.3em]">
                            PHASE {step} <span className="opacity-30 inline-block mx-2">/</span> 03
                        </p>
                    </div>

                    {/* Step Container */}
                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-12 md:p-16 shadow-premium border border-gray-100 dark:border-slate-700/40 relative overflow-hidden">

                        {/* Phase 1: Identity & Context */}
                        {step === 1 && (
                            <div className="animate-fade-in">
                                <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mb-4 capitalize">Product Identity</h2>
                                <p className="text-gray-400 dark:text-slate-500 font-medium mb-12">Establish the core metadata for your API interface.</p>

                                <div className="space-y-8">
                                    <div className="group">
                                        <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Marketplace Display Name *</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-6 py-5 bg-gray-50 dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none dark:text-white transition-all font-bold"
                                            placeholder="e.g., Global Transactions API"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Release Version *</label>
                                            <input
                                                type="text"
                                                value={formData.version}
                                                onChange={e => setFormData({ ...formData, version: e.target.value })}
                                                className="w-full px-6 py-5 bg-gray-50 dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl focus:border-blue-500 focus:outline-none dark:text-white transition-all font-mono text-sm"
                                                placeholder="v1.0.0"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Responsible Team *</label>
                                            <select
                                                value={formData.ownerTeamId}
                                                onChange={e => setFormData({ ...formData, ownerTeamId: e.target.value })}
                                                className="w-full px-6 py-5 bg-gray-50 dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl focus:border-blue-500 focus:outline-none dark:text-white transition-all font-bold"
                                            >
                                                {userTeams.map(team => (
                                                    <option key={team.id} value={team.id}>{team.name.toUpperCase()}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Operational Description *</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full px-6 py-5 bg-gray-50 dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl focus:border-blue-500 focus:outline-none dark:text-white transition-all font-medium min-h-[140px]"
                                            placeholder="Summarize the core capabilities and value proposition..."
                                        />
                                    </div>

                                    {/* AI Integration Opt-in */}
                                    <div className="p-8 bg-violet-50/50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-800/20 rounded-[2rem] space-y-6">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="text-2xl">🤖</div>
                                                <div>
                                                    <p className="text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest">AI Security Channel</p>
                                                    <p className="text-xs text-violet-800 dark:text-violet-300 font-bold uppercase tracking-tight">Does this interface provide AI/LLM features?</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setFormData({ ...formData, isAiIntegrated: !formData.isAiIntegrated })}
                                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.isAiIntegrated ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}`}
                                            >
                                                {formData.isAiIntegrated ? 'INTEGRATED' : 'OPT-IN'}
                                            </button>
                                        </div>

                                        {formData.isAiIntegrated && (
                                            <div className="animate-fade-in pt-4 border-t border-violet-100 dark:border-violet-800/30">
                                                <label className="block text-[9px] font-black text-violet-500 uppercase tracking-widest mb-3">Target Model Attribution (e.g., GPT-4o, Claude 3.5)</label>
                                                <input
                                                    type="text"
                                                    value={formData.aiModel}
                                                    onChange={e => setFormData({ ...formData, aiModel: e.target.value })}
                                                    className="w-full px-6 py-4 bg-white dark:bg-slate-950 border border-violet-100 dark:border-violet-800/50 rounded-xl focus:border-violet-500 focus:outline-none dark:text-white transition-all font-mono text-sm"
                                                    placeholder="x-ai-model: gpt-4o-latest"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-end mt-12 pt-8 border-t border-gray-50 dark:border-slate-700/30">
                                    <button
                                        onClick={handleNext}
                                        disabled={!formData.name || !formData.version || !formData.description}
                                        className="px-10 py-5 bg-blue-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-700 disabled:opacity-20 disabled:grayscale transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                                    >
                                        Establish Identity →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Phase 2: Access Orchestration */}
                        {step === 2 && (
                            <div className="animate-fade-in">
                                <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mb-4 capitalize">Exposure Control</h2>
                                <p className="text-gray-400 dark:text-slate-500 font-medium mb-12">Determine the reach and governance of your interface.</p>

                                <div className="space-y-6">
                                    {/* Visibility Options */}
                                    <div className="space-y-4">
                                        {[
                                            { id: 'public', label: 'Ecosystem Public', desc: 'Discoverable by all enterprise units', icon: '🌐' },
                                            { id: 'private', label: 'Restricted Circle', desc: 'Only visible to specific authorized groups', icon: '🔒' },
                                            { id: 'owner-only', label: 'Internal Sandbox', desc: 'Strictly limited to the producing team', icon: '👤' }
                                        ].map(opt => (
                                            <label
                                                key={opt.id}
                                                className={`flex items-start p-6 rounded-[2rem] cursor-pointer transition-all border-2 group ${formData.visibility === opt.id ? 'bg-blue-50/30 border-blue-600/30 dark:bg-blue-900/10 dark:border-blue-800' : 'bg-gray-50/50 dark:bg-slate-900/50 border-transparent hover:bg-white dark:hover:bg-slate-900 hover:border-blue-200'}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="visibility"
                                                    checked={formData.visibility === opt.id}
                                                    onChange={() => setFormData({ ...formData, visibility: opt.id as any })}
                                                    className="mt-1.5 mr-5 w-5 h-5 text-blue-600 focus:ring-blue-500"
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 font-black text-gray-900 dark:text-white uppercase tracking-widest text-[11px]">
                                                        <span>{opt.icon}</span> {opt.label}
                                                    </div>
                                                    <div className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-[0.05em]">{opt.desc}</div>

                                                    {/* Nested Conditional Selection for Private Mode */}
                                                    {formData.visibility === 'private' && opt.id === 'private' && (
                                                        <div className="mt-8 animate-fade-in">
                                                            <TeamSearch
                                                                allTeams={allTeams}
                                                                selectedTeamIds={formData.selectedTeams}
                                                                onToggleTeam={(toggelId) => {
                                                                    const current = formData.selectedTeams;
                                                                    if (current.includes(toggelId)) {
                                                                        setFormData({ ...formData, selectedTeams: current.filter(id => id !== toggelId) });
                                                                    } else {
                                                                        setFormData({ ...formData, selectedTeams: [...current, toggelId] });
                                                                    }
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-between mt-12 pt-8 border-t border-gray-50 dark:border-slate-700/30">
                                    <button
                                        onClick={handleBack}
                                        className="px-10 py-5 bg-gray-50 dark:bg-slate-900 text-gray-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-gray-100 transition-all"
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        onClick={handleNext}
                                        className="px-10 py-5 bg-blue-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-500/30 transition-all"
                                    >
                                        Review Manifest →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Phase 3: Final Validation */}
                        {step === 3 && (
                            <div className="animate-fade-in">
                                <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mb-4 capitalize">Final Manifest</h2>
                                <p className="text-gray-400 dark:text-slate-500 font-medium mb-12">Verify the configuration before enterprise submission.</p>

                                <div className="space-y-8">
                                    <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl p-8 border border-gray-100 dark:border-slate-800">
                                        <div className="grid grid-cols-2 gap-y-8 gap-x-12">
                                            <div>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">INTERFACE NAME</p>
                                                <p className="text-sm font-black text-gray-900 dark:text-white">{formData.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">VERSION BUILD</p>
                                                <p className="text-sm font-black text-blue-600 font-mono tracking-widest">{formData.version}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">OWNERSHIP</p>
                                                <p className="text-sm font-black text-gray-900 dark:text-white uppercase">{userTeams.find(t => t.id === formData.ownerTeamId)?.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">GOVERNANCE MODE</p>
                                                <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                                                    {formData.visibility === 'public' && '🌐 Global Discovery'}
                                                    {formData.visibility === 'private' && `🔒 Restricted List (${formData.selectedTeams.length})`}
                                                    {formData.visibility === 'owner-only' && '👤 Internal Node'}
                                                </p>
                                            </div>
                                            <div className="col-span-2 border-t border-gray-200 dark:border-slate-700 pt-6 mt-2">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                    INITIAL DEPLOYMENT TARGET <span className="bg-gray-200 text-gray-600 px-1.5 rounded-[4px] text-[9px]">LOCKED</span>
                                                </p>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800">1</div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900 dark:text-white">Development Environment</p>
                                                        <p className="text-xs font-mono text-slate-400">East US 2 (Internal Network)</p>
                                                    </div>
                                                </div>
                                                {formData.isAiIntegrated && (
                                                    <div className="mt-6 p-4 bg-violet-50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-800/30 rounded-2xl flex items-center gap-4">
                                                        <span className="text-xl">🛡️</span>
                                                        <div>
                                                            <p className="text-[10px] font-black text-violet-600 dark:text-violet-400 uppercase tracking-widest">AI Safety Commitment</p>
                                                            <p className="text-xs text-violet-800 dark:text-violet-300 font-bold">This interface will be scanned for Prompt Injection via Spectral AI-Sec rules.</p>
                                                        </div>
                                                    </div>
                                                )}
                                                <p className="text-[10px] text-slate-400 mt-4 font-medium bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-800/20 inline-block">
                                                    ℹ️ Production promotion requires passing automated Quality Gates in the Pipeline.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Warning */}
                                    <div className="flex gap-6 p-8 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-[2rem] items-center">
                                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-xl shrink-0">⚠️</div>
                                        <div>
                                            <p className="text-[10px] font-black text-amber-800 dark:text-amber-500 uppercase tracking-widest mb-1">PROVISIONING DELAY</p>
                                            <p className="text-xs text-amber-700/70 dark:text-amber-600/60 font-medium leading-relaxed">
                                                Registry submission triggers an automated architectural review.
                                                Asset will remain in "Pending" status for approximately 24 hours.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between mt-12 pt-8 border-t border-gray-50 dark:border-slate-700/30">
                                    <button
                                        onClick={handleBack}
                                        className="px-10 py-5 bg-gray-50 dark:bg-slate-900 text-gray-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-gray-100 transition-all font-sans"
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        className="px-12 py-5 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-emerald-700 shadow-2xl shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95"
                                    >
                                        Submit Registration
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};
