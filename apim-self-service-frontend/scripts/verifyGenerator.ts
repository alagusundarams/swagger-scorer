import { generatePolicyXml } from '../src/features/policy-studio/utils/policyGenerator';
import { PolicyFlow } from '../src/features/policy-studio/types/policyTypes';

// Mocking a "Hybrid Flow" where AI has injected custom logic
const HYBRID_FLOW: PolicyFlow = {
    inbound: [
        // 1. Global Governance (Locked)
        {
            id: '1',
            type: 'base',
            displayName: 'Global Corporate Policy',
            scope: 'global',
            isLocked: true,
            xmlSnippet: '<include-fragment fragment-id="global-corporate-policy" />',
            properties: {}
        },
        // 2. Standard Visual Block (Rate Limit)
        {
            id: '2',
            type: 'rate-limit',
            displayName: 'Gold Tier Limit',
            scope: 'product',
            isLocked: false,
            properties: { calls: 1000, renewalPeriod: 3600, counterKey: '@(context.Subscription.Id)' }
        },
        // 3. AI Generated Logic (Custom Block)
        {
            id: '3',
            type: 'custom-xml',
            displayName: 'AI Generated Auth Logic',
            scope: 'api',
            isLocked: false,
            customXmlContent: `<!-- AI GENERATED: Complex Token Inspection -->
        <choose>
            <when condition="@(context.Request.Headers.GetValueOrDefault("Authorization","").Contains("Bearer"))">
                <validate-jwt header-name="Authorization" failed-validation-error-message="Invalid Token" />
            </when>
            <otherwise>
                <return-response>
                    <set-status code="401" reason="Unauthorized" />
                </return-response>
            </otherwise>
        </choose>`,
            properties: {}
        }
    ],
    backend: [
        { id: '4', type: 'base', displayName: 'Forward to Backend', scope: 'global', isLocked: true, xmlSnippet: '<base />', properties: {} }
    ],
    outbound: [],
    onError: []
};

console.log("--- START GENERATED XML ---");
console.log(generatePolicyXml(HYBRID_FLOW));
console.log("--- END GENERATED XML ---");
