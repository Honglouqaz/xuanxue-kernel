/**
 * 八字排盘引擎（子平术）
 */
import { fourPillars, toLunar, jieqiTime, currentJieqiRange, dayOfYear } from '../core/calendar.js';
import {
  GAN, ZHI, GAN_WX, ZHI_WX, CANG_GAN, WUXING, SHENG, KE,
  GAN_YINYANG, shiShen, nayin, changSheng, xunKong, JIAZI,
} from '../core/constants.js';
import {
  wuxingPower, dayMasterStrength, yongShen, shenSha,
  zhiRelations, ganRelations, daYun, liuNianShiShen, wangShuai,
} from '../core/wuxing.js';

const POS_NAMES = ['年柱', '月柱', '日柱', '时柱'];
const POS_SHORT = ['年', '月', '日', '时'];

/** 胎元：月干进一，月支进三 */
function taiYuan(monthPillar) {
  const g = GAN[(GAN.indexOf(monthPillar[0]) + 1) % 10];
  const z = ZHI[(ZHI.indexOf(monthPillar[1]) + 3) % 12];
  return g + z;
}

/**
 * 八字完整排盘
 * @param {object} input { y, mo, d, h, mi, gender:'M'|'F', longitude?, useTrueSolarTime? }
 */
export function paipanBazi(input) {
  const { y, mo, d, h = 0, mi = 0, gender = 'M', longitude, useTrueSolarTime } = input;
  const fp = fourPillars(y, mo, d, h, mi, { longitude, useTrueSolarTime });
  const P = fp.pillars;
  const dayGan = P[2][0];
  const dayZhi = P[2][1];

  // ── 十神 ──
  const tenGods = {
    year: shiShen(dayGan, P[0][0]),
    month: shiShen(dayGan, P[1][0]),
    day: '日主',
    hour: shiShen(dayGan, P[3][0]),
  };

  // ── 各柱详表 ──
  const columns = P.map((p, i) => {
    const gan = p[0], zhi = p[1];
    const cang = CANG_GAN[ZHI.indexOf(zhi)] || [];
    return {
      pos: POS_NAMES[i], short: POS_SHORT[i],
      gan, zhi,
      ganWx: GAN_WX[GAN.indexOf(gan)],
      zhiWx: ZHI_WX[ZHI.indexOf(zhi)],
      ganYinYang: GAN_YINYANG[GAN.indexOf(gan)] === 1 ? '阳' : '阴',
      shiShen: i === 2 ? '日主' : shiShen(dayGan, gan),
      cangGan: cang.map(c => ({
        gan: c,
        wx: GAN_WX[GAN.indexOf(c)],
        shiShen: shiShen(dayGan, c),
      })),
      nayin: nayin(gan, zhi),
      changSheng: changSheng(dayGan, zhi),
      xunKong: xunKong(gan, zhi),
    };
  });

  // ── 五行统计 ──
  const wx = wuxingPower(P);
  const monthZhiWx = ZHI_WX[ZHI.indexOf(P[1][1])];
  const wxDetail = WUXING.map(w => ({
    wx: w,
    score: +wx.score[w].toFixed(2),
    pct: wx.pct[w],
    state: wangShuai(monthZhiWx, w),
    count: wx.raw[w],
    lack: wx.raw[w] === 0,
  }));

  // ── 日主强弱 & 用神 ──
  const strength = dayMasterStrength(P);
  const ys = yongShen(strength);

  // ── 神煞与关系 ──
  const ss = shenSha(P);
  const zr = zhiRelations(P);
  const gr = ganRelations(P);

  // ── 大运 ──
  const dy = daYun(P, y, mo, d, h, mi, gender);

  // ── 流年 ──
  const ln = liuNianShiShen(dayGan, y, 12);

  // ── 农历与节气 ──
  const lunar = toLunar(y, mo, d);
  const range = currentJieqiRange(y, mo, d, h, mi);
  const nearbyJieqi = [];
  if (range?.prev) {
    const jt = jieqiTime(range.prev.year ?? y, range.prev.name) || range.prev;
    nearbyJieqi.push({ ...jt, name: range.prev.name, role: '上一节气' });
  }
  if (range?.next) {
    const jt = jieqiTime(range.next.year ?? y, range.next.name) || range.next;
    nearbyJieqi.push({ ...jt, name: range.next.name, role: '下一节气' });
  }

  return {
    input: { y, mo, d, h, mi, gender },
    lunar,
    pillars: P,
    columns,
    tenGods,
    taiYuan: taiYuan(P[1]),
    dayMaster: {
      gan: dayGan, zhi: dayZhi,
      wx: GAN_WX[GAN.indexOf(dayGan)],
      yinYang: GAN_YINYANG[GAN.indexOf(dayGan)] === 1 ? '阳' : '阴',
      shengXiao: ZHI[ZHI.indexOf(P[0][1])],
    },
    wuxing: { detail: wxDetail, monthZhiWx, score: wx.score, pct: wx.pct },
    strength,
    yongShen: ys,
    shenSha: ss,
    relations: { zhi: zr, gan: gr },
    daYun: dy,
    liuNian: ln,
    jieqi: nearbyJieqi,
    notes: fp.notes,
    trueSolar: fp.trueSolar,
  };
}

/** 生成「八字命盘」纯文本（供 AI 解读或复制） */
export function baziToText(r) {
  const L = [];
  L.push(`【出生】公历 ${r.input.y}年${r.input.mo}月${r.input.d}日 ${String(r.input.h).padStart(2, '0')}:${String(r.input.mi).padStart(2, '0')}  ${r.input.gender === 'M' ? '男' : '女'}`);
  if (r.lunar) L.push(`【农历】${r.lunar.year}年${r.lunar.text}  ${r.dayMaster.shengXiao}年`);
  L.push(`【四柱】${r.pillars.join('　')}`);
  L.push(`【十神】${[r.tenGods.year, r.tenGods.month, r.tenGods.day, r.tenGods.hour].join('　')}`);
  L.push(`【藏干】${r.columns.map(c => c.cangGan.map(x => x.gan + x.shiShen).join('')).join('　')}`);
  L.push(`【纳音】${r.columns.map(c => c.nayin).join('　')}`);
  L.push(`【胎元】${r.taiYuan}`);
  L.push('');
  L.push(`【日主】${r.dayMaster.gan}（${r.dayMaster.yinYang}${r.dayMaster.wx}）　月令${r.wuxing.monthZhiWx}　${r.strength.wangShuai}`);
  L.push(`【强弱】${r.strength.level}（帮扶 ${r.strength.help} / 耗泄 ${r.strength.drain}，比 ${(r.strength.ratio * 100).toFixed(1)}%）`);
  L.push(`【喜用】${r.yongShen.favor.join('、')}${r.yongShen.avoid.length ? '　忌：' + r.yongShen.avoid.join('、') : ''}`);
  L.push('');
  L.push('【五行】' + r.wuxing.detail.map(d => `${d.wx}${d.score}(${d.state}${d.lack ? '·缺' : ''})`).join('　'));
  if (r.shenSha.length) {
    L.push('【神煞】' + r.shenSha.map(s => `${s.name}(${s.pos}${s.zhi})`).join('、'));
  }
  if (r.relations.zhi.length) {
    L.push('【地支】' + r.relations.zhi.map(x => `${x.type}${x.pair}`).join('、'));
  }
  if (r.relations.gan.length) {
    L.push('【天干】' + r.relations.gan.map(x => `${x.type}${x.pair}`).join('、'));
  }
  L.push('');
  L.push(`【大运】${r.daYun.direction}，${r.daYun.startAge} 岁起运（${r.daYun.startYear} 年）`);
  L.push('　' + r.daYun.list.map(x => `${x.startAge}岁 ${x.gz}`).join('　'));
  L.push('');
  L.push('【流年】' + r.liuNian.slice(0, 10).map(x => `${x.year} ${x.gz}(${x.shiShen})`).join('　'));
  if (r.notes.length) L.push('\n【提示】' + r.notes.join('；'));
  return L.join('\n');
}
