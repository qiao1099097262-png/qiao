import type { PlayerInputData, SixDimensionScores, RatingResult } from '../types';
import {
  SCORING_WEIGHTS,
  LEAGUE_COEFFICIENTS,
  TEAM_RANK_SCORES,
  BIG_MATCH_SCORES,
  NATIONAL_TEAM_SCORES,
  MEDIA_SENTIMENT_SCORES,
  TRANSFER_RUMOR_SCORES,
} from '../constants';

// ============================================================
// 六维评分引擎 — 纯函数（不依赖卡种信息）
// ============================================================

function calcLeaguePerformance(d: PlayerInputData): number {
  const minutes = d.minutes || 1;
  const goalsPer90 = (d.goals / minutes) * 90;
  const assistsPer90 = (d.assists / minutes) * 90;
  const gaPer90 = goalsPer90 + assistsPer90;
  const gaScore = Math.min(gaPer90 * 3.5, 10);

  const startRate = d.appearances > 0 ? d.starts / d.appearances : 0;
  let startScore = 0;
  if (startRate >= 0.8) startScore = 3;
  else if (startRate >= 0.6) startScore = 2;
  else if (startRate >= 0.4) startScore = 1;

  const contribution = d.teamTotalGoals > 0
    ? ((d.goals + d.assists) / d.teamTotalGoals) * 20
    : 0;
  const contribScore = Math.min(contribution, 4);

  const keyPassesPer90 = d.minutes > 0 ? (d.keyPasses / d.minutes) * 90 : 0;
  const kpScore = Math.min(keyPassesPer90 * 1.2, 3);
  const subtotal = gaScore + startScore + contribScore + kpScore;
  return Math.min(subtotal / 2, 10);
}

function calcMarketValue(d: PlayerInputData): number {
  let absScore = 0;
  if (d.currentMarketValue >= 3000) absScore = 4;
  else if (d.currentMarketValue >= 1000) absScore = 3;
  else if (d.currentMarketValue >= 300) absScore = 2;
  else if (d.currentMarketValue >= 100) absScore = 1;

  const growth = d.marketValue12m > 0
    ? (d.currentMarketValue - d.marketValue12m) / d.marketValue12m
    : 0;
  let growthScore = 0;
  if (growth > 1.0) growthScore = 4;
  else if (growth > 0.5) growthScore = 3;
  else if (growth > 0.2) growthScore = 2;
  else if (growth > 0) growthScore = 1;

  const nearPeak = d.marketValuePeak > 0 && d.currentMarketValue >= d.marketValuePeak * 0.9;
  const peakScore = nearPeak ? 2 : 1;

  return Math.min(absScore + growthScore + peakScore, 10);
}

function calcBigMatch(d: PlayerInputData): number {
  const bigMatchScore = BIG_MATCH_SCORES[d.bigMatchPerformance] ?? 0;
  const nationalScore = NATIONAL_TEAM_SCORES[d.nationalTeamStatus] ?? 0;
  return Math.min(bigMatchScore * 0.6 + nationalScore * 0.4, 10);
}

function calcMediaSentiment(d: PlayerInputData): number {
  const mediaScore = MEDIA_SENTIMENT_SCORES[d.mediaSentiment] ?? 5;
  const transferScore = TRANSFER_RUMOR_SCORES[d.transferRumors] ?? 0;
  return Math.min(mediaScore * 0.7 + transferScore * 0.3, 10);
}

function calcLeagueStrength(d: PlayerInputData): number {
  const leagueScore = LEAGUE_COEFFICIENTS[d.league] ?? 2;
  const teamScore = TEAM_RANK_SCORES[d.teamRank] ?? 2;
  return Math.min((leagueScore * 0.5 + teamScore * 0.5) * 2, 10);
}

function calcAgePotential(d: PlayerInputData): number {
  if (d.age >= 17 && d.age <= 20) return 10;
  if (d.age <= 22) return 8;
  if (d.age <= 24) return 6;
  if (d.age <= 26) return 4;
  return 2;
}

// ============================================================
// 主评分函数 — 返回倍数而非绝对值
// ============================================================

export function calculateRating(data: PlayerInputData, rciAdjust: boolean = false, rciTemperature?: string): RatingResult {
  const dimensionScores: SixDimensionScores = {
    leaguePerformance: Math.round(calcLeaguePerformance(data) * 10) / 10,
    marketValue: Math.round(calcMarketValue(data) * 10) / 10,
    bigMatch: Math.round(calcBigMatch(data) * 10) / 10,
    mediaSentiment: Math.round(calcMediaSentiment(data) * 10) / 10,
    leagueStrength: Math.round(calcLeagueStrength(data) * 10) / 10,
    agePotential: calcAgePotential(data),
  };

  const weightedSum =
    dimensionScores.leaguePerformance * SCORING_WEIGHTS.leaguePerformance +
    dimensionScores.marketValue * SCORING_WEIGHTS.marketValue +
    dimensionScores.bigMatch * SCORING_WEIGHTS.bigMatch +
    dimensionScores.mediaSentiment * SCORING_WEIGHTS.mediaSentiment +
    dimensionScores.leagueStrength * SCORING_WEIGHTS.leagueStrength +
    dimensionScores.agePotential * SCORING_WEIGHTS.agePotential;

  const totalScore = Math.round(weightedSum * 10);

  let adjustedScore = totalScore;
  if (rciAdjust && rciTemperature === 'extreme-hot') {
    adjustedScore = Math.max(0, totalScore - 5);
  }

  const tier: RatingResult['tier'] =
    adjustedScore >= 80 ? 'buy' :
    adjustedScore >= 60 ? 'watch' : 'pass';

  // 目标卖出倍数（基于档位，不含稀缺乘数）
  let minMult: number, maxMult: number;
  if (tier === 'buy') { minMult = 1.8; maxMult = 3.5; }
  else if (tier === 'watch') { minMult = 1.3; maxMult = 2.2; }
  else { minMult = 0.9; maxMult = 1.4; }

  let suggestedHoldings: string;
  if (tier === 'buy') suggestedHoldings = '2–3张';
  else if (tier === 'watch') suggestedHoldings = '1–2张';
  else suggestedHoldings = '不超过1张';

  return {
    totalScore: adjustedScore,
    tier,
    dimensionScores,
    targetSellMultiplier: { min: minMult, max: maxMult },
    suggestedHoldings,
    stopProfitMultiplier: minMult,
    forcedStopProfitMultiplier: minMult * 1.2,
    stopLossMultiplier: 0.6,
  };
}
