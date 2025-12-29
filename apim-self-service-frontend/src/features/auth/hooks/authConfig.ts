import { type Configuration, type PopupRequest } from '@azure/msal-browser';

/**
 * MSAL Configuration
 */
export const msalConfig: Configuration = {
    auth: {
        clientId: 'PLACEHOLDER-CLIENT-ID',
        authority: 'https://login.microsoftonline.com/common',
        redirectUri: window.location.origin,
    },
    cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: false,
    }
};

export const loginRequest: PopupRequest = {
    scopes: ['User.Read'],
};
