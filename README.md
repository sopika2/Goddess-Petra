# GP — Landing site

A self-hosted personal landing page with an age gate, an intro/about page, and a
password-protected **Exposed Wall** (paid exhibitionism feature) where you add
people, upload their photos, and write info they consented to share.

Built with **Next.js (App Router) + React + TypeScript + Tailwind CSS**, backed
by **MariaDB/MySQL** (profiles, visitor analytics, X-login audit, and editable
site settings). Uploaded images live in `data/uploads/` (served via the `/media`
route). The app **creates its own database and tables on startup** — no manual
SQL needed.

## First-time setup

1. Install dependencies (run once):
   ```bash
   npm install
   ```
2. Set your secrets. Open **`.env.local`** and change:
   - `ADMIN_PASSWORD` — the password for the `/admin` area.
   - `ADMIN_SESSION_SECRET` — a long random string. Generate one with:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - `NEXT_PUBLIC_SITE_NAME` — the name shown around the site.
   - **Database** — point `MYSQL_HOST/PORT/USER/PASSWORD/DATABASE` at your
     MariaDB/MySQL server (see **Database** below).

## Database (MariaDB / MySQL)

The app stores everything in MariaDB/MySQL and **provisions itself**: on startup
it runs `CREATE DATABASE/TABLE IF NOT EXISTS`, so you only need a reachable
server and a user — no manual schema setup.

1. Have a MariaDB/MySQL server running and set the connection in `.env.local`:
   ```
   MYSQL_HOST=127.0.0.1
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=your-password
   MYSQL_DATABASE=gp
   ```
   The user needs `CREATE DATABASE` rights (or pre-create the DB and grant the
   user rights on it).
2. (Optional) If you already had data in the old JSON files, import it once:
   ```bash
   node scripts/migrate-json-to-mysql.mjs
   ```
3. **Back up** with `mysqldump`:
   ```bash
   mysqldump -u root -p gp > gp-backup.sql
   ```

## Run it

**During development** (auto-reloads on changes):
```bash
npm run dev
```
Then open http://localhost:3000

**For real / "hosting" on your laptop** (faster, optimized):
```bash
npm run build
npm start
```
By default it serves on port 3000. To use another port:
```bash
npm start -- -p 8080
```
To let other devices on your home network reach it, find your laptop's local IP
and start with:
```bash
npm start -- -H 0.0.0.0
```
then visit `http://<your-laptop-ip>:3000` from another device.

## Using the site

- **`/`** — your landing/intro page. Edit the copy in `app/page.tsx`, and wire the
  link cards to your real platforms (OnlyFans/Fansly, tips, etc.).
- **`/exposed`** — the Exposed Wall: a list of everyone you've added.
- **`/exposed/<name>`** — each person's own page (info + photo gallery).
- **`/admin/login`** — the login page. Sign in with **X** (if configured) or
  your `ADMIN_PASSWORD`. This is your entry point — bookmark it.
- **`/admin`** — the dashboard (only reachable once logged in). Add/edit/delete
  people, upload thumbnails and galleries, write their info, and link each
  person's **X/Twitter handle**. Every profile requires ticking the
  **consent + 18+** confirmation before it can be published.
  - When you're **not** logged in, `/admin` returns a 404 on purpose — so the
    admin panel's existence isn't advertised. Go to `/admin/login` to sign in.

## Sign in with X (Twitter)

This lets you log in to the admin area with your X account, and locks admin
access to **only your account**. It's optional — without it, password login still
works.

**1. Create an X app**
- Go to https://developer.x.com → Developer Portal → create a Project + App
  (the free tier is fine).
- In the app's **User authentication settings**, enable **OAuth 2.0**.
- **Type of App**: choose **Web App, Automated App or Bot** (this is a
  "confidential" client and gives you a Client Secret).
- **App permissions**: "Read" is enough.
- **Callback URI / Redirect URL**: add exactly
  `http://localhost:3000/api/auth/twitter/callback`
  (it must match `TWITTER_CALLBACK_URL` byte-for-byte — including the port).
- **Website URL**: any valid URL (e.g. your X profile).

**2. Copy the keys into `.env.local`**
- From the app's **Keys and Tokens** page, copy the **OAuth 2.0 Client ID** and
  **Client Secret** into `TWITTER_CLIENT_ID` and `TWITTER_CLIENT_SECRET`.
- Set `ADMIN_TWITTER_USERNAME` to your handle without the @ (already
  `Goddess_Petrax3`).

**3. Restart the app.** The login page now shows **"Sign in with X."**

**4. Pin your account id (recommended).** On your first X login, the server
console prints a line like
`[oauth] ... add to .env.local: ADMIN_TWITTER_ID=1234567890 ...`.
Paste that `ADMIN_TWITTER_ID` value into `.env.local` and restart. This locks
admin to your immutable account id (handles can change; ids never do).

> Notes: keep `TWITTER_CALLBACK_URL` identical to the registered callback. If you
> later host on a real domain over HTTPS, register that callback too and update
> the env var. If X rejects bare `localhost`, use `127.0.0.1` (register that
> exact URL instead) — the two are treated as different by X.

## Admin control center

Once logged in (`/admin/login`), the admin area has four tabs:

- **Overview** (`/admin`) — live stats: total visits, unique IPs, visits today, X
  logins, and exposed profiles, plus recent visitors and recent X logins.
- **Profiles** (`/admin/profiles`) — add/edit/delete people on the Exposed Wall.
- **Visitors** (`/admin/visitors`) — the full visitor log (IP, page, referer,
  browser, time) and the **X-logins table** that ties each X handle to the IP it
  signed in from.
- **Settings** (`/admin/settings`) — a small CMS to edit the site's words (name,
  bio, tagline, Throne block, wall headings, footer) without touching code.
  Wrap text in `[[double brackets]]` in a bio line to render it as a redaction.

### Getting real visitor IPs

Next's plain `next start` can't see the client's IP, so `npm start` runs a small
custom server (`server.mjs`) that captures it. On a bare laptop over `localhost`
you'll see `::1` / `127.0.0.1`.

- **Bare / LAN hosting:** leave `TRUST_PROXY_HEADERS=0`. `server.mjs` uses the
  real socket address and ignores forgeable headers, so the logged IP can't be
  spoofed.
- **Behind a Cloudflare tunnel (or a trusted reverse proxy):** set
  `TRUST_PROXY_HEADERS=1`. The real visitor IP is then read from
  `CF-Connecting-IP`. Only enable this when the origin is reachable *only*
  through the tunnel/proxy (otherwise the header is spoofable).

## Privacy & legal — please read

This site logs visitor **IP addresses** and ties **X (Twitter) logins to IPs**.
That is normal, first-party data (your own server logs + accounts that
affirmatively authorized your app via X's consent screen), but it carries
responsibilities:

- **IP addresses and account identities are personal data** under laws like GDPR
  (EU/UK) and CCPA (California). If you have visitors from those places you
  generally need a **privacy notice** explaining what you collect and why, and a
  lawful basis for it.
- **Only use this data consensually.** It's there to run your site and your
  consensual findom/exposure dynamic with people who opted in. Using it to
  identify, threaten, or expose people who have **not** consented is doxxing /
  harassment and is illegal in many places — don't.
- Logs live in the `visits` and `logins` tables in your database. Clear them
  anytime (e.g. `TRUNCATE TABLE visits;` / `TRUNCATE TABLE logins;`) to wipe the
  history.

## Notes & safeguards

- **Age gate**: visitors see an 18+ confirmation on first visit; the choice is
  remembered per device.
- **Consent**: publishing a profile requires confirming the person is 18+, has
  consented, and that you'll honor removal requests. Keep their written consent
  on file off-site.
- **Backups**: two things — the database (`mysqldump -u root -p gp > backup.sql`)
  and the uploaded images in `data/uploads/`.
- **Security**:
  - `ADMIN_SESSION_SECRET` is **mandatory** — login fails closed if it's
    missing, too short, or a placeholder. A unique strong one was generated for
    you in `.env.local`; keep it private.
  - Password login is **disabled when `ADMIN_PASSWORD` is empty** (so a blank
    password can never log in). If you want X-only login, just leave the
    password blank.
  - The session cookie is `secure: false` so it works over plain `http` on a
    laptop/LAN. If you host behind HTTPS, flip `secure` to `true` in the login,
    logout and `app/api/auth/twitter/*` routes.

## Where things live

```
app/                     pages + API routes
  page.tsx               landing / intro (reads settings)
  exposed/               wall + individual profile pages
  admin/                 overview, profiles, visitors, settings, login
  api/admin/             login, logout, upload, profile CRUD, settings
  api/auth/twitter/      Sign in with X — login + callback (OAuth 2.0 PKCE)
  api/track/             visitor beacon (logs IP/UA/path/time)
  media/[name]/          serves uploaded images from data/uploads
components/              AgeGate, ProfileBar, Gallery, SiteFooter, VisitLogger, RichText
lib/                     database (MySQL pool + auto-schema), db (profiles),
                         analytics (visits/logins), settings, auth, twitter, ip, types
server.mjs               production server (captures real IPs; Cloudflare-aware)
scripts/migrate-json-to-mysql.mjs   one-off import of old JSON data into MySQL
data/uploads/            uploaded images
public/goddess-petra.jpg your profile photo (shown on the landing page)
(all profiles, visits, logins, and settings now live in MariaDB/MySQL)
```
