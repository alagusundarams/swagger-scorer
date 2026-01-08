import { useState, useMemo } from 'react';
import { useOrphanAppRegistrationsQuery, useAdoptAppRegistrationMutation } from '../api/adminQueries';
import { usePaginatedProductsQuery } from '../../../features/inventory/api/inventoryQueries';
import type { Product } from '../../../shared/types/domain';
import toast from 'react-hot-toast';

/**
 * OrphanAppRegistrationManager
 * 
 * 📍 Purpose:
 * UI for Admins to identify "orphaned" App Registrations (those discovered from APIM 
 * but not linked to any Product or API in our database) and map them.
 */
export const OrphanAppRegistrationManager = () => {
    // Queries handle loading state now
    const [envFilter, setEnvFilter] = useState<string>('DEV');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [targetProductId, setTargetProductId] = useState<string>('');
    const [targetApiId, setTargetApiId] = useState<string>('');
    const [linkType, setLinkType] = useState<'PRODUCT' | 'API'>('PRODUCT');

    const { data: orphans = [], isLoading: orphansLoading } = useOrphanAppRegistrationsQuery(envFilter);
    // Fetch products for dropdown (large batch)
    const { data: productData, isLoading: productsLoading } = usePaginatedProductsQuery(1, 1000);
    const products = productData?.products || [];
    const isLoading = orphansLoading || productsLoading;

    // Mutation
    const adoptMutation = useAdoptAppRegistrationMutation();


    const filteredOrphans = useMemo(() => {
        if (!searchQuery) return orphans;
        const q = searchQuery.toLowerCase();
        return orphans.filter((o: any) =>
            o.displayName.toLowerCase().includes(q) ||
            o.clientId.toLowerCase().includes(q)
        );
    }, [orphans, searchQuery]);

    const handleAdopt = async () => {
        if (!selectedId) return;
        if (linkType === 'PRODUCT' && !targetProductId) {
            toast.error('Please select a target Product');
            return;
        }
        if (linkType === 'API' && !targetApiId) {
            toast.error('Please select a target API');
            return;
        }

        const toastId = toast.loading('Adopting App Registration...');
        adoptMutation.mutate({
            id: selectedId,
            data: {
                productId: linkType === 'PRODUCT' ? targetProductId : undefined,
                apiId: linkType === 'API' ? targetApiId : undefined
            }
        }, {
            onSuccess: () => {
                toast.success('App Registration adopted!', { id: toastId });
                setSelectedId(null);
                setTargetProductId('');
                setTargetApiId('');
            },
            onError: () => {
                toast.error('Adoption failed', { id: toastId });
            }
        });
    };

    const targetProduct = products.find((p: Product) => p.id === targetProductId);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header / Info */}
            <div className="bg-purple-50 dark:bg-purple-900/10 p-6 rounded-2xl border border-purple-200 dark:border-purple-900/30">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xl font-bold text-purple-900 dark:text-purple-400 flex items-center gap-2">
                            <span>🔑</span> App Registration Reclamation
                        </h3>
                        <p className="text-sm text-purple-700 dark:text-purple-500/80 font-medium max-w-2xl mt-1">
                            These App Registrations were discovered in APIM policies or subscriptions but haven't been claimed by any Product or API.
                            Linking them enables proper governance and self-service.
                        </p>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-4 items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex-1 min-w-[200px]">
                    <input
                        type="text"
                        placeholder="Search by name or Client ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Env</span>
                    <select
                        value={envFilter}
                        onChange={(e) => setEnvFilter(e.target.value)}
                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-xs font-bold"
                    >
                        <option value="DEV">DEV</option>
                        <option value="QA">QA</option>
                        <option value="STAGE">STAGE</option>
                        <option value="PROD">PROD</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* List */}
                <div className="lg:col-span-2 space-y-4">
                    {isLoading ? (
                        <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Scanning...</div>
                    ) : filteredOrphans.length === 0 ? (
                        <div className="p-12 bg-slate-50 dark:bg-slate-800/20 rounded-2xl text-center border-2 border-dashed border-slate-100 dark:border-slate-800">
                            <div className="text-2xl mb-2">✨</div>
                            <div className="font-bold text-slate-400">No orphaned registrations in {envFilter}</div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {filteredOrphans.map((o: any) => (
                                <div
                                    key={o.id}
                                    onClick={() => setSelectedId(o.id)}
                                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedId === o.id ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/20 shadow-lg' : 'border-transparent bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">{o.displayName}</div>
                                            <div className="text-[10px] font-mono text-slate-400 mt-1">{o.clientId}</div>
                                        </div>
                                        <div className="text-[10px] font-black text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/40 px-2 py-1 rounded">
                                            ORPHAN
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Adoption Form */}
                <div className="space-y-6">
                    <div className={`p-6 bg-white dark:bg-slate-900 rounded-2xl border-2 transition-all ${selectedId ? 'border-purple-100 dark:border-purple-800 opacity-100' : 'border-slate-100 dark:border-slate-800 opacity-40 grayscale pointer-events-none'}`}>
                        <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Adopt Registration</h4>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Link Scope</label>
                                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                                    <button
                                        onClick={() => setLinkType('PRODUCT')}
                                        className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${linkType === 'PRODUCT' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600' : 'text-slate-400'}`}
                                    >
                                        PRODUCT
                                    </button>
                                    <button
                                        onClick={() => setLinkType('API')}
                                        className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${linkType === 'API' ? 'bg-white dark:bg-slate-700 shadow-sm text-purple-600' : 'text-slate-400'}`}
                                    >
                                        API
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Product</label>
                                <select
                                    value={targetProductId}
                                    onChange={(e) => {
                                        setTargetProductId(e.target.value);
                                        setTargetApiId('');
                                    }}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="">Select Product...</option>
                                    {products.filter((p: Product) => p.environment === envFilter).map((p: Product) => (
                                        <option key={p.id} value={p.id}>{p.displayName}</option>
                                    ))}
                                </select>
                            </div>

                            {linkType === 'API' && targetProductId && (
                                <div className="space-y-3 animate-slide-up">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target API</label>
                                    <select
                                        value={targetApiId}
                                        onChange={(e) => setTargetApiId(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="">Select API...</option>
                                        {targetProduct?.apis.map((api: any) => (
                                            <option key={api.id} value={api.id}>{api.displayName}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <button
                                onClick={handleAdopt}
                                disabled={!selectedId || (linkType === 'PRODUCT' && !targetProductId) || (linkType === 'API' && !targetApiId)}
                                className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl transition-all shadow-lg shadow-purple-500/20 active:scale-95"
                            >
                                Link & Adopt
                            </button>
                        </div>
                    </div>

                    {!selectedId && (
                        <div className="text-center p-6 text-slate-400 italic text-sm">
                            Select an orphaned registration from the list to begin adoption.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
