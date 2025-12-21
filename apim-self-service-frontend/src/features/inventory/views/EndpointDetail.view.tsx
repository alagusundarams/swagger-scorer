import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../../../layouts/MainLayout/MainLayout.view';
import { useStore } from '../../../store/useStore';
import { EndpointHeader } from '../components/EndpointHeader';
import { RequestDefinitionCard } from '../components/RequestDefinitionCard';
import { ResponseStatesCard } from '../components/ResponseStatesCard';
import { EndpointImplementationGuide } from '../components/EndpointImplementationGuide';

/**
 * EndpointDetailPage: Deep-dive into a specific API Operation.
 * 
 * CAPABILITIES:
 * - Technical details (Request/Response schemas)
 * - Method-specific visual cues
 * - Sandbox integration (Planned)
 * - store-isolated data hierarchy resolution
 */

export const EndpointDetailPage = () => {
    const { productId, apiId, operationId } = useParams<{ productId: string; apiId: string; operationId: string }>();
    const navigate = useNavigate();

    // --- Store Integration ---
    const { products } = useStore();

    // --- Data Selectors (Hierarchical Resolution) ---
    const product = useMemo(() => products.find(p => p.id === productId), [products, productId]);
    const api = useMemo(() => product?.apis.find(a => a.id === apiId), [product, apiId]);
    const operation = useMemo(() => api?.operations.find(o => o.id === operationId), [api, operationId]);

    // Handle missing data
    if (!product || !api || !operation) {
        return (
            <MainLayout>
                <div className="max-w-7xl mx-auto px-6 py-20 text-center">
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-4 uppercase tracking-tighter">Endpoint not located</h1>
                    <button
                        onClick={() => navigate('/')}
                        className="px-8 py-4 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl"
                    >
                        Back to Control Center
                    </button>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <EndpointHeader operation={operation} />

            <main className="max-w-7xl mx-auto px-6 py-14">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-10">
                        <RequestDefinitionCard api={api} operation={operation} />
                    </div>

                    <div className="space-y-10">
                        <ResponseStatesCard />

                        <div className="animate-fade-in">
                            <EndpointImplementationGuide
                                product={product}
                                api={api}
                                operation={operation}
                            />
                        </div>
                    </div>
                </div>
            </main>
        </MainLayout >
    );
};
