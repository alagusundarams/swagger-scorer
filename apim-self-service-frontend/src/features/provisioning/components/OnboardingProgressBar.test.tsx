import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OnboardingProgressBar } from './OnboardingProgressBar';

describe('OnboardingProgressBar', () => {
    it('renders the correct number of segments', () => {
        const { container } = render(
            <OnboardingProgressBar currentStep={1} totalSteps={3} />
        );

        const segments = container.querySelectorAll('.flex-1');
        expect(segments.length).toBe(3);
    });

    it('renders the correct phase text', () => {
        render(<OnboardingProgressBar currentStep={2} totalSteps={3} />);
        expect(screen.getByText(/PHASE 2/i)).toBeTruthy();
        expect(screen.getByText(/03/i)).toBeTruthy();
    });

    it('highlights segments up to the current step', () => {
        const { container } = render(
            <OnboardingProgressBar currentStep={2} totalSteps={3} />
        );

        const activeSegments = container.querySelectorAll('.bg-blue-600');
        expect(activeSegments.length).toBe(2);
    });
});
