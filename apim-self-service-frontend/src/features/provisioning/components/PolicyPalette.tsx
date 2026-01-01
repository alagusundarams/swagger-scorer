import { PolicyAssistant } from './PolicyAssistant';
import { PolicyTemplate } from './policyTemplates';

interface PolicyPaletteProps {
    readOnly: boolean;
    handleAddPolicy: (template: PolicyTemplate) => void;
}

export const PolicyPalette = ({ readOnly, handleAddPolicy }: PolicyPaletteProps) => {
    return (
        <div className="w-[300px] border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shadow-2xl z-20">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Policy Palette</h3>
                <p className="text-[10px] text-slate-400 mt-1">Drag or click to add policies</p>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                {readOnly ? (
                    <div className="p-4 text-center text-xs text-slate-400 italic">
                        Read-Only Mode
                    </div>
                ) : (
                    <PolicyAssistant onSelectTemplate={handleAddPolicy} className="border-none shadow-none" />
                )}
            </div>
        </div>
    );
};
