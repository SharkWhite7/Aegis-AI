# Waitlist — status and endpoint spec

**Status: the backend half is built and tested; the site half does not
exist, on purpose.** Nothing is blocked and nothing is broken. This file
records where it stands and what the contract is for whenever the form
arrives.

## Where it stands

The service implements signup capture in full: validation, normalisation,
dedupe and storage, covered by tests (`server/test/waitlist.test.ts` and
the waitlist cases in `server/test/http.test.ts`). It sends no mail.

The site has no signup form. Checked on `main`: there is no `<form>`, no
email input and no address collection anywhere in `app/`, `components/`
or `lib/` — the only `<input>` on the page is the game-title field in
`components/sections/your-game/ProfileFinder.tsx`.

That is a deliberate position, not an omission. Two commits moved it
there while this backend was in review:

- `ed704a8` removed the mailing-list promise from the Access section. The
  line *"Leave an address and you hear from us once, when it opens"* is
  gone, and the build bar now takes the width where the pitch used to be.
- `e543260` relabelled both calls to action from **"Request access"** to
  **"Where it stands"**. They still point at `#access`
  (`components/sections/Hero.tsx`, `components/chrome/Nav.tsx`), but they
  now lead to the build bar rather than to a signup.

**The waitlist is deferred, not dropped.** The site's own build bar lists
it as a planned stage still to come — `{ id: "05", label: "Waitlist",
state: "queued" }` in `lib/progress.ts`. So the question is when a form
appears, not whether one was abandoned.

### The earlier "one email" conflict is resolved

A previous version of this file flagged a contradiction: the Access copy
promised exactly one email ever, while `confirmed_at` in the schema
implies double opt-in, which means two. `ed704a8` removed that promise,
so there is nothing left to contradict. `confirmed_at` can stay or go
without friction; it is unused either way, since no mail is sent.

## The contract, for when a form is added

The endpoint belongs in the Next app, not in this service: it is a
browser form on the marketing site, so same origin means no CORS, no
preflight and no second hostname, and it ships and rolls back with the
page that contains it. Next 16 Route Handlers can only live inside
`app/`, which is why this file is a spec rather than an implementation.

```
POST /api/waitlist
Content-Type: application/json

{
  "email":     "ana@example.com",   // required
  "gameTitle": "GTA VI",            // optional, max 120 chars
  "source":    "hero"               // optional: "hero" | "nav" | "other"
}
```

| Status | Body | When |
|---|---|---|
| `202` | `{ "ok": true }` | Valid address. **Also returned when the address was already stored.** |
| `400` | `{ "error": "invalid_request", "message": "...", "field": "email" }` | Bad or missing address, unrecognised `source`. |
| `429` | `{ "error": "rate_limited", "message": "...", "retryAfterSeconds": 60 }` | Too many signups from one address. |

### Three rules that are not arbitrary

1. **A repeat signup must look identical to a new one.** Replying "you
   are already on the list" turns the form into a way of testing whether
   a given person signed up. The service answers `202 {ok:true}` either
   way and stores no second row.

2. **Never render a signup count.** "1,842 on the list" is a fabricated
   metric by construction, and `lib/site.ts` carries
   `stage: "PRE-ALPHA"`. The service exposes no count endpoint — a test
   asserts that `GET /waitlist` and `GET /waitlist/count` both 404.

3. **Whatever the confirmation copy says must be true.** The old promise
   was removed rather than softened, which is the right instinct. If a
   form returns, its copy has to match what actually happens: nothing is
   shipped, so "you're on the list" is true and "welcome to AEGIS AI" is
   not.

`gameTitle` would be the most useful field on the form: it says which
profiles to generate first. Optional, because requiring it costs signups.

## Two ways to wire it up

### A. Proxy to the service (preferred)

`app/api/waitlist/route.ts` forwards the body and passes the status
through, so the rules live in one place.

```ts
// app/api/waitlist/route.ts
const BACKEND = process.env.AEGIS_BACKEND_URL; // e.g. http://127.0.0.1:8787

export async function POST(request: Request) {
  if (!BACKEND) {
    return Response.json(
      { error: "unavailable", message: "waitlist backend is not configured" },
      { status: 503 },
    );
  }
  try {
    const upstream = await fetch(`${BACKEND}/waitlist`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: await request.text(),
      // The form should fail fast rather than hang the page.
      signal: AbortSignal.timeout(5000),
    });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: { "content-type": "application/json" },
    });
  } catch {
    return Response.json(
      { error: "unavailable", message: "could not reach the waitlist" },
      { status: 503 },
    );
  }
}
```

One thing to get right: the route must forward the client's address (for
example as `x-forwarded-for`) or the per-address rate limit means
nothing, because every signup would look like it came from the Next
server. Rate-limiting in the route itself is the alternative.

### B. Call the service's code directly

If the site and the service are deployed together, import `joinWaitlist`
from `server/src/waitlist/service.ts` and open the database in the route.
Avoids a network hop, at the cost of coupling the two deploys — which is
what the split was meant to avoid, so prefer A.

## Verified behaviour

Run against the real service over HTTP:

```
POST /waitlist {"email":"ana@example.com","gameTitle":"GTA VI","source":"hero"}
  -> 202 {"ok":true}
POST /waitlist {"email":"ANA@example.com","source":"nav"}
  -> 202 {"ok":true}          (one row in the database, not two)
POST /waitlist {"email":"nope"}
  -> 400 {"error":"invalid_request","message":"email: is not a valid email address","field":"email"}
```
