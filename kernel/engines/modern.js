/**
 * 现代玄学引擎 —— 星座 · 生命灵数 · 生肖 · 血型
 * ─────────────────────────────────────────────────────────
 * 与「术数」不同，这一支是可精确计算的现代占测体系：
 * 规则确定、无流派歧义，因此不需要权重表。
 */
import { SHENGXIAO, ZHI } from '../core/constants.js';

// ───────────────────────── 星座 ─────────────────────────

export const XING_ZUO = [
  { name: '白羊座', from: [3, 21], to: [4, 19], el: '火', lord: '火星', sym: '♈',
    key: '开创、直接、行动力强', good: '果断、有冲劲、坦率', bad: '急躁、易冲动、少耐性' },
  { name: '金牛座', from: [4, 20], to: [5, 20], el: '土', lord: '金星', sym: '♉',
    key: '稳定、务实、重感官', good: '可靠、有耐心、重承诺', bad: '固执、慢热、恋物' },
  { name: '双子座', from: [5, 21], to: [6, 21], el: '风', lord: '水星', sym: '♊',
    key: '变通、好奇、善沟通', good: '机敏、多才、善谈', bad: '易分心、反复、浅尝' },
  { name: '巨蟹座', from: [6, 22], to: [7, 22], el: '水', lord: '月亮', sym: '♋',
    key: '情感、护巢、记忆强', good: '体贴、念旧、顾家', bad: '敏感、多虑、防御重' },
  { name: '狮子座', from: [7, 23], to: [8, 22], el: '火', lord: '太阳', sym: '♌',
    key: '表现、领导、慷慨', good: '自信、有担当、讲义气', bad: '好面子、专断、浮夸' },
  { name: '处女座', from: [8, 23], to: [9, 22], el: '土', lord: '水星', sym: '♍',
    key: '分析、整理、求精', good: '细致、可靠、能校正', bad: '挑剔、焦虑、过度自省' },
  { name: '天秤座', from: [9, 23], to: [10, 23], el: '风', lord: '金星', sym: '♎',
    key: '平衡、审美、关系导向', good: '公正、优雅、善协调', bad: '犹豫、难拒绝、避冲突' },
  { name: '天蝎座', from: [10, 24], to: [11, 22], el: '水', lord: '冥王星', sym: '♏',
    key: '深度、意志、转化', good: '专注、洞察、有韧性', bad: '执着、多疑、记仇' },
  { name: '射手座', from: [11, 23], to: [12, 21], el: '火', lord: '木星', sym: '♐',
    key: '探索、扩张、信念', good: '乐观、远见、坦荡', bad: '散漫、过度承诺、直白伤人' },
  { name: '摩羯座', from: [12, 22], to: [1, 19], el: '土', lord: '土星', sym: '♑',
    key: '目标、责任、长线', good: '自律、可靠、能扛事', bad: '压抑、悲观、过度务实' },
  { name: '水瓶座', from: [1, 20], to: [2, 18], el: '风', lord: '天王星', sym: '♒',
    key: '独立、革新、群体', good: '有创见、客观、重自由', bad: '疏离、固执己见、难亲近' },
  { name: '双鱼座', from: [2, 19], to: [3, 20], el: '水', lord: '海王星', sym: '♓',
    key: '共情、想象、融合', good: '有同理心、直觉强、有艺术感', bad: '易受影响、逃避、界限模糊' },
];

export function xingZuoOf(month, day) {
  for (const z of XING_ZUO) {
    const [fm, fd] = z.from, [tm, td] = z.to;
    if (fm === tm) { if (month === fm && day >= fd && day <= td) return z; }
    else if (fm > tm) {  // 摩羯跨年
      if ((month === fm && day >= fd) || (month === tm && day <= td)) return z;
    } else {
      if ((month === fm && day >= fd) || (month === tm && day <= td)) return z;
    }
  }
  return null;
}

/** 元素分布统计（可传入多个日期，如一家人） */
export function elementBalance(dates) {
  const c = { 火: 0, 土: 0, 风: 0, 水: 0 };
  for (const d of dates) {
    const z = xingZuoOf(d.month, d.day);
    if (z) c[z.el]++;
  }
  return c;
}

// ───────────────────────── 生命灵数 ─────────────────────────

export const LING_SHU = {
  1: { title: '开创者', key: '独立、领导、原创', good: '有主见、有魄力', bad: '自我、独断', path: '宜自主创业、宜挂帅' },
  2: { title: '协调者', key: '配合、敏感、和解', good: '善体人意、能合作', bad: '依赖、优柔', path: '宜合伙、宜服务、宜中介' },
  3: { title: '表达者', key: '创意、沟通、乐观', good: '有感染力、多才艺', bad: '散漫、情绪化', path: '宜传播、宜创作、宜销售' },
  4: { title: '建构者', key: '秩序、务实、稳定', good: '踏实、能守成', bad: '刻板、抗拒变化', path: '宜工程、宜财务、宜管理' },
  5: { title: '自由者', key: '变化、探索、感官', good: '灵活、适应力强', bad: '不安定、易放纵', path: '宜贸易、宜travel、宜多元' },
  6: { title: '照顾者', key: '责任、家庭、疗愈', good: '有爱心、能承担', bad: '过度干涉、牺牲自我', path: '宜教育、宜医护、宜服务' },
  7: { title: '探究者', key: '分析、内省、真理', good: '有洞察、能钻研', bad: '孤僻、怀疑', path: '宜研究、宜技术、宜玄学' },
  8: { title: '成就者', key: '权力、财富、掌控', good: '有格局、能整合', bad: '控制欲、功利', path: '宜管理、宜金融、宜实业' },
  9: { title: '博爱者', key: '包容、理想、利他', good: '有大爱、视野宽', bad: '不切实际、难割舍', path: '宜公益、宜艺术、宜医教' },
  11: { title: '灵性启发者', key: '直觉、灵感、感召', good: '有灵感、能启发人', bad: '神经紧张、理想化', path: '宜灵性、宜创作、宜导师' },
  22: { title: '大建构者', key: '宏图、落地、遗业', good: '能建大系统', bad: '压力大、易自毁', path: '宜大型项目、宜架构' },
  33: { title: '大爱疗愈者', key: '奉献、疗愈、教导', good: '有疗愈力', bad: '牺牲过度', path: '宜教育、宜疗愈' },
};

const reduce = (n, allowMaster = true) => {
  while (n > 9) {
    if (allowMaster && (n === 11 || n === 22 || n === 33)) return n;
    n = String(n).split('').reduce((a, b) => a + Number(b), 0);
  }
  return n;
};

/**
 * 生命灵数：生日（公历）各位数字和，归约至 1-9 / 11 / 22 / 33
 */
export function lifePath(y, m, d) {
  const sum = String(y).split('').concat(String(m).split(''), String(d).split(''))
    .reduce((a, b) => a + Number(b), 0);
  const n = reduce(sum);
  const info = LING_SHU[n] || LING_SHU[reduce(n, false)];
  return { num: n, rawSum: sum, ...info };
}

/** 生日数（日）+ 命运数（年月日）双数 */
export function lingShuFull(y, m, d) {
  return {
    birthday: reduce(d),                   // 生日数
    lifePath: lifePath(y, m, d),           // 命运数
    expression: lifePath(y, m, d).num,     // 简化：以命运数代表达数
  };
}

// ───────────────────────── 生肖 ─────────────────────────

export const SHENG_XIAO_XING = {
  鼠: { key: '机敏、应变、善积', pair: '牛', clash: '马' },
  牛: { key: '勤恳、坚忍、守成', pair: '鼠', clash: '羊' },
  虎: { key: '勇猛、自信、独立', pair: '猪', clash: '猴' },
  兔: { key: '温和、谨慎、细腻', pair: '狗', clash: '鸡' },
  龙: { key: '大气、进取、好胜', pair: '鸡', clash: '狗' },
  蛇: { key: '深沉、智巧、内敛', pair: '猴', clash: '猪' },
  马: { key: '奔放、直率、爱自由', pair: '羊', clash: '鼠' },
  羊: { key: '和顺、重情、乐天', pair: '马', clash: '牛' },
  猴: { key: '灵巧、多变、机警', pair: '蛇', clash: '虎' },
  鸡: { key: '精敏、守时、重仪表', pair: '龙', clash: '兔' },
  狗: { key: '忠义、警觉、尽责', pair: '兔', clash: '龙' },
  猪: { key: '宽厚、福气、随和', pair: '虎', clash: '蛇' },
};

// ───────────────────────── 血型 ─────────────────────────

export const XUE_XING = {
  A: { key: '规整、谨慎、责任感强', good: '细致、可靠、有礼', bad: '拘谨、易焦虑、压抑' },
  B: { key: '自由、直率、兴趣驱动', good: '创意、率真、适应快', bad: '任性、少规划、我行我素' },
  O: { key: '务实、目标导向、有主见', good: '果断、包容、能扛', bad: '强势、固执、竞争心重' },
  AB: { key: '理性与感性并存、多面', good: '客观、多才、善分析', bad: '矛盾、疏离、决断难' },
};

// ───────────────────────── 综合 ─────────────────────────

export function paipanModern(input) {
  const { y, mo, d, blood } = input;
  const xz = xingZuoOf(mo, d);
  const lp = lingShuFull(y, mo, d);
  const sx = SHENGXIAO[((y - 4) % 12 + 12) % 12];
  return {
    input, xingZuo: xz, lingShu: lp, shengXiao: sx,
    shengXiaoInfo: SHENG_XIAO_XING[sx],
    blood: blood ? { type: blood, ...(XUE_XING[blood] || {}) } : null,
  };
}

export function modernToText(r) {
  const L = [];
  L.push(`【公历】${r.input.y}-${r.input.mo}-${r.input.d}`);
  L.push('');
  if (r.xingZuo) {
    const z = r.xingZuo;
    L.push(`【星座】${z.sym} ${z.name}（${z.el}象 · 守护星 ${z.lord}）`);
    L.push(`　核心：${z.key}`);
    L.push(`　长处：${z.good}`);
    L.push(`　短处：${z.bad}`);
  }
  L.push('');
  L.push(`【生命灵数】${r.lingShu.lifePath.num}　${r.lingShu.lifePath.title}（各位数字和 ${r.lingShu.lifePath.rawSum}）`);
  L.push(`　核心：${r.lingShu.lifePath.key}`);
  L.push(`　长处：${r.lingShu.lifePath.good}｜短处：${r.lingShu.lifePath.bad}`);
  L.push(`　路径：${r.lingShu.lifePath.path}`);
  L.push(`　生日数：${r.lingShu.birthday}`);
  L.push('');
  L.push(`【生肖】${r.shengXiao}　${r.shengXiaoInfo.key}`);
  L.push(`　三合／贵人生肖：${r.shengXiaoInfo.pair}　相冲：${r.shengXiaoInfo.clash}`);
  if (r.blood) {
    L.push('');
    L.push(`【血型】${r.blood.type}　${r.blood.key}`);
    L.push(`　长处：${r.blood.good}｜短处：${r.blood.bad}`);
  }
  return L.join('\n');
}
