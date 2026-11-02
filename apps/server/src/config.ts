import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function findAppDir(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i += 1) {
    const pkg = path.join(dir, 'package.json');
    if (fs.existsSync(pkg)) {
      try {
        const json = JSON.parse(fs.readFileSync(pkg, 'utf8')) as { name?: string };
        if (json.name === '@cabin/server') return dir;
      } catch {
        /* keep walking */
      }
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

export const appDir = findAppDir();
export const repoRoot = path.resolve(appDir, '../..');

export const config = {
  port: Number(process.env.PORT || 8787),
  aiMode: (process.env.AI_MODE === 'openai' ? 'openai' : 'mock') as 'mock' | 'openai',
  dataDir: path.resolve(process.env.DATA_DIR || path.join(appDir, 'data')),
  demoSpeed: Number(process.env.DEMO_SPEED || 1),
  openai: {
    baseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    timeout: Number(process.env.OPENAI_TIMEOUT || 45000),
  },
  webDist: path.resolve(repoRoot, 'apps/web/dist'),
};

fs.mkdirSync(config.dataDir, { recursive: true });
