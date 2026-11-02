import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  CircleAlert,
  Download,
  FileText,
  Gauge,
  Loader2,
  Play,
  Radar as RadarIcon,
  Square,
  Timer,
  Zap,
} from 'lucide-react';
import {
  ISSUE_LABELS,
  PERSONAS,
  type Claim,
  type DimensionScore,
  type Project,
  type Revision,
  type RiskItem,
  type Session,
  type StreamEvent,
  type Turn,
} from '@cabin/shared';
import { api, connectStream } from '../api';
import { Avatar } from '../components/Avatar';
import { Radar } from '../components/Radar';
import { ScoreRing } from '../components/ScoreRing';

interface ReportState {
  scores: DimensionScore[];
  risks: RiskItem[];
  revisions: Revision[];
  summary: string;
  overall: number;
}

const KIND_LABEL: Record<string, string> = {
  opening: '开场',
  question: '主问',
  followup: '追问',
  answer: '应答',
  verdict: '裁决',
  summary: '收束',
};

export default function SessionRoom() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [session, setSession] = useState<Session | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [status, setStatus] = useState<Session['status']>('ready');
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<ReportState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [speed, setSpeed] = useState(1.6);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [openCitation, setOpenCitation] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .session(id)
      .then(({ session: s, project: p }) => {
        setSession(s);
        setProject(p);
        setTurns(s.turns);
        setStatus(s.status);
        setProgress(s.progress);
        setSelectedClaim(p.claims[0] ?? null);
        if (s.status === 'completed') {
          setReport({
            scores: s.scores,
            risks: s.risks,
            revisions: s.revisions,
            summary: s.summary,
            overall: s.overall,
          });
          if (s.turns.length > 1) {
            const start = new Date(s.turns[0].createdAt).getTime();
            const end = new Date(s.turns[s.turns.length - 1].createdAt).getTime();
            setElapsed(Math.max(0, Math.round((end - start) / 1000)));
          }
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false));
  }, [id]);

  const begin = async (auto = false) => {
    if (!session) return;
    setStarting(true);
    setError('');
    startedAt.current = Date.now();
    try {
      await api.start(session.id, speed);
      setStatus('running');
      setTurns([]);
      setReport(null);
      setProgress(0);
      if (!auto) stick.current = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : '启动失败';
      if (msg.includes('409')) setStatus('running');
      else setError(msg);
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    if (status !== 'running' || !id) return;
    if (!startedAt.current) startedAt.current = Date.now();
    const es = connectStream(id, (event: StreamEvent) => {
      if (event.type === 'turn:start') {
        setTurns((prev) => (prev.some((t) => t.id === event.turn.id) ? prev : [...prev, event.turn]));
      } else if (event.type === 'turn:delta') {
        setTurns((prev) =>
          prev.map((t) => (t.id === event.id ? { ...t, text: t.text + event.delta } : t)),
        );
      } else if (event.type === 'turn:end') {
        setTurns((prev) => {
          const exists = prev.some((t) => t.id === event.turn.id);
          return exists
            ? prev.map((t) => (t.id === event.turn.id ? event.turn : t))
            : [...prev, event.turn];
        });
      } else if (event.type === 'status') {
        setStatus(event.status);
        setProgress(event.progress);
      } else if (event.type === 'report') {
        setReport(event);
      } else if (event.type === 'done') {
        setStatus('completed');
        setProgress(100);
      } else if (event.type === 'error') {
        setError(event.message);
      }
    });
    return () => es.close();
  }, [id, status]);

  useEffect(() => {
    if (status !== 'running') return;
    const t = setInterval(() => {
      if (startedAt.current) setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [status]);

  useEffect(() => {
    if (params.get('auto') === '1' && status === 'ready' && session) void begin(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session]);

  useEffect(() => {
    if (!stick.current) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns]);

  const activeClaimId = useMemo(() => [...turns].reverse().find((t) => t.claimId)?.claimId, [turns]);
  const liveRisk = useMemo(() => turns.filter((t) => t.risk === 'high').length, [turns]);
  const isDone = status === 'completed';
  const currentPersona = useMemo(() => {
    const last = [...turns].reverse().find((t) => t.kind === 'question' || t.kind === 'followup');
    return last ? PERSONAS[last.persona] : null;
  }, [turns]);

  if (loading) {
    return (
      <div className="center-screen">
        <Loader2 className="spin" size={26} />
        <span>正在进入质询舱…</span>
      </div>
    );
  }
  if (!session || !project) {
    return (
      <div className="center-screen">
        <CircleAlert size={26} />
        <span>{error || '演练不存在'}</span>
        <Link to="/" className="text-link">
          返回演练台
        </Link>
      </div>
    );
  }

  return (
    <div className="room">
      <header className="room-top">
        <div className="room-left">
          <Link to="/" className="icon-btn" aria-label="返回">
            <ArrowLeft size={17} />
          </Link>
          <div className="room-title">
            <div className="room-project">{project.name}</div>
            <div className="room-sub">
              <span className="track-tag">{project.track}</span>
              <span>·</span>
              <span>{session.intensity}模式</span>
              <span>·</span>
              <span>材料 {project.materialNames.length} 份</span>
            </div>
          </div>
        </div>
        <div className="room-status">
          {status === 'running' && (
            <span className="live-badge big">
              <i /> LIVE · {currentPersona ? `${currentPersona.name}正在追问` : '评审入场'}
            </span>
          )}
          {isDone && <span className="done-badge">裁决完成</span>}
          {status === 'ready' && <span className="ready-badge">待开始</span>}
          <span className="room-time">
            <Timer size={14} />
            {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
          </span>
          {isDone ? (
            <button className="btn btn-primary btn-sm" onClick={() => nav(`/report/${session.id}`)}>
              <FileText size={15} /> 查看报告
            </button>
          ) : (
            <button className="btn btn-ghost btn-sm" onClick={() => nav(`/report/${session.id}`)} disabled={!report}>
              <Download size={15} /> 导出
            </button>
          )}
        </div>
      </header>

      {error && <div className="banner-error room-error">{error}</div>}

      <div className="room-grid">
        <aside className="panel panel-left">
          <div className="panel-heading">
            <span>材料与论点</span>
            <b>{project.health.score}</b>
          </div>
          <div className="health-block">
            <div className="health-ring" style={{ ['--hp' as string]: `${project.health.score * 3.6}deg` }}>
              <div>
                <strong>{project.health.score}</strong>
                <span>体检分</span>
              </div>
            </div>
            <div className="health-meta">
              <div>
                <b>{project.claims.length}</b> 个可质询论点
              </div>
              <div>
                <b>{project.health.strongRatio}%</b> 强证据占比
              </div>
              <div>
                <b>{project.health.totalChars}</b> 字 · {project.health.chunkCount} 段
              </div>
            </div>
          </div>

          <div className="coverage-grid">
            {project.health.coverage.map((c) => (
              <span key={c.key} className={c.ok ? 'ok' : 'miss'} title={c.note}>
                {c.ok ? '✓' : '×'} {c.label}
              </span>
            ))}
          </div>

          <div className="panel-subhead">
            <span>论点清单</span>
            <small>按质询优先级</small>
          </div>
          <div className="claim-list">
            {project.claims.map((claim, i) => (
              <button
                key={claim.id}
                className={`claim-item ${selectedClaim?.id === claim.id ? 'sel' : ''} ${
                  activeClaimId === claim.id ? 'active' : ''
                }`}
                onClick={() => setSelectedClaim(claim)}
              >
                <span className={`strength-dot ${claim.strength}`} />
                <span className="claim-index">{String(i + 1).padStart(2, '0')}</span>
                <span className="claim-text">{claim.text}</span>
                {claim.issues.filter((x) => x !== 'none').length > 0 && (
                  <span className="claim-flag">{claim.issues.filter((x) => x !== 'none').length}</span>
                )}
              </button>
            ))}
          </div>

          {selectedClaim && (
            <div className="claim-detail">
              <div className="claim-detail-head">
                <span className={`kind-tag k-${selectedClaim.kind}`}>{selectedClaim.kind}</span>
                <span className={`strength-tag ${selectedClaim.strength}`}>
                  {selectedClaim.strength === 'strong' ? '强证据' : selectedClaim.strength === 'medium' ? '中证据' : '弱证据'}
                </span>
              </div>
              <p>{selectedClaim.text}</p>
              <div className="issue-tags">
                {selectedClaim.issues
                  .filter((x) => x !== 'none')
                  .map((x) => (
                    <span key={x}>{ISSUE_LABELS[x]}</span>
                  ))}
                {selectedClaim.issues.every((x) => x === 'none') && <span className="good">未发现明显缺口</span>}
              </div>
            </div>
          )}
        </aside>

        <main className="transcript-wrap">
          {status === 'ready' && turns.length === 0 ? (
            <div className="preflight">
              <div className="preflight-ring">
                <div className="preflight-core">舱</div>
                <span className="ring r1" />
                <span className="ring r2" />
              </div>
              <div className="eyebrow">READY TO CHALLENGE</div>
              <h1>质询舱已就绪</h1>
              <p>
                材料解析完成，三位评审已读完 <b>{project.health.totalChars}</b> 字申报书，
                锁定 <b>{project.claims.length}</b> 个可质询论点。
              </p>
              <div className="preflight-roster">
                {(['method', 'industry', 'judge'] as const).map((pid) => (
                  <div key={pid}>
                    <Avatar id={pid} size={38} />
                    <span>
                      <b>{PERSONAS[pid].name}</b>
                      <small>{PERSONAS[pid].title}</small>
                    </span>
                  </div>
                ))}
              </div>
              <div className="speed-row">
                <span>演示速度</span>
                {[1, 1.6, 2.4].map((s) => (
                  <button key={s} className={speed === s ? 'on' : ''} onClick={() => setSpeed(s)}>
                    {s}×
                  </button>
                ))}
              </div>
              <button className="btn btn-primary btn-xl" onClick={() => begin()} disabled={starting}>
                {starting ? <Loader2 size={18} className="spin" /> : <Play size={18} />}
                {starting ? '评审入场中…' : '开始交叉质询'}
              </button>
              <div className="preflight-note">预计 3–5 分钟 · 全程可暂停回放（刷新不丢记录）</div>
            </div>
          ) : (
            <>
              <div
                className="transcript"
                ref={scrollRef}
                onWheel={(e) => {
                  if (e.deltaY < 0) stick.current = false;
                }}
                onTouchMove={() => {
                  stick.current = false;
                }}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  if (el.scrollHeight - el.scrollTop - el.clientHeight < 40) stick.current = true;
                }}
              >
                {turns.map((turn, idx) => {
                  const prev = turns[idx - 1];
                  const newRound = turn.round > 0 && (!prev || prev.round !== turn.round);
                  return (
                    <div key={turn.id}>
                      {newRound && (
                        <div className="round-divider">
                          <span>第 {turn.round} 轮</span>
                          <i />
                          <small>{turn.round === 1 ? '方法与证据' : turn.round === 2 ? '场景与成本' : turn.round === 3 ? '原创与复现' : turn.round === 4 ? '样本与泛化' : turn.round === 5 ? '合规与承诺' : '独立裁决'}</small>
                        </div>
                      )}
                      {turn.kind === 'system' ? (
                        <div className="system-line">
                          <Zap size={12} />
                          <span>{turn.text}</span>
                        </div>
                      ) : (
                        <TurnBubble
                          turn={turn}
                          openCitation={openCitation}
                          setOpenCitation={setOpenCitation}
                        />
                      )}
                    </div>
                  );
                })}
                {status === 'running' && (
                  <div className="thinking-row">
                    <span className="thinking-dots">
                      <i />
                      <i />
                      <i />
                    </span>
                    {currentPersona ? `${currentPersona.name}正在组织下一刀…` : '评审正在读材料…'}
                  </div>
                )}
                {isDone && report && (
                  <div className="verdict-card">
                    <div className="verdict-head">
                      <span className="eyebrow">VERDICT</span>
                      <b>本轮裁决完成</b>
                    </div>
                    <div className="verdict-body">
                      <ScoreRing value={report.overall} size={104} stroke={6} />
                      <div>
                        <h3>{report.summary}</h3>
                        <div className="verdict-tags">
                          {report.risks.slice(0, 3).map((r) => (
                            <span key={r.id} className={`risk-chip ${r.level}`}>
                              {r.level === 'high' ? '高风险' : r.level === 'medium' ? '中风险' : '低风险'} · {r.title}
                            </span>
                          ))}
                        </div>
                        <button className="btn btn-primary" onClick={() => nav(`/report/${session.id}`)}>
                          打开完整报告 <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="room-control">
                <div className="control-progress">
                  <div className="bar">
                    <span style={{ width: `${isDone ? 100 : progress}%` }} />
                  </div>
                  <span>
                    {isDone ? '裁决完成' : `质询进度 ${progress}%`} · 已质询{' '}
                    {new Set(turns.filter((t) => t.claimId).map((t) => t.claimId)).size} 个论点
                  </span>
                </div>
                <div className="control-right">
                  {status === 'running' ? (
                    <span className="streaming-note">
                      <span className="live-dot" /> 流式输出中
                    </span>
                  ) : isDone ? (
                    <button className="btn btn-primary btn-sm" onClick={() => nav(`/report/${session.id}`)}>
                      查看报告 <ChevronRight size={15} />
                    </button>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </main>

        <aside className="panel panel-right">
          <div className="panel-heading">
            <span>
              <RadarIcon size={14} /> 风险雷达
            </span>
            <b className={liveRisk ? 'risk-num' : ''}>{liveRisk ? `${liveRisk} 高危` : '待裁决'}</b>
          </div>
          <div className="radar-box">
            <Radar scores={report?.scores ?? []} size={248} />
            <div className="radar-legend">
              <span>
                <i className="legend-fill" /> 本轮得分
              </span>
              <span>
                <i className="legend-dash" /> 基准线 72
              </span>
            </div>
          </div>

          <div className="panel-subhead">
            <span>风险信号</span>
            <small>{report ? `${report.risks.length} 条` : '实时累积'}</small>
          </div>
          <div className="risk-list">
            {report?.risks.slice(0, 4).map((r) => (
              <div className={`risk-item ${r.level}`} key={r.id}>
                <span className="risk-level">{r.level === 'high' ? 'H' : r.level === 'medium' ? 'M' : 'L'}</span>
                <div>
                  <strong>{r.title}</strong>
                  <small>{r.dimension}</small>
                </div>
              </div>
            ))}
            {!report &&
              [0, 1, 2].map((i) => (
                <div className="risk-skeleton" key={i} style={{ opacity: 1 - i * 0.25 }}>
                  <span />
                  <div>
                    <i />
                    <i />
                  </div>
                </div>
              ))}
            {report && report.risks.length === 0 && <div className="risk-empty">本轮未发现结构性风险</div>}
          </div>

          <div className="panel-subhead">
            <span>修改清单</span>
            <small>{report ? `${report.revisions.filter((r) => r.priority === 'P0').length} 个 P0` : '裁决后生成'}</small>
          </div>
          <div className="revision-mini">
            {report?.revisions.slice(0, 3).map((r) => (
              <div key={r.id}>
                <b className={r.priority}>{r.priority}</b>
                <span>{r.title}</span>
              </div>
            ))}
            {!report && <div className="revision-empty">完成质询后，按优先级生成可执行清单。</div>}
          </div>

          <div className="panel-foot-note">
            <Gauge size={13} />
            所有结论均可回放到材料原文
          </div>
        </aside>
      </div>
    </div>
  );
}

function TurnBubble({
  turn,
  openCitation,
  setOpenCitation,
}: {
  turn: Turn;
  openCitation: string | null;
  setOpenCitation: (id: string | null) => void;
}) {
  const p = PERSONAS[turn.persona];
  const isPresenter = turn.persona === 'presenter';
  const isOpen = openCitation === turn.id;
  const cite = turn.citations[0];
  return (
    <div className={`turn ${isPresenter ? 'presenter' : ''} ${turn.risk === 'high' ? 'hot' : ''}`}>
      <div className="turn-avatar">
        <Avatar id={turn.persona} size={38} live={turn.kind === 'question' || turn.kind === 'followup'} />
      </div>
      <div className="turn-main">
        <div className="turn-head">
          <strong>{p.name}</strong>
          <span>{p.title}</span>
          {KIND_LABEL[turn.kind] && <em className={`kind ${turn.kind}`}>{KIND_LABEL[turn.kind]}</em>}
          {turn.risk === 'high' && (
            <em className="risk-tag">
              <CircleAlert size={11} /> 高风险信号
            </em>
          )}
        </div>
        <div className="turn-bubble">
          <p>{turn.text}</p>
          {turn.citations.length > 0 && (
            <button
              className="cite-chip"
              onClick={() => setOpenCitation(isOpen ? null : turn.id)}
              title={cite?.snippet}
            >
              <FileText size={11} />
              证据 · {cite?.section ?? '材料原文'}
              <span>{turn.citations.length}</span>
            </button>
          )}
          {isOpen && cite && (
            <div className="cite-pop">
              <div className="cite-pop-head">
                <span>MATERIAL EVIDENCE</span>
                <b>{cite.section}</b>
              </div>
              <p>{cite.snippet}</p>
              <small>BM25 相关度 {cite.score.toFixed(2)} · 段落 {cite.chunkId}</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
