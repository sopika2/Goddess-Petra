# Rollback — putting the site back to how it was

If the new version (paid-DM removal, media/videos, push notifications, tribute
stickers, secret login, IP/X blocking) misbehaves in production, you can return
the site to **exactly** its previous live state in one command.

## The restore point

The exact code that was live before this overhaul is tagged:

```
live-backup-2026-07-15
```

(It points at commit `e0080e8`.) Nothing about that commit changes — it's a
permanent bookmark of "the old, known-good site."

## To roll back (run on the production server)

```bash
cd /path/to/goddess-petra
bash scripts/rollback.sh
```

Then **restart the app** the way you normally do (for example
`pm2 restart goddess-petra`, or `sudo systemctl restart <your-service>`, or
however you run `npm start` / `node server.mjs`).

That's it. The site is now the old version.

### If you prefer to do it by hand

```bash
git fetch --tags
git checkout live-backup-2026-07-15
npm ci
npm run build
# …then restart the app
```

## What about the database?

**Nothing to do.** Every database change the new version made was *additive* —
it only ever **added** new tables (`blocks`, `push_subs`, `chat_flags`,
`credit_*` if present) and new columns on `messages`. The old code doesn't look
at any of them, so it runs perfectly against the current database, and none of
your data (profiles, messages, visitors, logins) is touched or lost.

You never have to touch MySQL to roll back.

## Going back to the new version later

Once the new version is fixed:

```bash
git checkout main
git pull
npm ci
npm run build
# …then restart
```

## Notes

- `git checkout live-backup-2026-07-15` puts you in a "detached HEAD" — that's
  normal and fine for running the server. `git checkout main` returns you to the
  latest line of development.
- The rollback is non-destructive: it doesn't delete the new version, it just
  runs the old one. You can flip back and forth freely.
- Uploaded files in `data/uploads/` (including anything subscribers sent) are
  never deleted by any version — a rollback leaves them all in place.
