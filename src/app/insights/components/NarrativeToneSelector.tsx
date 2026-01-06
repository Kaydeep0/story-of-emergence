'use client';

import type { NarrativeTone } from '../hooks/useNarrativeTone';

interface NarrativeToneSelectorProps {
  tone: NarrativeTone;
  onToneChange: (tone: NarrativeTone) => void;
}

/**
 * Reusable tone selector component for all Insights lenses
 */
export function NarrativeToneSelector({ tone, onToneChange }: NarrativeToneSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/40">Tone:</span>
      <select
        value={tone}
        onChange={(e) => onToneChange(e.target.value as NarrativeTone)}
        className="text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-white/70 hover:bg-white/10 transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/50 button-haptic visual-haptic-glow"
      >
        <option value="calm">Calm</option>
        <option value="poetic">Poetic</option>
        <option value="analytical">Analytical</option>
        <option value="mirror">Mirror</option>
      </select>
    </div>
  );
}

