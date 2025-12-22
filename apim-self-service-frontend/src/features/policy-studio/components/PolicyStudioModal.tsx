import { PolicyStudioContainer } from '../PolicyStudio.container';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    apiName: string;
    productName: string; // ADDED
    initialXml?: string;
}

export const PolicyStudioModal = ({ isOpen, onClose, apiName, productName, initialXml }: Props) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div>
                    {/* Breadcrumb Navigation */}
                    <nav className="flex items-center text-xs font-medium text-gray-500 mb-1">
                        <button
                            onClick={onClose}
                            className="hover:text-blue-600 hover:underline transition-colors flex items-center gap-1"
                            title="Back to Inventory"
                        >
                            <span>🏠</span>
                            <span>Inventory</span>
                        </button>
                        <span className="mx-2">/</span>
                        <button
                            onClick={onClose}
                            className="hover:text-blue-600 hover:underline transition-colors text-gray-900 dark:text-white"
                        >
                            {productName}
                        </button>
                        <span className="mx-2">/</span>
                        <span className="text-blue-600 font-bold">{apiName}</span>
                    </nav>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span>👓</span> Policy Studio
                    </h2>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white transition"
                    >
                        Close Studio
                    </button>
                </div>
            </div>

            {/* Modal Content - The Studio */}
            <div className="flex-1 overflow-hidden">
                <PolicyStudioContainer initialXml={initialXml} resourceName={apiName} resourceId={apiName} />
            </div>
        </div>
    );
};
