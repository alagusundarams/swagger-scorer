/**
 * Policy Blocks Display Component - REFACTORED
 * 
 * DUMB RENDERER: Fetches display structure from backend
 * NO parsing logic in frontend
 */

import React, { useEffect, useState } from 'react';
import './PolicyBlocksDisplay.css';

interface PolicyElementDisplay {
    id: string;
    type: string;
    displayName: string;
    icon: string;
    attributes: Array<{ key: string; value: string }>;
    snippet?: string;
}

interface PolicySectionDisplay {
    name: string;
    policies: PolicyElementDisplay[];
}

interface PolicyDisplayStructure {
    gatewayType: string;
    originalPolicy: string;
    sections: PolicySectionDisplay[];
}

interface PolicyBlocksDisplayProps {
    productId: string;
}

export const PolicyBlocksDisplay: React.FC<PolicyBlocksDisplayProps> = ({ productId }) => {
    const [displayStructure, setDisplayStructure] = useState<PolicyDisplayStructure | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Fetch parsed structure from backend
        fetch(`/api/v1/products/${productId}/policy-display`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setDisplayStructure(data.displayStructure);
                } else {
                    setError('Failed to load policy');
                }
            })
            .catch(err => {
                setError(err.message);
            })
            .finally(() => setLoading(false));
    }, [productId]);

    if (loading) {
        return <div className="policy-blocks-loading">Loading policy...</div>;
    }

    if (error) {
        return <div className="policy-blocks-error">Error: {error}</div>;
    }

    if (!displayStructure || displayStructure.sections.length === 0) {
        return (
            <div className="policy-blocks-empty">
                <p>No policies configured</p>
            </div>
        );
    }

    return (
        <div className="policy-blocks-container">
            {displayStructure.sections.map((section, index) => (
                <div key={index} className={`policy-block policy-block-${section.name}`}>
                    <div className="policy-block-header">
                        <span className="policy-block-icon">{getSectionIcon(section.name)}</span>
                        <h3>{section.name.toUpperCase()}</h3>
                    </div>

                    <div className="policy-block-content">
                        {section.policies.length === 0 ? (
                            <div className="policy-element policy-empty">
                                <span className="policy-empty-indicator">—  empty —</span>
                            </div>
                        ) : (
                            section.policies.map((policy) => (
                                <div key={policy.id} className={`policy-element policy-type-${policy.type}`}>
                                    <div className="policy-element-header">
                                        <span className="policy-type-badge">{getIconEmoji(policy.icon)}</span>
                                        <span className="policy-type-name">{policy.displayName}</span>
                                    </div>

                                    {policy.attributes && policy.attributes.length > 0 && (
                                        <div className="policy-attributes">
                                            {policy.attributes.map((attr, idx) => (
                                                <div key={idx} className="policy-attribute">
                                                    <span className="attribute-key">{attr.key}:</span>
                                                    <span className="attribute-value">{attr.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {policy.snippet && (
                                        <div className="policy-value">
                                            {policy.snippet}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

function getSectionIcon(section: string): string {
    const icons: Record<string, string> = {
        'inbound': '⬇️',
        'backend': '🔗',
        'outbound': '⬆️',
        'on-error': '⚠️'
    };
    return icons[section] || '📦';
}

function getIconEmoji(icon: string): string {
    const icons: Record<string, string> = {
        'check': '✓',
        'zap': '⚡',
        'globe': '🌐',
        'tool': '🔧',
        'link': '🔗',
        'lock': '🔒',
        'clipboard': '📋',
        'refresh-cw': '🔄',
        'database': '💾',
        'save': '💾',
        'git-branch': '🌿',
        'code': '💻'
    };
    return icons[icon] || '📄';
}

export default PolicyBlocksDisplay;
