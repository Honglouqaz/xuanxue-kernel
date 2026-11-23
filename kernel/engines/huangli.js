/**
 * 黄历 / 择日引擎
 * 建除十二神 + 二十八宿 + 冲煞 + 宜忌（规则推演）
 */
import { fourPillars, toLunar, jieqiOnDate, jieqiListOfYear, jdn } from '../core/calendar.js';
import { GAN, ZHI, SHENGXIAO, nayin, LIU_CHONG, ZHI_WX } from '../core/constants.js';

/** 建除十二神 */
const JIAN_CHU = ['建', '除', '满', '平', '定', '执', '破', '危', '成', '收', '开', '闭'];

const JIAN_CHU_YI_JI = {
  建: { yi: ['出行', '上任', '祈福', '祭祀', '求嗣', '竖柱'], ji: ['动土', '开仓', '掘井', '乘船'] },
  除: { yi: ['除服', '疗病', '扫舍', '解除', '出行', '沐浴'], ji: ['开市', '嫁娶', '求财', '签约'] },
  满: { yi: ['祭祀', '开市', '立契', '进人口', '祈福', '纳财'], ji: ['服药', '栽种', '安葬', '赴任'] },
  平: { yi: ['修饰垣墙', '平治道涂', '嫁娶', '涂泥'], ji: ['开渠', '栽种', '动土', '掘井'] },
  定: { yi: ['冠带', '安床', '议亲', '签约', '纳畜', '修造'], ji: ['诉讼', '出行', '移徙', '开仓'] },
  执: { yi: ['捕捉', '结网', '造屋', '种植', '修造'], ji: ['开市', '出行', '移徙', '开仓'] },
  破: { yi: ['破屋坏垣', '求医', '治病', '拆卸'], ji: ['嫁娶', '开市', '动土', '签约', '上任'] },
  危: { yi: ['安床', '祭祀', '祈福', '安葬'], ji: ['登高', '行船', '出行', '移徙'] },
  成: { yi: ['开市', '嫁娶', '入学', '动土', '立券', '安床'], ji: ['诉讼', '破土', '拆卸'] },
  收: { yi: ['纳财', '捕捉', '进人口', '收获', '开仓'], ji: ['开市', '出行', '安葬', '嫁娶'] },
  开: { yi: ['祭祀', '入学', '开市', '出行', '修造', '动土'], ji: ['安葬', '破土', '伐木'] },
  闭: { yi: ['筑堤', '埋穴', '收敛', '筑墙', '补垣'], ji: ['开市', '出行', '手术', '开仓', '嫁娶'] },
};

/** 二十八宿 */
const XIU = [
  { n: '角', a: '蛟', e: '木', luck: '吉' }, { n: '亢', a: '龙', e: '金', luck: '凶' },
  { n: '氐', a: '貉', e: '土', luck: '凶' }, { n: '房', a: '兔', e: '日', luck: '吉' },
  { n: '心', a: '狐', e: '月', luck: '凶' }, { n: '尾', a: '虎', e: '火', luck: '吉' },
  { n: '箕', a: '豹', e: '水', luck: '吉' }, { n: '斗', a: '獬', e: '木', luck: '吉' },
  { n: '牛', a: '牛', e: '金', luck: '凶' }, { n: '女', a: '蝠', e: '土', luck: '凶' },
  { n: '虚', a: '鼠', e: '日', luck: '凶' }, { n: '危', a: '燕', e: '月', luck: '凶' },
  { n: '室', a: '猪', e: '火', luck: '吉' }, { n: '壁', a: '貐', e: '水', luck: '吉' },
  { n: '奎', a: '狼', e: '木', luck: '凶' }, { n: '娄', a: '狗', e: '金', luck: '吉' },
  { n: '胃', a: '雉', e: '土', luck: '吉' }, { n: '昴', a: '鸡', e: '日', luck: '凶' },
  { n: '毕', a: '乌', e: '月', luck: '吉' }, { n: '觜', a: '猴', e: '火', luck: '凶' },
  { n: '参', a: '猿', e: '水', luck: '吉' }, { n: '井', a: '犴', e: '木', luck: '吉' },
  { n: '鬼', a: '羊', e: '金', luck: '凶' }, { n: '柳', a: '獐', e: '土', luck: '凶' },
  { n: '星', a: '马', e: '日', luck: '凶' }, { n: '张', a: '鹿', e: '月', luck: '吉' },
  { n: '翼', a: '蛇', e: '火', luck: '凶' }, { n: '轸', a: '蚓', e: '水', luck: '吉' },
];
/** 锚点：2026-09-21 值日星宿为「心」（索引 4） */
const XIU_ANCHOR_JDN = 2461305;
const XIU_ANCHOR_IDX = 4;

/** 三煞方位 */
function shaDirection(dayZhi) {
  if (['申', '子', '辰'].includes(dayZhi)) return '南';
  if (['寅', '午', '戌'].includes(dayZhi)) return '北';
  if (['巳', '酉', '丑'].includes(dayZhi)) return '东';
  return '西';
}

/**
 * 黄历（某日）
 * @param {number} y @param {number} m @param {number} d
 */
export function huangli(y, m, d) {
  // 边界检查：y/m/d 必须是 1900–2100 的整数，且 d 落在当月天数内。
  // 不检查的话，非法入参会让 jdn 算出 NaN → XIU 索引取到 undefined → 后面崩在 .luck 上。
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d) ||
      y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > new Date(y, m, 0).getDate()) {
    throw new RangeError(`huangli(y, m, d) 需要 1900–2100 的合法公历年月日，收到 ${y}-${m}-${d}`);
  }
  const fp = fourPillars(y, m, d, 12, 0);
  const [yg, mg, dg, hg] = fp.pillars;
  const dayZhi = dg[1];
  const monthZhi = mg[1];

  const jcIdx = ((ZHI.indexOf(dayZhi) - ZHI.indexOf(monthZhi)) % 12 + 12) % 12;
  const jc = JIAN_CHU[jcIdx];

  const xiuIdx = ((jdn(y, m, d) - XIU_ANCHOR_JDN) % 28 + 28) % 28;
  const xiu = XIU[(xiuIdx + XIU_ANCHOR_IDX) % 28];

  const chongZhi = LIU_CHONG[dayZhi];
  const lunar = toLunar(y, m, d);
  const jq = jieqiOnDate(y, m, d);

  const yi = [...JIAN_CHU_YI_JI[jc].yi];
  const ji = [...JIAN_CHU_YI_JI[jc].ji];
  if (xiu.luck === '吉') yi.push('祈福', '出行');
  else ji.push('嫁娶', '开市');

  return {
    date: { y, m, d },
    ganzhi: { year: yg, month: mg, day: dg, hour: hg },
    lunar,
    shengXiao: SHENGXIAO[ZHI.indexOf(yg[1])],
    dayShengXiao: SHENGXIAO[ZHI.indexOf(dayZhi)],
    nayin: { year: nayin(yg[0], yg[1]), month: nayin(mg[0], mg[1]), day: nayin(dg[0], dg[1]) },
    jianChu: jc,
    jianChuIdx: jcIdx,
    xiu: { ...xiu, idx: xiuIdx + 1 },
    chong: {
      zhi: chongZhi,
      shengXiao: SHENGXIAO[ZHI.indexOf(chongZhi)],
      sha: shaDirection(dayZhi),
      desc: `冲${SHENGXIAO[ZHI.indexOf(chongZhi)]}（${chongZhi}），煞${shaDirection(dayZhi)}`,
    },
    yi: [...new Set(yi)],
    ji: [...new Set(ji)],
    jieqi: jq,
    dayWx: ZHI_WX[ZHI.indexOf(dayZhi)],
    monthWx: ZHI_WX[ZHI.indexOf(monthZhi)],
  };
}

/** 某月黄历列表 */
export function huangliMonth(y, m) {
  const days = new Date(y, m, 0).getDate();
  const out = [];
  for (let d = 1; d <= days; d++) out.push(huangli(y, m, d));
  return out;
}

/** 择日：在给定区间内筛选符合条件的日子 */
export function zeRi(y, m, dFrom, dTo, filter = {}) {
  const out = [];
  for (let d = dFrom; d <= dTo; d++) {
    const h = huangli(y, m, d);
    let ok = true;
    if (filter.jianChu && !filter.jianChu.includes(h.jianChu)) ok = false;
    if (filter.yiAny && !filter.yiAny.some(k => h.yi.includes(k))) ok = false;
    if (filter.jiNone && filter.jiNone.some(k => h.ji.includes(k))) ok = false;
    if (filter.avoidChongShengXiao && h.chong.shengXiao === filter.avoidChongShengXiao) ok = false;
    if (filter.xiuLuck && h.xiu.luck !== filter.xiuLuck) ok = false;
    if (ok) out.push(h);
  }
  return out;
}

/** 文本输出 */
export function huangliToText(h) {
  const L = [];
  L.push(`【日期】${h.date.y}年${h.date.m}月${h.date.d}日  农历${h.lunar ? h.lunar.year + '年' + h.lunar.text : '—'}`);
  L.push(`【干支】${h.ganzhi.year}年 ${h.ganzhi.month}月 ${h.ganzhi.day}日　生肖${h.dayShengXiao}`);
  L.push(`【纳音】${h.nayin.year} ${h.nayin.month} ${h.nayin.day}`);
  L.push(`【值神】${h.jianChu}日（建除十二神）　【星宿】${h.xiu.n}${h.xiu.e}${h.xiu.a}（${h.xiu.luck}）`);
  L.push(`【冲煞】${h.chong.desc}`);
  if (h.jieqi) L.push(`【节气】今日 ${h.jieqi.name}`);
  L.push('');
  L.push(`【宜】${h.yi.join('、')}`);
  L.push(`【忌】${h.ji.join('、')}`);
  return L.join('\n');
}
