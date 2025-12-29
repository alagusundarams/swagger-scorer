/**
 * Consumer - Custom Hooks
 */
import { useState } from 'react';

export function useMarketplace() {
    const [loading] = useState(false);
    const [products] = useState<any[]>([]);

    return { loading, products };
}
