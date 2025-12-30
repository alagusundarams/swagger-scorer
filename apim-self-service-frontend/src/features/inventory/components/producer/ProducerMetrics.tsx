import { StatCard } from './StatCard';
import { type Product } from '../../types/inventoryTypes';

interface ProducerMetricsProps {
    qualityScore: number;
    subscriberCount: number;
    apiCount: number;
    getScoreColor: (score: number) => string;
}

export function ProducerMetrics({
    qualityScore,
    subscriberCount,
    apiCount,
    getScoreColor
}: ProducerMetricsProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Quality Score Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
                <div className="text-sm font-bold text-gray-500 dark:text-slate-400 mb-4">Quality Score</div>
                <div className={`text-5xl font-black ${getScoreColor(qualityScore)} mb-2`}>
                    {qualityScore}%
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-500">
                    {qualityScore >= 90 ? 'Excellent' : qualityScore >= 70 ? 'Good' : 'Needs Improvement'}
                </div>
            </div>

            {/* Subscribers Card - Real-time count */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
                <div className="text-sm font-bold text-gray-500 dark:text-slate-400 mb-4">Subscribers</div>
                <div className="text-5xl font-black text-blue-500 mb-2">
                    {subscriberCount}
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-500">
                    Active teams using this API
                </div>
            </div>

            {/* APIs Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
                <div className="text-sm font-bold text-gray-500 dark:text-slate-400 mb-4">Interfaces</div>
                <div className="text-5xl font-black text-gray-900 dark:text-white mb-2">
                    {apiCount}
                </div>
                <div className="text-xs text-gray-500 dark:text-slate-500">
                    APIs in this product
                </div>
            </div>
        </div>
    );
}
