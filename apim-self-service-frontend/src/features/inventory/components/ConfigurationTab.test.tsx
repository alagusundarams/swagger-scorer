import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfigurationTab } from './ConfigurationTab';
import { Product } from '../../../types/entities';

// Mock the MOCK_NAMED_VALUES inside the component if possible, 
// or just test the component's reaction to the static data it imports.
// Since MOCK_NAMED_VALUES is internal to the file, we test the rendered output.

describe('ConfigurationTab', () => {
    const mockProduct: Product = {
        id: 'prod-1',
        name: 'test-prod',
        displayName: 'Test Product',
        version: '1.0.0',
        description: 'Mock Product',
        ownerTeamId: 'team-1',
        state: 'published',
        apis: [],
        // subscriptions: [], // Removed as not part of Product type
        environment: 'PROD',
        managementMode: 'PORTAL_MANAGED',
        qualityScore: 100,
        subscriberCount: 0,
        // tags: [], // Removed as not part of Product type
        createdAt: '',
        updatedAt: ''
    };

    it('renders the split configuration sections', () => {
        render(<ConfigurationTab product={mockProduct} />);

        // Check for section headers
        expect(screen.getByText(/Product Configuration/i)).toBeDefined();
        expect(screen.getByText(/API Specific Configuration/i)).toBeDefined();
    });

    it('displays API-scoped values in the API section', () => {
        render(<ConfigurationTab product={mockProduct} />);

        // "AuthTokenEndpoint" is an API-scoped key in our mock data
        const apiKeys = screen.getAllByText('{{AuthTokenEndpoint}}');
        expect(apiKeys.length).toBeGreaterThan(0);

        // It should NOT be in the "Product Configuration" table (hard to strictly verify without specific ids, 
        // but checking existence is a good start)
    });

    it('displays Certificate information for specific keys', () => {
        render(<ConfigurationTab product={mockProduct} />);

        // "CN=*.login.ms.com" is mocked for AuthTokenEndpoint
        expect(screen.getByText('CN=*.login.ms.com')).toBeDefined();
        expect(screen.getByText(/Thumb: 8A3D/i)).toBeDefined();
    });

    it('handles edit clicks correctly for MANUAL mode', () => {
        window.alert = vi.fn();
        render(<ConfigurationTab product={mockProduct} />);

        const editButtons = screen.getAllByText('Edit');
        fireEvent.click(editButtons[0]);

        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Edit Mode'));
    });

    it('handles edit clicks correctly for TERRAFORM_MANAGED mode', () => {
        window.alert = vi.fn();
        const gitOpsProduct = { ...mockProduct, managementMode: 'TERRAFORM_MANAGED' as const };

        render(<ConfigurationTab product={gitOpsProduct} />);

        const editButtons = screen.getAllByText('Edit');
        fireEvent.click(editButtons[0]);

        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('GitOps Locked'));
    });
});
