export const pillarKeys = ['fitness', 'english', 'analog_ic', 'cooking', 'ai', 'finance'] as const;
export type PillarKey = (typeof pillarKeys)[number];
export type Investment = '集中突破' | '持续提升' | '实践维持' | '阶段暂缓';
export interface Pillar {
  key: PillarKey;
  name: string;
  english: string;
  description: string;
  vision: string;
  methods: string[];
  evidence: string[];
}
export interface PublicExample {
  slug: string;
  kind: 'project' | 'article';
  pillar: PillarKey;
  title: string;
  summary: string;
  body: string;
  example: true;
}
