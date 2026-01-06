// src/app/lib/share/renderSharePack.tsx
// Legacy wrapper - use SharePackRenderer component instead
// Kept for backward compatibility

import React from 'react';
import type { SharePack } from './sharePack';
import { SharePackRenderer } from './SharePackRenderer';

/**
 * Frame type for SharePack rendering
 */
export type SharePackFrame = 'square' | 'story' | 'landscape';

/**
 * Render a SharePack as a React element
 * 
 * @deprecated Use SharePackRenderer component instead
 * 
 * This is a legacy wrapper around SharePackRenderer.
 * Use SharePackRenderer directly for new code.
 * 
 * @param pack - The SharePack to render (canonical contract)
 * @param opts - Rendering options
 * @param opts.frame - Frame type (square, story, landscape)
 * @returns JSX.Element representing the share card
 */
export function renderSharePack(
  pack: SharePack,
  opts: { frame: SharePackFrame }
) {
  // Return JSX element (not component) for backward compatibility
  return React.createElement(SharePackRenderer, { 
    sharePack: pack, 
    mode: 'png' as const, 
    frame: opts.frame 
  });
}

