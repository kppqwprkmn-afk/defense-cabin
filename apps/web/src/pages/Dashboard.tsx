import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  ChevronRight,
  CircleDot,
  Loader2,
  Play,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { PERSONAS, type PersonaId, type SessionMeta } from '@cabin/shared';
import { api, formatDate, type Stats } from '../api';
import { Avatar } from '../components/Avatar';
import { Shell } from '../components/Shell';
import { NewProjectModal } from '../components/NewProjectModal';

const REVIEWERS: PersonaId[] = ['method', 'industry', 'judge'];

export default function Dashboard() {
  const nav = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoBusy, setDemoBusy] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.stats(), api.sessions()])
      .then(([s, list]) => {
        setStats(s);
        setSessions(list);
      })
      .catch((e) => setError(e instanceof Error ? e.message : '加载失败'))
      .finally(() => setLoading(false));
  }, []);

  const startDemo = async () => {
    setDemoBusy(true);
    setError('');
    try {
      const { sessionId } = await api.createDemo('高压', 1.6);
      nav(`/session/${sessionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '示例启动失败');
      setDemoBusy(false);
    }
  };

  return (
    <Shell>
      <div className="topbar">
        <div className="topbar-brand">
          <span className="brand-cn">答辩预演舱</span>
          <span className="brand-en">DEFENSE CABIN</span>
        </div>
        <div className="topbar-right">
          <span className="env-pill">
            <i />
            离线确定性引擎 · v1.0
          </span>
          <span className="topbar-note">多智能体交叉质询系统</span>
        </div>
      </div>

      <div className="page">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="pulse-dot" />
              MULTI-AGENT DEFENSE SIMULATOR
            </div>
            <h1>
              先被问倒，
              <br />
              <em>再上战场。</em>
            </h1>
            <p className="lede">
              上传申报书，三位 AI 评审将在几分钟内完成交叉质询。
              <br />
              每一个追问都指向材料原文，每一条风险都能落到修改动作。
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-lg" onClick={() => setShowModal(true)}>
                <Sparkles size={17} />
                新建一场演练
              </button>
              <button className="btn btn-ghost btn-lg" onClick={startDemo} disabled={demoBusy}>
                {demoBusy ? <Loader2 size={17} className="spin" /> : <Play size={17} />}
                {demoBusy ? '正在载入…' : '载入示例项目'}
              </button>
            </div>
            <div className="hero-stats">
              <div>
                <strong>{stats?.completedCount ?? 0}</strong>
                <span>完成演练</span>
              </div>
              <div>
                <strong>{stats?.riskCount ?? 0}</strong>
                <span>累计暴露风险</span>
              </div>
              <div>
                <strong>{stats?.avgScore || '—'}</strong>
                <span>平均得分</span>
              </div>
              <div className="hero-stats-note">
                <CircleDot size={13} />
                数据仅存本机
              </div>
            </div>
          </div>

          <div className="roster-panel">
            <div className="orbit orbit-a" />
            <div className="orbit orbit-b" />
            <div className="roster-head">
              <span>评审席</span>
              <b className="live-badge">
                <i />
                IN SESSION
              </b>
            </div>
            <div className="roster-list">
              {REVIEWERS.map((id, i) => {
                const p = PERSONAS[id];
                return (
                  <div className="roster-row" key={id} style={{ animationDelay: `${i * 90}ms` }}>
                    <Avatar id={id} size={46} live />
                    <div className="roster-meta">
                      <strong>
                        {p.name}
                        <span>{p.title}</span>
                      </strong>
                      <small>{p.focus}</small>
                    </div>
                    <span className="ready-tag">已就位</span>
                  </div>
                );
              })}
            </div>
            <div className="roster-host">
              <Avatar id="host" size={28} />
              <span>
                主持人 <b>闻野</b> 控场 · 答辩人 <b>林澈</b> 由你的材料驱动
              </span>
            </div>
            <div className="roster-foot">
              <ShieldCheck size={14} />
              证据链贯穿每一次追问
            </div>
          </div>
        </section>

        {error && <div className="banner-error">{error}</div>}

        <div className="cap-strip">
          {['基线对照', '样本代表性', '因果归因', '成本与壁垒', '复现闭环'].map((t) => (
            <span key={t}>
              <i />
              {t}
            </span>
          ))}
          <b>本轮质询维度</b>
        </div>

        <section className="section">
          <div className="section-head">
            <div>
              <div className="eyebrow">RECENT SESSIONS</div>
              <h2>最近演练</h2>
            </div>
            <span className="section-count">{sessions.length ? `${sessions.length} 场记录` : '等待第一场'}</span>
          </div>

          {loading ? (
            <div className="empty-card">
              <Loader2 className="spin" size={20} /> 正在读取本地数据…
            </div>
          ) : sessions.length === 0 ? (
            <div className="empty-card empty-hero">
              <div className="empty-glyph">舱</div>
              <div>
                <h3>质询舱还是空的</h3>
                <p>先用示例项目跑一场，看看三位评审会从哪里下刀。</p>
                <button className="text-link" onClick={startDemo}>
                  载入示例并开始 <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="session-grid">
              {sessions.slice(0, 3).map((s) => (
                <Link
                  to={s.status === 'completed' ? `/report/${s.id}` : `/session/${s.id}`}
                  className="session-card"
                  key={s.id}
                >
                  <div className="session-top">
                    <span className="track-tag">{s.track}</span>
                    <span className={`status-dot ${s.status}`}>
                      {s.status === 'completed' ? '已裁决' : s.status === 'running' ? '质询中' : '待开始'}
                    </span>
                  </div>
                  <h3>{s.projectName}</h3>
                  <p>{s.topRisk}</p>
                  <div className="session-foot">
                    <div className="mini-score">
                      <strong>{s.overall || '—'}</strong>
                      <span>综合分</span>
                    </div>
                    <span className="session-time">{formatDate(s.createdAt)}</span>
                    <ArrowUpRight size={15} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="section">
          <div className="section-head">
            <div>
              <div className="eyebrow">THE PANEL</div>
              <h2>三位评审，三种下刀方式</h2>
            </div>
            <span className="section-count">
              <Users size={13} /> 固定评审团
            </span>
          </div>
          <div className="persona-grid">
            {REVIEWERS.map((id) => {
              const p = PERSONAS[id];
              return (
                <div className="persona-card" key={id} style={{ ['--pc' as string]: p.color }}>
                  <Avatar id={id} size={42} />
                  <div className="persona-head">
                    <strong>{p.name}</strong>
                    <span>{p.title}</span>
                  </div>
                  <p>{p.bio}</p>
                  <div className="persona-focus">{p.focus}</div>
                </div>
              );
            })}
          </div>
        </section>

        <footer className="page-foot">
          <span>答辩预演舱 · Defense Cabin</span>
          <Link to="/making-of" className="foot-link">
            研发现场 · 可复现的 AI 协作链路 ↗
          </Link>
          <span>AI 生成内容仅供演练，不替代真实评审意见</span>
        </footer>
      </div>

      {showModal && <NewProjectModal onClose={() => setShowModal(false)} />}
    </Shell>
  );
}
