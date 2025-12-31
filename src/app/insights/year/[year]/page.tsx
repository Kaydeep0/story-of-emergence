'use client';

/**
 * Year - Yearly Narrative Frame with Confidence-Gated Rendering
 * 
 * Read-only container for a single year's narrative.
 * Uses deterministic assembly with confidence-based presentation.
 */

import { useEffect, useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useEncryptionSession } from '../../../lib/useEncryptionSession';
import { rpcFetchEntries } from '../../../lib/entries';
import { itemToReflectionEntry, attachDemoSourceLinks } from '../../../lib/insights/timelineSpikes';
import { useReflectionLinks } from '../../../lib/reflectionLinks';
import { assembleYearNarrative } from '../../../lib/narrative/assembleYearNarrativeDeterministic';
import { getConfidenceBandInfo } from '../../../lib/narrative/confidenceBands';
import type { NarrativeCandidate } from '../../../lib/narrative/narrativeAssembly';

interface YearPageProps {
  params: {
    year: string;
  };
}

export default function YearPage({ params }: YearPageProps) {
  const yearNum = parseInt(params.year, 10);
  const { address, isConnected } = useAccount();
  const { ready: encryptionReady, aesKey: sessionKey, error: encryptionError } = useEncryptionSession();
  const { getSourceIdFor } = useReflectionLinks(address);

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allReflections, setAllReflections] = useState<any[]>([]);

  const connected = isConnected && !!address;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load reflections
  useEffect(() => {
    if (!mounted || !connected || !address) return;
    if (!encryptionReady || !sessionKey) {
      if (encryptionError) {
        setError(encryptionError);
      }
      return;
    }

    let cancelled = false;

    async function loadReflections() {
      if (!address || !sessionKey) {
        setAllReflections([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { items } = await rpcFetchEntries(address, sessionKey, {
          includeDeleted: false,
          limit: 1000,
          offset: 0,
        });

        if (cancelled) return;

        setAllReflections(items);
      } catch (err: any) {
        if (!cancelled) {
          console.error('Failed to load reflections', err);
          setError(err.message ?? 'Failed to load reflections');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadReflections();

    return () => {
      cancelled = true;
    };
  }, [mounted, connected, address, encryptionReady, sessionKey, encryptionError]);

  // Filter reflections for the year and assemble narrative
  const narrativeDraft = useMemo(() => {
    if (allReflections.length === 0 || !sessionKey) {
      return null;
    }

    // Filter reflections for the specific year
    const yearStart = new Date(yearNum, 0, 1, 0, 0, 0, 0);
    const yearEnd = new Date(yearNum, 11, 31, 23, 59, 59, 999);

    const yearReflections = allReflections
      .filter((item) => {
        const entryDate = new Date(item.created_at);
        return entryDate >= yearStart && entryDate <= yearEnd;
      })
      .map((item) => ({
        id: item.id,
        created_at: item.created_at,
        text: item.plaintext || '',
      }));

    if (yearReflections.length === 0) {
      return null;
    }

    return assembleYearNarrative(yearNum, yearReflections);
  }, [allReflections, yearNum, sessionKey]);

  // Group candidates by section and sort by confidence
  const candidatesBySection = useMemo(() => {
    if (!narrativeDraft) {
      return {
        themes: [] as NarrativeCandidate[],
        transitions: [] as NarrativeCandidate[],
        anchors: [] as NarrativeCandidate[],
      };
    }

    const grouped = {
      themes: [] as NarrativeCandidate[],
      transitions: [] as NarrativeCandidate[],
      anchors: [] as NarrativeCandidate[],
    };

    // Sort all candidates by confidence descending
    const sorted = [...narrativeDraft.candidates].sort(
      (a, b) => b.confidence - a.confidence
    );

    for (const candidate of sorted) {
      grouped[candidate.section].push(candidate);
    }

    return grouped;
  }, [narrativeDraft]);

  // Render candidate with confidence-based styling
  const renderCandidate = (candidate: NarrativeCandidate) => {
    const bandInfo = getConfidenceBandInfo(candidate.confidence);
    
    // Apply visual treatment by band
    let textClassName = 'text-sm';
    let confidenceClassName = 'text-xs text-white/30';

    if (bandInfo.band === 'tentative') {
      textClassName += ' text-white/50 italic';
      confidenceClassName += ' italic';
    } else if (bandInfo.band === 'emerging') {
      textClassName += ' text-white/70';
    } else if (bandInfo.band === 'supported') {
      textClassName += ' text-white/80';
    } else if (bandInfo.band === 'strong') {
      textClassName += ' text-white/90';
    }

    return (
      <div key={`${candidate.section}-${candidate.text}`} className="mb-4">
        <p className={textClassName}>{candidate.text}</p>
        <p className={confidenceClassName}>
          Structural confidence: {candidate.confidence.toFixed(2)} ({bandInfo.label})
        </p>
      </div>
    );
  };

  if (!mounted) {
    return null;
  }

  if (!connected) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-light mb-2">Year {params.year}</h1>
          <p className="text-white/60">Please connect your wallet to view your narrative.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-light mb-2">Year {params.year}</h1>
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-light mb-2">Year {params.year}</h1>
          <p className="text-red-400">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        {/* Year Header Block */}
        <div className="mb-12">
          <h1 className="text-2xl font-light mb-2">Year {params.year}</h1>
          <p className="text-white/60 mb-2">
            A chapter of lived experience.
          </p>
          <p className="text-sm text-white/40">
            This view reflects patterns only visible in hindsight.
          </p>
        </div>

        {/* Narrative Sections with Confidence-Gated Rendering */}
        {narrativeDraft ? (
          <div className="space-y-12">
            {/* Themes */}
            <section>
              <h2 className="text-lg font-light mb-2">Themes</h2>
              <p className="text-sm text-white/40 mb-4">
                What persisted across the year.
              </p>
              {candidatesBySection.themes.length > 0 ? (
                candidatesBySection.themes.map(renderCandidate)
              ) : (
                <p className="text-sm text-white/30 italic">
                  No themes identified.
                </p>
              )}
            </section>

            {/* Transitions */}
            <section>
              <h2 className="text-lg font-light mb-2">Transitions</h2>
              <p className="text-sm text-white/40 mb-4">
                What changed direction.
              </p>
              {candidatesBySection.transitions.length > 0 ? (
                candidatesBySection.transitions.map(renderCandidate)
              ) : (
                <p className="text-sm text-white/30 italic">
                  No transitions identified.
                </p>
              )}
            </section>

            {/* Anchors */}
            <section>
              <h2 className="text-lg font-light mb-2">Anchors</h2>
              <p className="text-sm text-white/40 mb-4">
                What mattered enough to remain.
              </p>
              {candidatesBySection.anchors.length > 0 ? (
                candidatesBySection.anchors.map(renderCandidate)
              ) : (
                <p className="text-sm text-white/30 italic">
                  No anchors identified.
                </p>
              )}
            </section>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Themes */}
            <section>
              <h2 className="text-lg font-light mb-2">Themes</h2>
              <p className="text-sm text-white/40 mb-4">
                What persisted across the year.
              </p>
              <p className="text-sm text-white/30 italic">
                No reflections found for this year.
              </p>
            </section>

            {/* Transitions */}
            <section>
              <h2 className="text-lg font-light mb-2">Transitions</h2>
              <p className="text-sm text-white/40 mb-4">
                What changed direction.
              </p>
              <p className="text-sm text-white/30 italic">
                No reflections found for this year.
              </p>
            </section>

            {/* Anchors */}
            <section>
              <h2 className="text-lg font-light mb-2">Anchors</h2>
              <p className="text-sm text-white/40 mb-4">
                What mattered enough to remain.
              </p>
              <p className="text-sm text-white/30 italic">
                No reflections found for this year.
              </p>
            </section>
          </div>
        )}

        {/* Read Only Guardrail */}
        <div className="mt-16 pt-8 border-t border-white/5">
          <p className="text-xs text-white/30 italic">
            This narrative is constructed from reflection history.
            It cannot be edited directly.
          </p>
        </div>
      </div>
    </div>
  );
}

