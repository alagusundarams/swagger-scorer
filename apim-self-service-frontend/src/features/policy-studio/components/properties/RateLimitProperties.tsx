import { type PolicyStep } from '../../types/policyTypes';

interface Props {
    step: PolicyStep;
    onChange: (updatedProperties: Record<string, any>) => void;
}

export const RateLimitProperties = ({ step, onChange }: Props) => {
    const { calls = 10, renewalPeriod = 60, counterKey = '@(context.Subscription.Id)' } = step.properties;

    const handleChange = (field: string, value: any) => {
        onChange({ ...step.properties, [field]: value });
    };

    return (
        <div className="space-y-6">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    Allowed Calls
                </label>
                <input
                    type="number"
                    value={calls}
                    onChange={(e) => handleChange('calls', parseInt(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. 10"
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    Renewal Period (Sec)
                </label>
                <input
                    type="number"
                    value={renewalPeriod}
                    onChange={(e) => handleChange('renewalPeriod', parseInt(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. 60"
                />
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    Counter Key (Unique ID)
                </label>
                <select
                    value={counterKey}
                    onChange={(e) => handleChange('counterKey', e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="@(context.Subscription.Id)">Subscription ID (Standard)</option>
                    <option value="@(context.Request.IpAddress)">Client IP Address</option>
                    <option value="@(context.User.Id)">User ID</option>
                </select>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                    ℹ️ This will limit clients to <strong>{calls}</strong> calls every <strong>{renewalPeriod}</strong> seconds.
                </p>
            </div>
        </div>
    );
};
