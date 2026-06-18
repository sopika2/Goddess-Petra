import React from "react";

export interface AgeGateProps {
  /** Heading text. */
  title?: string;
  /** Body copy explaining the gate. */
  description?: React.ReactNode;
  /** Label for the confirm button. */
  acceptLabel?: string;
  /** Label for the decline button. */
  declineLabel?: string;
  /** Called when the visitor confirms they are 18 or older. */
  onAccept?: () => void;
  /** Called when the visitor declines. */
  onDecline?: () => void;
}

/**
 * Full-screen 18+ confirmation modal shown on first visit. This is
 * presentational — wire `onAccept`/`onDecline` to your own persistence and
 * redirect. Render it conditionally above your page content.
 */
export function AgeGate({
  title = "Adults only",
  description,
  acceptLabel = "I am 18 or older — Enter",
  declineLabel = "I am under 18 — Leave",
  onAccept,
  onDecline,
}: AgeGateProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/95 p-6 backdrop-blur-md"
    >
      <div className="card w-full max-w-md p-8 text-center shadow-glow">
        <h2 className="font-display text-3xl font-bold text-white">{title}</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          {description ??
            "This site contains adult content and is intended for adults only. By entering you confirm that you are 18 years of age or older and that adult content is legal where you live."}
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <button onClick={onAccept} className="btn-primary w-full">
            {acceptLabel}
          </button>
          <button onClick={onDecline} className="btn-ghost w-full">
            {declineLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
