import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PolicyCardProps {
    id: string;
    onRemove?: () => void;
    children: React.ReactNode;
    readOnly?: boolean;
}

export const PolicyCard: React.FC<PolicyCardProps> = ({ id, onRemove, children, readOnly = false }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id, disabled: readOnly });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 50 : undefined
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                group relative bg-white dark:bg-slate-900 
                border ${isDragging ? 'border-purple-500 shadow-2xl' : 'border-slate-100 dark:border-slate-800'} 
                rounded-2xl p-6 transition-all duration-300 hover:border-purple-200 dark:hover:border-purple-900/50
                ${isDragging ? 'scale-[1.02]' : 'hover:shadow-md'}
                text-left
            `}
        >
            {/* Drag Handle */}
            {!readOnly && (
                <div
                    {...attributes}
                    {...listeners}
                    className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <div className="grid grid-cols-2 gap-1">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
                        ))}
                    </div>
                </div>
            )}

            {/* Remove Button */}
            {!readOnly && onRemove && (
                <button
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="absolute right-4 top-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}

            {/* Content (Title/Description/Form) */}
            <div className={readOnly ? '' : 'pl-4'}>
                {children}
            </div>
        </div>
    );
};
