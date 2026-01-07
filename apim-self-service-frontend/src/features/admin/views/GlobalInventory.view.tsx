import React, { useState } from 'react';
import { Product } from '../../inventory/types/inventoryTypes';
import { DashboardPagination } from '../../inventory/components/dashboard/DashboardPagination';
import { useNavigate } from 'react-router-dom';

interface GlobalInventoryProps {
    products: Product[];
    embedded?: boolean;
}

export const GlobalInventory: React.FC<GlobalInventoryProps> = ({ products, embedded }) => {
    const navigate = useNavigate();

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Derived Data
    const totalPages = Math.ceil(products.length / itemsPerPage);
    const paginatedProducts = products.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <div className="w-full">
            {!embedded && (
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">Global Inventory</h1>
                    <p className="text-gray-500 dark:text-slate-400 font-medium">System-wide view of all registered API Products.</p>
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700/50 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-slate-700/50">
                                <th className="p-6 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest bg-gray-50/50 dark:bg-slate-900/50">Product Name</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest bg-gray-50/50 dark:bg-slate-900/50">Owner Team</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest bg-gray-50/50 dark:bg-slate-900/50 text-center w-32">Version</th>
                                <th className="p-6 text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest bg-gray-50/50 dark:bg-slate-900/50 text-center w-24">APIs</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                            {paginatedProducts.length > 0 ? (
                                paginatedProducts.map((product) => (
                                    <tr
                                        key={product.id}
                                        className="group hover:bg-blue-50/50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/products/${product.id}`)}
                                    >
                                        <td className="p-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                                    {product.displayName}
                                                </span>
                                                <span className="text-xs text-gray-400 font-mono mt-1">{product.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-6 h-full">
                                            <div className="flex items-center gap-2 h-full">
                                                <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></div>
                                                <span className="text-sm font-medium text-gray-600 dark:text-slate-300">
                                                    {product.ownerTeamName || product.ownerTeamId}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex justify-center">
                                                <span className="inline-flex px-3 py-1 bg-gray-100 dark:bg-slate-700 rounded-full text-xs font-mono font-bold text-gray-500 dark:text-slate-300 whitespace-nowrap">
                                                    {product.version}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex justify-center">
                                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                                    {product.apis?.length || 0}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="p-16 text-center text-gray-400 dark:text-slate-500 italic">
                                        No products found in the global registry.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <DashboardPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={products.length}
                onPageChange={setCurrentPage}
            />
        </div>
    );
};
