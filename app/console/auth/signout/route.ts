import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "../../_lib/config";
import { signOut } from "../../_lib/backend";

/**
 * Signing out.
 *
 * POST, not GET: a link that signs you out can be triggered by anything
 * that renders an image. The service is told to revoke the session, and
 * the cookie is cleared whether or not it answers — a service that is
 * down must not trap someone in a session they asked to leave.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) await signOut(token);

  const response = NextResponse.redirect(new URL("/console", request.url), {
    // The browser must not repeat the POST at the new location.
    status: 303,
  });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
