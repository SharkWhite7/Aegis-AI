# Waitlist endpoint — spec for the site session

This is the half of the waitlist that belongs in `app/`, which the backend
session is not permitted to touch. Everything behind it — validation,
dedupe, storage — is built and tested in `server/`.

Background: `components/sections/Hero.tsx:93` and
`components/chrome/Nav.tsx:41` both link to `#access`, and no Access
section exists in `components/sections/`. The site's primary call to
action currently points at nothing.

## Why this one endpoint lives in the Next app

It is a browser form on the marketing site. Same origin means no CORS, no
preflight and no second hostname, and it ships and rolls back with the
page that contains the form. Everything companion-related stays in the
separate service, whose consumer is the desktop client, not the browser.

Next 16 Route Handlers can only live inside `app/`, which is why this file
is a spec rather than an implementation.

## The contract

```
POST /api/waitlist
Content-Type: application/json

{
  "email":     "ana@example.com",   // required
  "gameTitle": "GTA VI",            // optional, max 120 chars
  "source":    "hero"               // optional: "hero" | "nav" | "other"
}
```

Responses:

| Status | Body | When |
|---|---|---|
| `202` | `{ "ok": true }` | Valid address. **Also returned when the address was already on the list.** |
| `400` | `{ "error": "invalid_request", "message": "...", "field": "email" }` | Bad or missing address, unrecognised `source`. |
| `429` | `{ "error": "rate_limited", "message": "...", "retryAfterSeconds": 60 }` | Too many signups from one address. |

### Three rules that are not arbitrary

1. **A repeat signup must look identical to a new one.** Replying "you are
   already on the list" turns the form into a way of testing whether a
   given person signed up. The server already answers `202 {ok:true}`
   either way and stores no second row.

2. **Never render a signup count.** "1,842 on the list" is a fabricated
   metric by construction, and `lib/site.ts` carries
   `stage: "PRE-ALPHA"`. The service deliberately exposes no count
   endpoint — a test asserts that `GET /waitlist` and
   `GET /waitlist/count` both 404.

3. **The confirmation copy must not imply access exists.** Nothing is
   shipped. "You're on the list" is true; "Welcome to AEGIS AI" is not.

`gameTitle` is the most useful field on the form: it says which profiles
to generate first. Optional, because requiring it costs signups.

## Two ways to wire it up

### A. Proxy to the service (recommended once it is deployed)

`app/api/waitlist/route.ts` forwards the body and passes the status
through. Keeps one implementation of the rules.

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

Note for whoever writes this: the route must read the client's address and
forward it (e.g. as `x-forwarded-for`) if the per-address rate limit is to
mean anything — otherwise every signup looks like it came from the Next
server. Alternatively rate-limit in the route itself.

### B. Call the service's code directly

If the site and the service end up deployed together, import
`joinWaitlist` from `server/src/waitlist/service.ts` and open the database
in the route. Avoids a network hop, at the cost of coupling the two
deploys — which is the thing the split was meant to avoid, so prefer A.

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

## One conflict to resolve: "you hear from us once"

`components/sections/Access.tsx` now ships this copy:

> Leave an address and you hear from us once, when it opens.
> Once. Not a newsletter, not a drip sequence, not a launch countdown.

The schema has a `confirmed_at` column for double opt-in, and a test
asserts new rows are never pre-confirmed. **Double opt-in means two
emails** — a confirmation now and the launch notice later — which
contradicts that promise as written.

The service does not send any mail today, so nothing is broken yet. But
the two cannot both ship. Three ways out, and it is a product call:

1. **No confirmation mail.** Keeps the promise exactly. `confirmed_at`
   stays unused, and unverified addresses stay on the list — accepting
   typos, bounces, and addresses entered by someone other than their
   owner.
2. **Confirm, and adjust the copy** to "one email to confirm, then one
   when it opens." Honest, and slightly less good as copy.
3. **Confirm only where it matters** — e.g. only when an address bounces
   or is reported. Keeps the promise for almost everyone.

The column is kept for now because it costs nothing and option 1 is not
obviously right: an address nobody verified is a real liability at launch,
when it is the only mail that will ever be sent. It is flagged rather than
decided.
