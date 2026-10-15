import { useSearchParams } from 'react-router-dom';
import { PageIntro } from '../../components/PublicUI';
import { roadmap } from '../../config/roadmap';

export function Roadmap() {
  const [params,setParams] = useSearchParams();
  const raw = Number(params.get('year') ?? 0);
  const selected = Number.isInteger(raw) && raw >= 0 && raw < roadmap.length ? raw : 0;
  const year = roadmap[selected];
  return <><PageIntro title="三年，循序渐进。" description="2026.10.01 — 2029.09.30 · 从基础到实践，再到整合。公开路线只呈现目标与验收方向。"/><p className="example-notice">公开规划示例 · 以下是可编辑的目标建议，不代表当前进度或完成承诺。</p><div className="roadmap-tabs" role="group" aria-label="选择规划年度">{roadmap.map((y,i) => <button key={y.label} aria-pressed={selected===i} onClick={() => setParams({year:String(i)})}><span>{y.label}</span><strong>{y.title}</strong></button>)}</div><section className="year-detail" aria-live="polite"><div className="year-heading"><span>{year.period}</span><h2>{year.title}</h2><p>{year.summary}</p></div><ol className="quarter-list">{year.quarters.map((q,i) => <li key={q.period}><span className="quarter-index">Q{i+1}</span><div><span className="muted">{q.period}</span><h3>{q.title}</h3><p>{q.evidence}</p></div></li>)}</ol></section><aside className="principle-block"><h2>留出调整的空间。</h2><p>每季度选择 1–2 个突破重点，其余能力持续提升、实践维持或阶段暂缓。目标是否达成，应由可验证的成果决定。</p></aside></>;
}
