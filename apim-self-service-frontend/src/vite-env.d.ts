/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
    readonly VITE_WORKFLOW_API_URL?: string;
    readonly VITE_AZURE_CLIENT_ID?: string;
    readonly VITE_AZURE_TENANT_ID?: string;
    readonly VITE_USE_MOCK_AUTH?: string;
    readonly VITE_USE_MOCKS?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
