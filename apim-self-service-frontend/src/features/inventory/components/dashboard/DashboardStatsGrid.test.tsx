import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardStatsGrid } from './DashboardStatsGrid';

describe('DashboardStatsGrid', () => {
    it('renders all provided stats', () => {
        const mockStats = [
            { label: 'Stat 1', value: '100', icon: '📦' },
            { label: 'Stat 2', value: '200', icon: '🚀' },
            { label: 'Stat 3', value: '300', icon: '👥' }
        ];

        render(<DashboardStatsGrid heroStats={mockStats} />);

        expect(screen.getByText('Stat 1')).toBeTruthy();
        expect(screen.getByText('100')).toBeTruthy();
        expect(screen.getByText('Stat 2')).toBeTruthy();
        expect(screen.getByText('200')).toBeTruthy();
        expect(screen.getByText('Stat 3')).toBeTruthy();
        expect(screen.getByText('300')).toBeTruthy();
    });

    it('renders icons for each stat', () => {
        const mockStats = [{ label: 'Stat 1', value: '100', icon: '📦' }];
        render(<DashboardStatsGrid heroStats={mockStats} />);
        expect(screen.getByText('📦')).toBeTruthy();
    });
});
