# 演示视频

- 成片：`答辩预演舱-演示视频.mp4`
- 规格：1920×1080 / 30fps / H.264 / AAC / 约 5 分 26 秒
- 内容：产品真实操作录屏 + 中文旁白 + 2 分钟 AI 协同过程复现
- 旁白：Edge TTS `zh-CN-YunxiNeural`；逐字稿见 `docs/demo-video-script.md`

## 为什么视频不放进 Git

成片约 100–200MB，超过普通仓库的舒适体积。  
提交时请把 MP4 上传到赛事系统，或使用 Git LFS；仓库内保留脚本与逐字稿，保证可重新生成。

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
