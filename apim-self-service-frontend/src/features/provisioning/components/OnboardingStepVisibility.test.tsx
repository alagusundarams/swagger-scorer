import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingStepVisibility } from './OnboardingStepVisibility';

// Mock TeamSearch
vi.mock('./TeamSearch', () => ({
    TeamSearch: ({ onToggleTeam }: any) => (
        <button data-testid="toggle-team" onClick={() => onToggleTeam('team-2')}>Toggle Team</button>
    )
}));

describe('OnboardingStepVisibility', () => {
    const mockOnChange = vi.fn();
    const mockOnNext = vi.fn();
    const mockOnBack = vi.fn();
    const mockFormData = {
        visibility: 'public' as const,
        selectedTeams: []
    };

    it('renders visibility options', () => {
        render(
            <OnboardingStepVisibility
                formData={mockFormData}
                onChange={mockOnChange}
                onNext={mockOnNext}
                onBack={mockOnBack}
                allTeams={[]}
            />
        );

        expect(screen.getByText(/Ecosystem Public/i)).toBeTruthy();
        expect(screen.getByText(/Restricted Circle/i)).toBeTruthy();
        expect(screen.getByText(/Internal Sandbox/i)).toBeTruthy();
    });

    it('calls onChange when selecting a different visibility', () => {
        render(
            <OnboardingStepVisibility
                formData={mockFormData}
                onChange={mockOnChange}
                onNext={mockOnNext}
                onBack={mockOnBack}
                allTeams={[]}
            />
        );

        const privateRadio = screen.getByLabelText(/Restricted Circle/i);
        fireEvent.click(privateRadio);

        expect(mockOnChange).toHaveBeenCalledWith({ ...mockFormData, visibility: 'private' });
    });

    it('renders TeamSearch only when visibility is private', () => {
        const { rerender } = render(
            <OnboardingStepVisibility
                formData={mockFormData}
                onChange={mockOnChange}
                onNext={mockOnNext}
                onBack={mockOnBack}
                allTeams={[]}
            />
        );

        expect(screen.queryByTestId('toggle-team')).toBeNull();

        rerender(
            <OnboardingStepVisibility
                formData={{ ...mockFormData, visibility: 'private' }}
                onChange={mockOnChange}
                onNext={mockOnNext}
                onBack={mockOnBack}
                allTeams={[]}
            />
        );

        expect(screen.getByTestId('toggle-team')).toBeTruthy();
    });

    it('calls onBack and onNext correctly', () => {
        render(
            <OnboardingStepVisibility
                formData={mockFormData}
                onChange={mockOnChange}
                onNext={mockOnNext}
                onBack={mockOnBack}
                allTeams={[]}
            />
        );

        fireEvent.click(screen.getByText(/Back/i));
        expect(mockOnBack).toHaveBeenCalled();

        fireEvent.click(screen.getByText(/Review Manifest/i));
        expect(mockOnNext).toHaveBeenCalled();
    });
});
