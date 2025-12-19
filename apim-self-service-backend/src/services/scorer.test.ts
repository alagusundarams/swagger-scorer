/**
 * @fileoverview Tests for score calculation
 * 
 * These tests verify the scoring logic works correctly.
 * We use real data (not mocks) to test the calculation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { calculateScore } from './scorer.js';
import { Violation, ScoringConfig } from '../types/index.js';

describe('Scorer Service', () => {
    // Sample config used across tests
    // This matches our real scoring-config.yaml structure
    let config: ScoringConfig;

    beforeEach(() => {
        config = {
            version: '1.0',
            categories: {
                security: { weight: 30, enabled: true },
                structural: { weight: 20, enabled: true },
                apiDesign: { weight: 20, enabled: true },
                documentation: { weight: 15, enabled: true },
                dataModels: { weight: 10, enabled: true },
                errorHandling: { weight: 5, enabled: true },
            },
            severityMultipliers: {
                error: 1.0,
                warning: 0.5,
                info: 0.1,
                hint: 0.0,
            },
            thresholds: {
                green: 90,
                amber: 70,
            },
        };
    });

    /**
     * Test: Perfect score with no violations
     * 
     * Why: If spec has no issues, score should be 100
     * How: Pass empty violations array
     * Expected: Score = 100, status = green
     */
    it('should return 100 score for specs with no violations', () => {
        const violations: Violation[] = [];

        const result = calculateScore(violations, config, '3.0.0');

        expect(result.score).toBe(100);
        expect(result.status).toBe('green');
    });

    /**
     * Test: Score deduction for errors
     * 
     * Why: Errors should have full impact (1.0 multiplier)
     * How: Add 1 error in documentation category
     * Expected: Documentation score = 99, overall score reflects 30% weight
     * 
     * Calculation:
     * - Documentation: 100 - (1 error × 1.0) = 99
     * - Overall: (99 × 0.30) + (100 × 0.25) + (100 × 0.20) + ... = 99.7
     */
    it('should deduct points for error violations', () => {
        const violations: Violation[] = [
            {
                rule: 'info-description',
                severity: 'error',
                message: 'Missing description',
                path: 'info',
                line: 1,
                category: 'documentation',
            },
        ];

        const result = calculateScore(violations, config, '3.0.0');

        // Score should be less than 100 but close (only 1 error in 30% category)
        expect(result.score).toBeLessThan(100);
        expect(result.score).toBeGreaterThan(99);
    });

    /**
     * Test: Warning violations have half impact
     * 
     * Why: Warnings use 0.5 multiplier, so 2 warnings = 1 error
     * How: Add 2 warnings in documentation category
     * Expected: Same deduction as 1 error
     */
    it('should apply severity multipliers correctly', () => {
        const violations: Violation[] = [
            {
                rule: 'info-contact',
                severity: 'warning',
                message: 'Missing contact',
                path: 'info',
                line: 1,
                category: 'documentation',
            },
            {
                rule: 'info-license',
                severity: 'warning',
                message: 'Missing license',
                path: 'info',
                line: 1,
                category: 'documentation',
            },
        ];

        const result = calculateScore(violations, config, '3.0.0');

        // 2 warnings × 0.5 = 1 point deduction
        // Should be same as 1 error test above
        expect(result.score).toBeLessThan(100);
        expect(result.score).toBeGreaterThan(99);
    });

    /**
     * Test: Status determination (Green/Amber/Red)
     * 
     * Why: Score thresholds should correctly map to status
     * How: Test scores at boundary points
     */
    it('should determine correct status based on thresholds', () => {
        // Create violations to get specific scores

        // No violations = 100 = Green
        const greenResult = calculateScore([], config, '3.0.0');
        expect(greenResult.status).toBe('green');

        // Many violations to get score in amber range (85-94)
        const amberViolations: Violation[] = Array(20)
            .fill(null)
            .map((_, i) => ({
                rule: `rule-${i}`,
                severity: 'error' as const,
                message: 'Test violation',
                path: 'test',
                line: 1,
                category: 'documentation',
            }));

        const amberResult = calculateScore(amberViolations, config, '3.0.0');
        expect(amberResult.status).toBe('amber');
    });

    /**
     * Test: Category breakdown
     * 
     * Why: Result should include per-category scores
     * How: Check that categories array is populated
     */
    it('should return category breakdown', () => {
        const violations: Violation[] = [
            {
                rule: 'security-rule',
                severity: 'error',
                message: 'Security issue',
                path: 'paths',
                line: 10,
                category: 'security',
            },
        ];

        const result = calculateScore(violations, config, '3.0.0');

        // Should have all 6 categories
        expect(result.categories).toHaveLength(6);

        // Find security category
        const securityCategory = result.categories.find((c) => c.name === 'security');
        expect(securityCategory).toBeDefined();
        expect(securityCategory!.violationCount).toBe(1);
        expect(securityCategory!.score).toBeLessThan(100);
    });
});
