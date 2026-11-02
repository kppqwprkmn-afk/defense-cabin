import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, History, LayoutGrid, Settings2 } from 'lucide-react';

export function Shell({ children }: { children: ReactNode }) {
  const loc = useLocation();
  return (
    <div className="app-shell">
      <aside className="rail">
        <Link to="/" className="brand-mark" aria-label="答辩预演舱首页">
          <span>答</span>
        </Link>
        <div className="rail-rule" />
        <nav className="rail-nav">
          <Link to="/" className={`rail-btn ${loc.pathname === '/' ? 'on' : ''}`} title="演练台">
            <LayoutGrid size={18} />
          </Link>
          <button className="rail-btn" title="历史记录（即将上线）" disabled>
            <History size={18} />
          </button>
          <button className="rail-btn" title="方法手册（见 README）" disabled>
            <BookOpen size={18} />
          </button>
        </nav>
        <div className="rail-foot">
          <button className="rail-btn" title="设置（环境变量）" disabled>
            <Settings2 size={18} />
          </button>
          <div className="rail-version">v1.0</div>
        </div>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
