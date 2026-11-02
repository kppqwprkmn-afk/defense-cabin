import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Loader2, Sparkles, UploadCloud, X } from 'lucide-react';
import { TRACKS } from '@cabin/shared';
import { api } from '../api';

export function NewProjectModal({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [track, setTrack] = useState<string>(TRACKS[0]);
  const [team, setTeam] = useState('');
  const [summary, setSummary] = useState('');
  const [intensity, setIntensity] = useState<'标准' | '高压'>('标准');
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const f of Array.from(list)) {
      if (!/\.(pdf|docx|md|markdown|txt)$/i.test(f.name)) {
        setError('仅支持 PDF / DOCX / Markdown / TXT');
        continue;
      }
      if (f.size > 20 * 1024 * 1024) {
        setError(`${f.name} 超过 20MB`);
        continue;
      }
      if (!next.some((x) => x.name === f.name)) next.push(f);
    }
    setFiles(next.slice(0, 6));
    if (next.length) setError('');
  };

  const submit = async () => {
    if (name.trim().length < 2) return setError('先给项目起个名字（至少 2 个字）');
    if (!files.length) return setError('请上传至少一份项目材料');
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.set('name', name.trim());
      form.set('track', track);
      form.set('team', team.trim());
      form.set('summary', summary.trim());
      files.forEach((f) => form.append('files', f));
      const project = await api.createProject(form);
      const session = await api.createSession(project.id, intensity, 1.6);
      nav(`/session/${session.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建失败');
      setBusy(false);
    }
  };

  return (
    <div className="modal-mask" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            <div className="eyebrow">NEW REHEARSAL</div>
            <h2>新建一场答辩演练</h2>
          </div>
          <button className="icon-btn" onClick={onClose} disabled={busy} aria-label="关闭">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <label className="field">
            <span>项目名称</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：智巡校园 · 实验室安全巡检智能体"
              maxLength={80}
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>参赛赛道</span>
              <select value={track} onChange={(e) => setTrack(e.target.value)}>
                {TRACKS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>团队 / 学院（可选）</span>
              <input value={team} onChange={(e) => setTeam(e.target.value)} placeholder="计算机学院 × 安全工程学院" />
            </label>
          </div>

          <label className="field">
            <span>一句话说明（可选）</span>
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="用一句话说清楚：为谁解决什么问题"
              maxLength={300}
            />
          </label>

          <div className="field">
            <span>项目材料</span>
            <div
              className={`dropzone ${drag ? 'drag' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                addFiles(e.dataTransfer.files);
              }}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                hidden
                multiple
                accept=".pdf,.docx,.md,.markdown,.txt"
                onChange={(e) => addFiles(e.target.files)}
              />
              <UploadCloud size={26} />
              <strong>拖入申报书 / 答辩稿 / 论文</strong>
              <small>PDF · DOCX · Markdown · TXT，单文件 ≤ 20MB，最多 6 份</small>
            </div>
            {files.length > 0 && (
              <div className="file-list">
                {files.map((f) => (
                  <div className="file-pill" key={f.name}>
                    <FileText size={14} />
                    <span>{f.name}</span>
                    <b>{(f.size / 1024).toFixed(0)}KB</b>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFiles(files.filter((x) => x.name !== f.name));
                      }}
                      aria-label={`移除 ${f.name}`}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="field">
            <span>质询强度</span>
            <div className="segmented">
              {(['标准', '高压'] as const).map((v) => (
                <button key={v} className={intensity === v ? 'on' : ''} onClick={() => setIntensity(v)}>
                  {v === '标准' ? '标准 · 约 20 轮' : '高压 · 加追问'}
                  <small>{v === '标准' ? '适合首次自查' : '适合提交前压力测试'}</small>
                </button>
              ))}
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}
        </div>

        <div className="modal-foot">
          <span className="modal-hint">材料只在本地解析，不上传第三方。</span>
          <button className="btn btn-primary" onClick={submit} disabled={busy}>
            {busy ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
            {busy ? '解析材料中…' : '生成质询舱'}
          </button>
        </div>
      </div>
    </div>
  );
}
