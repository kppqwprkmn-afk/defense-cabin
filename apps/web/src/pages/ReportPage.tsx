import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  FileText,
  Flag,
  Loader2,
  Printer,
  RotateCcw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type { Project, Session, Turn } from '@cabin/shared';
import { PERSONAS } from '@cabin/shared';
import { api } from '../api';
import { Avatar } from '../components/Avatar';
import { Radar } from '../components/Radar';
import { ScoreRing } from '../components/ScoreRing';

export default function ReportPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'high'>('all');
  const [done, setDone] = useState<Set<string>>(new Set());
  const [openRound, setOpenRound] = useState<number | null>(null);
  const [retryBusy, setRetryBusy] = useState(false);

  useEffect(() => {
    api
      .session(id)
      .then(({ session: s, project: p }) => {
        setSession(s);
        setProject(p);
      })
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false));
  }, [id]);

  const retry = async () => {
    if (!project) return;
    setRetryBusy(true);
    try {
      const s = await api.createSession(project.id, '高压', 1.6);
      nav(`/session/${s.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建失败');
      setRetryBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="center-screen">
        <Loader2 className="spin" size={26} /> <span>正在生成报告…</span>
      </div>
    );
  }
  if (!session || !project) {
    return (
      <div className="center-screen">
        <ShieldAlert size={26} /> <span>{error || '报告不存在'}</span>
        <Link to="/" className="text-link">返回演练台</Link>
      </div>
    );
  }
  if (session.status !== 'completed') {
    return (
      <div className="center-screen">
        <ShieldAlert size={26} />
        <span>这场演练还没有完成裁决</span>
        <Link to={`/session/${session.id}`} className="btn btn-primary">
          回到质询舱
        </Link>
      </div>
    );
  }

  const risks = filter === 'high' ? session.risks.filter((r) => r.level === 'high') : session.risks;
  const rounds = [...new Set(session.turns.filter((t) => t.round > 0).map((t) => t.round))];
  const p0 = session.revisions.filter((r) => r.priority === 'P0');
  const highCount = session.risks.filter((r) => r.level === 'high').length;

  return (
    <div className="report-page">
      <header className="report-top no-print">
        <div className="room-left">
          <button className="icon-btn" onClick={() => nav(`/session/${session.id}`)} aria-label="返回质询舱">
            <ArrowLeft size={17} />
          </button>
          <div className="room-title">
            <div className="room-project">演练报告</div>
            <div className="room-sub">
              编号 {session.id.toUpperCase()} · {project.track}
            </div>
          </div>
        </div>
        <div className="report-actions">
          <a className="btn btn-ghost btn-sm" href={`/api/sessions/${session.id}/report.md`}>
            <Download size={15} /> Markdown
          </a>
          <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
            <Printer size={15} /> 打印 / PDF
          </button>
          <button className="btn btn-primary btn-sm" onClick={retry} disabled={retryBusy}>
            {retryBusy ? <Loader2 size={15} className="spin" /> : <RotateCcw size={15} />}
            再练一次
          </button>
        </div>
      </header>

      <div className="report-wrap">
        <section className="report-hero">
          <div className="report-hero-copy">
            <div className="eyebrow">
              <span className="pulse-dot" /> AFTER ACTION REVIEW · 答辩预演报告
            </div>
            <h1>{project.name}</h1>
            <p className="report-summary">{session.summary}</p>
            <div className="report-meta">
              <span>{project.team}</span>
              <span>{session.intensity}模式</span>
              <span>{session.turns.length} 轮对话</span>
              <span>{highCount} 条高风险</span>
            </div>
          </div>
          <div className="report-score">
            <ScoreRing value={session.overall} size={168} stroke={8} />
            <div className="report-score-note">
              <span>综合得分</span>
              <b>{session.overall >= 80 ? '可以上场' : session.overall >= 70 ? '建议补证后再练' : '需要重做论证'}</b>
            </div>
          </div>
        </section>

        <section className="report-grid">
          <div className="report-main">
            <div className="card radar-card">
              <div className="card-head">
                <div>
                  <div className="eyebrow">RISK RADAR</div>
                  <h2>五维风险雷达</h2>
                </div>
                <span className="card-note">基准 72 · 实线为本轮</span>
              </div>
              <div className="radar-full">
                <Radar scores={session.scores} size={360} />
                <div className="dim-list">
                  {session.scores.map((s) => (
                    <div className="dim-row" key={s.key}>
                      <div className="dim-label">
                        <span>{s.label}</span>
                        <b>{s.score}</b>
                      </div>
                      <div className="dim-bar">
                        <i style={{ width: `${s.score}%` }} className={s.score >= 80 ? 'good' : s.score >= 70 ? 'mid' : 'bad'} />
                      </div>
                      <div className="dim-note">
                        <em className={s.delta >= 0 ? 'up' : 'down'}>
                          {s.delta >= 0 ? '+' : ''}
                          {s.delta}
                        </em>
                        {s.note}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div>
                  <div className="eyebrow">RISK REGISTER</div>
                  <h2>风险清单</h2>
                </div>
                <div className="filter-tabs no-print">
                  <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>
                    全部 {session.risks.length}
                  </button>
                  <button className={filter === 'high' ? 'on' : ''} onClick={() => setFilter('high')}>
                    仅高风险 {highCount}
                  </button>
                </div>
              </div>
              <div className="risk-cards">
                {risks.map((r) => (
                  <div className={`risk-card ${r.level}`} key={r.id}>
                    <div className="risk-card-top">
                      <span className={`risk-badge ${r.level}`}>
                        {r.level === 'high' ? 'HIGH' : r.level === 'medium' ? 'MED' : 'LOW'}
                      </span>
                      <strong>{r.title}</strong>
                      <span className="risk-dim">{r.dimension}</span>
                    </div>
                    <p>{r.detail}</p>
                    {r.claimId && <span className="risk-link">关联论点 {r.claimId.toUpperCase()}</span>}
                  </div>
                ))}
                {risks.length === 0 && <div className="risk-empty">筛选条件下没有风险项。</div>}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div>
                  <div className="eyebrow">REVISION PLAN</div>
                  <h2>修改清单</h2>
                </div>
                <span className="card-note">
                  待办 {session.revisions.length - done.size}/{session.revisions.length}
                </span>
              </div>
              <div className="revision-list">
                {session.revisions.map((r) => (
                  <div className={`revision-row ${done.has(r.id) ? 'finished' : ''}`} key={r.id}>
                    <button
                      className={`check ${done.has(r.id) ? 'on' : ''}`}
                      onClick={() => {
                        const next = new Set(done);
                        if (next.has(r.id)) next.delete(r.id);
                        else next.add(r.id);
                        setDone(next);
                      }}
                      aria-label={`标记 ${r.title}`}
                    >
                      {done.has(r.id) && <Check size={13} />}
                    </button>
                    <span className={`priority ${r.priority}`}>{r.priority}</span>
                    <div className="revision-body">
                      <strong>{r.title}</strong>
                      <p>{r.detail}</p>
                      <div className="revision-tags">
                        <span>工作量 {r.effort}</span>
                        <span>预计 +{r.gain} 分</span>
                        {r.claimId && <span>论点 {r.claimId.toUpperCase()}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div>
                  <div className="eyebrow">TRANSCRIPT</div>
                  <h2>质询实录</h2>
                </div>
                <span className="card-note">{session.turns.length} 条 · 可逐轮回看</span>
              </div>
              <div className="round-list">
                {rounds.map((round) => {
                  const roundTurns = session.turns.filter((t) => t.round === round);
                  const isOpen = openRound === round;
                  return (
                    <div className={`round-item ${isOpen ? 'open' : ''}`} key={round}>
                      <button className="round-head" onClick={() => setOpenRound(isOpen ? null : round)}>
                        <span className="round-no">R{String(round).padStart(2, '0')}</span>
                        <strong>
                          {round === 1
                            ? '方法与证据'
                            : round === 2
                              ? '场景与成本'
                              : round === 3
                                ? '原创与复现'
                                : round === 4
                                  ? '样本与泛化'
                                  : round === 5
                                    ? '合规与承诺'
                                    : '独立裁决'}
                        </strong>
                        <span>{roundTurns.length} 条</span>
                        <ChevronDown size={16} className="chev" />
                      </button>
                      {isOpen && (
                        <div className="round-body">
                          {roundTurns.map((t) => (
                            <TranscriptLine key={t.id} turn={t} />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="report-side">
            <div className="side-card">
              <div className="eyebrow">ACTION FIRST</div>
              <h3>先做这三件事</h3>
              <div className="p0-list">
                {p0.slice(0, 3).map((r, i) => (
                  <div key={r.id}>
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    <p>{r.title}</p>
                  </div>
                ))}
                {p0.length === 0 && <p className="muted">本轮没有 P0，按 P1 清单推进即可。</p>}
              </div>
            </div>
            <div className="side-card">
              <div className="eyebrow">PANEL</div>
              <h3>本场评审</h3>
              <div className="side-roster">
                {(['method', 'industry', 'judge'] as const).map((pid) => (
                  <div key={pid}>
                    <Avatar id={pid} size={34} />
                    <span>
                      <b>{PERSONAS[pid].name}</b>
                      <small>{PERSONAS[pid].title}</small>
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="side-card side-quote">
              <Sparkles size={16} />
              <p>“答辩不是把做过的事讲一遍，而是证明你的结论经得起别人换一个角度再问一次。”</p>
            </div>
            <button className="btn btn-primary btn-block no-print" onClick={retry} disabled={retryBusy}>
              {retryBusy ? <Loader2 size={16} className="spin" /> : <RotateCcw size={16} />}
              用高压模式再练一次
            </button>
            <div className="print-note no-print">
              <Flag size={13} /> 报告由答辩预演舱自动生成 · 所有引用可回放到材料段落
            </div>
          </aside>
        </section>

        <footer className="report-foot">
          <span>答辩预演舱 · Defense Cabin</span>
          <span>{new Date(session.completedAt ?? session.createdAt).toLocaleString('zh-CN')}</span>
        </footer>
      </div>
    </div>
  );
}

function TranscriptLine({ turn }: { turn: Turn }) {
  const p = PERSONAS[turn.persona];
  return (
    <div className={`t-line ${turn.persona}`}>
      <Avatar id={turn.persona} size={28} />
      <div>
        <div className="t-line-head">
          <b>{p.name}</b>
          <span>{p.title}</span>
          {turn.risk === 'high' && <em>高风险</em>}
        </div>
        <p>{turn.text}</p>
        {turn.citations[0] && (
          <div className="t-cite">
            <FileText size={11} /> {turn.citations[0].section} · {turn.citations[0].snippet}
          </div>
        )}
      </div>
    </div>
  );
}
