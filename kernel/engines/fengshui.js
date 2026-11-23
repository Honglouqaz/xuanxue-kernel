/**
 * 风水引擎 —— 玄空飞星 · 八宅游年 · 二十四山 · 罗盘
 * ─────────────────────────────────────────────────────────
 * 一、二十四山 & 三元龙（飞星顺逆之依据）
 * 二、三元九运 → 运盘（当运星入中，顺飞洛书）
 * 三、玄空飞星（下卦）：山星、向星入中，依三元龙阴阳顺逆飞布
 * 四、八宅：命卦、宅卦、游年八星（用翻卦法推导，非硬编码歌诀）
 *
 * 八宅翻卦法说明：
 *   自本卦起，依次变「上爻→中爻→下爻→中爻→上爻→中爻→下爻」，
 *   所得七卦依次为 生气·五鬼·延年·六煞·祸害·天医·绝命。
 *   已用大游年歌「乾六天五祸绝延生」交叉验证一致。
 */
import { BAGUA, guaByName } from '../core/constants.js';

// ───────────────────────── 二十四山 ─────────────────────────

/** 二十四山：从正北偏西 7.5° 起，每山 15° */
export const SHAN_24 = [
  '壬', '子', '癸', '丑', '艮', '寅', '甲', '卯', '乙', '辰', '巽', '巳',
  '丙', '午', '丁', '未', '坤', '申', '庚', '酉', '辛', '戌', '乾', '亥',
];
/** 某山的中心度数（正北 0°，顺时针）。壬山中心 345°，子山中心 0° */
export const shanCenter = (s) => ((345 + SHAN_24.indexOf(s) * 15) % 360);

/** 二十四山 → 八卦宫 */
export const SHAN_TO_GUA = {
  壬: '坎', 子: '坎', 癸: '坎',
  丑: '艮', 艮: '艮', 寅: '艮',
  甲: '震', 卯: '震', 乙: '震',
  辰: '巽', 巽: '巽', 巳: '巽',
  丙: '离', 午: '离', 丁: '离',
  未: '坤', 坤: '坤', 申: '坤',
  庚: '兑', 酉: '兑', 辛: '兑',
  戌: '乾', 乾: '乾', 亥: '乾',
};

/** 三元龙：天元/地元/人元；阳=true */
export const SAN_YUAN_LONG = {
  子: { long: '天元龙', yang: false }, 午: { long: '天元龙', yang: false },
  卯: { long: '天元龙', yang: false }, 酉: { long: '天元龙', yang: false },
  乾: { long: '天元龙', yang: true }, 巽: { long: '天元龙', yang: true },
  艮: { long: '天元龙', yang: true }, 坤: { long: '天元龙', yang: true },
  辰: { long: '地元龙', yang: false }, 戌: { long: '地元龙', yang: false },
  丑: { long: '地元龙', yang: false }, 未: { long: '地元龙', yang: false },
  甲: { long: '地元龙', yang: true }, 庚: { long: '地元龙', yang: true },
  丙: { long: '地元龙', yang: true }, 壬: { long: '地元龙', yang: true },
  寅: { long: '人元龙', yang: true }, 申: { long: '人元龙', yang: true },
  巳: { long: '人元龙', yang: true }, 亥: { long: '人元龙', yang: true },
  乙: { long: '人元龙', yang: false }, 辛: { long: '人元龙', yang: false },
  丁: { long: '人元龙', yang: false }, 癸: { long: '人元龙', yang: false },
};

/** 八卦 → 洛书宫数 */
export const GUA_TO_SHOU = { 坎: 1, 坤: 2, 震: 3, 巽: 4, 中: 5, 乾: 6, 兑: 7, 艮: 8, 离: 9 };
export const SHOU_TO_GUA = { 1: '坎', 2: '坤', 3: '震', 4: '巽', 5: '中', 6: '乾', 7: '兑', 8: '艮', 9: '离' };
/** 飞星九宫序（洛书数序） */
export const FEI_ORDER = [5, 6, 7, 8, 9, 1, 2, 3, 4];

/** 九星名 */
export const NINE_STAR_NAME = {
  1: '一白贪狼', 2: '二黑巨门', 3: '三碧禄存', 4: '四绿文曲', 5: '五黄廉贞',
  6: '六白武曲', 7: '七赤破军', 8: '八白左辅', 9: '九紫右弼',
};
export const NINE_STAR_WX = { 1: '水', 2: '土', 3: '木', 4: '木', 5: '土', 6: '金', 7: '金', 8: '土', 9: '火' };

/** 三元九运 */
export const YUN_TABLE = [
  { yun: 1, yuan: '上元', from: 1864, to: 1883 },
  { yun: 2, yuan: '上元', from: 1884, to: 1903 },
  { yun: 3, yuan: '上元', from: 1904, to: 1923 },
  { yun: 4, yuan: '中元', from: 1924, to: 1943 },
  { yun: 5, yuan: '中元', from: 1944, to: 1963 },
  { yun: 6, yuan: '中元', from: 1964, to: 1983 },
  { yun: 7, yuan: '下元', from: 1984, to: 2003 },
  { yun: 8, yuan: '下元', from: 2004, to: 2023 },
  { yun: 9, yuan: '下元', from: 2024, to: 2043 },
];

export function currentYun(year) {
  const row = YUN_TABLE.find(r => year >= r.from && year <= r.to);
  if (row) return row;
  // 外推
  const idx = Math.floor((year - 1864) / 20);
  const yun = ((idx % 9) + 9) % 9 + 1;
  return { yun, yuan: yun <= 3 ? '上元' : yun <= 6 ? '中元' : '下元', from: 1864 + idx * 20, to: 1883 + idx * 20, extrapolated: true };
}

// ───────────────────────── 飞星 ─────────────────────────

/**
 * 飞星：以 star 入中宫，yang=true 顺飞 / false 逆飞
 * @returns {object} 宫数 → 星数
 */
export function feiXing(star, yang) {
  const out = {};
  FEI_ORDER.forEach((gong, i) => {
    out[gong] = yang ? ((star - 1 + i) % 9) + 1 : ((star - 1 - i) % 9 + 9) % 9 + 1;
  });
  return out;
}

/** 从角度定二十四山（壬山自 337.5° 起） */
export function shanByDegree(deg) {
  const d = ((deg % 360) + 360) % 360;
  const idx = Math.floor((((d - 337.5) % 360) + 360) % 360 / 15);
  return SHAN_24[idx];
}

/**
 * 玄空飞星排盘（下卦法）
 * @param {object} o { year, sitDegree, facingDegree, sitShan, facingShan }
 */
export function paipanXuankong(o) {
  const notes = [];
  const yunInfo = currentYun(o.year);
  const yun = yunInfo.yun;

  const sitShan = o.sitShan || (o.sitDegree !== undefined ? shanByDegree(o.sitDegree) : '子');
  const facingShan = o.facingShan || (o.facingDegree !== undefined ? shanByDegree(o.facingDegree) : '午');
  const sitGua = SHAN_TO_GUA[sitShan];
  const facingGua = SHAN_TO_GUA[facingShan];
  const sitLong = SAN_YUAN_LONG[sitShan];
  const facingLong = SAN_YUAN_LONG[facingShan];

  // 运盘（当运星入中顺飞）
  const yunPan = feiXing(yun, true);

  // 山星：运盘上「坐山卦宫」的星 入中，按坐山三元龙阴阳顺逆
  const sitGong = GUA_TO_SHOU[sitGua];
  const shanStarCenter = yunPan[sitGong];
  const shanPan = feiXing(shanStarCenter, sitLong.yang);

  // 向星：运盘上「朝向卦宫」的星 入中
  const facingGong = GUA_TO_SHOU[facingGua];
  const xiangStarCenter = yunPan[facingGong];
  const xiangPan = feiXing(xiangStarCenter, facingLong.yang);

  // ── 格局判定 ──
  const sitShou = GUA_TO_SHOU[sitGua];
  const facingShou = GUA_TO_SHOU[facingGua];
  const wangShan = shanPan[sitShou] === yun;      // 山星当旺落坐山
  const wangXiang = xiangPan[facingShou] === yun; // 向星当旺落向首
  const shanXiangTong = shanStarCenter === xiangStarCenter;

  let geju = '';
  if (wangShan && wangXiang) geju = '旺山旺向（到山到向）';
  else if (!wangShan && !wangXiang && shanPan[facingShou] === yun && xiangPan[sitShou] === yun) geju = '上山下水（反向颠倒）';
  else if (wangShan) geju = '旺山不旺向（坐满朝空）';
  else if (wangXiang) geju = '旺向不旺山（朝满坐空）';
  else geju = '平局（当运星未到山向）';

  const shuangXing = [];
  for (let g = 1; g <= 9; g++) if (shanPan[g] === xiangPan[g]) shuangXing.push({ gong: g, gua: SHOU_TO_GUA[g], star: shanPan[g] });

  // 山向同宫（双星会坐/会向）
  if (shanXiangTong) notes.push(`山星向星入中之数同为 ${shanStarCenter}，属「双星同宫」格局`);

  // 兼向提示：偏离本山中线角度
  if (o.sitDegree !== undefined) {
    const d = ((o.sitDegree % 360) + 360) % 360;
    const center = shanCenter(sitShan);
    const drift = Math.abs(((d - center + 540) % 360) - 180);
    if (drift > 4.5) notes.push(`坐山偏离山中线约 ${drift.toFixed(1)}°（本山中线 ${center}°），接近兼向；超 3° 者宜用替卦`);
  }
  notes.push('本盘为下卦（正向）飞星；兼向 3° 以上者宜用替卦，各派替卦表不同，需另校');
  notes.push('运盘＝当运星入中顺飞；山星取坐山卦宫之运星入中，按坐山三元龙阴阳定顺逆');

  return {
    year: o.year, yunInfo, yun, sitShan, facingShan, sitGua, facingGua,
    sitLong, facingLong, sitDegree: o.sitDegree, facingDegree: o.facingDegree,
    yunPan, shanPan, xiangPan,
    shanStarCenter, xiangStarCenter,
    wangShan, wangXiang, shanXiangTong, geju, shuangXing, notes,
  };
}

// ───────────────────────── 八宅 ─────────────────────────

const XI_SI = ['乾', '兑', '艮', '坤'];
export const isXiSiMing = (gua) => XI_SI.includes(gua);

/** 命卦：男/女 · 出生年（以立春为界，调用方需自行处理） */
export function mingGua(year, gender) {
  const yy = year % 100;
  const male = gender === 'M' || gender === '男';
  let n;
  if (year < 2000) n = male ? (100 - yy) % 9 : (yy + 5) % 9;
  else n = male ? (99 - yy) % 9 : (yy + 6) % 9;
  if (n === 0) n = 9;
  if (n === 5) n = male ? 2 : 8;    // 五黄寄宫：男寄坤、女寄艮
  return { num: n, gua: SHOU_TO_GUA[n] };
}

/**
 * 游年八星（翻卦法）
 * 变爻序列：上→中→下→中→上→中→下
 * 星序：   生气·五鬼·延年·六煞·祸害·天医·绝命
 */
export const YOU_NIAN_XING = ['生气', '五鬼', '延年', '六煞', '祸害', '天医', '绝命'];
export const XING_TONE = { 伏位: 1, 生气: 1, 延年: 1, 天医: 1, 祸害: -1, 六煞: -1, 五鬼: -1, 绝命: -1 };
export const XING_DESC = {
  伏位: '本宫，主安定平稳，宜作卧室、神位',
  生气: '大吉，主生机财禄，宜大门、起居、书房',
  延年: '上吉，主寿禄和睦，宜卧室、灶位',
  天医: '中吉，主健康祛病，宜卧室、药房、灶位',
  祸害: '小凶，主口舌小病，宜储物、厕所',
  六煞: '凶，主桃花是非、耗财，宜厕所、储物',
  五鬼: '大凶，主火灾官非、重病，宜厕所、杂物',
  绝命: '大凶，主损丁破财、横祸，宜厕所、仓库',
};

/** 八卦三爻（自下而上，1=阳） */
const GUA_YAO = { 乾: [1, 1, 1], 兑: [1, 1, 0], 离: [1, 0, 1], 震: [1, 0, 0], 巽: [0, 1, 1], 坎: [0, 1, 0], 艮: [0, 0, 1], 坤: [0, 0, 0] };
const yaoToGua = (y) => Object.keys(GUA_YAO).find(k => GUA_YAO[k].join('') === y.join(''));

/** 翻卦：本卦 → 七星落宫 */
export function fanGua(benGua) {
  const SEQ = [2, 1, 0, 1, 2, 1, 0];   // 变爻位：2=上 1=中 0=下
  let y = [...GUA_YAO[benGua]];
  const out = { 伏位: benGua };
  SEQ.forEach((pos, i) => {
    y = [...y]; y[pos] = y[pos] ? 0 : 1;
    out[YOU_NIAN_XING[i]] = yaoToGua(y);
  });
  return out;
}

/** 八宅排盘：宅卦 + 命卦 双盘 */
export function paipanBazhai(input) {
  const { year, gender, sitShan, sitDegree } = input;
  const notes = [];
  const shan = sitShan || (sitDegree !== undefined ? shanByDegree(sitDegree) : '子');
  const zhaiGua = SHAN_TO_GUA[shan];
  const mg = mingGua(year, gender);

  const zhaiPan = fanGua(zhaiGua);
  const mingPan = fanGua(mg.gua);

  // 命宅相配：东四命宜东四宅
  const zhaiXi = isXiSiMing(zhaiGua);
  const mingXi = isXiSiMing(mg.gua);
  const match = zhaiXi === mingXi;

  // 八方吉凶（按宅卦翻卦结果）
  const directions = [];
  for (const [xing, gua] of Object.entries(zhaiPan)) {
    const g = guaByName(gua);
    directions.push({
      xing, gua, tone: XING_TONE[xing], desc: XING_DESC[xing],
      dir: g ? g.dir : '中', shou: GUA_TO_SHOU[gua],
    });
  }
  directions.sort((a, b) => b.tone - a.tone || a.shou - b.shou);

  if (!match) notes.push(`命卦 ${mg.gua}（${mingXi ? '西四命' : '东四命'}）与宅卦 ${zhaiGua}（${zhaiXi ? '西四宅' : '东四宅'}）不同元，宜以命卦游年布局化解`);
  notes.push('命卦以出生年为据；跨立春者须按立春换年，本盘直接取输入年份');
  notes.push('游年八星由翻卦法生成，已与大游年歌「乾六天五祸绝延生」交叉验证');

  return {
    year, gender, sitShan: shan, zhaiGua, mingGua: mg,
    zhaiXiSi: zhaiXi, mingXiSi: mingXi, match,
    zhaiPan, mingPan, directions, zhaiDirections: directions, notes,
  };
}

// ───────────────────────── 罗盘 ─────────────────────────

/** 罗盘各层（给定坐向度数） */
export function luopan(sitDegree, year) {
  const sit = shanByDegree(sitDegree);
  const facing = shanByDegree(sitDegree + 180);
  const yunInfo = currentYun(year);
  const gua = SHAN_TO_GUA[sit];
  const long = SAN_YUAN_LONG[sit];
  const xk = paipanXuankong({ year, sitShan: sit, facingShan: facing, sitDegree });
  return {
    sitDegree, facingDegree: (sitDegree + 180) % 360,
    layers: [
      { name: '第一层·坐向', value: `坐 ${sit}（${sitDegree.toFixed(1)}°）　向 ${facing}（${((sitDegree + 180) % 360).toFixed(1)}°）` },
      { name: '第二层·二十四山', value: `坐山 ${sit}　朝向 ${facing}` },
      { name: '第三层·八卦', value: `坐 ${gua}宫　向 ${SHAN_TO_GUA[facing]}宫` },
      { name: '第四层·三元龙', value: `坐山 ${long.long}·${long.yang ? '阳' : '阴'}（飞星${long.yang ? '顺' : '逆'}）` },
      { name: '第五层·三元九运', value: `第 ${yunInfo.yun} 运（${yunInfo.from}-${yunInfo.to}，${yunInfo.yuan}）` },
      { name: '第六层·运盘', value: FEI_ORDER.map(g => `${SHOU_TO_GUA[g]}${xk.yunPan[g]}`).join(' ') },
      { name: '第七层·山盘', value: FEI_ORDER.map(g => `${SHOU_TO_GUA[g]}${xk.shanPan[g]}`).join(' ') },
      { name: '第八层·向盘', value: FEI_ORDER.map(g => `${SHOU_TO_GUA[g]}${xk.xiangPan[g]}`).join(' ') },
      { name: '第九层·格局', value: xk.geju },
    ],
    xk,
  };
}

// ───────────────────────── 文本 ─────────────────────────

export function xuankongToText(r) {
  const L = [];
  L.push(`【年份】${r.year}　【元运】${r.yunInfo.yuan}第 ${r.yun} 运（${r.yunInfo.from}-${r.yunInfo.to}）`);
  L.push(`【坐向】坐 ${r.sitShan}（${r.sitGua}宫 · ${r.sitLong.long}${r.sitLong.yang ? '阳' : '阴'}）　向 ${r.facingShan}（${r.facingGua}宫 · ${r.facingLong.long}${r.facingLong.yang ? '阳' : '阴'}）`);
  L.push(`【入中】山星 ${r.shanStarCenter} 入中（${r.sitLong.yang ? '顺' : '逆'}飞）　向星 ${r.xiangStarCenter} 入中（${r.facingLong.yang ? '顺' : '逆'}飞）`);
  L.push(`【格局】${r.geju}`);
  L.push('');
  const layout = [[4, 9, 2], [3, 5, 7], [8, 1, 6]];
  L.push('【九宫飞星盘】（格式：运星／山星／向星）');
  for (const row of layout) {
    L.push('　' + row.map(g => `${SHOU_TO_GUA[g]}${g} ${r.yunPan[g]}/${r.shanPan[g]}/${r.xiangPan[g]}`.padEnd(15, ' ')).join('│'));
  }
  L.push('');
  L.push('【逐宫】');
  for (const g of FEI_ORDER) {
    L.push(`　${SHOU_TO_GUA[g]}${g}宫　运${r.yunPan[g]}${NINE_STAR_NAME[r.yunPan[g]].slice(2)}　山${r.shanPan[g]}　向${r.xiangPan[g]}`);
  }
  if (r.shuangXing.length) {
    L.push('');
    L.push('【山向同数宫】' + r.shuangXing.map(x => `${x.gua}${x.gong}宫(星${x.star})`).join('、'));
  }
  L.push('');
  L.push('【说明】');
  for (const n of r.notes) L.push(`　· ${n}`);
  return L.join('\n');
}

export function bazhaiToText(r) {
  const L = [];
  L.push(`【年份】${r.year}　【性别】${r.gender === 'M' || r.gender === '男' ? '男' : '女'}`);
  L.push(`【宅卦】${r.sitShan}山 → ${r.zhaiGua}宅（${r.zhaiXiSi ? '西四宅' : '东四宅'}）`);
  L.push(`【命卦】${r.mingGua.gua}命（第 ${r.mingGua.num} 卦，${r.mingXiSi ? '西四命' : '东四命'}）`);
  L.push(`【命宅相配】${r.match ? '相配（同元）' : '不相配（异元，宜以命卦布局）'}`);
  L.push('');
  L.push('【八方吉凶（以宅卦翻卦 · 吉→凶）】');
  for (const d of r.directions) {
    L.push(`　${d.xing.padEnd(2, '　')}　${d.gua}（${d.dir}）　${d.tone > 0 ? '吉' : '凶'}　— ${d.desc}`);
  }
  L.push('');
  L.push('【说明】');
  for (const n of r.notes) L.push(`　· ${n}`);
  return L.join('\n');
}
