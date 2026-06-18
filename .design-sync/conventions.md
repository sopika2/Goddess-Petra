# Goddess Petra design system — how to build with it

A **dark-themed** React component library (adult-content creator brand). Tailwind-based:
components carry brand classes; you write layout glue with the same brand utilities.

## Setup — dark surface is required

These components render **white text on a dark background**. Put your screens on the brand
ink surface, or text and borders disappear. There is **no provider/context** to wrap — just
import the stylesheet and use a dark root:

```jsx
import { Button, Card } from "@gp/design-system";
// styles.css is the design system's stylesheet (tokens, fonts, component classes)

export default function Screen() {
  return (
    <div className="min-h-screen bg-ink text-white">
      <Card className="mx-auto mt-16 max-w-md p-8">
        <h2 className="font-display text-2xl font-bold">Members area</h2>
        <p className="mt-2 text-sm text-muted">Sign in to view the full gallery.</p>
        <Button variant="primary" className="mt-6">Enter</Button>
      </Card>
    </div>
  );
}
```

(`styles.css` already sets `body { @apply bg-ink text-white font-body }`, so a full page
inherits the dark theme; the explicit `bg-ink` above is for isolated regions.)

## Styling idiom — Tailwind with brand tokens

Style with these brand utilities (the only on-brand color/type/effect names). Use them for
your own layout glue; reach for raw hex only when nothing here fits.

| Family | Names |
|---|---|
| Background | `bg-ink` (page), `bg-surface`, `bg-surface-2`, `bg-accent`, `bg-accent-soft` |
| Text | `text-white`, `text-muted`, `text-accent`, `text-accent-soft` |
| Border | `border-line`, `border-accent-soft` |
| Font | `font-display` (serif headings); body copy is the sans `font-body` by default — applied globally, no class needed |
| Effect | `shadow-glow` (pink glow), `backdrop-blur` |

Component-level classes baked into the DS (you rarely set these directly — the components
apply them, but they exist if composing): `btn-primary`, `btn-ghost`, `card`, `input`,
`label`.

**Don't invent color names** (`bg-pink-600`, `text-gray-400`) — use the brand tokens above
so everything stays on-palette. The palette: ink `#0a0a0f`, surface `#15131c` / `#1f1b2b`,
line `#2a2536`, accent `#d6336c`, accent-soft `#f06595`, muted `#a39bb5`.

## Where the truth lives

- `styles.css` (and its `@import`s) — the full token + component-class source. Read it
  before styling.
- `components/<Name>/<Name>.prompt.md` — per-component usage + variants.
- `components/<Name>/<Name>.d.ts` — the exact prop contract.

## Composition notes

- **Buttons**: `variant="primary"` for the main CTA, `variant="ghost"` for secondary; pass
  `href` to render a styled link instead of a `<button>`.
- **Forms**: pair `Label` (with `htmlFor`) above `Input`/`Textarea` (matching `id`).
- **AgeGate** is a full-screen `fixed inset-0` modal — render it conditionally above page
  content and wire `onAccept`/`onDecline` yourself.
- **ProfileHeader / ProfileBar / Avatar** take an image `src`/`thumbnail`; without one they
  fall back to the name's initial.
