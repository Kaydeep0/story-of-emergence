// src/app/lib/share/exportPublicShareImage.ts
// Export PublicShareImage as PNG - Pure client-side render → image export
// No metadata injection, no identity or year in filename

import { toPng } from 'html-to-image';

/**
 * Export PublicShareImage component as PNG
 * 
 * Pure client-side render → image export.
 * No metadata injection, no identity or year in filename.
 * 
 * @param element - The DOM element containing PublicShareImage
 * @returns Promise that resolves when download completes
 */
export async function exportPublicShareImage(
  element: HTMLElement
): Promise<void> {
  // Store original styles
  const originalPosition = element.style.position;
  const originalLeft = element.style.left;
  const originalTop = element.style.top;
  const originalVisibility = element.style.visibility;
  const originalZIndex = element.style.zIndex;
  const originalTransform = element.style.transform;

  try {
    // Temporarily position element for export
    element.style.position = 'fixed';
    element.style.left = '0';
    element.style.top = '0';
    element.style.visibility = 'visible';
    element.style.zIndex = '9999';

    // Generic filename - no identity or year
    const filename = 'story-of-emergence-share.png';

    // Small delay to ensure rendering
    await new Promise(resolve => setTimeout(resolve, 100));

    // Remove any transform scaling for export
    element.style.transform = 'none';

    // Export to PNG with high quality settings
    const dataUrl = await toPng(element, {
      quality: 1.0,
      pixelRatio: 1,
      backgroundColor: '#000000',
      cacheBust: true,
    });

    // Restore original styles
    element.style.position = originalPosition;
    element.style.left = originalLeft;
    element.style.top = originalTop;
    element.style.visibility = originalVisibility;
    element.style.zIndex = originalZIndex;
    element.style.transform = originalTransform;

    // Create download link
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    // Restore original styles even on error
    element.style.position = originalPosition;
    element.style.left = originalLeft;
    element.style.top = originalTop;
    element.style.visibility = originalVisibility;
    element.style.zIndex = originalZIndex;
    element.style.transform = originalTransform;
    
    console.error('Failed to export PublicShareImage:', error);
    throw error;
  }
}

