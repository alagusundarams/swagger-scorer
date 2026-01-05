import { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInventoryStore, inventoryApi, getUserRoleForProduct } from '../../features/inventory';
import { useAuth } from '../../features/auth';
import { Environment } from '../../core/types/commonTypes';
import { OnboardingApiPolicyStep } from '../../features/provisioning';
import { ApiOperation } from '../../utils/swaggerParser';
import toast from 'react-hot-toast';

export const PolicyEditorPage = () => {
    const { productId, apiId } = useParams<{ productId: string; apiId: string }>();
    const navigate = useNavigate();
    const { products, loadProducts } = useInventoryStore();
    const { user } = useAuth();

    // Data Selectors
    const product = useMemo(() => products.find((p: any) => p.id === productId), [products, productId]);
    const api = useMemo(() => product?.apis.find((a: any) => a.id === apiId), [product, apiId]);

    // Check Governance Mode
    const isTerraformManaged = product?.managementMode === 'TERRAFORM_MANAGED';

    // State management
    const [specContent, setSpecContent] = useState<string>('');


    // New: Product Policy State
    const [productPolicyXml, setProductPolicyXml] = useState<string>('');
    const [env, setEnv] = useState<Environment>(product?.environment || 'DEV');

    useEffect(() => {
        if (product?.environment) {
            setEnv(product.environment);
        }
    }, [product?.environment]);

    useEffect(() => {
        const load = async () => {
            if (productId) {
                console.log(`[PolicyEditor] Loading data for ${productId}...`);
                try {
                    // Parallel Fetch
                    const [specData, productPolicyData] = await Promise.all([
                        inventoryApi.getProductSpec(productId),
                        inventoryApi.getProductPolicy(productId).catch(() => ({ policyXml: '' })) // Graceful fail for new/legacy
                    ]);

                    console.log(`[PolicyEditor] Data loaded successfully for ${productId}`);
                    setSpecContent(specData.spec);
                    setProductPolicyXml(productPolicyData.policyXml);

                } catch (e) {
                    console.error("[PolicyEditor] Failed to load editor data", e);
                    toast.error("Failed to load product data");
                }
            }
        };
        load();
    }, [productId]);

    // Mapper: Inventory.Operation -> SwaggerParser.ApiOperation
    const operations: ApiOperation[] = useMemo(() => {
        if (!api?.operations) return [];
        return api.operations.map((op: any) => ({
            id: op.id, // Keep the real ID
            method: op.method,
            path: op.urlTemplate,
            summary: op.displayName,
            description: op.description
        }));
    }, [api]);

    // Save Action
    const handleSave = async (_policies: any, newProductPolicyXml?: string) => {
        if (!productId) return;
        try {
            // 2. Save Product Policy if changed
            if (newProductPolicyXml && newProductPolicyXml !== productPolicyXml) {
                await inventoryApi.updateProductPolicy(productId, newProductPolicyXml);
                toast.success("Product Policy saved!");
            }

            toast.success("Configuration saved successfully!");
        } catch (e) {
            toast.error("Failed to save configuration");
        }
    };

    // Eject Action (Optimistic UI update)
    const handleEject = async () => {
        if (!window.confirm("⚠️ EJECT CONFIRMATION ⚠️\n\nThis will permanently disconnect this product from Terraform management.\n\nThe system will:\n1. Snapshot the current policy.\n2. Create configuration/secrets for hardcoded values.\n3. Enable full Self-Service editing.\n\nAre you sure?")) {
            return;
        }

        try {
            await inventoryApi.ejectProduct(productId!);
            toast.success("Product ejected to Self-Service!");

            // Reload inventory to reflect new state
            await loadProducts();
        } catch (error: any) {
            toast.error("Failed to eject product: " + error.message);
        }
    };

    // --------------------------------------------------------------------------------
    // 🔒 SECURITY GUARD: PRODUCER ONLY
    // --------------------------------------------------------------------------------
    // If the user does NOT have a producer role (Owner/Admin) for this product,
    // they are strictly forbidden from entering the Policy Studio.
    const userRole = getUserRoleForProduct(product || {} as any, user);

    // Redirect Effect
    useEffect(() => {
        if (product && user && userRole === 'consumer' && user.role !== 'admin') {
            toast.error("Security Alert: You do not have permission to edit policies.");
            navigate(`/products/${productId}`);
        }
    }, [product, user, userRole, navigate, productId]);

    // Render Guard (Prevent Flash)
    if (userRole === 'consumer' && user?.role !== 'admin') {
        return null;
    }
    // --------------------------------------------------------------------------------

    if (!product || !api) return <div className="p-8 text-center text-slate-500">Loading Configuration...</div>;

    return (
        <div className="h-screen w-full bg-slate-50 flex flex-col">
            {/* Header Override to mimic Main Layout but Full Screen */}
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg z-50">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition-colors">
                        ← Back
                    </button>
                    <div>
                        <h1 className="font-black text-lg tracking-tight">{api.displayName}</h1>
                        <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">Policy Configuration Context</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Read Only Indicator */}
                    {isTerraformManaged ? (
                        <div className="flex items-center gap-3">
                            <div className="px-3 py-1 bg-amber-500/20 text-amber-500 border border-amber-500/50 rounded text-[10px] font-bold uppercase flex items-center gap-2 animate-pulse">
                                🔒 MANAGED BY TERRAFORM
                            </div>
                            {/* EJECT BUTTON */}
                            <button
                                onClick={handleEject}
                                className="px-3 py-1 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-2"
                            >
                                ⚠️ Eject to Self-Service
                            </button>
                        </div>
                    ) : (
                        <span className="px-2 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-[10px] font-bold uppercase">
                            Write Mode Active
                        </span>
                    )}
                </div>
            </div>

            {/* The Studio */}
            <div className="flex-1 overflow-hidden relative">
                <div className="absolute inset-0">
                    <OnboardingApiPolicyStep
                        onBack={() => navigate(-1)}
                        onNext={handleSave}
                        specContent={specContent}
                        preParsedOperations={operations}
                        readOnly={isTerraformManaged}
                        productPolicyXml={productPolicyXml}
                        environment={env}
                        onEnvironmentChange={setEnv}
                    />
                </div>
            </div>
        </div>
    );
};
