/**
 * Browser smoke: login -> create new page -> edit -> reload -> persisted,
 * plus regressions: sidebar page switching, live "Connected" status pill,
 * header icon tooltips. Catches UI-only crashes that API tests cannot see
 * (e.g. null provider in TipTap extensions). Requires the dev stack
 * (start.bat) and Playwright chromium (npx playwright install chromium).
 *
 *   node scripts/smoke-browser.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const problems = [];

function fail(msg) {
  problems.push(msg);
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => fail(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/favicon|Failed to load resource/.test(t)) return;
    fail(`console: ${t}`);
  });

  console.log('[browser] opening /login');
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1_500);
  await page.fill('input[name="email"]', 'alice@demo.dev');
  await page.fill('input[name="password"]', 'password123');

  // Click only once React is hydrated: a pre-hydration click triggers the
  // browser's native form GET instead of the NextAuth handler.
  let signedIn = false;
  for (let attempt = 1; attempt <= 4 && !signedIn; attempt++) {
    if (page.url().includes('?email=')) {
      await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});
      await page.waitForTimeout(1_500);
      await page.fill('input[name="email"]', 'alice@demo.dev');
      await page.fill('input[name="password"]', 'password123');
    }
    const cb = page
      .waitForRequest((r) => r.url().includes('/api/auth/callback/credentials') && r.method() === 'POST', {
        timeout: 6_000,
      })
      .catch(() => null);
    await page.click('button[type="submit"]');
    signedIn = !!(await cb);
    if (!signedIn) console.log(`[browser] attempt ${attempt}: not hydrated yet, retrying`);
  }
  if (!signedIn) {
    fail('credentials callback never fired — login form not interactive');
  }

  // login -> '/' dashboard -> auto-redirect into the single workspace
  await page.waitForURL(/\/w\//, { timeout: 90_000 });
  console.log(`[browser] logged in: ${page.url()}`);

  console.log('[browser] creating a new page');
  await page.locator('[aria-label="New page"]').first().click();
  await page.waitForURL(/\/p\//, { timeout: 90_000 });
  await page.waitForSelector('[aria-label="Document editor"]', { timeout: 90_000 });
  console.log(`[browser] editor mounted: ${page.url()}`);

  // Regression: unwrapping y-websocket's sync payload — the pill used to be
  // pinned on "Syncing" forever because event.synced read undefined.
  console.log('[browser] waiting for connection status = connected');
  try {
    await page.waitForSelector('[data-testid="connection-status"][data-status="connected"]', {
      timeout: 30_000,
    });
    console.log('[browser] status pill reached Connected');
  } catch {
    const status = await page.locator('[data-testid="connection-status"]').getAttribute('data-status');
    fail(`connection status stuck at "${status}" (expected connected)`);
  }

  // Regression: header icon buttons need native hover tooltips (title attr).
  for (const [sel, label] of [
    ['button[aria-label="Favorite page"]', 'favorite'],
    ['button[aria-label="Toggle comments"]', 'comments'],
    ['button[aria-label="Version history"]', 'version history'],
  ]) {
    const t = await page.locator(sel).getAttribute('title');
    if (!t) fail(`missing tooltip (title) on ${label} button`);
  }
  console.log('[browser] header tooltips present');

  const marker = `smoke-${Date.now().toString(36)}`;
  await page.click('[aria-label="Document editor"]');
  await page.keyboard.type(marker);
  await page.waitForTimeout(1_500);
  if ((await page.locator(`text=${marker}`).count()) === 0) {
    fail('typed text not visible in editor');
  }

  console.log('[browser] reloading to verify persistence');
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForSelector('[aria-label="Document editor"]', { timeout: 90_000 });
  await page.waitForSelector(`text=${marker}`, { timeout: 30_000 });
  console.log('[browser] text survived reload');

  // Regression: sidebar tree rows used to call a no-arg onNavigate that never
  // router.push()ed — clicking a page did nothing. Click any row that is not
  // the active one (the active row is the page we just created).
  console.log('[browser] switching pages via sidebar');
  const createdId = new URL(page.url()).pathname.split('/p/')[1];
  try {
    const target = page
      .locator('[role="tree"][aria-label="Pages"] [role="treeitem"][aria-selected="false"]')
      .first();
    const targetTitle = (await target.innerText({ timeout: 15_000 })).split('\n').pop().trim();
    await target.click();
    await page.waitForURL(
      (u) => /\/p\//.test(u.pathname) && !u.pathname.includes(`/p/${createdId}`),
      { timeout: 30_000 },
    );
    await page.waitForSelector('[aria-label="Document editor"]', { timeout: 90_000 });
    console.log(`[browser] sidebar navigation ok: "${targetTitle}" -> ${page.url()}`);
  } catch (e) {
    fail(`sidebar navigation failed (still ${page.url()}): ${e.message.split('\n')[0]}`);
  }

  if (problems.length) {
    console.error('BROWSER SMOKE FAIL');
    for (const p of problems) console.error(` - ${p}`);
    process.exit(1);
  }
  console.log('BROWSER SMOKE PASS: login -> new page -> edit -> reload -> connected + tooltips + sidebar nav');
} finally {
  await browser.close();
}
