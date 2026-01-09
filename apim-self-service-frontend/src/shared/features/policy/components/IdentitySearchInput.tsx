
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { inventoryApi } from '../../../../features/inventory/api/inventoryClient';

interface IdentitySearchInputProps {
    value: string;
    onChange: (val: string) => void;
    readOnly?: boolean;
    placeholder?: string;
}

export const IdentitySearchInput = ({ value, onChange, readOnly, placeholder }: IdentitySearchInputProps) => {
    const [query, setQuery] = useState(value || '');
    const [results, setResults] = useState<{ clientId: string; displayName: string; appIdUri?: string }[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [valid, setValid] = useState<boolean | null>(null); // null if untouched/unknown

    const inputRef = useRef<HTMLInputElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

    // Sync internal state if prop changes (e.g. from parent update)
    useEffect(() => {
        setQuery(value);
    }, [value]);

    // Debounced Search
    useEffect(() => {
        if (readOnly || !isOpen || query.length < 3) return;

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await inventoryApi.searchAzureIdentities(query);
                setResults(res);
            } catch (err) {
                console.error("Search failed", err);
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
    }, [query, isOpen, readOnly]);

    // Validation Check (On Blur / Selection)
    const validateIdentity = async (clientId: string) => {
        if (!clientId) {
            setValid(null);
            return;
        }
        // Optimistic check: is it in our current results?
        const inResults = results.find(r => r.clientId === clientId);
        if (inResults) {
            setValid(true);
            return;
        }

        // Deep check logic (Optional: add a specific validate endpoint if needed, 
        // for now we trust the fact that if they selected it, it's valid. 
        // If they typed it manually, we might want to flag 'unknown' until saved/deployed or add a manual "Verify" button)
        // For this UI, we'll mark valid=true if it looks like a GUID, else warning.
        const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(clientId);
        setValid(isGuid);
    };

    const handleFocus = () => {
        if (!readOnly && inputRef.current) {
            const rect = inputRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: rect.width
            });
            setIsOpen(true);
        }
    };

    const handleSelect = (clientId: string) => {
        onChange(clientId);
        setQuery(clientId);
        setIsOpen(false);
        setValid(true);
    };

    return (
        <div className="relative w-full">
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        onChange(e.target.value); // Propagate immediately for typing
                        setValid(null); // Reset validation state on edit
                    }}
                    onFocus={handleFocus}
                    onBlur={() => {
                        // Delay closing to allow click on result
                        setTimeout(() => setIsOpen(false), 200);
                        validateIdentity(query);
                    }}
                    readOnly={readOnly}
                    placeholder={placeholder || "Search App by Name or Enter Client ID"}
                    className={`w-full h-11 bg-slate-50 dark:bg-slate-900 border rounded-xl px-4 pl-10 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 transition-all outline-none ${valid === false
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                        : valid === true
                            ? 'border-green-300 focus:border-green-500 focus:ring-green-500/20'
                            : 'border-slate-100 dark:border-slate-800 focus:ring-purple-500/20 focus:border-purple-500'
                        }`}
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {loading ? <span className="animate-spin block">↻</span> : '🔍'}
                </div>
                {valid === true && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-xs" title="Valid Client ID">
                        ✓
                    </div>
                )}
                {valid === false && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 text-xs" title="Invalid Format or Not Found">
                        ⚠
                    </div>
                )}
            </div>

            {isOpen && createPortal(
                <div
                    className="absolute z-[9999] bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                    style={{ top: coords.top, left: coords.left, width: coords.width }}
                >
                    {query.length < 3 ? (
                        <div className="p-3 text-[10px] text-slate-400 text-center font-bold">
                            Type 3+ chars to search Azure AD
                        </div>
                    ) : (
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            {results.length === 0 && !loading && (
                                <div className="p-3 text-[10px] text-slate-400 text-center">
                                    No results found
                                </div>
                            )}
                            {results.map((app) => (
                                <button
                                    key={app.clientId}
                                    onMouseDown={() => handleSelect(app.clientId)} // onMouseDown fires before Blur
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0 group"
                                >
                                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-purple-600">
                                        {app.displayName}
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <code className="text-[9px] bg-slate-100 dark:bg-black/30 px-1 rounded text-slate-500 font-mono">
                                            {app.clientId}
                                        </code>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                    {/* Fixed "Manual Entry" hint */}
                    <div className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-2 text-[9px] text-slate-400 text-center">
                        Or verify manual entry on save
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
