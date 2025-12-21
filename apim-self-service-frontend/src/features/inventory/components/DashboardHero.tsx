
interface DashboardHeroProps {
    activeTab: 'produced' | 'consumed' | 'admin' | 'approvals';
}

export function DashboardHero({ activeTab }: DashboardHeroProps) {
    const titles = {
        produced: 'Your Provider Portfolio',
        consumed: 'Enterprise API Ecosystem',
        approvals: 'Governance Pipeline',
        admin: 'Global API Inventory'
    };

    const descriptions = {
        produced: "Manage your team's API lifecycle, monitor quality scores, and oversee consumer access guardrails.",
        consumed: "Securely discover and consume high-integrity interfaces vetted by the Enterprise Architecture board.",
        approvals: "Review pending access requests and visibility changes with a security-first vetting mindset.",
        admin: "Full administrative visibility across the entire Everest Re API landscape."
    };

    return (
        <div className="mb-16">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mb-3 uppercase">
                        {titles[activeTab]}
                    </h1>
                    <p className="text-gray-500 dark:text-slate-400 text-lg font-medium max-w-2xl leading-relaxed">
                        {descriptions[activeTab]}
                    </p>
                </div>
            </div>
        </div>
    );
}
