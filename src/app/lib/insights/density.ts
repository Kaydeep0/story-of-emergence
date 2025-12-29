/**
 * Density calculation for distribution insights
 * Pure function, no side effects
 */

export type DensityLevel = 'low' | 'moderate' | 'high';

export type DensityInput = {
  totalEvents: number;
  scope: 'week' | 'month' | 'year';
};

/**
 * Calculate density level based on total events and scope
 * @param input Total events count and time scope
 * @returns Density level: low, moderate, or high
 */
export function calculateDensity(input: DensityInput): DensityLevel {
  const { totalEvents, scope } = input;

  switch (scope) {
    case 'week': {
      if (totalEvents < 5) {
        return 'low';
      }
      if (totalEvents >= 5 && totalEvents <= 15) {
        return 'moderate';
      }
      return 'high';
    }

    case 'month': {
      if (totalEvents < 20) {
        return 'low';
      }
      if (totalEvents >= 20 && totalEvents <= 60) {
        return 'moderate';
      }
      return 'high';
    }

    case 'year': {
      if (totalEvents < 100) {
        return 'low';
      }
      if (totalEvents >= 100 && totalEvents <= 300) {
        return 'moderate';
      }
      return 'high';
    }

    default: {
      // Fallback to low for unknown scopes
      return 'low';
    }
  }
}

