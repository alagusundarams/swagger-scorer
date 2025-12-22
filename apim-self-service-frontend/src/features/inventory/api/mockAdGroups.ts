// MOCK AD GROUPS (1000+)
// Simulates a large corporate directory for the "Admin Life" Typeahead demo.

const DEPARTMENTS = ['Engineering', 'Product', 'Sales', 'Marketing', 'HR', 'Finance', 'Legal', 'Operations', 'Security', 'Data'];
const ROLES = ['Admin', 'Viewer', 'Contributor', 'Owner', 'Member', 'Lead'];
const REGIONS = ['US', 'EU', 'APAC', 'LATAM'];

export interface AdGroup {
    id: string; // Object ID (GUID-like)
    displayName: string;
    description?: string;
}

const generateGroups = (count: number): AdGroup[] => {
    const groups: AdGroup[] = [];
    for (let i = 0; i < count; i++) {
        const dept = DEPARTMENTS[Math.floor(Math.random() * DEPARTMENTS.length)];
        const role = ROLES[Math.floor(Math.random() * ROLES.length)];
        const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];

        groups.push({
            id: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`,
            displayName: `GRP-${dept}-${region}-${role}-${i}`,
            description: `${role} access for ${dept} in ${region}`
        });
    }
    // Add some "known" specific ones for demo predictability
    groups.unshift(
        { id: 'uuid-checkout-squad', displayName: 'GRP-Engineering-CheckoutSquad', description: 'Core Checkout Team' },
        { id: 'uuid-platform-eng', displayName: 'GRP-Engineering-Platform', description: 'Platform Team' },
        { id: 'uuid-sec-ops', displayName: 'GRP-Security-Ops', description: 'SecOps Team' }
    );
    return groups;
};

export const MOCK_AD_GROUPS = generateGroups(1500);
