/**
 * Policy Blocks Display Component
 * 
 * Displays parsed policy XML in visual blocks
 * NO inline styles - uses CSS classes
 */

import React from 'react';
import './PolicyBlocksDisplay.css';

interface PolicyBlock {
    section: 'inbound' | 'backend' | 'outbound' | 'on-error';
    policies: PolicyElement[];
}

interface PolicyElement {
    type: string;
    attributes?: Record<string, string>;
    value?: string;
    xml: string;
}

interface PolicyBlocksDisplayProps {
    policyXml: string;
}

export const PolicyBlocksDisplay: React.FC<PolicyBlocksDisplayProps> = ({ policyXml }) => {
    const blocks = parsePolicyBlocks(policyXml);

    if (!blocks || blocks.length === 0) {
        return (
            <div className="policy-blocks-empty">
                <p>No policies configured</p>
            </div>
        );
    }

    return (
        <div className="policy-blocks-container">
            {blocks.map((block, index) => (
                <div key={index} className={`policy-block policy-block-${block.section}`}>
                    <div className="policy-block-header">
                        <span className="policy-block-icon">{getSectionIcon(block.section)}</span>
                        <h3>{block.section.toUpperCase()}</h3>
                    </div>

                    <div className="policy-block-content">
                        {block.policies.length === 0 ? (
                            <div className="policy-element policy-empty">
                                <span className="policy-empty-indicator">—  empty —</span>
                            </div>
                        ) : (
                            block.policies.map((policy, policyIndex) => (
                                <div key={policyIndex} className={`policy-element policy-type-${policy.type}`}>
                                    <div className="policy-element-header">
                                        <span className="policy-type-badge">{getPolicyIcon(policy.type)}</span>
                                        <span className="policy-type-name">{formatPolicyName(policy.type)}</span>
                                    </div>

                                    {policy.attributes && Object.keys(policy.attributes).length > 0 && (
                                        <div className="policy-attributes">
                                            {Object.entries(policy.attributes).map(([key, value]) => (
                                                <div key={key} className="policy-attribute">
                                                    <span className="attribute-key">{key}:</span>
                                                    <span className="attribute-value">{value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {policy.value && (
                                        <div className="policy-value">
                                            {policy.value}
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

function parsePolicyBlocks(xml: string): PolicyBlock[] {
    if (!xml) return [];

    const blocks: PolicyBlock[] = [];
    const sections = ['inbound', 'backend', 'outbound', 'on-error'];

    sections.forEach(section => {
        const regex = new RegExp(`<${section}>(.*?)</${section}>`, 's');
        const match = xml.match(regex);

        if (match) {
            const content = match[1];
            const policies = parsePolicyElements(content);
            blocks.push({ section: section as any, policies });
        }
    });

    return blocks;
}

function parsePolicyElements(content: string): PolicyElement[] {
    const elements: PolicyElement[] = [];
    const policyRegex = /<(\w+(?:-\w+)*)([^>]*)(?:\/>|>(.*?)<\/\1>)/gs;

    let match;
    while ((match = policyRegex.exec(content)) !== null) {
        const [fullMatch, type, attributesStr, value] = match;

        // Skip base element (special case)
        if (type === 'base') {
            elements.push({ type: 'base', xml: fullMatch });
            continue;
        }

        // Parse attributes
        const attributes: Record<string, string> = {};
        const attrRegex = /(\w+(?:-\w+)*)="([^"]*)"/g;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(attributesStr)) !== null) {
            attributes[attrMatch[1]] = attrMatch[2];
        }

        elements.push({
            type,
            attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
            value: value?.trim(),
            xml: fullMatch
        });
    }

    return elements;
}

function getSectionIcon(section: string): string {
    const icons: Record<string, string> = {
        'inbound': '⬇️',
        'backend': '🔗',
        'outbound': '⬆️',
        'on-error': '⚠️'
    };
    return icons[section] || '📦';
}

function getPolicyIcon(type: string): string {
    const icons: Record<string, string> = {
        'base': '✓',
        'rate-limit': '⚡',
        'cors': '🌐',
        'set-header': '🔧',
        'set-backend-service': '🔗',
        'validate-jwt': '🔒',
        'check-header': '📋',
        'rewrite-uri': '🔄'
    };
    return icons[type] || '📄';
}

function formatPolicyName(type: string): string {
    return type
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export default PolicyBlocksDisplay;
