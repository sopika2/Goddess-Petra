# design-sync notes — @gp/design-system (Goddess Petra)

Repo-specific gotchas for future syncs. Append as you learn more.

## Build & environment

- **The design system is a subpackage at `design-system/`**, not the repo root. The
  root `package.json` is a Next.js app (`gp-landing`); `npm run build` at root builds
  Next, NOT the DS. `cfg.buildCmd` is therefore `npm --prefix design-system run build`
  (runs `node build.mjs && tsc --emitDeclarationOnly && tailwindcss …`). The DS's own
  `design-system/node_modules` carries esbuild/tsc/tailwindcss + react/react-dom.
- Converter entry: `./design-system/dist/index.js`; `--node-modules ./design-system/node_modules`.
- `dist/` is already built and present in the repo, so a re-sync only needs the rebuild
  if `design-system/src/**` changed.

## Render check (playwright)

- No playwright/chromium was cached. We installed ONLY the Playwright JS driver
  (`cd .ds-sync && PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i playwright`) — no ~200MB
  chromium download — and pointed it at the **system Chrome** via
  `DS_CHROMIUM_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"`.
  Re-runs of `package-validate.mjs` / `package-capture.mjs` need that env var set.

## Theme / previews

- **Dark-themed DS**: `bg-ink` (#0a0a0f) page, white text, accent pink (#d6336c /
  #f06595). The converter's preview cards hardcode a WHITE card background
  (`body{background:#fff}` in emit.mjs, which we must not fork), so white-on-dark text
  would be invisible. Every authored preview in `.design-sync/previews/` therefore wraps
  its content in a dark `Stage`/`Scene` div (`background:#0a0a0f`). Keep that wrapper on
  any new preview.
- **AgeGate** is a full-screen `fixed inset-0` overlay. Its preview wraps it in a `Scene`
  div with `transform: translateZ(0)` so the fixed overlay is contained to a card-sized
  box (the transform makes the wrapper the containing block). `cfg.overrides.AgeGate`
  pins `cardMode: single`, a taller viewport, and `primaryStory: Default`.
- Full-width components use `cfg.overrides.<Name>.cardMode = "column"`: ProfileBar,
  LinkCard, SiteFooter.
- Placeholder imagery (Avatar / Gallery / ProfileBar / ProfileHeader thumbnails) uses
  inline SVG data-URI gradients so cards render offline — no real brand photos ship.

## Known render warns (triaged, not failures)

- `tokens: … (1 missing, below threshold)` → the missing var is `--tw-shadow-color`, a
  Tailwind-internal variable that shadow utilities (`.shadow-glow`) set at use-site. Benign.

## Re-sync risks (what can silently go stale)

- **`cfg.buildCmd` targets the subpackage.** If the repo is restructured (DS moved out of
  `design-system/`, or published to npm), update buildCmd + entry + node-modules path.
- **Playwright/Chrome path is machine-specific.** `DS_CHROMIUM_PATH` points at a Windows
  system Chrome install. On a different machine/OS, re-make the §4.1 install-or-skip
  decision (cache a chromium, or repoint DS_CHROMIUM_PATH).
- **SiteFooter `Default` cell shows a dynamic year** (`new Date().getFullYear()`), so its
  rendered screenshot year changes over time. Grades follow sources, not pixels, so this
  won't clear the grade — just don't treat a year change in the screenshot as a regression.
- **Authored previews are tied to the components' current props.** If a component's `.d.ts`
  API changes (e.g. Button variants, Avatar `size`), re-check the matching
  `.design-sync/previews/<Name>.tsx`.
- Data-URI placeholder images are self-contained (no upstream dependency) — safe.
