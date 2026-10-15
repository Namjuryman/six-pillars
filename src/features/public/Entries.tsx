import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Markdown from 'react-markdown';
import { EntryCard, ExampleNotice, PageIntro } from '../../components/PublicUI';
import { pillars, getPillar } from '../../config/pillars';
import { getExample, selectExamples } from './content';
import type { PillarKey, PublicExample } from '../../types/content';
import { NotFound } from './UtilityPages';

export function Entries({ kind }: { kind: PublicExample['kind'] }) {
  const [filter,setFilter] = useState<PillarKey | 'all'>('all');
  const entries = selectExamples(kind,filter);
  return <><PageIntro title={kind==='project'?'把实践，留下可验证的成果。':'写下来，让思考有迹可循。'} description={kind==='project'?'独立呈现 IC、AI 与其他领域的公开作品，说明问题、方法、证据和限制。':'技术思考、方法总结与公开复盘。内容需要独立撰写，经过审核后公开。'}/><ExampleNotice/><div className="filters" role="group" aria-label="按能力筛选"><button onClick={() => setFilter('all')} aria-pressed={filter==='all'}>全部</button>{pillars.map(p => <button key={p.key} onClick={() => setFilter(p.key)} aria-pressed={filter===p.key}>{p.name}</button>)}</div><p className="result-count" role="status">{entries.length} 篇{kind==='project'?'作品':'文章'}示例</p>{entries.length ? <div className="entry-list">{entries.map(e => <EntryCard key={e.slug} entry={e}/>)}</div> : <div className="empty-state"><h2>这个方向暂时没有公开{kind==='project'?'作品':'文章'}。</h2><p>成果准备好之后，再留下完整、可验证的记录。</p><button className="text-link" onClick={() => setFilter('all')}>查看全部示例 →</button></div>}</>;
}
export function EntryDetail({ kind }: { kind: PublicExample['kind'] }) {
  const {slug} = useParams();
  const entry = getExample(slug,kind);
  if (!entry) return <NotFound/>;
  return <><Link className="back-link" to={kind==='project'?'/projects':'/writing'}>← {kind==='project'?'作品集':'全部文章'}</Link><div className="article-header"><span className="sample-label">{getPillar(entry.pillar)?.name} · 示例</span><PageIntro title={entry.title} description={entry.summary}/><ExampleNotice/></div><article className="prose"><Markdown skipHtml components={{h1:({children}) => <h2>{children}</h2>,a:({href,children}) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>}}>{entry.body}</Markdown></article><aside className="article-end">示例结束 · 真实作品应补充来源、可复现步骤与经过审核的成果链接。</aside></>;
}
