import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import { pillars, getPillar } from '../../config/pillars';
import { roadmap } from '../../config/roadmap';
import { pillarKeys } from '../../types/content';
import { examples, getExample, selectExamples } from './content';

describe('public content boundaries', () => {
  it('preserves six independent categories and resolves unknown keys safely', () => {
    expect(pillars.map(p=>p.key)).toEqual(pillarKeys);
    expect(getPillar('ai')?.vision).toContain('独立第二专业');
    expect(getPillar('unknown')).toBeUndefined();
  });
  it('labels every sample and resolves only the requested kind', () => {
    expect(new Set(examples.map(e=>e.slug)).size).toBe(examples.length);
    for (const entry of examples) {
      expect(entry.example).toBe(true);
      expect(entry.body).toContain('示例');
      expect(getPillar(entry.pillar)).toBeDefined();
      expect(getExample(entry.slug,entry.kind)).toEqual(entry);
    }
    expect(getExample('circuit-design-report','article')).toBeUndefined();
    expect(getExample('missing','project')).toBeUndefined();
  });
  it('filters by kind and pillar, including empty states', () => {
    expect(selectExamples('project','ai').map(e=>e.slug)).toEqual(['reproducible-ai-experiment']);
    expect(selectExamples('project','fitness')).toEqual([]);
    expect(selectExamples('article')).toHaveLength(2);
  });
  it('covers all twelve quarters with evidence instead of scores', () => {
    expect(roadmap).toHaveLength(3);
    expect(roadmap.reduce((total,y)=>total+y.quarters.length,0)).toBe(12);
    for(const year of roadmap) for(const q of year.quarters) expect(q.evidence.length).toBeGreaterThan(10);
    expect(JSON.stringify({pillars,roadmap,examples})).not.toMatch(/\d+%|service_role|sb_secret_|sk-proj-/);
  });
  it('does not execute raw HTML or retain javascript URLs in Markdown', () => {
    const rendered=renderToStaticMarkup(<Markdown skipHtml>{'<script>alert(1)</script>\n\n[unsafe](javascript:alert%281%29)'}</Markdown>);
    expect(rendered).not.toContain('<script');
    expect(rendered).not.toContain('javascript:');
  });
});
