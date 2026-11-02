import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const shot = (name) => {
  const jpg = path.join(root, 'screenshots', 'doc', name.replace(/\.png$/, '.jpg'));
  const p = fs.existsSync(jpg) ? jpg : path.join(root, 'screenshots', name);
  const mime = p.endsWith('.jpg') ? 'image/jpeg' : 'image/png';
  return `data:${mime};base64,${fs.readFileSync(p).toString('base64')}`;
};

const IMG = {
  dashboard: shot('01-dashboard.png'),
  live: shot('03-live.png'),
  report: shot('06-report.png'),
  making: shot('09-making-of.png'),
  mobile: shot('11-mobile.png'),
  preflight: shot('02-preflight.png'),
};

let pageNo = 1;
const page = (content, cls = '') => {
  pageNo += 1;
  return `<section class="page ${cls}">
  ${content}
  <footer class="pfoot"><span>答辩预演舱 · 技术文档</span><span>${String(pageNo).padStart(2, '0')} / 26</span></footer>
</section>`;
};

const fig = (src, caption, cls = '') =>
  `<figure class="fig ${cls}"><img src="${src}" alt=""><figcaption>${caption}</figcaption></figure>`;

const cover = `<section class="page cover">
  <div class="cover-top">
    <div class="cover-mark">答</div>
    <div class="cover-meta">DEFENSE CABIN · 2026<br>全国高校 Vibe Coding 开发挑战赛</div>
  </div>
  <div class="cover-main">
    <div class="kicker">TECHNICAL REPORT · 技术文档</div>
    <h1>答辩预演舱</h1>
    <div class="cover-sub">多 Agent 交叉质询系统<br>把答辩风险提前暴露在材料里</div>
    <div class="cover-line"></div>
    <p class="cover-lead">一个面向高校答辩场景的全栈应用：上传申报书，三位 AI 评审按评审口径逐条追问，<br>每一个问题都落回材料原文，每一条风险都能变成可执行的修改动作。</p>
  </div>
  <div class="cover-foot">
    <div><span>作品类型</span><b>多 Agent 协同 / 场景化 RAG / 全栈 MVP</b></div>
    <div><span>技术栈</span><b>React 18 · TypeScript · Express · SSE · BM25</b></div>
    <div><span>版本</span><b>v1.0 · 2026-11</b></div>
  </div>
</section>`;

const p2 = page(`
  <div class="kicker">ABSTRACT</div>
  <h2>摘要</h2>
  <p class="lead">答辩准备的核心矛盾不是“不知道说什么”，而是“没有人真的按评审口径逐条追问”。同学不好意思下狠手，导师时间有限，现有 AI 工具只会总结和润色。结果是材料里的弱证据——没有基线的 92.4%、没有样本量的 4 倍、把目标写成结论的 60%——在答辩现场才第一次被击穿。</p>
  <p>「答辩预演舱」把这件事产品化：上传申报书 / 答辩稿 / 论文，系统抽取 8–12 条可质询论点，标注证据强度与 7 类缺口；方法学教授、产业评委、竞赛评审三位 Agent 进行 27 轮（高压 31 轮）交叉质询，答辩人 Agent 由材料驱动应答；最终生成五维风险雷达、风险清单、P0/P1/P2 修改清单，以及可回放到段落的质询实录。</p>
  <p>工程上，本作品坚持三个约束：<b>离线可复现</b>（默认不依赖任何 API Key）、<b>结论可回放</b>（每个 Turn 绑定 claimId 与 BM25 证据）、<b>单进程交付</b>（评委 10 分钟内可跑通）。为此我们把“说什么”与“怎么播”拆成剧本层与编排层，用确定性规则导演保证同一材料每次生成同一条质询链，再用可选的真实 LLM 适配层提升语言质感。</p>

  <div class="stat-row">
    <div><b>27 / 31</b><span>标准 / 高压质询轮数</span></div>
    <div><b>7</b><span>类证据缺口</span></div>
    <div><b>5</b><span>维风险雷达</span></div>
    <div><b>0</b><span>外部服务依赖（mock）</span></div>
  </div>

  <div class="toc">
    <div class="kicker">CONTENTS</div>
    <div class="toc-grid">
      <a>01 问题：答辩准备的三个断层</a><a>08 意图控制策略</a>
      <a>02 产品：从材料到可执行清单</a><a>09 可复现性论证</a>
      <a>03 系统架构</a><a>10 工程质量</a>
      <a>04 多 Agent 协作</a><a>11 用户体验</a>
      <a>05 材料解析与论点抽取</a><a>12 评审标准对标</a>
      <a>06 轻量 RAG 与证据绑定</a><a>13 局限与路线图</a>
      <a>07 评分模型与报告</a><a>附录 API · Prompt · 复现</a>
    </div>
  </div>

  <h3>关键术语</h3>
  <table class="tbl small">
    <thead><tr><th style="width:18%">术语</th><th>含义</th></tr></thead>
    <tbody>
      <tr><td><b>Claim（论点）</b></td><td>从材料中抽出的一句可被追问的话，带类型、强度与缺口标签。</td></tr>
      <tr><td><b>PlannedTurn</b></td><td>剧本层的“谁、问什么、引用哪条论点、风险级别”，不含最终台词。</td></tr>
      <tr><td><b>Turn</b></td><td>播放层的最小可回放单元，含台词、证据引用、claimId。</td></tr>
      <tr><td><b>证据芯片</b></td><td>追问旁的可展开标签，点开显示材料原文、章节与 BM25 分数。</td></tr>
      <tr><td><b>高压模式</b></td><td>在标准 27 轮基础上追加因果归因链，共 31 轮。</td></tr>
    </tbody>
  </table>
`);

const p3 = page(`
  <div class="kicker">01 · PROBLEM</div>
  <h2>问题：答辩准备的三个断层</h2>
  <p class="lead">我们访谈与观察了身边的答辩场景（大创、毕设、挑战杯、课程答辩），把失败原因归为三个断层。它们不是“表达能力”问题，而是“对抗性反馈缺失”。</p>

  <div class="three">
    <div class="col-card"><span>01</span><h3>没有人扮演对立面</h3><p>同学旁听会给面子，导师只能提两句。材料里的“显著提升”“预计降低 60%”从未被真正追问过。</p></div>
    <div class="col-card"><span>02</span><h3>证据缺口不可见</h3><p>选手知道数字，但不知道评委在意“基线、样本量、归因、出处”。这些缺口在文字层面几乎看不出来。</p></div>
    <div class="col-card"><span>03</span><h3>演练不可复盘</h3><p>模拟答辩说完就忘；没有记录、没有风险分级、没有“下次先改哪一条”的清单。</p></div>
  </div>

  <h3>一个真实的材料片段</h3>
  <div class="quote">“本项目提出一种三模态融合的实验室安全隐患识别框架，在 12 类隐患上平均识别准确率达到 92.4%。”</div>
  <p>这句话在申报书里读起来很完整。但评审会连问三层：<b>跟谁比？</b>（基线）<b>多少样本？</b>（样本量）<b>跨校还成立吗？</b>（泛化）。如果选手没有准备，第一层就会失守。本作品要做的，是在上台前把这三层问题先问一遍。</p>

  <div class="insight">
    <div class="kicker">DESIGN INSIGHT</div>
    <p>把“文档总结”换成“论点级对抗”：不是问“这篇材料讲了什么”，而是问“这句话凭什么成立”。</p>
  </div>
`);

const p4 = page(`
  <div class="kicker">02 · PRODUCT</div>
  <h2>产品：从材料到可执行清单</h2>
  <p class="lead">产品只有一条主链路，所有页面都围绕它服务。评委不需要学习任何概念，上传材料后点“开始”即可。</p>

  <div class="flow">
    <div><b>01</b><span>上传材料</span><small>PDF / DOCX / MD / TXT</small></div><i>→</i>
    <div><b>02</b><span>材料体检</span><small>章节 / 强证据 / 缺口</small></div><i>→</i>
    <div><b>03</b><span>交叉质询</span><small>3 评审 + 主持人 + 替身</small></div><i>→</i>
    <div><b>04</b><span>风险裁决</span><small>雷达 / 风险 / 清单</small></div><i>→</i>
    <div><b>05</b><span>再练一次</span><small>高压模式 / 版本对比</small></div>
  </div>

  ${fig(IMG.dashboard, '图 1 · 首页：评审席、最近演练与两入口（新建 / 示例）', 'wide')}

  <p>首页不是“功能列表”，而是一个态度：<b>先被问倒，再上战场。</b>右侧常驻评审席让用户在上传前就知道“谁要来问我”，降低对 AI 的不确定感。</p>

  <div class="three">
    <div class="col-card"><span>01</span><h3>不替你写</h3><p>只做质询与体检，不生成申报书，不替代真实评审。</p></div>
    <div class="col-card"><span>02</span><h3>不预测奖项</h3><p>只暴露风险与修改动作，不承诺“这样改就能拿奖”。</p></div>
    <div class="col-card"><span>03</span><h3>不追求全能</h3><p>只服务一次答辩：材料 → 质询 → 清单 → 再练。</p></div>
  </div>
`);

const p5 = page(`
  <div class="kicker">02 · PRODUCT</div>
  <h2>用户旅程：五次点击完成一次闭环</h2>
  <table class="tbl">
    <thead><tr><th style="width:16%">阶段</th><th style="width:30%">用户动作</th><th>系统反馈</th><th style="width:18%">情绪目标</th></tr></thead>
    <tbody>
      <tr><td>进入</td><td>打开首页，看到“评审席已就位”</td><td>3 位评审角色、最近演练、示例入口</td><td>好奇、低门槛</td></tr>
      <tr><td>上传</td><td>拖入申报书，填名称 / 赛道</td><td>即时解析，显示字数、章节、论点数量</td><td>“它真的读懂了”</td></tr>
      <tr><td>预检</td><td>查看材料体检与论点清单</td><td>8 个板块覆盖、强证据占比、缺口标签</td><td>紧张、有预期</td></tr>
      <tr><td>质询</td><td>点击“开始交叉质询”</td><td>逐字流、轮次推进、风险实时累计、证据芯片</td><td>被追问的沉浸感</td></tr>
      <tr><td>裁决</td><td>查看报告</td><td>五维雷达、6 条风险、P0 清单、逐轮回放</td><td>“知道先改什么”</td></tr>
      <tr><td>再练</td><td>高压模式 / 导出 / 打印</td><td>新会话、Markdown、PDF</td><td>可行动的掌控感</td></tr>
    </tbody>
  </table>

  <div class="two-col">
    <div>
      <h3>关键设计：把“AI 在做什么”显性化</h3>
      <p>流式输出不是装饰。每一轮都有：谁在问（头像 / 角色 / 主问或追问）、问到哪条论点（左栏高亮）、依据是什么（证据芯片）、风险多高（红色标签）。用户不需要猜。</p>
    </div>
    <div>
      <h3>关键设计：报告必须能“明天就改”</h3>
      <p>每条风险都带关联论点；每条修改项都有 P0/P1/P2、工作量、预计提分。报告不是“评价”，是“施工图”。</p>
    </div>
  </div>

  ${fig(IMG.preflight, '图 2 · 预检页：材料已读完，评审已就位，用户只差一次点击')}
`);

const p6 = page(`
  <div class="kicker">03 · ARCHITECTURE</div>
  <h2>系统架构：四层、一条数据流</h2>
  <p class="lead">前端不引 UI 框架，后端不引数据库。所有复杂度集中在“论点 → 剧本 → 流 → 报告”这一条链路，保证评委可读、可复现、可替换。</p>

  <div class="arch">
    <div class="arch-row">
      <div class="arch-box main"><b>Presentation</b><span>React 18 · Vite · Router · 自建 CSS 设计系统</span><small>Dashboard / SessionRoom / Report / MakingOf</small></div>
    </div>
    <div class="arch-arrow">↓ fetch + EventSource</div>
    <div class="arch-row">
      <div class="arch-box"><b>Interface</b><span>Express Router · multer · zod · SSE</span><small>/projects /sessions /events /report.md</small></div>
    </div>
    <div class="arch-arrow">↓</div>
    <div class="arch-row split">
      <div class="arch-box"><b>Application</b><span>Orchestrator · Script · Scoring · LLM Adapter</span><small>start → stream → persist → report</small></div>
      <div class="arch-box"><b>Domain</b><span>Analyze · Text / BM25 · Store</span><small>sections → chunks → claims → health</small></div>
    </div>
    <div class="arch-arrow">↓</div>
    <div class="arch-row">
      <div class="arch-box data"><b>Data</b><span>data/db.json（原子写）· 上传文件仅内存解析</span><small>无数据库 · 无外部服务（mock 模式）</small></div>
    </div>
  </div>

  <h3>技术选型理由</h3>
  <table class="tbl small">
    <thead><tr><th>选择</th><th>理由</th><th>代价 / 边界</th></tr></thead>
    <tbody>
      <tr><td>React + Vite</td><td>上手快、构建轻、便于评委修改</td><td>无 SSR；首屏 239 kB（gzip 79 kB）</td></tr>
      <tr><td>Express + SSE</td><td>流式简单、可读、无需 WebSocket 基础设施</td><td>单向流；人工双向问答需扩展</td></tr>
      <tr><td>BM25（自实现）</td><td>零依赖、可解释、单文档足够</td><td>超长多文档需换向量库</td></tr>
      <tr><td>JSON Store</td><td>零配置、评委可直接打开看数据</td><td>单进程；多人并发需 SQLite/Postgres</td></tr>
      <tr><td>Mock 引擎</td><td>确定性、无 Key、断网可复现</td><td>不是开放推理；语言质感弱于真实 LLM</td></tr>
    </tbody>
  </table>
`);

const p7 = page(`
  <div class="kicker">03 · ARCHITECTURE</div>
  <h2>数据流：每个结论都能回溯</h2>
  <p class="lead">系统的核心不是“生成一段话”，而是维护一条可回溯的数据链。每个对象都有稳定 ID，前端可以据此高亮、跳转、导出。</p>

  <div class="chain">
    <div><b>Project</b><span>材料原文 / chunks / claims / health</span></div><i>→</i>
    <div><b>Claim</b><span>kind · strength · issues · chunkId</span></div><i>→</i>
    <div><b>PlannedTurn</b><span>persona · theme · claimId · risk</span></div><i>→</i>
    <div><b>Turn</b><span>text · citations · turnId</span></div><i>→</i>
    <div><b>Risk / Revision</b><span>dimension · level · claimId</span></div>
  </div>

  <h3>为什么不用“一个大 Prompt 直接出报告”</h3>
  <p>因为不可复现、不可解释、不可局部修改。我们把任务拆成四个确定性步骤：</p>
  <ol class="num">
    <li><b>抽取</b>：规则打分，产出 Claim；同一材料结果稳定。</li>
    <li><b>导演</b>：按缺口类型与角色职责生成 PlannedTurn[]；LLM 只负责润色。</li>
    <li><b>播放</b>：SSE 逐字 + 落库；刷新/断线可恢复。</li>
    <li><b>裁决</b>：按风险折算五维分数；风险与修订按标题去重。</li>
  </ol>

  <div class="code">
<pre>interface Turn {
  id: string; round: number;
  persona: 'host' | 'method' | 'industry' | 'judge' | 'presenter';
  kind: 'opening' | 'question' | 'answer' | 'followup' | 'verdict' | 'summary' | 'system';
  text: string; citations: Citation[];
  claimId?: string; theme?: string;
  risk?: 'high' | 'medium' | 'low';
}</pre>
  </div>
  <p class="cap">Turn 是最小可回放单元；前端所有渲染（高亮、证据、风险、报告）都从它派生。</p>

  <h3>存储片段：评委可以直接打开看</h3>
  <div class="code small">
<pre>{
  "sessions": [{
    "id": "s-4t-Gn5pv", "status": "completed", "overall": 71,
    "turns": [{
      "id": "t3", "persona": "method", "kind": "followup",
      "claimId": "a8", "risk": "high",
      "citations": [{ "section": "3.1 三模态融合识别", "score": 4.21 }],
      "text": "也就是说，92.4% 目前既没有同参数量基线……"
    }]
  }]
}</pre>
  </div>
`);

const p8 = page(`
  <div class="kicker">04 · MULTI-AGENT</div>
  <h2>四个角色，四种下刀方式</h2>
  <p class="lead">多 Agent 不是“四个聊天框”，而是四种稳定的评审视角。每个角色有独立的关注点、语气和追问链，才能产生真正的交叉质询。</p>

  <div class="persona-table">
    <div class="p-row"><div class="p-name" style="--c:#e8b45a">沈砚<small>方法学教授</small></div><div><b>关注</b>实验设计、基线、样本、消融、可复现</div><div><b>口头禅</b>“这个数字的基线是什么？”</div></div>
    <div class="p-row"><div class="p-name" style="--c:#5fd3c4">罗启<small>产业评委</small></div><div><b>关注</b>场景真伪、全生命周期成本、壁垒、付费方</div><div><b>口头禅</b>“谁付钱？比请两个安全员便宜吗？”</div></div>
    <div class="p-row"><div class="p-name" style="--c:#b79cff">周律<small>竞赛评审</small></div><div><b>关注</b>规则、原创边界、佐证、复现闭环</div><div><b>口头禅</b>“专利是受理还是授权？”</div></div>
    <div class="p-row"><div class="p-name" style="--c:#9aa4b2">闻野<small>主持人</small></div><div><b>职责</b>控场、记录高风险、收束裁决</div><div><b>口头禅</b>“记录：第一条高风险。”</div></div>
  </div>

  <div class="two-col">
    <div>
      <h3>答辩人：材料替身</h3>
      <p>林澈不是“另一个 AI”，而是“只知道你材料里写过的东西”的数字替身。它会有理有据，也会在证据不足时露怯——这正是压力测试的意义。</p>
    </div>
    <div>
      <h3>为什么不用“一个模型分饰四角”</h3>
      <p>单模型容易语气同质、互相附和。我们把角色约束写进剧本与 Prompt：每个角色只问职责内的问题，追问必须绑定不同的 claim/theme。</p>
    </div>
  </div>

  ${fig(IMG.live, '图 3 · 质询现场：左栏论点高亮、中间逐字追问、右栏风险实时累计', 'wide')}
`);

const p9 = page(`
  <div class="kicker">04 · MULTI-AGENT</div>
  <h2>质询状态机：27 轮如何组织</h2>
  <p class="lead">剧本层先生成完整轮次，再交给播放层。标准模式 27 轮，高压模式 31 轮；轮次不是固定模板，而是按材料里实际存在的缺口动态选点。</p>

  <table class="tbl">
    <thead><tr><th style="width:10%">轮次</th><th style="width:18%">主导</th><th>主题与追问逻辑</th><th style="width:16%">选点规则</th></tr></thead>
    <tbody>
      <tr><td>0</td><td>主持人</td><td>开场、规则、材料概况</td><td>固定</td></tr>
      <tr><td>1</td><td>沈砚</td><td>基线 → 答辩人应答 → 追问（跨校泛化）</td><td>带 % 的 no_baseline 论点</td></tr>
      <tr><td>1'</td><td>沈砚</td><td>高压追加：因果归因 → 应答 → 追问</td><td>causal 论点</td></tr>
      <tr><td>2</td><td>罗启</td><td>成本 → 应答 → 壁垒追问</td><td>含成本/元/部署的论点</td></tr>
      <tr><td>3</td><td>周律</td><td>原创边界 → 应答 → 复现闭环追问</td><td>创新类论点</td></tr>
      <tr><td>4</td><td>沈砚</td><td>样本代表性 → 应答 → 分层追问</td><td>no_sample（排除基线/创新/承诺）</td></tr>
      <tr><td>5</td><td>周律</td><td>承诺性指标 → 应答 → 佐证追问</td><td>带 % 的 promise 论点</td></tr>
      <tr><td>6</td><td>三位评审</td><td>独立裁决：方法 / 产业 / 规则</td><td>固定</td></tr>
      <tr><td>6'</td><td>主持人</td><td>汇总：分数、风险数、三件优先事项</td><td>由报告动态生成</td></tr>
    </tbody>
  </table>

  <h3>高压模式加什么</h3>
  <p>在基线追问之后插入一条“因果归因”链：<b>“这个时间下降里，系统贡献了多少，管理流程调整贡献了多少？”</b> 答辩人承认没有做严格归因后，评审再追一句“那这个降幅就不能写成系统效果”。这条链是示例项目里最容易翻车的部分，也是高压模式的价值。</p>

  <div class="note"><b>动态性：</b>如果材料里没有 causal 论点，高压模式不会硬加；如果没有 promise 句，承诺轮会退化为“目标与结论的边界”通用追问。所有选点都有 fallback。</div>

  <h3>一轮完整的“追问链”长什么样</h3>
  <div class="code small">
<pre>沈砚（主问）：你写「……92.4%」。这个数字的基线是什么？
林澈（应答）：主要和上一版人工流程比，同参数量基线还在补。
沈砚（追问）：也就是说，既没有基线也没有置信区间。换成另一所学校，会掉到多少？
林澈（应答）：内部估 8–15 个百分点，但没有正式测试。
→ 系统落一条高风险；证据芯片挂回 3.1 节原文。</pre>
  </div>
`);

const p10 = page(`
  <div class="kicker">04 · MULTI-AGENT</div>
  <h2>Turn 契约与 SSE 时序</h2>
  <p class="lead">流式体验的难点不是“逐字输出”，而是“刷新不丢、断线能接、消息不重复”。我们用一个简单的约定解决：先订阅，再重放；前端按 turn.id 去重。</p>

  <div class="seq">
    <div class="seq-row"><span>Client</span><span>POST /sessions/:id/start</span><span>API</span></div>
    <div class="seq-row"><span>API</span><span>{ ok: true }</span><span>Client</span></div>
    <div class="seq-row"><span>Client</span><span>GET /events（EventSource）</span><span>API</span></div>
    <div class="seq-row"><span>API</span><span>subscribe → replay 已落库 turns</span><span>Orchestrator</span></div>
    <div class="seq-row"><span>Orchestrator</span><span>turn:start → turn:delta × N → persist → turn:end</span><span>Client</span></div>
    <div class="seq-row"><span>Orchestrator</span><span>report + done</span><span>Client</span></div>
  </div>

  <h3>两个真实 Bug</h3>
  <div class="bug-grid">
    <div><b>Bug A · 丢消息</b><p>POST 返回时服务端已开始推流，EventSource 后建，前 2–3 条丢失。<br><b>修复：</b>连接时先 subscribe，再 replay。</p></div>
    <div><b>Bug B · 重复</b><p>刷新先 GET 全量 turns，SSE 又 replay，start 无条件 push。<br><b>修复：</b>前端按 id 去重，end 覆盖同 id 占位。</p></div>
  </div>

  <div class="code">
<pre>const unsubscribe = subscribe(session.id, send);
for (const event of replayEvents(session)) send(event);</pre>
  </div>

  <p>这个设计还有一个副作用：任何时刻刷新页面，用户看到的都是“已经说完的完整现场”，而不是半截流。对演示和评审都很重要。</p>
`);

const p11 = page(`
  <div class="kicker">05 · PARSING</div>
  <h2>材料解析：把“文章”拆成“可质询单元”</h2>
  <p class="lead">解析器不做通用摘要，而是回答一个问题：这段话里，哪一句最可能被评委追问？</p>

  <div class="pipeline">
    <div><b>01 归一化</b><small>换行 / 空白 / 全角</small></div><i>→</i>
    <div><b>02 章节</b><small>Markdown / 中文序号</small></div><i>→</i>
    <div><b>03 切块</b><small>≤620 字，保留 section</small></div><i>→</i>
    <div><b>04 句子</b><small>。！？；换行</small></div><i>→</i>
    <div><b>05 打分</b><small>数字 / 样本 / 基线 / 创新</small></div><i>→</i>
    <div><b>06 选点</b><small>12 条，类型配额</small></div>
  </div>

  <h3>句子打分（可解释的规则）</h3>
  <div class="code">
<pre>score = 48
  +10 含数字            +13 含样本量（间/人/所/周/分钟/元…）
  +10 含基线词          +6  含创新词（提出/首次/自研…）
  +14 “提出…框架/方法/系统”   +4  含准确率/召回率/F1
  -14 promise   -8 vague   -7 buzzword
  -7 no_baseline  -5 no_sample  -4 no_source</pre>
  </div>

  <p><b>strong ≥ 78，medium ≥ 60，weak &lt; 60。</b> 分数不是“文采分”，而是“被追问时的防守强度”。</p>

  <h3>排序与配额</h3>
  <p>单纯按分数排会把背景句排到第一。我们加入章节权重：背景/现状 −16，方案/数据/试点/成果 +9；再按类型配额（单一类型最多 4 条），并强制保留 1 条承诺句——因为“预计降低 60%”往往是最容易被击穿、也最容易被选手忽略的一句。</p>
`);

const p12 = page(`
  <div class="kicker">05 · PARSING</div>
  <h2>7 类缺口：把“感觉不对”变成标签</h2>
  <table class="tbl">
    <thead><tr><th style="width:18%">标签</th><th style="width:28%">触发条件（示例）</th><th>评审会怎么问</th></tr></thead>
    <tbody>
      <tr><td><code>no_baseline</code></td><td>有“提升/达到/%”但没有“相比/基线/对照”</td><td>“92.4% 的基线是什么？同参数量对照有没有？”</td></tr>
      <tr><td><code>no_sample</code></td><td>有百分比但没有样本量 / 抽样方式</td><td>“47 间实验室怎么选的？危化品占多少？”</td></tr>
      <tr><td><code>causal</code></td><td>“由 A 缩短至 B”但没有归因 / 消融</td><td>“31 分钟里，系统贡献多少，排班调整贡献多少？”</td></tr>
      <tr><td><code>vague</code></td><td>“显著/大幅/有效/较好”</td><td>“‘显著’具体是多少？有显著性检验吗？”</td></tr>
      <tr><td><code>promise</code></td><td>“预计/有望/计划” + 数字</td><td>“这是目标还是结论？有历史基数吗？”</td></tr>
      <tr><td><code>no_source</code></td><td>数字没有试点/测试/统计/附件出处</td><td>“这个数字的原始记录在哪？能抽查吗？”</td></tr>
      <tr><td><code>buzzword</code></td><td>≥3 个概念词堆叠</td><td>“去掉这些词，你的原创贡献是什么？”</td></tr>
    </tbody>
  </table>

  <div class="two-col">
    <div>
      <h3>强度不是“好坏”，而是“防守难度”</h3>
      <p>强证据（有数字 + 样本 + 基线）不等于创新强；弱证据也不等于项目差。它只表示：这句话在质询中需要更多支撑。报告的语言也遵循这个原则——不评价项目价值，只标注证据状态。</p>
    </div>
    <div>
      <h3>为什么用规则而不是模型</h3>
      <p>规则可解释、可单测、可复现；模型抽取会随温度漂移，评委无法复现同一结果。我们把“抽取”交给规则，把“表达”留给可选 LLM。</p>
    </div>
  </div>

  ${fig(IMG.live, '图 4 · 左栏：12 条论点、强度点、缺口计数；当前质询论点高亮', 'wide')}
`);

const p13 = page(`
  <div class="kicker">06 · RAG</div>
  <h2>轻量 RAG：BM25 + 证据芯片</h2>
  <p class="lead">本作品不需要向量库。单文档、1–2 万字、强调可解释，BM25 是更合适的选择：零依赖、可复现、每个分数都能解释。</p>

  <h3>中文分词</h3>
  <p>字符 unigram + bigram：既保留单字召回，又捕捉“基线”“样本”“复现”这类双字术语；英文与数字按词保留；去掉“的/了/在/是/我们/通过”等停用词。</p>

  <div class="formula">
    <div class="formula-title">BM25</div>
    <div class="formula-body">score(q,d) = Σ<sub>t∈q</sub> IDF(t) · <span class="frac"><i>f(t,d)·(k₁+1)</i><i>f(t,d)+k₁·(1−b+b·|d|/avgdl)</i></span></div>
    <div class="formula-note">k₁ = 1.4 · b = 0.75 · 每条追问取 top 2 · 无命中回退到论点所在 chunk</div>
  </div>

  <p>每条追问会带 1–2 条引用；前端渲染为“证据 · 章节”芯片，点开后显示原文、BM25 分数、chunkId。这样评委不需要相信模型，只需要看原文。</p>

  ${fig(IMG.live, '图 5 · 证据芯片：问题旁边直接挂材料章节，点开可核对原文', 'wide')}
`);

const p14 = page(`
  <div class="kicker">07 · SCORING</div>
  <h2>评分模型：锋利，但不失控</h2>
  <p class="lead">评分不是“AI 主观打分”，而是风险折算。每个扣分项都能回跳到具体风险，每条风险都能回跳到论点。设计目标是“让选手知道先改什么”，而不是“给一个漂亮分数”。</p>

  <table class="tbl">
    <thead><tr><th>维度</th><th style="width:12%">权重</th><th style="width:16%">基准分</th><th>主要扣分来源</th></tr></thead>
    <tbody>
      <tr><td>创新性</td><td>22%</td><td>79</td><td>buzzword、原创边界不清</td></tr>
      <tr><td>可行性</td><td>22%</td><td>76</td><td>成本、团队、场景</td></tr>
      <tr><td>证据强度</td><td>26%</td><td>76</td><td>no_baseline / no_sample / causal</td></tr>
      <tr><td>表达清晰度</td><td>14%</td><td>83</td><td>vague、promise</td></tr>
      <tr><td>合规与复现</td><td>16%</td><td>77</td><td>no_source、权重/数据未闭环</td></tr>
    </tbody>
  </table>

  <div class="formula">
    <div class="formula-title">RISK → SCORE</div>
    <div class="formula-body">deducted = Σ {high:7, medium:4, low:2}<br>score = clamp(base − min(16, deducted), 48, 93)<br>overall = Σ score<sub>i</sub> × weight<sub>i</sub></div>
    <div class="formula-note">单维最多扣 16 分；风险按标题去重；修订项按标题再去重</div>
  </div>

  <h3>两次校准</h3>
  <p>第一版把示例项目打到 66 分、证据强度 42，还出现三条同名“缺少基线”。这不是严格，是模型不可信。第二版把高风险扣分从 9 降到 7、加 16 分封顶、按标题去重，示例项目稳定在 71 分，证据强度 60——仍然指出问题，但不会把有真实试点的项目“判死刑”。</p>

  <div class="quote small">“评分的价值不是排序，而是让选手相信：我按这个清单改，下一次会更好。”</div>
`);

const p15 = page(`
  <div class="kicker">07 · SCORING</div>
  <h2>报告：从“评价”到“施工图”</h2>
  <p class="lead">报告页是整个产品的收束。它必须在 30 秒内回答三个问题：我哪里最危险？为什么？先改什么？</p>

  ${fig(IMG.report, '图 6 · 报告首屏：总分、五维雷达、三条 P0 行动', 'wide')}

  <div class="three">
    <div class="col-card"><span>A</span><h3>风险清单</h3><p>每条风险带等级、维度、关联论点；可按“仅高风险”筛选。</p></div>
    <div class="col-card"><span>B</span><h3>修改清单</h3><p>P0/P1/P2、工作量、预计提分、关联论点；可勾选完成。</p></div>
    <div class="col-card"><span>C</span><h3>质询实录</h3><p>按轮次折叠，保留每一句追问与证据，可回放到具体段落。</p></div>
  </div>

  <p>报告同时支持 Markdown 导出与浏览器打印 PDF。打印样式会隐藏交互控件、切换为白底，方便直接附在提交材料里。</p>

  <h3>报告章节与数据来源</h3>
  <table class="tbl small">
    <thead><tr><th style="width:18%">章节</th><th style="width:38%">回答的问题</th><th>数据来源</th></tr></thead>
    <tbody>
      <tr><td>评审结论</td><td>整体怎么样？先做什么？</td><td>五维分数 + P0 修订项</td></tr>
      <tr><td>五维雷达</td><td>短板在哪？</td><td>风险按维度折算，单维封顶 16</td></tr>
      <tr><td>风险清单</td><td>为什么危险？</td><td>被质询论点的 issue + 追问轮次</td></tr>
      <tr><td>修改清单</td><td>具体怎么改？</td><td>issue → 动作/工作量/预计提分</td></tr>
      <tr><td>质询实录</td><td>当时到底问了什么？</td><td>Turn 全量落库，含证据引用</td></tr>
    </tbody>
  </table>
`);

const p16 = page(`
  <div class="kicker">08 · INTENT CONTROL</div>
  <h2>意图控制：五层约束，让 Agent 不跑偏</h2>
  <p class="lead">“会写 Prompt”不是把要求堆成一大段，而是把角色、任务、证据、格式、边界分开约束。每一层都对应一个可验证的失败模式。</p>

  <table class="tbl">
    <thead><tr><th style="width:16%">层</th><th style="width:38%">内容</th><th>约束 / 失败模式</th></tr></thead>
    <tbody>
      <tr><td>角色层</td><td>姓名、头衔、关注点、语气、口头禅</td><td>只问职责内的问题；避免四个角色语气同质</td></tr>
      <tr><td>任务层</td><td>当前 theme、目标 claim、轮次、追问深度</td><td>一次只问一件事；避免“连环十问”</td></tr>
      <tr><td>证据层</td><td>论点原文 + BM25 片段 + 章节</td><td>必须引用；禁止编造数字/文献</td></tr>
      <tr><td>格式层</td><td>80–120 字、中文、无姓名前缀</td><td>避免舞台说明、避免 Markdown 标题</td></tr>
      <tr><td>安全层</td><td>不人身攻击、不预测奖项、不替代真实评审</td><td>拒绝越界；报告页有免责声明</td></tr>
    </tbody>
  </table>

  <h3>上下文预算</h3>
  <p>真实 LLM 模式每次只带：<b>项目名称 + 当前论点 + 最近 4 轮 + 本轮任务</b>。不塞完整材料，避免长上下文漂移；事实由 BM25 片段提供，结构由剧本提供。</p>

  <h3>失败回退</h3>
  <div class="code">
<pre>AI_MODE=openai && OPENAI_API_KEY
  → POST /chat/completions
  → 非 200 / 超时 / 空内容
  → return null
  → orchestrator 使用 script.ts 的原始台词</pre>
  </div>
  <p>因此真实模型是增强，不是单点依赖。评委没有 Key、断网、接口超时，都不影响完整演示。</p>
`);

const p17 = page(`
  <div class="kicker">08 · INTENT CONTROL</div>
  <h2>Prompt 实例：让追问“像人”，但不失控</h2>

  <h3>角色 System Prompt（真实 LLM 模式）</h3>
  <div class="code">
<pre>你在扮演高校答辩模拟评审「沈砚·方法学教授」。
说话锋利、具体、只说一件事，不堆术语，不重复材料原句。
只输出一段中文台词，80-120 字，不要加姓名前缀，不要解释。

项目：智巡校园 · 实验室安全巡检智能体
论点：本项目提出一种“视觉—文本—时序”三模态融合的……
最近对话：
  沈砚：这个指标的基线是什么？
  林澈：主要和上一版人工流程对比……
请按原计划的意思，用你的口吻说：
  “也就是说，92.4% 目前既没有同参数量基线，也没有置信区间……”</pre>
  </div>

  <h3>为什么把“原计划”也给模型</h3>
  <p>让模型润色，而不是让模型决定问什么。剧本层已经决定了“问基线、问跨校泛化”，LLM 只负责把这句话说得更像沈砚。这样即使模型漂移，质询链的结构仍然稳定。</p>

  <h3>反例：不要这样写</h3>
  <div class="code bad">
<pre>你是一个严格的评审，请根据材料提出 10 个深刻的问题，
覆盖创新性、可行性、商业价值、技术路线、团队、风险，
每个问题要有深度，最好能难住选手。</pre>
  </div>
  <p>这种 Prompt 会得到“正确的废话”：问题很多、很全、但无法回放到具体论点，也无法评分。结构不是靠形容词堆出来的。</p>
`);

const p18 = page(`
  <div class="kicker">09 · REPRODUCIBILITY</div>
  <h2>可复现性：把“过程”也当作交付物</h2>
  <p class="lead">赛题把“过程可复现”放在 25% 的第一位。我们的理解是：评委不需要相信我们的叙述，只需要能重跑、能对照、能抽查。</p>

  <table class="tbl">
    <thead><tr><th style="width:22%">证据</th><th>内容</th><th style="width:24%">位置</th></tr></thead>
    <tbody>
      <tr><td>确定性引擎</td><td>mock 模式无随机数；同材料 → 同剧本 → 同评分</td><td><code>script.ts</code> / <code>scoring.ts</code></td></tr>
      <tr><td>细粒度 Git</td><td>20+ 次提交，按模块/修复拆分，非“initial commit”</td><td><code>git log --oneline</code></td></tr>
      <tr><td>Prompt 链</td><td>5 个核心迭代：意图、产出、翻车、修复、验证</td><td><code>docs/prompts/</code></td></tr>
      <tr><td>Bug 修复</td><td>年份被吃掉、SSE 丢/重、评分 42、构建冲突</td><td><code>docs/prompts/02~05</code></td></tr>
      <tr><td>10 分钟路径</td><td>install → build → start → demo</td><td><code>README.md</code> 第 3 节</td></tr>
      <tr><td>可视化回放</td><td>应用内“研发现场”时间线</td><td><code>/making-of</code></td></tr>
    </tbody>
  </table>

  <h3>10 分钟复现（实测）</h3>
  <div class="code">
<pre>pnpm install      # 2–5 min，取决于网络
pnpm build        # 约 10 s
pnpm start        # 单进程 :8787
# 打开 http://127.0.0.1:8787 → 载入示例 → 开始交叉质询</pre>
  </div>

  <div class="note"><b>边界：</b>首次安装依赖 npm 网络；完全断网环境无法保证首次安装。安装完成后，运行与演示可完全离线。</div>
`);

const p19 = page(`
  <div class="kicker">09 · REPRODUCIBILITY</div>
  <h2>四个真实 Bug：从翻车到修复</h2>
  <p class="lead">这些不是“为了文档编的例子”，而是开发过程中真实出现、定位、修复并加测试的问题。每个都能在 Git 历史中找到对应提交。</p>

  <table class="tbl bug-tbl">
    <thead><tr><th style="width:16%">Bug</th><th style="width:30%">现象</th><th>根因 → 修复</th></tr></thead>
    <tbody>
      <tr><td><b>年份被吃掉</b></td><td>“2025 年 9 月”渲染成“年 9 月”</td><td>清洗正则把任意开头数字当列表序号 → 只匹配 1–2 位 + . 或 、</td></tr>
      <tr><td><b>核心创新句落榜</b></td><td>12 条论点里没有 92.4% 那句</td><td>数据类配额满 + 分类被 % 抢走 → “提出…框架”直判创新，提高权重</td></tr>
      <tr><td><b>SSE 丢/重</b></td><td>前几条消息丢失；刷新后重复</td><td>先推流后连接 / 无条件 push → 先 subscribe 再 replay，按 id 去重</td></tr>
      <tr><td><b>评分 42 + 三连重复</b></td><td>证据强度 42；三条同名风险/P0</td><td>扣分无上限 + 无去重 → 单维封顶 16，按标题去重</td></tr>
    </tbody>
  </table>

  <h3>修复示例：清洗正则</h3>
  <div class="diff">
    <div class="del">- .replace(/^[-•·*\\d.\\s、]+/, '')</div>
    <div class="add">+ .replace(/^[-•·*]\\s*/, '')</div>
    <div class="add">+ .replace(/^\\d{1,2}[.、]\\s*/, '')</div>
  </div>

  <h3>修复示例：评分封顶</h3>
  <div class="diff">
    <div class="del">- const PENALTY = { high: 9, medium: 5.5, low: 3 };</div>
    <div class="add">+ const PENALTY = { high: 7, medium: 4, low: 2 };</div>
    <div class="del">- value -= PENALTY[risk.level];</div>
    <div class="add">+ deducted += PENALTY[risk.level];</div>
    <div class="add">+ value -= Math.min(16, deducted);</div>
  </div>
`);

const p20 = page(`
  <div class="kicker">10 · ENGINEERING</div>
  <h2>工程质量：能维护，才敢叫“作品”</h2>
  <p class="lead">AI 生成的代码最容易死于“能跑但没人敢改”。我们用三层约束控制：类型契约、单一数据访问层、可测试的纯函数。</p>

  <table class="tbl">
    <thead><tr><th style="width:18%">层</th><th>职责</th><th style="width:26%">关键文件</th></tr></thead>
    <tbody>
      <tr><td>Shared</td><td>前后端共享类型、Persona 常量、StreamEvent</td><td><code>packages/shared</code></td></tr>
      <tr><td>Domain</td><td>切块、分词、BM25、论点抽取、体检</td><td><code>domain/text.ts</code> · <code>analyze.ts</code></td></tr>
      <tr><td>Engine</td><td>剧本、编排、SSE、评分、LLM 适配</td><td><code>engine/*.ts</code></td></tr>
      <tr><td>Interface</td><td>REST、上传、导出、静态托管</td><td><code>routes.ts</code></td></tr>
      <tr><td>Store</td><td>JSON 原子写、启动恢复</td><td><code>store.ts</code></td></tr>
    </tbody>
  </table>

  <h3>安全与边界</h3>
  <ul class="checks">
    <li>上传限制 20MB / 6 个；仅解析 pdf/docx/md/txt；不执行宏。</li>
    <li>文件只在内存解析，不按原始文件名落盘；避免路径穿越。</li>
    <li>React 默认转义；全项目不使用 <code>dangerouslySetInnerHTML</code>。</li>
    <li>材料只写本机；mock 模式无出站请求；报告可本地删除。</li>
    <li>Prompt 明确“不预测奖项、不替代真实评审”；页面有免责声明。</li>
  </ul>

  <h3>API 契约</h3>
  <div class="code small">
<pre>GET  /api/health                  → { ok, mode }
POST /api/projects                → Project（multipart）
POST /api/sessions                → Session
POST /api/sessions/:id/start      → { ok }
GET  /api/sessions/:id/events     → SSE
GET  /api/sessions/:id/report.md  → text/markdown
POST /api/demo                    → { projectId, sessionId }</pre>
  </div>
`);

const p21 = page(`
  <div class="kicker">10 · ENGINEERING</div>
  <h2>测试与性能：用数据说话</h2>

  <div class="stat-row">
    <div><b>7/7</b><span>单元测试通过</span></div>
    <div><b>0</b><span>E2E console error</span></div>
    <div><b>27</b><span>标准轮次</span></div>
    <div><b>71</b><span>示例项目综合分</span></div>
  </div>

  <h3>测试覆盖</h3>
  <table class="tbl">
    <thead><tr><th style="width:30%">测试</th><th>断言</th></tr></thead>
    <tbody>
      <tr><td>年份保留</td><td>“2025 年”原样出现在论点文本中</td></tr>
      <tr><td>创新句入榜</td><td>含 92.4% 的句子必须被抽取，且带 no_baseline</td></tr>
      <tr><td>promise 兜底</td><td>至少一条承诺句进入质询清单</td></tr>
      <tr><td>体检边界</td><td>score ∈ (30, 94]；8 个覆盖项</td></tr>
      <tr><td>BM25</td><td>查询“试点/实验室/响应时间”命中 47 间段落</td></tr>
      <tr><td>风险去重</td><td>titles 无重复；修订项无重复</td></tr>
      <tr><td>分数边界</td><td>总分 50–90；每维 48–93</td></tr>
    </tbody>
  </table>

  <h3>性能预算</h3>
  <table class="tbl small">
    <thead><tr><th>指标</th><th>实测 / 目标</th></tr></thead>
    <tbody>
      <tr><td>材料解析（1.5k 字）</td><td>&lt; 50 ms</td></tr>
      <tr><td>BM25 建索引</td><td>&lt; 10 ms</td></tr>
      <tr><td>27 轮 SSE</td><td>约 20–40 s（speed=1，可调 1–4×）</td></tr>
      <tr><td>前端首屏 JS</td><td>239 kB / gzip 79 kB</td></tr>
      <tr><td>CSS</td><td>49 kB / gzip 10 kB</td></tr>
      <tr><td>冷启动</td><td>&lt; 1 s（无数据库/外部服务）</td></tr>
    </tbody>
  </table>

  <p>这些数字不惊艳，但足够支撑“评委在笔记本上 10 分钟跑完”的目标。我们优先选择可复现，而不是极限性能。</p>
`);

const p22 = page(`
  <div class="kicker">11 · EXPERIENCE</div>
  <h2>体验：让“被追问”变得可看、可读、可承受</h2>
  <p class="lead">答辩模拟天然让人紧张。视觉设计不能加重压迫感，也不能做成轻佻的聊天玩具。我们选择“深夜评审舱”：暗色、克制、琥珀色重点，像一间真的评审室。</p>

  <div class="token-grid">
    <div><i style="background:#090b0f"></i><b>Ink</b><span>#090B0F</span></div>
    <div><i style="background:#ece7dd"></i><b>Ivory</b><span>#ECE7DD</span></div>
    <div><i style="background:#e8b45a"></i><b>Amber</b><span>#E8B45A</span></div>
    <div><i style="background:#5fd3c4"></i><b>Cyan</b><span>#5FD3C4</span></div>
    <div><i style="background:#b79cff"></i><b>Violet</b><span>#B79CFF</span></div>
    <div><i style="background:#e06c5e"></i><b>Risk</b><span>#E06C5E</span></div>
  </div>

  <div class="two-col">
    <div>
      <h3>三个体验决策</h3>
      <p><b>1. 先给“谁在问”。</b>头像、姓名、头衔、主问/追问标签先于正文出现，用户不会迷失在文字里。</p>
      <p><b>2. 风险实时长出来。</b>右栏在质询过程中从骨架变成具体风险，制造“问题正在累积”的紧迫感。</p>
      <p><b>3. 证据随手可查。</b>每个问题旁都有证据芯片，点开就是原文；不需要信任 AI。</p>
    </div>
    <div>
      <h3>动效原则</h3>
      <p>只用在“状态变化”上：消息进入、流式光标、风险累计、雷达生长。不做无意义的漂浮和炫技；截图与录屏都要能看清信息。</p>
    </div>
  </div>

  ${fig(IMG.mobile, '图 7 · 移动端：390px 下仍保持标题层级与双入口', 'phone')}
`);

const p23 = page(`
  <div class="kicker">12 · EVALUATION</div>
  <h2>评审标准对标</h2>
  <table class="tbl eval">
    <thead><tr><th style="width:20%">维度</th><th style="width:8%">权重</th><th>本作品的证据</th><th style="width:18%">可现场验证</th></tr></thead>
    <tbody>
      <tr><td>过程可复现<br>与演进链路</td><td>25%</td><td>20+ 次细粒度提交；5 个 Prompt 链；4 个真实 Bug 修复；mock 确定性；10 分钟复现</td><td><code>git log</code> / <code>docs/prompts</code> / <code>/making-of</code></td></tr>
      <tr><td>解题有效性<br>与实用价值</td><td>25%</td><td>真实答辩痛点；上传→质询→报告→再练闭环；P0 修改清单可直接执行</td><td>载入示例跑完整场</td></tr>
      <tr><td>方法创新性<br>与意图控制</td><td>20%</td><td>论点级多 Agent 交叉质询；剧本/播放分离；五层 Prompt 约束；证据绑定</td><td>打开证据芯片 / 看 <code>script.ts</code></td></tr>
      <tr><td>工程质量<br>与架构设计</td><td>15%</td><td>四层架构、共享类型、原子写、SSE 重放、7 个单测、无数据库</td><td><code>pnpm test</code> / 代码结构</td></tr>
      <tr><td>用户体验<br>与产品精细度</td><td>15%</td><td>暗色评审舱、逐字流、风险实时、响应式、打印样式、空状态</td><td>质询中刷新 / 移动端</td></tr>
    </tbody>
  </table>

  <h3>如果评委只给 3 分钟</h3>
  <div class="three">
    <div class="col-card"><span>1</span><h3>看首页</h3><p>“先被问倒，再上战场”——一句话说清产品态度。</p></div>
    <div class="col-card"><span>2</span><h3>跑示例</h3><p>点“载入示例 → 开始”，看 30 秒质询与证据芯片。</p></div>
    <div class="col-card"><span>3</span><h3>看报告</h3><p>五维雷达 + 3 条 P0，证明不是“聊天玩具”。</p></div>
  </div>

  <div class="note"><b>诚实边界：</b>示例项目“智巡校园”为虚构演示材料；产品支持上传真实材料，但评分仍是演练参考，不构成奖项预测。</div>
`);

const p24 = page(`
  <div class="kicker">13 · LIMITS</div>
  <h2>局限与下一步</h2>
  <p class="lead">一个 10 分钟能跑通的作品，一定做了取舍。我们把边界写清楚，而不是假装它是通用平台。</p>

  <table class="tbl">
    <thead><tr><th style="width:26%">当前局限</th><th>影响</th><th style="width:30%">下一步</th></tr></thead>
    <tbody>
      <tr><td>Mock 引擎是规则导演</td><td>语言质感弱于真实 LLM，复杂学科问题覆盖有限</td><td>接入真实模型 + 领域问题库；保留 mock 作为复现基线</td></tr>
      <tr><td>仅支持可复制文本</td><td>扫描版 PDF 无法解析</td><td>接入 OCR（PaddleOCR / 云 OCR）</td></tr>
      <tr><td>JSON 单进程存储</td><td>多人并发不适合</td><td>SQLite / Postgres + 用户体系</td></tr>
      <tr><td>BM25 单文档</td><td>长论文、多附件检索弱</td><td>pgvector / Qdrant + 混合检索</td></tr>
      <tr><td>评分未分学科</td><td>文科/工科/医学口径不同</td><td>赛道模板：权重、问题库、证据规则可配置</td></tr>
      <tr><td>无真人对练</td><td>答辩人由 AI 替身应答</td><td>人工模式：用户输入回答，评审动态追问</td></tr>
    </tbody>
  </table>

  <h3>路线图</h3>
  <div class="road">
    <div><b>v1.1</b><span>人工答辩模式 + 语音输入</span></div>
    <div><b>v1.2</b><span>赛道模板与评分权重配置</span></div>
    <div><b>v1.3</b><span>两次演练 diff：分数 / 风险 / 修订完成度</span></div>
    <div><b>v2.0</b><span>多文档知识库 + 真实评审圆桌</span></div>
  </div>

  <div class="closing">
    <div class="kicker">CLOSING</div>
    <p>答辩不是把做过的事讲一遍，<br>而是证明你的结论经得起别人换一个角度再问一次。</p>
    <span>答辩预演舱 · Defense Cabin · 2026</span>
  </div>
`);

const p25 = page(`
  <div class="kicker">APPENDIX A</div>
  <h2>附录：API 与数据模型</h2>

  <h3>StreamEvent</h3>
  <div class="code small">
<pre>type StreamEvent =
  | { type: 'turn:start'; turn: Turn }
  | { type: 'turn:delta'; id: string; delta: string }
  | { type: 'turn:end'; turn: Turn }
  | { type: 'status'; status: SessionStatus; progress: number }
  | { type: 'report'; scores; risks; revisions; summary; overall }
  | { type: 'done' }
  | { type: 'error'; message: string };</pre>
  </div>

  <h3>Session</h3>
  <div class="code small">
<pre>interface Session {
  id: string; projectId: string; projectName: string;
  status: 'ready' | 'running' | 'completed';
  mode: 'mock' | 'llm'; intensity: '标准' | '高压';
  turns: Turn[]; scores: DimensionScore[];
  risks: RiskItem[]; revisions: Revision[];
  summary: string; overall: number; progress: number;
  createdAt: string; completedAt?: string; speed: number;
}</pre>
  </div>

  <h3>文件布局</h3>
  <div class="code small">
<pre>apps/server/src/domain/    text.ts · analyze.ts · sample.ts
apps/server/src/engine/    script.ts · orchestrator.ts · scoring.ts · llm.ts
apps/server/src/           routes.ts · store.ts · report.ts · config.ts
apps/web/src/pages/        Dashboard · SessionRoom · ReportPage · MakingOf
packages/shared/src/       index.ts（类型 + Persona 常量）</pre>
  </div>
`);

const p26 = page(`
  <div class="kicker">APPENDIX B</div>
  <h2>附录：Prompt 索引与复现命令</h2>

  <table class="tbl">
    <thead><tr><th style="width:12%">#</th><th>文件</th><th>关键内容</th></tr></thead>
    <tbody>
      <tr><td>01</td><td><code>docs/prompts/01-scope.md</code></td><td>赛题收敛、产品边界、AI 不能代做的部分</td></tr>
      <tr><td>02</td><td><code>docs/prompts/02-material-parser.md</code></td><td>论点抽取、年份 Bug、创新句落榜</td></tr>
      <tr><td>03</td><td><code>docs/prompts/03-orchestrator.md</code></td><td>多 Agent 编排、SSE 丢/重、刷新恢复</td></tr>
      <tr><td>04</td><td><code>docs/prompts/04-scoring.md</code></td><td>评分校准、风险去重、P0 清单</td></tr>
      <tr><td>05</td><td><code>docs/prompts/05-build.md</code></td><td>pnpm junction、esbuild 双版本、可复现构建</td></tr>
    </tbody>
  </table>

  <h3>复现命令</h3>
  <div class="code">
<pre>pnpm install
pnpm build
pnpm start
# http://127.0.0.1:8787

pnpm test     # 7 个单测
pnpm e2e      # Playwright 全链路
</pre>
  </div>

  <h3>关键环境变量</h3>
  <div class="code small">
<pre>PORT=8787
AI_MODE=mock          # mock | openai
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=       # 可留空
OPENAI_MODEL=gpt-4o-mini
DEMO_SPEED=1</pre>
  </div>

  <div class="end-mark">
    <div class="cover-mark small">答</div>
    <p>先被问倒，再上战场。</p>
    <span>答辩预演舱 · Defense Cabin</span>
  </div>
`);

const css = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: #d9d4c9; }
body {
  font-family: "Microsoft YaHei UI", "Microsoft YaHei", "PingFang SC", sans-serif;
  color: #23252b; -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.page {
  width: 210mm; height: 297mm; padding: 16mm 16mm 13mm;
  background: #fbf8f1; position: relative; overflow: hidden;
  page-break-after: always; break-after: page;
}
.page:last-child { page-break-after: auto; break-after: auto; }
.page::before {
  content: ""; position: absolute; left: 0; top: 0; width: 100%; height: 3mm;
  background: linear-gradient(90deg, #b57a1e, #e8b45a 35%, transparent 85%);
}
.kicker {
  font-family: "Cascadia Code", Consolas, monospace; font-size: 7.2pt;
  letter-spacing: .18em; color: #a06a1f; text-transform: uppercase;
}
h1, h2, h3 { font-family: "Songti SC", "STSong", "SimSun", serif; color: #17181c; }
h2 { font-size: 21pt; font-weight: 600; margin: 3mm 0 5mm; letter-spacing: -.01em; }
h3 { font-size: 12pt; font-weight: 600; margin: 5mm 0 2mm; }
p { font-size: 8.8pt; line-height: 1.78; color: #44474e; margin: 0 0 2.6mm; text-align: justify; }
p.lead { font-size: 9.6pt; line-height: 1.82; color: #2c2f35; }
b { color: #1d1f24; }
code { font-family: "Cascadia Code", Consolas, monospace; font-size: 7.6pt; background: #efe8da; padding: .4mm 1mm; border-radius: 1mm; color: #7a4b12; }
.pfoot {
  position: absolute; left: 16mm; right: 16mm; bottom: 7mm;
  display: flex; justify-content: space-between;
  font-family: "Cascadia Code", Consolas, monospace; font-size: 6.6pt;
  color: #9b958a; letter-spacing: .06em; border-top: .2mm solid #e3dccd; padding-top: 2mm;
}

/* cover */
.cover { background: #0b0e13; color: #ece7dd; padding: 20mm 18mm; }
.cover::before { background: linear-gradient(90deg, #e8b45a, #5fd3c4 60%, transparent); }
.cover-top { display: flex; justify-content: space-between; align-items: flex-start; }
.cover-mark {
  width: 13mm; height: 13mm; border: .3mm solid #b98a3d; border-radius: 3mm;
  display: grid; place-items: center; font-family: "SimSun", serif;
  font-size: 22pt; color: #e8b45a; background: rgba(232,180,90,.08);
}
.cover-mark.small { width: 11mm; height: 11mm; font-size: 18pt; margin: 0 auto 3mm; }
.cover-meta { text-align: right; font-family: "Cascadia Code", monospace; font-size: 7pt; line-height: 1.8; color: #8b93a1; letter-spacing: .08em; }
.cover-main { margin-top: 44mm; }
.cover .kicker { color: #e8b45a; }
.cover h1 { font-size: 58pt; color: #f3eee2; margin: 5mm 0 4mm; letter-spacing: -.02em; }
.cover-sub { font-family: "Songti SC", "SimSun", serif; font-size: 20pt; line-height: 1.55; color: #d8c9a9; }
.cover-line { width: 40mm; height: .5mm; background: #e8b45a; margin: 9mm 0 7mm; }
.cover-lead { font-size: 9.2pt; line-height: 1.9; color: #aab1bd; max-width: 150mm; }
.cover-foot { position: absolute; left: 18mm; right: 18mm; bottom: 18mm; display: flex; gap: 16mm; border-top: .2mm solid #2a303b; padding-top: 5mm; }
.cover-foot span { display: block; font-family: "Cascadia Code", monospace; font-size: 6.4pt; color: #6d7582; letter-spacing: .1em; margin-bottom: 1.5mm; }
.cover-foot b { font-size: 7.8pt; color: #c9c3b7; font-weight: 400; }

/* components */
.stat-row { display: flex; gap: 10mm; margin: 6mm 0; padding: 4mm 0; border-top: .2mm solid #e3dccd; border-bottom: .2mm solid #e3dccd; }
.stat-row > div { display: flex; flex-direction: column; gap: 1mm; }
.stat-row b { font-family: "Cascadia Code", monospace; font-size: 17pt; color: #a06a1f; font-weight: 500; }
.stat-row span { font-size: 6.8pt; color: #8a8479; letter-spacing: .04em; }
.toc { margin-top: 7mm; }
.toc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.4mm 10mm; margin-top: 3mm; }
.toc-grid a { font-size: 8.2pt; color: #4b4e55; border-bottom: .2mm dotted #d9d1c1; padding: 1.4mm 0; }
.three { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; margin: 5mm 0; }
.col-card { border: .2mm solid #e2dacb; background: #f6f1e7; padding: 4mm; border-radius: 1.5mm; }
.col-card span { font-family: "Cascadia Code", monospace; font-size: 8pt; color: #b57a1e; }
.col-card h3 { font-size: 10pt; margin: 1.5mm 0 1.5mm; }
.col-card p { font-size: 7.6pt; line-height: 1.65; margin: 0; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; margin: 4mm 0 2mm; }
.quote { border-left: .8mm solid #e8b45a; background: #f6efe2; padding: 3.5mm 5mm; font-family: "Songti SC", "SimSun", serif; font-size: 10.5pt; line-height: 1.7; color: #5d4318; margin: 4mm 0; }
.quote.small { font-size: 9.5pt; }
.insight { border: .2mm solid #e2dacb; border-radius: 1.5mm; padding: 4mm 5mm; margin-top: 5mm; background: #f8f4eb; }
.insight p { font-family: "Songti SC", "SimSun", serif; font-size: 10.5pt; color: #4b3412; margin: 1.5mm 0 0; }
.flow { display: flex; align-items: stretch; gap: 1.5mm; margin: 5mm 0 4mm; }
.flow > div { flex: 1; border: .2mm solid #e2dacb; background: #f7f2e8; border-radius: 1.2mm; padding: 2.5mm; display: flex; flex-direction: column; gap: .8mm; }
.flow b { font-family: "Cascadia Code", monospace; font-size: 7pt; color: #b57a1e; }
.flow span { font-size: 7.6pt; font-weight: 600; color: #2b2d33; }
.flow small { font-size: 6.4pt; color: #8a8479; line-height: 1.4; }
.flow i { align-self: center; color: #b9a986; font-style: normal; font-size: 9pt; }
.fig { margin: 4mm 0 3mm; }
.fig img { width: 100%; border: .2mm solid #d9d1c1; border-radius: 1mm; display: block; }
.fig figcaption { font-size: 6.8pt; color: #8a8479; margin-top: 1.6mm; text-align: center; }
.fig.phone img { width: 44%; max-height: 118mm; object-fit: cover; object-position: top; margin: 0 auto; }
.tbl { width: 100%; border-collapse: collapse; margin: 3mm 0 4mm; }
.tbl th { text-align: left; font-size: 7.2pt; font-weight: 600; color: #6d4d1c; background: #f1e9da; padding: 2mm 2.2mm; border-bottom: .3mm solid #d8cbb4; }
.tbl td { font-size: 7.5pt; line-height: 1.55; color: #3f4249; padding: 1.9mm 2.2mm; border-bottom: .2mm solid #e7dfd1; vertical-align: top; }
.tbl.small td { font-size: 7pt; }
.tbl code { font-size: 6.8pt; }
.arch { margin: 4mm 0 4mm; }
.arch-row { display: flex; gap: 3mm; }
.arch-row.split { display: grid; grid-template-columns: 1fr 1fr; }
.arch-box { flex: 1; border: .25mm solid #d9c9a9; background: #f7f1e5; border-radius: 1.5mm; padding: 3mm 3.5mm; display: flex; flex-direction: column; gap: 1mm; }
.arch-box.main { background: #f2e6ce; }
.arch-box.data { background: #eef4f1; border-color: #b9d3c9; }
.arch-box b { font-family: "Cascadia Code", monospace; font-size: 7.6pt; color: #8a5a16; letter-spacing: .06em; }
.arch-box span { font-size: 7.2pt; color: #45484f; line-height: 1.5; }
.arch-box small { font-size: 6.4pt; color: #8a8479; }
.arch-arrow { text-align: center; font-family: "Cascadia Code", monospace; font-size: 6.6pt; color: #9a8f7b; padding: 1.5mm 0; }
.chain { display: flex; align-items: stretch; gap: 1.2mm; margin: 4mm 0; }
.chain > div { flex: 1; border: .2mm solid #e2dacb; background: #f7f2e8; padding: 2.5mm; border-radius: 1mm; }
.chain b { display: block; font-family: "Cascadia Code", monospace; font-size: 7.2pt; color: #a06a1f; margin-bottom: 1mm; }
.chain span { font-size: 6.4pt; line-height: 1.45; color: #777167; }
.chain i { align-self: center; font-style: normal; color: #b9a986; font-size: 8pt; }
.num { margin: 2mm 0 3mm 5mm; padding: 0; }
.num li { font-size: 8pt; line-height: 1.7; color: #44474e; margin-bottom: 1.2mm; }
.code { background: #14171d; border-radius: 1.5mm; padding: 3.5mm 4mm; margin: 3mm 0; }
.code pre { margin: 0; font-family: "Cascadia Code", Consolas, monospace; font-size: 7pt; line-height: 1.65; color: #d8d2c5; white-space: pre-wrap; }
.code.small pre { font-size: 6.6pt; }
.code.bad { background: #2a1512; border: .2mm solid #7a3a31; }
.cap { font-size: 6.8pt; color: #8a8479; text-align: center; margin-top: -1mm; }
.persona-table { margin: 4mm 0; }
.p-row { display: grid; grid-template-columns: 32mm 1fr 1.1fr; gap: 4mm; padding: 2.8mm 0; border-bottom: .2mm solid #e5ddcf; align-items: center; }
.p-name { font-family: "Songti SC", "SimSun", serif; font-size: 11pt; color: #1f2126; border-left: .8mm solid var(--c); padding-left: 2.5mm; }
.p-name small { display: block; font-family: "Microsoft YaHei", sans-serif; font-size: 6.8pt; color: #8a8479; margin-top: .8mm; }
.p-row > div:not(.p-name) { font-size: 7.4pt; line-height: 1.55; color: #5a5d64; }
.p-row b { color: #8a5a16; font-weight: 600; margin-right: 1mm; }
.note { border: .2mm dashed #d4c3a4; background: #faf5ea; padding: 3mm 4mm; font-size: 7.6pt; line-height: 1.65; color: #5a4a30; margin: 3mm 0; border-radius: 1mm; }
.bug-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin: 3mm 0; }
.bug-grid > div { border: .2mm solid #e6c9c3; background: #fbf1ee; padding: 3mm 3.5mm; border-radius: 1mm; }
.bug-grid b { display: block; font-size: 8pt; color: #9e3f34; margin-bottom: 1mm; }
.bug-grid p { font-size: 7.2pt; line-height: 1.6; margin: 0; }
.seq { margin: 4mm 0; border: .2mm solid #e2dacb; border-radius: 1mm; overflow: hidden; }
.seq-row { display: grid; grid-template-columns: 24mm 1fr 24mm; gap: 3mm; padding: 2mm 3mm; border-bottom: .2mm solid #eee6d8; font-family: "Cascadia Code", monospace; font-size: 6.8pt; color: #5d5a52; }
.seq-row:last-child { border-bottom: none; }
.seq-row span:first-child, .seq-row span:last-child { color: #a06a1f; }
.seq-row span:nth-child(2) { color: #34363b; }
.formula { border: .2mm solid #d9c9a9; background: #f8f2e6; border-radius: 1.5mm; padding: 4mm 5mm; margin: 4mm 0; }
.formula-title { font-family: "Cascadia Code", monospace; font-size: 6.8pt; letter-spacing: .14em; color: #a06a1f; margin-bottom: 2mm; }
.formula-body { font-family: "Cambria Math", "Songti SC", serif; font-size: 10pt; color: #34260f; line-height: 1.9; }
.formula-note { font-size: 6.6pt; color: #8a7a60; margin-top: 1.5mm; }
.frac { display: inline-flex; flex-direction: column; vertical-align: middle; text-align: center; font-size: 8.5pt; }
.frac i { font-style: italic; border-bottom: .2mm solid #6b5128; padding: 0 1mm; line-height: 1.3; }
.frac i:last-child { border-bottom: none; }
.diff { border-radius: 1mm; overflow: hidden; margin: 2mm 0 3mm; font-family: "Cascadia Code", monospace; font-size: 7pt; }
.diff > div { padding: 1.6mm 3mm; }
.diff .del { background: #f6e3df; color: #9e3f34; }
.diff .add { background: #e8f1e6; color: #3f6b3f; }
.checks { margin: 2mm 0 3mm 4mm; padding: 0; }
.checks li { font-size: 7.8pt; line-height: 1.75; color: #44474e; margin-bottom: 1.2mm; }
.token-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 3mm; margin: 4mm 0; }
.token-grid > div { display: flex; flex-direction: column; gap: 1mm; }
.token-grid i { height: 10mm; border-radius: 1mm; border: .2mm solid rgba(0,0,0,.08); display: block; }
.token-grid b { font-size: 7.2pt; }
.token-grid span { font-family: "Cascadia Code", monospace; font-size: 6.2pt; color: #8a8479; }
.eval td { font-size: 7.2pt; }
.road { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; margin: 4mm 0; }
.road > div { border-left: .6mm solid #e8b45a; padding: 2mm 3mm; background: #f8f3e8; }
.road b { display: block; font-family: "Cascadia Code", monospace; font-size: 8pt; color: #a06a1f; }
.road span { font-size: 6.8pt; color: #5d5a52; line-height: 1.5; }
.closing { margin-top: 14mm; border-top: .3mm solid #d8cbb4; padding-top: 8mm; text-align: center; }
.closing p { font-family: "Songti SC", "SimSun", serif; font-size: 17pt; line-height: 1.8; color: #3a2a11; text-align: center; margin: 4mm 0; }
.closing span { font-family: "Cascadia Code", monospace; font-size: 6.8pt; color: #9a8f7b; letter-spacing: .1em; }
.end-mark { text-align: center; margin-top: 20mm; }
.end-mark p { font-family: "Songti SC", "SimSun", serif; font-size: 18pt; color: #3a2a11; text-align: center; margin: 4mm 0 2mm; }
.end-mark span { font-family: "Cascadia Code", monospace; font-size: 6.8pt; color: #9a8f7b; letter-spacing: .12em; }
`;

const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>答辩预演舱 · 技术文档</title><style>${css}</style></head>
<body>
${cover}
${p2}${p3}${p4}${p5}${p6}${p7}${p8}${p9}${p10}${p11}${p12}${p13}${p14}${p15}${p16}${p17}${p18}${p19}${p20}${p21}${p22}${p23}${p24}${p25}${p26}
</body></html>`;

fs.writeFileSync(path.join(root, 'docs/technical-report.html'), html, 'utf8');
console.log('wrote docs/technical-report.html', (html.length / 1024 / 1024).toFixed(1), 'MB, pages:', pageNo + 1);
