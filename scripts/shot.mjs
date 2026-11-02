import { chromium } from 'playwright-core';
import fs from 'node:fs';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8787';
const out = process.env.OUT_DIR || 'screenshots';
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  executablePath: fs.existsSync(CHROME) ? CHROME : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true,
  args: ['--font-render-hinting=none', '--force-color-profile=srgb'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.screenshot({ path: `${out}/01-dashboard.png`, fullPage: false });

const session = process.env.SESSION_ID;
if (session) {
  await page.goto(`${BASE}/session/${session}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/02-preflight.png`, fullPage: false });

  const btn = page.getByRole('button', { name: /开始交叉质询/ });
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(9000);
    await page.screenshot({ path: `${out}/03-live.png`, fullPage: false });
    await page.waitForTimeout(9000);
    await page.screenshot({ path: `${out}/04-live2.png`, fullPage: false });
    await page.waitForFunction(() => document.body.innerText.includes('裁决完成'), null, { timeout: 90000 }).catch(() => {});
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${out}/05-verdict.png`, fullPage: false });
  }
  await page.goto(`${BASE}/report/${session}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `${out}/06-report.png`, fullPage: false });
  await page.screenshot({ path: `${out}/07-report-full.png`, fullPage: true });
}

console.log(JSON.stringify({ errors, url: page.url() }, null, 2));
await browser.close();
