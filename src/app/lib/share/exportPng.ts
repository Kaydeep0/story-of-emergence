import { toPng } from 'html-to-image';

/**
 * Export a DOM element as a PNG image and trigger download
 * @param element - The DOM element to export
 * @param filename - Optional filename (default: story-of-emergence-yearly-wrap-YYYY.png)
 */
export async function exportPng(
  element: HTMLElement,
  filename?: string
): Promise<void> {
  // Store original styles
  const originalPosition = element.style.position;
  const originalLeft = element.style.left;
  const originalTop = element.style.top;
  const originalVisibility = element.style.visibility;
  const originalZIndex = element.style.zIndex;
  const originalTransform = element.style.transform;

  try {
    // Temporarily position element for export (html-to-image works better with visible elements)
    element.style.position = 'fixed';
    element.style.left = '0';
    element.style.top = '0';
    element.style.visibility = 'visible';
    element.style.zIndex = '9999';

    // Generate filename if not provided
    const year = new Date().getFullYear();
    const defaultFilename = filename || `story-of-emergence-yearly-wrap-${year}.png`;

    // Small delay to ensure rendering
    await new Promise(resolve => setTimeout(resolve, 100));

    // Remove any transform scaling for export (preview may have scale transform)
    // Card is already at correct dimensions (1080x1350, 1080x1080, or 1200x1200)
    element.style.transform = 'none';

    // Export to PNG with high quality settings
    // Export at 1x pixelRatio for crisp output - card dimensions are already correct
    const dataUrl = await toPng(element, {
      quality: 1.0,
      pixelRatio: 1, // Card is already at correct dimensions, no scaling needed
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
    link.download = defaultFilename;
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
    
    console.error('Failed to export PNG:', error);
    throw error;
  }
}

