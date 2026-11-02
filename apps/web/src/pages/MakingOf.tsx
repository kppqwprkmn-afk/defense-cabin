import { Link } from 'react-router-dom';
import { ArrowLeft, Bug, GitCommitHorizontal, MessageSquareCode, Wrench } from 'lucide-react';
import { BUILD_STEPS } from '../data/makingOf';

export default function MakingOf() {
  return (
    <div className="making">
      <header className="making-top">
        <Link to="/" className="icon-btn" aria-label="返回首页">
          <ArrowLeft size={17} />
        </Link>
        <div className="making-top-title">
          <span>研发现场</span>
          <small>MAKING OF · 可复现的 AI 协作链路</small>
        </div>
        <Link to="/" className="btn btn-ghost btn-sm">
          回到演练台
        </Link>
      </header>

      <section className="making-hero">
        <div className="eyebrow">
          <span className="pulse-dot" /> BUILD LOG · 2026.11
        </div>
        <h1>
          不是“一次性生成”，
          <br />
          是<em>五次推翻</em>。
        </h1>
        <p>
          这里保留了从赛题到可运行系统的关键转弯：每一次 Prompt、每一次 AI 误判、每一次人工纠偏。
          评委会看到的不是一个完成态，而是一条可以重放的演进路径。
        </p>
        <div className="making-stats">
          <div>
            <strong>05</strong>
            <span>核心迭代</span>
          </div>
          <div>
            <strong>03</strong>
            <span>真实 Bug</span>
          </div>
          <div>
            <strong>18+</strong>
            <span>细粒度提交</span>
          </div>
          <div>
            <strong>100%</strong>
            <span>离线可复现</span>
          </div>
        </div>
      </section>

      <div className="making-grid">
        <aside className="making-index">
          <div className="eyebrow">ITERATIONS</div>
          {BUILD_STEPS.map((s) => (
            <a key={s.id} href={`#${s.id}`}>
              <span>{s.index}</span>
              {s.title}
            </a>
          ))}
          <div className="making-note">
            <GitCommitHorizontal size={14} />
            每个步骤对应一次独立提交，提交说明可直接在 Git 历史中检索。
          </div>
        </aside>

        <main className="making-main">
          {BUILD_STEPS.map((s) => (
            <article className="step" id={s.id} key={s.id}>
              <div className="step-head">
                <span className="step-index">{s.index}</span>
                <div>
                  <span className="step-tag">{s.tag}</span>
                  <h2>{s.title}</h2>
                </div>
              </div>

              <div className="prompt-block">
                <div className="prompt-head">
                  <MessageSquareCode size={14} />
                  <span>PROMPT</span>
                  <b>人类意图</b>
                </div>
                <p>{s.prompt}</p>
              </div>

              <div className="step-output">
                <div className="output-label">AI 产出</div>
                <p>{s.output}</p>
              </div>

              {s.bug && (
                <div className="bug-block">
                  <div className="bug-head">
                    <Bug size={14} /> 翻车现场
                  </div>
                  <p>{s.bug}</p>
                  <div className="fix-line">
                    <Wrench size={13} />
                    <span>{s.fix}</span>
                  </div>
                </div>
              )}

              <div className="step-foot">
                <code>{s.commit}</code>
                <span>{s.files.join(' · ')}</span>
              </div>
            </article>
          ))}

          <div className="making-end">
            <div className="eyebrow">REPRODUCE IT</div>
            <h2>这条链路，评委可以自己走一遍。</h2>
            <p>
              README 提供 10 分钟复现路径；docs/prompts 保留完整 Prompt 链；每一个修复都能在 Git
              提交中找到对应的 diff。离线引擎不依赖任何外部 API Key。
            </p>
            <Link to="/" className="btn btn-primary">
              回到演练台
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
