import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
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

// Draggable Item Component (Internal)
const DraggablePaletteItem = ({ item, isCollapsed }: { item: PaletteItem; isCollapsed: boolean }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `palette-${item.type}`,
        data: {
            type: 'palette-item',
            policyType: item.type,
            template: item
        }
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.6 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            title={isCollapsed ? item.label : undefined}
            className={`flex items-center ${isCollapsed ? 'justify-center p-2' : 'gap-3 p-3'} bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg shadow-sm cursor-grab hover:border-blue-400 hover:shadow-md transition group ${isDragging ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
        >
            <span className="text-xl">{item.icon}</span>
            {!isCollapsed && (
                <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-700 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition truncate">
                        {item.label}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate">{item.description}</div>
                </div>
            )}
        </div>
    );
};

export const PolicyPalette = () => {
    const [isCollapsed, setIsCollapsed] = React.useState(false);

    return (
        <div className={`flex flex-col h-full transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`}>
            <div className={`p-4 border-b border-gray-200 dark:border-slate-700 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                {!isCollapsed && <h2 className="font-black text-xs uppercase tracking-widest text-gray-500">Palette</h2>}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-600 text-gray-400 transition"
                >
                    {isCollapsed ? '➡️' : '⬅️'}
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {PALETTE_CATEGORIES.map((cat) => (
                    <div key={cat.name} className={isCollapsed ? 'text-center' : ''}>
                        {!isCollapsed && <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">{cat.name}</h3>}
                        <div className="space-y-2">
                            {cat.items.map((item) => (
                                <DraggablePaletteItem key={item.type} item={item} isCollapsed={isCollapsed} />
                            ))}
                        </div>
                        {isCollapsed && <div className="h-px bg-slate-200 dark:bg-slate-700 my-4 mx-2"></div>}
                    </div>
                ))}
            </div>
        </div>
    );
};
