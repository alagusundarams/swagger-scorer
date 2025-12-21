import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingStepIdentity } from './OnboardingStepIdentity';

describe('OnboardingStepIdentity', () => {
    const mockOnChange = vi.fn();
    const mockOnNext = vi.fn();
    const mockTeams = [{ id: 'team-1', name: 'Team Alpha' }] as any[];
    const mockFormData = {
        name: '',
        version: '',
        description: '',
        ownerTeamId: 'team-1'
    };

    it('renders form fields', () => {
        render(
            <OnboardingStepIdentity
                formData={mockFormData}
                onChange={mockOnChange}
                onNext={mockOnNext}
                userTeams={mockTeams}
            />
        );

        expect(screen.getByPlaceholderText(/Global Transactions API/i)).toBeTruthy();
        expect(screen.getByPlaceholderText(/v1.0.0/i)).toBeTruthy();
        expect(screen.getByPlaceholderText(/Summarize the core capabilities/i)).toBeTruthy();
    });

    it('calls onChange when input values change', () => {
        render(
            <OnboardingStepIdentity
                formData={mockFormData}
                onChange={mockOnChange}
                onNext={mockOnNext}
                userTeams={mockTeams}
            />
        );

        const nameInput = screen.getByPlaceholderText(/Global Transactions API/i);
        fireEvent.change(nameInput, { target: { value: 'New Name' } });

        expect(mockOnChange).toHaveBeenCalledWith({ ...mockFormData, name: 'New Name' });
    });

    it('disables next button when fields are empty', () => {
        render(
            <OnboardingStepIdentity
                formData={mockFormData}
                onChange={mockOnChange}
                onNext={mockOnNext}
                userTeams={mockTeams}
            />
        );

        const nextButton = screen.getByRole('button', { name: /Establish Identity/i }) as HTMLButtonElement;
        expect(nextButton.disabled).toBe(true);
    });

    it('enables next button when required fields are filled', () => {
        const fullFormData = {
            name: 'API Name',
            version: '1.0.0',
            description: 'A description',
            ownerTeamId: 'team-1'
        };

        render(
            <OnboardingStepIdentity
                formData={fullFormData}
                onChange={mockOnChange}
                onNext={mockOnNext}
                userTeams={mockTeams}
            />
        );

        const nextButton = screen.getByRole('button', { name: /Establish Identity/i }) as HTMLButtonElement;
        expect(nextButton.disabled).toBe(false);
    });
});
