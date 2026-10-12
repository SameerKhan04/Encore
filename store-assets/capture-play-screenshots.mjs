/**
 * One-off Play Store phone screenshots (1080x1920).
 * Run while Expo web is up: node store-assets/capture-play-screenshots.mjs
 */
import { chromium, devices } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'play-screenshots');
const base = process.env.ENCORE_WEB_URL || 'http://localhost:8082';

async function waitForText(page, text, timeout = 20000) {
  await page.getByText(text, { exact: false }).first().waitFor({ timeout });
}

async function polishForStore(page) {
  // Hide internal/dev chrome so listing shots read as product, not staging.
  await page.evaluate(() => {
    const hideIf = (el) => {
      if (!el) return;
      el.style.visibility = 'hidden';
    };
    for (const node of document.querySelectorAll('*')) {
      const t = (node.textContent || '').trim();
      if (node.children.length > 0) continue;
      if (
        t.startsWith('Phase ') ||
        t.startsWith('State:') ||
        t === 'Open state debug'
      ) {
        hideIf(node);
        const parent = node.parentElement;
        if (parent && /Phase |State:|Open state debug/.test(parent.textContent || '')) {
          // keep parent; only leaf nodes hidden
        }
      }
    }
    // Hide tab bar for cleaner phone frames
    for (const tab of document.querySelectorAll('[role="tab"], [role="tablist"]')) {
      tab.style.display = 'none';
    }
  });
}

async function shot(page, name) {
  await polishForStore(page);
  await page.waitForTimeout(300);
  const file = path.join(outDir, name);
  await page.screenshot({ path: file, type: 'png' });
  console.log('wrote', file);
}

const pixel7 = {
  ...devices['Pixel 7'],
  viewport: { width: 1080, height: 1920 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  ...pixel7,
  userAgent: devices['Pixel 7'].userAgent,
});
const page = await context.newPage();
await mkdir(outDir, { recursive: true });

await page.goto(`${base}/`, { waitUntil: 'networkidle' });
await waitForText(page, 'ENCORE');
await shot(page, '01-home.png');

await page.goto(`${base}/onboarding`, { waitUntil: 'networkidle' });
await waitForText(page, 'Continue');
await shot(page, '02-onboarding.png');

await page.goto(`${base}/party`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await shot(page, '03-party.png');

await browser.close();
console.log('done');
