import { useState } from 'react';

interface Props {
    onNext: () => void;
}

export const OnboardingPhase1Definition = ({ onNext }: Props) => {
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
        if (file) setSwaggerFile(file);
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
        <div className="p-12 space-y-8">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white">Phase 1: Definition</h2>
                <p className="text-gray-500">Upload your contract. We'll check for global conflicts and quality issues.</p>
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
                        {isScanning ? 'Scanning Global Inventory...' : 'Run Global Conflict Scan'}
                    </button>
                </div>
            )}

            {/* Results */}
            {scanResults && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl text-center">
                            <div className="text-sm font-bold text-green-800 dark:text-green-300 uppercase tracking-wide">Quality Score</div>
                            <div className="text-3xl font-black text-green-600 dark:text-green-400">{scanResults.score}%</div>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl text-center">
                            <div className="text-sm font-bold text-green-800 dark:text-green-300 uppercase tracking-wide">Path Conflict</div>
                            <div className="text-3xl font-black text-green-600 dark:text-green-400">NONE</div>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-xl text-center">
                            <div className="text-sm font-bold text-green-800 dark:text-green-300 uppercase tracking-wide">Named Values</div>
                            <div className="text-3xl font-black text-green-600 dark:text-green-400">CLEAN</div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-8 border-t dark:border-slate-700">
                        <button
                            onClick={onNext}
                            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:scale-[1.02] transition"
                        >
                            Proceed to Policy Studio →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
