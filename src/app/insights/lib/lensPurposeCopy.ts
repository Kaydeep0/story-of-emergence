import type { NarrativeTone } from '../hooks/useNarrativeTone';

export type LensKey = 'weekly' | 'summary' | 'timeline' | 'yearly' | 'distributions' | 'yoy' | 'lifetime';

interface LensPurposeCopy {
  [key: string]: string;
}

const LENS_PURPOSE_COPY: Record<LensKey, Record<NarrativeTone, string>> = {
  weekly: {
    calm: 'This lens helps you see short-term rhythm and momentum in your thinking.',
    poetic: 'This lens reveals the pulse of your recent days—how attention gathers and releases.',
    analytical: 'This lens provides a short-term view of activity patterns and output frequency.',
    mirror: 'This lens helps you see the short-term rhythm and momentum in your thinking.',
  },
  summary: {
    calm: 'This lens compresses recent activity into a high-level signal without losing essential patterns.',
    poetic: 'This lens distills your recent reflections into a concentrated view of what matters.',
    analytical: 'This lens aggregates recent activity into a high-level summary of patterns and frequency.',
    mirror: 'This lens compresses your recent activity into a high-level signal without losing essential patterns.',
  },
  timeline: {
    calm: 'This lens shows how activity unfolds over time without interpretation or meaning claims.',
    poetic: 'This lens traces the arc of your thinking across days and weeks, showing rhythm without judgment.',
    analytical: 'This lens displays temporal activity patterns and frequency changes without semantic analysis.',
    mirror: 'This lens shows how your activity unfolds over time without interpretation or meaning claims.',
  },
  yearly: {
    calm: 'This lens reveals seasonal and long-horizon patterns in how your thinking distributes across a year.',
    poetic: 'This lens captures the shape of a year—how attention, effort, and emotion concentrated over twelve months.',
    analytical: 'This lens analyzes annual activity distribution patterns and seasonal variations in output.',
    mirror: 'This lens reveals seasonal and long-horizon patterns in how your thinking distributes across a year.',
  },
  distributions: {
    calm: 'This lens shows how effort concentrates and spreads across time windows without analyzing content.',
    poetic: 'This lens maps the geography of your thinking—where intensity gathers and where it rests.',
    analytical: 'This lens quantifies activity distribution patterns across multiple time windows.',
    mirror: 'This lens shows how your effort concentrates and spreads across time windows without analyzing content.',
  },
  yoy: {
    calm: 'This lens compares patterns, not outcomes, across two moments in time.',
    poetic: 'This lens holds two years side by side, showing how rhythm and intensity shifted between them.',
    analytical: 'This lens provides comparative analysis of activity patterns between two distinct time periods.',
    mirror: 'This lens compares your patterns, not outcomes, across two moments in time.',
  },
  lifetime: {
    calm: 'This lens shows how your thinking distributes across all available time without interpretation.',
    poetic: 'This lens reveals the long arc of your thinking—how it gathered and released over years.',
    analytical: 'This lens provides aggregate analysis of activity distribution patterns across the full dataset.',
    mirror: 'This lens shows how your thinking distributes across all available time without interpretation.',
  },
};

export function getLensPurposeCopy(lensKey: LensKey, tone: NarrativeTone): string {
  return LENS_PURPOSE_COPY[lensKey]?.[tone] || LENS_PURPOSE_COPY[lensKey]?.calm || '';
}

export interface LensBoundaries {
  shows: string[];
  doesNotShow: string[];
}

const LENS_BOUNDARIES: Record<LensKey, Record<NarrativeTone, LensBoundaries>> = {
  weekly: {
    calm: {
      shows: [
        'How your attention distributes over the last 7 days',
        'Whether thinking accumulates gradually or arrives in bursts',
        'Short-term rhythm and momentum patterns',
      ],
      doesNotShow: [
        'What you wrote about',
        'Emotional or semantic meaning of reflections',
        'Causes, diagnoses, or recommendations',
      ],
    },
    poetic: {
      shows: [
        'How your attention moved across the last 7 days',
        'Whether thinking gathered gradually or arrived in sudden waves',
        'The pulse and rhythm of your recent thinking',
      ],
      doesNotShow: [
        'What you wrote about',
        'Emotional or semantic meaning of reflections',
        'Causes, diagnoses, or recommendations',
      ],
    },
    analytical: {
      shows: [
        'Activity distribution patterns over the last 7 days',
        'Output frequency and concentration metrics',
        'Short-term temporal patterns in reflection generation',
      ],
      doesNotShow: [
        'Semantic content of reflections',
        'Emotional or psychological interpretation',
        'Causal relationships or diagnostic claims',
      ],
    },
    mirror: {
      shows: [
        'How your attention distributes over the last 7 days',
        'Whether your thinking accumulates gradually or arrives in bursts',
        'Your short-term rhythm and momentum patterns',
      ],
      doesNotShow: [
        'What you wrote about',
        'Emotional or semantic meaning of your reflections',
        'Causes, diagnoses, or recommendations',
      ],
    },
  },
  summary: {
    calm: {
      shows: [
        'High-level patterns from recent activity',
        'Concentration and distribution of your thinking',
        'Structural signals without semantic analysis',
      ],
      doesNotShow: [
        'What you wrote about',
        'Emotional or semantic meaning of reflections',
        'Causes, diagnoses, or recommendations',
      ],
    },
    poetic: {
      shows: [
        'The shape of your recent thinking',
        'How attention gathered and released',
        'Structural patterns without meaning claims',
      ],
      doesNotShow: [
        'What you wrote about',
        'Emotional or semantic meaning of reflections',
        'Causes, diagnoses, or recommendations',
      ],
    },
    analytical: {
      shows: [
        'Aggregated activity patterns from recent time windows',
        'Distribution and concentration metrics',
        'Structural signals without semantic interpretation',
      ],
      doesNotShow: [
        'Semantic content of reflections',
        'Emotional or psychological interpretation',
        'Causal relationships or diagnostic claims',
      ],
    },
    mirror: {
      shows: [
        'High-level patterns from your recent activity',
        'Concentration and distribution of your thinking',
        'Structural signals without semantic analysis',
      ],
      doesNotShow: [
        'What you wrote about',
        'Emotional or semantic meaning of your reflections',
        'Causes, diagnoses, or recommendations',
      ],
    },
  },
  timeline: {
    calm: {
      shows: [
        'How activity unfolds over time',
        'Spikes, clusters, and frequency changes',
        'Temporal patterns without interpretation',
      ],
      doesNotShow: [
        'What you wrote about',
        'Emotional or semantic meaning of reflections',
        'Causes, diagnoses, or recommendations',
      ],
    },
    poetic: {
      shows: [
        'How your thinking moved across time',
        'Where attention gathered and where it rested',
        'Temporal rhythm without meaning claims',
      ],
      doesNotShow: [
        'What you wrote about',
        'Emotional or semantic meaning of reflections',
        'Causes, diagnoses, or recommendations',
      ],
    },
    analytical: {
      shows: [
        'Temporal activity patterns and frequency distributions',
        'Spike events and clustering behavior',
        'Time-series patterns without semantic analysis',
      ],
      doesNotShow: [
        'Semantic content of reflections',
        'Emotional or psychological interpretation',
        'Causal relationships or diagnostic claims',
      ],
    },
    mirror: {
      shows: [
        'How your activity unfolds over time',
        'Spikes, clusters, and frequency changes',
        'Temporal patterns without interpretation',
      ],
      doesNotShow: [
        'What you wrote about',
        'Emotional or semantic meaning of your reflections',
        'Causes, diagnoses, or recommendations',
      ],
    },
  },
  yearly: {
    calm: {
      shows: [
        'How your attention distributes over a full year',
        'Seasonal patterns and long-horizon rhythms',
        'The concentration and shape of annual thinking',
      ],
      doesNotShow: [
        'What you wrote about',
        'Emotional or semantic meaning of reflections',
        'Causes, diagnoses, or recommendations',
      ],
    },
    poetic: {
      shows: [
        'How your thinking shaped itself across a year',
        'Where attention, effort, and emotion concentrated',
        'The arc of a year without meaning claims',
      ],
      doesNotShow: [
        'What you wrote about',
        'Emotional or semantic meaning of reflections',
        'Causes, diagnoses, or recommendations',
      ],
    },
    analytical: {
      shows: [
        'Annual activity distribution patterns',
        'Seasonal variations and long-horizon metrics',
        'Year-scale structural patterns without semantic analysis',
      ],
      doesNotShow: [
        'Semantic content of reflections',
        'Emotional or psychological interpretation',
        'Causal relationships or diagnostic claims',
      ],
    },
    mirror: {
      shows: [
        'How your attention distributes over a full year',
        'Seasonal patterns and long-horizon rhythms',
        'The concentration and shape of your annual thinking',
      ],
      doesNotShow: [
        'What you wrote about',
        'Emotional or semantic meaning of your reflections',
        'Causes, diagnoses, or recommendations',
      ],
    },
  },
  distributions: {
    calm: {
      shows: [
        'How effort concentrates and spreads across time windows',
        'Distribution patterns without analyzing content',
        'The shape of activity across multiple horizons',
      ],
      doesNotShow: [
        'What you wrote about',
        'Emotional or semantic meaning of reflections',
        'Causes, diagnoses, or recommendations',
      ],
    },
    poetic: {
      shows: [
        'How your thinking concentrates and spreads',
        'The geography of intensity across time',
        'Distribution patterns without meaning claims',
      ],
      doesNotShow: [
        'What you wrote about',
        'Emotional or semantic meaning of reflections',
        'Causes, diagnoses, or recommendations',
      ],
    },
    analytical: {
      shows: [
        'Activity distribution patterns across multiple time windows',
        'Concentration metrics and frequency distributions',
        'Structural patterns without semantic interpretation',
      ],
      doesNotShow: [
        'Semantic content of reflections',
        'Emotional or psychological interpretation',
        'Causal relationships or diagnostic claims',
      ],
    },
    mirror: {
      shows: [
        'How your effort concentrates and spreads across time windows',
        'Distribution patterns without analyzing content',
        'The shape of your activity across multiple horizons',
      ],
      doesNotShow: [
        'What you wrote about',
        'Emotional or semantic meaning of your reflections',
        'Causes, diagnoses, or recommendations',
      ],
    },
  },
  yoy: {
    calm: {
      shows: [
        'How patterns compare across two moments in time',
        'Changes in rhythm, concentration, and distribution',
        'Structural differences without outcome claims',
      ],
      doesNotShow: [
        'What you wrote about',
        'Emotional or semantic meaning of reflections',
        'Causes, diagnoses, or recommendations',
      ],
    },
    poetic: {
      shows: [
        'How two years compare in rhythm and intensity',
        'Where patterns shifted between time periods',
        'Structural comparison without meaning claims',
      ],
      doesNotShow: [
        'What you wrote about',
        'Emotional or semantic meaning of reflections',
        'Causes, diagnoses, or recommendations',
      ],
    },
    analytical: {
      shows: [
        'Comparative analysis of activity patterns between time periods',
        'Changes in distribution, frequency, and concentration metrics',
        'Structural differences without semantic interpretation',
      ],
      doesNotShow: [
        'Semantic content of reflections',
        'Emotional or psychological interpretation',
        'Causal relationships or diagnostic claims',
      ],
    },
    mirror: {
      shows: [
        'How your patterns compare across two moments in time',
        'Changes in your rhythm, concentration, and distribution',
        'Structural differences without outcome claims',
      ],
      doesNotShow: [
        'What you wrote about',
        'Emotional or semantic meaning of your reflections',
        'Causes, diagnoses, or recommendations',
      ],
    },
  },
  lifetime: {
    calm: {
      shows: [
        'How your attention distributes over long time horizons',
        'Whether thinking accumulates gradually or arrives in bursts',
        'The concentration and rhythm of your cognitive effort',
      ],
      doesNotShow: [
        'What you wrote about',
        'Emotional or semantic meaning of reflections',
        'Causes, diagnoses, or recommendations',
      ],
    },
    poetic: {
      shows: [
        'How your thinking shaped itself across all time',
        'Where attention gathered and released over years',
        'The long arc of your cognitive rhythm',
      ],
      doesNotShow: [
        'What you wrote about',
        'Emotional or semantic meaning of reflections',
        'Causes, diagnoses, or recommendations',
      ],
    },
    analytical: {
      shows: [
        'Aggregate activity distribution patterns across the full dataset',
        'Long-horizon concentration and frequency metrics',
        'Structural patterns without semantic analysis',
      ],
      doesNotShow: [
        'Semantic content of reflections',
        'Emotional or psychological interpretation',
        'Causal relationships or diagnostic claims',
      ],
    },
    mirror: {
      shows: [
        'How your attention distributes over long time horizons',
        'Whether your thinking accumulates gradually or arrives in bursts',
        'The concentration and rhythm of your cognitive effort',
      ],
      doesNotShow: [
        'What you wrote about',
        'Emotional or semantic meaning of your reflections',
        'Causes, diagnoses, or recommendations',
      ],
    },
  },
};

export function getLensBoundaries(lensKey: LensKey, tone: NarrativeTone): LensBoundaries {
  return LENS_BOUNDARIES[lensKey]?.[tone] || LENS_BOUNDARIES[lensKey]?.calm || {
    shows: [],
    doesNotShow: [],
  };
}

export interface DistributionViewText {
  line1: string;
  line2: string;
}

const DISTRIBUTION_VIEW_TEXT: Record<NarrativeTone, DistributionViewText> = {
  calm: {
    line1: 'Most activity concentrates at low intensity.',
    line2: 'A small number of sessions extend far to the right, carrying disproportionate effort.',
  },
  poetic: {
    line1: 'Most days rest quietly near the left edge.',
    line2: 'A few days stretch far to the right, carrying the weight of concentrated thinking.',
  },
  analytical: {
    line1: 'Frequency distribution shows concentration at lower intensity values.',
    line2: 'A small subset of sessions exhibit significantly higher intensity, indicating disproportionate effort allocation.',
  },
  mirror: {
    line1: 'Most of your activity concentrates at low intensity.',
    line2: 'A small number of your sessions extend far to the right, carrying disproportionate effort.',
  },
};

export function getDistributionViewText(tone: NarrativeTone): DistributionViewText {
  return DISTRIBUTION_VIEW_TEXT[tone] || DISTRIBUTION_VIEW_TEXT.calm;
}

