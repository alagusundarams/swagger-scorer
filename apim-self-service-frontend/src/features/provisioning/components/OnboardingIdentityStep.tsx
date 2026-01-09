import React, { useEffect, useState, useRef } from 'react';
import { inventoryApi } from '../../inventory/api/inventoryClient';
import type { Team, Product } from '../../../shared/types/domain';

/**
 * ------------------------------------------------------------------
 * 📍 Component: OnboardingIdentityStep
 * ------------------------------------------------------------------
 * 🔄 RESPONSIBILITY:
 * - First step in the onboarding wizard focusing on API Identity.
 * - Collects the API Display Name, Technical Name, and URL Suffix.
 * - Enforces technical naming conventions (slugification).
 * - **NEW**: Enforces App Registration (Identity) Linking.
 * 
 * 📥 DATA INFLOW:
 * - `formData`: Initial state from the master wizard store.
 * ------------------------------------------------------------------
 */
export interface OnboardingIdentityStepProps {
    formData: {
        name: string;
        version: string;
        description: string;
        ownerTeamId: string;
        appIdentity?: {
            clientId: string;
            appIdUri: string;
            displayName?: string;
            type: 'PRODUCT' | 'API';
        };
    };
    intent: 'new' | 'existing';
    selectedProduct?: Product;
    onChange: (data: any) => void;
    onNext: () => void;
    userTeams: Team[];
    environment: string;
    isNameDuplicate?: boolean;
    onShowGuide?: () => void;
}

/**
 * Onboarding Step: Identity & Ownership
 */
export const OnboardingIdentityStep: React.FC<OnboardingIdentityStepProps> = ({
    formData,
    intent,
    selectedProduct,
    onChange,
    onNext,
    userTeams,
    environment,
    isNameDuplicate,
    onShowGuide
}) => {
    // Search State
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Identity State (sync to formData)
    const appIdentity = formData.appIdentity || { clientId: '', appIdUri: '', type: intent === 'new' ? 'PRODUCT' : 'API' };

    // Search Logic
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchTerm.length >= 2) {
                setIsSearching(true);
                try {
                    const results = await inventoryApi.searchAzureIdentities(searchTerm);
                    setSearchResults(results);
                    setShowDropdown(true);
                } catch (err) {
                    console.error("Search failed", err);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults([]);
                setShowDropdown(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelectApp = (app: any) => {
        onChange({
            ...formData,
            appIdentity: {
                ...appIdentity,
                clientId: app.clientId,
                appIdUri: app.appIdUri || '',
                displayName: app.displayName
            }
        });
        setSearchTerm('');
        setShowDropdown(false);
    };

    // Auto-Inheritance Logic (One-time sync)
    useEffect(() => {
        if (intent === 'existing' && selectedProduct) {
            const hasParentIdentity = selectedProduct.identity?.clientId;
            const isGrp = selectedProduct.type === 'grp';

            if (hasParentIdentity && !isGrp) {
                // Parent has ID and NOT a GRP -> Inherit -> Clear local identity inputs
                if (formData.appIdentity !== undefined) {
                    onChange({ ...formData, appIdentity: undefined });
                }
            } else {
                // Parent has NO ID OR is a GRP -> API must provide one -> Default to type API if not set
                if (!formData.appIdentity?.type) {
                    onChange({
                        ...formData,
                        appIdentity: { ...appIdentity, type: 'API' }
                    });
                }
            }
        }
    }, [selectedProduct, intent]);


    // Validation
    const isGuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const isIdentityValid = () => {
        if (intent === 'new') {
            // Must have valid client ID (GUID) and URI
            const validId = appIdentity.clientId && isGuid(appIdentity.clientId);
            return validId && appIdentity.appIdUri;
        } else {
            // Existing
            if (!selectedProduct) return false;
            // If parent has identity, we are valid (inherited)
            if (selectedProduct.identity?.clientId) return true;
            // If parent has NO identity, we must provide one
            const validId = appIdentity.clientId && isGuid(appIdentity.clientId);
            return validId && appIdentity.appIdUri;
        }
    };

    const isClientIdValid = appIdentity.clientId ? isGuid(appIdentity.clientId) : null;
    const isValid = formData.name && formData.ownerTeamId && /^[a-zA-Z0-9-_]+$/.test(formData.name) && isIdentityValid();

    return (
        <div className="animate-fade-in text-slate-900 dark:text-white p-10 flex-1 flex flex-col">
            <div className="mb-12">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-4">Step 2: Identity</p>
                <h2 className="text-4xl font-black tracking-tighter mb-2">Establish Identity</h2>
                <p className="text-gray-400 font-medium">Define the core attributes and security identity of your API.</p>
            </div>

            <div className="space-y-10 flex-1 overflow-y-auto pr-2">

                {/* CONTEXT READOUT */}
                <div className="bg-gray-50 dark:bg-slate-900 p-6 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${intent === 'new' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                            {intent === 'new' ? '🌱' : '🌿'}
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Onboarding Mode</div>
                            <div className="font-bold text-lg">{intent === 'new' ? 'New Product Offering' : `Adding API to ${selectedProduct?.displayName}`}</div>
                        </div>
                    </div>
                    <div className="px-4 py-1.5 rounded-full bg-white dark:bg-slate-800 shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-500 border border-gray-100 dark:border-slate-700">
                        Locked Intent
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                            {intent === 'new' ? 'New Product Name' : 'New API Name'}
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => onChange({ ...formData, name: e.target.value })}
                            className={`w-full px-8 py-5 bg-gray-50 dark:bg-slate-900 border-2 rounded-2xl font-bold text-lg focus:ring-4 focus:ring-blue-500/10 outline-none transition-all ${isNameDuplicate ? 'border-red-500 text-red-500' : 'border-transparent'}`}
                            placeholder="e.g. Payments_Gateway"
                        />
                        {isNameDuplicate && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest ml-1">Error: This name is already taken in {environment}</p>}
                        {formData.name && !/^[a-zA-Z0-9-_]+$/.test(formData.name) && (
                            <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest ml-1">
                                Invalid Name: Use only alphanumeric, dashes, or underscores.
                            </p>
                        )}
                    </div>

                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Initial Version</label>
                        <input
                            type="text"
                            value={formData.version}
                            onChange={(e) => onChange({ ...formData, version: e.target.value })}
                            className="w-full px-8 py-5 bg-gray-50 dark:bg-slate-900 border-none rounded-2xl font-bold text-lg focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                            placeholder="v1.0.0"
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => onChange({ ...formData, description: e.target.value })}
                        className="w-full px-8 py-5 bg-gray-50 dark:bg-slate-900 border-none rounded-2xl font-bold text-lg focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none h-32"
                        placeholder="Describe your resource..."
                    />
                </div>

                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Owner Team</label>
                    <select
                        value={formData.ownerTeamId}
                        onChange={(e) => onChange({ ...formData, ownerTeamId: e.target.value })}
                        className="w-full px-8 py-5 bg-gray-50 dark:bg-slate-900 border-none rounded-2xl font-bold text-lg appearance-none focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                    >
                        <option value="">Select Ownership Group</option>
                        {userTeams.map(team => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                    </select>
                </div>

                {/* IDENTITY SECTION */}
                <div className="pt-8 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-black">App Identity (App Registration)</h3>
                        <button
                            onClick={(e) => { e.preventDefault(); onShowGuide?.(); }}
                            className="text-[10px] font-bold uppercase tracking-widest text-blue-500 hover:outline-none hover:text-blue-700 transition-colors"
                        >
                            What is this?
                        </button>
                    </div>

                    {intent === 'existing' && selectedProduct?.identity?.clientId ? (
                        // INHERITANCE MESSAGE
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-800 flex items-center gap-4">
                            <div className="p-3 bg-blue-500 rounded-full text-white">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div>
                                <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-1">Inheriting Identity</h4>
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    This API will inherit the identity <strong>{selectedProduct.identity.displayName}</strong> ({selectedProduct.identity.clientId}) from the parent product. No separate registration needed.
                                </p>
                            </div>
                        </div>
                    ) : (
                        // INPUT FIELDS
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3 relative" ref={dropdownRef}>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex justify-between">
                                        <span>Client ID (Search by Name or ID)</span>
                                        {isClientIdValid === true && <span className="text-green-500">✓ Valid GUID</span>}
                                        {isClientIdValid === false && <span className="text-red-500">⚠ Invalid GUID</span>}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={searchTerm || appIdentity.clientId}
                                            onChange={(e) => {
                                                setSearchTerm(e.target.value);
                                                onChange({ ...formData, appIdentity: { ...appIdentity, clientId: e.target.value } });
                                            }}
                                            onFocus={() => searchTerm.length >= 2 && setShowDropdown(true)}
                                            className={`w-full px-6 py-4 bg-white dark:bg-black border rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none pr-12 transition-all ${isClientIdValid === false
                                                ? 'border-red-300 text-red-500 focus:ring-red-500/20'
                                                : isClientIdValid === true
                                                    ? 'border-green-300 text-slate-900 dark:text-white focus:ring-green-500/20'
                                                    : 'border-gray-200 dark:border-gray-800'
                                                }`}
                                            placeholder="Search application name or ID..."
                                        />
                                        {isSearching && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        )}
                                    </div>

                                    {showDropdown && searchResults.length > 0 && (
                                        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                                            {searchResults.map((app) => (
                                                <div
                                                    key={app.clientId}
                                                    onClick={() => handleSelectApp(app)}
                                                    className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer border-b border-gray-50 dark:border-slate-800 last:border-0"
                                                >
                                                    <div className="font-bold text-sm text-slate-900 dark:text-white">{app.displayName}</div>
                                                    <div className="text-[10px] font-mono text-slate-400 mt-1">{app.clientId}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">App ID URI</label>
                                    <input
                                        type="text"
                                        value={appIdentity.appIdUri}
                                        onChange={(e) => onChange({ ...formData, appIdentity: { ...appIdentity, appIdUri: e.target.value } })}
                                        className="w-full px-6 py-4 bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-xl font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="api://my-app-uri"
                                    />
                                </div>
                            </div>

                            {/* INTENT SELECTION / READOUT */}
                            <div className="p-1 bg-gray-50 dark:bg-gray-900 rounded-2xl flex border border-gray-100 dark:border-slate-800">
                                <button
                                    onClick={() => onChange({ ...formData, appIdentity: { ...appIdentity, type: 'API' } })}
                                    className={`flex-1 flex flex-col items-center py-4 px-2 rounded-xl transition-all ${appIdentity.type === 'API' ? 'bg-white dark:bg-slate-800 shadow-sm border border-orange-100 dark:border-orange-900/40' : 'opacity-40 hover:opacity-60'}`}
                                >
                                    <div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${appIdentity.type === 'API' ? 'text-orange-500' : 'text-gray-400'}`}>Isolated</div>
                                    <div className="text-xs font-bold font-mono">API Level</div>
                                </button>
                                <button
                                    onClick={() => {
                                        if (intent === 'new') {
                                            onChange({ ...formData, appIdentity: { ...appIdentity, type: 'PRODUCT' } });
                                        }
                                    }}
                                    className={`flex-1 flex flex-col items-center py-4 px-2 rounded-xl transition-all ${appIdentity.type === 'PRODUCT' ? 'bg-white dark:bg-slate-800 shadow-sm border border-purple-100 dark:border-purple-900/40' : 'opacity-40 hover:opacity-60'} ${intent === 'existing' ? 'cursor-not-allowed grayscale-[0.5]' : ''}`}
                                    disabled={intent === 'existing'}
                                >
                                    <div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${appIdentity.type === 'PRODUCT' ? 'text-purple-500' : 'text-gray-400'}`}>Shared</div>
                                    <div className="text-xs font-bold font-mono">Product Level</div>
                                </button>
                            </div>

                            <div className="px-6 py-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-50 dark:border-blue-900/20">
                                <p className="text-[10px] text-blue-600 dark:text-blue-400 leading-relaxed font-medium">
                                    {intent === 'existing'
                                        ? "💡 This Product is isolated (no shared identity). You must provide an API-Level identity for this implementation."
                                        : appIdentity.type === 'PRODUCT'
                                            ? "💡 Shared: This identity will be linked to the Product record and automatically inherited by all new APIs added to this product."
                                            : "💡 Isolated: This identity is linked only to this specific API. Future APIs in this product will require their own identities."}
                                </p>
                            </div>
                            <div className="p-4 bg-orange-50/50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-900/20">
                                <p className="text-xs text-orange-700 dark:text-orange-400 font-medium">
                                    Hey! If you don't have an App Registration yet, please raise a <strong>ServiceNow ticket</strong> to the <strong>Cloud Ops</strong> team. We are working on embedding this into the portal soon!
                                </p>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-50 dark:border-slate-700/30">
                <div className="text-gray-300 font-black text-[10px] uppercase tracking-widest">
                    Identity Enforcement Active
                </div>
                <button
                    onClick={onNext}
                    disabled={!isValid}
                    className={`px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 ${isValid
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:scale-105 active:scale-95'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    Establish Identity
                </button>
            </div>
        </div>
    );
};
