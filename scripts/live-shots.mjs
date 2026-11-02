import { chromium } from 'playwright-core';
import fs from 'node:fs';

const BASE = 'http://127.0.0.1:8787';
const SID = process.env.SESSION_ID;
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const out = 'screenshots';

const browser = await chromium.launch({
  executablePath: fs.existsSync(CHROME) ? CHROME : undefined,
  headless: true,
  args: ['--font-render-hinting=none', '--force-color-profile=srgb'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(`${BASE}/session/${SID}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/02-preflight.png` });

await page.getByRole('button', { name: /开始交叉质询/ }).click();
await page.waitForTimeout(9000);
await page.locator('.transcript').evaluate((el) => {
  el.style.scrollBehavior = 'auto';
  el.scrollTop = el.scrollHeight;
});
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/03-live.png` });

await page.waitForTimeout(11000);
await page.locator('.transcript').evaluate((el) => {
  el.style.scrollBehavior = 'auto';
  el.scrollTop = el.scrollHeight;
});
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/04-live-late.png` });

await page
  .waitForFunction(() => document.body.innerText.includes('裁决完成'), null, { timeout: 90000 })
  .catch(() => {});
await page.waitForTimeout(1000);
await page.screenshot({ path: `${out}/05-verdict.png` });

await page.goto(`${BASE}/report/${SID}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${out}/06-report.png` });
await page.screenshot({ path: `${out}/07-report-full.png`, fullPage: true });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/01-dashboard.png` });
await page.screenshot({ path: `${out}/12-dashboard-final.png` });

console.log(JSON.stringify({ errors }, null, 2));
await browser.close();
