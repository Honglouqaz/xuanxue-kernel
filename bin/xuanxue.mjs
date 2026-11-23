#!/usr/bin/env node
/**
 * xuanxue —— 命令行排盘工具
 *
 * 用法：
 *   xuanxue list                                      列出全部体系
 *   xuanxue run bazi --y 1990 --mo 6 --d 15 --h 10 --mi 0 --gender M
 *   xuanxue run ziwei --y 1990 --mo 6 --d 15 --h 10 --json
 *   xuanxue run all                                   15 个体系全跑一遍
 *   xuanxue run xiaoliuren --lm 8 --ld 11 --hz 8      小六壬（农历月/日/时支）
 *   xuanxue run yijing --yao 101010                   易经（六爻自下而上）
 *   xuanxue run xiangshu --tags 额头饱满,眉毛浓      相术
 *   xuanxue run xingming --xing 张 --ming 三          姓名学
 *   xuanxue run fengshui --sit-shan 子                风水（玄空飞星，按年）
 *   xuanxue huangli --y 2026 --mo 11 --d 23           黄历/星宿
 *
 * 设计说明：各体系入参契约天生不同（有的要生辰，有的要农历月日，有的要勾选特征）。
 * 这里用一张显式的 ADAPTERS 表声明每个体系要什么，缺参数就明确告诉你缺哪个，
 * 而不是把所有体系硬塞进一个「生日」模型里然后崩掉。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENG = path.join(ROOT, 'kernel', 'engines');
const ENGINES = fs.readdirSync(ENG).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3)).sort();
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version;

const int = (v, d) => (v === undefined ? d : Number(v));
const birth = a => ({ y: int(a.y, 1990), mo: int(a.mo, 6), d: int(a.d, 15), h: int(a.h, 12), mi: int(a.mi, 0),
  gender: String(a.gender || 'M').toUpperCase().startsWith('F') ? 'F' : 'M' });

/**
 * 每个体系的调用适配：
 *   fn      实际排盘函数名（不填则自动探测）
 *   args(a) 把命令行参数转成该函数的入参数组
 *   needs   缺这些参数时不跑（run all 会显示「跳过」而不是「失败」）
 */
const ADAPTERS = {
  huangli:    { fn: 'huangli',        args: a => { const b = birth(a); return [b.y, b.mo, b.d]; } },
  taiyi:      { fn: 'paipanTaiyi',    args: a => [{ year: int(a.y, 2026) }] },
  xiaoliuren: { fn: 'qiKe',           args: a => [int(a.lm, 8), int(a.ld, 11), int(a.hz, 8)], needs: ['lm', 'ld', 'hz'] },
  yijing:     { fn: 'jieGua',         args: a => [String(a.yao || '101010').replace(/[^01]/g, '').padEnd(6, '1').slice(0, 6).split('').map(Number)] },
  xiangshu:   { fn: 'kanXiang',       args: a => [String(a.tags || '').split(/[,，]/).filter(Boolean)], needs: ['tags'] },
  xingming:   { fn: 'wuGe',           args: a => [a.xing || '张', a.ming || '三'] },
  fengshui:   { fn: 'paipanXuankong', args: a => [{ year: int(a.y, 2026), sitShan: a['sit-shan'] || '子' }] },
  tizhi:      { fn: 'tizhi',           args: a => [{ ...JSON.parse(a.answers || '{"睡眠":"一般"}'), ...birth(a) }] },
};

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const k = a.slice(2);
      if (['json', 'help', 'all'].includes(k)) { out[k] = true; continue; }
      out[k] = argv[i + 1]; i++;
    } else out._.push(a);
  }
  return out;
}

function pickFn(mod, engine, hint) {
  const isFn = n => typeof mod[n] === 'function';
  if (hint && isFn(hint)) return hint;
  const cap = engine[0].toUpperCase() + engine.slice(1);
  const cands = [`paipan${cap}`, ...Object.keys(mod).filter(n => /^paipan/.test(n)),
    ...Object.keys(mod).filter(n => /^qiGua/.test(n)),
    ...Object.keys(mod).filter(n => /^[a-z]/.test(n) && !/ToText$/.test(n) && isFn(n))];
  return cands.find(isFn) || null;
}

async function load(engine) {
  const p = path.join(ENG, engine + '.js');
  if (!fs.existsSync(p)) throw new Error(`没有体系 "${engine}"。可用：${ENGINES.join(', ')}`);
  const mod = await import(p);
  const adp = ADAPTERS[engine] || {};
  const fn = pickFn(mod, engine, adp.fn);
  if (!fn) throw new Error(`${engine} 里找不到排盘函数。真实导出：${Object.keys(mod).join(', ')}`);
  // 文本化函数必须与排盘函数配对：fengshui 里同时有 xuankongToText 和 bazhaiToText，
  // 随便取第一个会把玄空结果丢给八宅的文本化函数 → 崩在 undefined.gua。
  const keys = Object.keys(mod);
  const isFn = n => typeof mod[n] === 'function';
  const base = fn.replace(/^paipan/, '').replace(/^(kan|qi|pai)/, '');
  const textFn = [`${base}ToText`, `${engine}ToText`, `${fn}ToText`]
      .map(n => n.charAt(0).toLowerCase() + n.slice(1))
      .find(n => isFn(n))
    || keys.find(n => /ToText$/.test(n) && isFn(n));
  const args = adp.args || (a => [birth(a)]);
  return { mod, fn, textFn, adp, args };
}

const HELP = `xuanxue —— 术数排盘 CLI v${VERSION}

  xuanxue list                                   列出全部体系
  xuanxue run <体系> [选项] [--json]             跑单个体系
  xuanxue run all  [选项]                        15 个体系全跑
  xuanxue huangli --y 2026 --mo 11 --d 23        查黄历/星宿
  xuanxue --help                                 本帮助

生辰选项（多数体系通用）：--y 1990 --mo 6 --d 15 --h 10 --mi 0 --gender M|F
特殊选项：--lm/--ld/--hz（小六壬） --yao 101010（易经） --tags a,b（相术）
          --xing/--ming（姓名） --sit-shan 子（风水） --answers '{"睡眠":"一般"}'（体质）

体系：${ENGINES.join(', ')}`;

const a = parseArgs(process.argv.slice(2));
const cmd = a._[0];

try {
  if (!cmd || a.help) { console.log(HELP); process.exit(0); }

  if (cmd === 'list') {
    console.log(`共 ${ENGINES.length} 个体系：`);
    for (const e of ENGINES) {
      const { mod, fn, textFn, adp } = await load(e);
      const need = adp.needs ? ` 需 --${adp.needs.join('/--')}` : '';
      console.log(`  ${e.padEnd(12)} ${String(fn).padEnd(16)} 文本=${textFn || '(无)'}${need}`);
    }
    process.exit(0);
  }

  if (cmd === 'huangli') {
    const b = birth(a);
    const mod = await import(path.join(ENG, 'huangli.js'));
    const r = mod.huangli(b.y, b.mo, b.d);
    if (a.json) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }
    console.log(`${b.y} 年 ${b.mo} 月 ${b.d} 日黄历`);
    for (const [k, v] of Object.entries(r)) if (typeof v !== 'object') console.log(`  ${k}: ${v}`);
    if (r.xiu) console.log(`  星宿: ${r.xiu.n}${r.xiu.e}${r.xiu.a}（${r.xiu.luck}）`);
    process.exit(0);
  }

  if (cmd === 'run') {
    const sys = a._[1];
    if (!sys) throw new Error('要指定体系，例如：xuanxue run bazi --y 1990 --mo 6 --d 15');
    const list = sys === 'all' ? ENGINES : [sys];
    let fail = 0, skip = 0, ok = 0;
    for (const e of list) {
      const { mod, fn, textFn, adp, args } = await load(e);
      const missing = (adp.needs || []).filter(k => a[k] === undefined);
      if (missing.length) {
        skip++;
        console.log(`\n----- ${e} 跳过（需要 --${missing.join(' --')}）-----`);
        continue;
      }
      try {
        const r = mod[fn](...args(a));
        ok++;
        if (a.json) { console.log(JSON.stringify({ system: e, fn, result: r }, null, 2)); continue; }
        console.log(`\n===== ${e}（${fn}）=====`);
        const txt = textFn ? mod[textFn](r) : null;
        console.log(txt && txt.length > 20 ? txt : JSON.stringify(r, null, 2).slice(0, 1200));
      } catch (err) {
        fail++;
        console.error(`\n✗ ${e}: ${err.message}`);
      }
    }
    if (sys === 'all') console.log(`\n—— 共 ${list.length} 个体系：成功 ${ok} / 跳过 ${skip} / 失败 ${fail} ——`);
    process.exit(fail ? 1 : 0);
  }

  console.error(`未知命令 "${cmd}"\n\n${HELP}`);
  process.exit(2);
} catch (e) {
  console.error('✗ ' + e.message);
  process.exit(1);
}
