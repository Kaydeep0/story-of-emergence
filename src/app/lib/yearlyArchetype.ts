// Writing archetype determination for yearly wrap

export interface ArchetypeData {
  name: string;
  tagline: string;
  explanation: string;
  shareBlurb: string;
}

export interface ArchetypeInputs {
  classification: 'normal' | 'lognormal' | 'powerlaw';
  spikeRatio: number;
  top10Share: number;
  activeDays: number;
  variance: number;
}

export function determineArchetype(inputs: ArchetypeInputs): ArchetypeData {
  const { classification, spikeRatio, top10Share, activeDays, variance } = inputs;
  const activeDaysShare = activeDays / 365;

  // The Deep Diver: High spike ratio + low active days
  if (spikeRatio >= 6 && activeDaysShare < 0.4) {
    return {
      name: 'The Deep Diver',
      tagline: 'You think between sessions, then return with intensity.',
      explanation: 'Your writing happens in concentrated bursts. You gather insights during quiet periods, then pour them out in powerful sessions.',
      shareBlurb: 'Deep thinking, powerful returns.',
    };
  }

  // The Steady Builder: Low variance + high active days
  if (variance < 2 && activeDaysShare > 0.4) {
    return {
      name: 'The Steady Builder',
      tagline: 'You build day by day, creating consistency through small steps.',
      explanation: 'Your writing rhythm is steady and reliable. You show up regularly, building something meaningful over time.',
      shareBlurb: 'Steady progress, day by day.',
    };
  }

  // The Gravity Wells: High top 10% share
  if (top10Share > 0.5) {
    return {
      name: 'The Gravity Wells',
      tagline: 'A few days pulled everything together.',
      explanation: 'Your year was shaped by a handful of intense writing sessions. These moments became gravitational centers for your thoughts.',
      shareBlurb: 'Intense moments that shaped the year.',
    };
  }

  // The Pulse Writer: Moderate spike ratio + high variance
  if (spikeRatio >= 3 && spikeRatio < 6 && variance >= 3) {
    return {
      name: 'The Pulse Writer',
      tagline: 'You write in waves: quiet periods followed by concentrated output.',
      explanation: 'Your writing has a natural rhythm of pauses and surges. You honor the quiet, then return with clarity.',
      shareBlurb: 'Natural rhythm of pause and surge.',
    };
  }

  // The Sprinter: Very high spike ratio
  if (spikeRatio >= 6) {
    return {
      name: 'The Sprinter',
      tagline: 'You move in bursts, then rest.',
      explanation: 'Your writing happens in intense sprints. You pour everything out in concentrated sessions, then take time to recharge.',
      shareBlurb: 'Intense bursts, meaningful rest.',
    };
  }

  // Default: Balanced
  return {
    name: 'The Balanced Writer',
    tagline: 'Your writing rhythm finds its own natural flow.',
    explanation: 'Your writing has a balanced rhythm. You maintain consistency while allowing for natural variation.',
    shareBlurb: 'A balanced rhythm of reflection.',
  };
}

