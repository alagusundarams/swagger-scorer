import { UnifiedPolicyStudio } from '../../../shared/features/policy/UnifiedPolicyStudio';
import { ApiOperation } from '../../../utils/swaggerParser';

interface OnboardingApiPolicyStepProps {
    onBack: () => void;
    onNext: (policies: Record<string, string>, productPolicyXml?: string) => void;
    specContent?: string;
    preParsedOperations?: ApiOperation[];
    productPolicyXml?: string;
    productName?: string;
    initialApiPolicies?: Record<string, string>;
    readOnly?: boolean;
    environment?: string;
    onEnvironmentChange?: (env: any) => void;
}

export const OnboardingApiPolicyStep = ({
    onBack,
    onNext,
    specContent,
    preParsedOperations,
    productPolicyXml,
    productName = "New Product",
    initialApiPolicies,
    readOnly = false,
    environment,
    onEnvironmentChange
}: OnboardingApiPolicyStepProps) => {

    const handleSave = (apiPolicies: Record<string, string>, productXml: string) => {
        onNext(apiPolicies, productXml);
    };

    return (
        <div className="h-full flex flex-col">
            <UnifiedPolicyStudio
                specContent={specContent}
                preParsedOperations={preParsedOperations}
                productName={productName}
                productPolicyXml={productPolicyXml}
                initialApiPolicies={initialApiPolicies}
                onSave={handleSave}
                onBack={onBack}
                readOnly={readOnly}
                environment={environment}
                onEnvironmentChange={onEnvironmentChange}
            />
        </div>
    );
};
