import type { League, TeamRankTier, CardType } from '../types';

// ============================================================
// 联赛系数
// ============================================================
export const LEAGUE_COEFFICIENTS: Record<League, number> = {
  'premier-league': 5,
  'la-liga': 4.5,
  'bundesliga': 4,
  'serie-a': 3.5,
  'ligue-1': 3,
  'eredivisie': 2.5,
  'liga-portugal': 2.5,
  'other': 2,
};

export const LEAGUE_LABELS: Record<League, string> = {
  'premier-league': '英超',
  'la-liga': '西甲',
  'bundesliga': '德甲',
  'serie-a': '意甲',
  'ligue-1': '法甲',
  'eredivisie': '荷甲',
  'liga-portugal': '葡超',
  'other': '其他联赛',
};

// ============================================================
// 球队排名分数
// ============================================================
export const TEAM_RANK_SCORES: Record<TeamRankTier, number> = {
  'top3': 5,
  'top6': 4,
  'upper-mid': 3,
  'mid': 2,
  'relegation': 1,
};

export const TEAM_RANK_LABELS: Record<TeamRankTier, string> = {
  'top3': '前三',
  'top6': '前六',
  'upper-mid': '中上游',
  'mid': '中游',
  'relegation': '保级区',
};

// ============================================================
// 六维评分权重
// ============================================================
export const SCORING_WEIGHTS = {
  leaguePerformance: 0.25,
  marketValue: 0.20,
  bigMatch: 0.20,
  mediaSentiment: 0.15,
  leagueStrength: 0.10,
  agePotential: 0.10,
} as const;

// ============================================================
// 评分子项映射
// ============================================================
export const BIG_MATCH_SCORES = {
  'no-record': 0,
  'average': 4,
  'contributed': 7,
  'standout': 10,
} as const;

export const NATIONAL_TEAM_SCORES = {
  'none': 0,
  'youth': 5,
  'senior-rotation': 8,
  'senior-starter': 10,
} as const;

export const MEDIA_SENTIMENT_SCORES = {
  'negative': 2,
  'mixed': 5,
  'positive': 7,
  'strong-positive': 10,
} as const;

export const TRANSFER_RUMOR_SCORES = {
  'none': 0,
  'rumor': 4,
  'media-reported': 7,
  'official-contact': 10,
} as const;

// ============================================================
// 稀缺性乘数
// ============================================================
export const SCARCITY_MULTIPLIERS: Record<CardType, number> = {
  'numbered-25-under': 1.3,
  'numbered-26-99': 1.1,
  'base': 1.0,
  'auto': 1.0,
  'patch': 1.0,
};

// ============================================================
// 投资建议档位
// ============================================================
export const INVESTMENT_TIERS = {
  buy: { minScore: 80, label: '买入', color: 'success' },
  watch: { minScore: 60, label: '观望', color: 'warning' },
  pass: { minScore: 0, label: '不买', color: 'danger' },
} as const;

// ============================================================
// 新秀卡分批出仓规则
// ============================================================
export const ROOKIE_SELL_STAGES = [
  {
    trigger: '连续3场首发且有数据',
    ratio: 1 / 3,
    reason: '锁定基础收益',
  },
  {
    trigger: '对阵强队有贡献 / 入选青年国家队',
    ratio: 1 / 3,
    reason: '情绪溢价窗口',
  },
  {
    trigger: '转会豪门 / 入选成年国家队',
    ratio: 1, // 出剩余或全部
    reason: '最高曝光度窗口',
  },
] as const;

// ============================================================
// RCI 温度档位
// ============================================================
export const RCI_TEMPERATURE_CONFIG = {
  'extreme-cold': { min: 0, max: 20, label: '极冷', color: 'rci-cold', bgClass: 'bg-blue-900' },
  'cool': { min: 20, max: 40, label: '偏冷', color: 'rci-cool', bgClass: 'bg-blue-400' },
  'normal': { min: 40, max: 60, label: '正常', color: 'rci-normal', bgClass: 'bg-gray-400' },
  'warm': { min: 60, max: 80, label: '偏热', color: 'rci-warm', bgClass: 'bg-orange-400' },
  'extreme-hot': { min: 80, max: 100, label: '极热', color: 'rci-hot', bgClass: 'bg-red-500' },
} as const;

// ============================================================
// 事件类型标签 & 触发动作
// ============================================================
export const EVENT_TYPE_CONFIG: Record<string, { label: string; triggers: 'sell-window' | 'stop-loss' | 'warning' | 'none' }> = {
  'transfer-official': { label: '转会官宣', triggers: 'sell-window' },
  'transfer-rumor-upgrade': { label: '转会传闻升级', triggers: 'warning' },
  'big-match-standout': { label: '对阵强队亮眼表现', triggers: 'sell-window' },
  'national-team-callup': { label: '入选国家队', triggers: 'sell-window' },
  'injury-absence': { label: '伤病缺席', triggers: 'stop-loss' },
  'playtime-decline': { label: '上场时间下降', triggers: 'stop-loss' },
  'market-value-drop': { label: '德转身价下调', triggers: 'stop-loss' },
  'market-sentiment-only': { label: '仅市场情绪波动', triggers: 'none' },
};

// ============================================================
// 止损触发信号
// ============================================================
export const STOP_LOSS_TRIGGERS = [
  '伤病缺席超过6周',
  '上场时间骤降（主力变轮换）',
  '德转身价连续两次下调',
  '转会到更弱联赛或降级球队',
  '教练体系更换导致位置竞争加剧',
] as const;

// ============================================================
// 默认设置
// ============================================================
export const DEFAULT_SETTINGS = {
  deepseekApiKey: '',
  trackSoldCards: false,
};

// ============================================================
// 应用版本 (localStorage 迁移用)
// ============================================================
export const APP_VERSION = 1;
