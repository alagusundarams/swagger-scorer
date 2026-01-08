/**
 * AddApiModal
 * 
 * A modal dialog for onboarding new APIs to a Product.
 * Handles the multi-step process of defining or importing an API definition.
 */
import { useState } from 'react';
import { OnboardingSpecStep } from '../../../../features/provisioning/components/OnboardingSpecStep';
import { inventoryApi } from '../../api/inventoryClient';
import { useStore } from '../../../../store/useStore';

interface AddApiModalProps {
    productId: string;
    isOpen: boolean;
    onClose: () => void;
}

export const AddApiModal = ({ productId, isOpen, onClose }: AddApiModalProps) => {
    // const { addApiToProduct } = useInventoryStore(); // REMOVED
    const { addNotification } = useStore();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reuse the Spec Step Logic but simplified wrapper
    const handleSpecSubmit = async (specContent: string) => {
        setIsSubmitting(true);
        try {
            // Basic parsing to get name/title from spec
            // In a real app, the backend analyzer does this more robustly
            // For now, we'll send the raw spec and let the backend/db handle ingestion
            // or we parse minimally here

            // Mock Parsing for Demo
            const titleMatch = specContent.match(/title:\s*(.*)/) || specContent.match(/"title":\s*"(.*)"/);
            const title = titleMatch ? titleMatch[1].trim().replace(/['"]/g, '') : 'New API';

            const name = title.toLowerCase().replace(/[^a-z0-9]/g, '-');

            await inventoryApi.addApi(productId, {
                name,
                displayName: title,
                description: 'Imported via Product Dashboard',
                path: `/${name}`,
                // In real implementation, we'd send the full spec to backend to parse operations
            });

            addNotification({
                type: 'success',
                title: 'API Added',
                message: `${title} has been added to the product.`,
                navigateTo: `/products/${productId}`
            });

            onClose();
        } catch (err: any) {
            alert('Failed to add API: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative border border-slate-700">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 text-slate-400 hover:text-white"
                >
                    ✕
                </button>

                <div className="flex-1 overflow-hidden p-2">
                    <OnboardingSpecStep
                        onBack={onClose}
                        onNext={handleSpecSubmit}
                    />
                </div>

                {isSubmitting && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                        <div className="animate-spin text-4xl">🌀</div>
                    </div>
                )}
            </div>
        </div>
    );
};
