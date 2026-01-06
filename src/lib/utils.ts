/**
 * Utility functions for Story of Emergence
 */

/**
 * Conditionally join Tailwind CSS classes
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

