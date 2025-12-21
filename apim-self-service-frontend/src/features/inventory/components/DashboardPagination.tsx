interface DashboardPaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (page: number) => void;
}

export function DashboardPagination({ currentPage, totalPages, totalItems, onPageChange }: DashboardPaginationProps) {
    if (totalPages <= 1) return null;

    const renderPageButtons = () => {
        const buttons = [];
        let startPage = 1;
        let endPage = Math.min(5, totalPages);

        if (totalPages > 5 && currentPage > 3) {
            startPage = currentPage - 2;
            endPage = currentPage + 2;
            if (endPage > totalPages) {
                endPage = totalPages;
                startPage = totalPages - 4;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            buttons.push(
                <button
                    key={i}
                    onClick={() => onPageChange(i)}
                    className={`w-16 h-16 rounded-3xl font-black text-sm transition-all duration-300 ${currentPage === i
                            ? 'bg-blue-600 text-white shadow-2xl shadow-blue-500/40 transform scale-110'
                            : 'bg-white dark:bg-slate-800 text-gray-400 hover:text-blue-500 border border-gray-100 dark:border-slate-700'
                        }`}
                >
                    {i}
                </button>
            );
        }
        return buttons;
    };

    return (
        <div className="mt-24 flex flex-col items-center gap-8">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="w-16 h-16 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-3xl disabled:opacity-20 hover:shadow-premium transition-all flex items-center justify-center text-xl font-black"
                >
                    ‹
                </button>
                <div className="flex items-center gap-3">
                    {renderPageButtons()}
                </div>
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="w-16 h-16 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-3xl disabled:opacity-20 hover:shadow-premium transition-all flex items-center justify-center text-xl font-black"
                >
                    ›
                </button>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/40 py-3 px-8 rounded-full border border-gray-100/50 dark:border-slate-700/50 backdrop-blur-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    PAGE <span className="text-blue-600">{currentPage}</span> / <span className="text-slate-900 dark:text-white">{totalPages}</span> — {totalItems} TOTAL NODES
                </p>
            </div>
        </div>
    );
}
