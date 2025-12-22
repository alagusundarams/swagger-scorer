import { useState, useMemo, useRef, useEffect } from 'react';

interface Option {
    id: string;
    label: string;
    subLabel?: string;
}

interface TypeaheadProps {
    options: Option[];
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    disabled?: boolean;
    className?: string;
}

export function Typeahead({ options, value, onChange, placeholder = "Search...", label, disabled, className = "" }: TypeaheadProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Filter options based on search
    const filteredOptions = useMemo(() => {
        if (!search) return options.slice(0, 100); // Limit initial render for perf
        const lower = search.toLowerCase();
        return options
            .filter(o =>
                o.label.toLowerCase().includes(lower) ||
                o.subLabel?.toLowerCase().includes(lower) ||
                o.id.toLowerCase().includes(lower)
            )
            .slice(0, 100); // Cap results
    }, [options, search]);

    // Handle outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Selection Label
    const selectedOption = options.find(o => o.id === value);

    return (
        <div className={`relative ${className}`} ref={wrapperRef}>
            {label && <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{label}</label>}

            {/* Trigger / Input */}
            <div
                className={`w-full bg-white dark:bg-slate-900 border ${isOpen ? 'ring-2 ring-blue-500 border-transparent' : 'border-gray-200 dark:border-slate-700'} rounded-xl px-4 py-2.5 text-sm flex items-center justify-between cursor-text transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => !disabled && setIsOpen(true)}
            >
                {isOpen ? (
                    <input
                        autoFocus
                        type="text"
                        className="w-full bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-400"
                        placeholder={placeholder}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onClick={e => e.stopPropagation()}
                    />
                ) : (
                    <span className={selectedOption ? "text-slate-900 dark:text-white font-medium" : "text-slate-400"}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                )}

                <span className="text-slate-400 text-xs ml-2">
                    {isOpen ? '▲' : '▼'}
                </span>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 mt-2 w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 max-h-60 overflow-y-auto animate-fade-in">
                    {filteredOptions.length > 0 ? (
                        <div className="py-1">
                            {filteredOptions.map(option => (
                                <div
                                    key={option.id}
                                    className={`px-4 py-2 hover:bg-blue-50 dark:hover:bg-slate-700 cursor-pointer transition-colors ${option.id === value ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                                    onClick={() => {
                                        onChange(option.id);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                >
                                    <div className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                                        {option.label}
                                        {option.id === value && <span className="text-blue-600 text-[10px] uppercase font-bold tracking-wider">Selected</span>}
                                    </div>
                                    {option.subLabel && (
                                        <div className="text-xs text-slate-500 font-mono mt-0.5">{option.subLabel}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 text-center text-xs text-slate-500">
                            No matches found for "{search}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
