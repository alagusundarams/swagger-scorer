/**
 * @fileoverview Score calculation engine
 * 
 * This is the heart of the scoring system. It takes violations from Spectral
 * and calculates a quality score using the deduction model.
 * 
 * How scoring works:
 * 1. Start with 100 points per category
 * 2. For each violation, deduct points based on severity
 * 3. Calculate weighted average across all categories
 * 4. Assign Green/Amber/Red status based on thresholds
 */

import { ScoringConfig, Violation, CategoryScore, AnalysisResult, QualityStatus } from '../../types/index.js';

/**
 * Calculate quality score from violations
 * 
 * This is the main scoring function. It implements the deduction model:
 * - Each category starts at 100 points
 * - Violations deduct points (adjusted by severity multiplier)
 * - Final score is weighted average of category scores
 * 
 * @param violations - All violations found by Spectral
 * @param config - Scoring configuration (weights, thresholds, multipliers)
 * @param specVersion - OpenAPI version (e.g., "3.0.0")
 * @returns Complete analysis result with score, status, and breakdown
 * 
 * Example:
 *   const result = calculateScore(violations, config, "3.0.0");
 *   console.log(result.score); // 87.5
 *   console.log(result.status); // "amber"
 */
export function calculateScore(
    violations: Violation[],
    config: ScoringConfig,
    specVersion: string
): AnalysisResult {
    // Group violations by category
    // This creates a map like: { documentation: [...], security: [...], ... }
    const violationsByCategory = groupViolationsByCategory(violations);

    // Calculate score for each category
    const categoryScores: CategoryScore[] = [];

    // Process each category from the config
    for (const [categoryName, categoryConfig] of Object.entries(config.categories)) {
        // Skip disabled categories
        if (!categoryConfig.enabled) {
            continue;
        }

        // Get violations for this category (or empty array if none)
        const categoryViolations = violationsByCategory[categoryName] || [];

        // Calculate deductions for this category
        const deduction = calculateCategoryDeduction(categoryViolations, config);

        // Category score = 100 - deductions (minimum 0)
        const score = Math.max(0, 100 - deduction);

        categoryScores.push({
            name: categoryName,
            score,
            weight: categoryConfig.weight,
            violationCount: categoryViolations.length,
        });
    }

    // Calculate overall weighted score
    const overallScore = calculateWeightedScore(categoryScores);

    // Determine status (Green/Amber/Red) based on thresholds
    const status = determineStatus(overallScore, config.thresholds);

    return {
        score: Math.round(overallScore * 10) / 10, // Round to 1 decimal place
        status,
        categories: categoryScores,
        violations,
        metadata: {
            specVersion,
            analyzedAt: new Date().toISOString(),
            unresolvedRefs: 0, // TODO: count unresolved references
        },
    };
}

/**
 * Group violations by category
 * 
 * Spectral returns a flat list of violations. We need to group them by category
 * to calculate scores per category.
 * 
 * @param violations - All violations
 * @returns Map of category name to violations in that category
 * 
 * Example output:
 *   {
 *     documentation: [{ rule: "info-description", ... }, ...],
 *     security: [{ rule: "owasp:api2:2019-no-http-basic", ... }],
 *     ...
 *   }
 */
function groupViolationsByCategory(
    violations: Violation[]
): Record<string, Violation[]> {
    const grouped: Record<string, Violation[]> = {};

    for (const violation of violations) {
        const category = violation.category;
        if (!grouped[category]) {
            grouped[category] = [];
        }
        grouped[category].push(violation);
    }

    return grouped;
}

/**
 * Calculate total deduction for a category
 * 
 * Each violation has a severity (error/warning/info). We multiply by the
 * severity multiplier to get the actual deduction amount.
 * 
 * Formula: deduction = Σ (base_points × severity_multiplier)
 * 
 * For simplicity, each violation currently deducts 1 base point. In the future,
 * we could assign different point values to different rules.
 * 
 * @param violations - Violations in this category
 * @param config - Scoring config (for severity multipliers)
 * @returns Total points to deduct from this category's score
 * 
 * Example:
 *   - 2 errors × 1.0 = 2 points
 *   - 3 warnings × 0.5 = 1.5 points
 *   - 1 info × 0.1 = 0.1 points
 *   Total deduction = 3.6 points
 */
function calculateCategoryDeduction(
    violations: Violation[],
    config: ScoringConfig
): number {
    let totalDeduction = 0;

    for (const violation of violations) {
        // Get severity multiplier (error: 1.0, warning: 0.5, info: 0.1, hint: 0.0)
        const multiplier = config.severityMultipliers[violation.severity] || 1.0;

        // Base deduction is 1 point per violation
        // Multiply by severity to get actual deduction
        const deduction = 1 * multiplier;

        totalDeduction += deduction;
    }

    return totalDeduction;
}

/**
 * Calculate weighted average score across all categories
 * 
 * Each category has a weight (percentage). We multiply each category score
 * by its weight and sum them up.
 * 
 * Formula: score = Σ (category_score × category_weight / 100)
 * 
 * @param categoryScores - Scores for each category
 * @returns Overall score (0-100)
 * 
 * Example:
 *   - Documentation: 85 score × 30% weight = 25.5
 *   - Security: 95 score × 20% weight = 19.0
 *   - ... (other categories)
 *   Total = 87.5
 */
function calculateWeightedScore(categoryScores: CategoryScore[]): number {
    let weightedSum = 0;

    for (const category of categoryScores) {
        weightedSum += (category.score * category.weight) / 100;
    }

    return weightedSum;
}

/**
 * Determine quality status based on score
 * 
 * Maps numeric score to Green/Amber/Red status:
 * - Green (excellent): score >= green threshold (default 95)
 * - Amber (needs work): score >= amber threshold (default 85)
 * - Red (poor): score < amber threshold
 * 
 * @param score - Overall score (0-100)
 * @param thresholds - Green and amber cutoff points
 * @returns Quality status
 */
function determineStatus(
    score: number,
    thresholds: { green: number; amber: number }
): QualityStatus {
    if (score >= thresholds.green) {
        return 'green';
    } else if (score >= thresholds.amber) {
        return 'amber';
    } else {
        return 'red';
    }
}
