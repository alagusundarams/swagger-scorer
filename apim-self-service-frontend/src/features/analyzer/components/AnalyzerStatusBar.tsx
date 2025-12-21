import React from 'react';

interface AnalyzerStatusBarProps {
    lineCount: number;
}

export const AnalyzerStatusBar: React.FC<AnalyzerStatusBarProps> = ({ lineCount }) => {
    return (
        <div className="bg-[#1e1e1e] border-t border-[#333] text-gray-500 px-3 py-1 flex justify-between items-center text-[11px] shrink-0">
            <div className="flex gap-4">
                <span>YAML</span>
                <span>UTF-8</span>
            </div>
            <div>
                <span>Ln {lineCount}, Col 1</span>
            </div>
        </div>
    );
};
