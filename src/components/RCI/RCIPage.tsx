import { useState, useEffect } from 'react';
import type { RCIData, RCIAnchorCard, League } from '../../types';
import { useRCI } from '../../hooks/useRCI';
import { loadRCI, saveRCI, generateId } from '../../utils/storage';
import { RCI_TEMPERATURE_CONFIG, LEAGUE_LABELS } from '../../constants';
import { parsePriceHistory, calcHistoricalAverage } from '../../utils/rci';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function RCIPage() {
  const { rci, updateRCI } = useRCI();
  const [showAnchorForm, setShowAnchorForm] = useState(false);
  const [importText, setImportText] = useState('');
  const [importTargetId, setImportTargetId] = useState('');
  const [anchorForm, setAnchorForm] = useState({
    playerName: '',
    cardName: '',
    league: 'premier-league' as League,
    weight: 20,
  });
  const [weeklyData, setWeeklyData] = useState<{ week: string; value: number }[]>([]);

  useEffect(() => {
    // Generate weekly chart data from anchor cards
    const data: { week: string; value: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const weekStr = `${d.getMonth() + 1}/${d.getDate()}`;
      let val = 0;
      let cnt = 0;
      for (const card of rci.anchorCards) {
        const prices = card.priceHistory.filter(p => {
          const pd = new Date(p.date);
          return Math.abs(pd.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
        });
        if (prices.length > 0) {
          val += prices.reduce((s, p) => s + p.price, 0) / prices.length;
          cnt++;
        }
      }
      data.push({ week: weekStr, value: cnt > 0 ? Math.round(val / cnt) : 0 });
    }
    setWeeklyData(data);
  }, [rci]);

  const tempConfig = RCI_TEMPERATURE_CONFIG[rci.temperature];

  const handleAddAnchor = () => {
    if (!anchorForm.playerName) return;
    const newCard: RCIAnchorCard = {
      id: generateId(),
      playerName: anchorForm.playerName,
      cardName: anchorForm.cardName,
      league: anchorForm.league,
      weight: anchorForm.weight,
      priceHistory: [],
    };
    const updated = { ...rci, anchorCards: [...rci.anchorCards, newCard] };
    updateRCI(updated);
    setAnchorForm({ playerName: '', cardName: '', league: 'premier-league', weight: 20 });
    setShowAnchorForm(false);
  };

  const handleRemoveAnchor = (id: string) => {
    const updated = { ...rci, anchorCards: rci.anchorCards.filter(c => c.id !== id) };
    updateRCI(updated);
  };

  const handleUpdateWeight = (id: string, weight: number) => {
    const updated = {
      ...rci,
      anchorCards: rci.anchorCards.map(c => c.id === id ? { ...c, weight } : c),
    };
    updateRCI(updated);
  };

  const handleImportHistory = () => {
    if (!importText.trim() || !importTargetId) return;
    const parsed = parsePriceHistory(importText);
    if (parsed.length === 0) {
      alert('未能解析到有效数据，请检查格式');
      return;
    }
    const updated = {
      ...rci,
      anchorCards: rci.anchorCards.map(c =>
        c.id === importTargetId
          ? { ...c, priceHistory: [...c.priceHistory, ...parsed] }
          : c
      ),
    };
    updateRCI(updated);
    setImportText('');
    setImportTargetId('');
    alert(`成功导入 ${parsed.length} 条记录`);
  };

  const handleManualPrice = (cardId: string) => {
    const price = prompt('输入最新成交均价 (¥):');
    const date = prompt('日期 (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
    if (price && date) {
      const updated = {
        ...rci,
        anchorCards: rci.anchorCards.map(c =>
          c.id === cardId
            ? { ...c, priceHistory: [...c.priceHistory, { date, price: parseInt(price) }] }
            : c
        ),
      };
      updateRCI(updated);
    }
  };

  const historicalAvg = calcHistoricalAverage(rci.anchorCards);

  // Chart data for the thermometer display
  const tempBands = [
    { label: '极冷', range: '0–20%', color: 'bg-[#3d5f8a]' },
    { label: '偏冷', range: '20–40%', color: 'bg-[#5f85b0]' },
    { label: '正常', range: '40–60%', color: 'bg-[#7a7d82]' },
    { label: '偏热', range: '60–80%', color: 'bg-[#c49260]' },
    { label: '极热', range: '80–100%', color: 'bg-[#c06858]' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">RCI 市场温度指数</h1>

      {/* 温度计仪表盘 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold">RCI 温度计</h3>
          <span className={`px-3 py-1 rounded-full text-white text-sm font-bold ${tempConfig.bgClass}`}>
            {tempConfig.label}
          </span>
        </div>

        {/* 温度条 */}
        <div className="flex h-8 rounded-full overflow-hidden mb-2">
          {tempBands.map((band, i) => (
            <div key={i} className={`${band.color} flex-1 flex items-center justify-center text-white text-xs font-medium`}>
              {band.label}
            </div>
          ))}
        </div>

        {/* 指针 */}
        <div className="relative h-4 mb-3">
          <div
            className="absolute top-0 w-0.5 h-4 bg-text-primary transition-all duration-500"
            style={{ left: `${rci.percentile}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-text-secondary">当前指数值</div>
            <div className="text-2xl font-bold font-mono">¥{rci.currentIndex.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-text-secondary">历史均值</div>
            <div className="text-2xl font-bold font-mono">¥{historicalAvg.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-text-secondary">当前百分位</div>
            <div className="text-2xl font-bold font-mono">{rci.percentile}%</div>
          </div>
        </div>

        {/* 操作影响提示 */}
        <div className="mt-3 p-3 bg-white/5 rounded-lg text-xs text-text-secondary space-y-1">
          {rci.temperature === 'extreme-cold' && (
            <>
              <div>• 市场低迷，建仓安全边际高</div>
              <div>• 新卡出手需降低预期，耐心等待</div>
              <div>• 止损线可放宽 5–10%</div>
            </>
          )}
          {rci.temperature === 'cool' && (
            <>
              <div>• 低于历史均值，适合建仓</div>
              <div>• 卖出适当下调目标价</div>
            </>
          )}
          {rci.temperature === 'normal' && (
            <div>• 市场均衡，按评分正常决策</div>
          )}
          {rci.temperature === 'warm' && (
            <>
              <div>• 高于历史均值，买入需谨慎</div>
              <div>• 止盈线可适当下调提前兑现</div>
            </>
          )}
          {rci.temperature === 'extreme-hot' && (
            <>
              <div>• 情绪溢价显著，持仓门槛提至 85 分</div>
              <div>• 持仓优先考虑出手</div>
            </>
          )}
        </div>
      </div>

      {/* 12 周走势图 */}
      <div className="card">
        <h3 className="text-sm font-bold mb-3">过去12周指数走势</h3>
        {weeklyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyData}>
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={60} />
              <Tooltip
                formatter={(value: number) => [`¥${value.toLocaleString()}`, '指数值']}
              />
              <ReferenceLine y={historicalAvg} stroke="#9ca3af" strokeDasharray="5 5" label={{ value: '历史均值', fontSize: 10 }} />
              <Line type="monotone" dataKey="value" stroke="#1a1a2e" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-text-secondary py-8 text-sm">暂无数据，请先添加锚点卡和价格历史</div>
        )}
      </div>

      {/* 锚点卡管理 */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold">锚点卡成分 ({rci.anchorCards.length}/8)</h3>
          <button onClick={() => setShowAnchorForm(!showAnchorForm)} className="btn-primary text-xs">
            {showAnchorForm ? '取消' : '+ 添加锚点卡'}
          </button>
        </div>

        {showAnchorForm && (
          <div className="mb-4 p-3 bg-white/5 rounded-lg space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input className="input-field" placeholder="球员姓名" value={anchorForm.playerName}
                onChange={e => setAnchorForm({ ...anchorForm, playerName: e.target.value })} />
              <input className="input-field" placeholder="卡片名称 (如: Topps Chrome /99)" value={anchorForm.cardName}
                onChange={e => setAnchorForm({ ...anchorForm, cardName: e.target.value })} />
              <select className="select-field" value={anchorForm.league}
                onChange={e => setAnchorForm({ ...anchorForm, league: e.target.value as League })}>
                {Object.entries(LEAGUE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <div>
                <label className="label text-xs">权重 (%)</label>
                <input className="input-field" type="number" value={anchorForm.weight}
                  onChange={e => setAnchorForm({ ...anchorForm, weight: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
            <button onClick={handleAddAnchor} className="btn-primary text-xs w-full">添加</button>
          </div>
        )}

        {rci.anchorCards.map(card => {
          const latestPrice = card.priceHistory.length > 0
            ? card.priceHistory[card.priceHistory.length - 1].price
            : null;
          return (
            <div key={card.id} className="border border-border rounded-lg p-3 mb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-semibold text-sm">{card.playerName} · {card.cardName}</div>
                  <div className="text-xs text-text-secondary">
                    {LEAGUE_LABELS[card.league]} · 数据点: {card.priceHistory.length}
                    {latestPrice && <span className="ml-2">最新: ¥{latestPrice.toLocaleString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-text-secondary">权重</span>
                    <input className="input-field w-16 text-xs py-1" type="number"
                      value={card.weight} min={0} max={100}
                      onChange={e => handleUpdateWeight(card.id, parseInt(e.target.value) || 0)} />
                    <span className="text-xs">%</span>
                  </div>
                  <button onClick={() => handleManualPrice(card.id)} className="text-xs btn-secondary">+价格</button>
                  <button onClick={() => handleRemoveAnchor(card.id)} className="text-xs text-danger">删除</button>
                </div>
              </div>

              {/* 价格历史展示 */}
              {card.priceHistory.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {card.priceHistory.slice(-10).map((p, i) => (
                    <span key={i} className="text-xs bg-white/10 px-2 py-0.5 rounded font-mono">
                      {p.date}: ¥{p.price}
                    </span>
                  ))}
                  {card.priceHistory.length > 10 && (
                    <span className="text-xs text-text-secondary">...等 {card.priceHistory.length} 条</span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {rci.anchorCards.length === 0 && (
          <div className="text-center text-text-secondary py-8 text-sm">
            尚未添加锚点卡。选择 5–8 张流动性高的固定球星卡作为指数成分。
          </div>
        )}
      </div>

      {/* 历史数据导入 */}
      <div className="card">
        <h3 className="text-sm font-bold mb-3">批量导入历史成交数据</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <select className="select-field" value={importTargetId}
            onChange={e => setImportTargetId(e.target.value)}>
            <option value="">选择目标锚点卡</option>
            {rci.anchorCards.map(c => (
              <option key={c.id} value={c.id}>{c.playerName} · {c.cardName}</option>
            ))}
          </select>
        </div>
        <textarea
          className="input-field h-32 mb-2 font-mono text-xs"
          value={importText}
          onChange={e => setImportText(e.target.value)}
          placeholder={`粘贴历史成交记录，每行一条：

2024-01-15 ¥500
2024-02-01 ¥520
1月20日 480元
2024/03/01 550

支持多种日期格式`}
        />
        <button onClick={handleImportHistory} disabled={!importText.trim() || !importTargetId}
          className="btn-primary text-sm">
          解析并导入
        </button>
        <p className="text-xs text-text-secondary mt-2">
          建议至少30个数据点，覆盖6个月以上以建立可靠基准线
        </p>
      </div>
    </div>
  );
}
