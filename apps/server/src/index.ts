import { createApp } from './routes.js';
import { config } from './config.js';

const app = createApp();

app.listen(config.port, '0.0.0.0', () => {
  console.log(`\n  答辩预演舱 · Defense Cabin`);
  console.log(`  ───────────────────────────────`);
  console.log(`  http://127.0.0.1:${config.port}`);
  console.log(`  AI 模式: ${config.aiMode}${config.aiMode === 'openai' ? ` (${config.openai.model})` : ' · 确定性离线引擎'}`);
  console.log(`  数据目录: ${config.dataDir}\n`);
});
