/**
 * 玄学体系基础常量表
 * 所有术数共用的「符号内核」：天干、地支、五行、藏干、纳音、神煞底座
 * 零依赖纯 JS
 */

// ─────────────────────────── 天干地支 ───────────────────────────
export const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 天干五行 */
export const GAN_WX = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水'];
/** 天干阴阳：1 阳 / 0 阴 */
export const GAN_YINYANG = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0];

/** 地支五行 */
export const ZHI_WX = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水'];
/** 地支阴阳 */
export const ZHI_YINYANG = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];

/** 生肖 */
export const SHENGXIAO = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

/** 地支藏干（本气 / 中气 / 余气） */
export const CANG_GAN = [
  ['癸'],           // 子
  ['己', '癸', '辛'], // 丑
  ['甲', '丙', '戊'], // 寅
  ['乙'],           // 卯
  ['戊', '乙', '癸'], // 辰
  ['丙', '庚', '戊'], // 巳
  ['丁', '己'],      // 午
  ['己', '丁', '乙'], // 未
  ['庚', '壬', '戊'], // 申
  ['辛'],           // 酉
  ['戊', '辛', '丁'], // 戌
  ['壬', '甲'],      // 亥
];

/** 地支对应时辰（起止小时，跨日的用 {start,end}） */
export const ZHI_HOURS = [
  { start: 23, end: 1 },  // 子
  { start: 1, end: 3 },   // 丑
  { start: 3, end: 5 },   // 寅
  { start: 5, end: 7 },   // 卯
  { start: 7, end: 9 },   // 辰
  { start: 9, end: 11 },  // 巳
  { start: 11, end: 13 }, // 午
  { start: 13, end: 15 }, // 未
  { start: 15, end: 17 }, // 申
  { start: 17, end: 19 }, // 酉
  { start: 19, end: 21 }, // 戌
  { start: 21, end: 23 }, // 亥
];

/** 月支（节气月）：寅月起于立春 */
export const MONTH_ZHI = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];

/** 十二节气名（划分月柱的「节」，非「气」） */
export const JIE_NAMES = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑',
  '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];

/** 二十四节气（公历年内顺序，与 calendar_data.js 的编码顺序一致） */
export const JIEQI_24 = ['小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
  '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑',
  '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'];

/** 节气 → 该节气起始的月支（「节」才有此属性） */
export const JIE_TO_ZHI = {
  立春: '寅', 惊蛰: '卯', 清明: '辰', 立夏: '巳', 芒种: '午', 小暑: '未',
  立秋: '申', 白露: '酉', 寒露: '戌', 立冬: '亥', 大雪: '子', 小寒: '丑',
};

// ─────────────────────────── 六十甲子 ───────────────────────────
export const JIAZI = Array.from({ length: 60 }, (_, i) => GAN[i % 10] + ZHI[i % 12]);

/** 六十甲子纳音（每 2 个一组，共 30 组） */
export const NAYIN_30 = [
  '海中金', '炉中火', '大林木', '路旁土', '剑锋金',
  '山头火', '涧下水', '城头土', '白蜡金', '杨柳木',
  '泉中水', '屋上土', '霹雳火', '松柏木', '长流水',
  '沙中金', '山下火', '平地木', '壁上土', '金箔金',
  '覆灯火', '天河水', '大驿土', '钗钏金', '桑柘木',
  '大溪水', '沙中土', '天上火', '石榴木', '大海水',
];
/** 干支 → 纳音 */
export function nayin(gan, zhi) {
  const gi = GAN.indexOf(gan), zi = ZHI.indexOf(zhi);
  if (gi < 0 || zi < 0) return '';
  // 求 60 甲子序：满足 mod10=gi 且 mod12=zi
  for (let i = 0; i < 60; i++) {
    if (i % 10 === gi && i % 12 === zi) return NAYIN_30[i >> 1];
  }
  return '';
}

// ─────────────────────────── 五行生克 ───────────────────────────
export const WUXING = ['木', '火', '土', '金', '水'];

/** 相生：木→火→土→金→水→木 */
export const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
/** 相克：木克土、土克水、水克火、火克金、金克木 */
export const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

/** 五行颜色（水墨风） */
export const WX_COLOR = { 木: '#5b8c5a', 火: '#b8453a', 土: '#a8853f', 金: '#8d8d92', 水: '#4a6d8c' };

/** a 与 b 的关系：生 / 克 / 被生 / 被克 / 同 */
export function wxRelation(a, b) {
  if (a === b) return '同';
  if (SHENG[a] === b) return '生';
  if (KE[a] === b) return '克';
  if (SHENG[b] === a) return '被生';
  if (KE[b] === a) return '被克';
  return '无';
}

// ─────────────────────────── 十神 ───────────────────────────
export const SHISHEN = ['比肩', '劫财', '食神', '伤官', '偏财', '正财', '七杀', '正官', '偏印', '正印'];

/**
 * 十神：以日干为「我」，求某天干相对日主的十神
 * @param {string} dayGan 日干
 * @param {string} other  待判天干
 */
export function shiShen(dayGan, other) {
  const di = GAN.indexOf(dayGan), oi = GAN.indexOf(other);
  if (di < 0 || oi < 0) return '';
  const dw = GAN_WX[di], ow = GAN_WX[oi];
  const sameYinYang = GAN_YINYANG[di] === GAN_YINYANG[oi];
  const rel = wxRelation(dw, ow);
  if (rel === '同') return sameYinYang ? '比肩' : '劫财';
  if (rel === '生') return sameYinYang ? '食神' : '伤官';   // 我生者
  if (rel === '克') return sameYinYang ? '偏财' : '正财';   // 我克者
  if (rel === '被生') return sameYinYang ? '偏印' : '正印'; // 生我者
  if (rel === '被克') return sameYinYang ? '七杀' : '正官'; // 克我者
  return '';
}

/** 十神简写（两字 → 一字） */
export const SHISHEN_SHORT = {
  比肩: '比', 劫财: '劫', 食神: '食', 伤官: '伤', 偏财: '才',
  正财: '财', 七杀: '杀', 正官: '官', 偏印: '枭', 正印: '印',
};

// ─────────────────────────── 十二长生 ───────────────────────────
export const CHANGSHENG_12 = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];

/** 各天干长生起点所在的地支 */
export const CHANGSHENG_START = {
  甲: '亥', 丙: '寅', 戊: '寅', 庚: '巳', 壬: '申',
  乙: '午', 丁: '酉', 己: '酉', 辛: '子', 癸: '卯',
};

/** 求某天干在某地支的十二长生状态 */
export function changSheng(gan, zhi) {
  const start = CHANGSHENG_START[gan];
  if (!start) return '';
  const si = ZHI.indexOf(start), zi = ZHI.indexOf(zhi);
  if (si < 0 || zi < 0) return '';
  const yang = GAN_YINYANG[GAN.indexOf(gan)] === 1;
  const step = yang ? (zi - si + 12) % 12 : (si - zi + 12) % 12;
  return CHANGSHENG_12[step];
}

// ─────────────────────────── 刑冲合害 ───────────────────────────
/** 地支六冲 */
export const LIU_CHONG = { 子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅', 卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳' };
/** 地支六合 */
export const LIU_HE = { 子: '丑', 丑: '子', 寅: '亥', 亥: '寅', 卯: '戌', 戌: '卯', 辰: '酉', 酉: '辰', 巳: '申', 申: '巳', 午: '未', 未: '午' };
/** 地支三合局 */
export const SAN_HE = [
  { zhi: ['申', '子', '辰'], wx: '水' },
  { zhi: ['亥', '卯', '未'], wx: '木' },
  { zhi: ['寅', '午', '戌'], wx: '火' },
  { zhi: ['巳', '酉', '丑'], wx: '金' },
];
/** 地支三会方 */
export const SAN_HUI = [
  { zhi: ['寅', '卯', '辰'], wx: '木', fang: '东方' },
  { zhi: ['巳', '午', '未'], wx: '火', fang: '南方' },
  { zhi: ['申', '酉', '戌'], wx: '金', fang: '西方' },
  { zhi: ['亥', '子', '丑'], wx: '水', fang: '北方' },
];
/** 地支相刑 */
export const XING = {
  无恩之刑: ['寅', '巳', '申'],
  恃势之刑: ['丑', '戌', '未'],
  无礼之刑: ['子', '卯'],
  自刑: ['辰', '午', '酉', '亥'],
};
/** 地支相害（六害） */
export const LIU_HAI = { 子: '未', 未: '子', 丑: '午', 午: '丑', 寅: '巳', 巳: '寅', 卯: '辰', 辰: '卯', 申: '亥', 亥: '申', 酉: '戌', 戌: '酉' };

/** 天干五合 */
export const GAN_HE = { 甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊' };
/** 天干相冲 */
export const GAN_CHONG = { 甲: '庚', 庚: '甲', 乙: '辛', 辛: '乙', 丙: '壬', 壬: '丙', 丁: '癸', 癸: '丁' };

/** 空亡（旬空）：按日柱所在旬 */
export function xunKong(gan, zhi) {
  const gi = GAN.indexOf(gan), zi = ZHI.indexOf(zhi);
  if (gi < 0 || zi < 0) return [];
  // 该旬首所在位置
  const xunStart = (zi - gi + 12) % 12;
  return [
    ZHI[(xunStart + 10) % 12],
    ZHI[(xunStart + 11) % 12],
  ];
}

// ─────────────────────────── 八卦 ───────────────────────────
export const BAGUA = [
  { name: '乾', symbol: '☰', bits: [1, 1, 1], wx: '金', dir: '西北', num: 6, nature: '天', family: '父' },
  { name: '兑', symbol: '☱', bits: [1, 1, 0], wx: '金', dir: '西', num: 7, nature: '泽', family: '少女' },
  { name: '离', symbol: '☲', bits: [1, 0, 1], wx: '火', dir: '南', num: 9, nature: '火', family: '中女' },
  { name: '震', symbol: '☳', bits: [1, 0, 0], wx: '木', dir: '东', num: 3, nature: '雷', family: '长男' },
  { name: '巽', symbol: '☴', bits: [0, 1, 1], wx: '木', dir: '东南', num: 4, nature: '风', family: '长女' },
  { name: '坎', symbol: '☵', bits: [0, 1, 0], wx: '水', dir: '北', num: 1, nature: '水', family: '中男' },
  { name: '艮', symbol: '☶', bits: [0, 0, 1], wx: '土', dir: '东北', num: 8, nature: '山', family: '少男' },
  { name: '坤', symbol: '☷', bits: [0, 0, 0], wx: '土', dir: '西南', num: 2, nature: '地', family: '母' },
];
/** 先天八卦序（乾一兑二离三震四巽五坎六艮七坤八） */
export const XIANTIAN_ORDER = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];

export function guaByName(n) { return BAGUA.find(g => g.name === n); }
export function guaByBits(bits) { return BAGUA.find(g => g.bits.join('') === bits.join('')); }

// ─────────────────────────── 九宫 ───────────────────────────
/** 洛书九宫 → 八卦（后天） */
export const LUOSHU = [
  { gong: 1, gua: '坎', dir: '北', wx: '水' },
  { gong: 2, gua: '坤', dir: '西南', wx: '土' },
  { gong: 3, gua: '震', dir: '东', wx: '木' },
  { gong: 4, gua: '巽', dir: '东南', wx: '木' },
  { gong: 6, gua: '乾', dir: '西北', wx: '金' },
  { gong: 7, gua: '兑', dir: '西', wx: '金' },
  { gong: 8, gua: '艮', dir: '东北', wx: '土' },
  { gong: 9, gua: '离', dir: '南', wx: '火' },
];
/** 九星名（玄空 / 奇门通用） */
export const NINE_STAR = [
  { n: 1, name: '一白', star: '天蓬', wx: '水', luck: '吉' },
  { n: 2, name: '二黑', star: '天芮', wx: '土', luck: '凶' },
  { n: 3, name: '三碧', star: '天冲', wx: '木', luck: '凶' },
  { n: 4, name: '四绿', star: '天辅', wx: '木', luck: '吉' },
  { n: 5, name: '五黄', star: '天禽', wx: '土', luck: '大凶' },
  { n: 6, name: '六白', star: '天心', wx: '金', luck: '吉' },
  { n: 7, name: '七赤', star: '天柱', wx: '金', luck: '凶' },
  { n: 8, name: '八白', star: '天任', wx: '土', luck: '吉' },
  { n: 9, name: '九紫', star: '天英', wx: '火', luck: '吉' },
];
/** 八门 */
export const EIGHT_DOOR = [
  { name: '休门', wx: '水', luck: '吉' }, { name: '生门', wx: '土', luck: '大吉' },
  { name: '伤门', wx: '木', luck: '凶' }, { name: '杜门', wx: '木', luck: '中' },
  { name: '景门', wx: '火', luck: '中' }, { name: '死门', wx: '土', luck: '大凶' },
  { name: '惊门', wx: '金', luck: '凶' }, { name: '开门', wx: '金', luck: '大吉' },
];
/** 八神（转盘奇门） */
export const EIGHT_GOD = ['值符', '腾蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];
/** 三奇六仪 */
export const SAN_QI = ['乙', '丙', '丁'];
export const LIU_YI = ['戊', '己', '庚', '辛', '壬', '癸'];
/** 六神（六爻） */
export const LIU_SHEN = ['青龙', '朱雀', '勾陈', '腾蛇', '白虎', '玄武'];
/** 十二天将（大六壬） */
export const TIAN_JIANG = ['贵人', '腾蛇', '朱雀', '六合', '勾陈', '青龙',
  '天空', '白虎', '太常', '玄武', '太阴', '天后'];

// ─────────────────────────── 天干地支五行统计工具 ───────────────────────────
export function countWuXing(gans, zhis) {
  const c = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  gans.forEach(g => { const w = GAN_WX[GAN.indexOf(g)]; if (w) c[w]++; });
  zhis.forEach(z => { const w = ZHI_WX[ZHI.indexOf(z)]; if (w) c[w]++; });
  return c;
}

/** 地支 → 索引 */
export const zi = (z) => ZHI.indexOf(z);
/** 天干 → 索引 */
export const gi = (g) => GAN.indexOf(g);
