/**
 * @fileoverview Validation Feedback Component
 * 
 * Visual feedback for field validation (NO INLINE STYLES)
 * Lazy-loadable, focused component
 */

import { memo } from 'react';
import '../provisioning.css';

interface ValidationFeedbackProps {
    fieldName: string;
    error: {
        message: string;
        conflicts?: Array<{
            id: string;
            name: string;
            [key: string]: any;
        }>;
    } | null;
    isValidating: boolean;
    showSuccess?: boolean;
}

export const ValidationFeedback = memo(({
    error,
    isValidating,
    showSuccess = false
}: ValidationFeedbackProps) => {
    // Show validating state
    if (isValidating) {
        return (
            <div className="validation-feedback validation-feedback--validating">
                <span className="validation-icon">⏳</span>
                <span>Checking availability...</span>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div className="validation-feedback validation-feedback--error">
                <div className="validation-feedback__header">
                    <span className="validation-icon">⛔</span>
                    <span>{error.message}</span>
                </div>

                {error.conflicts && error.conflicts.length > 0 && (
                    <div className="validation-feedback__conflicts">
                        <div className="validation-feedback__conflicts-title">
                            Conflicts found:
                        </div>
                        <ul className="validation-feedback__conflicts-list">
                            {error.conflicts.map((conflict, idx) => (
                                <li key={conflict.id || idx} className="validation-feedback__conflict-item">
                                    {conflict.name || conflict.displayName || conflict.id}
                                    {conflict.environment && (
                                        <span className="validation-feedback__env-badge">
                                            {conflict.environment}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    }

    // Show success state (optional)
    if (showSuccess) {
        return (
            <div className="validation-feedback validation-feedback--success">
                <span className="validation-icon">✅</span>
                <span>Available</span>
            </div>
        );
    }

    return null;
});

ValidationFeedback.displayName = 'ValidationFeedback';
