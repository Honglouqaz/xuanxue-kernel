/* ═══════════════ 玄学工坊 · 前端主程序（DOM 层） ═══════════════ */
import { MODULES, CATS, esc } from './modules.js';
import {
  loadAIConfig, saveAIConfig, aiInterpret, aiPing, hasKey,
  localInterpret, AI_PRESETS,
} from '../ai/ai.js';
import { buildPrompt } from '../ai/prompts.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

let CURRENT = { module: null, result: null, values: null, abort: null };

// ═══════════════ 表单 ═══════════════

function renderField(f, val) {
  const id = 'f_' + f.k;
  if (f.type === 'chips') {
    const picked = Array.isArray(val) ? val : [];
    return `<div class="field" style="grid-column:1/-1">
      <label>${esc(f.t)}</label>
      <div class="chips" data-chips="${esc(f.k)}">${f.opts.map(o => `<span class="chip${picked.includes(o) ? ' on' : ''}" data-v="${esc(o)}">${esc(o)}</span>`).join('')}</div>
      ${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}
    </div>`;
  }
  if (f.type === 'select') {
    return `<div class="field"><label for="${id}">${esc(f.t)}</label>
      <select id="${id}" data-k="${esc(f.k)}">${f.opts.map(([v, t]) => `<option value="${esc(v)}"${String(v) === String(val ?? '') ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>
      ${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}</div>`;
  }
  if (f.type === 'textarea') {
    return `<div class="field" style="grid-column:1/-1"><label for="${id}">${esc(f.t)}</label>
      <textarea id="${id}" data-k="${esc(f.k)}" placeholder="${esc(f.hint || '')}">${esc(val ?? '')}</textarea></div>`;
  }
  return `<div class="field"><label for="${id}">${esc(f.t)}</label>
    <input id="${id}" data-k="${esc(f.k)}" type="${f.type}" ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.max !== undefined ? `max="${f.max}"` : ''} ${f.step ? `step="${f.step}"` : ''} value="${esc(val ?? f.def ?? '')}">
    ${f.hint ? `<div class="hint">${esc(f.hint)}</div>` : ''}</div>`;
}

function collectForm(root, fields) {
  const v = {};
  for (const f of fields) {
    if (f.type === 'chips') { v[f.k] = [...root.querySelectorAll(`[data-chips="${f.k}"] .chip.on`)].map(c => c.dataset.v); continue; }
    const node = root.querySelector(`[data-k="${f.k}"]`);
    v[f.k] = node ? node.value : (f.def ?? '');
  }
  return v;
}

// ═══════════════ 路由 ═══════════════

function navigate(id) {
  const m = MODULES.find(x => x.id === id) || MODULES[0];
  CURRENT.module = m; CURRENT.result = null;
  if (location.hash.replace('#', '') !== m.id) location.hash = m.id;

  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('on', n.dataset.id === m.id));
  const content = $('#content');
  content.innerHTML = '';
  content.appendChild(el(`<div class="wrap">
    <div class="intro">
      <h2 style="font-family:var(--serif);font-size:19px;letter-spacing:2px">${esc(m.name)}</h2>
      <div class="d">${esc(m.desc)}</div>
    </div>
    <div class="card">
      <h3>输入</h3>
      <div class="grid2" id="form">${m.fields.map(f => renderField(f, f.def)).join('')}</div>
      <div class="btn-row">
        <button class="btn" id="go">起 局</button>
        <button class="btn ghost" id="reset">重 置</button>
      </div>
    </div>
    <div id="result"></div>
  </div>`));

  $('#form').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) chip.classList.toggle('on');
  });
  $('#go').addEventListener('click', runModule);
  $('#reset').addEventListener('click', () => navigate(m.id));
}

function runModule() {
  const m = CURRENT.module;
  const v = collectForm($('#form'), m.fields);
  let out;
  try { out = m.run(v); }
  catch (e) {
    $('#result').innerHTML = `<div class="card"><h3>计算出错</h3><pre class="out">${esc(e.stack || e.message)}</pre></div>`;
    return;
  }
  CURRENT.result = out; CURRENT.values = v;
  renderResult(out, v);
}

function renderResult(out, v) {
  const r = $('#result');
  r.innerHTML = '';
  r.appendChild(el(`<div class="wrap">
    ${out.chart ? `<div class="card"><h3>盘面</h3>${out.chart}</div>` : ''}
    <div class="card">
      <h3>排盘结果</h3>
      <pre class="out">${esc(out.text)}</pre>
      <div class="btn-row"><button class="btn ghost" id="copy">复制结果</button><span class="muted" id="copy-msg" style="font-size:12px"></span></div>
    </div>
    <div class="card">
      <h3>AI 智能解读</h3>
      <div id="ai-out" class="ai-out"></div>
      <div id="ai-status" class="ai-status"></div>
      <div class="btn-row">
        <button class="btn" id="ai-go">请 AI 解读</button>
        <button class="btn ghost" id="ai-stop" style="display:none">停 止</button>
        <button class="btn ghost" id="ai-set">配置 Key</button>
      </div>
    </div>
  </div>`));

  $('#copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(out.text); $('#copy-msg').textContent = '已复制到剪贴板'; }
    catch { $('#copy-msg').textContent = '复制失败，请手动选择'; }
    setTimeout(() => { const n = $('#copy-msg'); if (n) n.textContent = ''; }, 2000);
  });
  $('#ai-go').addEventListener('click', () => runAI(out, v));
  $('#ai-stop').addEventListener('click', () => CURRENT.abort?.abort());
  $('#ai-set').addEventListener('click', openSettings);
  updateAIStatus();
}

async function runAI(out, v) {
  const cfg = loadAIConfig();
  const box = $('#ai-out'), st = $('#ai-status'), go = $('#ai-go'), stop = $('#ai-stop');

  if (!hasKey(cfg)) {
    box.textContent = localInterpret(out.engineId, out.data, out.text);
    st.innerHTML = '未配置 API Key —— 已输出本地规则解读。 <a href="#" id="go-set" style="color:var(--jin)">去配置</a>';
    $('#go-set')?.addEventListener('click', (e) => { e.preventDefault(); openSettings(); });
    return;
  }

  const { system, user } = buildPrompt(out.engineId, {
    question: v?.question || v?.free || '',
    panText: out.text,
    panData: out.data,
  });

  CURRENT.abort = new AbortController();
  box.innerHTML = ''; st.textContent = '正在生成…'; go.disabled = true; stop.style.display = '';
  let acc = '';
  const cur = el('<span class="cursor"></span>');
  box.appendChild(cur);

  try {
    await aiInterpret({
      system, user,
      signal: CURRENT.abort.signal,
      onDelta: (d, full) => { acc = full; cur.insertAdjacentText('beforebegin', d); },
    });
    cur.remove();
    st.textContent = `完成 · ${acc.length} 字 · 模型 ${cfg.model}`;
  } catch (e) {
    cur.remove();
    const msg = String(e.message || e);
    if (msg === 'NO_KEY') { box.textContent = localInterpret(out.engineId, out.data, out.text); st.textContent = '未配置 API Key —— 已输出本地规则解读。'; }
    else {
      st.innerHTML = `<span class="ai-err">解读失败：${esc(msg)}</span><br>已回退为本地规则解读。`;
      box.textContent = localInterpret(out.engineId, out.data, out.text);
    }
  } finally {
    go.disabled = false; stop.style.display = 'none'; CURRENT.abort = null;
  }
}

// ═══════════════ 设置 ═══════════════

function updateAIStatus() {
  const chip = $('#ai-chip');
  if (!chip) return;
  const cfg = loadAIConfig();
  const ok = hasKey(cfg);
  chip.className = 'ai-chip ' + (ok ? 'ok' : 'warn');
  chip.querySelector('span:last-child').textContent = ok ? `AI · ${cfg.model}` : 'AI 未配置';
}

function openSettings() {
  document.querySelector('.modal-mask')?.remove();
  const cfg = loadAIConfig();
  const mask = el(`<div class="modal-mask"><div class="modal">
    <h2>AI 解读设置</h2>
    <div class="sub">排盘由本地引擎完成，AI 只负责润色解读。Key 仅存于本机浏览器 localStorage，不经任何第三方。</div>
    <div class="row"><label style="font-size:12px;color:var(--ink-2)">服务商预设</label>
      <select id="s-preset">${AI_PRESETS.map(p => `<option value="${esc(p.id)}"${p.id === cfg.preset ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
    <div class="row"><label style="font-size:12px;color:var(--ink-2)">接口地址（OpenAI 兼容）</label><input id="s-url" value="${esc(cfg.baseURL)}"></div>
    <div class="row"><label style="font-size:12px;color:var(--ink-2)">模型名</label><input id="s-model" value="${esc(cfg.model)}"></div>
    <div class="row"><label style="font-size:12px;color:var(--ink-2)">API Key</label><input id="s-key" type="password" value="${esc(cfg.apiKey)}" placeholder="sk-..."></div>
    <div class="row"><label style="font-size:12px;color:var(--ink-2)">本地代理地址（可选，绕过 CORS）</label><input id="s-proxy" value="${esc(cfg.localProxy)}" placeholder="http://localhost:8787"></div>
    <div class="row" style="display:flex;gap:16px;align-items:center">
      <label style="font-size:12px;color:var(--ink-2)">温度 <input id="s-temp" type="number" step="0.1" min="0" max="2" value="${esc(cfg.temperature)}" style="width:80px;display:inline-block"></label>
      <label style="font-size:12px;color:var(--ink-2);display:flex;gap:6px;align-items:center"><input id="s-stream" type="checkbox" ${cfg.stream ? 'checked' : ''} style="width:auto"> 流式输出</label>
    </div>
    <div class="row" id="s-msg" style="font-size:12px;color:var(--ink-3);min-height:20px"></div>
    <div class="btn-row" style="margin-top:0">
      <button class="btn" id="s-save">保 存</button>
      <button class="btn ghost" id="s-test">测试连通</button>
      <button class="btn ghost" id="s-close">关 闭</button>
    </div>
    <div style="font-size:11.5px;color:var(--ink-3);margin-top:14px;line-height:1.85">
      提示：若浏览器直连报「Failed to fetch」，多为服务商未开 CORS。<br>
      可在本目录执行 <code style="color:var(--jin)">node tools/proxy.mjs</code> 启动本地代理，<br>
      再把上面的代理地址填成 http://localhost:8787 即可。
    </div>
  </div></div>`);
  document.body.appendChild(mask);

  const close = () => mask.remove();
  mask.addEventListener('click', (e) => { if (e.target === mask) close(); });
  $('#s-close', mask).addEventListener('click', close);
  $('#s-preset', mask).addEventListener('change', (e) => {
    const p = AI_PRESETS.find(x => x.id === e.target.value);
    if (p && p.baseURL) { $('#s-url', mask).value = p.baseURL; $('#s-model', mask).value = p.model; }
  });
  $('#s-save', mask).addEventListener('click', () => {
    saveAIConfig({
      ...cfg,
      preset: $('#s-preset', mask).value,
      baseURL: $('#s-url', mask).value.trim(),
      model: $('#s-model', mask).value.trim(),
      apiKey: $('#s-key', mask).value.trim(),
      localProxy: $('#s-proxy', mask).value.trim(),
      temperature: +$('#s-temp', mask).value,
      stream: $('#s-stream', mask).checked,
    });
    updateAIStatus();
    $('#s-msg', mask).innerHTML = '<span style="color:var(--qing)">已保存</span>';
  });
  $('#s-test', mask).addEventListener('click', async () => {
    const cfg2 = {
      ...cfg,
      baseURL: $('#s-url', mask).value.trim(), model: $('#s-model', mask).value.trim(),
      apiKey: $('#s-key', mask).value.trim(), localProxy: $('#s-proxy', mask).value.trim(),
    };
    $('#s-msg', mask).textContent = '测试中…';
    const r = await aiPing(cfg2);
    $('#s-msg', mask).innerHTML = r.ok
      ? `<span style="color:var(--qing)">✓ ${esc(r.msg)}</span>`
      : `<span style="color:var(--zhu)">✗ ${esc(r.msg)}</span>`;
  });
}

// ═══════════════ 启动 ═══════════════

function buildNav() {
  const nav = $('#nav');
  nav.innerHTML = CATS.map(c => `
    <div class="nav-cat">${esc(c)}</div>
    ${MODULES.filter(m => m.cat === c).map(m => `<div class="nav-item" data-id="${esc(m.id)}"><span class="g">${esc(m.glyph)}</span><span>${esc(m.name)}</span></div>`).join('')}
  `).join('');
  nav.addEventListener('click', (e) => {
    const it = e.target.closest('.nav-item');
    if (it) navigate(it.dataset.id);
  });
}

function init() {
  buildNav();
  const id = (location.hash || '').replace('#', '').trim() || MODULES[0].id;
  navigate(id);
  $('#ai-chip').addEventListener('click', openSettings);
  window.addEventListener('hashchange', () => {
    const h = (location.hash || '').replace('#', '');
    if (h && h !== CURRENT.module?.id) navigate(h);
  });
  updateAIStatus();
  // 暴露给控制台，便于调试
  window.__XUANSHU__ = { MODULES, navigate, openSettings };
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();
