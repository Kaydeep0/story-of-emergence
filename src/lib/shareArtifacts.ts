/**
 * LEGACY FROZEN
 * Status: frozen in place
 * Reason: superseded by canonical SharePack format
 * Rule: do not extend, do not add new call sites
 * Allowed: bug fix for existing call sites only
 * Note: no known imports as of 2026-01-21
 */

/**
 * Share Artifact Contract
 * 
 * Defines the structure for shareable artifacts generated from views.
 * 
 * This is a contract only. No rendering logic, no network calls,
 * no storage, no mutation, no persistence.
 * 
 * Artifacts exist only in memory until explicitly exported.
 */

export type ShareArtifact = {
  id: string;
  source: 'lifetime' | 'yearly' | 'weekly';
  title: string;
  subtitle?: string;
  generatedAt: string;
  payload: unknown;
};

