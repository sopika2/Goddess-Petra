// Three bouncing dots + a label — the "… is typing" indicator. Pure CSS
// animation (Tailwind's animate-bounce, staggered), no deps.
export default function TypingDots({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-end gap-0.5">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      <span className="hud text-[9px] text-muted">{label}</span>
    </span>
  );
}
