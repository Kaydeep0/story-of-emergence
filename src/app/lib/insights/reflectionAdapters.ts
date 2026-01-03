// src/app/lib/insights/reflectionAdapters.ts
// Canonical adapters for converting events to ReflectionEntry format
// Standardizes timestamp selection and event conversion across all artifact builders

import type { ReflectionEntry } from './types';
import type { InternalEvent } from '../../lib/types';
import type { UnifiedInternalEvent } from '../../../lib/internalEvents';

/**
 * Extract timestamp from an event using canonical priority:
 * 1. occurredAt (if present)
 * 2. createdAt (if present)
 * 3. eventAt (if present)
 * 4. timestamp (if present)
 * 
 * Fails loudly in dev if none exist.
 */
function extractEventTimestamp(
  event: InternalEvent | UnifiedInternalEvent
): Date {
  const isUnified = 'sourceKind' in event;
  
  // Check for occurredAt first (highest priority)
  if (isUnified) {
    const unified = event as UnifiedInternalEvent & { occurredAt?: string | Date };
    if (unified.occurredAt !== undefined && unified.occurredAt !== null) {
      return typeof unified.occurredAt === 'string' ? new Date(unified.occurredAt) : unified.occurredAt;
    }
  } else {
    const internal = event as InternalEvent & { occurredAt?: string | Date };
    if (internal.occurredAt !== undefined && internal.occurredAt !== null) {
      return typeof internal.occurredAt === 'string' ? new Date(internal.occurredAt) : internal.occurredAt;
    }
  }
  
  // Check createdAt (InternalEvent has this as Date)
  if (isUnified) {
    const unified = event as UnifiedInternalEvent & { createdAt?: string | Date };
    if (unified.createdAt !== undefined && unified.createdAt !== null) {
      return typeof unified.createdAt === 'string' ? new Date(unified.createdAt) : unified.createdAt;
    }
  } else {
    const internal = event as InternalEvent;
    // InternalEvent has createdAt as Date
    if (internal.createdAt) {
      return internal.createdAt instanceof Date ? internal.createdAt : new Date(internal.createdAt);
    }
  }
  
  // Check eventAt (standard field for UnifiedInternalEvent, also on InternalEvent)
  if (isUnified) {
    const unified = event as UnifiedInternalEvent;
    if (unified.eventAt) {
      return typeof unified.eventAt === 'string' ? new Date(unified.eventAt) : new Date(unified.eventAt);
    }
  } else {
    const internal = event as InternalEvent;
    // InternalEvent has eventAt as Date
    if (internal.eventAt) {
      return internal.eventAt instanceof Date ? internal.eventAt : new Date(internal.eventAt);
    }
  }
  
  // Check timestamp (fallback)
  if (isUnified) {
    const unified = event as UnifiedInternalEvent & { timestamp?: string | Date };
    if (unified.timestamp !== undefined && unified.timestamp !== null) {
      return typeof unified.timestamp === 'string' ? new Date(unified.timestamp) : unified.timestamp;
    }
  } else {
    const internal = event as InternalEvent & { timestamp?: string | Date };
    if (internal.timestamp !== undefined && internal.timestamp !== null) {
      return typeof internal.timestamp === 'string' ? new Date(internal.timestamp) : internal.timestamp;
    }
  }
  
  // Fail loudly in dev if no timestamp found
  if (process.env.NODE_ENV === 'development') {
    console.error('Event missing timestamp:', {
      id: event.id,
      isUnified,
      hasOccurredAt: 'occurredAt' in event,
      hasCreatedAt: 'createdAt' in event,
      hasEventAt: 'eventAt' in event,
      hasTimestamp: 'timestamp' in event,
      eventKeys: Object.keys(event),
    });
    throw new Error(`Event ${event.id} has no valid timestamp field (occurredAt, createdAt, eventAt, or timestamp)`);
  }
  
  // Fallback: use current time (should not happen in dev)
  console.warn(`Event ${event.id} missing timestamp, using current time`);
  return new Date();
}

/**
 * Extract plaintext content from an event
 */
function extractPlaintext(event: InternalEvent | UnifiedInternalEvent): string | undefined {
  const isUnified = 'sourceKind' in event;
  
  if (isUnified) {
    const unified = event as UnifiedInternalEvent;
    return unified.details;
  } else {
    const internal = event as InternalEvent;
    const payload: Record<string, unknown> = (internal.plaintext ?? {}) as Record<string, unknown>;
    
    if (typeof payload?.content === 'string') {
      return payload.content;
    } else if (typeof payload?.raw_metadata === 'object' && payload.raw_metadata !== null) {
      const rawMeta = payload.raw_metadata as Record<string, unknown>;
      if (typeof rawMeta.content === 'string') {
        return rawMeta.content;
      }
    }
  }
  
  return undefined;
}

/**
 * Extract sourceKind from an event
 */
function extractSourceKind(event: InternalEvent | UnifiedInternalEvent): string | undefined {
  const isUnified = 'sourceKind' in event;
  
  if (isUnified) {
    return (event as UnifiedInternalEvent).sourceKind;
  } else {
    const internal = event as InternalEvent;
    const payload: Record<string, unknown> = (internal.plaintext ?? {}) as Record<string, unknown>;
    return payload.source_kind as string | undefined;
  }
}

/**
 * Extract eventKind from an event
 */
function extractEventKind(event: InternalEvent | UnifiedInternalEvent): string | undefined {
  const isUnified = 'sourceKind' in event;
  
  if (isUnified) {
    return (event as UnifiedInternalEvent).eventKind;
  } else {
    const internal = event as InternalEvent;
    const payload: Record<string, unknown> = (internal.plaintext ?? {}) as Record<string, unknown>;
    return payload.event_kind as string | undefined;
  }
}

/**
 * Convert a single event to ReflectionEntry format
 * Only includes journal events (sourceKind === "journal" && eventKind === "written")
 * 
 * @param event - InternalEvent or UnifiedInternalEvent
 * @param index - Optional index for generating unique IDs
 * @returns ReflectionEntry if event is a journal entry, null otherwise
 */
export function eventToReflectionEntry(
  event: InternalEvent | UnifiedInternalEvent,
  index?: number
): ReflectionEntry | null {
  const sourceKind = extractSourceKind(event);
  const eventKind = extractEventKind(event);
  const plaintext = extractPlaintext(event);
  
  // Only include journal events
  if (sourceKind !== 'journal' || eventKind !== 'written' || !plaintext) {
    return null;
  }
  
  const timestamp = extractEventTimestamp(event);
  
  // Validate timestamp in dev
  if (process.env.NODE_ENV === 'development') {
    if (isNaN(timestamp.getTime())) {
      console.error('Invalid timestamp parsed:', {
        eventId: event.id,
        timestamp,
        eventKeys: Object.keys(event),
      });
      throw new Error(`Event ${event.id} has invalid timestamp: ${timestamp}`);
    }
  }
  
  return {
    id: event.id ?? `reflection-${index ?? Date.now()}`,
    createdAt: timestamp.toISOString(),
    plaintext,
  };
}

/**
 * Convert multiple events to ReflectionEntry format
 * Filters to only journal events (sourceKind === "journal" && eventKind === "written")
 * 
 * @param events - Array of InternalEvent or UnifiedInternalEvent
 * @returns Array of ReflectionEntry (only journal entries)
 */
export function eventsToReflectionEntries(
  events: (InternalEvent | UnifiedInternalEvent)[]
): ReflectionEntry[] {
  const entries: ReflectionEntry[] = [];
  
  for (let i = 0; i < events.length; i++) {
    const entry = eventToReflectionEntry(events[i], i);
    if (entry) {
      entries.push(entry);
    }
  }
  
  return entries;
}

/**
 * Unit test-style sanity check for date parsing
 * Validates that timestamp extraction works correctly for common event shapes
 * 
 * @internal - Dev-only validation function
 */
export function __testDateParsing(): void {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }
  
  const testCases: Array<{ name: string; event: InternalEvent | UnifiedInternalEvent; expectedValid: boolean }> = [
    {
      name: 'UnifiedInternalEvent with eventAt',
      event: {
        id: 'test-1',
        walletAlias: '0x123',
        eventAt: '2024-01-15T10:00:00Z',
        sourceKind: 'journal',
        eventKind: 'written',
        details: 'Test',
      } as UnifiedInternalEvent,
      expectedValid: true,
    },
    {
      name: 'UnifiedInternalEvent with occurredAt',
      event: {
        id: 'test-2',
        walletAlias: '0x123',
        eventAt: '2024-01-15T10:00:00Z',
        occurredAt: '2024-01-14T10:00:00Z', // Should prefer this
        sourceKind: 'journal',
        eventKind: 'written',
        details: 'Test',
      } as UnifiedInternalEvent & { occurredAt: string },
      expectedValid: true,
    },
    {
      name: 'InternalEvent with eventAt Date',
      event: {
        id: 'test-3',
        eventAt: new Date('2024-01-15T10:00:00Z'),
        createdAt: new Date('2024-01-15T10:00:00Z'),
        plaintext: { source_kind: 'journal', event_kind: 'written', content: 'Test' },
      } as InternalEvent,
      expectedValid: true,
    },
    {
      name: 'InternalEvent with createdAt Date',
      event: {
        id: 'test-4',
        createdAt: new Date('2024-01-15T10:00:00Z'),
        plaintext: { source_kind: 'journal', event_kind: 'written', content: 'Test' },
      } as InternalEvent,
      expectedValid: true,
    },
  ];
  
  for (const testCase of testCases) {
    try {
      const timestamp = extractEventTimestamp(testCase.event);
      const isValid = !isNaN(timestamp.getTime());
      
      if (testCase.expectedValid && !isValid) {
        console.error(`[reflectionAdapters] Date parsing test failed: ${testCase.name} - Invalid date parsed`);
      } else if (!testCase.expectedValid && isValid) {
        console.error(`[reflectionAdapters] Date parsing test failed: ${testCase.name} - Expected invalid but got valid date`);
      } else {
        // Test passed
      }
    } catch (error) {
      if (testCase.expectedValid) {
        console.error(`[reflectionAdapters] Date parsing test failed: ${testCase.name} - ${error}`);
      }
    }
  }
}

// Run sanity check on module load in dev
if (process.env.NODE_ENV === 'development') {
  __testDateParsing();
}


