'use client';

import { useEffect, useState } from 'react';
import { useHighlights } from '../lib/insights/useHighlights';
import { useInternalEvents } from '../lib/internalEvents';
import { useInsightEngine } from '../lib/insights/useInsightEngine';

export default function DebugInsightStrip() {
  const { highlights } = useHighlights();
  const { events } = useInternalEvents();
  const engine = useInsightEngine();

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Press D to toggle debug strip
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D') setVisible(v => !v);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'rgba(0,0,0,0.8)',
      padding: '10px 20px',
      color: '#fff',
      fontSize: '12px',
      zIndex: 9999,
      borderTop: '1px solid rgba(255,255,255,0.2)'
    }}>
      <strong>Insight Debug</strong>  
      <div>Events loaded: {events?.length ?? 0}</div>
      <div>Highlights: {highlights?.length ?? 0}</div>
      <div>Engine: {engine?.status ?? 'unknown'}</div>
      <div>Recipes computed: {engine?.recipes?.length ?? 0}</div>
      <div>Sources: {engine?.external?.length ?? 0}</div>
    </div>
  );
}
