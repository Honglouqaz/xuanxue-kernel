/**
 * 历法核心引擎 —— 公历 / 农历 / 节气 / 四柱
 *
 * 数据源：src/data/calendar_data.js（1900-2100，由权威历法库生成）
 * 节气表：每年 24 个 × 20bit，值为「该年 1 月 1 日 00:00 起的分钟数」
 * 农历表：每年 4 字节 —— 春节年内日(9bit) | 闰月号(4bit) | 13个月大小(13bit)
 *
 * 四柱规则（对齐主流排盘软件）：
 *   年柱 —— 立春换年
 *   月柱 —— 十二节换月（立春起寅月）
 *   日柱 —— 0 点换日
 *   时柱 —— 23:00 后按次日日干起（夜子时）
 */
import {
  CAL_START_YEAR, CAL_END_YEAR, JIEQI_B64, LUNAR_B64,
} from '../data/calendar_data.js';
import { GAN, ZHI } from './constants.js';

// ───────────────────────── base64 / 位读取 ─────────────────────────
function b64ToBytes(s) {
  if (typeof atob === 'function') {
    const bin = atob(s);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(s, 'base64'));
  throw new Error('无可用的 base64 解码实现');
}

const N_YEARS = CAL_END_YEAR - CAL_START_YEAR + 1;
let _jieqi = null;
let _lunar = null;
let _lunarCache = null;

function decodeJieqi() {
  if (_jieqi) return _jieqi;
  const bytes = b64ToBytes(JIEQI_B64);
  const out = new Array(N_YEARS);
  let bit = 0;
  for (let y = 0; y < N_YEARS; y++) {
    const arr = new Int32Array(24);
    for (let k = 0; k < 24; k++) {
      let v = 0;
      for (let b = 0; b < 20; b++) {
        const bo = bit + b;
        v = (v << 1) | ((bytes[bo >> 3] >> (7 - (bo & 7))) & 1);
      }
      arr[k] = v;
      bit += 20;
    }
    out[y] = arr;
  }
  _jieqi = out;
  return out;
}

function decodeLunar() {
  if (_lunar) return _lunar;
  const bytes = b64ToBytes(LUNAR_B64);
  const out = new Array(N_YEARS);
  for (let y = 0; y < N_YEARS; y++) {
    const o = y * 4;
    const v = (bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3];
    const springDoy = v & 0x1FF;
    const leap = (v >>> 9) & 0xF;
    const sizes = [];
    for (let i = 0; i < 13; i++) sizes.push((v >>> (13 + i)) & 1);
    out[y] = (springDoy === 0 && leap === 0 && sizes.every(s => s === 0))
      ? null
      : { springDoy, leap, sizes: sizes.slice(0, leap ? 13 : 12) };
  }
  _lunar = out;
  return out;
}

// ───────────────────────── 公历工具 ─────────────────────────
export function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}
export function daysInYear(y) { return isLeapYear(y) ? 366 : 365; }

const CUM_COMMON = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const CUM_LEAP = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];

/** 年内第几天（1-based） */
export function dayOfYear(y, m, d) {
  const cum = isLeapYear(y) ? CUM_LEAP : CUM_COMMON;
  return cum[m - 1] + d;
}

/** 年内序号（0-based）→ {m, d} */
function doyToDate(y, doy0) {
  const cum = isLeapYear(y) ? CUM_LEAP : CUM_COMMON;
  for (let m = 11; m >= 0; m--) {
    if (doy0 >= cum[m]) return { m: m + 1, d: doy0 - cum[m] + 1 };
  }
  return { m: 1, d: 1 };
}

/** 儒略日数（用于日期间隔） */
export function jdn(y, m, d) {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy
    + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

// ───────────────────────── 节气 ─────────────────────────
export const JIEQI_NAMES = ['小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑',
  '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'];

/** 某年 24 节气的「年内分钟数」数组 */
export function jieqiMinutesOfYear(y) {
  if (y < CAL_START_YEAR || y > CAL_END_YEAR) return null;
  return decodeJieqi()[y - CAL_START_YEAR];
}

/** 某年某节气的年内分钟数 */
export function jieqiMinute(y, name) {
  const arr = jieqiMinutesOfYear(y);
  if (!arr) return null;
  const i = JIEQI_NAMES.indexOf(name);
  return i < 0 ? null : arr[i];
}

/** 某年某节气的公历时刻 */
export function jieqiTime(y, name) {
  const min = jieqiMinute(y, name);
  if (min === null) return null;
  const dt = doyToDate(y, Math.floor(min / 1440));
  return {
    year: y, month: dt.m, day: dt.d,
    hour: Math.floor((min % 1440) / 60), minute: min % 60,
  };
}

/** 某年全部节气（含公历时刻），按年内顺序 */
export function jieqiListOfYear(y) {
  const arr = jieqiMinutesOfYear(y);
  if (!arr) return [];
  return JIEQI_NAMES.map((name, i) => {
    const dt = doyToDate(y, Math.floor(arr[i] / 1440));
    return {
      name, year: y, month: dt.m, day: dt.d,
      hour: Math.floor((arr[i] % 1440) / 60), minute: arr[i] % 60, idx: i,
    };
  });
}

/** 某公历日是否有节气（可能有 1 个） */
export function jieqiOnDate(y, m, d) {
  const list = jieqiListOfYear(y);
  const hit = list.filter(x => x.month === m && x.day === d);
  return hit.length ? hit[0] : null;
}

/** 取某时刻所处的节气区间（上一个节气 → 下一个节气） */
export function currentJieqiRange(y, m, d, h = 0, mi = 0) {
  const t = (dayOfYear(y, m, d) - 1) * 1440 + h * 60 + mi;
  const list = jieqiListOfYear(y);
  if (!list.length) return null;
  let prev = null, next = null;
  for (const j of list) {
    const jt = dayOfYear(y, j.month, j.day) * 1440 + j.hour * 60 + j.minute;
    if (jt <= t) prev = { ...j, t: jt };
    else { next = { ...j, t: jt }; break; }
  }
  if (!prev) {
    const pk = jieqiListOfYear(y - 1);
    if (pk && pk.length) prev = { ...pk[23] };
  }
  return { prev, next };
}

// ───────────────────────── 农历 ─────────────────────────
function lunarYearRecord(y) {
  if (y < CAL_START_YEAR || y > CAL_END_YEAR) return null;
  if (!_lunarCache) _lunarCache = decodeLunar();
  return _lunarCache[y - CAL_START_YEAR];
}

const LUNAR_MONTH_CN = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
const LUNAR_DAY_CN = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

/** 公历 → 农历 */
export function toLunar(y, m, d) {
  let rec = lunarYearRecord(y);
  if (!rec) return null;
  const doy0 = dayOfYear(y, m, d) - 1;   // 转 0-based，与 springDoy 口径一致
  let ly, offset;
  if (doy0 >= rec.springDoy) {
    ly = y;
    offset = doy0 - rec.springDoy;
  } else {
    ly = y - 1;
    rec = lunarYearRecord(ly);
    if (!rec) return null;
    offset = daysInYear(y - 1) + doy0 - rec.springDoy;
  }
  const { leap, sizes } = rec;
  let acc = 0;
  for (let i = 0; i < sizes.length; i++) {
    const days = sizes[i] ? 30 : 29;
    if (offset < acc + days) {
      const dayNum = offset - acc + 1;
      let month, isLeap;
      if (leap === 0 || i < leap) { month = i + 1; isLeap = false; }
      else if (i === leap) { month = leap; isLeap = true; }
      else { month = i; isLeap = false; }
      return {
        year: ly, month, day: dayNum, isLeap,
        monthCn: (isLeap ? '闰' : '') + LUNAR_MONTH_CN[month - 1] + '月',
        dayCn: LUNAR_DAY_CN[dayNum - 1],
        text: `${(isLeap ? '闰' : '')}${LUNAR_MONTH_CN[month - 1]}月${LUNAR_DAY_CN[dayNum - 1]}`,
      };
    }
    acc += days;
  }
  return null;
}

/** 农历 → 公历 */
export function lunarToSolar(ly, lm, ld, isLeap = false) {
  const rec = lunarYearRecord(ly);
  if (!rec) return null;
  const startY = ly;
  let acc = rec.springDoy;
  const { leap, sizes } = rec;
  for (let i = 0; i < sizes.length; i++) {
    let month, lp;
    if (leap === 0 || i < leap) { month = i + 1; lp = false; }
    else if (i === leap) { month = leap; lp = true; }
    else { month = i; lp = false; }
    if (month === lm && lp === isLeap) {
      const doy = acc + (ld - 1);
      const dt = doyToDate(startY, doy);
      return { year: startY, month: dt.m, day: dt.d };
    }
    acc += sizes[i] ? 30 : 29;
  }
  return null;
}

// ───────────────────────── 四柱 ─────────────────────────
/** 年柱（以 1984 甲子为锚） */
export function yearGanZhi(y) {
  const i = ((y - 1984) % 60 + 60) % 60;
  return GAN[i % 10] + ZHI[i % 12];
}

/** 十二节 → 月支映射（按年内顺序） */
const JIE_SEQ = [
  { name: '小寒', zhi: '丑' }, { name: '立春', zhi: '寅' }, { name: '惊蛰', zhi: '卯' },
  { name: '清明', zhi: '辰' }, { name: '立夏', zhi: '巳' }, { name: '芒种', zhi: '午' },
  { name: '小暑', zhi: '未' }, { name: '立秋', zhi: '申' }, { name: '白露', zhi: '酉' },
  { name: '寒露', zhi: '戌' }, { name: '立冬', zhi: '亥' }, { name: '大雪', zhi: '子' },
];

/** 五虎遁：由年干推月干 */
export function monthGanByYearGan(yearGan, monthZhi) {
  const yg = GAN.indexOf(yearGan);
  const start = [2, 4, 6, 8, 0][((yg % 5) + 5) % 5]; // 寅月天干
  const off = ((ZHI.indexOf(monthZhi) - ZHI.indexOf('寅')) % 12 + 12) % 12;
  return GAN[(start + off) % 10];
}

/** 五鼠遁：由日干推时干 */
export function hourGanByDayGan(dayGan, hourZhiIdx) {
  const dg = GAN.indexOf(dayGan);
  const start = [0, 2, 4, 6, 8][((dg % 5) + 5) % 5];
  return GAN[(start + hourZhiIdx) % 10];
}

/** 小时 → 时支索引 */
export function hourToZhiIndex(h) {
  if (h === 23 || h === 0) return 0;
  return Math.floor((h + 1) / 2);
}

/** 日柱序（0-59），锚点 2000-01-01 = 戊午(54) */
export function dayGanZhiIndex(y, m, d) {
  const diff = jdn(y, m, d) - jdn(2000, 1, 1);
  return ((54 + diff) % 60 + 60) % 60;
}

/**
 * 四柱排盘
 * @param {number} y 公历年
 * @param {number} m 月
 * @param {number} d 日
 * @param {number} h 时（0-23）
 * @param {number} mi 分
 * @param {object} [opt] { longitude, useTrueSolarTime }
 * @returns {{year,month,day,hour,raw,trueSolar,notes}} 各柱为两字干支字符串
 */
export function fourPillars(y, m, d, h = 0, mi = 0, opt = {}) {
  const notes = [];
  let tY = y, tM = m, tD = d, tH = h, tMi = mi;

  // ── 真太阳时校正（可选）──
  if (opt.useTrueSolarTime && typeof opt.longitude === 'number') {
    const deltaMin = Math.round((opt.longitude - 120) * 4);
    let total = tH * 60 + tMi + deltaMin;
    if (deltaMin !== 0) notes.push(`真太阳时校正 ${deltaMin > 0 ? '+' : ''}${deltaMin} 分钟`);
    while (total < 0) { total += 1440; const prev = jdn(tY, tM, tD) - 1; const dt = jdnToDate(prev); tY = dt.y; tM = dt.m; tD = dt.d; }
    while (total >= 1440) { total -= 1440; const dt = jdnToDate(jdn(tY, tM, tD) + 1); tY = dt.y; tM = dt.m; tD = dt.d; }
    tH = Math.floor(total / 60); tMi = total % 60;
  }

  if (tY < CAL_START_YEAR || tY > CAL_END_YEAR) {
    notes.push(`年份 ${tY} 超出数据范围（${CAL_START_YEAR}-${CAL_END_YEAR}），结果可能不准`);
  }

  // 节气表的值为「该年 1/1 00:00 起的分钟数」，dayOfYear 是 1-based，故须减 1 天对齐
  const tmin = (dayOfYear(tY, tM, tD) - 1) * 1440 + tH * 60 + tMi;

  // ── 年柱：立春换年 ──
  let yForGZ = tY;
  const lichun = jieqiMinute(tY, '立春');
  if (lichun !== null && tmin < lichun) yForGZ = tY - 1;
  const yGZ = yearGanZhi(yForGZ);

  // ── 月柱：十二节换月 ──
  let mZhi = null;
  for (let i = JIE_SEQ.length - 1; i >= 0; i--) {
    const jt = jieqiMinute(tY, JIE_SEQ[i].name);
    if (jt !== null && tmin >= jt) { mZhi = JIE_SEQ[i].zhi; break; }
  }
  if (mZhi === null) mZhi = '子'; // 小寒之前属于上一年大雪月
  const mGan = monthGanByYearGan(yGZ[0], mZhi);
  const mGZ = mGan + mZhi;

  // ── 日柱：0 点换日 ──
  const dayIdx = dayGanZhiIndex(tY, tM, tD);
  const dGZ = GAN[dayIdx % 10] + ZHI[dayIdx % 12];

  // ── 时柱：23:00 后按次日日干起（夜子时）──
  const hzIdx = hourToZhiIndex(tH);
  const dayGanForHour = (tH === 23) ? GAN[(dayIdx + 1) % 10] : GAN[dayIdx % 10];
  const hGZ = hourGanByDayGan(dayGanForHour, hzIdx) + ZHI[hzIdx];
  if (tH === 23) notes.push('夜子时：日柱不换，时柱按次日日干起');

  return {
    year: yGZ, month: mGZ, day: dGZ, hour: hGZ,
    pillars: [yGZ, mGZ, dGZ, hGZ],
    raw: { year: tY, month: tM, day: tD, hour: tH, minute: tMi },
    trueSolar: (opt.useTrueSolarTime && opt.longitude !== undefined)
      ? { h: tH, m: tMi } : null,
    notes,
  };
}

/** 儒略日 → 公历 */
export function jdnToDate(j) {
  let a = j + 32044;
  let b = Math.floor((4 * a + 3) / 146097);
  let c = a - Math.floor(146097 * b / 4);
  let dd = Math.floor((4 * c + 3) / 1461);
  let e = c - Math.floor(1461 * dd / 4);
  let mm = Math.floor((5 * e + 2) / 153);
  const day = e - Math.floor((153 * mm + 2) / 5) + 1;
  const month = mm + 3 - 12 * Math.floor(mm / 10);
  const year = 100 * b + dd - 4800 + Math.floor(mm / 10);
  return { y: year, m: month, d: day };
}

// ───────────────────────── 便捷输出 ─────────────────────────
/** 干支 → 纳音需要的 60 甲子序 */
export function jiaziIndex(gan, zhi) {
  const g = GAN.indexOf(gan), z = ZHI.indexOf(zhi);
  for (let i = 0; i < 60; i++) if (i % 10 === g && i % 12 === z) return i;
  return -1;
}

/** 数据覆盖范围 */
export const COVERAGE = { start: CAL_START_YEAR, end: CAL_END_YEAR };
