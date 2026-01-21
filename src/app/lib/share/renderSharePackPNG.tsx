/**
 * LEGACY FROZEN
 * Status: frozen in place
 * Reason: superseded by SharePackRenderer with mode='png'
 * Rule: do not extend, do not add new call sites
 * Allowed: bug fix for existing call sites only
 * Note: no known imports as of 2026-01-21
 */

// src/app/lib/share/renderSharePackPNG.tsx
// Legacy wrapper - use SharePackRenderer with mode='png' instead

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

