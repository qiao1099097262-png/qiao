import type { AppData, AppSettings, PlayerHolding, CardHolding, TargetPlayer, PlayerEvent, TradeRecord, RCIData } from '../types';
import { DEFAULT_SETTINGS, APP_VERSION } from '../constants';

const STORAGE_KEY = 'football-card-platform-data';

// ============================================================
// localStorage 持久化层 v2 — 球员/卡层级
// ============================================================

function getDefaultData(): AppData {
  return {
    settings: { ...DEFAULT_SETTINGS },
    playerHoldings: [],
    targetPlayers: [],
    events: [],
    trades: [],
    rci: {
      anchorCards: [],
      currentIndex: 0,
      percentile: 50,
      temperature: 'normal',
      weeklyHistory: [],
    },
    version: APP_VERSION,
  };
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultData();
    const data = JSON.parse(raw) as AppData;
    // Migrate: old holdings → playerHoldings
    if ((data as any).holdings && !data.playerHoldings) {
      data.playerHoldings = [];
      data.version = APP_VERSION;
    }
    if (data.version !== APP_VERSION) {
      data.version = APP_VERSION;
    }
    return data;
  } catch {
    return getDefaultData();
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// --- 球员持仓 ---
export function loadPlayerHoldings(): PlayerHolding[] {
  return loadData().playerHoldings;
}

export function savePlayerHoldings(holdings: PlayerHolding[]): void {
  const data = loadData();
  data.playerHoldings = holdings;
  saveData(data);
}

export function addPlayerHolding(player: PlayerHolding): void {
  const data = loadData();
  data.playerHoldings.push(player);
  saveData(data);
}

export function updatePlayerHolding(id: string, updates: Partial<PlayerHolding>): void {
  const data = loadData();
  const idx = data.playerHoldings.findIndex(p => p.id === id);
  if (idx >= 0) {
    data.playerHoldings[idx] = { ...data.playerHoldings[idx], ...updates };
    saveData(data);
  }
}

export function removePlayerHolding(id: string): void {
  const data = loadData();
  data.playerHoldings = data.playerHoldings.filter(p => p.id !== id);
  saveData(data);
}

// --- 卡操作 ---
export function addCardToPlayer(playerId: string, card: CardHolding): void {
  const data = loadData();
  const idx = data.playerHoldings.findIndex(p => p.id === playerId);
  if (idx >= 0) {
    data.playerHoldings[idx].cards.push(card);
    saveData(data);
  }
}

export function updateCard(playerId: string, cardId: string, updates: Partial<CardHolding>): void {
  const data = loadData();
  const pIdx = data.playerHoldings.findIndex(p => p.id === playerId);
  if (pIdx >= 0) {
    const cIdx = data.playerHoldings[pIdx].cards.findIndex(c => c.id === cardId);
    if (cIdx >= 0) {
      data.playerHoldings[pIdx].cards[cIdx] = {
        ...data.playerHoldings[pIdx].cards[cIdx],
        ...updates,
      };
      saveData(data);
    }
  }
}

export function removeCard(playerId: string, cardId: string): void {
  const data = loadData();
  const pIdx = data.playerHoldings.findIndex(p => p.id === playerId);
  if (pIdx >= 0) {
    data.playerHoldings[pIdx].cards = data.playerHoldings[pIdx].cards.filter(c => c.id !== cardId);
    saveData(data);
  }
}

// --- Target 数据库 ---
export function loadTargets(): TargetPlayer[] {
  return loadData().targetPlayers;
}

export function saveTargets(targets: TargetPlayer[]): void {
  const data = loadData();
  data.targetPlayers = targets;
  saveData(data);
}

export function addTarget(target: TargetPlayer): void {
  const data = loadData();
  data.targetPlayers.push(target);
  saveData(data);
}

// --- 事件 ---
export function loadEvents(): PlayerEvent[] {
  return loadData().events;
}

export function saveEvents(events: PlayerEvent[]): void {
  const data = loadData();
  data.events = events;
  saveData(data);
}

export function addEvent(event: PlayerEvent): void {
  const data = loadData();
  data.events.push(event);
  saveData(data);
}

export function updateEvent(id: string, updates: Partial<PlayerEvent>): void {
  const data = loadData();
  const idx = data.events.findIndex(e => e.id === id);
  if (idx >= 0) {
    data.events[idx] = { ...data.events[idx], ...updates };
    saveData(data);
  }
}

// --- 交易 ---
export function loadTrades(): TradeRecord[] {
  return loadData().trades;
}

export function saveTrades(trades: TradeRecord[]): void {
  const data = loadData();
  data.trades = trades;
  saveData(data);
}

export function addTrade(trade: TradeRecord): void {
  const data = loadData();
  data.trades.push(trade);
  saveData(data);
}

// --- RCI ---
export function loadRCI(): RCIData {
  return loadData().rci;
}

export function saveRCI(rci: RCIData): void {
  const data = loadData();
  data.rci = rci;
  saveData(data);
}

// --- 设置 ---
export function loadSettings(): AppSettings {
  return loadData().settings;
}

export function saveSettings(settings: AppSettings): void {
  const data = loadData();
  data.settings = settings;
  saveData(data);
}

// --- 工具 ---
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
