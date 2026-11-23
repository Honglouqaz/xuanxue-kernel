/**
 * 五行分析层 —— 旺衰、神煞、大运、流年
 * 依赖 core/constants.js 与 core/calendar.js
 */
import {
  GAN, ZHI, GAN_WX, ZHI_WX, GAN_YINYANG, CANG_GAN, WUXING,
  SHENG, KE, WUXING as WX, changSheng, xunKong, nayin,
  LIU_CHONG, LIU_HE, LIU_HAI, SAN_HE, SAN_HUI, GAN_HE, GAN_CHONG, XING,
} from './constants.js';
import { fourPillars, jieqiMinute, dayOfYear, jiaziIndex, yearGanZhi } from './calendar.js';

// ───────────────────────── 五行力量 ─────────────────────────
/** 月令旺衰：旺 / 相 / 休 / 囚 / 死 */
export function wangShuai(monthZhiWx, wx) {
  if (monthZhiWx === wx) return '旺';
  if (SHENG[monthZhiWx] === wx) return '相';
  if (SHENG[wx] === monthZhiWx) return '休';
  if (KE[wx] === monthZhiWx) return '囚';
  if (KE[monthZhiWx] === wx) return '死';
  return '';
}

/** 统计八字五行力量（含藏干加权：本气 1.0 / 中气 0.5 / 余气 0.3） */
export function wuxingPower(pillars) {
  const score = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  const raw = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  pillars.forEach((p, i) => {
    const g = p[0], z = p[1];
    const gw = GAN_WX[GAN.indexOf(g)];
    if (gw) { score[gw] += 1.0; raw[gw] += 1; }
    const cg = CANG_GAN[ZHI.indexOf(z)] || [];
    const weights = [1.0, 0.5, 0.3];
    cg.forEach((c, k) => {
      const w = GAN_WX[GAN.indexOf(c)];
      if (w) { score[w] += weights[k] || 0.3; raw[w] += 1; }
    });
  });
  const total = Object.values(score).reduce((a, b) => a + b, 0) || 1;
  const pct = {};
  WUXING.forEach(w => { pct[w] = +(score[w] / total * 100).toFixed(1); });
  return { score, pct, raw };
}

/** 日主强弱判断（简易量化：同类 + 生我 = 帮扶） */
export function dayMasterStrength(pillars) {
  const dayGan = pillars[2][0];
  const dw = GAN_WX[GAN.indexOf(dayGan)];
  const monthWx = ZHI_WX[ZHI.indexOf(pillars[1][1])];
  const { score } = wuxingPower(pillars);

  let help = score[dw];                      // 比劫
  WUXING.forEach(w => { if (SHENG[w] === dw) help += score[w]; }); // 印
  let drain = 0;
  WUXING.forEach(w => { if (w !== dw && SHENG[dw] === w) drain += score[w]; }); // 食伤
  WUXING.forEach(w => { if (KE[dw] === w) drain += score[w]; });                // 财
  WUXING.forEach(w => { if (KE[w] === dw) drain += score[w]; });                // 官杀

  const total = help + drain || 1;
  const ratio = help / total;

  let level;
  if (ratio >= 0.62) level = '偏强';
  else if (ratio >= 0.58) level = '中和偏强';
  else if (ratio >= 0.45) level = '中和';
  else if (ratio >= 0.38) level = '中和偏弱';
  else level = '偏弱';

  return {
    dayGan, dayWx: dw, monthWx, level, ratio: +ratio.toFixed(3),
    help: +help.toFixed(2), drain: +drain.toFixed(2),
    wangShuai: wangShuai(monthWx, dw),
  };
}

/** 用神建议（简易：偏弱取印比，偏强取财官食伤） */
export function yongShen(str) {
  const dw = str.dayWx;
  const favor = [], avoid = [];
  if (str.ratio < 0.45) {
    favor.push(dw, ...WUXING.filter(w => SHENG[w] === dw));
    avoid.push(...WUXING.filter(w => SHENG[dw] === w && w !== dw),
      ...WUXING.filter(w => KE[w] === dw));
  } else if (str.ratio > 0.58) {
    favor.push(...WUXING.filter(w => SHENG[dw] === w && w !== dw),
      ...WUXING.filter(w => KE[dw] === w));
    avoid.push(dw, ...WUXING.filter(w => SHENG[w] === dw));
  } else {
    favor.push(...WUXING.filter(w => SHENG[w] === dw), ...WUXING.filter(w => SHENG[dw] === w));
  }
  return { favor: [...new Set(favor)], avoid: [...new Set(avoid)] };
}

// ───────────────────────── 神煞库 ─────────────────────────
/** 天乙贵人（以日干或年干查地支） */
const TIANYI = {
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
  乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'],
  壬: ['卯', '巳'], 癸: ['卯', '巳'],
  辛: ['午', '寅'],
};
/** 文昌贵人 */
const WENCHANG = { 甲: '巳', 乙: '午', 丙: '申', 丁: '酉', 戊: '申', 己: '酉', 庚: '亥', 辛: '子', 壬: '寅', 癸: '卯' };
/** 禄神（临官位） */
const LUSHEN = { 甲: '寅', 乙: '卯', 丙: '巳', 丁: '午', 戊: '巳', 己: '午', 庚: '申', 辛: '酉', 壬: '亥', 癸: '子' };
/** 羊刃（帝旺位） */
const YANGREN = { 甲: '卯', 乙: '巳', 丙: '午', 丁: '未', 戊: '午', 己: '未', 庚: '酉', 辛: '戌', 壬: '子', 癸: '丑' };
/** 咸池（桃花）：年支或日支三合局 → 对应桃花 */
const TAOHUA = { 申: '酉', 子: '酉', 辰: '酉', 寅: '卯', 午: '卯', 戌: '卯', 巳: '午', 酉: '午', 丑: '午', 亥: '子', 卯: '子', 未: '子' };
/** 驿马 */
const YIMA = { 申: '寅', 子: '寅', 辰: '寅', 寅: '申', 午: '申', 戌: '申', 巳: '亥', 酉: '亥', 丑: '亥', 亥: '巳', 卯: '巳', 未: '巳' };
/** 华盖 */
const HUAGAI = { 申: '辰', 子: '辰', 辰: '辰', 寅: '戌', 午: '戌', 戌: '戌', 巳: '丑', 酉: '丑', 丑: '丑', 亥: '未', 卯: '未', 未: '未' };
/** 将星 */
const JIANGXING = { 申: '子', 子: '子', 辰: '子', 寅: '午', 午: '午', 戌: '午', 巳: '酉', 酉: '酉', 丑: '酉', 亥: '卯', 卯: '卯', 未: '卯' };
/** 劫煞 */
const JIESHA = { 申: '巳', 子: '巳', 辰: '巳', 寅: '亥', 午: '亥', 戌: '亥', 巳: '寅', 酉: '寅', 丑: '寅', 亥: '申', 卯: '申', 未: '申' };
/** 亡神 */
const WANGSHEN = { 申: '亥', 子: '亥', 辰: '亥', 寅: '巳', 午: '巳', 戌: '巳', 巳: '申', 酉: '申', 丑: '申', 亥: '寅', 卯: '寅', 未: '寅' };

/** 天德 / 月德（按月支） */
const TIANDE = { 寅: '丁', 卯: '申', 辰: '壬', 巳: '辛', 午: '亥', 未: '甲', 申: '癸', 酉: '寅', 戌: '丙', 亥: '乙', 子: '巳', 丑: '庚' };
const YUEDE = { 寅: '丙', 午: '丙', 戌: '丙', 申: '壬', 子: '壬', 辰: '壬', 亥: '甲', 卯: '甲', 未: '甲', 巳: '庚', 酉: '庚', 丑: '庚' };
/** 孤辰寡宿（按年支） */
const GUCHEN = { 亥: '寅', 子: '寅', 丑: '寅', 寅: '巳', 卯: '巳', 辰: '巳', 巳: '申', 午: '申', 未: '申', 申: '亥', 酉: '亥', 戌: '亥' };
const GUASU = { 亥: '戌', 子: '戌', 丑: '戌', 寅: '丑', 卯: '丑', 辰: '丑', 巳: '辰', 午: '辰', 未: '辰', 申: '未', 酉: '未', 戌: '未' };

/**
 * 计算神煞
 * @param {string[]} pillars 四柱
 * @returns {Array<{name, pos, desc, level}>}
 */
export function shenSha(pillars) {
  const [y, m, d, h] = pillars;
  const yearGan = y[0], yearZhi = y[1];
  const dayGan = d[0], dayZhi = d[1];
  const monthZhi = m[1];
  const zhis = [y[1], m[1], d[1], h[1]];
  const posName = ['年', '月', '日', '时'];
  const out = [];
  const push = (name, zhi, desc, level = 'neutral') => {
    const idx = zhis.indexOf(zhi);
    if (idx >= 0) out.push({ name, pos: posName[idx], zhi, desc, level });
  };

  // 天乙贵人
  (TIANYI[dayGan] || TIANYI[yearGan] || []).forEach(z => push('天乙贵人', z, '逢凶化吉，贵人扶持', 'good'));
  push('文昌贵人', WENCHANG[dayGan], '主聪明、文书、考试', 'good');
  push('禄神', LUSHEN[dayGan], '主财禄、自立、身体', 'good');
  push('羊刃', YANGREN[dayGan], '性刚果决，易冲动伤灾', 'bad');
  push('咸池桃花', TAOHUA[dayZhi] || TAOHUA[yearZhi], '主异性缘、情欲、技艺', 'neutral');
  push('驿马', YIMA[dayZhi] || YIMA[yearZhi], '主走动、迁移、外出行商', 'neutral');
  push('华盖', HUAGAI[dayZhi] || HUAGAI[yearZhi], '主孤高、艺术、宗教缘', 'neutral');
  push('将星', JIANGXING[dayZhi] || JIANGXING[yearZhi], '主统御、领导、掌权', 'good');
  push('劫煞', JIESHA[dayZhi] || JIESHA[yearZhi], '主破财、意外、被劫', 'bad');
  push('亡神', WANGSHEN[dayZhi] || WANGSHEN[yearZhi], '主内耗、官非、心绪不宁', 'bad');
  push('孤辰', GUCHEN[yearZhi], '主孤独、少亲缘', 'bad');
  push('寡宿', GUASU[yearZhi], '主孤独、婚姻迟', 'bad');
  // 天德月德
  const td = TIANDE[monthZhi], yd = YUEDE[monthZhi];
  [yearGan, dayGan].forEach(g => {
    if (g === td) out.push({ name: '天德贵人', pos: '干', zhi: g, desc: '慈祥化煞，一生少灾', level: 'good' });
    if (g === yd) out.push({ name: '月德贵人', pos: '干', zhi: g, desc: '福德深厚，逢险有救', level: 'good' });
  });
  // 三奇（天上三奇 甲戊庚 / 地下三奇 乙丙丁）
  const gans = [yearGan, m[0], dayGan].join('');
  if (gans === '甲戊庚' || gans === '乙丙丁') {
    out.push({ name: '三奇贵人', pos: '年月日', zhi: gans, desc: '气宇不凡，博学多能', level: 'good' });
  }
  // 魁罡（日柱）
  const kg = ['庚辰', '庚戌', '壬辰', '戊戌'];
  if (kg.includes(d)) out.push({ name: '魁罡', pos: '日', zhi: d, desc: '聪明果断，性刚不屈', level: 'neutral' });
  // 阴阳差错
  const yyc = ['丙子', '丁丑', '戊寅', '辛卯', '壬辰', '癸巳', '丙午', '丁未', '戊申', '辛酉', '壬戌', '癸亥'];
  if (yyc.includes(d)) out.push({ name: '阴差阳错', pos: '日', zhi: d, desc: '婚事多波折、亲戚缘薄', level: 'bad' });

  // 十灵日 / 空亡
  const kong = xunKong(dayGan, dayZhi);
  zhis.forEach((z, i) => {
    if (kong.includes(z)) {
      out.push({ name: '旬空', pos: posName[i], zhi: z, desc: '虚而不实，力量打折', level: 'bad' });
    }
  });

  return out;
}

// ───────────────────────── 地支关系 ─────────────────────────
/** 检测四柱地支之间的刑冲合害 */
export function zhiRelations(pillars) {
  const zhis = pillars.map(p => p[1]);
  const names = ['年', '月', '日', '时'];
  const rels = [];
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const a = zhis[i], b = zhis[j];
      const tag = `${names[i]}${a} · ${names[j]}${b}`;
      if (LIU_CHONG[a] === b) rels.push({ type: '六冲', pair: tag, desc: '动荡、分离、变动' });
      if (LIU_HE[a] === b) rels.push({ type: '六合', pair: tag, desc: '亲近、黏合、羁绊' });
      if (LIU_HAI[a] === b) rels.push({ type: '六害', pair: tag, desc: '暗损、猜忌、妨害' });
    }
  }
  // 三合局
  SAN_HE.forEach(s => {
    const hit = s.zhi.filter(z => zhis.includes(z));
    if (hit.length >= 2) {
      rels.push({
        type: hit.length === 3 ? '三合局' : '半合',
        pair: hit.join(''), desc: `${s.wx}局，${hit.length === 3 ? '力量完整' : '力量减半'}`,
      });
    }
  });
  // 三会方
  SAN_HUI.forEach(s => {
    const hit = s.zhi.filter(z => zhis.includes(z));
    if (hit.length === 3) rels.push({ type: '三会方', pair: hit.join(''), desc: `${s.fang}${s.wx}局，力量最强` });
  });
  // 相刑
  Object.entries(XING).forEach(([k, arr]) => {
    const hit = arr.filter(z => zhis.includes(z));
    if (hit.length >= 2) {
      const need = k === '自刑' ? 1 : 2;
      if (hit.length >= need) rels.push({ type: '相刑', pair: `${k}(${hit.join('')})`, desc: '刑伤、纠纷、内耗' });
    }
  });
  return rels;
}

/** 天干五合 */
export function ganRelations(pillars) {
  const gans = pillars.map(p => p[0]);
  const names = ['年', '月', '日', '时'];
  const rels = [];
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      if (GAN_HE[gans[i]] === gans[j]) rels.push({ type: '五合', pair: `${names[i]}${gans[i]} · ${names[j]}${gans[j]}` });
      if (GAN_CHONG[gans[i]] === gans[j]) rels.push({ type: '相冲', pair: `${names[i]}${gans[i]} · ${names[j]}${gans[j]}` });
    }
  }
  return rels;
}

// ───────────────────────── 大运 ─────────────────────────
/**
 * 排大运
 * 阳男阴女顺行，阴男阳女逆行；3 天折 1 岁
 */
export function daYun(pillars, y, m, d, h, mi, gender /* 'M' | 'F' */) {
  const yearGan = pillars[0][0];
  const yangYear = GAN_YINYANG[GAN.indexOf(yearGan)] === 1;
  const forward = (gender === 'M') === yangYear;

  const tmin = (dayOfYear(y, m, d) - 1) * 1440 + h * 60 + mi;
  const JIE = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];
  const jieTimes = JIE.map(n => ({ n, t: jieqiMinute(y, n) })).filter(x => x.t !== null);

  let deltaMin = 0;
  if (forward) {
    const next = jieTimes.find(x => x.t > tmin);
    deltaMin = next ? next.t - tmin : (jieqiMinute(y + 1, '立春') + 366 * 1440 - tmin);
  } else {
    const prevs = jieTimes.filter(x => x.t <= tmin);
    const prev = prevs.length ? prevs[prevs.length - 1] : null;
    deltaMin = prev ? tmin - prev.t : (tmin + 1440);
  }

  const days = deltaMin / 1440;
  const startAge = +(days / 3).toFixed(2);
  const startYear = +(y + startAge).toFixed(2);

  // 月柱干支 → 60 甲子序
  const startIdx = jiaziIndex(pillars[1][0], pillars[1][1]);
  const step = forward ? 1 : -1;
  const list = [];
  for (let i = 1; i <= 10; i++) {
    const idx = ((startIdx + step * i) % 60 + 60) % 60;
    const age = +(startAge + (i - 1) * 10).toFixed(1);
    list.push({
      index: i,
      gz: GAN[idx % 10] + ZHI[idx % 12],
      startAge: age,
      startYear: +(y + age).toFixed(1),
      endAge: +(age + 10).toFixed(1),
    });
  }
  return { forward, startAge, startYear, list, direction: forward ? '顺行' : '逆行' };
}

/** 流年干支列表 */
export function liuNian(fromYear, count = 10) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const y = fromYear + i;
    out.push({ year: y, gz: yearGanZhi(y), shengxiao: ZHI[((y - 1984) % 60 + 60) % 60 % 12] });
  }
  return out;
}

/** 流年与日主的十神关系 */
export function liuNianShiShen(dayGan, fromYear, count = 10) {
  return liuNian(fromYear, count).map(x => {
    const idx = GAN.indexOf(x.gz[0]);
    const dw = GAN_WX[GAN.indexOf(dayGan)], ow = GAN_WX[idx];
    const same = GAN_YINYANG[GAN.indexOf(dayGan)] === GAN_YINYANG[idx];
    let name = '';
    if (dw === ow) name = same ? '比肩' : '劫财';
    else if (SHENG[dw] === ow) name = same ? '食神' : '伤官';
    else if (KE[dw] === ow) name = same ? '偏财' : '正财';
    else if (SHENG[ow] === dw) name = same ? '偏印' : '正印';
    else name = same ? '七杀' : '正官';
    return { ...x, shiShen: name };
  });
}

/** 十二长生表（日干在各支） */
export function changShengTable(dayGan) {
  return ZHI.map(z => ({ zhi: z, state: changSheng(dayGan, z) }));
}
