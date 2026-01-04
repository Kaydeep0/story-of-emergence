// src/app/insights/components/InsightDebugPanel.tsx
// Dev-only debug panel for insight artifacts

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import type { InsightArtifactDebug } from '../../lib/insights/artifactTypes';

interface InsightDebugPanelProps {
  debug?: InsightArtifactDebug;
}

export function InsightDebugPanel({ debug }: InsightDebugPanelProps) {
  const searchParams = useSearchParams();
  const debugParam = searchParams?.get('debug') === '1';
  const isDev = process.env.NODE_ENV === 'development';
  // Show debug only in dev mode OR when debug=1 query param is present
  const showDebug = isDev || debugParam;
  const [isOpen, setIsOpen] = useState(showDebug);

  if (!debug) {
    return null;
  }

  // Show content if debug is enabled (dev mode or debug=1 param) and toggle is open
  const shouldShowContent = showDebug && isOpen;

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-white/40 hover:text-white/60 px-2 py-1 rounded border border-white/10 bg-white/5 transition-colors"
      >
        {shouldShowContent ? '▼' : '▶'} Debug
      </button>
      
      {shouldShowContent && (
        <div className="mt-2 rounded-lg border border-white/10 bg-black/60 p-4 text-xs font-mono">
          <div className="space-y-1 text-white/70">
            {/* Reflection Intake Counters */}
            {(debug.reflectionsLoaded !== undefined || debug.eventsGenerated !== undefined) && (
              <>
                <div className="pt-1 pb-2 border-t border-white/10 mt-2">
                  <div className="text-white/40 text-[10px] uppercase tracking-wide mb-1">Reflection Intake</div>
                  {debug.reflectionsLoaded !== undefined && (
                    <div><span className="text-white/50">reflectionsLoaded:</span> {debug.reflectionsLoaded}</div>
                  )}
                  {debug.eventsGenerated !== undefined && (
                    <div><span className="text-white/50">eventsGenerated:</span> {debug.eventsGenerated}</div>
                  )}
                  <div><span className="text-white/50">eventsPassedToEngine:</span> {debug.eventCount}</div>
                </div>
              </>
            )}
            
            {/* Window and Event Info */}
            <div className="pt-1 pb-2 border-t border-white/10 mt-2">
              <div className="text-white/40 text-[10px] uppercase tracking-wide mb-1">Window & Events</div>
              <div><span className="text-white/50">eventCount:</span> {debug.eventCount}</div>
              <div><span className="text-white/50">windowStartIso:</span> {debug.windowStartIso}</div>
              <div><span className="text-white/50">windowEndIso:</span> {debug.windowEndIso}</div>
              <div><span className="text-white/50">minEventIso:</span> {debug.minEventIso ?? 'null'}</div>
              <div><span className="text-white/50">maxEventIso:</span> {debug.maxEventIso ?? 'null'}</div>
            </div>
            
            {/* Sample Data */}
            <div className="pt-1 border-t border-white/10 mt-2">
              <div className="text-white/40 text-[10px] uppercase tracking-wide mb-1">Samples</div>
              <div><span className="text-white/50">sampleEventIds:</span> [{debug.sampleEventIds.join(', ')}]</div>
              <div><span className="text-white/50">sampleEventDates:</span> [{debug.sampleEventDates.join(', ')}]</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

