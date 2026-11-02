# Prompt 链 · 05 可复现构建

> 时间：2026-11-02  
> 阶段：工程可复现  
> 对应提交：`fix/reproducible-build`

## 1. 人类输入

```text
当前 Windows 环境下 pnpm 的 junction 让 Vite 找不到 rollup / picomatch，
esbuild 还出现 0.25 与 0.27 双版本冲突：
Host version "0.25.12" does not match binary version "0.27.7"。

要求：
1. 不依赖本机全局安装的 npm / pnpm / ffmpeg；
2. 评委拿到仓库后，pnpm install + pnpm build + pnpm start 能跑；
3. 不要用“把 node_modules 打包进去”这种不可复现的方案。
```

## 2. 诊断

三个问题叠加：

1. **pnpm isolated linker 的 junction 解析失败**  
   `apps/web/node_modules/vite` 是 junction，Node 解析 `rollup` 时没有回到 `.pnpm/vite@.../node_modules`，报 `Cannot find package 'rollup'`。

2. **esbuild 多版本**  
   Vite 6 依赖 0.25.12，tsup 依赖 0.27.7；hoisted 后 JS 包与 `@esbuild/win32-x64` 二进制版本错位。

3. **`.bin` shim 指向旧虚拟路径**  
   切换 linker 后，`apps/web/node_modules/.bin/tsc` 仍指向 `.pnpm/typescript@5.9.3/...`，直接 `MODULE_NOT_FOUND`。

## 3. AI 产出

- `pnpm-workspace.yaml`：

```yaml
nodeLinker: hoisted
shamefullyHoist: true
onlyBuiltDependencies:
  - esbuild
verifyDepsBeforeRun: false
```

- 所有 package scripts 改为直接调用 `node_modules` 入口，绕开失效的 `.bin`：

```json
{
  "dev": "node ../../node_modules/vite/bin/vite.js",
  "build": "node ../../node_modules/typescript/bin/tsc --noEmit && node ../../node_modules/vite/bin/vite.js build"
}
```

```json
{
  "dev": "node ../../node_modules/tsx/dist/cli.mjs watch src/index.ts",
  "build": "node ../../node_modules/tsup/dist/cli-default.js src/index.ts --format esm --out-dir dist --clean"
}
```

- `apps/web/package.json` 的 build 从 `tsc -b` 改为 `tsc --noEmit`，避免 composite 配置在无 project references 时失败。

## 4. 验证

```text
✓ tsc --noEmit 通过（server / web）
✓ vite build：1602 modules，CSS 48.94 kB，JS 239.05 kB
✓ tsup：dist/index.js 65.71 kB
✓ node apps/server/dist/index.js：/api/health 返回 200
✓ 完整质询 27 轮，报告生成
```

## 5. 取舍

- 选 **hoisted** 而不是继续修 junction：评委环境不可控，扁平 node_modules 更接近 npm 行为，排障成本最低。
- 保留 `pnpm-lock.yaml` 锁定版本；`pnpm install` 仍会走 lockfile。
- 不把 `node_modules` 或构建产物提交进仓库；`dist/` 与 `data/` 都在 `.gitignore` 中。

## 6. 复现

```bash
rm -rf node_modules
pnpm install
pnpm build
pnpm start
```

如果评委环境仍遇到 esbuild 构建脚本被拦截：

```bash
pnpm approve-builds   # 勾选 esbuild
# 或
pnpm rebuild esbuild
```
