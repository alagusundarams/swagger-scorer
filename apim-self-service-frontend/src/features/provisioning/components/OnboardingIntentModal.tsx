import { useState, useMemo } from 'react';
import { type Product } from '../../inventory/types/inventoryTypes';
import { useProductsQuery } from '../../inventory/api/inventoryQueries';

/**
 * ------------------------------------------------------------------
 * 📍 Component: OnboardingIntentModal
 * ------------------------------------------------------------------
 * 🔄 RESPONSIBILITY:
 * - Entry point selector for the onboarding wizard.
 * - Allows users to choose between "New API" and "Existing API" workflows.
 * - Sets the initial context for the wizard state machine.
 * ------------------------------------------------------------------
 */
interface OnboardingIntentModalProps {
    onSelectIntent: (mode: 'new' | 'existing', existingProduct?: Product) => void;
    userTeams: { id: string, name: string }[];
}

export const OnboardingIntentModal = ({ onSelectIntent, userTeams }: OnboardingIntentModalProps) => {
    const { data: products = [], isLoading } = useProductsQuery();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [mode, setMode] = useState<'selection' | 'picking'>('selection');

    // Filter products: Must be owned by one of the user's teams to add an API to it (usually)
    // Or at least they must have write access. For now, we filter by ownerTeamId match.
    const myProducts = useMemo(() => {
        const teamIds = userTeams.map(t => t.id);
        return products.filter(p => teamIds.includes(p.ownerTeamId) && p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [products, userTeams, searchTerm]);

    if (mode === 'picking') {
        return (
            <div className="flex flex-col h-full animate-fade-in p-8 text-center max-w-2xl mx-auto">
                <button
                    onClick={() => setMode('selection')}
                    className="self-start text-xs font-bold text-slate-400 hover:text-slate-600 mb-6 flex items-center gap-2"
                >
                    ← Back to Options
                </button>

                <h2 className="text-3xl font-black tracking-tighter mb-2">Select Target Product</h2>
                <p className="text-slate-500 mb-8">Choose an existing product container to add your new API to.</p>

                <input
                    type="text"
                    placeholder="Search your products..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm mb-4 outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                />

                <div className="flex-1 overflow-y-auto custom-scrollbar border border-slate-100 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50 p-2 text-left options-list max-h-[400px]">
                    {isLoading && <div className="p-4 text-center text-slate-400">Loading products...</div>}
                    {!isLoading && myProducts.length === 0 && (
                        <div className="p-8 text-center text-slate-400">
                            No owned products found matching "{searchTerm}".
                        </div>
                    )}
                    {myProducts.map(product => (
                        <div
                            key={product.id}
                            onClick={() => setSelectedProduct(product)}
                            className={`p-4 rounded-lg cursor-pointer transition-all mb-2 flex justify-between items-center ${selectedProduct?.id === product.id ? 'bg-blue-600 text-white shadow-lg scale-[1.01]' : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                        >
                            <div>
                                <div className="font-bold text-sm">{product.displayName}</div>
                                <div className={`text-[10px] ${selectedProduct?.id === product.id ? 'text-blue-200' : 'text-slate-400'}`}>{product.name} • {product.environment}</div>
                            </div>
                            {selectedProduct?.id === product.id && <span>✓</span>}
                        </div>
                    ))}
                </div>

                <div className="mt-8 flex justify-center">
                    <button
                        disabled={!selectedProduct}
                        onClick={() => selectedProduct && onSelectIntent('existing', selectedProduct)}
                        className="px-8 py-3 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:scale-100 scale-105"
                    >
                        Continue with {selectedProduct?.displayName || 'Selection'} →
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center h-full p-8 animate-fade-in">
            <h1 className="text-4xl font-black tracking-tighter mb-4 text-center">What are you onboarding?</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-12 text-center max-w-lg">
                Are you launching a completely new product offering, or adding an API capability to an existing one?
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
                {/* New Product Card */}
                <div
                    onClick={() => onSelectIntent('new')}
                    className="group relative bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <span className="text-9xl">🌱</span>
                    </div>
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-3xl mb-6 text-green-600 transition-transform group-hover:rotate-12">
                        🌱
                    </div>
                    <h3 className="text-xl font-black mb-2">New Product</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        Create a new logical container. Define standard policies, owners, and settings from scratch.
                    </p>
                    <div className="mt-6 text-xs font-bold text-green-600 uppercase tracking-wider group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                        Start Fresh <span>→</span>
                    </div>
                </div>

                {/* Existing Product Card */}
                <div
                    onClick={() => myProducts.length > 0 && setMode('picking')}
                    className={`group relative bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-xl transition-all overflow-hidden ${myProducts.length > 0
                            ? 'hover:shadow-2xl hover:scale-[1.02] cursor-pointer'
                            : 'opacity-50 cursor-not-allowed'
                        }`}
                    title={myProducts.length === 0 ? 'No products available. Create a new product first.' : ''}
                >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <span className="text-9xl">🌿</span>
                    </div>
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-3xl mb-6 text-blue-600 transition-transform group-hover:rotate-12">
                        🌿
                    </div>
                    <h3 className="text-xl font-black mb-2">Add API to Product</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        Append a REST/SOAP API to an existing product. Inherits current policies and team ownership.
                    </p>
                    {myProducts.length === 0 ? (
                        <div className="mt-6 text-xs font-bold text-orange-500 uppercase tracking-wider inline-flex items-center gap-1">
                            ⚠️ No Products Available
                        </div>
                    ) : (
                        <div className="mt-6 text-xs font-bold text-blue-600 uppercase tracking-wider group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                            Select Product <span>→</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
