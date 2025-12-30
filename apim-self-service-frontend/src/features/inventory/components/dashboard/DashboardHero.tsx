interface DashboardHeroProps {
    activeTab: 'produced' | 'consumed' | 'admin' | 'approvals';
}

export function DashboardHero({ activeTab }: DashboardHeroProps) {
    const titles = {
        produced: 'Your Provider Portfolio',
        consumed: 'Active Subscriptions',
        approvals: 'Governance Pipeline',
        admin: "Global Systems Overview"
    };

    const descriptions = {
        produced: "Manage your team's API lifecycle, monitor quality scores, and oversee consumer access guardrails.",
        consumed: "Monitor and manage your team's active API subscriptions and application credentials.",
        approvals: "Review pending access requests and visibility changes with a security-first vetting mindset.",
        admin: "High-level operational metrics and health status across all teams and environments."
    };

    return (
        <div className="mb-14">
            <div className="flex flex-col gap-4">
                <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">
                    {titles[activeTab]}
                </h1>
                <p className="text-gray-500 dark:text-slate-400 text-lg font-medium max-w-2xl leading-relaxed">
                    {descriptions[activeTab]}
                </p>
            </div>
        </div>
    );
}
