import { useState } from 'react';
import type { Product, Subscription, Team, AppRegistration } from '../../../../shared/types/domain';

interface RequestAccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product;
    onSuccess: () => void;
}

export const RequestAccessModal = ({
    isOpen,
    onClose,
    product,
    onSuccess
}: RequestAccessModalProps) => {
    const [selectedTeam, setSelectedTeam] = useState<string>('');
    const [reqAppReg, setReqAppReg] = useState<AppRegistration | null>(null);

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
