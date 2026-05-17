import { loadSettings } from './storage';

// ============================================================
// DeepSeek API 封装 — 原始数据解析
// ============================================================

const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

interface DeepSeekResponse {
  choices: { message: { content: string } }[];
}

const SYSTEM_PROMPT = `你是一个足球球星卡数据解析助手。从用户提供的自由文本中提取以下字段，输出 JSON 格式。

字段列表和说明：
- name: 球员姓名
- age: 年龄（纯数字）
- position: 位置 (GK/CB/LB/RB/CDM/CM/CAM/LW/RW/ST/CF)
- team: 效力球队
- league: 所在联赛 (premier-league/la-liga/bundesliga/serie-a/ligue-1/eredivisie/liga-portugal/other)
- teamRank: 球队排名区间 (top3/top6/upper-mid/mid/relegation)
- appearances: 本赛季出场次数
- starts: 首发次数
- minutes: 出场分钟数
- goals: 进球数
- assists: 助攻数
- teamTotalGoals: 球队总进球数
- keyPasses: 关键传球总数（纯数字，系统会自动换算每90分钟）
- shots: 射门总数（纯数字）
- currentMarketValue: 德转当前身价（万欧，纯数字）
- marketValue12m: 12个月前身价（万欧，纯数字）
- marketValuePeak: 历史最高身价（万欧，纯数字）
- bigMatchPerformance: 对阵强队表现 (no-record/average/contributed/standout)
- nationalTeamStatus: 国家队状态 (none/youth/senior-rotation/senior-starter)
- mediaSentiment: 媒体评价 (negative/mixed/positive/strong-positive)
- transferRumors: 转会传闻 (none/rumor/media-reported/official-contact)
规则：
1. 若某字段在原文中未提及，使用合理的默认值或留空字符串
2. 对于评分类字段（bigMatchPerformance 等），根据描述语义推断最接近的选项
3. 数字字段只输出数字，不要带单位
4. 输出纯 JSON 对象，不要有任何其他文字`;

export async function parseRawPlayerData(rawText: string): Promise<Record<string, string>> {
  const settings = loadSettings();
  if (!settings.deepseekApiKey) {
    throw new Error('请先在设置中配置 DeepSeek API Key');
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.deepseekApiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: 1024,
      temperature: 0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: rawText },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek API 错误: ${response.status} ${err}`);
  }

  const data: DeepSeekResponse = await response.json();
  const text = data.choices?.[0]?.message?.content ?? '{}';

  // 尝试提取 JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI 返回格式异常，无法解析 JSON');

  return JSON.parse(jsonMatch[0]);
}
