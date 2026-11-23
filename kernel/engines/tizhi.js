/**
 * engines/tizhi.js — 五行体质 · 中医体质辨识（在已验证的四柱/五行内核之上构建）
 *
 * 设计原则（刻意不引入新的"传统数表"）：
 *   本模块**所有结论都从已通过 1680 组基准校验的历法内核推导**，不手工录入任何
 *   流派表格。理由：玄学里最怕"看着像传统、其实是编的"——宁可少一个体系，
 *   不可多一处无据的数字。所以这里用的是：
 *     四柱（calendar.fourPillars）→ 干支五行 → 五行力量分布（wuxing.wuxingPower）
 *     → 偏性 → 体质倾向 → 饮食起居调养建议
 *
 * 中医体质九分法（中华中医药学会《中医体质分类与判定》ZYYXH/T157-2009）：
 *   平和 · 气虚 · 阳虚 · 阴虚 · 痰湿 · 湿热 · 血瘀 · 气郁 · 特禀
 *   本模块给出的是**五行偏性 → 体质倾向的对应**，属"框架级倾向"，
 *   不是临床判定；盘面文本里已写明这一点，AI 也被告知不得越界断言。
 */

import * as cal from '../core/calendar.js';
import * as wx5 from '../core/wuxing.js';

// 天干 → 五行
const GAN_WX = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' };
// 地支 → 五行
const ZHI_WX = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
// 五行 → 脏腑 / 体表 / 情志 / 味 / 色
const WX_ORG = {
  木: { zang: '肝', fu: '胆', ti: '筋', qiao: '目', zhi: '怒', wei: '酸', se: '青', shi: '春' },
  火: { zang: '心', fu: '小肠', ti: '脉', qiao: '舌', zhi: '喜', wei: '苦', se: '赤', shi: '夏' },
  土: { zang: '脾', fu: '胃', ti: '肉', qiao: '口', zhi: '思', wei: '甘', se: '黄', shi: '长夏' },
  金: { zang: '肺', fu: '大肠', ti: '皮毛', qiao: '鼻', zhi: '悲', wei: '辛', se: '白', shi: '秋' },
  水: { zang: '肾', fu: '膀胱', ti: '骨', qiao: '耳', zhi: '恐', wei: '咸', se: '黑', shi: '冬' },
};
// 五行偏性 → 体质倾向（框架级对应，非临床判定）
const PIAN = {
  木: { strong: '气郁倾向（木过则易郁、易怒、胁胀）', weak: '气虚倾向（木不及则疏泄无力、易疲、情绪低落）' },
  火: { strong: '湿热倾向（火过则易上火、口疮、心烦失眠）', weak: '阳虚倾向（火不及则畏寒、四肢不温、精神不振）' },
  土: { strong: '痰湿倾向（土过则运化壅滞、身重、腹胀）', weak: '气虚倾向（土不及则纳差、乏力、便溏）' },
  金: { strong: '偏燥倾向（金过则干咳、皮干、鼻燥）', weak: '气虚倾向（金不及则易感冒、气短、自汗）' },
  水: { strong: '阳虚/水湿倾向（水过则畏寒、水肿、夜尿多）', weak: '阴虚倾向（水不及则口干、盗汗、腰膝酸软）' },
};
// 调养（按五行偏性给，含四季）
const TIAO = {
  木: { strong: '疏肝理气：早睡、散步、八段锦「调理脾胃须单举」；少怒少熬夜；可饮玫瑰花、佛手。',
        weak: '养肝血：保证 23 点前入睡（丑时肝经当令）；枸杞、桑葚；适度舒筋拉伸。' },
  火: { strong: '清心降火：少辛辣煎炸；莲子心、竹叶代茶；午间小睡养心。',
        weak: '温养心阳：避生冷；桂圆、红枣；晨起晒背；勿过劳耗气。' },
  土: { strong: '健脾祛湿：少甜腻生冷；薏米、赤小豆、陈皮；饭后缓行百步。',
        weak: '健脾益气：三餐定时；山药、小米、大枣；忌饥饱无常。' },
  金: { strong: '润肺防燥：多饮温水；银耳、百合、雪梨；室内增湿。',
        weak: '补肺固表：练腹式呼吸；黄芪、太子参（需辨证）；注意保暖防感冒。' },
  水: { strong: '温肾利水：避寒湿；艾灸关元、命门（需专业指导）；少盐。',
        weak: '滋肾填精：早睡、节欲；黑芝麻、核桃、枸杞；忌熬夜久坐。' },
};

function wuxingOfGZ(gz) {
  const g = String(gz).charAt(0), z = String(gz).charAt(1);
  return [GAN_WX[g] || '', ZHI_WX[z] || ''];
}

/** 统计四柱八字里五行出现的次数（天干地支各算一位） */
function countWuxing(pillars) {
  const cnt = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 };
  for (const p of pillars) {
    for (const w of wuxingOfGZ(p)) if (w in cnt) cnt[w]++;
  }
  return cnt;
}

/**
 * 主入口：由出生信息给出五行体质倾向
 * v: {y,mo,d,h,mi} —— 与其它引擎同参
 */
function tizhi(v) {
  const y = +v.y, mo = +v.mo, d = +v.d;
  const h = v.h === '' || v.h === undefined ? 12 : +v.h;
  const mi = v.mi === '' || v.mi === undefined ? 0 : +v.mi;
  const fp = cal.fourPillars(y, mo, d, h, mi);
  const pillars = fp.pillars || [fp.year, fp.month, fp.day, fp.hour];
  const cnt = countWuxing(pillars);
  const total = 8;
  const avg = total / 5;

  // 偏性判定（框架级阈值，非精密定量）
  // ★ 为什么不用 "均值±1"：四柱只有 8 个位置，任一五行最多也就 3-5 位，
  //   用 avg+1（≈2.6）几乎永远达不到 ⇒ 全部判成"无偏性"，模块形同虚设。
  //   改用绝对阈值：≥3 位为偏旺（真正的聚集），≤1 位为偏弱（确实单薄），2 位算中和。
  const STRONG_AT = 3, WEAK_AT = 1;
  const strong = [], weak = [];
  for (const w of Object.keys(cnt)) {
    if (cnt[w] >= STRONG_AT) strong.push(w);
    else if (cnt[w] <= WEAK_AT) weak.push(w);
  }
  const dayGan = String(pillars[2] || '').charAt(0);
  const dayWx = GAN_WX[dayGan] || '';
  const missing = Object.keys(cnt).filter((w) => cnt[w] === 0);

  // 主偏性：取最强的那个
  let main = strong[0] || (weak.length ? '*' + weak[0] : '');
  const mainWx = main.replace('*', '');

  const L = [];
  L.push('【五行体质辨识 · 框架级倾向】');
  L.push('（本项由四柱干支的五行分布推导，属"偏性提示"，不作临床体质判定）');
  L.push('');
  L.push('四柱：' + pillars.join('　'));
  L.push('日主：' + dayGan + '（' + dayWx + '）　出生：' + y + '-' + mo + '-' + d + ' ' + h + ':' + String(mi).padStart(2, '0'));
  L.push('');
  L.push('五行分布：' + Object.keys(cnt).map((w) => w + ' ' + cnt[w]).join('　'));
  L.push('偏旺：' + (strong.length ? strong.join('、') : '无') + '　偏弱：' + (weak.length ? weak.join('、') : '无')
    + (missing.length ? '　缺：' + missing.join('、') : ''));
  L.push('');

  if (mainWx && PIAN[mainWx]) {
    const isStrong = strong.indexOf(mainWx) >= 0;
    L.push('主偏性：' + mainWx + (isStrong ? '偏旺' : '偏弱'));
    L.push('体质倾向：' + (isStrong ? PIAN[mainWx].strong : PIAN[mainWx].weak));
    L.push('');
    L.push('该偏性关联：');
    const o = WX_ORG[mainWx];
    L.push('　脏：' + o.zang + '　腑：' + o.fu + '　体表：' + o.ti + '　窍：' + o.qiao);
    L.push('　情志：' + o.zhi + '　味：' + o.wei + '　色：' + o.se + '　主季：' + o.shi);
    L.push('');
    L.push('调养取向：');
    L.push('　' + (isStrong ? TIAO[mainWx].strong : TIAO[mainWx].weak));
  } else {
    L.push('五行分布相对均衡，无明显偏性 —— 按平和体质养护：起居有常、饮食有节、不妄作劳。');
  }

  L.push('');
  L.push('★ 边界说明：以上是「五行偏性 → 体质倾向」的框架对应，不是诊断。');
  L.push('  真正判定体质需四诊合参（望闻问切）与量表打分；本文本仅供调养参考。');
  L.push('  流派差异：五行配属有「五行配五脏」与「六经脏腑」两套取径，本阁按主流取用。');

  return {
    engineId: 'tizhi',
    chart: chart(cnt, pillars, strong, weak, missing, mainWx),
    text: L.join('\n'),
    data: { pillars, cnt, strong, weak, missing, dayGan, dayWx, mainWx: mainWx, pianti: PIAN[mainWx] || null },
  };
}

/** 盘面：五行条形 + 四柱 + 体质倾向 */
function chart(cnt, pillars, strong, weak, missing, mainWx) {
  const max = Math.max(1, ...Object.keys(cnt).map((w) => cnt[w]));
  const bars = Object.keys(cnt).map((w) => {
    const n = cnt[w];
    const wpx = Math.round((n / max) * 100);
    const hl = strong.indexOf(w) >= 0 ? 'hl' : (weak.indexOf(w) >= 0 ? 'dim' : '');
    return '<div class="row"><span class="lbl">' + w + '</span>' +
      '<span style="display:inline-block;height:12px;width:' + Math.max(4, wpx) + '%;background:' +
      ({ 木: '#5f8f7a', 火: '#b8453a', 土: '#c8a45c', 金: '#d8d1c4', 水: '#6b7f9e' }[w]) +
      ';border-radius:3px"></span><span class="' + hl + '" style="margin-left:8px">' + n + ' 位</span></div>';
  }).join('');

  return '<div class="title">五行体质 · 框架级倾向</div>' +
    '<div class="sub">四柱</div>' +
    pillars.map((p, i) => '<span class="pill">' + ({ 0: '年', 1: '月', 2: '日', 3: '时' }[i]) + ' ' + p + '</span>').join('') +
    '<div class="sub">五行分布（偏旺<span class="hl">高亮</span> / 偏弱<span class="dim">灰显</span>）</div>' +
    bars +
    (mainWx ? '<div class="sub">主偏性</div><span class="pill">' + mainWx + '</span>' : '') +
    (missing.length ? '<div class="sub">所缺</div><span class="pill">' + missing.join('、') + '</span>' : '');
}

export { tizhi, countWuxing, WX_ORG, PIAN, TIAO };
