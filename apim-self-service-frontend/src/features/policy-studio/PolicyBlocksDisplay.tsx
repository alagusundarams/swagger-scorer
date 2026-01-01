/**
 * Policy Blocks Display Component - MFE COMPLIANT
 * 
 * DUMB RENDERER: Displays parsed policy structure from backend
 * Uses custom hooks for data fetching (MFE pattern)
 * NO parsing logic in frontend
 */

import { usePolicyDisplay } from './hooks/usePolicyStudio';
import './PolicyBlocksDisplay.css';

/**
 * ------------------------------------------------------------------
 * 📍 Component: PolicyBlocksDisplay
 * ------------------------------------------------------------------
 * 🔄 RESPONSIBILITY:
 * - Read-only visualization of applied policy blocks.
 * - Used in high-level summaries or audit logs where editing is not required.
 * - Renders a compact, "LEGO-like" stack of XML-backed policies.
 * ------------------------------------------------------------------
 */
interface PolicyBlocksDisplayProps {
    productId: string;
}

export const PolicyBlocksDisplay: React.FC<PolicyBlocksDisplayProps> = ({ productId }) => {
    // Use custom hook for data fetching (MFE pattern)
    const { displayStructure, loading, error } = usePolicyDisplay(productId);

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
