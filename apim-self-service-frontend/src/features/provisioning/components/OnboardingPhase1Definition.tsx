import { useState } from 'react';
import { OnboardingStepIdentity } from './OnboardingStepIdentity';
import { Team } from '../../../types/entities';

interface Props {
    onNext: () => void;
    isNameDuplicate?: boolean;
    formData: any;
    onChange: (data: any) => void;
    userTeams: Team[];
}

export const OnboardingPhase1Definition = ({ onNext, isNameDuplicate, formData, onChange, userTeams }: Props) => {
    const [swaggerFile, setSwaggerFile] = useState<File | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanResults, setScanResults] = useState<{
        score: number;
        pathConflict: boolean;
        namedValueConflicts: string[];
    } | null>(null);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) {
            setSwaggerFile(file);
            // Simulate extracting name from file
            onChange({ ...formData, name: file.name.replace('.yaml', '').replace('.json', ''), description: 'Imported from spec' });
        }
    };

    const runValidation = () => {
        setIsScanning(true);
        // Mocking the "Global Conflict Guard" scan
        setTimeout(() => {
            setIsScanning(false);
            setScanResults({
                score: 98, // Mock Score > 95
                pathConflict: false, // Mock Unique Path
                namedValueConflicts: [] // No conflicts
            });
        }, 1500);
    };

    return (
        <div className="flex h-full">
            {/* Left: Manual Entry via Identity Form */}
            <div className="w-1/2 p-12 border-r border-gray-100 dark:border-slate-700/50 overflow-y-auto">
                <OnboardingStepIdentity
                    formData={formData}
                    onChange={onChange}
                    onNext={onNext}
                    userTeams={userTeams}
                />

                {/* Duplicate Name Error */}
                {isNameDuplicate && (
                    <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm font-bold flex items-center gap-2 animate-pulse">
                        <span>⛔ Product name already exists. Please choose another.</span>
                    </div>
                )}
            </div>

            {/* Right: File Import & Validator */}
            <div className="w-1/2 p-12 bg-gray-50/50 dark:bg-slate-900/50">
                <div className="space-y-8">
                    <div className="text-center space-y-2">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white">Import Definition</h2>
                        <p className="text-sm text-gray-500">Alternatively, drag & drop your OpenAPI spec.</p>
                    </div>

                    {/* Drag & Drop Zone */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                        className={`border-4 border-dashed rounded-3xl p-12 text-center transition-all ${swaggerFile
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                            : 'border-gray-200 dark:border-slate-700 hover:border-blue-400'
                            }`}
                    >
                        {swaggerFile ? (
                            <div>
                                <div className="text-4xl mb-4">📄</div>
                                <div className="font-bold text-xl">{swaggerFile.name}</div>
                                <p className="text-green-600 font-bold mt-2">Ready for Scan</p>
                            </div>
                        ) : (
                            <div>
                                <div className="text-4xl mb-4 text-gray-300">📥</div>
                                <p className="font-bold text-lg text-gray-500">Drag & Drop OpenAPI / Swagger YAML</p>
                            </div>
                        )}
                    </div>

                    {/* Validation Controls */}
                    {swaggerFile && !scanResults && (
                        <div className="flex justify-center">
                            <button
                                onClick={runValidation}
                                disabled={isScanning}
                                className="px-8 py-4 bg-indigo-600 text-white rounded-xl font-black text-lg shadow-xl hover:bg-indigo-700 transition flex items-center gap-3"
                            >
                                {isScanning && <span className="animate-spin">⏳</span>}
                                {isScanning ? 'Scanning...' : 'Run Analysis'}
                            </button>
                        </div>
                    )}

                    {/* Results */}
                    {scanResults && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl text-center">
                                <div className="text-sm font-bold text-green-800 dark:text-green-300 uppercase tracking-wide">Analysis Score</div>
                                <div className="text-3xl font-black text-green-600 dark:text-green-400">{scanResults.score}%</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
