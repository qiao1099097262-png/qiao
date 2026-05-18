// ============================================================
// 核心类型定义 — Roocard
// ============================================================

// --- 联赛 & 位置 ---
export type League =
  | 'premier-league'
  | 'la-liga'
  | 'bundesliga'
  | 'serie-a'
  | 'ligue-1'
  | 'eredivisie'
  | 'liga-portugal'
  | 'other';

export type Position = 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'ST' | 'CF';

export type TeamRankTier = 'top3' | 'top6' | 'upper-mid' | 'mid' | 'relegation';

// --- 卡片类型 ---
export type CardType = 'base' | 'numbered-26-99' | 'numbered-25-under' | 'auto' | 'patch';

// --- 评分相关 ---
export interface SixDimensionScores {
  leaguePerformance: number;
  marketValue: number;
  bigMatch: number;
  mediaSentiment: number;
  leagueStrength: number;
  agePotential: number;
}

export interface RatingResult {
  totalScore: number;
  tier: 'moderate-buy' | 'light-buy' | 'pass';
  dimensionScores: SixDimensionScores;
  targetSellMultiplier: { min: number; max: number };  // 基于档位的价格倍数，不含稀缺乘数
  stopProfitMultiplier: number;   // 止盈倍数（相对成本）
  forcedStopProfitMultiplier: number;
  stopLossMultiplier: number;     // 止损倍数
  aiAnalysis?: string;
}

// --- 球员输入数据（不含卡片信息）---
export interface PlayerInputData {
  name: string;
  age: number;
  position: Position;
  team: string;
  league: League;
  teamRank: TeamRankTier;

  appearances: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  teamTotalGoals: number;

  keyPasses: number;     // 总关键传球
  shots: number;          // 总射门

  currentMarketValue: number;
  marketValue12m: number;
  marketValuePeak: number;

  bigMatchPerformance: 'no-record' | 'average' | 'contributed' | 'standout';
  nationalTeamStatus: 'none' | 'youth' | 'senior-rotation' | 'senior-starter';

  mediaSentiment: 'negative' | 'mixed' | 'positive' | 'strong-positive';
  transferRumors: 'none' | 'rumor' | 'media-reported' | 'official-contact';
}

// --- 赛季数据 ---
export interface SeasonData {
  season: string;            // 如 "2024-25"
  appearances: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  teamTotalGoals: number;
  keyPasses: number;
  shots: number;
  currentMarketValue: number;
  marketValue12m: number;
  marketValuePeak: number;
  bigMatchPerformance: 'no-record' | 'average' | 'contributed' | 'standout';
  nationalTeamStatus: 'none' | 'youth' | 'senior-rotation' | 'senior-starter';
  mediaSentiment: 'negative' | 'mixed' | 'positive' | 'strong-positive';
  transferRumors: 'none' | 'rumor' | 'media-reported' | 'official-contact';
}

// --- 单张卡 ---
export interface CardHolding {
  id: string;
  cardType: CardType;
  cardNumber: string;
  costPrice: number;        // 入手单价
  count: number;            // 张数
  currentEstimate: number;  // 当前市场估值（单价）
  buyDate: string;          // ISO date
  notes: string;
}

// --- 球员持仓（聚合层）---
export type PositionStatus = 'holding' | 'sell-window' | 'stop-loss-warning' | 'time-stop-near';
export type MilestoneStage = 'entry' | 'early' | 'breakout' | 'peak';

export interface PlayerHolding {
  id: string;
  playerName: string;
  ratingResult?: RatingResult;
  milestoneStage: MilestoneStage;
  milestoneProgress: number;
  isRookie: boolean;
  rookieSellProgress: number;
  status: PositionStatus;
  targetPlayerId?: string;
  notes: string;
  cards: CardHolding[];       // 该球员下所有卡
  seasons: SeasonData[];      // 历史赛季数据
}

// --- Target 参照球员 ---
export interface TargetPlayer {
  id: string;
  name: string;
  position: Position;
  league: League;
  team: string;
  priceHistory: {
    entry: { low: number; high: number };
    early: { low: number; high: number };
    breakout: { low: number; high: number };
    peak: { low: number; high: number };
  };
  notes: string;
}

// --- 事件 ---
export type EventType =
  | 'transfer-official'
  | 'transfer-rumor-upgrade'
  | 'big-match-standout'
  | 'national-team-callup'
  | 'injury-absence'
  | 'playtime-decline'
  | 'market-value-drop'
  | 'market-sentiment-only';

export interface PlayerEvent {
  id: string;
  playerName: string;
  playerId: string;            // 关联 PlayerHolding
  eventType: EventType;
  eventDate: string;
  description: string;
  acknowledged: boolean;
  sellWindowActive: boolean;
  sellWindowExpiry?: string;
  createdAt: string;
}

// --- 交易记录 ---
export interface TradeRecord {
  id: string;
  type: 'buy' | 'sell';
  date: string;
  playerName: string;
  cardInfo: string;
  price: number;
  count: number;
  buyReason?: string;
  sellReason?: string;
  triggerEventType?: EventType;
  decisionQuality?: DecisionQuality;
  targetReview?: TargetReview;
  trackAfterSell?: boolean;
}

export interface DecisionQuality {
  hasTriggerEvent: boolean;
  priceInTargetRange: 'yes' | 'no' | 'above' | 'below';
  followed24hRule: boolean;
  grade: 'A' | 'B' | 'C';
}

export interface TargetReview {
  wasCorrect: 'correct' | 'overestimated' | 'underestimated';
  actualReference?: string;
}

// --- RCI 市场温度指数 ---
export type RCITemperature = 'extreme-cold' | 'cool' | 'normal' | 'warm' | 'extreme-hot';

export interface RCIAnchorCard {
  id: string;
  playerName: string;
  cardName: string;
  league: League;
  weight: number;
  priceHistory: { date: string; price: number }[];
}

export interface RCIData {
  anchorCards: RCIAnchorCard[];
  currentIndex: number;
  percentile: number;
  temperature: RCITemperature;
  weeklyHistory: { week: string; value: number }[];
}

// --- 应用设置 ---
export interface AppSettings {
  deepseekApiKey: string;
  trackSoldCards: boolean;
}

// --- localStorage 数据结构 ---
export interface AppData {
  settings: AppSettings;
  playerHoldings: PlayerHolding[];   // 重命名：原 holdings
  targetPlayers: TargetPlayer[];
  events: PlayerEvent[];
  trades: TradeRecord[];
  rci: RCIData;
  version: number;
}
