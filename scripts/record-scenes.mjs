import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://127.0.0.1:8787';
const RAW = path.resolve('video/raw');
fs.mkdirSync(RAW, { recursive: true });

// Audio durations (seconds) + 0.9s visual tail.
const D = [40.4, 42.2, 60.9, 44.0, 122.0, 9.9].map((d) => d + 1.1);
const T = D.reduce((acc, d) => {
  acc.push((acc[acc.length - 1] ?? 0) + d);
  return acc;
}, []);

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--font-render-hinting=none', '--force-color-profile=srgb', '--hide-scrollbars'],
});

const cursorScript = () => {
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
};

const errors = [];

async function scene(index, fn) {
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: RAW, size: { width: 1920, height: 1080 } },
  });
  await ctx.addInitScript(cursorScript);
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
    await fn(page, until, start);
  } finally {
    await ctx.close();
  }
  const src = await video.path();
  const dst = path.join(RAW, `s${index}.webm`);
  fs.copyFileSync(src, dst);
  const size = fs.statSync(dst).size;
  console.log(`scene ${index}: ${((Date.now() - start) / 1000).toFixed(1)}s, ${(size / 1024 / 1024).toFixed(1)}MB`);
  return dst;
}

const move = (page, x, y, steps = 18) => page.mouse.move(x, y, { steps });

// Scene 1 · dashboard / problem
await scene(1, async (page, until) => {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await move(page, 780, 420);
  await page.waitForTimeout(1200);
  await move(page, 1080, 350);
  await page.waitForTimeout(1000);
  await move(page, 1320, 540);
  await page.waitForTimeout(1200);
  await move(page, 260, 520);
  await page.waitForTimeout(1300);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(1500);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(1000);
  await move(page, 300, 510);
  await until(D[0]);
});

// Scene 2 · upload -> creates session
let sessionId = '';
await scene(2, async (page, until) => {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await move(page, 280, 512);
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /新建一场演练/ }).click();
  await page.waitForTimeout(900);
  await page.locator('.modal input').first().click();
  await page.waitForTimeout(300);
  await page.keyboard.type('智巡校园 · 实验室安全巡检智能体', { delay: 36 });
  await page.waitForTimeout(500);
  await page.locator('.modal select').selectOption('大创项目');
  await page.waitForTimeout(400);
  await page.locator('.modal input[type=file]').setInputFiles('samples/智巡校园-实验室安全巡检智能体.md');
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: /生成质询舱/ }).click();
  await page.waitForURL(/\/session\//, { timeout: 20000 });
  sessionId = page.url().split('/session/')[1];
  fs.writeFileSync(path.join(RAW, 'session.txt'), sessionId, 'utf8');
  await page.waitForTimeout(1200);
  for (let i = 0; i < 4; i += 1) {
    await page.locator('.claim-item').nth(i).click().catch(() => {});
    await page.waitForTimeout(2600);
  }
  await until(D[1]);
});

if (!sessionId) sessionId = fs.readFileSync(path.join(RAW, 'session.txt'), 'utf8').trim();

// Scene 3 · preflight + live
await scene(3, async (page, until) => {
  await page.goto(`${BASE}/session/${sessionId}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  for (let i = 0; i < 4; i += 1) {
    await page.locator('.claim-item').nth(i + 2).click().catch(() => {});
    await page.waitForTimeout(2300);
  }
  await page.getByRole('button', { name: /开始交叉质询/ }).click();
  await page.waitForTimeout(9000);
  const cites = page.locator('.cite-chip');
  if (await cites.count()) {
    await cites.first().click().catch(() => {});
    await page.waitForTimeout(4200);
    await page.locator('.cite-chip').first().click().catch(() => {});
  }
  await page.waitForTimeout(3500);
  await until(D[2]);
});

// Scene 4 · report
await scene(4, async (page, until) => {
  await page.goto(`${BASE}/report/${sessionId}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1400);
  await move(page, 960, 520);
  for (let i = 0; i < 8; i += 1) {
    await page.mouse.wheel(0, 340);
    await page.waitForTimeout(3300);
  }
  await page.mouse.wheel(0, -800);
  await until(D[3]);
});

// Scene 5 · making of (AI collaboration replay)
await scene(5, async (page, until) => {
  await page.goto(`${BASE}/making-of`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await move(page, 960, 560);
  for (let i = 0; i < 18; i += 1) {
    await page.mouse.wheel(0, 280);
    await page.waitForTimeout(5500);
  }
  await until(D[4]);
});

// Scene 6 · close
await scene(6, async (page, until) => {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await move(page, 700, 420);
  await page.waitForTimeout(2300);
  await move(page, 1000, 500);
  await until(D[5]);
});

await browser.close();
console.log(JSON.stringify({ sessionId, errors }, null, 2));
