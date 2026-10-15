import type { Pillar } from '../types/content';

export const pillars: readonly Pillar[] = [
  { key: 'fitness', name: '健身运动', english: 'Fitness & movement', description: '通过科学训练与长期坚持，建立更健康、更有韧性的身体。', vision: '让运动成为生活的稳定支点，关注身体功能与可持续的习惯。', methods: ['从可以持续的训练节奏开始', '兼顾力量、有氧与动作质量', '定期回看训练计划并调整负荷'], evidence: ['可持续执行的训练计划', '对训练方法的理解与总结'] },
  { key: 'english', name: '英语表达', english: 'English & communication', description: '在真实语境中持续输出，提升沟通与表达能力。', vision: '用英语理解知识、交换观点，清晰地讲述自己的工作。', methods: ['输入与口头输出配对练习', '准备技术汇报并练习真实问答', '根据反馈调整结构与表达'], evidence: ['经审核的英文技术分享', '公开文章与表达方法总结'] },
  { key: 'analog_ic', name: '模拟 / 混合信号 IC', english: 'Analog & mixed-signal IC', description: '从电路基础到系统实现，在真实项目中提升工程能力。', vision: '以模拟与混合信号 IC 为主专业，贯通规格、设计、仿真与验证。', methods: ['从规格与约束出发设计电路', '记录仿真假设、边界与失败原因', '用可复现的验证支撑设计结论'], evidence: ['不含保密资料的设计报告', '公开测试方法与失败分析'] },
  { key: 'cooking', name: '做饭烹饪', english: 'Cooking & everyday craft', description: '从家常菜开始，享受烹饪过程，建立更健康的生活方式。', vision: '掌握日常饮食的主动权，把一餐饭做成可复现的生活技艺。', methods: ['练习食材处理和基本火候', '固定食谱并记录关键步骤', '用口味、时间与复现性改进菜品'], evidence: ['可复现的家常菜食谱', '公开的技法与菜品改进记录'] },
  { key: 'ai', name: 'AI 第二专业', english: 'AI as a second specialty', description: '系统学习与动手实践，形成可落地的 AI 应用能力。', vision: '将 AI 作为独立第二专业，建立软件工程、实验复现与模型评估能力。', methods: ['夯实编程、数学与机器学习基础', '复现公开实验并记录环境', '用基准与误差分析评估模型'], evidence: ['可运行的开源项目', '带环境与限制说明的复现报告'] },
  { key: 'finance', name: '金融与财务', english: 'Finance & financial literacy', description: '学习基本的金融知识，建立长期的财务思维与实践能力。', vision: '理解风险、费用与决策原则，形成可解释、可复盘的财务制度。', methods: ['学习基础概念和风险来源', '建立预算与决策复盘方法', '区分事实、假设与不确定性'], evidence: ['不含个人金额的学习笔记', '公开的风险与费用解释框架'] },
];
export const getPillar = (key: string | undefined) => pillars.find(p => p.key === key);
