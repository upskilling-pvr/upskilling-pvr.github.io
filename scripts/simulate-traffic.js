/*
 * ABC Tutoring — traffic simulation (Playwright, headless Chromium).
 *
 * Drives the REAL deployed site end-to-end so the site's own event-firing code
 * runs and populates PostHog with realistic data. This file is NOT referenced by
 * the site and never runs in a visitor's browser. Run it manually.
 *
 *   BASE_URL=https://upskilling-pvr.github.io node scripts/simulate-traffic.js
 *   node scripts/simulate-traffic.js https://upskilling-pvr.github.io 30
 *
 * Env / args:
 *   BASE_URL       target site (default http://localhost:8765)   [arg 1]
 *   SESSIONS       number of visitor sessions (default 24)        [arg 2]
 *   CONCURRENCY    parallel browser contexts (default 3)
 *   HEADED=1       show the browser windows
 *
 * Each session is a fresh browser context => its own PostHog distinct_id, so
 * PostHog sees distinct visitors rather than one.
 *
 * NOTE on the "stealth" bits below: posthog-js has a built-in bot filter that
 * drops events when the browser advertises `HeadlessChrome` / `navigator.webdriver`.
 * We're simulating real visitor traffic to our own project and explicitly want
 * these sessions counted, so each context presents a normal desktop/mobile
 * Chrome identity. Nothing here touches the deployed site.
 */

const { chromium } = require("playwright");

const BASE_URL = (process.env.BASE_URL || process.argv[2] || "http://localhost:8765").replace(/\/+$/, "");
const SESSIONS = parseInt(process.env.SESSIONS || process.argv[3] || "24", 10);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "3", 10);
const HEADLESS = !process.env.HEADED;

/* Uneven tutor popularity so the "tutor popularity" chart has a story to tell. */
const TUTOR_WEIGHTS = { t1: 3, t2: 5, t3: 6, t4: 2, t5: 2, t6: 1 };

/* Session-type mix: most visitors browse or bounce, a minority book. */
const SESSION_MIX = { browse_only: 18, search_then_leave: 22, view_tutor_no_book: 32, full_booking: 28 };

const OFFERED_SEARCHES = [
  "algebra", "algebra II", "geometry", "pre-algebra", "math",
  "reading", "phonics", "biology", "science", "fractions",
];
/* At least one unmet-demand term per run is effectively guaranteed by this pool. */
const UNMET_SEARCHES = ["chemistry", "calculus", "Spanish", "SAT prep", "history", "coding", "trigonometry"];

const FIRST = ["Sam", "Alex", "Jordan", "Riley", "Casey", "Morgan", "Taylor", "Jamie", "Avery", "Quinn", "Drew", "Skyler"];
const LAST = ["Nguyen", "Patel", "Garcia", "Kim", "Johnson", "Brown", "Davis", "Martinez", "Lee", "Clark", "Lewis", "Walker"];
const GRADES = ["K", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

const CHROME_V = "141";
/* Paired viewport + identity so a mobile viewport gets a mobile UA, etc. */
const PROFILES = [
  {
    viewport: { width: 1280, height: 800 },
    ua: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_V}.0.0.0 Safari/537.36`,
    uaData: { mobile: false, platform: "macOS" },
  },
  {
    viewport: { width: 1440, height: 900 },
    ua: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_V}.0.0.0 Safari/537.36`,
    uaData: { mobile: false, platform: "macOS" },
  },
  {
    viewport: { width: 1366, height: 768 },
    ua: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_V}.0.0.0 Safari/537.36`,
    uaData: { mobile: false, platform: "Windows" },
  },
  {
    viewport: { width: 390, height: 844 },
    ua: `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROME_V}.0.0.0 Mobile Safari/537.36`,
    uaData: { mobile: true, platform: "Android" },
  },
];

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const choice = (arr) => arr[rand(0, arr.length - 1)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function weightedChoice(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of entries) if ((r -= w) < 0) return k;
  return entries[entries.length - 1][0];
}

/* Present a normal Chrome identity so posthog-js doesn't classify us as a bot. */
async function makeContext(browser) {
  const p = choice(PROFILES);
  const context = await browser.newContext({ viewport: p.viewport, userAgent: p.ua, locale: "en-US" });
  await context.addInitScript(
    ({ mobile, platform }) => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      const brands = [
        { brand: "Google Chrome", version: "141" },
        { brand: "Chromium", version: "141" },
        { brand: "Not?A_Brand", version: "24" },
      ];
      const data = {
        brands,
        mobile,
        platform,
        getHighEntropyValues: () => Promise.resolve({ brands, mobile, platform }),
        toJSON: () => ({ brands, mobile, platform }),
      };
      Object.defineProperty(navigator, "userAgentData", { get: () => data });
    },
    p.uaData
  );
  return context;
}

async function doSearch(page, term) {
  await page.fill("#search-input", term);
  await page.press("#search-input", "Enter");
  await sleep(rand(700, 1700));
}

async function openTutorFromGrid(page, tutorId) {
  const link = page.locator(`#tutor-grid a.card[href$="id=${tutorId}"]`);
  if (await link.count()) {
    await link.first().click();
  } else {
    await page.goto(`${BASE_URL}/tutor.html?id=${tutorId}`, { waitUntil: "domcontentloaded" });
  }
  await page.waitForSelector("#booking-form", { timeout: 15000 });
}

async function completeBooking(page) {
  const slots = page.locator(".slot");
  const n = await slots.count();
  if (n === 0) return false;
  await slots.nth(rand(0, Math.min(n, 4) - 1)).click(); // also triggers booking_started
  const first = choice(FIRST);
  const last = choice(LAST);
  await page.fill("#parent-name", `${first} ${last}`);
  await page.fill("#parent-email", `${first}.${last}@example.com`.toLowerCase());
  await page.fill("#student-name", choice(FIRST));
  await page.selectOption("#student-grade", choice(GRADES));
  await sleep(rand(400, 1200));
  await page.click('#booking-form button[type="submit"]');
  await page.waitForSelector("#confirmation", { state: "visible", timeout: 5000 }).catch(() => {});
  await sleep(rand(800, 1600));
  return true;
}

async function runSession(browser, n) {
  const context = await makeContext(browser);
  let postCount = 0;
  context.on("response", (res) => {
    const u = res.url();
    if (u.includes("us.i.posthog.com") && /\/(e|batch|i\/v0\/e)\/?/.test(u)) postCount++;
  });

  const page = await context.newPage();
  const type = weightedChoice(SESSION_MIX);

  try {
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded", timeout: 20000 });
    const title = await page.title();
    if (!/ABC Tutoring/i.test(title)) throw new Error(`homepage did not load (title: "${title}")`);
    await page.waitForSelector("#tutor-grid a.card", { timeout: 10000 });
    await sleep(rand(700, 1800));

    if (type === "browse_only") {
      await page.mouse.wheel(0, rand(200, 900));
      await sleep(rand(600, 1500));
    }

    if (type === "search_then_leave") {
      for (let s = 0; s < rand(1, 2); s++) {
        const term = Math.random() < 0.45 ? choice(UNMET_SEARCHES) : choice(OFFERED_SEARCHES);
        await doSearch(page, term);
      }
      if (Math.random() < 0.4) {
        await openTutorFromGrid(page, weightedChoice(TUTOR_WEIGHTS));
        await sleep(rand(800, 2000));
      }
    }

    if (type === "view_tutor_no_book" || type === "full_booking") {
      if (Math.random() < 0.5) await doSearch(page, choice(OFFERED_SEARCHES));
      await openTutorFromGrid(page, weightedChoice(TUTOR_WEIGHTS));
      await sleep(rand(900, 2400));

      if (type === "full_booking") {
        await completeBooking(page);
      } else if (Math.random() < 0.3) {
        // realistic funnel drop-off: start the booking, then leave
        const slots = page.locator(".slot");
        if ((await slots.count()) > 0) {
          await slots.first().click();
          await page.fill("#parent-name", `${choice(FIRST)} ${choice(LAST)}`);
          await sleep(rand(600, 1600));
        }
      }
    }

    await sleep(3000); // let PostHog batch-flush before the context closes
  } catch (err) {
    console.warn(`  session ${n} (${type}): ${err.message}`);
  } finally {
    await context.close();
  }
  return { type, postCount };
}

async function main() {
  console.log(`\nABC Tutoring — traffic simulation`);
  console.log(`  target:      ${BASE_URL}`);
  console.log(`  sessions:    ${SESSIONS}  (concurrency ${CONCURRENCY}, headless ${HEADLESS})\n`);

  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const results = [];
  let next = 0;

  async function worker() {
    while (true) {
      const i = next++;
      if (i >= SESSIONS) return;
      console.log(`  → session ${i + 1}/${SESSIONS}`);
      results.push(await runSession(browser, i + 1));
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, SESSIONS) }, worker));
  await browser.close();

  const byType = {};
  let posts = 0;
  for (const r of results) {
    byType[r.type] = (byType[r.type] || 0) + 1;
    posts += r.postCount;
  }
  console.log(`\n--- summary ---`);
  console.log(`  sessions by type:`, byType);
  console.log(`  PostHog ingestion POSTs observed: ${posts}`);
  if (posts === 0) {
    console.log(`  WARNING: no PostHog POSTs seen. Check the project token, that events`);
    console.log(`  fire on the target site, and that nothing is blocking i.posthog.com.`);
  }
  console.log(`\n  Give PostHog ~1–2 min, then check Activity / your dashboard.\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
