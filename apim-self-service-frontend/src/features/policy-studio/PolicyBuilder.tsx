/**
 * Visual Policy Builder Component
 * 
 * Form-based UI to build policies visually
 * NO inline styles - uses CSS classes
 */

import React, { useState } from 'react';
import { policyTemplates, PolicyTemplate, getPolicyTemplate } from './policyTemplates';
import './PolicyBuilder.css';

interface PolicyBuilderProps {
    section: 'inbound' | 'backend' | 'outbound' | 'on-error';
    onAddPolicy: (xml: string) => void;
}

export const PolicyBuilder: React.FC<PolicyBuilderProps> = ({ section, onAddPolicy }) => {
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
    const [formValues, setFormValues] = useState<Record<string, any>>({});
    const [generatedXml, setGeneratedXml] = useState<string>('');

    const availableTemplates = policyTemplates.filter(t => t.section === section);
    const currentTemplate = selectedTemplate ? getPolicyTemplate(selectedTemplate) : null;

    const handleTemplateSelect = (templateId: string) => {
        const template = getPolicyTemplate(templateId);
        if (!template) return;

        setSelectedTemplate(templateId);

        // Set default values
        const defaults: Record<string, any> = {};
        template.fields.forEach(field => {
            defaults[field.name] = field.defaultValue || '';
        });
        setFormValues(defaults);
        setGeneratedXml('');
    };

    const handleFieldChange = (fieldName: string, value: any) => {
        setFormValues(prev => ({ ...prev, [fieldName]: value }));
    };

    const handleArrayAdd = (fieldName: string) => {
        const current = formValues[fieldName] || [];
        setFormValues(prev => ({
            ...prev,
            [fieldName]: [...current, '']
        }));
    };

    const handleArrayChange = (fieldName: string, index: number, value: string) => {
        const current = [...(formValues[fieldName] || [])];
        current[index] = value;
        setFormValues(prev => ({ ...prev, [fieldName]: current }));
    };

    const handleArrayRemove = (fieldName: string, index: number) => {
        const current = [...(formValues[fieldName] || [])];
        current.splice(index, 1);
        setFormValues(prev => ({ ...prev, [fieldName]: current }));
    };

    const handleGenerateXml = () => {
        if (!currentTemplate) return;

        const xml = currentTemplate.generateXml(formValues);
        setGeneratedXml(xml);
    };

    const handleAddPolicy = () => {
        if (generatedXml) {
            onAddPolicy(generatedXml);
            // Reset form
            setSelectedTemplate(null);
            setFormValues({});
            setGeneratedXml('');
        }
    };

    return (
        <div className="policy-builder">
            <div className="policy-builder-header">
                <h3>Add Policy to {section.toUpperCase()}</h3>
            </div>

            {!selectedTemplate ? (
                <div className="template-selector">
                    <p className="template-selector-label">Select a policy template:</p>
                    <div className="template-grid">
                        {availableTemplates.map(template => (
                            <button
                                key={template.id}
                                className={`template-card template-category-${template.category}`}
                                onClick={() => handleTemplateSelect(template.id)}
                            >
                                <div className="template-card-title">{template.name}</div>
                                <div className="template-card-description">{template.description}</div>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="policy-form">
                    <div className="policy-form-header">
                        <h4>{currentTemplate?.name}</h4>
                        <button
                            className="btn-secondary btn-sm"
                            onClick={() => setSelectedTemplate(null)}
                        >
                            ← Back
                        </button>
                    </div>

                    <div className="policy-fields">
                        {currentTemplate?.fields.map(field => (
                            <div key={field.name} className="policy-field">
                                <label className="policy-field-label">
                                    {field.label}
                                    {field.required && <span className="required-indicator">*</span>}
                                </label>

                                {field.type === 'text' && (
                                    <input
                                        type="text"
                                        className="policy-input"
                                        placeholder={field.placeholder}
                                        value={formValues[field.name] || ''}
                                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                    />
                                )}

                                {field.type === 'number' && (
                                    <input
                                        type="number"
                                        className="policy-input"
                                        value={formValues[field.name] || ''}
                                        onChange={(e) => handleFieldChange(field.name, parseInt(e.target.value))}
                                    />
                                )}

                                {field.type === 'select' && (
                                    <select
                                        className="policy-select"
                                        value={formValues[field.name] || ''}
                                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                    >
                                        {field.options?.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                {field.type === 'textarea' && (
                                    <textarea
                                        className="policy-textarea"
                                        placeholder={field.placeholder}
                                        value={formValues[field.name] || ''}
                                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                        rows={4}
                                    />
                                )}

                                {field.type === 'array' && (
                                    <div className="policy-array-field">
                                        {(formValues[field.name] || ['']).map((item: string, index: number) => (
                                            <div key={index} className="policy-array-item">
                                                <input
                                                    type="text"
                                                    className="policy-input"
                                                    placeholder={field.placeholder}
                                                    value={item}
                                                    onChange={(e) => handleArrayChange(field.name, index, e.target.value)}
                                                />
                                                <button
                                                    className="btn-danger btn-sm"
                                                    onClick={() => handleArrayRemove(field.name, index)}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        ))}
                                        <button
                                            className="btn-secondary btn-sm"
                                            onClick={() => handleArrayAdd(field.name)}
                                        >
                                            + Add Item
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="policy-form-actions">
                        <button
                            className="btn-primary"
                            onClick={handleGenerateXml}
                        >
                            Generate XML
                        </button>
                    </div>

                    {generatedXml && (
                        <div className="policy-preview">
                            <div className="policy-preview-header">
                                <h5>Generated XML:</h5>
                            </div>
                            <pre className="policy-preview-code">{generatedXml}</pre>
                            <div className="policy-preview-actions">
                                <button
                                    className="btn-success"
                                    onClick={handleAddPolicy}
                                >
                                    ✓ Add to Policy
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PolicyBuilder;
