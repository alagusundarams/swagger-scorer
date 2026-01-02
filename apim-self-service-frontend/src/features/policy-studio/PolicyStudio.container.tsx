import { useState, useEffect } from 'react';
import { UnifiedPolicyStudio } from '../../shared/features/policy/UnifiedPolicyStudio';
import { api } from '../../api/baseClient';
import { useStore } from '../../store/useStore';

interface Props {
    initialXml?: string;
    resourceName?: string;
    resourceId?: string;
    level?: 'product' | 'api' | 'operation';
    isReadOnly?: boolean;
}

export const PolicyStudioContainer = ({
    initialXml,
    resourceName = 'Service',
    resourceId = 'legacy-policy',
    level = 'api',
    isReadOnly = false
}: Props) => {
    const { addNotification } = useStore();
    const [spec, setSpec] = useState<string | undefined>();

    // Fetch API spec if we are at API/Operation level
    useEffect(() => {
        const fetchSpec = async () => {
            if (level === 'api' || level === 'operation') {
                try {
                    const response = await api.get(`/api-inventory/${resourceId}`);
                    if (response.data && response.data.swagger_url) {
                        const specRes = await fetch(response.data.swagger_url);
                        const specText = await specRes.text();
                        setSpec(specText);
                    }
                } catch (e) {
                    console.error("Failed to fetch spec for policy studio", e);
                }
            }
        };
        fetchSpec();
    }, [resourceId, level]);

    const handleSave = async (apiPolicies: Record<string, string>, productXml: string) => {
        try {
            await api.post('/policy/deploy', {
                xml: level === 'product' ? productXml : (apiPolicies['global'] || apiPolicies['product'] || initialXml),
                resourceId,
                level,
                justification: 'Updated via Unified Policy Studio',
                user: 'alagusundaram'
            });

            addNotification({
                title: 'Deployment Successful',
                message: 'Policy configuration has been saved and deployed to GitOps.' as any,
                type: 'success'
            });
        } catch (error) {
            console.error('Save Failed:', error);
            addNotification({
                title: 'Save Failed',
                message: 'Could not deploy policy changes. Check network.' as any,
                type: 'error'
            });
        }
    };

    return (
        <div className="h-full bg-slate-50 dark:bg-slate-950 p-6">
            <UnifiedPolicyStudio
                specContent={spec}
                productName={resourceName}
                productPolicyXml={level === 'product' ? initialXml : undefined}
                initialApiPolicies={level !== 'product' ? { global: initialXml || '' } : undefined}
                onSave={handleSave}
                onBack={() => window.history.back()}
                readOnly={isReadOnly}
            />
        </div>
    );
};
