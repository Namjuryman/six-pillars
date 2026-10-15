import { Link } from 'react-router-dom';
import { Arrow, PillarIcon } from './Visuals';
import { getPillar, pillars } from '../config/pillars';
import type { Pillar, PublicExample } from '../types/content';

export function SectionTitle({ title, note }: { title: string; note?: string }) {
  return <div className="section-title"><h2>{title}</h2><span className="rule" />{note && <p>{note}</p>}</div>;
}
export function PageIntro({ title, description }: { title: string; description: string }) {
  return <header className="page-intro"><h1>{title}</h1><p>{description}</p></header>;
}
export function PillarRow({ pillar, index }: { pillar: Pillar; index: number }) {
  return <Link to={`/pillars/${pillar.key}`} className="pillar-row"><PillarIcon name={pillar.key}/><span className="index">{String(index+1).padStart(2,'0')}</span><div><h3>{pillar.name}</h3><p>{pillar.description}</p></div><Arrow/></Link>;
}
export function PillarList() { return <div className="pillar-grid">{pillars.map((p,i) => <PillarRow key={p.key} pillar={p} index={i}/>)}</div>; }
export function ExampleNotice() { return <p className="example-notice">示例内容 · 以下作品、文章与计划用于展示结构，不代表已完成的个人成果。</p>; }
export function EntryCard({ entry }: { entry: PublicExample }) {
  const path = entry.kind === 'article' ? 'writing' : 'projects';
  return <Link className="entry-card" to={`/${path}/${entry.slug}`}>
    <img src={`${import.meta.env.BASE_URL}images/${entry.kind === 'project' ? 'circuit' : 'notebook'}.png`} alt="" loading="lazy" width="300" height="200"/>
    <div><div className="entry-meta"><span>{entry.kind === 'project' ? '作品' : '文章'} · 示例</span><span>{getPillar(entry.pillar)?.name}</span></div><h3>{entry.title}<Arrow/></h3><p>{entry.summary}</p></div>
  </Link>;
}
