# ABC Tutoring — booking prototype

A small static website that lets families book a one-on-one tutoring session
online, plus a PostHog analytics setup and a traffic-simulation script.

**Live:** https://upskilling-pvr.github.io/

Built as the Upskilling Together pre-assessment: a prototype for "Dana," who runs
ABC Tutoring and currently books everything by phone.

---

## What it does

- **Homepage** — short pitch, a free-text subject search, and a grid of all 6 tutors
  (name, subject, rate). Searching a subject we offer filters the grid; searching
  something we don't (e.g. "chemistry") shows a "not currently offered" message and
  records it as an unmet-demand signal.
- **Tutor profile page** (`tutor.html?id=<id>`) — bio, grade levels, hourly rate, and
  open one-hour slots for the next 6 days, grouped by day.
- **Booking** — pick a slot, fill a short form (parent name/email, student name/grade,
  subject). On submit the slot is locked for the rest of the browser session and an
  on-screen confirmation is shown, addressed to Dana + the parent.
  - No real email/SMS is sent — the site is static, with no backend. The confirmation
    panel is a deliberate, visible stand-in for that.
  - No cancellation/reschedule flow — by design, families call Dana to change a booking.

## Tech

Plain HTML/CSS/JS, no build step, no framework. Deployed straight from `main` via
GitHub Pages. State (booked slots) lives in `sessionStorage` for the session only.

```
index.html              Homepage
tutor.html              Tutor profile (reads ?id= from the URL)
assets/css/styles.css   Light, friendly theme
assets/js/config.js     PostHog snippet + ABC.track() helper
assets/js/data.js       6 tutors, slot generation, subject matching, slot locks
assets/js/home.js       Homepage: grid + search
assets/js/tutor.js      Profile: availability, booking form, confirmation
scripts/                Traffic simulation (not part of the site — see below)
.nojekyll               Serve files as-is on GitHub Pages
```

## Analytics (PostHog)

Loaded via the PostHog web snippet in `assets/js/config.js` (US cloud; change
`POSTHOG_HOST` for EU). Autocapture and pageviews are on; the custom events map to
the three things Dana wanted to track:

| Event | Fires when | Properties |
|---|---|---|
| `tutor_profile_viewed` | a tutor profile page loads | `tutor_id`, `tutor_name`, `subject` |
| `booking_started` | parent first interacts with the booking form | `tutor_id`, `subject` |
| `booking_completed` | booking form submitted successfully | `tutor_id`, `subject`, `slot_time` |
| `subject_searched` | homepage search used | `query`, `matched` (bool) |

- **Tutor popularity** → `tutor_profile_viewed` by `tutor_id` / `tutor_name`
- **View → book conversion** → funnel `tutor_profile_viewed` → `booking_started` → `booking_completed`
- **Subject demand incl. gaps** → `subject_searched` by `query` and by `matched`

Public dashboard: https://us.posthog.com/shared/1do9DsidTXUF2j9_QRJkYesYxuwj8w

## Traffic simulation

`scripts/simulate-traffic.js` drives the deployed site with a headless browser
(Playwright) so the site's own event code runs end-to-end and populates PostHog with
realistic data. It is **not** referenced by the site and never runs in a visitor's
browser. See [`scripts/README.md`](scripts/README.md).

```bash
npm install
npx playwright install chromium
BASE_URL=https://upskilling-pvr.github.io node scripts/simulate-traffic.js
```

## Run locally

Any static file server works:

```bash
python3 -m http.server 8765
# then open http://localhost:8765/
```
