import { PolicyStudioContainer } from '../PolicyStudio.container';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    apiName: string;
    initialXml?: string; // ADDED
}

export const PolicyStudioModal = ({ isOpen, onClose, apiName, initialXml }: Props) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <span>👓</span> Policy Lens: <span className="text-blue-600">{apiName}</span>
                    </h2>
                    <p className="text-xs text-gray-500">Visualizing policy hierarchy and governance locks.</p>
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
                <PolicyStudioContainer initialXml={initialXml} />
            </div>
        </div>
    );
};
