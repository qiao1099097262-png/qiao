import { useState } from 'react';
import type { PlayerInputData, RatingResult } from '../../types';
import { calculateRating } from '../../utils/scoring';
import { parseRawPlayerData } from '../../utils/deepseek';
import { useRCI } from '../../hooks/useRCI';
import { generateId, addPlayerHolding, loadTargets } from '../../utils/storage';
import { LEAGUE_LABELS, TEAM_RANK_LABELS, SCARCITY_MULTIPLIERS } from '../../constants';
import { ScoreBar, StatusBadge, MetricCard } from '../Common';

type InputMode = 'form' | 'paste';

// 表单状态用字符串存储，避免显示 0
interface FormState {
  name: string; age: string; position: string; team: string; league: string; teamRank: string;
  appearances: string; starts: string; minutes: string; goals: string; assists: string; teamTotalGoals: string;
  keyPasses: string; shots: string;
  currentMarketValue: string; marketValue12m: string; marketValuePeak: string;
  bigMatchPerformance: string; nationalTeamStatus: string;
  mediaSentiment: string; transferRumors: string;
}

const EMPTY_FORM: FormState = {
  name: '', age: '', position: 'ST', team: '', league: 'premier-league', teamRank: 'mid',
  appearances: '', starts: '', minutes: '', goals: '', assists: '', teamTotalGoals: '',
  keyPasses: '', shots: '',
  currentMarketValue: '', marketValue12m: '', marketValuePeak: '',
  bigMatchPerformance: 'no-record', nationalTeamStatus: 'none',
  mediaSentiment: 'mixed', transferRumors: 'none',
};

// 将字符串表单转为数值对象
function formToData(f: FormState): PlayerInputData {
  const num = (s: string) => parseFloat(s) || 0;
  return {
    name: f.name, age: num(f.age) || 18, position: f.position as PlayerInputData['position'],
    team: f.team, league: f.league as PlayerInputData['league'], teamRank: f.teamRank as PlayerInputData['teamRank'],
    appearances: num(f.appearances), starts: num(f.starts), minutes: num(f.minutes),
    goals: num(f.goals), assists: num(f.assists), teamTotalGoals: num(f.teamTotalGoals),
    keyPasses: num(f.keyPasses), shots: num(f.shots),
    currentMarketValue: num(f.currentMarketValue), marketValue12m: num(f.marketValue12m),
    marketValuePeak: num(f.marketValuePeak),
    bigMatchPerformance: f.bigMatchPerformance as PlayerInputData['bigMatchPerformance'],
    nationalTeamStatus: f.nationalTeamStatus as PlayerInputData['nationalTeamStatus'],
    mediaSentiment: f.mediaSentiment as PlayerInputData['mediaSentiment'],
    transferRumors: f.transferRumors as PlayerInputData['transferRumors'],
  };
}

export default function RatingPage() {
  const { rci } = useRCI();
  const [mode, setMode] = useState<InputMode>('form');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pasteText, setPasteText] = useState('');
  const [result, setResult] = useState<RatingResult | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);

  const updateField = (field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setAdded(false);
    const data = formToData(form);
    const r = calculateRating(data, true, rci.temperature);
    setResult(r);
  };

  const handlePasteSubmit = async () => {
    if (!pasteText.trim()) return;
    setError('');
    setAdded(false);
    setParsing(true);
    try {
      const parsed = await parseRawPlayerData(pasteText);
      // 填充回表单（字符串形式）
      setForm({
        name: parsed.name || '',
        age: parsed.age || '',
        position: parsed.position || 'ST',
        team: parsed.team || '',
        league: parsed.league || 'other',
        teamRank: parsed.teamRank || 'mid',
        appearances: parsed.appearances || '',
        starts: parsed.starts || '',
        minutes: parsed.minutes || '',
        goals: parsed.goals || '',
        assists: parsed.assists || '',
        teamTotalGoals: parsed.teamTotalGoals || '',
        keyPasses: parsed.keyPasses || parsed.keyPassesPer90 || '',
        shots: parsed.shots || parsed.shotsPer90 || '',
        currentMarketValue: parsed.currentMarketValue || '',
        marketValue12m: parsed.marketValue12m || '',
        marketValuePeak: parsed.marketValuePeak || '',
        bigMatchPerformance: parsed.bigMatchPerformance || 'no-record',
        nationalTeamStatus: parsed.nationalTeamStatus || 'none',
        mediaSentiment: parsed.mediaSentiment || 'mixed',
        transferRumors: parsed.transferRumors || 'none',
      });
      const data = formToData({
        ...EMPTY_FORM,
        ...Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, v || ''])),
        name: parsed.name || '',
        age: parsed.age || '',
        position: parsed.position || 'ST',
        team: parsed.team || '',
        league: parsed.league || 'other',
        teamRank: parsed.teamRank || 'mid',
        bigMatchPerformance: parsed.bigMatchPerformance || 'no-record',
        nationalTeamStatus: parsed.nationalTeamStatus || 'none',
        mediaSentiment: parsed.mediaSentiment || 'mixed',
        transferRumors: parsed.transferRumors || 'none',
      } as FormState);
      // Recalculate with the parsed data
      const data2 = formToData({
        ...EMPTY_FORM,
        name: parsed.name || '',
        age: parsed.age || '',
        position: parsed.position || 'ST',
        team: parsed.team || '',
        league: parsed.league || 'other',
        teamRank: parsed.teamRank || 'mid',
        appearances: parsed.appearances || '',
        starts: parsed.starts || '',
        minutes: parsed.minutes || '',
        goals: parsed.goals || '',
        assists: parsed.assists || '',
        teamTotalGoals: parsed.teamTotalGoals || '',
        keyPasses: parsed.keyPasses || parsed.keyPassesPer90 || '',
        shots: parsed.shots || parsed.shotsPer90 || '',
        currentMarketValue: parsed.currentMarketValue || '',
        marketValue12m: parsed.marketValue12m || '',
        marketValuePeak: parsed.marketValuePeak || '',
        bigMatchPerformance: parsed.bigMatchPerformance || 'no-record',
        nationalTeamStatus: parsed.nationalTeamStatus || 'none',
        mediaSentiment: parsed.mediaSentiment || 'mixed',
        transferRumors: parsed.transferRumors || 'none',
      } as FormState);
      const r = calculateRating(data2, true, rci.temperature);
      setResult(r);
      setMode('form');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setParsing(false);
    }
  };

  const handleAddToPortfolio = () => {
    if (!result || !form.name) return;
    const data = formToData(form);
    addPlayerHolding({
      id: generateId(),
      playerName: form.name,
      ratingResult: result,
      milestoneStage: 'entry',
      milestoneProgress: 0,
      isRookie: (parseInt(form.age) || 18) <= 22,
      rookieSellProgress: 0,
      status: 'holding',
      notes: `评级 ${result.totalScore} 分 · ${result.tier === 'moderate-buy' ? '中度持仓' : result.tier === 'light-buy' ? '轻量持仓' : '不买'}`,
      cards: [],
      seasons: [{
        season: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1).toString().slice(2),
        appearances: data.appearances,
        starts: data.starts,
        minutes: data.minutes,
        goals: data.goals,
        assists: data.assists,
        teamTotalGoals: data.teamTotalGoals,
        keyPasses: data.keyPasses,
        shots: data.shots,
        currentMarketValue: data.currentMarketValue,
        marketValue12m: data.marketValue12m,
        marketValuePeak: data.marketValuePeak,
        bigMatchPerformance: data.bigMatchPerformance,
        nationalTeamStatus: data.nationalTeamStatus,
        mediaSentiment: data.mediaSentiment,
        transferRumors: data.transferRumors,
      }],
    });
    setAdded(true);
  };

  const dimensionLabels: Record<string, string> = {
    leaguePerformance: '联赛相对表现',
    marketValue: '德转身价指标',
    bigMatch: '重要比赛表现',
    mediaSentiment: '媒体与社区评价',
    leagueStrength: '联赛强度×球队影响力',
    agePotential: '年龄与上限空间',
  };

  // 数值输入辅助组件
  const NumInput = ({ field, label }: { field: keyof FormState; label: string }) => (
    <div>
      <label className="label">{label}</label>
      <input className="input-field" type="number" step="any"
        value={form[field]}
        onChange={e => updateField(field, e.target.value)}
        placeholder="0" />
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">球员筛选 & 评级</h1>

      {rci.temperature === 'extreme-hot' && (
        <div className="banner-warning text-sm">
          ⚠️ 当前市场极热 (百分位 {rci.percentile}%)，持仓门槛已从 80 分提至 85 分
        </div>
      )}
      {rci.temperature === 'extreme-cold' && (
        <div className="rounded-lg p-3 text-sm bg-[rgba(125,142,163,0.08)] border border-[rgba(125,142,163,0.2)] text-morandi-blue">
          ✓ 市场偏冷，建仓安全边际较高，止损线可放宽 5–10%
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={() => setMode('form')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'form' ? 'bg-text-primary text-white' : 'btn-secondary'}`}>
          表单输入
        </button>
        <button onClick={() => setMode('paste')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'paste' ? 'bg-text-primary text-white' : 'btn-secondary'}`}>
          原始数据粘贴 (AI 解析)
        </button>
      </div>

      {mode === 'paste' && (
        <div className="card space-y-3">
          <p className="text-sm text-text-secondary">
            粘贴来自论坛、Cardhobby、德转网站的自由文本，DeepSeek AI 自动提取关键字段
          </p>
          <textarea className="input-field h-40 resize-y" placeholder="粘贴球员数据文本..."
            value={pasteText} onChange={e => setPasteText(e.target.value)} />
          <button onClick={handlePasteSubmit} disabled={parsing || !pasteText.trim()} className="btn-primary">
            {parsing ? 'AI 解析中...' : 'AI 解析并评分'}
          </button>
          {error && <p className="text-danger text-sm">{error}</p>}
        </div>
      )}

      {mode === 'form' && (
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* 基本信息 */}
          <div className="card">
            <h3 className="text-sm font-bold text-text-primary mb-3">基本信息</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="label">球员姓名</label>
                <input className="input-field" value={form.name} onChange={e => updateField('name', e.target.value)} required />
              </div>
              <div>
                <label className="label">年龄</label>
                <input className="input-field" type="number" value={form.age} onChange={e => updateField('age', e.target.value)} placeholder="18" />
              </div>
              <div>
                <label className="label">位置</label>
                <select className="select-field" value={form.position} onChange={e => updateField('position', e.target.value)}>
                  {['GK','CB','LB','RB','CDM','CM','CAM','LW','RW','ST','CF'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="label">效力球队</label>
                <input className="input-field" value={form.team} onChange={e => updateField('team', e.target.value)} />
              </div>
              <div>
                <label className="label">所在联赛</label>
                <select className="select-field" value={form.league} onChange={e => updateField('league', e.target.value)}>
                  {Object.entries(LEAGUE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="label">球队排名</label>
                <select className="select-field" value={form.teamRank} onChange={e => updateField('teamRank', e.target.value)}>
                  {Object.entries(TEAM_RANK_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 表现数据 */}
          <div className="card">
            <h3 className="text-sm font-bold text-text-primary mb-3">表现数据（本赛季总数）</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <NumInput field="appearances" label="出场次数" />
              <NumInput field="starts" label="首发次数" />
              <NumInput field="minutes" label="出场分钟" />
              <NumInput field="goals" label="进球" />
              <NumInput field="assists" label="助攻" />
              <NumInput field="teamTotalGoals" label="球队总进球" />
              <NumInput field="keyPasses" label="关键传球（总数）" />
              <NumInput field="shots" label="射门（总数）" />
            </div>
            <p className="text-xs text-text-secondary mt-2">
              系统根据出场分钟自动换算每90分钟数据
            </p>
          </div>

          {/* 德转身价 */}
          <div className="card">
            <h3 className="text-sm font-bold text-text-primary mb-3">德转身价 (万欧)</h3>
            <div className="grid grid-cols-3 gap-3">
              <NumInput field="currentMarketValue" label="当前身价" />
              <NumInput field="marketValue12m" label="12个月前身价" />
              <NumInput field="marketValuePeak" label="历史最高身价" />
            </div>
          </div>

          {/* 重要比赛 & 市场情绪 */}
          <div className="card">
            <h3 className="text-sm font-bold text-text-primary mb-3">重要比赛 & 市场情绪</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {([
                ['bigMatchPerformance', '对阵强队表现', [['no-record','无记录'],['average','普通发挥'],['contributed','有贡献'],['standout','亮眼表现']]],
                ['nationalTeamStatus', '国家队状态', [['none','未入选'],['youth','青年队'],['senior-rotation','成年队轮换'],['senior-starter','成年队主力']]],
                ['mediaSentiment', '媒体/论坛评价', [['negative','负面'],['mixed','褒贬不一'],['positive','正向'],['strong-positive','强烈看好']]],
                ['transferRumors', '转会传闻热度', [['none','无'],['rumor','小道消息'],['media-reported','媒体报道'],['official-contact','官方接触']]],
              ] as const).map(([k, label, opts]) => (
                <div key={k}>
                  <label className="label">{label}</label>
                  <select className="select-field" value={form[k]} onChange={e => updateField(k, e.target.value)}>
                    {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary w-full">运行六维评分</button>
        </form>
      )}

      {/* 评分报告 */}
      {result && (
        <div className="space-y-4">
          <div className="card flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold font-mono">{result.totalScore}</span>
              <span className="text-sm text-text-secondary">/100</span>
              <StatusBadge status={result.tier} />
            </div>
          </div>

          <div className="card space-y-2">
            <h3 className="text-sm font-bold text-text-primary mb-2">六维度评分</h3>
            {Object.entries(result.dimensionScores).map((key, i) => (
              <ScoreBar key={key[0]} label={dimensionLabels[key[0]] ?? key[0]} score={key[1]}
                weight={[0.25, 0.20, 0.20, 0.15, 0.10, 0.10][i]} />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricCard label="目标卖出倍数" value={`×${result.targetSellMultiplier.min} – ×${result.targetSellMultiplier.max}`} />
            <MetricCard label="止损倍数" value={`×${result.stopLossMultiplier}`} colorClass="text-danger" />
          </div>

          {/* Target 预期差对比 */}
          {(() => {
            const targets = loadTargets();
            const matches = targets.filter(t =>
              t.position === (form.position as any) && t.league === form.league
            );
            if (matches.length === 0) return null;
            const maxMult = result.targetSellMultiplier.max;
            const minMult = result.targetSellMultiplier.min;
            return (
              <div className="card space-y-3">
                <h3 className="text-sm font-bold text-text-primary">
                  📈 Target 预期差对比（同位置·同联赛）
                </h3>
                <p className="text-xs text-text-secondary">
                  当前评级目标卖出倍数 ×{minMult}–×{maxMult}，下方为参照球员各阶段历史卡价区间
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-text-secondary border-b border-border">
                        <th className="text-left py-1.5 pr-2">Target 球员</th>
                        <th className="text-right py-1.5 px-2">出道期</th>
                        <th className="text-right py-1.5 px-2">突破期</th>
                        <th className="text-right py-1.5 px-2">成名期</th>
                        <th className="text-right py-1.5 pl-2">顶峰期</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matches.map(t => (
                        <tr key={t.id} className="border-b border-border/50">
                          <td className="py-1.5 pr-2 font-medium">{t.name}</td>
                          <td className="text-right py-1.5 px-2 font-mono">¥{t.priceHistory.entry.low}–{t.priceHistory.entry.high}</td>
                          <td className="text-right py-1.5 px-2 font-mono">¥{t.priceHistory.early.low}–{t.priceHistory.early.high}</td>
                          <td className="text-right py-1.5 px-2 font-mono">¥{t.priceHistory.breakout.low}–{t.priceHistory.breakout.high}</td>
                          <td className="text-right py-1.5 pl-2 font-mono">¥{t.priceHistory.peak.low}–{t.priceHistory.peak.high}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-xs text-text-secondary bg-white/5 rounded p-2">
                  💡 <strong>预期差逻辑：</strong>用卡的实际入手成本 × 目标卖出倍数上限（×{maxMult}），对比 Target 顶峰期价格区间。若预期峰值处于 Target 突破期/成名期水平，说明市场存在低估机会。
                </div>
              </div>
            );
          })()}

          {!added ? (
            <button onClick={handleAddToPortfolio} className="btn-primary w-full">添加到持仓</button>
          ) : (
            <div className="card text-center text-sm py-3 !bg-[rgba(142,163,142,0.06)] !border-[rgba(142,163,142,0.2)] !text-[#a3b8a3]">
              ✓ 已添加至持仓 — 前往「持仓管理」添加该球员的卡片记录
            </div>
          )}
        </div>
      )}
    </div>
  );
}
