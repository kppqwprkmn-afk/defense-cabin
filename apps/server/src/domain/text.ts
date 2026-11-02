import type { Chunk } from '@cabin/shared';

export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const HEADING_RE = /^(#{1,4})\s+(.+)$/;
const CN_HEADING_RE = /^([一二三四五六七八九十]+、|\d+(?:\.\d+)*[、.\s])\s*(.+)$/;

export interface Section {
  title: string;
  body: string;
}

export function splitSections(text: string): Section[] {
  const lines = text.split('\n');
  const sections: Section[] = [];
  let title = '项目摘要';
  let buf: string[] = [];

  const flush = () => {
    const body = buf.join('\n').trim();
    if (body) sections.push({ title, body });
    buf = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const md = trimmed.match(HEADING_RE);
    const cn = trimmed.match(CN_HEADING_RE);
    if (md || (cn && trimmed.length < 40)) {
      flush();
      title = (md?.[2] ?? cn?.[2] ?? trimmed).replace(/[#*]/g, '').trim();
      continue;
    }
    buf.push(line);
  }
  flush();
  return sections.length ? sections : [{ title: '项目摘要', body: text }];
}

export function chunkText(text: string, maxLen = 620): Chunk[] {
  const sections = splitSections(text);
  const chunks: Chunk[] = [];
  let i = 0;
  for (const section of sections) {
    const paragraphs = section.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    let buf = '';
    const push = (body: string) => {
      if (!body.trim()) return;
      chunks.push({
        id: `c${++i}`,
        section: section.title,
        text: body.trim(),
        index: i,
      });
    };
    for (const p of paragraphs.length ? paragraphs : [section.body]) {
      if ((buf + '\n' + p).length > maxLen && buf) {
        push(buf);
        buf = p;
      } else {
        buf = buf ? `${buf}\n${p}` : p;
      }
    }
    if (buf) push(buf);
  }
  return chunks;
}

const STOPWORDS = new Set(
  '的 了 和 与 及 或 在 是 为 对 从 到 将 把 被 而 也 都 就 还 有 无 不 一个 一种 我们 他们 这个 那个 以及 通过 进行 可以 能够 已经 目前 其中 由于 因此 如果 但是 并 等 中 上 下 内 外 之 其 该 此 这 那'.split(
    ' ',
  ),
);

export function tokenize(text: string): string[] {
  const clean = text.toLowerCase().replace(/[^\p{Script=Han}a-z0-9%.]+/gu, ' ');
  const tokens: string[] = [];
  for (const part of clean.split(/\s+/)) {
    if (!part) continue;
    if (/^[\u4e00-\u9fff]+$/.test(part)) {
      for (let i = 0; i < part.length; i += 1) {
        const ch = part[i];
        if (!STOPWORDS.has(ch)) tokens.push(ch);
        if (i + 1 < part.length) tokens.push(part.slice(i, i + 2));
      }
    } else if (part.length > 1 && !STOPWORDS.has(part)) {
      tokens.push(part);
    }
  }
  return tokens;
}

export class BM25Index {
  private docs: { chunk: Chunk; tf: Map<string, number>; len: number }[] = [];
  private df = new Map<string, number>();
  private avgdl = 1;

  constructor(chunks: Chunk[]) {
    for (const chunk of chunks) {
      const tokens = tokenize(`${chunk.section} ${chunk.text}`);
      const tf = new Map<string, number>();
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
      for (const t of new Set(tokens)) this.df.set(t, (this.df.get(t) ?? 0) + 1);
      this.docs.push({ chunk, tf, len: tokens.length });
    }
    this.avgdl = this.docs.reduce((n, d) => n + d.len, 0) / Math.max(1, this.docs.length);
  }

  search(query: string, topK = 2): { chunk: Chunk; score: number }[] {
    const q = [...new Set(tokenize(query))];
    const k1 = 1.4;
    const b = 0.75;
    const N = this.docs.length;
    const scored = this.docs.map((doc) => {
      let score = 0;
      for (const term of q) {
        const f = doc.tf.get(term) ?? 0;
        if (!f) continue;
        const n = this.df.get(term) ?? 0;
        const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
        score += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + b * (doc.len / this.avgdl))));
      }
      return { chunk: doc.chunk, score };
    });
    return scored
      .filter((s) => s.score > 0)
      .sort((a, b2) => b2.score - a.score)
      .slice(0, topK);
  }
}

export function sentences(text: string): string[] {
  return text
    .replace(/[ \t]+/g, ' ')
    .split(/(?<=[。！？!?；;])\s*|\n+/)
    .map((s) => s.trim().replace(/^[-•·*]\s*/, '').replace(/^\d{1,2}[.、]\s*/, ''))
    .filter((s) => s.length >= 12 && s.length <= 180);
}

export function clip(text: string, n = 88): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > n ? `${clean.slice(0, n)}…` : clean;
}
