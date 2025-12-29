import React from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../../../types/entities';
import type { Team } from '../../teams/types/teamTypes';

interface DiscoveryProductCardProps {
    product: Product;
    ownerTeam?: Team;
    onSubscribe: (productId: string) => void;
}

export const DiscoveryProductCard: React.FC<DiscoveryProductCardProps> = ({
    product,
    ownerTeam,
    onSubscribe
}) => {
    return (
        <div
            className="group bg-white dark:bg-slate-800 rounded-[2.5rem] p-10 border border-gray-100 dark:border-slate-700/30 shadow-sm hover:shadow-premium hover:border-blue-100 dark:hover:border-blue-900/40 transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between"
        >
            <div>
                <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                        📦
                    </div>
                    <span className="bg-gray-50 dark:bg-slate-900 px-3 py-1 rounded-lg text-[9px] font-black text-gray-400 uppercase tracking-widest border border-gray-100 dark:border-slate-800">
                        {product.version}
                    </span>
                </div>

                <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight">{product.displayName}</h3>
                {ownerTeam && (
                    <p className="text-[10px] font-black text-gray-300 dark:text-slate-500 uppercase tracking-widest mb-4">OWNED BY {ownerTeam.name}</p>
                )}
                <p className="text-sm text-gray-500 dark:text-slate-400 line-clamp-3 font-medium mb-8 leading-relaxed">{product.description}</p>
            </div>

            <div>
                <div className="flex items-center justify-between mb-8 pb-8 border-b border-gray-50 dark:border-slate-700/30">
                    <div className="text-center">
                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Interfaces</p>
                        <span className="text-xs font-black text-gray-700 dark:text-white">{product.apis.length}</span>
                    </div>
                    <div className="text-center">
                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Impact</p>
                        <span className="text-xs font-black text-gray-700 dark:text-white">{product.subscriberCount || 0} teams</span>
                    </div>
                    <div className="text-center">
                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Quality</p>
                        <span className="text-xs font-black text-emerald-500">{product.qualityScore}%</span>
                    </div>
                </div>

                <div className="flex gap-4">
                    <Link
                        to={`/products/${product.id}`}
                        className="flex-1 px-6 py-4 bg-gray-50 dark:bg-slate-900 text-gray-400 dark:text-slate-500 font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-gray-100 dark:hover:bg-slate-700 text-center transition-all"
                    >
                        Analyze
                    </Link>
                    <button
                        onClick={() => onSubscribe(product.id)}
                        className="flex-[2] px-6 py-4 bg-blue-600 text-white font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all hover:scale-105"
                    >
                        Subscribe Now
                    </button>
                </div>
            </div>
        </div>
    );
};
