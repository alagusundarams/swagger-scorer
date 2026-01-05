import React, { useState, useEffect } from 'react';
import {
    getOrphanNamedValues,
    adoptNamedValue
} from '../api/adminClient';
import { getProducts } from '../../inventory/api/inventoryClient';
import { toast } from 'react-hot-toast';
import './OrphanManager.css'; // Assume shared styles

interface NamedValue {
    id: string;
    systemName: string;
    displayName?: string;
    environment: string;
    value: string;
    productId?: string;
    scopeId?: string;
    scope?: 'PRODUCT' | 'API' | 'GLOBAL' | null;
    updatedAt?: string;
}

export const OrphanNamedValueManager: React.FC = () => {
    const [orphans, setOrphans] = useState<NamedValue[]>([]);
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
            const data = await getOrphanNamedValues(env);
            setOrphans(data || []);
        } catch (err) {
            toast.error('Failed to load orphaned named values');
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
                await adoptNamedValue(id, env, {
                    productId: targetScope === 'GLOBAL' ? undefined : targetProductId,
                    scope: targetScope
                });
            }
            toast.success(`Successfully reclaimed ${selectedIds.length} named values`);
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
                            <th>System Name</th>
                            <th>Display Name</th>
                            <th>Value (Preview)</th>
                            <th>Current Scope</th>
                            <th>Last Updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="loading-state">Loading...</td></tr>
                        ) : orphans.length === 0 ? (
                            <tr><td colSpan={6} className="empty-state">No orphaned named values found in {env}</td></tr>
                        ) : (
                            orphans.map(nv => (
                                <tr key={nv.id} className={selectedIds.includes(nv.id) ? 'selected' : ''}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(nv.id)}
                                            onChange={() => handleSelect(nv.id)}
                                        />
                                    </td>
                                    <td><code>{nv.systemName}</code></td>
                                    <td>{nv.displayName || '-'}</td>
                                    <td>{nv.value.length > 30 ? nv.value.substring(0, 30) + '...' : nv.value}</td>
                                    <td><span className="badge badge-warning">{nv.scope || 'ORPHAN'}</span></td>
                                    <td>{nv.updatedAt ? new Date(nv.updatedAt).toLocaleDateString() : 'N/A'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
