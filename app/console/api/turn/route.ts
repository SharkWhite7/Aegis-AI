import { cookies } from "next/headers";
import { SESSION_COOKIE, BACKEND_URL } from "../../_lib/config";
import { whoAmI } from "../../_lib/backend";

/**
 * Proxies a streamed turn from the companion service to the browser.
 *
 * A Server Action cannot do this: it returns a value, so a reply would
 * arrive whole or not at all. Streaming needs a route the client reads
 * with fetch, which is why the composer talks here rather than calling an
 * action.
 *
 * The body is passed through untouched and never buffered — buffering
 * would defeat the point, and a voice reply later cannot start playing
 * until text starts arriving.
 */
export async function POST(request: Request): Promise<Response> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  // Checked here as well as downstream: this route is reachable directly,
  // not only from the screen that renders the composer.
  if (!token || !(await whoAmI(token))) {
    return Response.json(
      { error: "unauthorized", message: "sign in required" },
      { status: 401 },
    );
  }
  if (!BACKEND_URL) {
    return Response.json(
      { error: "unavailable", message: "the companion service is not configured" },
      { status: 503 },
    );
  }

  const body = (await request.json()) as { sessionId?: string; text?: string };
  if (!body.sessionId) {
    return Response.json(
      { error: "invalid_request", message: "no session" },
      { status: 400 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(
      `${BACKEND_URL}/chat/sessions/${encodeURIComponent(body.sessionId)}/turns/stream`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: body.text ?? "" }),
        // No timeout: a long reply is the normal case here, unlike the
        // short request/response calls elsewhere in this client.
        cache: "no-store",
      },
    );
  } catch {
    return Response.json(
      { error: "unavailable", message: "could not reach the companion" },
      { status: 503 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return new Response(text || JSON.stringify({ error: "upstream_failed" }), {
      status: upstream.status,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      // Stops a proxy from collecting the whole body before passing it on.
      "x-accel-buffering": "no",
    },
  });
}
