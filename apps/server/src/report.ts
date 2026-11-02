import type { Project, Session } from '@cabin/shared';
import { PERSONAS } from '@cabin/shared';

export function sessionMarkdown(project: Project, session: Session): string {
  const lines: string[] = [];
  lines.push(`# 答辩预演报告 · ${project.name}`);
  lines.push('');
  lines.push(`> 赛道：${project.track}　|　模式：${session.intensity}　|　综合得分：**${session.overall}**`);
  lines.push('');
  lines.push('## 一、评审结论');
  lines.push('');
  lines.push(session.summary || '演练尚未完成。');
  lines.push('');
  lines.push('## 二、评分雷达');
  lines.push('');
  lines.push('| 维度 | 得分 | 相对基线 | 说明 |');
  lines.push('| --- | ---: | ---: | --- |');
  for (const s of session.scores) {
    lines.push(`| ${s.label} | ${s.score} | ${s.delta >= 0 ? '+' : ''}${s.delta} | ${s.note} |`);
  }
  lines.push('');
  lines.push('## 三、风险清单');
  lines.push('');
  for (const r of session.risks) {
    lines.push(`### [${r.level === 'high' ? '高' : r.level === 'medium' ? '中' : '低'}] ${r.title}`);
    lines.push('');
    lines.push(`${r.detail}`);
    lines.push('');
  }
  lines.push('## 四、修改清单');
  lines.push('');
  lines.push('| 优先级 | 动作 | 说明 | 工作量 | 预计提分 |');
  lines.push('| --- | --- | --- | --- | ---: |');
  for (const v of session.revisions) {
    lines.push(`| ${v.priority} | ${v.title} | ${v.detail.replace(/\|/g, '／')} | ${v.effort} | +${v.gain} |`);
  }
  lines.push('');
  lines.push('## 五、质询实录');
  lines.push('');
  let round = -1;
  for (const t of session.turns) {
    if (t.round !== round) {
      round = t.round;
      lines.push(`### 第 ${round} 轮`);
      lines.push('');
    }
    const p = PERSONAS[t.persona];
    lines.push(`**${p.name} · ${p.title}**：${t.text}`);
    lines.push('');
  }
  lines.push('---');
  lines.push('');
  lines.push('由「答辩预演舱」生成 · 所有结论均可回放到具体材料段落。');
  return lines.join('\n');
}
