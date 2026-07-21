import "server-only";

// Ephemeral "who's typing" state for the DM threads. It never needs to
// persist, so it lives in memory (the site runs as a single process). A
// conversation is keyed by the sub's user id; each side ('user' | 'goddess')
// has a last-typed timestamp, and you're considered "typing" if that stamp is
// within TTL. Nothing here touches the database.

type Who = "user" | "goddess";

const TTL_MS = 6000; // treat a ping as "still typing" for this long
const MAX_ENTRIES = 5000; // hard cap so a flood can't grow the map forever

const store = new Map<string, { user: number; goddess: number }>();

function prune(now: number): void {
  if (store.size <= MAX_ENTRIES) return;
  for (const [k, v] of store) {
    if (now - v.user > TTL_MS && now - v.goddess > TTL_MS) store.delete(k);
  }
}

/** Record that `who` is currently typing in the given thread. */
export function markTyping(threadId: string, who: Who): void {
  const id = (threadId || "").slice(0, 40);
  if (!id) return;
  const now = Date.now();
  const entry = store.get(id) || { user: 0, goddess: 0 };
  entry[who] = now;
  store.set(id, entry);
  prune(now);
}

/** Is `who` typing in this thread right now (within TTL)? */
export function isTyping(threadId: string, who: Who): boolean {
  const entry = store.get((threadId || "").slice(0, 40));
  if (!entry) return false;
  return Date.now() - entry[who] < TTL_MS;
}
