import { Link, useParams } from 'react-router-dom';
import { ExampleNotice, EntryCard, PageIntro, PillarList, SectionTitle } from '../../components/PublicUI';
import { PillarIcon } from '../../components/Visuals';
import { getPillar } from '../../config/pillars';
import { examples } from './content';
import { NotFound } from './UtilityPages';

export function Pillars() { return <><PageIntro title="六项独立能力，一起走向长期。" description="不强制每天完成六项任务。让每个领域保留自己的目标、培养方法与验收证据。"/><PillarList/><section className="principle-block"><h2>用成果回看，用节奏前行。</h2><p>投入可以是集中突破、持续提升、实践维持或阶段暂缓。根据真实的时间与反馈做决定，比给所有能力打统一分数更有意义。</p><Link className="text-link" to="/roadmap">查看公开三年路线 →</Link></section></>; }
export function PillarDetail() {
  const { key } = useParams();
  const pillar = getPillar(key);
  if (!pillar) return <NotFound/>;
  const entries = examples.filter(e => e.pillar === pillar.key);
  return <><Link className="back-link" to="/pillars">← 六大能力</Link><div className="detail-title"><PillarIcon name={pillar.key}/><span>{pillar.english}</span></div><PageIntro title={pillar.name} description={pillar.vision}/><div className="method-grid"><section><h2>如何培养</h2><ol>{pillar.methods.map(m => <li key={m}>{m}</li>)}</ol></section><section><h2>什么能作为成果</h2><ul>{pillar.evidence.map(e => <li key={e}>{e}</li>)}</ul><p className="muted">这里描述公开成果形式，不展示私人原始记录。</p></section></div><section className="detail-entries"><SectionTitle title="相关公开内容"/>{entries.length ? <><ExampleNotice/><div className="entry-grid">{entries.map(e => <EntryCard key={e.slug} entry={e}/>)}</div></> : <div className="empty-state"><h3>这个方向的公开成果还在准备中。</h3><p>只有经过独立撰写和审核的内容才会出现在这里。</p><Link to="/projects" className="text-link">浏览作品示例 →</Link></div>}</section></>;
}
