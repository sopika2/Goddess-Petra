// A little sticky-note callout with a hand-drawn arrow pointing DOWN at the
// Throne tribute button — signals that the DM fee is paid there. Rendered just
// above the button inside the Throne folder; hidden when the note is blank.
export default function DmFeeCallout({ note }: { note: string }) {
  if (!note || !note.trim()) return null;
  return (
    <div className="mt-5 flex flex-col items-center gap-1 text-center">
      <span className="sticker-tag -rotate-2 font-hand text-lg normal-case leading-tight">
        {note}
      </span>
      <svg
        viewBox="0 0 44 46"
        className="h-9 w-9 text-accent"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M24 5 C 32 16, 15 24, 23 38" />
        <path d="M15 30 L23 40 L32 31" />
      </svg>
    </div>
  );
}
