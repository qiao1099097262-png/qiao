// ============================================================
// 通用组件
// ============================================================

/** 评分条形图 */
export function ScoreBar({ label, score, weight, maxScore = 10 }: {
  label: string;
  score: number;
  weight: number;
  maxScore?: number;
}) {
  const pct = Math.min((score / maxScore) * 100, 100);
  const barColor =
    pct >= 80 ? 'bg-success' :
    pct >= 60 ? 'bg-warning' :
    'bg-danger';

  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-xs text-text-secondary shrink-0">{label}</div>
      <div className="flex-1 bg-white/10 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-10 text-right text-xs font-mono font-semibold text-text-primary">
        {score.toFixed(1)}
      </div>
      <div className="w-8 text-right text-xs text-text-secondary">
        {Math.round(weight * 100)}%
      </div>
    </div>
  );
}

/** 状态徽章 */
export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const colorMap: Record<string, string> = {
    holding: 'badge-success',
    'sell-window': 'badge-warning',
    'stop-loss-warning': 'badge-danger',
    'time-stop-near': 'badge-danger',
    'moderate-buy': 'badge-success',
    'light-buy': 'badge-warning',
    pass: 'badge-danger',
  };
  const labelMap: Record<string, string> = {
    holding: '持有中',
    'sell-window': '卖出窗口开启',
    'stop-loss-warning': '止损警告',
    'time-stop-near': '时间止损临近',
    'moderate-buy': '中度持仓',
    'light-buy': '轻量持仓',
    pass: '不买',
  };

  return (
    <span className={colorMap[status] ?? 'badge'}>
      {label ?? labelMap[status] ?? status}
    </span>
  );
}

/** 规则确认弹窗 */
export function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = '我已阅读规则',
  cancelText = '取消',
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
        <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>
        <p className="text-sm text-text-secondary mb-6 whitespace-pre-line">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary text-sm">{cancelText}</button>
          <button onClick={onConfirm} className="btn-primary text-sm">{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

/** 指标卡片 */
export function MetricCard({ label, value, sub, colorClass = '', onClick }: {
  label: string;
  value: string | number;
  sub?: string;
  colorClass?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`card flex flex-col gap-1 cursor-${onClick ? 'pointer' : 'default'}`}
      onClick={onClick}
    >
      <div className="text-xs text-text-secondary uppercase tracking-wider">{label}</div>
      <div className={`text-2xl font-bold font-mono ${colorClass}`}>{value}</div>
      {sub && <div className="text-xs text-text-secondary">{sub}</div>}
    </div>
  );
}

/** 倒计时组件 */
export function Countdown({ hours, urgent = false }: { hours: number; urgent?: boolean }) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  const colorClass = urgent || hours <= 12 ? 'text-danger' : hours <= 24 ? 'text-warning' : 'text-text-secondary';

  return (
    <span className={`font-mono font-bold ${colorClass}`}>
      {hours <= 0 ? '已过期' : `${h}h ${m}m`}
    </span>
  );
}
