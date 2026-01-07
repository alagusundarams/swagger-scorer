import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ContractEditorHeader } from './ContractEditorHeader';
import { type API, type Product } from '../../inventory/types/inventoryTypes';

const mockProduct: Product = {
    id: 'prod-1',
    name: 'test-product',
    displayName: 'Test Product',
    description: 'A test product',
    ownerTeamId: 'team-1',
    environment: 'PROD',
    apis: ['api-1'],
    management_mode: 'UNTRACKED',
    state: 'Published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
} as any;

const mockApi: API = {
    id: 'api-1',
    name: 'test-api',
    displayName: 'Test API',
    description: 'A test api',
    version: '1.0.0',
    operations: [],
    definition: ''
} as any;

describe('ContractEditorHeader', () => {
    it('renders the API name and product badge', () => {
        render(
            <MemoryRouter>
                <ContractEditorHeader
                    api={mockApi}
                    product={mockProduct}
                    isModified={false}
                    content="test content"
                    onClose={vi.fn()}
                />
            </MemoryRouter>
        );

        expect(screen.getByText(/Test API/i)).toBeTruthy();
        expect(screen.getByText('PROD')).toBeTruthy();
    });

    it('shows "Modified" badge when isModified is true', () => {
        render(
            <MemoryRouter>
                <ContractEditorHeader
                    api={mockApi}
                    product={mockProduct}
                    isModified={true}
                    content="test content"
                    onClose={vi.fn()}
                />
            </MemoryRouter>
        );

        expect(screen.getByText(/Modified/i)).toBeTruthy();
    });

    it('calls onClose when close button is clicked', () => {
        const onCloseMock = vi.fn();
        render(
            <MemoryRouter>
                <ContractEditorHeader
                    api={mockApi}
                    product={mockProduct}
                    isModified={false}
                    content="test content"
                    onClose={onCloseMock}
                />
            </MemoryRouter>
        );

        const closeButton = screen.getByRole('button', { name: /×/i });
        fireEvent.click(closeButton);

        expect(onCloseMock).toHaveBeenCalled();
    });

    it('renders the Analyze button', () => {
        render(
            <MemoryRouter>
                <ContractEditorHeader
                    api={mockApi}
                    product={mockProduct}
                    isModified={false}
                    content="test content"
                    onClose={vi.fn()}
                />
            </MemoryRouter>
        );

        expect(screen.getByText(/Analyze/i)).toBeTruthy();
    });
});
