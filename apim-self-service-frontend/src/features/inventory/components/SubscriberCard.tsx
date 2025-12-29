import { useState } from 'react';
import type { Team } from '../../teams/types/teamTypes';
import type { Subscription } from '../../consumer/types/consumerTypes';

interface SubscriberCardProps {
    subscription: Subscription;
    team?: Team;
    isOwnerLead: boolean;
    onRevokeAccess: (subscriptionId: string) => void;
}

export function SubscriberCard({ subscription, team, isOwnerLead, onRevokeAccess }: SubscriberCardProps) {
    const [isKeyRevealed, setIsKeyRevealed] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const maskKey = (key: string) => {
        if (!key || key.length < 8) return '••••••••';
        return `${key.substring(0, 4)}••••••••${key.substring(key.length - 4)}`;
    };

    return (
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-lg">
            {/* Left: Subscriber Info + Keys + Lifecycle */}
            <div className="flex-1">
                {/* App Registration or Team Name */}
                {subscription.appRegistration ? (
                    <>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="font-bold text-gray-900 dark:text-white">
                                {subscription.appRegistration.displayName}
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${subscription.appRegistration.environment === 'PROD'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : subscription.appRegistration.environment === 'QA'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                }`}>
                                {subscription.appRegistration.environment}
                            </span>
                            {subscription.appRegistration.secretExpiryDate && (() => {
                                const expiryDate = new Date(subscription.appRegistration.secretExpiryDate);
                                const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                const isExpiringSoon = daysUntilExpiry <= 15 && daysUntilExpiry > 0;
                                if (isExpiringSoon) {
                                    return (
                                        <span className="text-xs text-orange-600 dark:text-orange-400">
                                            ⚠️ Secret expires in {daysUntilExpiry} days
                                        </span>
                                    );
                                }
                                return null;
                            })()}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-500 flex items-center gap-1 flex-wrap">
                            <span>{team?.name || subscription.subscriberTeamId}</span>
                            <span>•</span>
                            <span>Client ID:</span>
                            <code className="text-xs font-mono bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                {subscription.appRegistration.clientId}
                            </code>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(subscription.appRegistration!.clientId);
                                }}
                                className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                title="Copy Client ID"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                            <span>•</span>
                            <span>Subscribed {new Date(subscription.createdAt).toLocaleDateString()}</span>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="font-semibold text-gray-900 dark:text-white">
                            {team?.name || subscription.subscriberTeamId}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-500">
                            {team?.description || 'Team'} • Subscribed {new Date(subscription.createdAt).toLocaleDateString()}
                        </div>
                    </>
                )}

                {/* API Keys */}
                <div className="mt-4 flex flex-wrap gap-4">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{subscription.primaryKey.name} Key</span>
                        <div className="flex items-center gap-2">
                            <code className="bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded text-[10px] font-mono text-slate-600 dark:text-emerald-400">
                                {isKeyRevealed ? subscription.primaryKey.value : maskKey(subscription.primaryKey.value)}
                            </code>
                            <button
                                onClick={() => setIsKeyRevealed(!isKeyRevealed)}
                                className="text-[10px] text-blue-600 font-bold hover:underline"
                            >
                                {isKeyRevealed ? 'Hide' : 'Reveal'}
                            </button>
                        </div>
                    </div>
                    {subscription.secondaryKey && (
                        <div className="flex flex-col border-l border-gray-100 dark:border-slate-800 pl-4">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{subscription.secondaryKey.name} Key</span>
                            <code className="bg-slate-50 dark:bg-slate-950 px-3 py-1 rounded text-[10px] font-mono text-slate-400 dark:text-slate-600">
                                {isKeyRevealed ? subscription.secondaryKey.value : maskKey(subscription.secondaryKey.value)}
                            </code>
                        </div>
                    )}
                </div>

                {/* Subscription Lifecycle */}
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between gap-3 text-[10px]">
                    <div className="flex items-center gap-3 text-gray-600 dark:text-slate-400">
                        {subscription.expirationDate && (() => {
                            const expiryDate = new Date(subscription.expirationDate);
                            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                            const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
                            return (
                                <span className={isExpiringSoon ? 'text-orange-600 dark:text-orange-400 font-semibold' : ''}>
                                    {isExpiringSoon && '⚠️ '}
                                    Sub: {isExpiringSoon ? `${daysUntilExpiry}d` : expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                            );
                        })()}
                        {subscription.keysGeneratedAt && (
                            <span>Keys: {new Date(subscription.keysGeneratedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        )}
                        {subscription.lastSyncedAt && (
                            <span className="text-gray-500 dark:text-slate-500">
                                Synced: {new Date(subscription.lastSyncedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => alert('Sync from APIM (coming soon)')}
                        className="px-2 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded border border-blue-300 dark:border-blue-700"
                        title="Pull latest data from APIM"
                    >
                        🔄 Sync
                    </button>
                </div>
            </div>

            {/* Right: Status + Actions */}
            <div className="flex items-center gap-3">
                <span className="text-xs font-semibold px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                    {subscription.state}
                </span>

                {/* Actions Menu */}
                <div className="relative">
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-slate-700 rounded transition"
                        aria-label="Subscriber actions"
                    >
                        <svg className="w-5 h-5 text-gray-600 dark:text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                    </button>

                    {isMenuOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 z-10">
                            {isOwnerLead ? (
                                <button
                                    onClick={() => {
                                        onRevokeAccess(subscription.id);
                                        setIsMenuOpen(false);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                                >
                                    Revoke Access
                                </button>
                            ) : (
                                <div className="px-4 py-3 text-xs text-gray-500">
                                    Only Team Leads can modify subscriptions.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
