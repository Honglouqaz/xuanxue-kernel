/**
 * AI 智能解读层
 * ─────────────────────────────────────────────────────────
 * 设计原则：
 *   1. 排盘由本地确定性引擎完成，AI 只负责「解读」——不参与起局，
 *      杜绝模型幻觉算出错误干支。
 *   2. 兼容 OpenAI /chat/completions 协议（DeepSeek、月之暗面、
 *      智谱、通义、OpenAI 均可用），流式输出。
 *   3. 无 Key 时自动降级到本地规则解读，功能不中断。
 *   4. Key 只存 localStorage，不上传任何第三方。
 */

const LS_KEY = 'xuanshu.ai.config.v1';

export const AI_PRESETS = [
  { id: 'deepseek', name: 'DeepSeek', baseURL: 'https://api.deepseek.com/v1', model: 'deepseek-chat', doc: 'https://platform.deepseek.com' },
  { id: 'moonshot', name: '月之暗面 Kimi', baseURL: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k', doc: 'https://platform.moonshot.cn' },
  { id: 'zhipu', name: '智谱 GLM', baseURL: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4-flash', doc: 'https://open.bigmodel.cn' },
  { id: 'dashscope', name: '通义千问', baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus', doc: 'https://bailian.console.aliyun.com' },
  { id: 'openai', name: 'OpenAI', baseURL: 'https://api.openai.com/v1', model: 'gpt-4o-mini', doc: 'https://platform.openai.com' },
  { id: 'custom', name: '自定义（OpenAI 兼容）', baseURL: '', model: '', doc: '' },
];

export const DEFAULT_CONFIG = {
  preset: 'deepseek',
  baseURL: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  apiKey: '',
  temperature: 0.8,
  maxTokens: 2000,
  stream: true,
  localProxy: '',        // 形如 http://localhost:8787 ，填了就走本地代理（绕过 CORS）
};

export function loadAIConfig() {
  try {
    const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(LS_KEY) : null;
    return raw ? { ...DEFAULT_CONFIG, ...JSON.parse(raw) } : { ...DEFAULT_CONFIG };
  } catch { return { ...DEFAULT_CONFIG }; }
}

export function saveAIConfig(cfg) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(cfg)); return true; } catch { return false; }
}

export function hasKey(cfg = loadAIConfig()) { return !!(cfg.apiKey && cfg.apiKey.trim()); }

/** 组装实际请求地址 */
function endpoint(cfg) {
  if (cfg.localProxy) return cfg.localProxy.replace(/\/$/, '') + '/v1/chat/completions';
  return cfg.baseURL.replace(/\/$/, '') + '/chat/completions';
}

/**
 * 调用 AI 解读
 * @param {object} o
 * @param {string} o.system   系统提示（人设 + 输出规范）
 * @param {string} o.user     用户提示（含排盘结构化数据）
 * @param {function} [o.onDelta] 流式回调 (textChunk, fullText)
 * @param {AbortSignal} [o.signal]
 * @param {object} [o.config]
 * @returns {Promise<string>} 完整文本
 */
export async function aiInterpret(o) {
  const cfg = { ...loadAIConfig(), ...(o.config || {}) };
  if (!hasKey(cfg)) throw new Error('NO_KEY');

  const body = {
    model: cfg.model,
    messages: [
      { role: 'system', content: o.system },
      { role: 'user', content: o.user },
    ],
    temperature: Number(cfg.temperature) || 0.8,
    max_tokens: Number(cfg.maxTokens) || 2000,
    stream: !!cfg.stream && typeof o.onDelta === 'function',
  };

  const res = await fetch(endpoint(cfg), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cfg.apiKey.trim()}`,
    },
    body: JSON.stringify(body),
    signal: o.signal,
  });

  if (!res.ok) {
    let detail = '';
    try { const j = await res.json(); detail = j.error?.message || JSON.stringify(j).slice(0, 200); }
    catch { detail = await res.text().catch(() => ''); }
    throw new Error(`HTTP ${res.status}：${detail || res.statusText}`);
  }

  if (!body.stream) {
    const j = await res.json();
    const txt = j.choices?.[0]?.message?.content || '';
    if (o.onDelta) o.onDelta(txt, txt);
    return txt;
  }

  // ── SSE 流式 ──
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buf = '', full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      const s = line.trim();
      if (!s.startsWith('data:')) continue;
      const payload = s.slice(5).trim();
      if (payload === '[DONE]') continue;
      try {
        const j = JSON.parse(payload);
        const d = j.choices?.[0]?.delta?.content;
        if (d) { full += d; o.onDelta(d, full); }
      } catch { /* 忽略心跳等非 JSON 行 */ }
    }
  }
  return full;
}

/** 测试连通性 */
export async function aiPing(config) {
  const cfg = { ...loadAIConfig(), ...(config || {}) };
  if (!hasKey(cfg)) return { ok: false, msg: '未填写 API Key' };
  const t0 = Date.now();
  try {
    const txt = await aiInterpret({
      system: '你是一个测试助手。',
      user: '请只回复两个字：通了',
      config: { ...cfg, stream: false, maxTokens: 16 },
    });
    return { ok: true, msg: `连通正常（${Date.now() - t0} ms）｜返回：${String(txt).trim().slice(0, 20)}` };
  } catch (e) {
    const m = String(e.message || e);
    if (m === 'NO_KEY') return { ok: false, msg: '未填写 API Key' };
    if (/Failed to fetch|NetworkError/i.test(m)) {
      return { ok: false, msg: '网络不通或被 CORS 拦截 —— 可改用「本地代理模式」（见设置页说明）' };
    }
    return { ok: false, msg: m };
  }
}

// ───────────────────────── 本地规则兜底 ─────────────────────────

/**
 * 无 Key 时的本地解读：把引擎的结构化结果转成有层次的文字。
 * 不编造数据，只做「已有结论的重述 + 传统口诀式归纳」。
 * @param {string} engineId
 * @param {object} data 引擎原始结果
 * @param {string} text 引擎的文本输出
 */
export function localInterpret(engineId, data, text) {
  const head = '【本地规则解读】\n（当前未配置 AI Key，以下为引擎内置规则的直接归纳，未经过模型润色）\n';
  const tail = '\n\n────────────────\n提示：在「设置」中填入任意 OpenAI 兼容的 API Key（DeepSeek / Kimi / 智谱 等），即可获得结合语境、追问式的完整解读。';
  return head + '\n' + (text || '（该体系暂无文本输出）') + tail;
}
