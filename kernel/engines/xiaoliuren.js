/**
 * 小六壬引擎 —— 掐指一算，六宫轮转
 * 起法：大安起正月 → 月上起日 → 日上起时
 */
import { fourPillars, toLunar } from '../core/calendar.js';
import { ZHI } from '../core/constants.js';

export const LIU_GONG = [
  {
    name: '大安', wx: '木', shen: '青龙', luck: '吉',
    desc: '身不动时，五行属木，青龙。主安定、平安、事有指望，宜守不宜动。',
    yi: '求财、婚姻、远行、签约', ji: '动土、搬迁、争讼',
  },
  {
    name: '留连', wx: '水', shen: '玄武', luck: '凶',
    desc: '卒未归时，五行属水，玄武。主拖延、纠缠、反复，久拖不决。',
    yi: '谋划、等待、蓄势', ji: '开市、远行、签约、嫁娶',
  },
  {
    name: '速喜', wx: '火', shen: '朱雀', luck: '吉',
    desc: '人便至时，五行属火，朱雀。主快速、喜信、好消息将至，事在眼前。',
    yi: '求财、婚姻、出行、见贵', ji: '安葬、久拖之事',
  },
  {
    name: '赤口', wx: '金', shen: '白虎', luck: '凶',
    desc: '官事凶时，五行属金，白虎。主口舌、争执、官非、失物、惊扰。',
    yi: '捕盗、破旧、求医', ji: '嫁娶、签约、合伙、出行',
  },
  {
    name: '小吉', wx: '木', shen: '六合', luck: '大吉',
    desc: '人来喜时，五行属木，六合。主和合、喜事、多吉多利，凡事可成。',
    yi: '嫁娶、求财、交易、出行、祈福', ji: '刑讼、破土',
  },
  {
    name: '空亡', wx: '土', shen: '勾陈', luck: '大凶',
    desc: '音信稀时，五行属土，勾陈。主落空、虚无、劳而无功，事多不成。',
    yi: '行善、静养、收敛', ji: '开市、出行、嫁娶、求财',
  },
];

/**
 * 小六壬起课
 * @param {number} month 农历月
 * @param {number} day 农历日
 * @param {number} hourZhiIdx 时支索引（0=子）
 */
export function qiKe(month = 1, day = 1, hourZhiIdx = 0) {
  // 防御：允许传入越界值（如农历闰月标记），统一归一化到 1..6 的循环
  const m = Math.max(1, Math.round(month || 1));
  const d = Math.max(1, Math.round(day || 1));
  const hz = Math.min(11, Math.max(0, Math.round(hourZhiIdx || 0)));
  const mIdx = (m - 1) % 6;
  const dIdx = (mIdx + (d - 1)) % 6;
  const hIdx = (dIdx + hz) % 6;
  month = m; day = d; hourZhiIdx = hz;
  const trace = [
    { step: '月上起课', input: `农历${month}月`, land: LIU_GONG[mIdx].name },
    { step: '日上起课', input: `农历${day}日`, land: LIU_GONG[dIdx].name },
    { step: '时上定局', input: `${ZHI[hourZhiIdx]}时`, land: LIU_GONG[hIdx].name },
  ];
  return {
    month, day, hourZhiIdx, hourZhi: ZHI[hourZhiIdx],
    mIdx, dIdx, hIdx,
    trace,
    result: LIU_GONG[hIdx],
    allGong: LIU_GONG,
  };
}

/** 按当前时间起课 */
export function qiKeNow(date = new Date()) {
  const y = date.getFullYear(), mo = date.getMonth() + 1, d = date.getDate(), h = date.getHours();
  const lunar = toLunar(y, mo, d);
  const hourZhiIdx = (h === 23 || h === 0) ? 0 : Math.floor((h + 1) / 2);
  const mm = lunar ? lunar.month : mo;
  const dd = lunar ? lunar.day : d;
  return { ...qiKe(mm, dd, hourZhiIdx), lunar, time: { y, mo, d, h } };
}

/** 文本输出 */
export function xiaoliurenToText(r) {
  const L = [];
  if (r.lunar) L.push(`【农历】${r.lunar.year}年${r.lunar.text}`);
  L.push(`【起课】`);
  r.trace.forEach(t => L.push(`　${t.step}：${t.input} → 落「${t.land}」`));
  L.push('');
  L.push(`【断辞】${r.result.name}（${r.result.luck}）　五行${r.result.wx}　${r.result.shen}`);
  L.push(`【释义】${r.result.desc}`);
  L.push(`【宜】${r.result.yi}`);
  L.push(`【忌】${r.result.ji}`);
  return L.join('\n');
}
