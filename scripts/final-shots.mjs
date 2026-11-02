import { chromium } from 'playwright-core';
import fs from 'node:fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8787';
const A = process.env.SESSION_A;
const B = process.env.SESSION_B;
const out = process.env.OUT_DIR || 'screenshots';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: fs.existsSync(CHROME) ? CHROME : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true,
  args: ['--font-render-hinting=none', '--force-color-profile=srgb'],
});
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/01-dashboard.png` });

await page.goto(`${BASE}/session/${B}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/02-preflight.png` });

await page.getByRole('button', { name: /开始交叉质询/ }).click();
await page.waitForTimeout(12000);
await page.locator('.transcript').evaluate((el) => {
  el.scrollTop = el.scrollHeight;
});
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/03-live.png` });
await page.waitForTimeout(12000);
await page.locator('.transcript').evaluate((el) => {
  el.scrollTop = el.scrollHeight;
});
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/04-live-late.png` });
await page
  .waitForFunction(() => document.body.innerText.includes('裁决完成'), null, { timeout: 90000 })
  .catch(() => {});
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/05-verdict.png` });

await page.goto(`${BASE}/report/${B}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${out}/06-report.png` });
await page.screenshot({ path: `${out}/07-report-full.png`, fullPage: true });

await page.goto(`${BASE}/report/${A}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/08-report-a.png`, fullPage: true });

await page.goto(`${BASE}/making-of`, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/09-making-of.png` });
await page.screenshot({ path: `${out}/10-making-of-full.png`, fullPage: true });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/12-dashboard-final.png` });

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const mp = await mobile.newPage();
await mp.goto(BASE, { waitUntil: 'networkidle' });
await mp.waitForTimeout(600);
await mp.screenshot({ path: `${out}/11-mobile.png` });

console.log(JSON.stringify({ errors, urls: [A, B] }, null, 2));
await browser.close();
