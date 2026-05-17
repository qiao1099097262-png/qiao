import { useState, useEffect } from 'react';
import type { TradeRecord, EventType, DecisionQuality, TargetReview } from '../../types';
import { loadTrades, saveTrades, addTrade, generateId, loadSettings, saveSettings } from '../../utils/storage';
import { EVENT_TYPE_CONFIG } from '../../constants';
import { calcDecisionQuality } from '../../utils/stopLoss';
import { StatusBadge } from '../Common';

export default function TradePage() {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showReview, setShowReview] = useState<string | null>(null); // trade id being reviewed
  const [settings, setSettings] = useState(loadSettings());
  const [form, setForm] = useState({
    type: 'buy' as 'buy' | 'sell',
    playerName: '',
    cardInfo: '',
    price: 0,
    count: 1,
    reason: '',
    triggerEventType: '' as EventType | '',
    trackAfterSell: false,
  });

  useEffect(() => {
    setTrades(loadTrades());
  }, []);

  const refresh = () => setTrades(loadTrades());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trade: TradeRecord = {
      id: generateId(),
      type: form.type,
      date: new Date().toISOString(),
      playerName: form.playerName,
      cardInfo: form.cardInfo,
      price: form.price,
      count: form.count,
      buyReason: form.type === 'buy' ? form.reason : undefined,
      sellReason: form.type === 'sell' ? form.reason : undefined,
      triggerEventType: (form.triggerEventType ? form.triggerEventType : undefined) as EventType | undefined,
      trackAfterSell: form.type === 'sell' ? form.trackAfterSell : false,
    };
    addTrade(trade);
    setForm({ type: 'buy', playerName: '', cardInfo: '', price: 0, count: 1, reason: '', triggerEventType: '', trackAfterSell: false });
    setShowForm(false);
    refresh();
  };

  const handleDecisionReview = (tradeId: string) => {
    const hasTriggerEvent = confirm('卖出时是否有明确触发事件？') ? true : false;
    const priceChoice = prompt('卖出价是否在预设目标区间内？\n1=是 2=否 3=超出 4=未达到', '1');
    const priceMap: Record<string, 'yes' | 'no' | 'above' | 'below'> = { '1': 'yes', '2': 'no', '3': 'above', '4': 'below' };
    const priceInTargetRange = priceMap[priceChoice || '1'] || 'yes';
    const followed24h = confirm('是否按规则执行了24小时决策窗口？') ? true : false;

    const quality = calcDecisionQuality(hasTriggerEvent, priceInTargetRange, followed24h);

    const wasCorrect: 'correct' | 'overestimated' | 'underestimated' = confirm('当初参照的 Target 球员选对了吗？\n"确定"=选对 "取消"=偏高估') ? 'correct' : 'overestimated';
    const actualRef = wasCorrect !== 'correct' ? prompt('实际应参照哪个球员？') : undefined;

    const updatedTrades = trades.map(t => {
      if (t.id === tradeId) {
        return {
          ...t,
          decisionQuality: quality,
          targetReview: { wasCorrect, actualReference: actualRef || undefined },
        };
      }
      return t;
    });
    saveTrades(updatedTrades);
    refresh();
  };

  const handleToggleTrackSold = () => {
    const newSettings = { ...settings, trackSoldCards: !settings.trackSoldCards };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // 统计
  const buyTrades = trades.filter(t => t.type === 'buy');
  const sellTrades = trades.filter(t => t.type === 'sell');
  const totalBuy = buyTrades.reduce((s, t) => s + t.price * t.count, 0);
  const totalSell = sellTrades.reduce((s, t) => s + t.price * t.count, 0);
  const totalPnl = totalSell - totalBuy;

  // Target 准确率统计
  const reviewedTrades = trades.filter(t => t.targetReview);
  const correctTargets = reviewedTrades.filter(t => t.targetReview?.wasCorrect === 'correct').length;
  const targetAccuracy = reviewedTrades.length > 0 ? Math.round((correctTargets / reviewedTrades.length) * 100) : null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">交易记录 & 复盘</h1>

      {/* 统计总览 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card">
          <div className="text-xs text-text-secondary">总买入金额</div>
          <div className="text-lg font-bold font-mono">¥{totalBuy.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="text-xs text-text-secondary">总卖出金额</div>
          <div className="text-lg font-bold font-mono">¥{totalSell.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="text-xs text-text-secondary">累计盈亏</div>
          <div className={`text-lg font-bold font-mono ${totalPnl >= 0 ? 'text-success' : 'text-danger'}`}>
            {totalPnl >= 0 ? '+' : ''}¥{totalPnl.toLocaleString()}
          </div>
        </div>
        <div className="card">
          <div className="text-xs text-text-secondary">Target 准确率</div>
          <div className="text-lg font-bold font-mono text-text-primary">
            {targetAccuracy !== null ? `${targetAccuracy}%` : '—'}
          </div>
          <div className="text-xs text-text-secondary">{reviewedTrades.length} 次复盘</div>
        </div>
      </div>

      {/* 设置 & 新增 */}
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
          {showForm ? '取消' : '+ 记录交易'}
        </button>
        <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
          <input type="checkbox" checked={settings.trackSoldCards} onChange={handleToggleTrackSold} className="rounded" />
          追踪已卖出卡价格（仅复盘模块可见）
        </label>
      </div>

      {/* 交易表单 */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="label">类型</label>
              <select className="select-field" value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value as 'buy' | 'sell' })}>
                <option value="buy">买入</option>
                <option value="sell">卖出</option>
              </select>
            </div>
            <div>
              <label className="label">球员姓名</label>
              <input className="input-field" value={form.playerName}
                onChange={e => setForm({ ...form, playerName: e.target.value })} required />
            </div>
            <div>
              <label className="label">卡片信息</label>
              <input className="input-field" value={form.cardInfo}
                onChange={e => setForm({ ...form, cardInfo: e.target.value })} placeholder="如: Topps Chrome /25" />
            </div>
            <div>
              <label className="label">成交价 (¥)</label>
              <input className="input-field" type="number" value={form.price}
                onChange={e => setForm({ ...form, price: parseInt(e.target.value) || 0 })} required />
            </div>
            <div>
              <label className="label">张数</label>
              <input className="input-field" type="number" value={form.count}
                onChange={e => setForm({ ...form, count: parseInt(e.target.value) || 1 })} />
            </div>
            {form.type === 'sell' && (
              <div>
                <label className="label">触发事件类型</label>
                <select className="select-field" value={form.triggerEventType}
                  onChange={e => setForm({ ...form, triggerEventType: e.target.value as EventType | '' })}>
                  <option value="">无</option>
                  {Object.entries(EVENT_TYPE_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="label">{form.type === 'buy' ? '买入理由' : '卖出理由'}</label>
            <textarea className="input-field h-20" value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
              placeholder={form.type === 'buy' ? '为什么买入？参照了哪个 Target？' : '为什么卖出？是否触发止盈/止损？'} />
          </div>
          {form.type === 'sell' && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.trackAfterSell}
                onChange={e => setForm({ ...form, trackAfterSell: e.target.checked })} />
              卖出后继续追踪该卡价格
            </label>
          )}
          <button type="submit" className="btn-primary">记录</button>
        </form>
      )}

      {/* 交易列表 */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-text-primary">
          交易日志 ({trades.length})
        </h3>
        {trades.length === 0 && (
          <div className="card text-center text-text-secondary py-8">暂无交易记录</div>
        )}
        {trades.map(t => (
          <div key={t.id} className="card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`badge text-xs ${t.type === 'buy' ? 'badge-success' : 'badge-warning'}`}>
                    {t.type === 'buy' ? '买入' : '卖出'}
                  </span>
                  <span className="font-semibold text-sm">{t.playerName}</span>
                  <span className="text-xs text-text-secondary">{t.cardInfo}</span>
                </div>
                <div className="text-xs text-text-secondary mt-1">
                  {new Date(t.date).toLocaleDateString('zh-CN')} · ¥{t.price.toLocaleString()} × {t.count} · 
                  {t.buyReason && <span>理由: {t.buyReason}</span>}
                  {t.sellReason && <span>理由: {t.sellReason}</span>}
                  {t.triggerEventType && <span> · 触发: {EVENT_TYPE_CONFIG[t.triggerEventType]?.label}</span>}
                </div>

                {/* 决策质量 */}
                {t.decisionQuality && (
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <span className="text-text-secondary">决策质量:</span>
                    <span className={`font-bold font-mono text-lg ${
                      t.decisionQuality.grade === 'A' ? 'text-success' :
                      t.decisionQuality.grade === 'B' ? 'text-warning' : 'text-danger'
                    }`}>
                      {t.decisionQuality.grade}
                    </span>
                    <span className="text-text-secondary">
                      {t.decisionQuality.hasTriggerEvent ? '有触发事件' : '无触发事件'} · 
                      {t.decisionQuality.priceInTargetRange === 'yes' ? '区间内' : 
                       t.decisionQuality.priceInTargetRange === 'above' ? '超出' : 
                       t.decisionQuality.priceInTargetRange === 'below' ? '未达到' : '否'} · 
                      {t.decisionQuality.followed24hRule ? '遵守24h' : '未遵守24h'}
                    </span>
                  </div>
                )}

                {/* Target 复盘 */}
                {t.targetReview && (
                  <div className="mt-1 text-xs">
                    <span className="text-text-secondary">Target 评估: </span>
                    <span className={
                      t.targetReview.wasCorrect === 'correct' ? 'text-success' :
                      t.targetReview.wasCorrect === 'overestimated' ? 'text-warning' : 'text-danger'
                    }>
                      {t.targetReview.wasCorrect === 'correct' ? '选对 ✓' : 
                       t.targetReview.wasCorrect === 'overestimated' ? '偏高估' : '偏低估'}
                    </span>
                    {t.targetReview.actualReference && (
                      <span className="text-text-secondary"> → 应参照: {t.targetReview.actualReference}</span>
                    )}
                  </div>
                )}

                {/* 已卖出价格追踪 (仅复盘模块可见) */}
                {t.type === 'sell' && (t.trackAfterSell || settings.trackSoldCards) && (
                  <div className="mt-1 text-xs text-text-secondary italic">
                    卖出价: ¥{t.price.toLocaleString()} · 
                    <button onClick={() => {
                      const current = prompt('输入当前市场价 (¥):');
                      if (current) alert(`卖出价 ¥${t.price.toLocaleString()} vs 当前价 ¥${parseInt(current).toLocaleString()}\n\n决策质量: ${t.decisionQuality?.grade || '未评估'}\n\n提醒: 决策质量与最终结果分开看待`);
                    }} className="text-text-primary underline ml-1">
                      更新当前价对比
                    </button>
                  </div>
                )}
              </div>

              {t.type === 'sell' && !t.decisionQuality && (
                <button
                  onClick={() => handleDecisionReview(t.id)}
                  className="btn-secondary text-xs shrink-0"
                >
                  复盘评估
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
