# Traffic simulation

`simulate-traffic.js` drives the **deployed** ABC Tutoring site with a headless
browser (Playwright / Chromium) so the site's own event-firing code runs
end-to-end and populates PostHog with realistic data.

> This script is **not part of the website**. It is never referenced by the
> site's HTML/JS and never runs in a visitor's browser. Run it manually.

## What it does

- Opens N visitor sessions, each in a **fresh browser context** (so PostHog
  treats them as distinct visitors, not one `distinct_id`).
- Mixes behaviours:
  - **browse_only** — land, scroll, leave
  - **search_then_leave** — one or two subject searches (incl. terms we don't
    offer, e.g. *Chemistry*, *calculus* — the unmet-demand signal), sometimes a
    profile view
  - **view_tutor_no_book** — homepage → tutor profile → leave; ~30% start the
    booking form and abandon it (funnel drop-off)
  - **full_booking** — homepage → (maybe search) → tutor profile → pick a slot →
    fill the form → submit
- Weights tutor popularity unevenly so the "tutor popularity" chart isn't flat.
- Reports a summary and how many PostHog ingestion POSTs it observed.

## Setup

```bash
npm install
npx playwright install chromium
```

## Run

```bash
# against the live site (recommended)
BASE_URL=https://upskilling-pvr.github.io node scripts/simulate-traffic.js

# or positional args: <base-url> <sessions>
node scripts/simulate-traffic.js https://upskilling-pvr.github.io 30

# against a local server (python3 -m http.server 8765)
node scripts/simulate-traffic.js
```

| Env | Default | Meaning |
|---|---|---|
| `BASE_URL` | `http://localhost:8765` | target site (also positional arg 1) |
| `SESSIONS` | `24` | number of visitor sessions (also positional arg 2) |
| `CONCURRENCY` | `3` | parallel browser contexts |
| `HEADED` | _(unset)_ | set to `1` to watch the browsers |

After a run, give PostHog a minute or two, then check **Activity** or the
dashboard.
