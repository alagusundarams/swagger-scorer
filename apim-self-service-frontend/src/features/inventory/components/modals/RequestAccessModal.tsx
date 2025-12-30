import type { Product } from '../../../../shared/types/domain';

interface RequestAccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product;
}

export const RequestAccessModal = ({
    isOpen,
    onClose,
    product,
}: RequestAccessModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="modal">
            <div className="modal-content">
                <h2>Request Access to {product.displayName}</h2>
                <p>Coming soon: Request access form</p>
                <button onClick={onClose}>Close</button>
            </div>
        </div>
    );
};
