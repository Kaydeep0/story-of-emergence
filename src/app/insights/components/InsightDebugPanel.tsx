// src/app/insights/components/InsightDebugPanel.tsx
// Dev-only debug panel for insight artifacts
// Hidden by default - only visible when explicitly enabled via query param or dev mode

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
  
  // Debug is only accessible when explicitly enabled (query param) OR in dev mode
  const isDebugEnabled = isDev || debugParam;
  const [isOpen, setIsOpen] = useState(false); // Default closed, even in dev mode

  // If debug is not enabled at all, don't render anything
  if (!isDebugEnabled || !debug) {
    return null;
  }

  // Show content only when toggle is explicitly opened
  const shouldShowContent = isOpen;

  return (
    <div className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs text-white/30 hover:text-white/50 px-2 py-1 rounded border border-white/5 bg-white/2 transition-colors"
        title="Show debug data (developer only)"
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
            
            {/* Insight Contract Validation Telemetry */}
            {(debug.reflectionsInWindow !== undefined || debug.activeDays !== undefined || debug.rawCardsGenerated !== undefined) && (
              <div className="pt-1 pb-2 border-t border-white/10 mt-2">
                <div className="text-white/40 text-[10px] uppercase tracking-wide mb-1">Insight Contract Validation</div>
                {debug.reflectionsInWindow !== undefined && (
                  <div><span className="text-white/50">reflectionsInWindow:</span> {debug.reflectionsInWindow}</div>
                )}
                {debug.activeDays !== undefined && (
                  <div><span className="text-white/50">activeDays:</span> {debug.activeDays}</div>
                )}
                {debug.rawCardsGenerated !== undefined && (
                  <div><span className="text-white/50">rawCardsGenerated:</span> {debug.rawCardsGenerated}</div>
                )}
                {debug.cardsPassingValidation !== undefined && (
                  <div><span className="text-white/50">cardsPassingValidation:</span> {debug.cardsPassingValidation}</div>
                )}
                {debug.timezone && (
                  <div><span className="text-white/50">timezone:</span> {debug.timezone}</div>
                )}
                {debug.rejectedCards && debug.rejectedCards.length > 0 && (
                  <div className="mt-2">
                    <div className="text-white/40 text-[10px] uppercase tracking-wide mb-1">Rejected Cards ({debug.rejectedCards.length})</div>
                    {debug.rejectedCards.map((rejected, idx) => (
                      <div key={idx} className="mt-1 pl-2 border-l-2 border-red-500/30">
                        <div className="text-white/60 font-semibold">{rejected.title}</div>
                        <div className="text-white/40 text-[10px]">kind: {rejected.kind}</div>
                        <div className="text-red-400/70 text-[10px] mt-1">
                          {rejected.reasons.map((reason, rIdx) => (
                            <div key={rIdx}>• {reason}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

