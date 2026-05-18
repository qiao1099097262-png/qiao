import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { PlayerHolding, CardHolding, CardType, SeasonData } from '../../types';
import { loadPlayerHoldings, updatePlayerHolding, addCardToPlayer, updateCard, removeCard, generateId } from '../../utils/storage';
import { SCARCITY_MULTIPLIERS } from '../../constants';
import { ScoreBar, StatusBadge, MetricCard } from '../Common';

const EMPTY_CARD: Omit<CardHolding, 'id'> = {
  cardType: 'base', cardNumber: '', costPrice: 0, count: 1, currentEstimate: 0,
  buyDate: new Date().toISOString().split('T')[0], notes: '',
};

const EMPTY_SEASON: SeasonData = {
  season: '',
  appearances: 0, starts: 0, minutes: 0, goals: 0, assists: 0, teamTotalGoals: 0,
  keyPasses: 0, shots: 0,
  currentMarketValue: 0, marketValue12m: 0, marketValuePeak: 0,
  bigMatchPerformance: 'no-record', nationalTeamStatus: 'none',
  mediaSentiment: 'mixed', transferRumors: 'none',
};

export default function PlayerDetailPage() {
  const { playerId } = useParams<{ playerId: string }>();
  const navigate = useNavigate();
  const [player, setPlayer] = useState<PlayerHolding | null>(null);
  const [tab, setTab] = useState<'cards' | 'seasons'>('cards');

  // Card form
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingCard, setEditingCard] = useState<CardHolding | null>(null);
  const [cardForm, setCardForm] = useState({ ...EMPTY_CARD });

  // Season form
  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [seasonForm, setSeasonForm] = useState<SeasonData>({ ...EMPTY_SEASON });

  // Edit player
  const [editingPlayer, setEditingPlayer] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [playerNotes, setPlayerNotes] = useState('');
  const [playerStatus, setPlayerStatus] = useState<PlayerHolding['status']>('holding');
  const [playerIsRookie, setPlayerIsRookie] = useState(false);

  useEffect(() => {
    const all = loadPlayerHoldings();
    const found = all.find(p => p.id === playerId);
    if (found) {
      setPlayer(found);
      setPlayerName(found.playerName);
      setPlayerNotes(found.notes);
      setPlayerStatus(found.status);
      setPlayerIsRookie(found.isRookie);
    }
  }, [playerId]);

  const refresh = () => {
    const all = loadPlayerHoldings();
    const found = all.find(p => p.id === playerId);
    setPlayer(found || null);
  };

  if (!player) {
    return (
      <div className="text-center py-12 text-text-secondary">
        球员不存在或已删除。
        <button onClick={() => navigate('/positions')} className="text-text-primary underline ml-2">返回持仓</button>
      </div>
    );
  }

  const dimensionLabels: Record<string, string> = {
    leaguePerformance: '联赛相对表现',
    marketValue: '德转身价指标',
    bigMatch: '重要比赛表现',
    mediaSentiment: '媒体与社区评价',
    leagueStrength: '联赛强度×球队影响力',
    agePotential: '年龄与上限空间',
  };

  // --- Card handlers ---
  const handleAddCard = () => {
    if (!cardForm.costPrice) return;
    addCardToPlayer(player.id, { id: generateId(), ...cardForm });
    setCardForm({ ...EMPTY_CARD });
    setShowCardForm(false);
    refresh();
  };

  const handleEditCard = () => {
    if (!editingCard) return;
    updateCard(player.id, editingCard.id, { ...editingCard });
    setEditingCard(null);
    refresh();
  };

  const handleDeleteCard = (cardId: string) => {
    if (confirm('确认删除该卡记录？')) { removeCard(player.id, cardId); refresh(); }
  };

  const sortedCards = [...player.cards].sort((a, b) => b.costPrice - a.costPrice);

  // --- Season handlers ---
  const sortedSeasons = [...player.seasons].sort((a, b) => a.season.localeCompare(b.season));

  const handleAddSeason = () => {
    if (!seasonForm.season) return;
    const updated = { ...player, seasons: [...player.seasons, { ...seasonForm }] };
    updatePlayerHolding(player.id, { seasons: updated.seasons });
    setSeasonForm({ ...EMPTY_SEASON });
    setShowSeasonForm(false);
    refresh();
  };

  const handleDeleteSeason = (idx: number) => {
    const updated = player.seasons.filter((_, i) => i !== idx);
    updatePlayerHolding(player.id, { seasons: updated });
    refresh();
  };

  // --- Edit player ---
  const handleSavePlayer = () => {
    updatePlayerHolding(player.id, {
      playerName,
      notes: playerNotes,
      status: playerStatus,
      isRookie: playerIsRookie,
    });
    setEditingPlayer(false);
    refresh();
  };

  // --- Growth scoring (compare last 2 seasons) ---
  const calcGrowthScore = (): { score: number; label: string; details: string[] } | null => {
    if (sortedSeasons.length < 2) return null;
    const prev = sortedSeasons[sortedSeasons.length - 2];
    const curr = sortedSeasons[sortedSeasons.length - 1];

    const details: string[] = [];
    let growthScore = 0;

    // Minutes trend
    const minChange = prev.minutes > 0 ? (curr.minutes - prev.minutes) / prev.minutes : 0;
    if (minChange > 0.2) { growthScore += 15; details.push(`出场时间增长 ${Math.round(minChange * 100)}%`); }
    else if (minChange < -0.2) { growthScore -= 10; details.push(`出场时间下降 ${Math.round(Math.abs(minChange) * 100)}%`); }
    else { details.push('出场时间稳定'); }

    // G+A per 90 trend
    const prevGA90 = prev.minutes > 0 ? ((prev.goals + prev.assists) / prev.minutes) * 90 : 0;
    const currGA90 = curr.minutes > 0 ? ((curr.goals + curr.assists) / curr.minutes) * 90 : 0;
    const gaChange = prevGA90 > 0 ? (currGA90 - prevGA90) / prevGA90 : 0;
    if (gaChange > 0.3) { growthScore += 20; details.push(`每90分钟G+A大幅提升 ${Math.round(gaChange * 100)}%`); }
    else if (gaChange > 0.1) { growthScore += 10; details.push(`每90分钟G+A小幅提升 ${Math.round(gaChange * 100)}%`); }
    else if (gaChange < -0.2) { growthScore -= 10; details.push(`每90分钟G+A下滑 ${Math.round(Math.abs(gaChange) * 100)}%`); }
    else { details.push('每90分钟G+A稳定'); }

    // Market value trend
    const mvChange = prev.currentMarketValue > 0 ? (curr.currentMarketValue - prev.currentMarketValue) / prev.currentMarketValue : 0;
    if (mvChange > 0.3) { growthScore += 20; details.push(`身价大幅上涨 ${Math.round(mvChange * 100)}%`); }
    else if (mvChange > 0.1) { growthScore += 10; details.push(`身价小幅上涨 ${Math.round(mvChange * 100)}%`); }
    else if (mvChange < -0.1) { growthScore -= 10; details.push(`身价下跌 ${Math.round(Math.abs(mvChange) * 100)}%`); }
    else { details.push('身价稳定'); }

    // Big match / national team upgrade
    const bigMatchOrder = ['no-record', 'average', 'contributed', 'standout'];
    const ntOrder = ['none', 'youth', 'senior-rotation', 'senior-starter'];
    const bmCurr = bigMatchOrder.indexOf(curr.bigMatchPerformance);
    const bmPrev = bigMatchOrder.indexOf(prev.bigMatchPerformance);
    const ntCurr = ntOrder.indexOf(curr.nationalTeamStatus);
    const ntPrev = ntOrder.indexOf(prev.nationalTeamStatus);
    if (bmCurr > bmPrev) { growthScore += 10; details.push('强队表现提升'); }
    if (ntCurr > ntPrev) { growthScore += 15; details.push('国家队地位上升'); }

    let label: string;
    if (growthScore >= 30) label = '🚀 快速成长';
    else if (growthScore >= 10) label = '📈 稳步上升';
    else if (growthScore >= -10) label = '➡️ 持平';
    else label = '📉 下滑趋势';

    return { score: growthScore, label, details };
  };

  // --- Card aggregates ---
  const totalInvested = player.cards.reduce((s, c) => s + c.costPrice * c.count, 0);
  const totalEstimated = player.cards.reduce((s, c) => s + c.currentEstimate * c.count, 0);
  const totalPnl = totalEstimated - totalInvested;
  const pnlPct = totalInvested > 0 ? ((totalPnl / totalInvested) * 100).toFixed(1) : '0';
  const cardCount = player.cards.reduce((s, c) => s + c.count, 0);

  const calcLines = (cost: number) => {
    if (!player.ratingResult) return { stopProfit: 0, forcedProfit: 0, stopLoss: 0 };
    const r = player.ratingResult;
    const scarcityMult = SCARCITY_MULTIPLIERS[player.cards[0]?.cardType] ?? 1.0;
    return {
      stopProfit: Math.round(cost * r.stopProfitMultiplier * scarcityMult),
      forcedProfit: Math.round(cost * r.forcedStopProfitMultiplier * scarcityMult),
      stopLoss: Math.round(cost * r.stopLossMultiplier),
    };
  };

  const growth = calcGrowthScore();

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/positions')} className="text-sm text-text-secondary hover:text-text-primary">
        ← 返回持仓列表
      </button>

      {/* ========== 球员信息 + 评级 ========== */}
      <div className="card">
        {editingPlayer ? (
          <div className="space-y-3">
            <h3 className="text-sm font-bold">编辑球员信息</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">球员姓名</label>
                <input className="input-field" value={playerName} onChange={e => setPlayerName(e.target.value)} />
              </div>
              <div>
                <label className="label">状态</label>
                <select className="select-field" value={playerStatus}
                  onChange={e => setPlayerStatus(e.target.value as PlayerHolding['status'])}>
                  <option value="holding">持有中</option>
                  <option value="sell-window">卖出窗口开启</option>
                  <option value="stop-loss-warning">止损警告</option>
                  <option value="time-stop-near">时间止损临近</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">备注</label>
              <input className="input-field" value={playerNotes} onChange={e => setPlayerNotes(e.target.value)} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={playerIsRookie} onChange={e => setPlayerIsRookie(e.target.checked)} />
              新秀球员
            </label>
            <div className="flex gap-2">
              <button onClick={handleSavePlayer} className="btn-primary text-sm">保存</button>
              <button onClick={() => setEditingPlayer(false)} className="btn-secondary text-sm">取消</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <h1 className="text-xl font-bold text-text-primary">{player.playerName}</h1>
              {player.ratingResult && <StatusBadge status={player.ratingResult.tier} />}
              <StatusBadge status={player.status} />
              {player.isRookie && <span className="badge bg-blue-100 text-blue-700">新秀</span>}
              <button onClick={() => setEditingPlayer(true)} className="text-xs btn-secondary ml-auto">✏️ 编辑</button>
            </div>

            {player.ratingResult && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-3xl font-bold font-mono">{player.ratingResult.totalScore}</span>
                  <span className="text-sm text-text-secondary">/100</span>
                </div>
                <div className="space-y-1 mb-3">
                  {Object.entries(player.ratingResult.dimensionScores).map(([key, score], i) => (
                    <ScoreBar key={key} label={dimensionLabels[key] ?? key} score={score}
                      weight={[0.25, 0.20, 0.20, 0.15, 0.10, 0.10][i]} />
                  ))}
                </div>
                <div className="text-xs text-text-secondary">
                  目标卖出: ×{player.ratingResult.targetSellMultiplier.min} – ×{player.ratingResult.targetSellMultiplier.max} · 
                  止损: ×{player.ratingResult.stopLossMultiplier}
                </div>
              </>
            )}

            {player.notes && <div className="text-xs text-text-secondary mt-2">备注: {player.notes}</div>}
          </>
        )}
      </div>

      {/* 金额汇总 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="总投入" value={`¥${totalInvested.toLocaleString()}`} />
        <MetricCard label="当前估值" value={`¥${totalEstimated.toLocaleString()}`} />
        <MetricCard label="浮盈/浮亏" value={`${totalPnl >= 0 ? '+' : ''}¥${totalPnl.toLocaleString()}`}
          sub={`${pnlPct}%`} colorClass={totalPnl >= 0 ? 'text-success' : 'text-danger'} />
        <MetricCard label="持卡数量" value={cardCount} />
      </div>

      {/* ========== Tab 切换 ========== */}
      <div className="flex gap-2">
        <button onClick={() => setTab('cards')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'cards' ? 'bg-text-primary text-white' : 'btn-secondary'}`}>
          持有卡片 ({player.cards.length})
        </button>
        <button onClick={() => setTab('seasons')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'seasons' ? 'bg-text-primary text-white' : 'btn-secondary'}`}>
          赛季数据 ({player.seasons.length})
        </button>
      </div>

      {/* ========== 卡片 Tab ========== */}
      {tab === 'cards' && (
        <div className="space-y-3">
          <button onClick={() => { setShowCardForm(!showCardForm); setEditingCard(null); }}
            className="btn-primary text-sm">{showCardForm ? '取消' : '+ 添加卡片'}</button>

          {showCardForm && (
            <div className="card border-2 space-y-3">
              <h3 className="text-sm font-bold">添加卡片记录</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="label">卡片类型</label>
                  <select className="select-field" value={cardForm.cardType}
                    onChange={e => setCardForm({ ...cardForm, cardType: e.target.value as CardType })}>
                    <option value="base">Base</option>
                    <option value="numbered-26-99">编号 26-99</option>
                    <option value="numbered-25-under">编号 ≤25 (低编)</option>
                    <option value="auto">签字</option>
                    <option value="patch">Patch</option>
                  </select>
                </div>
                <div><label className="label">编号</label><input className="input-field" value={cardForm.cardNumber} onChange={e => setCardForm({ ...cardForm, cardNumber: e.target.value })} /></div>
                <div><label className="label">入手成本 (¥)</label><input className="input-field" type="number" value={cardForm.costPrice || ''} onChange={e => setCardForm({ ...cardForm, costPrice: parseInt(e.target.value) || 0 })} /></div>
                <div><label className="label">持有张数</label><input className="input-field" type="number" value={cardForm.count} onChange={e => setCardForm({ ...cardForm, count: parseInt(e.target.value) || 1 })} /></div>
                <div><label className="label">当前估值 (¥)</label><input className="input-field" type="number" value={cardForm.currentEstimate || ''} onChange={e => setCardForm({ ...cardForm, currentEstimate: parseInt(e.target.value) || 0 })} /></div>
                <div><label className="label">买入日期</label><input className="input-field" type="date" value={cardForm.buyDate} onChange={e => setCardForm({ ...cardForm, buyDate: e.target.value })} /></div>
              </div>
              <button onClick={handleAddCard} className="btn-primary text-sm w-full">添加</button>
            </div>
          )}

          {sortedCards.length === 0 && (
            <div className="card text-center text-text-secondary py-8">尚未添加该球员的卡片。点击「+ 添加卡片」开始记录。</div>
          )}

          {sortedCards.map(card => {
            const lines = calcLines(card.costPrice);
            const cardPnl = (card.currentEstimate - card.costPrice) * card.count;
            if (editingCard?.id === card.id) {
              return (
                <div key={card.id} className="card border-2 border-text-primary space-y-3">
                  <h3 className="text-sm font-bold">编辑卡片</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div><label className="label">卡片类型</label>
                      <select className="select-field" value={editingCard.cardType} onChange={e => setEditingCard({ ...editingCard, cardType: e.target.value as CardType })}>
                        <option value="base">Base</option><option value="numbered-26-99">编号 26-99</option><option value="numbered-25-under">编号 ≤25</option><option value="auto">签字</option><option value="patch">Patch</option>
                      </select></div>
                    <div><label className="label">编号</label><input className="input-field" value={editingCard.cardNumber} onChange={e => setEditingCard({ ...editingCard, cardNumber: e.target.value })} /></div>
                    <div><label className="label">成本 (¥)</label><input className="input-field" type="number" value={editingCard.costPrice || ''} onChange={e => setEditingCard({ ...editingCard, costPrice: parseInt(e.target.value) || 0 })} /></div>
                    <div><label className="label">张数</label><input className="input-field" type="number" value={editingCard.count} onChange={e => setEditingCard({ ...editingCard, count: parseInt(e.target.value) || 1 })} /></div>
                    <div><label className="label">估值 (¥)</label><input className="input-field" type="number" value={editingCard.currentEstimate || ''} onChange={e => setEditingCard({ ...editingCard, currentEstimate: parseInt(e.target.value) || 0 })} /></div>
                    <div><label className="label">日期</label><input className="input-field" type="date" value={editingCard.buyDate} onChange={e => setEditingCard({ ...editingCard, buyDate: e.target.value })} /></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleEditCard} className="btn-primary text-sm">保存</button>
                    <button onClick={() => setEditingCard(null)} className="btn-secondary text-sm">取消</button>
                  </div>
                </div>
              );
            }
            return (
              <div key={card.id} className="card">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{card.cardType === 'numbered-25-under' ? '低编签字 ≤25' : card.cardType === 'numbered-26-99' ? '编号 26–99' : card.cardType === 'auto' ? '签字' : card.cardType === 'patch' ? 'Patch' : 'Base'}</span>
                      {card.cardNumber && <span className="text-xs text-text-secondary">#{card.cardNumber}</span>}
                      <span className="badge text-xs">×{SCARCITY_MULTIPLIERS[card.cardType] ?? 1.0}</span>
                    </div>
                    <div className="text-xs text-text-secondary mt-1">
                      {card.buyDate} · ¥{card.costPrice.toLocaleString()} × {card.count} · 估值 ¥{card.currentEstimate.toLocaleString()}
                    </div>
                    <div className="text-xs mt-1"><span className={cardPnl >= 0 ? 'text-success' : 'text-danger'}>{cardPnl >= 0 ? '+' : ''}¥{cardPnl.toLocaleString()}</span></div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setEditingCard({ ...card })} className="text-xs btn-secondary">编辑</button>
                    <button onClick={() => handleDeleteCard(card.id)} className="text-xs text-danger">删除</button>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs bg-gray-50 rounded p-2">
                  <div><span className="text-text-secondary">目标止盈: </span><span className="font-mono text-success font-semibold">¥{lines.stopProfit.toLocaleString()}</span></div>
                  <div><span className="text-text-secondary">强制止盈: </span><span className="font-mono text-warning font-semibold">¥{lines.forcedProfit.toLocaleString()}</span></div>
                  <div><span className="text-text-secondary">止损: </span><span className="font-mono text-danger font-semibold">¥{lines.stopLoss.toLocaleString()}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========== 赛季 Tab ========== */}
      {tab === 'seasons' && (
        <div className="space-y-4">
          {/* 成长评分 */}
          {growth && (
            <div className={`card border-2 ${
              growth.score >= 30 ? 'border-success/50 bg-success/5' :
              growth.score >= 10 ? 'border-blue-300 bg-blue-50' :
              growth.score >= -10 ? 'border-border' :
              'border-danger/50 bg-danger/5'
            }`}>
              <h3 className="text-sm font-bold mb-2">📊 成长趋势评分</h3>
              <div className="text-2xl font-bold mb-2">{growth.label}</div>
              <div className="text-xs text-text-secondary space-y-1">
                {growth.details.map((d, i) => <div key={i}>• {d}</div>)}
              </div>
              <div className="text-xs text-text-secondary mt-2">
                基于最近两个赛季 ({sortedSeasons[sortedSeasons.length - 2]?.season} → {sortedSeasons[sortedSeasons.length - 1]?.season}) 对比
              </div>
            </div>
          )}

          <button onClick={() => { setShowSeasonForm(!showSeasonForm); setSeasonForm({ ...EMPTY_SEASON }); }}
            className="btn-primary text-sm">{showSeasonForm ? '取消' : '+ 添加赛季'}</button>

          {showSeasonForm && (
            <div className="card border-2 space-y-3">
              <h3 className="text-sm font-bold">添加赛季数据</h3>
              <div>
                <label className="label">赛季 (如 2024-25)</label>
                <input className="input-field" value={seasonForm.season}
                  onChange={e => setSeasonForm({ ...seasonForm, season: e.target.value })} placeholder="2024-25" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div><label className="label">出场次数</label><input className="input-field" type="number" value={seasonForm.appearances || ''} onChange={e => setSeasonForm({ ...seasonForm, appearances: parseInt(e.target.value) || 0 })} /></div>
                <div><label className="label">首发次数</label><input className="input-field" type="number" value={seasonForm.starts || ''} onChange={e => setSeasonForm({ ...seasonForm, starts: parseInt(e.target.value) || 0 })} /></div>
                <div><label className="label">出场分钟</label><input className="input-field" type="number" value={seasonForm.minutes || ''} onChange={e => setSeasonForm({ ...seasonForm, minutes: parseInt(e.target.value) || 0 })} /></div>
                <div><label className="label">进球</label><input className="input-field" type="number" value={seasonForm.goals || ''} onChange={e => setSeasonForm({ ...seasonForm, goals: parseInt(e.target.value) || 0 })} /></div>
                <div><label className="label">助攻</label><input className="input-field" type="number" value={seasonForm.assists || ''} onChange={e => setSeasonForm({ ...seasonForm, assists: parseInt(e.target.value) || 0 })} /></div>
                <div><label className="label">球队总进球</label><input className="input-field" type="number" value={seasonForm.teamTotalGoals || ''} onChange={e => setSeasonForm({ ...seasonForm, teamTotalGoals: parseInt(e.target.value) || 0 })} /></div>
                <div><label className="label">关键传球总数</label><input className="input-field" type="number" value={seasonForm.keyPasses || ''} onChange={e => setSeasonForm({ ...seasonForm, keyPasses: parseInt(e.target.value) || 0 })} /></div>
                <div><label className="label">射门总数</label><input className="input-field" type="number" value={seasonForm.shots || ''} onChange={e => setSeasonForm({ ...seasonForm, shots: parseInt(e.target.value) || 0 })} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="label">当前身价 (万欧)</label><input className="input-field" type="number" value={seasonForm.currentMarketValue || ''} onChange={e => setSeasonForm({ ...seasonForm, currentMarketValue: parseInt(e.target.value) || 0 })} /></div>
                <div><label className="label">12月前身价</label><input className="input-field" type="number" value={seasonForm.marketValue12m || ''} onChange={e => setSeasonForm({ ...seasonForm, marketValue12m: parseInt(e.target.value) || 0 })} /></div>
                <div><label className="label">历史最高身价</label><input className="input-field" type="number" value={seasonForm.marketValuePeak || ''} onChange={e => setSeasonForm({ ...seasonForm, marketValuePeak: parseInt(e.target.value) || 0 })} /></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ['bigMatchPerformance', '强队表现', [['no-record','无记录'],['average','普通'],['contributed','有贡献'],['standout','亮眼']]],
                  ['nationalTeamStatus', '国家队', [['none','未入选'],['youth','青年队'],['senior-rotation','轮换'],['senior-starter','主力']]],
                  ['mediaSentiment', '媒体评价', [['negative','负面'],['mixed','褒贬不一'],['positive','正向'],['strong-positive','强烈看好']]],
                  ['transferRumors', '转会传闻', [['none','无'],['rumor','小道消息'],['media-reported','媒体报道'],['official-contact','官方接触']]],
                ].map(([k, label, opts]) => (
                  <div key={k as string}>
                    <label className="label">{label as string}</label>
                    <select className="select-field" value={seasonForm[k as keyof SeasonData] as string}
                      onChange={e => setSeasonForm({ ...seasonForm, [k as keyof SeasonData]: e.target.value })}>
                      {(opts as string[][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <button onClick={handleAddSeason} className="btn-primary text-sm w-full">添加赛季</button>
            </div>
          )}

          {sortedSeasons.length === 0 && (
            <div className="card text-center text-text-secondary py-8">暂无赛季数据。添加多个赛季后可查看成长趋势。</div>
          )}

          {sortedSeasons.map((s, idx) => {
            const ga90 = s.minutes > 0 ? (((s.goals + s.assists) / s.minutes) * 90).toFixed(2) : '0';
            const kp90 = s.minutes > 0 ? ((s.keyPasses / s.minutes) * 90).toFixed(1) : '0';
            return (
              <div key={idx} className="card">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-text-primary">{s.season}</span>
                  <button onClick={() => handleDeleteSeason(idx)} className="text-xs text-danger">删除</button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs text-text-secondary">
                  <div>出场: {s.appearances}场 ({s.starts}首发)</div>
                  <div>分钟: {s.minutes}</div>
                  <div>G+A: {s.goals}+{s.assists} <span className="font-mono">({ga90}/90)</span></div>
                  <div>关键传球: {s.keyPasses} <span className="font-mono">({kp90}/90)</span></div>
                  <div>射门: {s.shots}</div>
                  <div>身价: {s.currentMarketValue}万欧</div>
                  <div>强队表现: {s.bigMatchPerformance}</div>
                  <div>国家队: {s.nationalTeamStatus}</div>
                  <div>媒体: {s.mediaSentiment}</div>
                  <div>转会: {s.transferRumors}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
