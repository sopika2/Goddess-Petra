import { NextResponse } from "next/server";
import { readUserSession } from "@/lib/usersession";
import { isAuthed } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { isRequestBlocked } from "@/lib/blocks";
import { getPet, claimPet, listPets, countPets, petName } from "@/lib/pets";

// The Pet Pen. GET is public (the herd roster + your own status); POST claims
// a permanent pet number for the signed-in X account.

function siteUrl(): string {
  return (
    (process.env.NEXT_PUBLIC_SITE_URL || "").trim() || "http://localhost:3000"
  );
}

function goddessHandle(): string {
  return (process.env.NEXT_PUBLIC_TWITTER_HANDLE || "").replace(/^@/, "").trim();
}

/** Fill the post template. {n} {name} {handle} {url} */
function renderTweet(template: string, n: number, name: string): string {
  return (template || "")
    .replace(/\{n\}/g, String(n))
    .replace(/\{name\}/g, name)
    .replace(/\{handle\}/g, goddessHandle())
    .replace(/\{url\}/g, siteUrl())
    .slice(0, 1000);
}

export async function GET() {
  const s = await getSettings();
  if (!s.petsEnabled) {
    return NextResponse.json({ enabled: false, pets: [], count: 0 });
  }
  const [user, admin, pets, count] = await Promise.all([
    readUserSession(),
    isAuthed(),
    listPets(),
    countPets(),
  ]);
  const mine = user ? await getPet(user.id) : null;
  const name = mine ? petName(s.petNameTemplate, mine.number) : "";
  return NextResponse.json({
    enabled: true,
    signedIn: !!user,
    isAdmin: admin,
    pets,
    count,
    pet: mine,
    petName: name,
    tweetText: mine ? renderTweet(s.petTweetTemplate, mine.number, name) : "",
    nextNumber: count + 1, // what they'd get, shown before claiming
  });
}

export async function POST(req: Request) {
  const s = await getSettings();
  if (!s.petsEnabled) {
    return NextResponse.json({ error: "The pen is closed." }, { status: 403 });
  }
  const user = await readUserSession();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in with X to be claimed." },
      { status: 401 },
    );
  }
  if (await isRequestBlocked(req.headers, user.id)) {
    return NextResponse.json({ error: "no." }, { status: 403 });
  }

  const pet = await claimPet({
    userId: user.id,
    username: user.username,
    name: user.name,
    image: user.image,
  });
  if (!pet) {
    return NextResponse.json({ error: "Could not claim." }, { status: 400 });
  }
  const name = petName(s.petNameTemplate, pet.number);
  return NextResponse.json({
    pet,
    petName: name,
    tweetText: renderTweet(s.petTweetTemplate, pet.number, name),
  });
}
