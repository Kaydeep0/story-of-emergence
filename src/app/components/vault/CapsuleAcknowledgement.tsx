'use client';

/**
 * Capsule Acknowledgement
 * Quiet, inline confirmation after capsule creation
 * Factual, finite, ends the mental loop
 * No implication of recipient state or tracking
 * 
 * Language avoids: "Delivered", "Received", "Opened", "Seen"
 * Think: A sealed envelope placed on a table. Nothing more.
 */
export function CapsuleAcknowledgement() {
  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <p className="text-xs text-white/60 leading-relaxed">
        This capsule has been created and sealed. Access depends on the recipient choosing to open it.
      </p>
    </div>
  );
}

