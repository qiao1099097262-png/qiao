import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useRCI } from '../hooks/useRCI';
import { RCI_TEMPERATURE_CONFIG } from '../constants';

const NAV_ITEMS = [
  { to: '/', label: '球员评级', icon: '⚽' },
  { to: '/positions', label: '持仓管理', icon: '📊' },
  { to: '/events', label: '事件监控', icon: '🔔' },
  { to: '/trades', label: '交易复盘', icon: '📋' },
  { to: '/rci', label: 'RCI 指数', icon: '🌡️' },
  { to: '/settings', label: '设置', icon: '⚙️' },
];

export default function Layout() {
  const { rci } = useRCI();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const tempConfig = RCI_TEMPERATURE_CONFIG[rci.temperature];

  return (
    <div className="min-h-screen flex flex-col">
      {/* RCI 顶栏 */}
      <div className={`${tempConfig.bgClass} text-white px-4 py-1.5 flex items-center justify-between text-xs`}>
        <div className="flex items-center gap-3">
          <span className="font-semibold">RCI 市场温度</span>
          <span className="font-mono">{tempConfig.label} · {rci.percentile}%</span>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          {rci.temperature === 'extreme-hot' && (
            <span className="text-white/90">⚠ 当前市场偏热，优先考虑止盈</span>
          )}
          {rci.temperature === 'extreme-cold' && (
            <span className="text-white/90">✓ 买入安全边际较高</span>
          )}
        </div>
        <button
          className="sm:hidden text-white"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>
      </div>

      <div className="flex flex-1">
        {/* 侧栏导航 */}
        <nav className={`
          ${sidebarOpen ? 'block' : 'hidden'} sm:block
          w-48 shrink-0 bg-surface border-r border-border p-3 flex flex-col gap-1
          fixed sm:sticky top-0 left-0 h-full sm:h-auto z-40 sm:z-auto
        `}>
          <div className="text-sm font-bold text-text-primary mb-3 px-2 pt-2">
            Roocard
          </div>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-text-primary text-white font-semibold'
                    : 'text-text-secondary hover:bg-bg-alt'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/30 z-30 sm:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* 主内容区 */}
        <main className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
