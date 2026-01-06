// src/app/components/ContinueThreadButton.tsx
// Single component for "Continue thread" button

'use client';

import { useRouter } from 'next/navigation';
import { buildThreadUrl } from '../lib/navigation';
import { addToBreadcrumbPath } from '../lib/cabinBreadcrumbs';

interface ContinueThreadButtonProps {
  nextReflectionId: string;
  cabin?: boolean;
  currentReflectionId?: string;
  currentReflectionTitle?: string;
}

export function ContinueThreadButton({ nextReflectionId, cabin = false, currentReflectionId, currentReflectionTitle }: ContinueThreadButtonProps) {
  const router = useRouter();

  const handleContinue = () => {
    if (!nextReflectionId) {
      console.error('[ContinueThreadButton] Missing reflection ID');
      return;
    }
    // Add current reflection to breadcrumb path before navigating (if in cabin mode)
    // This tracks the reflection we're leaving, not the one we're going to
    if (cabin && currentReflectionId && currentReflectionTitle) {
      addToBreadcrumbPath(currentReflectionId, currentReflectionTitle);
    }
    // Continue thread always triggers auto-cabin (crossing narrative bridge)
    router.push(buildThreadUrl(nextReflectionId, { fromBridge: true }));
  };

  return (
    <button
      onClick={handleContinue}
      className={`mt-4 px-4 py-2 rounded border ${
        cabin 
          ? 'border-[hsl(var(--accent)/0.3)] bg-[hsl(var(--accent)/0.05)] hover:bg-[hsl(var(--accent)/0.1)]' 
          : 'border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--accent)/0.1)] hover:bg-[hsl(var(--accent)/0.2)]'
      } text-[hsl(var(--accent))] transition-colors text-sm`}
    >
      Continue thread →
    </button>
  );
}

