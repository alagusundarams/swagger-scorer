import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingStepReview } from './OnboardingStepReview';

describe('OnboardingStepReview', () => {
    const mockOnBack = vi.fn();
    const mockOnSubmit = vi.fn();
    const mockTeams = [{ id: 'team-1', name: 'Team Alpha' }] as any[];
    const mockFormData = {
        name: 'Test API',
        version: 'v1.0.0',
        ownerTeamId: 'team-1',
        visibility: 'public',
        selectedTeams: []
    };

    it('renders form data for review', () => {
        render(
            <OnboardingStepReview
                formData={mockFormData}
                userTeams={mockTeams}
                onBack={mockOnBack}
                onSubmit={mockOnSubmit}
            />
        );

        expect(screen.getByText('Test API')).toBeTruthy();
        expect(screen.getByText('v1.0.0')).toBeTruthy();
        expect(screen.getByText('Team Alpha')).toBeTruthy();
        expect(screen.getByText(/Global Discovery/i)).toBeTruthy();
    });

    it('shows private visibility info when private', () => {
        render(
            <OnboardingStepReview
                formData={{ ...mockFormData, visibility: 'private', selectedTeams: ['t1', 't2'] }}
                userTeams={mockTeams}
                onBack={mockOnBack}
                onSubmit={mockOnSubmit}
            />
        );

        expect(screen.getByText(/Restricted List \(2\)/i)).toBeTruthy();
    });

    it('calls onBack and onSubmit correctly', () => {
        render(
            <OnboardingStepReview
                formData={mockFormData}
                userTeams={mockTeams}
                onBack={mockOnBack}
                onSubmit={mockOnSubmit}
            />
        );

        fireEvent.click(screen.getByText(/Back/i));
        expect(mockOnBack).toHaveBeenCalled();

        fireEvent.click(screen.getByText(/Submit Registration/i));
        expect(mockOnSubmit).toHaveBeenCalled();
    });
});
