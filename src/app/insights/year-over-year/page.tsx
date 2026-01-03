import { redirect } from 'next/navigation';

/**
 * Year over Year Route Alias
 * 
 * Canonical route: /insights/compare
 * This alias redirects to maintain URL consistency.
 */
export default function YearOverYearPage() {
  redirect('/insights/compare');
}

