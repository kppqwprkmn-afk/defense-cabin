import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ffmpeg = path.join(root, 'node_modules/@ffmpeg-installer/win32-x64/ffmpeg.exe');
const raw = path.join(root, 'video/raw');
const parts = path.join(root, 'video/parts');
fs.mkdirSync(parts, { recursive: true });

function duration(file) {
  const p = spawnSync(ffmpeg, ['-i', file], { encoding: 'utf8' });
  const m = (p.stderr || '').match(/Duration:\s(\d+):(\d+):(\d+\.\d+)/);
  if (!m) throw new Error(`cannot read duration: ${file}`);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

const list = [];
let total = 0;
for (let i = 1; i <= 6; i += 1) {
  const candidates = [`s${i}c.webm`, `s${i}b.webm`, `s${i}.webm`].map((f) => path.join(raw, f));
  const video = candidates.find((f) => fs.existsSync(f));
  if (!video) throw new Error(`missing scene ${i}`);
  const audio = path.join(root, `video/audio/s${i}.mp3`);
  const out = path.join(parts, `p${i}.mp4`);
  const ad = duration(audio);
  const vd = duration(video);
  const target = ad + 0.45;
  console.log(`part ${i}: video ${vd.toFixed(1)}s audio ${ad.toFixed(1)}s -> ${target.toFixed(1)}s`);
  execFileSync(
    ffmpeg,
    [
      '-y',
      '-i',
      video,
      '-i',
      audio,
      '-filter_complex',
      `[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,tpad=stop_mode=clone:stop_duration=30,format=yuv420p[v];[1:a]apad[a]`,
      '-map',
      '[v]',
      '-map',
      '[a]',
      '-t',
      target.toFixed(2),
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '18',
      '-c:a',
      'aac',
      '-b:a',
      '160k',
      out,
    ],
    { stdio: 'inherit' },
  );
  list.push(`file '${out.replace(/\\/g, '/')}'`);
  total += target;
}

const listFile = path.join(parts, 'list.txt');
fs.writeFileSync(listFile, list.join('\n'), 'utf8');
const out = path.join(root, 'video/答辩预演舱-演示视频.mp4');
execFileSync(
  ffmpeg,
  ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', '-movflags', '+faststart', out],
  { stdio: 'inherit' },
);

console.log(
  JSON.stringify(
    { out, seconds: total.toFixed(1), mb: (fs.statSync(out).size / 1024 / 1024).toFixed(1) },
    null,
    2,
  ),
);
