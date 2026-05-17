import type { RCIData, RCIAnchorCard, RCITemperature } from '../types';

// ============================================================
// RCI 市场温度指数计算
// ============================================================

/** 计算加权 RCI 指数值 */
export function calcRCIValue(anchorCards: RCIAnchorCard[]): number {
  if (anchorCards.length === 0) return 0;
  const totalWeight = anchorCards.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;

  let weightedSum = 0;
  for (const card of anchorCards) {
    if (card.priceHistory.length < 2) {
      // 只有1个数据点，贡献权重×该价格
      const price = card.priceHistory[0]?.price ?? 0;
      weightedSum += (card.weight / totalWeight) * price;
      continue;
    }
    // 取最近价格
    const latest = card.priceHistory[card.priceHistory.length - 1];
    weightedSum += (card.weight / totalWeight) * latest.price;
  }
  return Math.round(weightedSum);
}

/** 计算历史均价 */
export function calcHistoricalAverage(anchorCards: RCIAnchorCard[]): number {
  const allPrices: number[] = [];
  for (const card of anchorCards) {
    for (const p of card.priceHistory) {
      allPrices.push(p.price);
    }
  }
  if (allPrices.length === 0) return 0;
  const sorted = [...allPrices].sort((a, b) => a - b);
  return Math.round(sorted.reduce((s, v) => s + v, 0) / sorted.length);
}

/** 计算当前值在历史数据中的百分位 */
export function calcPercentile(currentValue: number, allPrices: number[]): number {
  if (allPrices.length === 0) return 50;
  const sorted = [...allPrices].sort((a, b) => a - b);
  const below = sorted.filter(p => p <= currentValue).length;
  return Math.round((below / sorted.length) * 100);
}

/** 百分位映射温度档位 */
export function percentileToTemperature(percentile: number): RCITemperature {
  if (percentile <= 20) return 'extreme-cold';
  if (percentile <= 40) return 'cool';
  if (percentile <= 60) return 'normal';
  if (percentile <= 80) return 'warm';
  return 'extreme-hot';
}

/** 综合计算 RCI */
export function calcFullRCI(data: RCIData): RCIData {
  const currentIndex = calcRCIValue(data.anchorCards);
  const allPrices = data.anchorCards.flatMap(c => c.priceHistory.map(p => p.price));
  const percentile = calcPercentile(currentIndex, allPrices);
  const temperature = percentileToTemperature(percentile);

  return {
    ...data,
    currentIndex,
    percentile,
    temperature,
  };
}

/** 解析用户粘贴的历史成交记录 */
export function parsePriceHistory(rawText: string): { date: string; price: number }[] {
  const lines = rawText.trim().split('\n').filter(l => l.trim());
  const results: { date: string; price: number }[] = [];

  // 支持多种格式: "2024-01-15 ￥500" / "1月15日 500" / "2024/01/15 500元" etc
  for (const line of lines) {
    const priceMatch = line.match(/(\d{2,4}[-\/]\d{1,2}[-\/]\d{1,2})|(\d{1,2}月\d{1,2}日)/);
    const numMatch = line.match(/(\d{2,6})\s*(元|￥|CNY|$)?/);
    if (priceMatch && numMatch) {
      let date = priceMatch[0];
      // Normalize date to YYYY-MM-DD (simple: just keep as-is for display)
      if (/^\d{1,2}月/.test(date)) {
        const [m, d] = date.replace(/[月日]/g, '-').split('-').filter(Boolean);
        date = `2024-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
      results.push({ date, price: parseInt(numMatch[1]) });
    }
  }
  return results;
}

/** 生成过去12周每周指数值 (基于历史数据插值) */
export function generateWeeklyHistory(anchorCards: RCIAnchorCard[]): { week: string; value: number }[] {
  const weeks: { week: string; value: number }[] = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const weekDate = new Date(now);
    weekDate.setDate(weekDate.getDate() - i * 7);
    const weekStr = `${weekDate.getMonth() + 1}/${weekDate.getDate()}`;

    // Simulate: use the cards' price histories to approximate weekly values
    let weekValue = 0;
    let count = 0;
    for (const card of anchorCards) {
      const pricesNearWeek = card.priceHistory.filter(p => {
        const pd = new Date(p.date);
        const diff = Math.abs(pd.getTime() - weekDate.getTime());
        return diff < 7 * 24 * 60 * 60 * 1000; // within 7 days
      });
      if (pricesNearWeek.length > 0) {
        weekValue += pricesNearWeek.reduce((s, p) => s + p.price, 0) / pricesNearWeek.length;
        count++;
      }
    }
    weeks.push({
      week: weekStr,
      value: count > 0 ? Math.round(weekValue / count) : 0,
    });
  }
  return weeks;
}
