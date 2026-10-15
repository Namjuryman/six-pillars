import type { PillarKey } from '../types/content';

export function Brand({ compact = false }: { compact?: boolean }) {
  return <span className="brand"><span className="brand-bars" aria-hidden="true">{[0,1,2,3,4,5].map(i => <i key={i} />)}</span>{!compact && <span>SIX PILLARS</span>}</span>;
}

const paths: Record<PillarKey, string> = {
  fitness: 'M3 12h26 M5 7v10 M9 5v14 M23 5v14 M27 7v10 M9 9h14v6H9',
  english: 'M18 18c-2 2-5 3-8 2l-5 3 1-5C0 12 4 4 12 4s13 9 6 14 M19 12c8-2 13 6 8 11l1 4-5-2c-3 1-6-1-7-3',
  analog_ic: 'M8 8h16v16H8z M4 10h4 M4 16h4 M4 22h4 M24 10h4 M24 16h4 M24 22h4 M10 4v4 M16 4v4 M22 4v4 M10 24v4 M16 24v4 M22 24v4',
  cooking: 'M9 20C0 18 4 7 11 8c1-7 11-7 12 0 8-1 11 10 2 12 M9 18v10h16V18 M9 24h16',
  ai: 'M16 5c-7-5-14 3-10 8-6 4-2 11 3 11 0 5 7 6 7 1V5 M16 5c7-5 14 3 10 8 6 4 2 11-3 11 0 5-7 6-7 1 M9 9l3 3 M8 18h4 M23 9l-3 3 M24 18h-4',
  finance: 'M5 28V17h5v11 M14 28V10h5v18 M23 28V4h5v24',
};
export function PillarIcon({ name }: { name: PillarKey }) {
  return <svg className="pillar-icon" width="36" height="36" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
export function Arrow() { return <span aria-hidden="true" className="arrow">→</span>; }

export function PillarDrawing() {
  return <figure className="pillar-drawing" aria-label="六根独立立柱的概念插图，表示长期成长，不代表实际能力或完成进度">
    <svg viewBox="0 0 560 410" fill="none" aria-hidden="true">
      <g stroke="#a9b7af" strokeWidth=".8"><circle cx="291" cy="166" r="137"/><path d="M291 13v325M52 333h490M96 263v98M493 220v157M51 382 492 95M72 349 425 410M136 321 491 373M40 370h235M103 385h181"/><path d="M72 327C134 218 321 227 523 98" stroke="#668577"/></g>
      {[{x:131,h:85},{x:182,h:128},{x:233,h:158},{x:284,h:189},{x:335,h:218},{x:386,h:254}].map((p,i) => <g key={p.x} stroke={i === 5 ? '#d77542' : '#628074'} strokeWidth="1"><path d={`M${p.x} 321v-${p.h}l24 -4 8 3v${p.h+1}Z`} fill={i===5?'#f9e7d7':'#e3e9e1'}/><path d={`M${p.x+24} ${321-p.h-4}v${p.h+4} M${p.x} ${321-p.h}l24 3 8-4`}/>{[5,9,13,17].map(k => <path key={k} opacity=".3" d={`M${p.x+k} ${321-p.h+4}v${p.h-5}`}/>)}</g>)}
      <g stroke="#8f9f94" strokeWidth="1"><path d="M110 326h321v5H99v5h346v5H83M430 333h22l8-27 8 27 8-39 9 39 9-58 10 58 12-25 9 25"/><circle cx="489" cy="60" r="18" stroke="#d77542"/></g>
    </svg><figcaption>2026 — 2029</figcaption>
  </figure>;
}
