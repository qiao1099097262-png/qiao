import { useState, useEffect } from 'react';
import type { PlayerEvent, EventType, PlayerHolding } from '../../types';
import { loadEvents, saveEvents, addEvent, updateEvent, generateId, loadPlayerHoldings } from '../../utils/storage';
import { EVENT_TYPE_CONFIG } from '../../constants';
import { calcSellWindowExpiry, calcRemainingHours, formatCountdown } from '../../utils/stopLoss';
import { StatusBadge, ConfirmModal } from '../Common';

export default function EventPage() {
  const [events, setEvents] = useState<PlayerEvent[]>([]);
  const [players, setPlayers] = useState<PlayerHolding[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; eventId: string }>({ open: false, eventId: '' });
  const [form, setForm] = useState({
    playerName: '',
    playerId: '',
    eventType: 'transfer-official' as EventType,
    eventDate: new Date().toISOString().split('T')[0],
    description: '',
  });

  useEffect(() => {
    setEvents(loadEvents());
    setPlayers(loadPlayerHoldings());
  }, []);

  const refresh = () => {
    setEvents(loadEvents());
    setPlayers(loadPlayerHoldings());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const config = EVENT_TYPE_CONFIG[form.eventType];
    const now = new Date();
    const event: PlayerEvent = {
      id: generateId(),
      playerName: form.playerName,
      playerId: form.playerId,
      eventType: form.eventType,
      eventDate: form.eventDate,
      description: form.description,
      acknowledged: false,
      sellWindowActive: config.triggers === 'sell-window',
      sellWindowExpiry: config.triggers === 'sell-window' ? calcSellWindowExpiry() : undefined,
      createdAt: now.toISOString(),
    };
    addEvent(event);
    setForm({ playerName: '', playerId: '', eventType: 'transfer-official', eventDate: new Date().toISOString().split('T')[0], description: '' });
    setShowForm(false);
    refresh();
  };

  const handleAcknowledge = (eventId: string) => {
    setConfirmModal({ open: true, eventId });
  };

  const confirmAcknowledge = () => {
    updateEvent(confirmModal.eventId, { acknowledged: true });
    setConfirmModal({ open: false, eventId: '' });
    refresh();
  };

  const activeWindows = events.filter(e =>
    e.sellWindowActive && !e.acknowledged && e.sellWindowExpiry &&
    calcRemainingHours(e.sellWindowExpiry) > 0
  );

  const expiredWindows = events.filter(e =>
    e.sellWindowActive && !e.acknowledged && e.sellWindowExpiry &&
    calcRemainingHours(e.sellWindowExpiry) <= 0
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-text-primary">事件监控 & 卖出提醒</h1>

      {activeWindows.map(ew => {
        const hours = calcRemainingHours(ew.sellWindowExpiry!);
        const urgent = hours <= 12;
        return (
          <div key={ew.id} className={urgent ? 'banner-danger' : 'banner-warning'}>
            <div className="flex-1">
              <div className="font-semibold text-sm">
                卖出窗口已开启: {ew.playerName} · {EVENT_TYPE_CONFIG[ew.eventType]?.label}
              </div>
              <div className="text-xs mt-1">
                剩余 <span className={`font-mono font-bold ${urgent ? 'text-danger' : ''}`}>{formatCountdown(hours)}</span>
                {urgent && ' — 请尽快决策'}
              </div>
            </div>
            <button onClick={() => handleAcknowledge(ew.id)} className="btn-primary text-xs shrink-0">
              我已阅读规则
            </button>
          </div>
        );
      })}

      {expiredWindows.map(ew => (
        <div key={ew.id} className="banner-danger">
          <div className="flex-1">
            <div className="font-semibold text-sm">⚠️ 卖出窗口已过期: {ew.playerName}</div>
            <div className="text-xs mt-1">超过48小时未操作，请立即处理</div>
          </div>
          <button onClick={() => handleAcknowledge(ew.id)} className="btn-danger text-xs shrink-0">确认处理</button>
        </div>
      ))}

      <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
        {showForm ? '取消' : '+ 记录新事件'}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">球员姓名</label>
              <input className="input-field" value={form.playerName}
                onChange={e => setForm({ ...form, playerName: e.target.value })} required />
            </div>
            <div>
              <label className="label">关联持仓球员</label>
              <select className="select-field" value={form.playerId}
                onChange={e => setForm({ ...form, playerId: e.target.value })}>
                <option value="">不关联</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>{p.playerName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">事件类型</label>
              <select className="select-field" value={form.eventType}
                onChange={e => setForm({ ...form, eventType: e.target.value as EventType })}>
                {Object.entries(EVENT_TYPE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label} {v.triggers === 'sell-window' ? '🔔' : v.triggers === 'stop-loss' ? '⚠️' : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">事件日期</label>
              <input className="input-field" type="date" value={form.eventDate}
                onChange={e => setForm({ ...form, eventDate: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">备注</label>
            <textarea className="input-field h-20" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="描述具体事件细节..." />
          </div>
          <button type="submit" className="btn-primary">记录事件</button>
        </form>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-text-primary">事件历史</h3>
        {events.length === 0 && (
          <div className="card text-center text-text-secondary py-8">暂无记录的事件</div>
        )}
        {events.map(ev => {
          const config = EVENT_TYPE_CONFIG[ev.eventType];
          const expiryHours = ev.sellWindowExpiry ? calcRemainingHours(ev.sellWindowExpiry) : 0;
          return (
            <div key={ev.id} className={`card flex items-start justify-between gap-3 ${ev.sellWindowActive && !ev.acknowledged ? 'border-l-4 border-l-warning' : ''}`}>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{ev.playerName}</span>
                  <span className="badge text-xs">{config.label}</span>
                  {ev.acknowledged && <span className="text-xs text-success">✓ 已处理</span>}
                </div>
                <div className="text-xs text-text-secondary mt-1">
                  {ev.eventDate} · {ev.description || '无备注'}
                  {ev.sellWindowActive && !ev.acknowledged && ev.sellWindowExpiry && expiryHours > 0 && (
                    <span className="text-warning ml-2">剩余 {formatCountdown(expiryHours)}</span>
                  )}
                  {ev.sellWindowActive && !ev.acknowledged && ev.sellWindowExpiry && expiryHours <= 0 && (
                    <span className="text-danger ml-2">已过期</span>
                  )}
                </div>
              </div>
              {!ev.acknowledged && ev.sellWindowActive && (
                <button onClick={() => handleAcknowledge(ev.id)} className="btn-primary text-xs shrink-0">
                  确认
                </button>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmModal
        open={confirmModal.open}
        title="卖出规则确认"
        message={`请确认以下规则：

1. 优先通过拍卖平台出手，不挂二手平台
2. 参考价格用近3次成交均价，不用单次最高价
3. 收到报价若在目标区间内，必须在24小时内决策
4. 了解规则并选择执行`}
        onConfirm={confirmAcknowledge}
        onCancel={() => setConfirmModal({ open: false, eventId: '' })}
        confirmText="我已阅读规则，确认执行"
      />
    </div>
  );
}
