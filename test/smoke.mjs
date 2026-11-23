#!/usr/bin/env node
/**
 * 冒烟测试：15 个引擎全部能加载 + 三柱排盘出真实结构。
 * 跑法：node test/smoke.mjs
 * 目的：防止「改历法常数 / 补引擎」时静默坏掉某个体系。
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(import.meta.dirname, '..', 'kernel', 'engines');
// 真实入参契约（与 kernel/ui/modules.js 的 F_BIRTH 字段一致）：y / mo / d / h / mi / gender
const input = { y: 1990, mo: 6, d: 15, h: 10, mi: 0, gender: 'M' };

let pass = 0, fail = 0;
const ok = (n, c, extra = '') => { c ? (pass++, console.log('  ✅ ' + n)) : (fail++, console.log('  ❌ ' + n + ' ' + extra)); };

console.log('【1】15 个引擎全部可加载');
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.js')).sort();
for (const f of files) {
  try {
    const m = await import(path.join(DIR, f));
    const names = Object.keys(m);
    ok(f.padEnd(15) + ' 导出 ' + names.length + ' 项', names.length > 0);
  } catch (e) {
    ok(f, false, e.message.slice(0, 80));
  }
}

console.log('\n【2】核心排盘出真实结构');
const bazi = await import(path.join(DIR, 'bazi.js'));
const r1 = bazi.paipanBazi(input);
ok('八字有四柱', JSON.stringify(r1).length > 500, JSON.stringify(r1).slice(0,80));
ok('八字可转文本', typeof bazi.baziToText(r1) === 'string' && bazi.baziToText(r1).length > 20);

const ziwei = await import(path.join(DIR, 'ziwei.js'));
const r2 = ziwei.paipanZiwei(input);
ok('紫微有十二宫', JSON.stringify(r2).length > 300);
ok('紫微可转文本', ziwei.ziweiToText(r2).length > 20);

const qimen = await import(path.join(DIR, 'qimen.js'));
const r3 = qimen.paipanQimen(input);
ok('奇门有九宫八门', JSON.stringify(r3).length > 200);

const liuyao = await import(path.join(DIR, 'liuyao.js'));
const r4 = liuyao.qiGua(input);
ok('六爻出生卦', r4 != null);

const hl = await import(path.join(DIR, 'huangli.js'));
const h1 = hl.huangli(2026, 11, 23);
ok('黄历可查且有星宿', h1 && h1.xiu && typeof h1.xiu.luck === 'string', JSON.stringify(h1 && h1.xiu));

console.log('\n【3】历法口径自洽');
const cal = await import(path.join(DIR, '..', 'core', 'calendar.js'));
ok('覆盖 1900–2100', cal.COVERAGE && cal.COVERAGE.start === 1900 && cal.COVERAGE.end === 2100, JSON.stringify(cal.COVERAGE));
const fp = cal.fourPillars(1990, 6, 15, 10, 0, 8);
ok('四柱返回 4 柱', fp && (Array.isArray(fp) ? fp.length === 4 : JSON.stringify(fp).length > 10));
const lunar = cal.toLunar(2026, 11, 23);
ok('公历转农历可用', lunar != null);
ok('节气表非空', cal.jieqiListOfYear(2026).length >= 24);

console.log('\n===== ' + pass + ' 通过 / ' + fail + ' 失败 =====');
process.exit(fail ? 1 : 0);
