import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const PORT = 8790;
const BASE = `http://127.0.0.1:${PORT}`;
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const server = spawn(process.execPath, ['apps/server/dist/index.js'], {
  env: {
    ...process.env,
    PORT: String(PORT),
    AI_MODE: 'mock',
    DATA_DIR: 'apps/server/data-e2e',
  },
  stdio: 'ignore',
  windowsHide: true,
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitHealth() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await wait(300);
  }
  throw new Error('server did not start');
}

let browser;
try {
  await waitHealth();
  const created = await fetch(`${BASE}/api/demo`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ intensity: '标准', speed: 3, autoStart: false }),
  }).then((r) => r.json());

  browser = await chromium.launch({
    executablePath: fs.existsSync(CHROME) ? CHROME : undefined,
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByText('最近演练').waitFor({ timeout: 10000 });

  await page.goto(`${BASE}/session/${created.sessionId}`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /开始交叉质询/ }).click();
  await page.waitForFunction(() => document.body.innerText.includes('裁决完成'), null, {
    timeout: 120000,
  });

  const session = await fetch(`${BASE}/api/sessions/${created.sessionId}`).then((r) => r.json());
  if (session.session.turns.length < 20) throw new Error('too few turns');
  if (!session.session.risks.length) throw new Error('no risks generated');
  if (!session.session.revisions.length) throw new Error('no revisions generated');

  await page.goto(`${BASE}/report/${created.sessionId}`, { waitUntil: 'networkidle' });
  await page.getByText('风险清单').first().waitFor({ timeout: 10000 });
  await page.getByText('修改清单').first().waitFor({ timeout: 10000 });

  if (errors.length) throw new Error(`console errors: ${errors.join(' | ')}`);

  console.log(
    JSON.stringify(
      {
        ok: true,
        sessionId: created.sessionId,
        turns: session.session.turns.length,
        risks: session.session.risks.length,
        overall: session.session.overall,
      },
      null,
      2,
    ),
  );
} finally {
  await browser?.close();
  server.kill();
}
