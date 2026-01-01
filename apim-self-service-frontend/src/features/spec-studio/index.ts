/**
 * ------------------------------------------------------------------
 * 📍 Feature Entry: Spec Studio
 * ------------------------------------------------------------------
 * 🔄 RESPONSIBILITY:
 * - Public API for the Spec Studio feature module.
 * - Exposes the `SpecStudio` workspace component and its shared store.
 * - Acts as the primary integration point for MFE consumers.
 * ------------------------------------------------------------------
 */
export { SpecStudio } from './views/SpecStudio.view';
export { useSpecStudio } from './store/useSpecStudio';
export * from './api/analysisClient';
