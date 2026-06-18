import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";
import { USER_COOKIE } from "@/lib/usersession";
import { appUrl } from "@/lib/url";

// Sign the visitor out: clears both the user session and (if present) the admin
// session, then sends them home. GET so it can be a plain link in the header.
// We ignore cross-site requests (e.g. a malicious <img src>) so a third-party
// page can't force-log-out the visitor; same-origin clicks and direct
// navigations still work.
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(appUrl("/", req));
  if (req.headers.get("sec-fetch-site") === "cross-site") return res;
  res.cookies.set(USER_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
