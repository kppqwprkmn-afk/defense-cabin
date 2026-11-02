import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://127.0.0.1:8787';
const RAW = path.resolve('video/raw');
const SID = process.env.SESSION_ID;
if (!SID) throw new Error('SESSION_ID required');
const D = [62.0, 45.1];

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--font-render-hinting=none', '--force-color-profile=srgb', '--hide-scrollbars'],
});
const errors = [];

async function scene(index, seconds, fn) {
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: RAW, size: { width: 1920, height: 1080 } },
  });
  await ctx.addInitScript(() => {
    const paint = () => {
      if (document.getElementById('__cursor')) return;
      const c = document.createElement('div');
      c.id = '__cursor';
      c.style.cssText =
        'position:fixed;left:-100px;top:-100px;width:18px;height:18px;border:1.5px solid #e8b45a;border-radius:50%;' +
        'box-shadow:0 0 0 4px rgba(232,180,90,.15),0 2px 10px rgba(0,0,0,.35);pointer-events:none;z-index:2147483647;' +
        'transition:width .12s,height .12s,background .12s;transform:translate(-50%,-50%);';
      const dot = document.createElement('div');
      dot.style.cssText =
        'position:absolute;left:50%;top:50%;width:3px;height:3px;border-radius:50%;background:#e8b45a;transform:translate(-50%,-50%)';
      c.appendChild(dot);
      document.documentElement.appendChild(c);
      window.addEventListener('mousemove', (e) => {
        c.style.left = `${e.clientX}px`;
        c.style.top = `${e.clientY}px`;
      }, true);
      window.addEventListener('mousedown', () => {
        c.style.width = '28px';
        c.style.height = '28px';
        c.style.background = 'rgba(232,180,90,.18)';
      }, true);
      window.addEventListener('mouseup', () => {
        c.style.width = '18px';
        c.style.height = '18px';
        c.style.background = 'transparent';
      }, true);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paint);
    else paint();
  });
  const page = await ctx.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  const start = Date.now();
  const until = async (target) => {
    const wait = target * 1000 - (Date.now() - start);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  };
  const video = page.video();
  try {
    await fn(page, until);
  } finally {
    await ctx.close();
  }
  const src = await video.path();
  const dst = path.join(RAW, `s${index}c.webm`);
  fs.copyFileSync(src, dst);
  console.log(`scene ${index}: ${(fs.statSync(dst).size / 1024 / 1024).toFixed(1)}MB`);
}

await scene(3, D[0], async (page, until) => {
  await page.goto(`${BASE}/session/${SID}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  for (let i = 0; i < 3; i += 1) {
    await page.locator('.claim-item').nth(i).click().catch(() => {});
    await page.waitForTimeout(1500);
  }
  const btn = page.getByRole('button', { name: /开始交叉质询/ });
  await btn.hover().catch(() => {});
  await page.waitForTimeout(400);
  await page.evaluate(async (id) => {
    await fetch(`/api/sessions/${id}/start`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ speed: 0.2 }),
    });
  }, SID);
  await page.waitForTimeout(600);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(7000);
  const cites = page.locator('.cite-chip');
  if (await cites.count()) {
    await cites.first().click().catch(() => {});
    await page.waitForTimeout(5000);
    await page.locator('.cite-chip').first().click().catch(() => {});
  }
  await page.waitForTimeout(4000);
  await page.mouse.wheel(0, 300);
  await until(D[0]);
});

await scene(4, D[1], async (page, until) => {
  await page.goto(`${BASE}/session/${SID}`, { waitUntil: 'networkidle' });
  await page
    .waitForFunction(() => document.body.innerText.includes('裁决完成'), null, { timeout: 90000 })
    .catch(() => {});
  await page.waitForTimeout(700);
  await page.goto(`${BASE}/report/${SID}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.mouse.move(960, 520);
  for (let i = 0; i < 7; i += 1) {
    await page.mouse.wheel(0, 330);
    await page.waitForTimeout(3300);
  }
  await page.mouse.wheel(0, -700);
  await until(D[1]);
});

await browser.close();
console.log(JSON.stringify({ errors }, null, 2));
