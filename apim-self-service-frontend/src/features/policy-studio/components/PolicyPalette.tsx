import { type PolicyStepType } from '../types/policyTypes';

interface PaletteItem {
    type: PolicyStepType;
    label: string;
    icon: string;
    description: string;
}

const PALETTE_CATEGORIES: { name: string; items: PaletteItem[] }[] = [
    {
        name: 'Security',
        items: [
            { type: 'validate-jwt', label: 'Validate JWT', icon: '🛡️', description: 'Enforce Auth' },
            { type: 'ip-filter', label: 'IP Filter', icon: '🛑', description: 'Allow/Block IPs' },
            { type: 'cors', label: 'CORS', icon: '🌐', description: 'Cross-origin' },
        ]
    },
    {
        name: 'Traffic Control',
        items: [
            { type: 'rate-limit', label: 'Rate Limit', icon: '🚦', description: 'Call quotas' },
            { type: 'mock-response', label: 'Mock Response', icon: '🎭', description: 'Simulate Backend' },
        ]
    },
    {
        name: 'Transformation',
        items: [
            { type: 'set-header', label: 'Set Header', icon: '📝', description: 'Add/Remove headers' },
            { type: 'set-variable', label: 'Set Variable', icon: '📦', description: 'Context variables' },
            { type: 'fragment', label: 'Include Fragment', icon: '🧩', description: 'Reusable logic' },
        ]
    },
    {
        name: 'Advanced',
        items: [
            { type: 'custom-xml', label: 'Custom Logic', icon: '⚡', description: 'Raw XML / C#' },
        ]
    }
];

export const PolicyPalette = () => {
    const handleDragStart = (e: React.DragEvent, type: PolicyStepType) => {
        e.dataTransfer.setData('policy-type', type);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                <h2 className="font-black text-xs uppercase tracking-widest text-gray-500">Policy Palette</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {PALETTE_CATEGORIES.map((cat) => (
                    <div key={cat.name}>
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{cat.name}</h3>
                        <div className="space-y-2">
                            {cat.items.map((item) => (
                                <div
                                    key={item.type}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, item.type)}
                                    className="flex items-center gap-3 p-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-sm cursor-grab hover:border-blue-400 hover:shadow-md transition group"
                                >
                                    <span className="text-xl">{item.icon}</span>
                                    <div>
                                        <div className="text-sm font-bold text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                                            {item.label}
                                        </div>
                                        <div className="text-[10px] text-gray-400">{item.description}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
