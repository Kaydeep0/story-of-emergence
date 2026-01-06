// src/app/lib/share/renderSharePackPNG.tsx
// Legacy wrapper - use SharePackRenderer with mode='png' instead
// Kept for backward compatibility

'use client';

import type { SharePack } from './sharePack';
import { SharePackRenderer } from './SharePackRenderer';

/**
 * SharePack PNG Renderer Component
 * 
 * @deprecated Use SharePackRenderer with mode='png' instead
 * 
 * Renders a SharePack as a visual card suitable for PNG export.
 * Works for all lens types (weekly, summary, timeline, yearly, distributions, yoy, lifetime).
 */
export function SharePackPNGRenderer({ sharePack }: { sharePack: SharePack }) {
  return <SharePackRenderer sharePack={sharePack} mode="png" frame="square" />;
}

