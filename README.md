# Skelton Realty Group — public site

The Next.js 16 marketing site and applicant/resident portal for
**skeltonrealtygroup.com**.

It holds no data of its own. Inventory, applications, payments and residents all
live in the Django service, which is a **separate repository** — see
`../backend` locally, or wherever it is deployed. The two talk over HTTP only,
so either can be redeployed without the other.

> **This is not the Next.js you may know.** The version here has breaking
> changes from earlier releases — `middleware.ts` is gone, replaced by
> `proxy.ts`, among others. The bundled docs in `node_modules/next/dist/docs/`
> are the authority. See `AGENTS.md`.

## Running it

```bash
npm ci
cp .env.example .env.local     # then fill it in — see below
npm run dev                    # http://localhost:3000
```

The API defaults to `http://127.0.0.1:8000/api/v1`, so start the backend too or
the listing pages fall back to development fixtures.

## Configuration

Everything the site publishes but cannot invent lives in `.env.local`: contact
details, fee amounts, lease facts. Anything left blank renders a visible
**TO CONFIRM** marker on the live page rather than a plausible guess — a wrong
fee is worse than a blank, because nothing on the page signals it is wrong.

```bash
node scripts/launch-gate.mjs    # lists exactly what is still missing
```

It exits non-zero while anything is outstanding. Two things are deliberately
**not** here:

- **Payment account details** — Django admin, under Billing → Payment method
  configs, because they change without a deploy.
- **Brokerage licences** — `lib/content/licensing.ts`, because a named broker
  per state with several licence formats and state-mandated disclosure text
  does not fit one line, and a licence number should not change without
  appearing in a diff.

Leave `NEXT_PUBLIC_SITE_ORIGIN` and `NEXT_PUBLIC_API_BASE_URL` **blank** for
local work. Blank falls back to the working defaults; an example hostname does
not, and the site then serves invented homes at invented prices with nothing on
the page to say so.

## Checks

```bash
npm test                                  # unit tests
npx tsc --noEmit && npx eslint .
npm run build

# against a running server
node scripts/launch-gate.mjs
node scripts/indexation-audit.mjs  --base http://localhost:3000
node scripts/a11y-audit.mjs        --base http://localhost:3000
node scripts/fair-housing-audit.mjs --base http://localhost:3000
node scripts/flex-text-audit.mjs   --base http://localhost:3000
node scripts/perf-audit.mjs        --base http://localhost:3000
python3 .design/skelton-rental-platform/validate-contrast.py
```

`validate-contrast.py` is worth running on every deploy, not just the first: it
fails loudly if the theme block goes missing from `app/tokens.css`. That has
happened, and the symptom is subtle — components keep their overrides while the
palette does not, and the footer renders white text on a white background
across the whole site.

## Deploying

```bash
npm ci && npm run build && npm start
```

Set `NEXT_PUBLIC_SITE_ORIGIN`, `NEXT_PUBLIC_API_BASE_URL` and `JWT_SECRET`
(which must match Django's). Point `NEXT_PUBLIC_MAP_TILE_URL` at a paid tile
host — the OpenStreetMap default is fine for development but its usage policy
does not permit production traffic.

## Known gaps

- **Uploaded receipts are unreachable.** They are written to
  `private-uploads/`, which is not served — deliberately, because the previous
  behaviour wrote them under `public/`, where an uploaded `.html` or `.svg`
  became stored XSS on our own origin. Reading one back needs an authenticated
  route, and properly the files belong in Django. A rejected upload also fails
  silently: the save action has no error channel.
- **No analytics consent gate.** Visitor geography is derived from a truncated
  IP. Fine under US rules; a banner is required before launching anywhere
  covered by GDPR/ePrivacy.
- **Staff alerts bypass the queue.** `lib/mailer.ts` sends over SMTP directly,
  so those are not branded, retried or logged in the admin. They carry
  applicant names, so `ALERT_EMAIL_RECIPIENT` must be an address the business
  controls; unset means nothing is sent.
- **Legal copy is unwritten.** Terms, the privacy policy and fee refundability
  need counsel. These are the `TO CONFIRM` markers `.env` cannot fill.
# jerryfront
# jerryfront
