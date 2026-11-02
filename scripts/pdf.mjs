import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const htmlPath = path.join(root, 'docs/technical-report.html');
const pdfPath = path.join(root, 'docs/technical-report.pdf');

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--font-render-hinting=none', '--force-color-profile=srgb'],
});
const page = await browser.newPage({ viewport: { width: 1200, height: 1600 } });
await page.goto(`file:///${htmlPath.replace(/\\/g, '/')}`, { waitUntil: 'load' });
await page.emulateMedia({ media: 'print' });
await page.waitForTimeout(600);

const pages = await page.locator('.page').count();
console.log('page elements:', pages);

await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
});

for (const n of [1, 2, 4, 7, 9, 12, 15, 18, 22, 24]) {
  const el = page.locator('.page').nth(n - 1);
  if (await el.count()) {
    await el.screenshot({ path: path.join(root, `screenshots/doc-p${String(n).padStart(2, '0')}.png`) });
  }
}

console.log('pdf bytes:', fs.statSync(pdfPath).size);
await browser.close();
