// src/app/lib/share/generateSharePackPng.ts
// Generate PNG blob from SharePack using renderSharePack
// Phase 3.3: UI-only PNG generation from frozen SharePack contract

import { toPng } from 'html-to-image';
import { renderSharePack, type SharePackFrame } from './renderSharePack';
import type { SharePack } from './sharePack';
import React from 'react';
import { createRoot, Root } from 'react-dom/client';

/**
 * Generate PNG blob from SharePack
 * 
 * Pure function - generates PNG from SharePack using renderSharePack.
 * No changes to SharePack or renderSharePack.
 * 
 * @param pack - The SharePack to render
 * @param frame - Frame type for rendering
 * @returns Promise<Blob> PNG blob
 */
export async function generateSharePackPng(
  pack: SharePack,
  frame: SharePackFrame
): Promise<Blob> {
  // Create a temporary container element
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.visibility = 'hidden';
  document.body.appendChild(container);

  let root: Root | null = null;

  try {
    // Render SharePack to container using React
    root = createRoot(container);
    const jsxElement = renderSharePack(pack, { frame });
    root.render(jsxElement);
    
    // Wait for React to render
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Get the rendered element (should be the container's first child)
    const element = container.firstElementChild as HTMLElement;
    if (!element) {
      throw new Error('Failed to render SharePack');
    }

    // Generate PNG using html-to-image
    const dataUrl = await toPng(element, {
      quality: 1.0,
      pixelRatio: 2, // High DPI for crisp export
      backgroundColor: '#000000',
    });

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    return blob;
  } finally {
    // Cleanup
    if (root) {
      root.unmount();
    }
    if (container.parentNode) {
      document.body.removeChild(container);
    }
  }
}

