// src/app/lib/cabinBreadcrumbs.ts
// Breadcrumb path tracking for cabin mode navigation

export interface BreadcrumbItem {
  reflectionId: string;
  title: string;
  timestamp: number;
}

const BREADCRUMB_STORAGE_KEY = 'soe-cabin-breadcrumbs';
const MAX_BREADCRUMBS = 6;

/**
 * Get current breadcrumb path from sessionStorage
 */
export function getBreadcrumbPath(): BreadcrumbItem[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = sessionStorage.getItem(BREADCRUMB_STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored) as BreadcrumbItem[];
    // Validate structure
    if (Array.isArray(parsed) && parsed.every(item => 
      typeof item.reflectionId === 'string' &&
      typeof item.title === 'string' &&
      typeof item.timestamp === 'number'
    )) {
      return parsed;
    }
  } catch (e) {
    console.error('Failed to parse breadcrumb path:', e);
  }
  
  return [];
}

/**
 * Add a reflection to the breadcrumb path
 * Removes duplicates and keeps only the last MAX_BREADCRUMBS items
 */
export function addToBreadcrumbPath(reflectionId: string, title: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const current = getBreadcrumbPath();
    
    // Remove if already exists (avoid duplicates)
    const filtered = current.filter(item => item.reflectionId !== reflectionId);
    
    // Add new item
    const updated = [
      ...filtered,
      {
        reflectionId,
        title: title.slice(0, 60) + (title.length > 60 ? '...' : ''), // Truncate long titles
        timestamp: Date.now(),
      }
    ];
    
    // Keep only last MAX_BREADCRUMBS items
    const trimmed = updated.slice(-MAX_BREADCRUMBS);
    
    sessionStorage.setItem(BREADCRUMB_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to save breadcrumb path:', e);
  }
}

/**
 * Clear breadcrumb path (e.g., when exiting cabin)
 */
export function clearBreadcrumbPath(): void {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.removeItem(BREADCRUMB_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear breadcrumb path:', e);
  }
}

/**
 * Remove items after a specific reflection ID (when navigating back)
 */
export function truncateBreadcrumbPathAt(reflectionId: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const current = getBreadcrumbPath();
    const index = current.findIndex(item => item.reflectionId === reflectionId);
    
    if (index >= 0) {
      // Keep items up to and including the clicked item
      const truncated = current.slice(0, index + 1);
      sessionStorage.setItem(BREADCRUMB_STORAGE_KEY, JSON.stringify(truncated));
    }
  } catch (e) {
    console.error('Failed to truncate breadcrumb path:', e);
  }
}

