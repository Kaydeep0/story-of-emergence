// src/app/insights/components/SessionClosing.tsx
// Closing moment for each Insights lens - signals completion, not evaluation

'use client';

import React from 'react';
import type { NarrativeTone } from '../hooks/useNarrativeTone';
import { ObservationalDivider } from './ObservationalDivider';

const CLOSING_COPY: Record<NarrativeTone, string[]> = {
  calm: [
    "This is how your attention moved. Nothing to fix.",
    "Patterns observed. Meaning is yours.",
    "You can return to writing.",
  ],
  poetic: [
    "This is how your attention moved. Nothing to fix.",
    "Patterns observed. Meaning is yours.",
    "You can return to writing.",
  ],
  analytical: [
    "This is how your attention moved. Nothing to fix.",
    "Patterns observed. Meaning is yours.",
    "You can return to writing.",
  ],
  mirror: [
    "This is how your attention moved. Nothing to fix.",
    "Patterns observed. Meaning is yours.",
    "You can return to writing.",
  ],
};

const LENS_CLOSING: Record<string, Record<NarrativeTone, string>> = {
  weekly: {
    calm: "This is how your attention moved this week. Nothing to fix.",
    poetic: "This is how your attention moved this week. Nothing to fix.",
    analytical: "This is how your attention moved this week. Nothing to fix.",
    mirror: "This is how your attention moved this week. Nothing to fix.",
  },
  summary: {
    calm: "Patterns observed. Meaning is yours.",
    poetic: "Patterns observed. Meaning is yours.",
    analytical: "Patterns observed. Meaning is yours.",
    mirror: "Patterns observed. Meaning is yours.",
  },
  timeline: {
    calm: "This is how your attention moved. Nothing to fix.",
    poetic: "This is how your attention moved. Nothing to fix.",
    analytical: "This is how your attention moved. Nothing to fix.",
    mirror: "This is how your attention moved. Nothing to fix.",
  },
  yearly: {
    calm: "This is how your attention moved. Nothing to fix.",
    poetic: "This is how your attention moved. Nothing to fix.",
    analytical: "This is how your attention moved. Nothing to fix.",
    mirror: "This is how your attention moved. Nothing to fix.",
  },
  distributions: {
    calm: "Patterns observed. Meaning is yours.",
    poetic: "Patterns observed. Meaning is yours.",
    analytical: "Patterns observed. Meaning is yours.",
    mirror: "Patterns observed. Meaning is yours.",
  },
  lifetime: {
    calm: "This is how your attention moved. Nothing to fix.",
    poetic: "This is how your attention moved. Nothing to fix.",
    analytical: "This is how your attention moved. Nothing to fix.",
    mirror: "This is how your attention moved. Nothing to fix.",
  },
  yoy: {
    calm: "Patterns observed. Meaning is yours.",
    poetic: "Patterns observed. Meaning is yours.",
    analytical: "Patterns observed. Meaning is yours.",
    mirror: "Patterns observed. Meaning is yours.",
  },
};

export function SessionClosing({ 
  lens, 
  narrativeTone 
}: { 
  lens: 'weekly' | 'summary' | 'timeline' | 'yearly' | 'distributions' | 'lifetime' | 'yoy';
  narrativeTone: NarrativeTone;
}) {
  const closingText = LENS_CLOSING[lens]?.[narrativeTone] || "You can return to writing.";

  return (
    <div className="mt-12 pt-8">
      <ObservationalDivider />
      <div className="mt-8 text-center">
        <p className="text-sm text-white/50 italic leading-relaxed">
          {closingText}
        </p>
      </div>
    </div>
  );
}

