import type { PlayerEvent, EventType } from '../types';

// ============================================================
// 止盈止损规则引擎
// ============================================================

/** 检查事件是否触发卖出窗口 (48h) */
export function isSellWindowTrigger(eventType: EventType): boolean {
  return ['transfer-official', 'big-match-standout', 'national-team-callup'].includes(eventType);
}

/** 检查事件是否触发止损评估 */
export function isStopLossTrigger(eventType: EventType): boolean {
  return ['injury-absence', 'playtime-decline', 'market-value-drop'].includes(eventType);
}

/** 计算卖出窗口到期时间 (48小时) */
export function calcSellWindowExpiry(): string {
  const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
  return expiry.toISOString();
}

/** 计算剩余时间 (返回小时数) */
export function calcRemainingHours(expiryISO: string): number {
  const remaining = new Date(expiryISO).getTime() - Date.now();
  return Math.max(0, Math.round(remaining / (1000 * 60 * 60) * 10) / 10);
}

/** 格式化倒计时 */
export function formatCountdown(hours: number): string {
  if (hours <= 0) return '已过期';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}小时${m}分钟`;
}

/** 检查报价是否在目标区间内 */
export function isPriceInTargetRange(price: number, min: number, max: number): 'below' | 'yes' | 'above' {
  if (price < min) return 'below';
  if (price > max) return 'above';
  return 'yes';
}

/** 新秀卡：根据里程碑事件计算建议出仓比例 */
export function calcRookieSellRatio(
  currentProgress: number,
  eventType: EventType
): { additionalRatio: number; totalRatio: number; reason: string } {
  // Stage 1: 连续3场首发且有数据 → 出 1/3
  // Stage 2: 对阵强队有贡献 / 入选青年国家队 → 出 1/3
  // Stage 3: 转会豪门 / 入选成年国家队 → 出剩余或全部
  if (['transfer-official', 'national-team-callup'].includes(eventType) && currentProgress < 0.66) {
    // 里程碑3级别事件
    const additional = 1 - currentProgress;
    return { additionalRatio: additional, totalRatio: 1, reason: '最高曝光度窗口，建议出清剩余仓位' };
  }
  if (['big-match-standout'].includes(eventType) && currentProgress < 0.66) {
    const additional = Math.min(1 / 3, 1 - currentProgress);
    return { additionalRatio: additional, totalRatio: currentProgress + additional, reason: '情绪溢价窗口' };
  }
  // 默认阶段1
  if (currentProgress < 0.33) {
    return { additionalRatio: 1 / 3, totalRatio: 1 / 3, reason: '锁定基础收益' };
  }
  return { additionalRatio: 0, totalRatio: currentProgress, reason: '持续观察' };
}

/** 检查是否触发时间止损 (持有超过9个月) */
export function isTimeStopTriggered(buyDate: string): boolean {
  const buy = new Date(buyDate);
  const nineMonths = new Date(buy);
  nineMonths.setMonth(nineMonths.getMonth() + 9);
  return Date.now() > nineMonths.getTime();
}

/** 计算距9个月时间止损的剩余天数 */
export function calcTimeStopDays(buyDate: string): number {
  const buy = new Date(buyDate);
  const nineMonths = new Date(buy);
  nineMonths.setMonth(nineMonths.getMonth() + 9);
  const remaining = nineMonths.getTime() - Date.now();
  return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
}

/** 大盘联动：极热时提高买入门槛，极冷时放宽止损 */
export function adjustForMarket(
  baseStopLoss: number,
  rciTemperature: string
): number {
  if (rciTemperature === 'extreme-cold') {
    // 放宽5-10%
    return Math.round(baseStopLoss * 0.9);
  }
  if (rciTemperature === 'extreme-hot') {
    // 止损不变但买入门槛提高 (在评分引擎中处理)
    return baseStopLoss;
  }
  return baseStopLoss;
}

/** 计算决策质量评分 */
export function calcDecisionQuality(
  hasTriggerEvent: boolean,
  priceInTargetRange: 'yes' | 'no' | 'above' | 'below',
  followed24hRule: boolean
): { hasTriggerEvent: boolean; priceInTargetRange: 'yes' | 'no' | 'above' | 'below'; followed24hRule: boolean; grade: 'A' | 'B' | 'C' } {
  let score = 0;
  if (hasTriggerEvent) score++;
  if (priceInTargetRange === 'yes') score++;
  if (followed24hRule) score++;
  const grade = score === 3 ? 'A' : score >= 1 ? 'B' : 'C';
  return { hasTriggerEvent, priceInTargetRange, followed24hRule, grade };
}
