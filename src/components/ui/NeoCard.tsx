import * as React from "react";
import { cn } from "../../lib/utils";

export interface NeoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Whether this card is the primary signal/insight
   */
  primary?: boolean;
}

/**
 * Canonical card component for Story of Emergence
 * 
 * Provides consistent physics across all panels:
 * - Dark glass aesthetic
 * - Proper isolation for z-index stacking
 * - Glow effects that don't cause scroll artifacts
 * - Responsive to density mode
 * 
 * Layer 4: Visual encoding
 */
export function NeoCard({ className, primary = false, ...rest }: NeoCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-[var(--radius-xl)] border border-[hsl(var(--line))] bg-[hsl(var(--panel)/0.70)]",
        "shadow-[0_0_0_1px_hsl(var(--line)/0.2),var(--glow-soft)]",
        "backdrop-blur-[10px]",
        "isolate", // Deterministic z-index stacking
        "overflow-hidden", // Contain decorative layers
        primary && "shadow-[0_0_0_1px_hsl(var(--line)/0.3),var(--glow-mid)]",
        className
      )}
      {...rest}
    />
  );
}

