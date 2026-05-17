import { useState, useEffect } from 'react';
import { loadSettings, saveSettings } from '../../utils/storage';
import type { AppSettings } from '../../types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearData = () => {
    if (confirm('确定要清除所有数据吗？此操作不可恢复！')) {
      if (confirm('再次确认：所有持仓、交易记录、事件、RCI 数据将被永久删除。')) {
        localStorage.clear();
        window.location.reload();
      }
    }
  };

  const handleExportData = () => {
    const data = localStorage.getItem('football-card-platform-data');
    if (!data) {
      alert('暂无数据可导出');
      return;
    }
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `football-card-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.version || !data.holdings) {
          alert('无效的备份文件格式');
          return;
        }
        if (confirm('导入将覆盖当前所有数据，确定继续？')) {
          localStorage.setItem('football-card-platform-data', text);
          window.location.reload();
        }
      } catch {
        alert('文件解析失败，请检查文件格式');
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-xl font-bold text-text-primary">设置</h1>

      {/* API Key */}
      <div className="card space-y-3">
        <h3 className="text-sm font-bold text-text-primary">AI 服务配置</h3>
        <div>
          <label className="label">DeepSeek API Key</label>
          <input
            className="input-field font-mono"
            type="password"
            value={settings.deepseekApiKey}
            onChange={e => setSettings({ ...settings, deepseekApiKey: e.target.value })}
            placeholder="sk-..."
          />
          <p className="text-xs text-text-secondary mt-1">
            用于模块一「原始数据粘贴」AI 解析功能。在 <a href="https://platform.deepseek.com" target="_blank" className="underline" rel="noreferrer">platform.deepseek.com</a> 获取。
          </p>
        </div>
      </div>

      {/* 其他设置 */}
      <div className="card space-y-3">
        <h3 className="text-sm font-bold text-text-primary">偏好设置</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.trackSoldCards}
            onChange={e => setSettings({ ...settings, trackSoldCards: e.target.checked })}
            className="rounded w-4 h-4"
          />
          <div>
            <div className="text-sm text-text-primary">追踪已卖出卡价格（默认关闭）</div>
            <div className="text-xs text-text-secondary">开启后，已卖出卡片的价格变化将在复盘模块显示</div>
          </div>
        </label>
      </div>

      {/* 保存按钮 */}
      <button onClick={handleSave} className="btn-primary">
        {saved ? '✓ 已保存' : '保存设置'}
      </button>

      {/* 数据管理 */}
      <div className="card space-y-3">
        <h3 className="text-sm font-bold text-text-primary">数据管理</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportData} className="btn-secondary text-sm">
            📥 导出数据备份
          </button>
          <button onClick={handleImportData} className="btn-secondary text-sm">
            📤 导入数据备份
          </button>
          <button onClick={handleClearData} className="btn-danger text-sm">
            🗑 清除所有数据
          </button>
        </div>
        <p className="text-xs text-text-secondary">
          所有数据存储在浏览器 localStorage 中。定期导出备份以防数据丢失。
        </p>
      </div>
    </div>
  );
}
