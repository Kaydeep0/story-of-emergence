// src/app/lib/insights/eventTimestampHelpers.ts
// Shared helpers for consistent timestamp extraction and range checking across all insight pages
// Ensures Weekly, Summary, Timeline, and Yearly all use the same timestamp source

import type { UnifiedInternalEvent } from '../../../lib/internalEvents';

/**
 * Extract timestamp in milliseconds from an event
 * Uses eventAt as the source of truth (set from ReflectionEntry.createdAt)
 * 
 * @param event - UnifiedInternalEvent with eventAt field
 * @returns Timestamp in milliseconds (UTC)
 */
export function getEventTimestampMs(event: UnifiedInternalEvent): number {
  // eventAt is always an ISO string (set from new Date(r.createdAt).toISOString())
  const eventAt = event.eventAt;
  if (!eventAt) {
    throw new Error(`Event ${event.id} missing eventAt field`);
  }
  const date = new Date(eventAt);
  if (isNaN(date.getTime())) {
    throw new Error(`Event ${event.id} has invalid eventAt: ${eventAt}`);
  }
  return date.getTime();
}

/**
 * Check if an event timestamp falls within a date range
 * 
 * @param eventMs - Event timestamp in milliseconds
 * @param startMs - Range start timestamp in milliseconds (inclusive)
 * @param endMs - Range end timestamp in milliseconds (inclusive)
 * @returns true if event is within range
 */
export function isWithinRange(eventMs: number, startMs: number, endMs: number): boolean {
  return eventMs >= startMs && eventMs <= endMs;
}

/**
 * Helper to convert Date objects to milliseconds for range checking
 * 
 * @param date - Date object
 * @returns Timestamp in milliseconds
 */
export function dateToMs(date: Date): number {
  return date.getTime();
}

