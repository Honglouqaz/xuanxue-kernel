/**
 * 八卦 / 六十四卦 / 纳甲体系
 * 六爻、梅花、风水共用的卦象底座
 */
import { BAGUA, GAN, ZHI, GAN_WX, ZHI_WX, WUXING, SHENG, KE } from './constants.js';

/** 八卦（按此索引顺序组织卦名表） */
export const GUA_ORDER = ['乾', '兑', '离', '震', '巽', '坎', '艮', '坤'];
/** 八卦自然象 */
export const GUA_NATURE = { 乾: '天', 兑: '泽', 离: '火', 震: '雷', 巽: '风', 坎: '水', 艮: '山', 坤: '地' };

/** 六十四卦名表：[上卦][下卦] */
export const GUA_NAME_8X8 = [
  ['乾为天', '天泽履', '天火同人', '天雷无妄', '天风姤', '天水讼', '天山遁', '天地否'],
  ['泽天夬', '兑为泽', '泽火革', '泽雷随', '泽风大过', '泽水困', '泽山咸', '泽地萃'],
  ['火天大有', '火泽睽', '离为火', '火雷噬嗑', '火风鼎', '火水未济', '火山旅', '火地晋'],
  ['雷天大壮', '雷泽归妹', '雷火丰', '震为雷', '雷风恒', '雷水解', '雷山小过', '雷地豫'],
  ['风天小畜', '风泽中孚', '风火家人', '风雷益', '巽为风', '风水涣', '风山渐', '风地观'],
  ['水天需', '水泽节', '水火既济', '水雷屯', '水风井', '坎为水', '水山蹇', '水地比'],
  ['山天大畜', '山泽损', '山火贲', '山雷颐', '山风蛊', '山水蒙', '艮为山', '山地剥'],
  ['地天泰', '地泽临', '地火明夷', '地雷复', '地风升', '地水师', '地山谦', '坤为地'],
];

/** 京房纳甲：每卦六爻的干支（初爻→上爻） */
export const NAJIA = {
  乾: ['甲子', '甲寅', '甲辰', '壬午', '壬申', '壬戌'],
  坤: ['乙未', '乙巳', '乙卯', '癸丑', '癸亥', '癸酉'],
  震: ['庚子', '庚寅', '庚辰', '庚午', '庚申', '庚戌'],
  巽: ['辛丑', '辛亥', '辛酉', '辛未', '辛巳', '辛卯'],
  坎: ['戊寅', '戊辰', '戊午', '戊申', '戊戌', '戊子'],
  离: ['己卯', '己丑', '己亥', '己酉', '己未', '己巳'],
  艮: ['丙辰', '丙午', '丙申', '丙戌', '丙子', '丙寅'],
  兑: ['丁巳', '丁卯', '丁丑', '丁亥', '丁酉', '丁未'],
};

/** 八宫卦序：每宫 8 卦（本宫 / 一世 / 二世 / 三世 / 四世 / 五世 / 游魂 / 归魂） */
export const PALACES = [
  { name: '乾宫', wx: '金', guas: ['乾为天', '天风姤', '天山遁', '天地否', '风地观', '山地剥', '火地晋', '火天大有'] },
  { name: '坎宫', wx: '水', guas: ['坎为水', '水泽节', '水雷屯', '水火既济', '泽火革', '雷火丰', '地火明夷', '地水师'] },
  { name: '艮宫', wx: '土', guas: ['艮为山', '山火贲', '山天大畜', '山泽损', '火泽睽', '天泽履', '风泽中孚', '风山渐'] },
  { name: '震宫', wx: '木', guas: ['震为雷', '雷地豫', '雷水解', '雷风恒', '地风升', '水风井', '泽风大过', '泽雷随'] },
  { name: '巽宫', wx: '木', guas: ['巽为风', '风天小畜', '风火家人', '风雷益', '天雷无妄', '火雷噬嗑', '山雷颐', '山风蛊'] },
  { name: '离宫', wx: '火', guas: ['离为火', '火山旅', '火风鼎', '火水未济', '山水蒙', '风水涣', '天水讼', '天火同人'] },
  { name: '坤宫', wx: '土', guas: ['坤为地', '地雷复', '地泽临', '地天泰', '雷天大壮', '泽天夬', '水天需', '水地比'] },
  { name: '兑宫', wx: '金', guas: ['兑为泽', '泽水困', '泽地萃', '泽山咸', '水山蹇', '地山谦', '雷山小过', '雷泽归妹'] },
];

/** 八宫内的世应位置（世爻, 应爻），1-6 从初爻起 */
const SHI_YING_IN_PALACE = [
  [6, 3], [1, 4], [2, 5], [3, 6], [4, 1], [5, 2], [4, 1], [3, 6],
];

// ───────────────────────── 卦象工具 ─────────────────────────
/** 由上卦名 + 下卦名 取卦名 */
export function guaName(upper, lower) {
  const u = GUA_ORDER.indexOf(upper), l = GUA_ORDER.indexOf(lower);
  if (u < 0 || l < 0) return '';
  return GUA_NAME_8X8[u][l];
}

/** 由六爻（初→上，1 阳 0 阴）取上下卦名 */
export function guaFromBits(bits) {
  const lower = BAGUA.find(g => g.bits.join('') === bits.slice(0, 3).join(''));
  const upper = BAGUA.find(g => g.bits.join('') === bits.slice(3, 6).join(''));
  return { upper: upper.name, lower: lower.name, name: guaName(upper.name, lower.name) };
}

/** 由卦名取上下卦 */
export function splitGua(name) {
  for (let u = 0; u < 8; u++) {
    for (let l = 0; l < 8; l++) {
      if (GUA_NAME_8X8[u][l] === name) {
        return { upper: GUA_ORDER[u], lower: GUA_ORDER[l] };
      }
    }
  }
  return null;
}

/** 卦象六爻（初→上） */
export function guaBits(name) {
  const s = splitGua(name);
  if (!s) return null;
  const lo = BAGUA.find(g => g.name === s.lower).bits;
  const up = BAGUA.find(g => g.name === s.upper).bits;
  return [...lo, ...up];
}

/** 查卦所属宫、五行、世应 */
export function guaPalace(name) {
  for (let p = 0; p < 8; p++) {
    const idx = PALACES[p].guas.indexOf(name);
    if (idx >= 0) {
      const [shi, ying] = SHI_YING_IN_PALACE[idx];
      const TITLES = ['本宫卦', '一世卦', '二世卦', '三世卦', '四世卦', '五世卦', '游魂卦', '归魂卦'];
      return {
        palace: PALACES[p].name, palaceWx: PALACES[p].wx,
        shi, ying, type: TITLES[idx], palaceIndex: idx,
      };
    }
  }
  return null;
}

/** 六亲：以卦宫五行为「我」 */
export function liuQin(palaceWx, yaoWx) {
  if (palaceWx === yaoWx) return '兄弟';
  if (SHENG[yaoWx] === palaceWx) return '父母';  // 生我者
  if (SHENG[palaceWx] === yaoWx) return '子孙';  // 我生者
  if (KE[yaoWx] === palaceWx) return '官鬼';     // 克我者
  if (KE[palaceWx] === yaoWx) return '妻财';     // 我克者
  return '';
}

/** 六亲对应义象 */
export const LIUQIN_MEANING = {
  父母: '长辈、文书、房屋、车船、消息、学业、契约',
  兄弟: '同辈、竞争者、合伙人、破财、阻隔',
  子孙: '晚辈、福神、医药、僧道、宠物、解厄、财源',
  妻财: '财物、妻子、佣人、薪水、交易',
  官鬼: '官职、丈夫、疾病、盗贼、忧患、官司、鬼神',
};

/** 六亲在占事中的用神取用 */
export const YONGSHEN_RULE = [
  { matter: '求财 / 生意 / 薪资', yong: '妻财', ji: '兄弟' },
  { matter: '事业 / 官职 / 考试 / 官司', yong: '官鬼', ji: '子孙' },
  { matter: '婚姻（男占女）', yong: '妻财', ji: '兄弟' },
  { matter: '婚姻（女占男）', yong: '官鬼', ji: '子孙' },
  { matter: '子女 / 健康 / 解厄 / 宠物', yong: '子孙', ji: '父母' },
  { matter: '父母 / 长辈 / 学业 / 房产 / 文书', yong: '父母', ji: '妻财' },
  { matter: '出行 / 搬家 / 平安', yong: '世爻', ji: '官鬼' },
  { matter: '失物 / 寻人', yong: '妻财或父母', ji: '—' },
];

/** 完整装卦：纳甲 + 六亲 + 世应 + 六神 */
export function zhuangGua(bits, dayGan) {
  const g = guaFromBits(bits);
  const pal = guaPalace(g.name);
  if (!pal) return null;
  const lowerN = NAJIA[g.lower], upperN = NAJIA[g.upper];
  const najia = [...lowerN, ...upperN];
  const LIUSHEN = ['青龙', '朱雀', '勾陈', '腾蛇', '白虎', '玄武'];
  // 六神起例：甲乙起青龙、丙丁起朱雀、戊起勾陈、己起腾蛇、庚辛起白虎、壬癸起玄武
  const shenStart = [0, 0, 1, 1, 2, 3, 4, 4, 5, 5][GAN.indexOf(dayGan)] ?? 0;

  const yao = [];
  for (let i = 0; i < 6; i++) {
    const gz = najia[i];
    const gan = gz[0], zhi = gz[1];
    const yaoWx = ZHI_WX[ZHI.indexOf(zhi)];
    yao.push({
      pos: i + 1,
      posName: ['初', '二', '三', '四', '五', '上'][i] + '爻',
      yin: bits[i] === 0,
      yang: bits[i] === 1,
      gz, gan, zhi, zhiWx: yaoWx,
      xing: GAN_WX[GAN.indexOf(gan)],
      liuQin: liuQin(pal.palaceWx, yaoWx),
      shen: LIUSHEN[(shenStart + i) % 6],
      shi: i + 1 === pal.shi,
      ying: i + 1 === pal.ying,
    });
  }
  return {
    ...g, bits, palace: pal.palace, palaceWx: pal.palaceWx,
    type: pal.type, shiPos: pal.shi, yingPos: pal.ying,
    yao,
  };
}

/** 变卦所需的爻变 */
export function flipBit(bits, pos) {
  const out = [...bits];
  out[pos] = out[pos] ? 0 : 1;
  return out;
}

/** 卦象二进制串（初爻在左，供 UI 渲染用） */
export function guaBitsText(bits) { return bits.join(''); }

/** 文本卦象（自上而下 6 行，便于终端查看） */
export function guaText(bits) {
  return bits.slice().reverse().map(b => b ? '▄▄▄▄▄▄▄' : '▄▄▄ ▄▄▄').join('\n');
}

/** 爻符号文字（用于终端 / 文本输出） */
export function yaoSymbol(yang) { return yang ? '▄▄▄▄▄' : '▄▄ ▄▄'; }
