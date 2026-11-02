# 演示视频

- 成片：`答辩预演舱-演示视频.mp4`
- 规格：1920×1080 / 30fps / H.264 / AAC / 约 5 分 26 秒
- 内容：产品真实操作录屏 + 中文旁白 + 2 分钟 AI 协同过程复现
- 旁白：Edge TTS `zh-CN-YunxiNeural`；逐字稿见 `docs/demo-video-script.md`

## 视频与 Git

成片约 28MB，已随仓库提交（低于 GitHub 100MB 单文件限制），评委可直接在仓库内观看。  
`video/raw/`、`video/parts/`、`video/audio/` 为录屏中间产物，已 gitignore。

## 重新生成

```bash
# 1. 生成旁白（需 edge-tts）
python scripts/tts.py

# 2. 分场景录屏（需服务已启动）
node scripts/record-scenes.mjs

# 3. 逐段对齐、拼接、混音
node scripts/mux-scenes.mjs
```

## 分镜

| 场景 | 内容 | 时长 |
| --- | --- | ---: |
| 1 | 首页 / 痛点 | 40s |
| 2 | 新建演练 / 上传 / 解析 | 42s |
| 3 | 预检 / 开始质询 / 证据 | 61s |
| 4 | 报告 / 风险 / 修改清单 | 44s |
| 5 | 研发现场：5 次迭代与 Bug 修复 | 122s |
| 6 | 收束 | 10s |
