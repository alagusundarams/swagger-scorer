/**
 * Admin - Custom Hooks
 */
import { useState } from 'react';

export function useAdmin() {
    const [loading] = useState(false);
    const [data] = useState<any>(null);

    return { loading, data };
}
