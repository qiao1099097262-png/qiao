import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PlayerHolding, TargetPlayer, League, Position } from '../../types';
import { useRCI } from '../../hooks/useRCI';
import { loadPlayerHoldings, savePlayerHoldings, updatePlayerHolding, removePlayerHolding, loadTargets, saveTargets, addTarget, generateId } from '../../utils/storage';
import { LEAGUE_LABELS, SCARCITY_MULTIPLIERS } from '../../constants';
import type { CardType } from '../../types';
import { StatusBadge, MetricCard } from '../Common';

export default function PositionPage() {
  const { rci } = useRCI();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<PlayerHolding[]>([]);
  const [targets, setTargets] = useState<TargetPlayer[]>([]);
  const [tab, setTab] = useState<'holdings' | 'targets'>('holdings');
  const [editingTarget, setEditingTarget] = useState<Partial<TargetPlayer> | null>(null);
  const [showTargetForm, setShowTargetForm] = useState(false);

  useEffect(() => {
    setPlayers(loadPlayerHoldings());
    setTargets(loadTargets());
  }, []);

  const refresh = () => {
    setPlayers(loadPlayerHoldings());
    setTargets(loadTargets());
  };

  // 计算球员级别的聚合数据
  const getPlayerAggregates = (p: PlayerHolding) => {
    const totalInvested = p.cards.reduce((s, c) => s + c.costPrice * c.count, 0);
    const totalEstimated = p.cards.reduce((s, c) => s + c.currentEstimate * c.count, 0);
    const pnl = totalEstimated - totalInvested;
    const pnlPct = totalInvested > 0 ? ((pnl / totalInvested) * 100).toFixed(1) : '0';
    const cardCount = p.cards.reduce((s, c) => s + c.count, 0);
    return { totalInvested, totalEstimated, pnl, pnlPct, cardCount };
  };

  // 全部球员总投入（用于占比计算）
  const grandTotal = players.reduce((s, p) => s + getPlayerAggregates(p).totalInvested, 0);

  const totalInvestedAll = players.reduce((s, p) => s + getPlayerAggregates(p).totalInvested, 0);
  const totalEstimatedAll = players.reduce((s, p) => s + getPlayerAggregates(p).totalEstimated, 0);
  const totalPnlAll = totalEstimatedAll - totalInvestedAll;
  const pnlPctAll = totalInvestedAll > 0 ? ((totalPnlAll / totalInvestedAll) * 100).toFixed(1) : '0';
  const totalCards = players.reduce((s, p) => s + getPlayerAggregates(p).cardCount, 0);
  const warningCount = players.filter(p => p.status !== 'holding').length;

  const handleDeletePlayer = (id: string, name: string) => {
    if (confirm(`确认删除 ${name} 的全部持仓记录？`)) {
      removePlayerHolding(id);
      refresh();
    }
  };

  const handleSaveTarget = () => {
    if (!editingTarget?.name) return;
    if (editingTarget.id) {
      const updated = targets.map(t => t.id === editingTarget.id ? { ...t, ...editingTarget } as TargetPlayer : t);
      saveTargets(updated);
    } else {
      addTarget({
        id: generateId(),
        name: editingTarget.name || '',
        position: editingTarget.position || 'ST',
        league: editingTarget.league || 'other',
        team: editingTarget.team || '',
        priceHistory: editingTarget.priceHistory || {
          entry: { low: 0, high: 0 },
          early: { low: 0, high: 0 },
          breakout: { low: 0, high: 0 },
          peak: { low: 0, high: 0 },
        },
        notes: editingTarget.notes || '',
      });
    }
    setShowTargetForm(false);
    setEditingTarget(null);
    refresh();
  };

  // 根据评分结果计算卡的实际止盈止损价格
  const calcCardLines = (p: PlayerHolding, cardCost: number) => {
    if (!p.ratingResult) return { stopProfit: 0, forcedProfit: 0, stopLoss: 0 };
    const r = p.ratingResult;
    return {
      stopProfit: Math.round(cardCost * r.stopProfitMultiplier),
      forcedProfit: Math.round(cardCost * r.forcedStopProfitMultiplier),
      stopLoss: Math.round(cardCost * r.stopLossMultiplier),
    };
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">仓位管理 & 持仓追踪</h1>

      {rci.temperature === 'extreme-hot' && (
        <div className="banner-warning text-sm">⚠️ 当前市场偏热 (百分位 {rci.percentile}%)，优先考虑止盈</div>
      )}

      {/* 仓位总览指标卡 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <MetricCard label="总投入" value={`¥${totalInvestedAll.toLocaleString()}`} />
        <MetricCard label="当前总估值" value={`¥${totalEstimatedAll.toLocaleString()}`} />
        <MetricCard
          label="整体浮盈/浮亏"
          value={`${totalPnlAll >= 0 ? '+' : ''}¥${totalPnlAll.toLocaleString()}`}
          sub={`${pnlPctAll}%`}
          colorClass={totalPnlAll >= 0 ? 'text-success' : 'text-danger'}
        />
        <MetricCard label="持卡总数" value={totalCards} />
        <MetricCard
          label="触发警示"
          value={warningCount}
          colorClass={warningCount > 0 ? 'text-warning' : ''}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab('holdings')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'holdings' ? 'bg-text-primary text-white' : 'btn-secondary'}`}
        >
          球员持仓
        </button>
        <button
          onClick={() => setTab('targets')}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'targets' ? 'bg-text-primary text-white' : 'btn-secondary'}`}
        >
          Target 数据库
        </button>
      </div>

      {/* 球员持仓列表 */}
      {tab === 'holdings' && (
        <div className="space-y-3">
          {players.length === 0 && (
            <div className="card text-center text-text-secondary py-12">
              暂无持仓记录。前往「球员评级」页面添加。
            </div>
          )}
          {players.map(p => {
            const agg = getPlayerAggregates(p);
            const ratio = grandTotal > 0 ? ((agg.totalInvested / grandTotal) * 100).toFixed(1) : '0';

            return (
              <div
                key={p.id}
                onClick={() => navigate(`/positions/${p.id}`)}
                className={`card cursor-pointer hover:shadow-md transition-shadow ${
                  p.status === 'sell-window' ? 'border-warning/50 bg-warning/5' :
                  p.status === 'stop-loss-warning' ? 'border-danger/50 bg-danger/5' : ''
                }`}
              >
                <div className="flex items-start justify-between flex-wrap gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-primary text-lg">{p.playerName}</span>
                    {p.ratingResult && <StatusBadge status={p.ratingResult.tier} />}
                    <StatusBadge status={p.status} />
                    {p.isRookie && <span className="badge bg-blue-100 text-blue-700">新秀</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text-secondary">
                      {agg.cardCount} 张卡
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeletePlayer(p.id, p.playerName); }}
                      className="text-xs text-danger hover:underline"
                    >
                      删除
                    </button>
                  </div>
                </div>

                {/* 评级分数 */}
                {p.ratingResult && (
                  <div className="text-xs text-text-secondary mb-2">
                    评级: <span className="font-bold font-mono text-text-primary">{p.ratingResult.totalScore}/100</span>
                  </div>
                )}

                {/* 金额汇总 */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-text-secondary">总投入</div>
                    <div className="font-mono font-semibold">¥{agg.totalInvested.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-secondary">当前估值</div>
                    <div className="font-mono font-semibold">¥{agg.totalEstimated.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-xs text-text-secondary">浮盈/浮亏</div>
                    <div className={`font-mono font-semibold ${agg.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                      {agg.pnl >= 0 ? '+' : ''}¥{agg.pnl.toLocaleString()}
                      <span className="text-xs ml-1">({agg.pnlPct}%)</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-text-secondary">持仓占比</div>
                    <div className="font-mono font-semibold">{ratio}%</div>
                  </div>
                </div>

                {/* 止盈止损线（取均价） */}
                {p.ratingResult && agg.cardCount > 0 && (
                  <div className="mt-2 flex gap-3 text-xs text-text-secondary">
                    <span>目标止盈: <span className="text-success font-semibold">×{p.ratingResult.stopProfitMultiplier}</span></span>
                    <span>强制止盈: <span className="text-warning font-semibold">×{p.ratingResult.forcedStopProfitMultiplier.toFixed(2)}</span></span>
                    <span>止损: <span className="text-danger font-semibold">×{p.ratingResult.stopLossMultiplier}</span></span>
                  </div>
                )}

                {/* 提示: 无卡时的引导 */}
                {agg.cardCount === 0 && (
                  <div className="text-xs text-text-secondary mt-2 italic">
                    点击进入添加该球员的卡片记录
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Target 数据库 */}
      {tab === 'targets' && (
        <div className="space-y-3">
          <button
            onClick={() => { setEditingTarget({}); setShowTargetForm(true); }}
            className="btn-primary text-sm"
          >
            + 添加参照球员
          </button>

          {showTargetForm && editingTarget && (
            <div className="card space-y-3">
              <h3 className="text-sm font-bold">{editingTarget.id ? '编辑' : '新增'} Target 球员</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">球员名</label>
                  <input className="input-field" value={editingTarget.name || ''}
                    onChange={e => setEditingTarget({ ...editingTarget, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">位置</label>
                  <select className="select-field" value={editingTarget.position || 'ST'}
                    onChange={e => setEditingTarget({ ...editingTarget, position: e.target.value as Position })}>
                    {['GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST','CF'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">联赛</label>
                  <select className="select-field" value={editingTarget.league || 'other'}
                    onChange={e => setEditingTarget({ ...editingTarget, league: e.target.value as League })}>
                    {Object.entries(LEAGUE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">球队</label>
                  <input className="input-field" value={editingTarget.team || ''}
                    onChange={e => setEditingTarget({ ...editingTarget, team: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['entry','early','breakout','peak'].map(stage => (
                  <div key={stage}>
                    <label className="label">{stage === 'entry' ? '出道期' : stage === 'early' ? '突破期' : stage === 'breakout' ? '成名期' : '顶峰期'} (¥)</label>
                    <div className="flex gap-1">
                      <input className="input-field" type="number" placeholder="低"
                        value={editingTarget.priceHistory?.[stage as keyof typeof editingTarget.priceHistory]?.low || 0}
                        onChange={e => setEditingTarget({
                          ...editingTarget,
                          priceHistory: {
                            ...editingTarget.priceHistory!,
                            [stage]: { ...editingTarget.priceHistory?.[stage as keyof typeof editingTarget.priceHistory] || { low: 0, high: 0 }, low: parseInt(e.target.value) || 0 }
                          }
                        })} />
                      <input className="input-field" type="number" placeholder="高"
                        value={editingTarget.priceHistory?.[stage as keyof typeof editingTarget.priceHistory]?.high || 0}
                        onChange={e => setEditingTarget({
                          ...editingTarget,
                          priceHistory: {
                            ...editingTarget.priceHistory!,
                            [stage]: { ...editingTarget.priceHistory?.[stage as keyof typeof editingTarget.priceHistory] || { low: 0, high: 0 }, high: parseInt(e.target.value) || 0 }
                          }
                        })} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveTarget} className="btn-primary text-sm">保存</button>
                <button onClick={() => { setShowTargetForm(false); setEditingTarget(null); }} className="btn-secondary text-sm">取消</button>
              </div>
            </div>
          )}

          <div className="grid gap-3">
            {targets.map(t => (
              <div key={t.id} className="card flex items-start justify-between">
                <div>
                  <div className="font-semibold text-text-primary">{t.name} <span className="text-xs text-text-secondary">{t.position} · {LEAGUE_LABELS[t.league]} · {t.team}</span></div>
                  <div className="text-xs text-text-secondary mt-1 space-x-2">
                    <span>出道期: ¥{t.priceHistory.entry.low}–{t.priceHistory.entry.high}</span>
                    <span>突破期: ¥{t.priceHistory.early.low}–{t.priceHistory.early.high}</span>
                    <span>成名期: ¥{t.priceHistory.breakout.low}–{t.priceHistory.breakout.high}</span>
                    <span>顶峰期: ¥{t.priceHistory.peak.low}–{t.priceHistory.peak.high}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => { setEditingTarget(t); setShowTargetForm(true); }} className="text-xs btn-secondary">编辑</button>
                </div>
              </div>
            ))}
            {targets.length === 0 && (
              <div className="card text-center text-text-secondary py-8">暂无 Target 参照球员</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
