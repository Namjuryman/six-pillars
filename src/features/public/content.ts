import type { PublicExample, PillarKey } from '../../types/content';

// Purpose-written public examples only. Never import private logs or records here.
export const examples: readonly PublicExample[] = [
  { slug: 'circuit-design-report', kind: 'project', pillar: 'analog_ic', example: true, title: '从规格到验证：一份电路设计报告', summary: '以一个模拟 / 混合信号电路为例，展示从需求分析、电路设计到仿真验证的完整流程。', body: `# 从规格到验证

这是作品结构示例，不代表已经完成的个人项目。实际发布时应替换为经过审核的原创成果。

## 先写清楚问题

描述输入、输出、工作条件和验收标准。每项规格应对应验证方法，不能用一张漂亮的曲线代替完整结论。

## 记录设计取舍

说明拓扑选择、假设和限制。用公开教学模型或可公开的资料展示方法，不包含 PDK、保密工艺或未公开研究文件。

## 用验证支持结论

- 列出测试条件与可复现步骤。
- 对照规格说明通过项与未通过项。
- 保留失败分析和下一次迭代的方向。

## 交付物

一份不含保密材料的设计报告、测试说明与限制清单。当前示例没有真实仓库或测试数据。` },
  { slug: 'reproducible-ai-experiment', kind: 'project', pillar: 'ai', example: true, title: '让一次 AI 实验可以被复现', summary: '记录环境、基线、评估方法和误差分析，建立独立第二专业的工程习惯。', body: `# 可复现的 AI 实验

这是项目规划示例，尚无真实实验结果或代码仓库。

## 项目范围

选择一个公开数据集与简单基线。AI 是独立第二专业，目标是学习软件工程、实验复现与评估方法。

## 验收依据

- 明确数据许可、划分方法与环境版本。
- 提供安装和运行步骤。
- 报告基线、实验条件与误差分析。
- 说明结果的限制，不编造指标。

## 公开边界

只使用允许公开的数据。服务密钥、私人数据集和个人记录不进入仓库。` },
  { slug: 'evidence-based-review', kind: 'article', pillar: 'ai', example: true, title: '用证据定义一次复盘', summary: '通过具体的项目案例，展示如何用可验证的证据进行复盘，并形成下一步的行动。', body: `# 用证据定义一次复盘

这是一篇方法文章示例，不是本人真实的季度复盘。

## 从事实开始

先列出可以检查的交付物：报告、代码、练习或经过审核的反馈。区分“做过什么”和“掌握了什么”。

## 找到问题的边界

写出原来的假设、实际遇到的限制和仍不确定的部分。活动次数不能直接证明能力增长。

## 决定下一步投入

用“集中突破、持续提升、实践维持、阶段暂缓”表达决策。选择下一季度最重要的 1–2 个重点，给它们写出完成标准。

## 留下一条可执行的行动

行动应能回答：下一步做什么，为什么做，以及用什么证据判断它有用。不要给六个领域强行打统一的分数。` },
  { slug: 'repeatable-home-recipe', kind: 'article', pillar: 'cooking', example: true, title: '一份食谱，怎样才算可复现', summary: '把食材处理、火候和步骤写清楚，让生活中的实践也能形成可验证的成果。', body: `# 让食谱可以复现

这是一篇写作结构示例，不包含真实生活记录。

## 写清关键条件

列出食材、处理方式、锅具与步骤顺序。明确容易产生差异的环节，方便下一次比较。

## 一次只调整一个环节

记录改变的步骤与口味反馈，逐渐形成稳定做法。

## 公开版本保留什么

保留烹饪方法与经验，去掉住址、订单和生活地点。公开文章需要独立撰写。` },
];

export function selectExamples(kind: PublicExample['kind'], pillar: PillarKey | 'all' = 'all') {
  return examples.filter(entry => entry.kind === kind && (pillar === 'all' || entry.pillar === pillar));
}
export const getExample = (slug: string | undefined, kind: PublicExample['kind']) => examples.find(entry => entry.slug === slug && entry.kind === kind);
