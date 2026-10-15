import { Link } from 'react-router-dom';
import { Arrow, PillarDrawing } from '../../components/Visuals';
import { EntryCard, PillarList, SectionTitle } from '../../components/PublicUI';
import { roadmap } from '../../config/roadmap';
import { examples } from './content';

export function Home() {
  return <>
    <section className="hero"><div className="hero-copy"><h1>把成长，<br/>做成一件长期的事。</h1><p>六项独立能力，一条三年主线。<br/>在真实实践中积累，用可验证的成果回看。</p><div className="hero-actions"><Link className="button" to="/pillars">探索六大能力<Arrow/></Link><Link className="text-link" to="/roadmap">查看三年路线<Arrow/></Link></div></div><PillarDrawing/></section>
    <section className="pillars-section"><SectionTitle title="六个方向，各自生长。" note="不同的能力，相互支撑，在实践中形成复合的成长。"/><PillarList/></section>
    <section className="roadmap-band"><SectionTitle title="三年，循序渐进。" note="从基础到实践，再到整合，形成可持续的能力闭环。"/><div className="year-grid">{roadmap.map((year,i) => <Link key={year.label} to={`/roadmap?year=${i}`} className="year-preview"><span className="year-symbol" aria-hidden="true">{['↟','↗','⚑'][i]}</span><div><span className="year-label">{year.label}</span><h3>{year.title}</h3><p>{year.summary}</p></div><Arrow/></Link>)}</div><p className="band-note">公开规划示例 · 2026.10.01 — 2029.09.30</p></section>
    <section className="latest-section"><SectionTitle title="最新内容 · 示例" note="记录思考、实践与成长的过程。"/><div className="entry-grid"><EntryCard entry={examples[0]}/><EntryCard entry={examples[2]}/></div></section>
  </>;
}
