import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://127.0.0.1:8787';
const RAW = path.resolve('video/raw');
fs.mkdirSync(RAW, { recursive: true });

const D = [41.0, 42.8, 61.5, 44.6, 122.6, 10.5];
const T = D.reduce((acc, d) => {
  acc.push((acc[acc.length - 1] ?? 0) + d);
  return acc;
}, []);
const t0 = Date.now();
const now = () => (Date.now() - t0) / 1000;
const until = async (target) => {
  const wait = target * 1000 - (Date.now() - t0);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
};
const move = async (page, x, y, steps = 18) => page.mouse.move(x, y, { steps });

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--font-render-hinting=none', '--force-color-profile=srgb', '--hide-scrollbars'],
});

const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  recordVideo: { dir: RAW, size: { width: 1920, height: 1080 } },
});

await context.addInitScript(() => {
  const paint = () => {
    if (document.getElementById('__cursor')) return;
    const c = document.createElement('div');
    c.id = '__cursor';
    c.style.cssText =
      'position:fixed;left:-100px;top:-100px;width:18px;height:18px;border:1.5px solid #e8b45a;border-radius:50%;' +
      'box-shadow:0 0 0 4px rgba(232,180,90,.15),0 2px 10px rgba(0,0,0,.35);pointer-events:none;z-index:2147483647;' +
      'transition:width .12s,height .12s,background .12s;transform:translate(-50%,-50%);';
    const dot = document.createElement('div');
    dot.style.cssText = 'position:absolute;left:50%;top:50%;width:3px;height:3px;border-radius:50%;background:#e8b45a;transform:translate(-50%,-50%)';
    c.appendChild(dot);
    document.documentElement.appendChild(c);
    window.addEventListener(
      'mousemove',
      (e) => {
        c.style.left = `${e.clientX}px`;
        c.style.top = `${e.clientY}px`;
      },
      true,
    );
    window.addEventListener(
      'mousedown',
      () => {
        c.style.width = '28px';
        c.style.height = '28px';
        c.style.background = 'rgba(232,180,90,.18)';
      },
      true,
    );
    window.addEventListener(
      'mouseup',
      () => {
        c.style.width = '18px';
        c.style.height = '18px';
        c.style.background = 'transparent';
      },
      true,
    );
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paint);
  else paint();
});

const page = await context.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

// Scene 1 · dashboard
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await move(page, 780, 420);
await page.waitForTimeout(1200);
await move(page, 1100, 360);
await page.waitForTimeout(900);
await move(page, 1320, 520);
await page.waitForTimeout(1000);
await move(page, 260, 520);
await page.waitForTimeout(1200);
await page.mouse.wheel(0, 320);
await page.waitForTimeout(1400);
await page.mouse.wheel(0, -320);
await page.waitForTimeout(900);
await move(page, 280, 500);
await until(T[0] - 2.2);
await page.getByRole('button', { name: /新建一场演练/ }).click();
await page.waitForTimeout(800);

// Scene 2 · upload
await page.locator('.modal input').first().click();
await page.waitForTimeout(300);
await page.keyboard.type('智巡校园 · 实验室安全巡检智能体', { delay: 38 });
await page.waitForTimeout(500);
await page.locator('.modal select').selectOption('大创项目');
await page.waitForTimeout(400);
await page.locator('.modal input[type=file]').setInputFiles('samples/智巡校园-实验室安全巡检智能体.md');
await page.waitForTimeout(900);
await page.getByRole('button', { name: /生成质询舱/ }).click();
await page.waitForURL(/\/session\//, { timeout: 20000 });
const sessionId = page.url().split('/session/')[1];
await page.waitForTimeout(1200);

for (let i = 0; i < 5; i += 1) {
  const items = page.locator('.claim-item');
  await items.nth(i).click().catch(() => {});
  await page.waitForTimeout(2400);
}
await until(T[1]);

// Scene 3 · preflight + live
await page.waitForTimeout(1200);
for (let i = 0; i < 4; i += 1) {
  await page.locator('.claim-item').nth(i + 4).click().catch(() => {});
  await page.waitForTimeout(1800);
}
await until(T[2] - 48);
await page.getByRole('button', { name: /开始交叉质询/ }).click();
await page.waitForTimeout(9000);
const cites = page.locator('.cite-chip');
if (await cites.count()) {
  await cites.first().click().catch(() => {});
  await page.waitForTimeout(4200);
  await cites.first().click().catch(() => {});
}
await page.waitForTimeout(3000);
await page.mouse.wheel(0, 420);
await until(T[2]);

// Scene 4 · report
await page.goto(`${BASE}/report/${sessionId}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1400);
await move(page, 960, 520);
for (let i = 0; i < 8; i += 1) {
  await page.mouse.wheel(0, 360);
  await page.waitForTimeout(3400);
}
await page.mouse.wheel(0, -900);
await until(T[3]);

// Scene 5 · making of
await page.goto(`${BASE}/making-of`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1400);
await move(page, 960, 560);
for (let i = 0; i < 17; i += 1) {
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(5600);
}
await until(T[4]);

// Scene 6 · closing
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await move(page, 700, 420);
await page.waitForTimeout(2200);
await move(page, 1000, 500);
await until(T[5]);

await context.close();
await browser.close();

const files = fs
  .readdirSync(RAW)
  .filter((f) => f.endsWith('.webm'))
  .map((f) => ({ f, t: fs.statSync(path.join(RAW, f)).mtimeMs }))
  .sort((a, b) => b.t - a.t);
if (!files.length) throw new Error('no video recorded');
const src = path.join(RAW, files[0].f);
fs.copyFileSync(src, path.join(RAW, 'defense.webm'));
console.log(JSON.stringify({ sessionId, video: src, errors, seconds: now().toFixed(1) }, null, 2));
