import { useState } from 'react';

interface Props {
    onBack: () => void;
    onSubmit: () => void;
    productName?: string;
    productVersion?: string;
}

export const OnboardingFulfillmentStep = ({ onBack, onSubmit, productName, productVersion }: Props) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        setIsSubmitting(true);
        // Simulate API call
        setTimeout(() => {
            setIsSubmitting(false);
            onSubmit();
        }, 2000);
    };

    return (
        <div className="p-12 h-full flex flex-col">
            <div className="text-center space-y-2 mb-12">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white">Step 3: Fulfillment</h2>
                <p className="text-gray-500">Review your configuration and publish to the API Gateway.</p>
            </div>

            <div className="flex-1 space-y-6">
                <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-8 border border-gray-200 dark:border-slate-700 space-y-4">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-slate-800">
                        <span className="text-sm font-bold text-gray-500 uppercase">API Context</span>
                        <span className="text-gray-900 dark:text-white font-black">
                            {productName || 'New API'} ({productVersion || 'v1.0.0'})
                        </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-slate-800">
                        <span className="text-sm font-bold text-gray-500 uppercase">Definition Status</span>
                        <span className="text-green-600 font-bold flex items-center gap-2">
                            <span>✅</span> Verified (98/100)
                        </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-slate-800">
                        <span className="text-sm font-bold text-gray-500 uppercase">Policy Configuration</span>
                        <span className="text-blue-600 font-bold flex items-center gap-2">
                            <span>🛠️</span> Custom Policies Applied
                        </span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-bold text-gray-500 uppercase">Target Environment</span>
                        <span className="text-gray-900 dark:text-white font-bold">
                            Production (East US)
                        </span>
                    </div>
                </div>

                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 text-yellow-800 dark:text-yellow-200 text-sm">
                    <strong>Auto-Approval Enabled:</strong> This API meets all governance standards and will be provisioned immediately.
                </div>
            </div>

            <div className="mt-12 flex justify-between pt-8 border-t border-gray-200 dark:border-slate-700">
                <button
                    onClick={onBack}
                    className="px-8 py-3 text-gray-500 font-bold hover:text-gray-900 hover:bg-gray-100 rounded-xl transition"
                >
                    Back to Studio
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="px-10 py-3 bg-green-600 text-white rounded-xl font-bold shadow-xl shadow-green-500/30 hover:bg-green-700 hover:scale-[1.02] transition flex items-center gap-3"
                >
                    {isSubmitting ? (
                        <>
                            <span className="animate-spin">⚙️</span>
                            Provisioning...
                        </>
                    ) : (
                        <>
                            <span>🚀</span>
                            Publish API
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
