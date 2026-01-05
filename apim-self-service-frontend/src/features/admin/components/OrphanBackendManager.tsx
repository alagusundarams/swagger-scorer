import React, { useState, useEffect } from 'react';
import {
    getOrphanBackends,
    adoptBackend
} from '../api/adminClient';
import { getProducts } from '../../inventory/api/inventoryClient';
import { toast } from 'react-hot-toast';
import './OrphanManager.css';

interface Backend {
    id: string;
    environment: string;
    url: string;
    title?: string;
    productId?: string;
    scope?: 'PRODUCT' | 'API' | 'GLOBAL' | null;
    updatedAt?: string;
}

export const OrphanBackendManager: React.FC = () => {
    const [orphans, setOrphans] = useState<Backend[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [env, setEnv] = useState('DEV');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Adoption State
    const [targetProductId, setTargetProductId] = useState('');
    const [targetScope, setTargetScope] = useState<'PRODUCT' | 'API' | 'GLOBAL'>('PRODUCT');
    const [adopting, setAdopting] = useState(false);

    const environments = ['DEV', 'QA', 'PROD'];

    useEffect(() => {
        loadData();
        loadProducts();
    }, [env]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getOrphanBackends(env);
            setOrphans(data || []);
        } catch (err) {
            toast.error('Failed to load orphaned backends');
        } finally {
            setLoading(false);
        }
    };

    const loadProducts = async () => {
        try {
            const data = await getProducts();
            setProducts(data || []);
        } catch (err) {
            console.error('Failed to load products', err);
        }
    };

    const handleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleAdopt = async () => {
        if (selectedIds.length === 0) return;
        if (targetScope !== 'GLOBAL' && !targetProductId) {
            toast.error('Please select a target product');
            return;
        }

        setAdopting(true);
        try {
            for (const id of selectedIds) {
                await adoptBackend(id, env, {
                    productId: targetScope === 'GLOBAL' ? undefined : targetProductId,
                    scope: targetScope
                });
            }
            toast.success(`Successfully reclaimed ${selectedIds.length} backends`);
            setSelectedIds([]);
            loadData();
        } catch (err) {
            toast.error('Reclamation failed');
        } finally {
            setAdopting(false);
        }
    };

    return (
        <div className="orphan-manager">
            <div className="manager-header">
                <div className="filter-group">
                    <label>Environment:</label>
                    <select value={env} onChange={(e) => setEnv(e.target.value)}>
                        {environments.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                </div>

                <div className="action-group">
                    <select
                        value={targetScope}
                        onChange={(e) => setTargetScope(e.target.value as any)}
                        className="scope-select"
                    >
                        <option value="PRODUCT">Assign to Product</option>
                        <option value="GLOBAL">Mark as GLOBAL</option>
                    </select>

                    {targetScope === 'PRODUCT' && (
                        <select
                            value={targetProductId}
                            onChange={(e) => setTargetProductId(e.target.value)}
                            disabled={adopting}
                        >
                            <option value="">Select Target Product...</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    )}

                    <button
                        onClick={handleAdopt}
                        disabled={selectedIds.length === 0 || adopting}
                        className="primary-button"
                    >
                        {adopting ? 'Processing...' : `Reclaim Selected (${selectedIds.length})`}
                    </button>
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Select</th>
                            <th>Backend ID</th>
                            <th>Target URL</th>
                            <th>Current Scope</th>
                            <th>Last Updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="loading-state">Loading...</td></tr>
                        ) : orphans.length === 0 ? (
                            <tr><td colSpan={5} className="empty-state">No orphaned backends found in {env}</td></tr>
                        ) : (
                            orphans.map(b => (
                                <tr key={b.id} className={selectedIds.includes(b.id) ? 'selected' : ''}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(b.id)}
                                            onChange={() => handleSelect(b.id)}
                                        />
                                    </td>
                                    <td><code>{b.title || b.id}</code></td>
                                    <td><code>{b.url}</code></td>
                                    <td><span className="badge badge-warning">{b.scope || 'ORPHAN'}</span></td>
                                    <td>{b.updatedAt ? new Date(b.updatedAt).toLocaleDateString() : 'N/A'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
