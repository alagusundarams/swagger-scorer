import React, { type ReactNode } from "react";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "./authConfig";

const msalInstance = new PublicClientApplication(msalConfig);

// Initialize the MSAL instance
// We shouldn't await this at the top level in some setups, but for SPA it's common to init before render
// or handle the promise inside the provider. 
// MsalProvider handles the instance, but v3 requires initialize() call.
msalInstance.initialize().catch(console.error);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    return (
        <MsalProvider instance={msalInstance}>
            {children}
        </MsalProvider>
    );
};
