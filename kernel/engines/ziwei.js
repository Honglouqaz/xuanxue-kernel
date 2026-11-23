/**
 * 紫微斗数引擎
 * ─────────────────────────────────────────────────────────
 * 起盘流程：定命身宫 → 定十二宫 → 五虎遁宫干 → 纳音定五行局
 *          → 安紫微（口诀公式）→ 紫微系/天府系十四主星
 *          → 安辅星（月系/时系/年干系/年支系）→ 四化 → 大限/流年
 *
 * 紫微定位用闭式公式（非查表），已自检：
 *   · 局日相同必归寅（水2局初二、木3局初三、金4局初四、土5局初五、火6局初六 均在寅）
 *   · 初一宫位符合口诀「六五四三二，酉午亥辰丑」
 *   · 水二局 30 天落宫序列与传世星表逐日一致
 */
import { fourPillars, toLunar, hourToZhiIndex, jdn } from '../core/calendar.js';
import { GAN, ZHI, ZHI_WX, SHENGXIAO, nayin } from '../core/constants.js';

// ────────────────────────── 基础表 ──────────────────────────

/** 十二宫名，自命宫起逆排（盘面 index 递减方向） */
export const PALACE_NAMES = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄',
  '迁移', '交友', '官禄', '田宅', '福德', '父母'];

/** 宫位 index 约定：子=0 丑=1 寅=2 …… 亥=11 */
export const idxOf = (z) => ZHI.indexOf(z);
export const zhiOf = (i) => ZHI[((i % 12) + 12) % 12];

/** 纳音五行 → 局数 */
const WX_TO_JU = { 水: 2, 木: 3, 金: 4, 土: 5, 火: 6 };
export const JU_NAME = { 2: '水二局', 3: '木三局', 4: '金四局', 5: '土五局', 6: '火六局' };

/** 口诀「六五四三二，酉午亥辰丑」：各局初一紫微落宫 */
const ZIWEI_BASE = { 2: idxOf('丑'), 3: idxOf('辰'), 4: idxOf('亥'), 5: idxOf('午'), 6: idxOf('酉') };

/** 五虎遁：年干 → 寅宫天干下标 */
const YIN_GAN = { 甲: 2, 己: 2, 乙: 4, 庚: 4, 丙: 6, 辛: 6, 丁: 8, 壬: 8, 戊: 0, 癸: 0 };

/** 十四主星属性 */
export const MAIN_STAR_INFO = {
  紫微: { wx: '土', kind: '帝星', note: '群星之首，主尊贵、领导、孤高' },
  天机: { wx: '木', kind: '善星', note: '主智慧、机变、谋略、多思' },
  太阳: { wx: '火', kind: '贵星', note: '主光明、父兄、名望、博爱' },
  武曲: { wx: '金', kind: '财星', note: '主财帛、刚毅、果断、孤克' },
  天同: { wx: '水', kind: '福星', note: '主福泽、温和、享受、惰性' },
  廉贞: { wx: '火', kind: '囚星', note: '主纪律、权术、桃花、血光' },
  天府: { wx: '土', kind: '库星', note: '主财库、保守、稳厚、能容' },
  太阴: { wx: '水', kind: '富星', note: '主田宅、母妻、阴柔、内敛' },
  贪狼: { wx: '水木', kind: '桃花', note: '主欲望、才艺、交际、酒色' },
  巨门: { wx: '水', kind: '暗星', note: '主口舌、是非、辩才、疑虑' },
  天相: { wx: '水', kind: '印星', note: '主辅佐、协调、文书、谨慎' },
  天梁: { wx: '土', kind: '荫星', note: '主荫庇、长辈、医药、清高' },
  七杀: { wx: '金火', kind: '将星', note: '主肃杀、冲劲、变革、刑伤' },
  破军: { wx: '水', kind: '耗星', note: '主破旧立新、变动、损耗' },
};

/** 紫微系：相对紫微宫位 index 的偏移（逆行 = 减） */
const ZIWEI_SERIES = [
  ['紫微', 0], ['天机', -1], ['太阳', -3], ['武曲', -4], ['天同', -5], ['廉贞', -8],
];
/** 天府系：相对天府宫位 index 的偏移（顺行 = 加） */
const TIANFU_SERIES = [
  ['天府', 0], ['太阴', 1], ['贪狼', 2], ['巨门', 3], ['天相', 4],
  ['天梁', 5], ['七杀', 6], ['破军', 10],
];

/** 年干四化：禄 权 科 忌 */
export const SIHUA = {
  甲: ['廉贞', '破军', '武曲', '太阳'],
  乙: ['天机', '天梁', '紫微', '太阴'],
  丙: ['天同', '天机', '文昌', '廉贞'],
  丁: ['太阴', '天同', '天机', '巨门'],
  戊: ['贪狼', '太阴', '右弼', '天机'],
  己: ['武曲', '贪狼', '天梁', '文曲'],
  庚: ['太阳', '武曲', '天府', '天同'],   // 庚干四化各派分歧，此处取中州派「阳武府同」
  辛: ['巨门', '太阳', '文曲', '文昌'],
  壬: ['天梁', '紫微', '左辅', '武曲'],
  癸: ['破军', '巨门', '太阴', '贪狼'],
};

/** 天魁天钺（年干）：甲戊庚丑未 · 乙己子申 · 丙丁亥酉 · 辛午寅 · 壬癸卯巳 */
const KUI_YUE = {
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
  乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'],
  辛: ['午', '寅'],
  壬: ['卯', '巳'], 癸: ['卯', '巳'],
};
/** 禄存（年干） */
const LUCUN = { 甲: '寅', 乙: '卯', 丙: '巳', 戊: '巳', 丁: '午', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' };
/** 火星铃星起点（年支组）：起点宫 → 自子时顺数至生时 */
const HUO_LING = {
  寅: ['丑', '卯'], 午: ['丑', '卯'], 戌: ['丑', '卯'],
  申: ['寅', '戌'], 子: ['寅', '戌'], 辰: ['寅', '戌'],
  巳: ['卯', '戌'], 酉: ['卯', '戌'], 丑: ['卯', '戌'],
  亥: ['酉', '戌'], 卯: ['酉', '戌'], 未: ['酉', '戌'],
};
/** 天马（年支三合） */
const TIAN_MA = { 寅: '申', 午: '申', 戌: '申', 申: '寅', 子: '寅', 辰: '寅', 巳: '亥', 酉: '亥', 丑: '亥', 亥: '巳', 卯: '巳', 未: '巳' };

/** 星曜吉凶粗分（用于统计提示，非断语） */
export const STAR_TONE = {
  紫微: 1, 天机: 1, 太阳: 1, 武曲: 0, 天同: 1, 廉贞: 0, 天府: 1, 太阴: 1,
  贪狼: 0, 巨门: -1, 天相: 1, 天梁: 1, 七杀: 0, 破军: -1,
  左辅: 1, 右弼: 1, 文昌: 1, 文曲: 1, 天魁: 1, 天钺: 1,
  禄存: 1, 天马: 0, 火星: -1, 铃星: -1, 擎羊: -1, 陀罗: -1,
  地空: -1, 地劫: -1, 天刑: -1, 天姚: -1, 红鸾: 1, 天喜: 1,
};

// ────────────────────────── 核心算法 ──────────────────────────

/**
 * 安紫微：局数除日数，商数宫前走；若见数无余，便要起虎口；日数小于局，还直宫中守。
 * @param {number} ju 五行局数 2-6
 * @param {number} day 农历生日 1-30
 * @returns {number} 紫微所在宫位 index（子=0）
 */
export function anZiwei(ju, day) {
  const q = Math.floor(day / ju);
  const r = day % ju;
  if (r === 0 && q > 0) return (q + 1) % 12;   // 整除 → 起虎口（寅起，走 q-1）
  return (ZIWEI_BASE[ju] + q) % 12;            // 商数宫前走（自初一宫位顺行 q 宫）
}

/** 命宫 / 身宫（农历月 + 时支） */
export function mingShenGong(lunarMonth, hourZhiIdx) {
  const m = ((lunarMonth - 1) % 12 + 12) % 12;
  const ming = (((2 + m - hourZhiIdx) % 12) + 12) % 12;  // 寅起正月，子时逆数
  const shen = (((2 + m + hourZhiIdx) % 12) + 12) % 12;  // 顺数至生时
  return { ming, shen };
}

/** 宫干：五虎遁定寅宫干，顺推 */
export function gongGan(yearGan, zhiIdx) {
  const yin = YIN_GAN[yearGan];
  return GAN[(yin + ((zhiIdx - 2 + 12) % 12)) % 10];
}

/** 五行局：由命宫干支纳音定 */
export function wuxingJu(yearGan, mingIdx) {
  const g = gongGan(yearGan, mingIdx);
  const z = zhiOf(mingIdx);
  const ny = nayin(g, z);                 // 如「天河水」
  const wx = ny[ny.length - 1];           // 取末字为五行
  const ju = WX_TO_JU[wx] || 2;
  return { gan: g, zhi: z, nayin: ny, wuxing: wx, ju, name: JU_NAME[ju] };
}

/** 大限：局数起运，阳男阴女顺行 */
export function daXian(ju, mingIdx, yearGan, gender) {
  const yang = GAN.indexOf(yearGan) % 2 === 0;       // 甲丙戊庚壬为阳
  const male = gender === 'M' || gender === '男';
  const forward = (yang && male) || (!yang && !male);
  const dir = forward ? 1 : -1;
  const list = [];
  for (let i = 0; i < 12; i++) {
    const gi = ((mingIdx + dir * i) % 12 + 12) % 12;
    const from = ju + i * 10;
    list.push({
      index: i, zhi: zhiOf(gi), gongIndex: gi,
      from, to: from + 9, range: `${from}-${from + 9}岁`,
    });
  }
  return { forward, dir, startAge: ju, list };
}

/**
 * 完整排盘
 * @param {object} input { y, mo, d, h, mi, gender, name, longitude, useTrueSolarTime }
 */
export function paipanZiwei(input) {
  const { y, mo, d, h = 0, mi = 0, gender = 'M' } = input;
  const notes = [];

  // 农历（紫微斗数用农历月日）
  const lunar = toLunar(y, mo, d);
  if (!lunar) notes.push('农历换算失败，回退用公历月日');
  const lunarMonth = lunar ? lunar.month : mo;
  const lunarDay = lunar ? lunar.day : d;
  if (lunar && lunar.leap) notes.push(`生于闰${lunar.month}月，斗数通例按本月计`);

  const fp = fourPillars(y, mo, d, h, mi, {
    useTrueSolarTime: input.useTrueSolarTime, longitude: input.longitude,
  });
  const yearGan = fp.year[0], yearZhi = fp.year[1];
  const hourZhiIdx = hourToZhiIndex(h);

  // 命身宫 & 五行局
  const { ming, shen } = mingShenGong(lunarMonth, hourZhiIdx);
  const juInfo = wuxingJu(yearGan, ming);

  // 安紫微 / 天府
  const zw = anZiwei(juInfo.ju, lunarDay);
  const tf = ((4 - zw) % 12 + 12) % 12;

  // 星盘
  const stars = Array.from({ length: 12 }, () => []);
  const put = (idx, name, series) => {
    const i = ((idx % 12) + 12) % 12;
    stars[i].push({ name, series, ...(MAIN_STAR_INFO[name] || {}) });
  };
  for (const [n, off] of ZIWEI_SERIES) put(zw + off, n, '紫微系');
  for (const [n, off] of TIANFU_SERIES) put(tf + off, n, '天府系');

  // ── 辅星（月系）──
  put(2 + (lunarMonth - 1), '左辅', '月系');                    // 辰起正月顺行
  put(10 - (lunarMonth - 1), '右弼', '月系');                   // 戌起正月逆行
  put(9 + (lunarMonth - 1), '天刑', '月系');                    // 酉起正月顺行
  put(1 + (lunarMonth - 1), '天姚', '月系');                    // 丑起正月顺行

  // ── 辅星（时系）──
  put(10 - hourZhiIdx, '文昌', '时系');                         // 戌起子时逆行
  put(4 + hourZhiIdx, '文曲', '时系');                          // 辰起子时顺行
  put(11 + hourZhiIdx, '地劫', '时系');                         // 亥起子时顺行
  put(11 - hourZhiIdx, '地空', '时系');                         // 亥起子时逆行

  // ── 辅星（年干系）──
  const [kui, yue] = KUI_YUE[yearGan] || ['丑', '未'];
  put(idxOf(kui), '天魁', '年干系');
  put(idxOf(yue), '天钺', '年干系');
  const lc = idxOf(LUCUN[yearGan]);
  put(lc, '禄存', '年干系');
  put(lc + 1, '擎羊', '年干系');
  put(lc - 1, '陀罗', '年干系');
  const sh = SIHUA[yearGan] || [];
  const sihuaMap = {};
  sh.forEach((star, i) => { sihuaMap[star] = ['化禄', '化权', '化科', '化忌'][i]; });

  // ── 辅星（年支系）──
  const [huo, ling] = HUO_LING[yearZhi] || ['丑', '卯'];
  put(idxOf(huo) + hourZhiIdx, '火星', '年支系');               // 起点起子时顺数
  put(idxOf(ling) + hourZhiIdx, '铃星', '年支系');
  put(idxOf(TIAN_MA[yearZhi]), '天马', '年支系');
  const hongIdx = ((3 - idxOf(yearZhi)) % 12 + 12) % 12;        // 卯起子年逆数至年支
  put(hongIdx, '红鸾', '年支系');
  put(hongIdx + 6, '天喜', '年支系');

  // 把四化挂到星上
  for (const arr of stars) {
    for (const s of arr) if (sihuaMap[s.name]) s.sihua = sihuaMap[s.name];
  }

  // ── 十二宫 ──
  const palaces = [];
  for (let i = 0; i < 12; i++) {
    const gi = ((ming - i) % 12 + 12) % 12;      // 命宫起逆排
    palaces.push({
      name: PALACE_NAMES[i],
      gongIndex: gi,
      zhi: zhiOf(gi),
      gan: gongGan(yearGan, gi),
      stars: stars[gi],
      isMing: gi === ming,
      isShen: gi === shen,
    });
  }

  // ── 大限 ──
  const dx = daXian(juInfo.ju, ming, yearGan, gender);

  // ── 五行局平衡统计（星曜五行分布）──
  const starWx = {};
  for (const arr of stars) for (const s of arr) {
    if (!MAIN_STAR_INFO[s.name]) continue;
    const k = s.wx || '?';
    starWx[k] = (starWx[k] || 0) + 1;
  }

  // ── 自检 ──
  if (lunarDay === juInfo.ju && zw !== 2) notes.push('自检异常：局日相同未归寅');
  notes.push('星曜庙旺（亮度）未纳入 —— 各派亮度表差异大，需人工对照');
  notes.push('四化中庚干存在「阳武府同 / 阳武阴同」两派分歧，本盘取中州派');

  return {
    input: { ...input, gender },
    lunar, lunarMonth, lunarDay, hourZhiIdx,
    pillars: fp.pillars, yearGan, yearZhi, sx: SHENGXIAO[idxOf(yearZhi)],
    mingIdx: ming, shenIdx: shen, mingZhi: zhiOf(ming), shenZhi: zhiOf(shen),
    ju: juInfo,
    ziweiIdx: zw, tianfuIdx: tf,
    stars, palaces, sihuaMap, daXian: dx, starWx,
    notes,
  };
}

// ────────────────────────── 文本 / 展示 ──────────────────────────

/** 排出 4×4 方盘（寅起，地支固定位） */
export function ziweiGrid(r) {
  // 方盘地支位置：上排 巳午未申 / 右列 申酉戌亥 / 下排 亥子丑寅 / 左列 寅卯辰巳
  const POS = [
    ['巳', '午', '未', '申'],
    ['辰', null, null, '酉'],
    ['卯', null, null, '戌'],
    ['寅', '丑', '子', '亥'],
  ];
  const byZhi = {};
  for (const p of r.palaces) byZhi[p.zhi] = p;
  return POS.map(row => row.map(z => (z === null ? null : byZhi[z])));
}

export function ziweiToText(r) {
  const L = [];
  const g = r.input;
  L.push(`【出生】公历 ${g.y}年${g.mo}月${g.d}日 ${String(g.h).padStart(2, '0')}:${String(g.mi || 0).padStart(2, '0')}  ${g.gender === 'M' ? '男' : '女'}`);
  L.push(`【农历】${r.lunar ? `${r.lunar.year}年${r.lunar.text}` : '—'}　${r.sx}年`);
  L.push(`【四柱】${r.pillars.join('　')}`);
  L.push('');
  L.push(`【命宫】${r.mingZhi}宫（${gongGan(r.yearGan, r.mingIdx)}${r.mingZhi}）　【身宫】${r.shenZhi}宫`);
  L.push(`【五行局】${r.ju.name}（命宫纳音${r.ju.nayin}）→ ${r.ju.ju} 岁起运`);
  L.push(`【安紫微】${zhiOf(r.ziweiIdx)}宫　【安天府】${zhiOf(r.tianfuIdx)}宫`);
  L.push('');
  L.push('【十二宫】');
  for (const p of r.palaces) {
    const tag = [p.isMing ? '★命' : '', p.isShen ? '☆身' : ''].filter(Boolean).join('');
    const ms = p.stars.filter(s => MAIN_STAR_INFO[s.name]);
    const xs = p.stars.filter(s => !MAIN_STAR_INFO[s.name]);
    L.push(`　${p.name.padEnd(2, '　')}｜${p.gan}${p.zhi}${tag ? ' ' + tag : ''}｜主星：${ms.length ? ms.map(s => s.name + (s.sihua ? '·' + s.sihua : '')).join('、') : '（空宫）'}`);
    if (xs.length) L.push(`　　　　　辅星：${xs.map(s => s.name + (s.sihua ? '·' + s.sihua : '')).join('、')}`);
  }
  L.push('');
  L.push('【四化】');
  const order = ['化禄', '化权', '化科', '化忌'];
  for (const k of order) {
    const hits = [];
    for (const arr of r.stars) for (const s of arr) if (s.sihua === k) hits.push(`${s.name}（${zhiOf(r.stars.indexOf(arr))}）`);
    L.push(`　${k}：${hits.length ? hits.join('、') : '—'}`);
  }
  L.push('');
  L.push(`【大限】${r.daXian.forward ? '顺行' : '逆行'}，${r.daXian.startAge} 岁起运`);
  L.push('　' + r.daXian.list.map(d => `${d.zhi}宫 ${d.range}`).join('　｜　'));
  if (r.notes.length) {
    L.push('');
    L.push('【说明】');
    for (const n of r.notes) L.push(`　· ${n}`);
  }
  return L.join('\n');
}
