/**
 * 梅花易数引擎
 * 体用生克 + 互卦变卦，最灵活的占法
 */
import { fourPillars, toLunar } from '../core/calendar.js';
import { ZHI, SHENG, KE } from '../core/constants.js';
import { GUA_ORDER } from '../core/bagua.js';
import { guaFromBits } from '../core/bagua.js';

/** 先天八卦数：乾1 兑2 离3 震4 巽5 坎6 艮7 坤8 */
export const XIANTIAN_NUM = { 乾: 1, 兑: 2, 离: 3, 震: 4, 巽: 5, 坎: 6, 艮: 7, 坤: 8 };
export const NUM_TO_GUA = { 1: '乾', 2: '兑', 3: '离', 4: '震', 5: '巽', 6: '坎', 7: '艮', 8: '坤' };
const BITS = { 乾: [1, 1, 1], 兑: [1, 1, 0], 离: [1, 0, 1], 震: [1, 0, 0], 巽: [0, 1, 1], 坎: [0, 1, 0], 艮: [0, 0, 1], 坤: [0, 0, 0] };
const NATURE = { 乾: '天', 兑: '泽', 离: '火', 震: '雷', 巽: '风', 坎: '水', 艮: '山', 坤: '地' };
const WX_OF = { 乾: '金', 兑: '金', 离: '火', 震: '木', 巽: '木', 坎: '水', 艮: '土', 坤: '土' };

function mod8(n) { const r = n % 8; return r === 0 ? 8 : r; }
function mod6(n) { const r = n % 6; return r === 0 ? 6 : r; }

/**
 * 起卦
 * @param {object} opt
 *   mode: 'time' 时间起卦 / 'number' 数字起卦 / 'manual' 手动
 *   numbers: [上卦数, 下卦数, 动爻数] 数字起卦
 *   bits / change: 手动
 *   date: { y, mo, d, h, mi }
 */
export function qiGuaMeihua(opt = {}) {
  const now = opt.date || nowParts();
  let up, lo, change, method;

  if (opt.mode === 'manual' && Array.isArray(opt.bits)) {
    up = bitsToGua(opt.bits.slice(3, 6));
    lo = bitsToGua(opt.bits.slice(0, 3));
    change = (opt.change ?? 0) + 1;
    method = '手动';
  } else if (opt.mode === 'number' && Array.isArray(opt.numbers)) {
    const [a, b, c] = opt.numbers;
    up = NUM_TO_GUA[mod8(a)];
    lo = NUM_TO_GUA[mod8(b)];
    change = mod6(c);
    method = `数字起卦（${a} / ${b} / ${c}）`;
  } else {
    const lunar = toLunar(now.y, now.mo, now.d);
    const fp = fourPillars(now.y, now.mo, now.d, now.h, now.mi);
    const yz = ZHI.indexOf(fp.year[1]) + 1;          // 年支数 子1..亥12
    const lm = lunar ? lunar.month : now.mo;
    const ld = lunar ? lunar.day : now.d;
    const hz = Math.floor(((now.h + 1) % 24) / 2) + 1; // 时支数
    const base = yz + lm + ld;
    up = NUM_TO_GUA[mod8(base)];
    lo = NUM_TO_GUA[mod8(base + hz)];
    change = mod6(base + hz);
    method = `时间起卦（年支${yz} 月${lm} 日${ld} 时${hz}）`;
  }

  const benBits = [...BITS[lo], ...BITS[up]];
  const bianBits = [...benBits];
  bianBits[change - 1] = bianBits[change - 1] ? 0 : 1;

  const huLower = bitsToGua(benBits.slice(1, 4)); // 2·3·4 爻
  const huUpper = bitsToGua(benBits.slice(2, 5)); // 3·4·5 爻

  const ben = { upper: up, lower: lo, bits: benBits };
  const bian = { upper: bitsToGua(bianBits.slice(3, 6)), lower: bitsToGua(bianBits.slice(0, 3)), bits: bianBits };
  const hu = { upper: huUpper, lower: huLower, bits: [...BITS[huLower], ...BITS[huUpper]] };

  // 体用：动爻所在之卦为「用」，另一卦为「体」
  const tiIsUpper = change <= 3;
  const ti = tiIsUpper ? up : lo;
  const yong = tiIsUpper ? lo : up;
  const tiWx = WX_OF[ti], yongWx = WX_OF[yong];
  const rel = wuxingRel(tiWx, yongWx);

  return {
    method,
    time: now,
    lunar: toLunar(now.y, now.mo, now.d),
    ganzhi: fourPillars(now.y, now.mo, now.d, now.h, now.mi).pillars,
    change,
    ben, bian, hu,
    ti, yong, tiWx, yongWx,
    relation: rel,
    guaNameShu: { 上卦: up, 下卦: lo },
  };
}

function bitsToGua(bits) {
  return GUA_ORDER.find(g => BITS[g].join('') === bits.join(''));
}

/** 体用五行关系 */
function wuxingRel(tiWx, yongWx) {
  if (tiWx === yongWx) return { type: '体用比和', level: '吉', desc: '体用同气，事顺有成，彼此相扶' };
  if (SHENG[yongWx] === tiWx) return { type: '用生体', level: '大吉', desc: '外来助力，不劳而获，贵人相扶' };
  if (SHENG[tiWx] === yongWx) return { type: '体生用', level: '小凶', desc: '我生他人，耗费精力，付出多于回报' };
  if (KE[tiWx] === yongWx) return { type: '体克用', level: '小吉', desc: '我能制事，事在掌控，但需费力' };
  if (KE[yongWx] === tiWx) return { type: '用克体', level: '大凶', desc: '外来压制，受制于人，事多阻逆' };
  return { type: '—', level: '—', desc: '' };
}

/** 卦象解读文本（供 AI） */
export function meihuaToText(r) {
  const L = [];
  L.push(`【起法】${r.method}`);
  L.push(`【时间】${r.time.y}年${r.time.mo}月${r.time.d}日 ${r.time.h}:${String(r.time.mi).padStart(2, '0')}`);
  if (r.lunar) L.push(`【农历】${r.lunar.year}年${r.lunar.text}`);
  L.push('');
  L.push(`【本卦】上${r.ben.upper}(${NATURE[r.ben.upper]}) 下${r.ben.lower}(${NATURE[r.ben.lower]})　${guaName(r.ben)}`);
  L.push(`【互卦】上${r.hu.upper}(${NATURE[r.hu.upper]}) 下${r.hu.lower}(${NATURE[r.hu.lower]})　${guaName(r.hu)}`);
  L.push(`【变卦】上${r.bian.upper}(${NATURE[r.bian.upper]}) 下${r.bian.lower}(${NATURE[r.bian.lower]})　${guaName(r.bian)}`);
  L.push('');
  L.push(`【动爻】第 ${r.change} 爻`);
  L.push(`【体用】体=${r.ti}(${r.tiWx})　用=${r.yong}(${r.yongWx})　→ ${r.relation.type}（${r.relation.level}）`);
  L.push(`【断语】${r.relation.desc}`);
  L.push('');
  L.push(`【卦象】${r.ben.bits.map(b => b ? '—' : '- -').reverse().join(' / ')}  （自上而下）`);
  return L.join('\n');
}

function guaName(g) {
  const u = g.upper, l = g.lower;
  const UP_N = { 乾: '天', 兑: '泽', 离: '火', 震: '雷', 巽: '风', 坎: '水', 艮: '山', 坤: '地' };
  if (u === l) return `${u}为${UP_N[u]}`;
  return UP_N[u] + UP_N[l];
}

function nowParts(d = new Date()) {
  return { y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate(), h: d.getHours(), mi: d.getMinutes() };
}
