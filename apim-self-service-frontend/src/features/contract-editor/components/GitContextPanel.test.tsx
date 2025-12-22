import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GitContextPanel } from './GitContextPanel';
import { type API, type Product } from '../../../types/entities';

const mockProduct: Product = {
    id: 'prod-1',
    name: 'test-product',
    management_mode: 'PORTAL_MANAGED',
} as any;

const mockApi: API = {
    id: 'api-1',
    name: 'test-api',
} as any;

describe('GitContextPanel', () => {
    it('renders git branch and source info', () => {
        render(
            <GitContextPanel
                product={mockProduct}
                api={mockApi}
                filename="contract.yaml"
                isModified={false}
            />
        );

        expect(screen.getByText(/portal\/test-api.*/i)).toBeTruthy();
        expect(screen.getByText(/apis\/test-api\/contract.yaml/i)).toBeTruthy();
    });

    it('shows draft status when isModified is true', () => {
        render(
            <GitContextPanel
                product={mockProduct}
                api={mockApi}
                filename="contract.yaml"
                isModified={true}
            />
        );

        expect(screen.getByText(/Draft in browser/i)).toBeTruthy();
    });

    it('does not show draft status when isModified is false', () => {
        render(
            <GitContextPanel
                product={mockProduct}
                api={mockApi}
                filename="contract.yaml"
                isModified={false}
            />
        );

        expect(screen.queryByText(/Draft in browser/i)).toBeNull();
    });
});
