import { useState, useEffect } from 'react';
import { MainLayout } from '../../../layouts/MainLayout/MainLayout.view';
import { useStore } from '../../../store/useStore';
import { useConsumerStore } from '../../consumer/store/consumerStore';
import { toast } from 'react-hot-toast';

export const AppsPage = () => {
    const { user, setPageTitle } = useStore();
    const { appRegistrations, fetchAppRegistrations, registerApp: addAppRegistration } = useConsumerStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        displayName: '',
        clientId: '',
        environment: 'DEV' as 'DEV' | 'QA' | 'STAGE' | 'PROD',
        appIdUri: ''
    });

    useEffect(() => {
        setPageTitle('My Applications');
        if (user) {
            fetchAppRegistrations(user.teams[0]); // Assuming first team for now
        }
    }, [user, fetchAppRegistrations, setPageTitle]);

    const handleAddApp = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addAppRegistration({
                ...formData,
                ownerTeamId: user?.teams[0] || 'unknown'
            });
            setIsModalOpen(false);
            setFormData({ displayName: '', clientId: '', environment: 'DEV', appIdUri: '' });
            toast.success('Application linked successfully!');
        } catch (error) {
            toast.error('Failed to link application');
        }
    };

    return (
        <MainLayout>
            <div className="bg-slate-50 dark:bg-slate-900 min-h-screen pt-20 pb-20 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">My Applications</h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your Azure AD Client Identities for service consumption.</p>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center gap-2"
                        >
                            <span>+</span> Link New App
                        </button>
                    </div>

                    {appRegistrations.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {appRegistrations.map(app => (
                                <div key={app.id} className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-slate-700/50 group hover:border-blue-500/50 transition-all">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-12 h-12 bg-blue-50 dark:bg-slate-900 rounded-xl flex items-center justify-center text-xl">
                                            📱
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${app.environment === 'PROD' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                            app.environment === 'STAGE' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                'bg-emerald-50 text-emerald-600 border-emerald-100'
                                            }`}>
                                            {app.environment}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">{app.displayName}</h3>
                                    <p className="text-[10px] font-mono text-slate-400 mb-6 truncate">{app.clientId}</p>

                                    <div className="space-y-3">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-400 font-bold uppercase tracking-tighter">Status</span>
                                            <span className="text-emerald-500 font-black tracking-widest uppercase text-[10px]">Active</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-slate-400 font-bold uppercase tracking-tighter">Subscriptions</span>
                                            <span className="text-slate-900 dark:text-white font-black">2 Products</span>
                                        </div>
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-700/50 flex justify-end gap-3">
                                        <button className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">Details</button>
                                        <button className="text-[10px] font-black uppercase tracking-widest text-rose-600 hover:text-rose-800">Unlink</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-40 bg-white dark:bg-slate-800 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                            <div className="text-6xl mb-6">🛰️</div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2">No Applications Linked</h2>
                            <p className="text-slate-500 font-medium mb-8">Link an existing Azure AD App Registration to start requesting API access.</p>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="px-8 py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white font-black rounded-2xl hover:scale-105 transition-transform"
                            >
                                Link Your First App
                            </button>
                        </div>
                    )}
                </div>

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] p-10 shadow-2xl animate-in fade-in zoom-in duration-300">
                            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-2">Link Application</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">Register an existing identity for consumption.</p>

                            <form onSubmit={handleAddApp} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Display Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.displayName}
                                        onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                                        placeholder="e.g. My Mobile Checkout App"
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/50 font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Azure Client ID</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.clientId}
                                        onChange={e => setFormData({ ...formData, clientId: e.target.value })}
                                        placeholder="00000000-0000-0000-0000-000000000000"
                                        className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/50 font-bold font-mono"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Target Env</label>
                                        <select
                                            value={formData.environment}
                                            onChange={e => setFormData({ ...formData, environment: e.target.value as any })}
                                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/50 font-bold"
                                        >
                                            <option value="DEV">DEV</option>
                                            <option value="QA">QA</option>
                                            <option value="STAGE">STAGE</option>
                                            <option value="PROD">PROD</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">App ID URI (Optional)</label>
                                        <input
                                            type="text"
                                            value={formData.appIdUri}
                                            onChange={e => setFormData({ ...formData, appIdUri: e.target.value })}
                                            placeholder="api://my-app"
                                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500/50 font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="pt-6 flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black rounded-2xl hover:bg-slate-200 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition"
                                    >
                                        Link Identity
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
};
