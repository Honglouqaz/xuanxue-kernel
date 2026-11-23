/* ═══════════════ 玄学工坊 · 模块定义（无 DOM 依赖，可 headless 测试） ═══════════════ */
import { fourPillars, toLunar, jieqiListOfYear, currentJieqiRange, jieqiOnDate } from '../core/calendar.js';
import { ZHI, SHENGXIAO } from '../core/constants.js';
import { paipanBazi, baziToText } from '../engines/bazi.js';
import { paipanZiwei, ziweiToText, ziweiGrid, zhiOf } from '../engines/ziwei.js';
import { qiGua, liuyaoToText } from '../engines/liuyao.js';
import { qiGuaMeihua, meihuaToText } from '../engines/meihua.js';
import { huangli, zeRi, huangliToText } from '../engines/huangli.js';
import { qiKe, qiKeNow, xiaoliurenToText } from '../engines/xiaoliuren.js';
import { wuGe, xingmingToText } from '../engines/xingming.js';
import { paipanQimen, qimenToText, LUOSHU_GRID } from '../engines/qimen.js';
import { paipanLiuren, liurenToText } from '../engines/liuren.js';
import { paipanXuankong, xuankongToText, paipanBazhai, bazhaiToText, luopan, SHAN_24, SHOU_TO_GUA } from '../engines/fengshui.js';
import { jieGua, yaoGua, yijingToText, findGua } from '../engines/yijing.js';
import { kanXiang, xiangshuToText, SHI_ER_GONG, XIANG_TIAO } from '../engines/xiangshu.js';
import { paipanModern, modernToText } from '../engines/modern.js';
import { paipanTaiyi, taiyiToText } from '../engines/taiyi.js';

// ─────────────── 工具 ───────────────
export const pad = (n) => String(n).padStart(2, '0');
export const today = () => { const d = new Date(); return { y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate(), h: d.getHours(), mi: d.getMinutes() }; };
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const GUA_SYM = { 乾: '☰', 兑: '☱', 离: '☲', 震: '☳', 巽: '☴', 坎: '☵', 艮: '☶', 坤: '☷' };
const ZHI_HOUR_LABEL = ['23:00-00:59', '01:00-02:59', '03:00-04:59', '05:00-06:59', '07:00-08:59', '09:00-10:59', '11:00-12:59', '13:00-14:59', '15:00-16:59', '17:00-18:59', '19:00-20:59', '21:00-22:59'];
const MAIN_STARS = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'];
const TAIYI_GUA = { 1: '乾', 2: '离', 3: '艮', 4: '震', 5: '中', 6: '兑', 7: '坤', 8: '坎', 9: '巽' };
const TAIYI_DIR = { 1: '西北', 2: '南', 3: '东北', 4: '东', 5: '中', 6: '西', 7: '西南', 8: '北', 9: '东南' };
const GUA_SYM_8 = { 坎: '☵', 坤: '☷', 震: '☳', 巽: '☴', 中: '○', 乾: '☰', 兑: '☱', 艮: '☶', 离: '☲' };

// ─────────────── 常用字段 ───────────────
const F_BIRTH = [
  { k: 'y', t: '出生年', type: 'number', min: 1900, max: 2100, def: 1990 },
  { k: 'mo', t: '月', type: 'number', min: 1, max: 12, def: 6 },
  { k: 'd', t: '日', type: 'number', min: 1, max: 31, def: 15 },
  { k: 'h', t: '时（0-23）', type: 'number', min: 0, max: 23, def: 14 },
  { k: 'mi', t: '分', type: 'number', min: 0, max: 59, def: 30 },
  { k: 'gender', t: '性别', type: 'select', opts: [['M', '男'], ['F', '女']], def: 'M' },
];
const F_DATE = [
  { k: 'y', t: '年', type: 'number', min: 1900, max: 2100, def: today().y },
  { k: 'mo', t: '月', type: 'number', min: 1, max: 12, def: today().mo },
  { k: 'd', t: '日', type: 'number', min: 1, max: 31, def: today().d },
];
const F_TIME = [
  { k: 'h', t: '时', type: 'number', min: 0, max: 23, def: today().h },
  { k: 'mi', t: '分', type: 'number', min: 0, max: 59, def: today().mi },
];

// ═══════════════ 盘面渲染（纯字符串，可在 Node 中测试） ═══════════════

export function chartBazi(r) {
  const labels = ['年柱', '月柱', '日柱', '时柱'];
  const subs = ['祖上·少年', '父母·青年', '自身·中年', '子女·晚年'];
  return `<div class="pillars">${(r.pillars || []).map((p, i) => `
    <div class="pillar">
      <div class="lbl">${labels[i]}</div>
      <div class="gz"><span class="g">${esc(p[0])}</span>${esc(p[1])}</div>
      <div class="sub">${subs[i]}</div>
    </div>`).join('')}</div>`;
}

export function chartZiwei(r) {
  const grid = ziweiGrid(r);
  const cells = grid.map(row => `<div class="cz">${row.map(p => {
    if (!p) return `<div class="cell center"><div class="hd">${esc(r.ju.name)}</div><div class="bd">命宫 ${zhiOf(r.mingIdx)}<br>身宫 ${zhiOf(r.shenIdx)}</div></div>`;
    const ms = p.stars.filter(s => MAIN_STARS.includes(s.name));
    const xs = p.stars.filter(s => !MAIN_STARS.includes(s.name));
    return `<div class="cell${p.isMing || p.isShen ? ' star' : ''}">
      <div class="hd">${esc(p.zhi)}宫 ${p.isMing ? '<span class="badge">命</span>' : ''}${p.isShen ? '<span class="badge g">身</span>' : ''}</div>
      <div class="bd">
        <div class="muted">${esc(p.name)}｜${esc(p.gan + p.zhi)}</div>
        <div class="main-star">${ms.map(s => esc(s.name) + (s.sihua ? `<small class="k">·${esc(s.sihua)}</small>` : '')).join(' ') || '（空宫）'}</div>
        <div class="fu">${xs.map(s => esc(s.name)).join(' ')}</div>
      </div></div>`;
  }).join('')}</div>`).join('');
  return `<div class="chart">${cells}</div>`;
}

export function chartQimen(r) {
  const P = (n) => r.palaces.find(x => x.gong === n);
  return `<div class="chart">${LUOSHU_GRID.map(row => `<div class="cz">${row.map(n => {
    const p = P(n);
    const isCenter = n === 5;
    return `<div class="cell${p.isZhiFu || p.isZhiShi ? ' star' : ''}${isCenter ? ' center' : ''}">
      <div class="hd">${GUA_SYM_8[p.gua] || ''} ${esc(p.gua)}${n}${p.isZhiFu ? '<span class="badge">符</span>' : ''}${p.isZhiShi ? '<span class="badge g">使</span>' : ''}</div>
      <div class="bd">
        ${isCenter ? `<div class="muted">地盘干 ${esc(p.diGan)}</div><div class="fu">天禽寄坤二</div>`
        : `<div>${esc(p.shen)}｜<span class="main-star">${esc(p.star)}</span></div>
           <div>${esc(p.men)}　<span class="muted">${esc(p.diGan || '')}/${esc(p.tianGan || '')}</span></div>`}
      </div></div>`;
  }).join('')}</div>`).join('')}</div>`;
}

export function chartFeixing(r) {
  return `<div class="chart">${[[4, 9, 2], [3, 5, 7], [8, 1, 6]].map(row => `<div class="cz">${row.map(n => `
    <div class="cell${n === 5 ? ' center' : ''}">
      <div class="hd">${esc(SHOU_TO_GUA[n])}${n}宫</div>
      <div class="bd">
        <div>运 <b class="main-star">${r.yunPan[n]}</b></div>
        <div>山 ${r.shanPan[n]}　向 ${r.xiangPan[n]}</div>
      </div></div>`).join('')}</div>`).join('')}</div>`;
}

export function chartTaiyi(r) {
  return `<div class="chart">${r.grid.map(row => `<div class="cz">${row.map(n => `
    <div class="cell${n === r.pos.gong ? ' star' : ''}${n === 5 ? ' center' : ''}">
      <div class="hd">${esc(TAIYI_GUA[n] || '')}${n}宫${n === r.pos.gong ? '<span class="badge">太乙</span>' : ''}</div>
      <div class="bd"><div class="muted">${esc(TAIYI_DIR[n])}</div></div>
    </div>`).join('')}</div>`).join('')}</div>`;
}

export function chartLiuren(r) {
  return `<div class="chart" style="gap:12px">
    <div class="cz">${r.siKe.map(k => `<div class="cell">
      <div class="hd">第${k.no}课</div>
      <div class="bd"><span class="main-star">${esc(k.upZhi)}</span> / ${esc(k.downZhi)}<div class="muted">${esc(k.rel)}</div></div>
    </div>`).join('')}</div>
    <div class="cz">${r.sanChuan.map(c => `<div class="cell star">
      <div class="hd">${esc(c.name)}</div>
      <div class="bd"><span class="main-star">${esc(c.zhi)}</span><div class="muted">${esc(c.jiang)}｜${esc(c.六亲)}${c.kong ? '｜空' : ''}</div></div>
    </div>`).join('')}</div>
  </div>`;
}

export function chartLiuyao(r) {
  const y = r.ben.yao.slice().reverse();
  const dongSet = new Set((r.changes || []).map(i => i + 1));
  return `<div class="chart"><div class="cell" style="min-height:auto"><div class="bd">
    ${y.map(a => `<div class="liuyao-line">${a.yang ? '███████' : '███ ███'}　<span class="muted">${esc(a.shen)}</span> ${esc(a.liuQin)} ${esc(a.gz)} ${a.shi ? '<span class="badge">世</span>' : ''}${a.ying ? '<span class="badge g">应</span>' : ''}${dongSet.has(a.pos) ? ' <span class="badge">动</span>' : ''}</div>`).join('')}
    <div style="margin-top:6px" class="muted">本卦 ${esc(r.ben.name)}（${esc(r.ben.palace)}·${esc(r.ben.type)}）　${r.bian ? '变卦 ' + esc(r.bian) : '静卦无变'}</div>
  </div></div></div>`;
}

export function chartMeihua(r) {
  const gname = (g) => { const f = findGua(g.upper, g.lower); return f ? f[1] : `${g.upper}${g.lower}`; };
  return `<div class="chart"><div class="cz">
    ${[['本卦', r.ben], ['互卦', r.hu], ['变卦', r.bian]].filter(x => x[1]).map(([lbl, g]) => `<div class="cell">
      <div class="hd">${lbl}</div>
      <div class="bd"><span class="main-star">${esc(gname(g))}</span>
      <div class="muted">上${esc(g.upper)} 下${esc(g.lower)}</div></div>
    </div>`).join('')}
    <div class="cell star"><div class="hd">体用</div>
      <div class="bd"><span class="main-star">${esc(r.ti)}（${esc(r.tiWx)}）</span> / ${esc(r.yong)}（${esc(r.yongWx)}）
      <div class="muted">${esc(r.relation?.type || '')}</div></div></div>
  </div></div>`;
}

export function chartYijing(r) {
  const f = (g) => g ? `${g[1]}<div class="muted">${g[5]}</div>` : '—';
  return `<div class="chart"><div class="cz">
    <div class="cell"><div class="hd">本卦</div><div class="bd"><span class="main-star">${f(r.ben)}</span></div></div>
    <div class="cell"><div class="hd">互卦</div><div class="bd">${f(r.hu)}</div></div>
    <div class="cell"><div class="hd">错卦</div><div class="bd">${f(r.cuo)}</div></div>
    <div class="cell"><div class="hd">综卦</div><div class="bd">${f(r.zong)}</div></div>
  </div></div>`;
}

export function chartLiugong(r) {
  return `<div class="chart"><div class="cz">${r.allGong.map((g, i) => `
    <div class="cell${i === r.hIdx ? ' star' : ''}">
      <div class="hd">${esc(g.name)}${i === r.hIdx ? '<span class="badge">落</span>' : ''}</div>
      <div class="bd"><div class="muted">${esc(g.wx)}｜${esc(g.shen)}</div><div class="fu">${esc(g.luck)}</div></div>
    </div>`).join('')}</div></div>`;
}

export function chartBazhai(r) {
  return `<div class="chart"><div class="cz">${r.directions.map(d => `
    <div class="cell${d.tone > 0 ? ' star' : ''}">
      <div class="hd">${esc(d.gua)}（${esc(d.dir)}）</div>
      <div class="bd"><span class="main-star">${esc(d.xing)}</span><div class="muted">${d.tone > 0 ? '吉' : '凶'}</div></div>
    </div>`).join('')}</div></div>`;
}

export function chartHuangli(r) {
  return `<div class="chart">
    <div class="cz">
      <div class="cell"><div class="hd">宜</div><div class="bd">${(r.yi || []).map(esc).join('、') || '—'}</div></div>
      <div class="cell"><div class="hd">忌</div><div class="bd">${(r.ji || []).map(esc).join('、') || '—'}</div></div>
    </div>
    <div class="cz" style="margin-top:2px">
      <div class="cell"><div class="hd">干支</div><div class="bd">${esc(r.ganzhi.year)}年 ${esc(r.ganzhi.month)}月 ${esc(r.ganzhi.day)}日<div class="muted">${esc(r.nayin.day)}</div></div></div>
      <div class="cell"><div class="hd">值神 / 星宿</div><div class="bd">${esc(r.jianChu)}日<br>${esc(r.xiu.n)}${esc(r.xiu.e)}${esc(r.xiu.a)}（${esc(r.xiu.luck)}）</div></div>
      <div class="cell"><div class="hd">冲煞</div><div class="bd">${esc(r.chong.desc)}</div></div>
    </div>
  </div>`;
}

export function chartZeri(rows, mo) {
  return `<div class="chart"><div class="cz" style="flex-wrap:wrap">${rows.slice(0, 30).map(r => `
    <div class="cell" style="flex:0 0 116px">
      <div class="hd">${mo}/${r.date.d}</div>
      <div class="bd"><div class="muted">${esc(r.jianChu)}日 ${esc(r.xiu.n)}宿</div>
      <div class="fu">宜 ${esc((r.yi || []).slice(0, 3).join('·')) || '—'}</div></div>
    </div>`).join('')}</div></div>`;
}

export function chartShiErGong() {
  return `<div class="chart"><div class="cz" style="flex-wrap:wrap">${SHI_ER_GONG.map(g => `
    <div class="cell" style="flex:0 0 31%">
      <div class="hd">${esc(g.name)}</div>
      <div class="bd"><div class="muted">${esc(g.pos)}</div><div>主${esc(g.zhu)}</div><div class="fu">忌：${esc(g.ji2)}</div></div>
    </div>`).join('')}</div></div>`;
}

// ═══════════════ 模块定义 ═══════════════

export const MODULES = [
  // ────────── 命理 ──────────
  {
    id: 'bazi', name: '八字命理', cat: '命理', glyph: '甲',
    desc: '四柱排盘 · 十神 · 藏干 · 旺衰喜用 · 神煞 · 大运流年。历法内核经 1680 组基准数据 100% 校验。',
    fields: [...F_BIRTH, { k: 'longitude', t: '出生地经度（可选·真太阳时）', type: 'number', def: 120, step: 0.5 }],
    run(v) {
      const useTst = Math.abs(+v.longitude - 120) > 0.01;
      const r = paipanBazi({ y: +v.y, mo: +v.mo, d: +v.d, h: +v.h, mi: +v.mi, gender: v.gender, useTrueSolarTime: useTst, longitude: +v.longitude });
      return {
        engineId: 'bazi', text: baziToText(r),
        data: { pillars: r.pillars, dayMaster: r.dayMaster, strength: r.strength, yongShen: r.yongShen, wuxingPct: r.wuxing?.pct, shenSha: r.shenSha, relations: r.relations, daYun: r.daYun?.list?.slice(0, 8) },
        chart: chartBazi(r),
      };
    },
  },
  {
    id: 'ziwei', name: '紫微斗数', cat: '命理', glyph: '紫',
    desc: '十二宫 · 十四主星 · 辅星 · 四化 · 大限。安紫微用「局数除日数」闭式公式，已用五局×30日全表与传世星表校验。',
    fields: F_BIRTH,
    run(v) {
      const r = paipanZiwei({ y: +v.y, mo: +v.mo, d: +v.d, h: +v.h, mi: +v.mi, gender: v.gender });
      return {
        engineId: 'ziwei', text: ziweiToText(r),
        data: {
          ming: zhiOf(r.mingIdx), shen: zhiOf(r.shenIdx), ju: r.ju.name,
          palaces: r.palaces.map(p => ({ name: p.name, gz: p.gan + p.zhi, stars: p.stars.map(s => s.name + (s.sihua ? '·' + s.sihua : '')) })),
          sihua: r.sihuaMap, daXian: r.daXian.list, notes: r.notes,
        },
        chart: chartZiwei(r),
      };
    },
  },
  {
    id: 'xingming', name: '姓名学', cat: '命理', glyph: '名',
    desc: '五格剖象 · 三才配置 · 81 数理吉凶 · 音韵五行（五音）。注：用简体笔画，与康熙笔画有差异。',
    fields: [
      { k: 'xing', t: '姓', type: 'text', def: '张' },
      { k: 'ming', t: '名', type: 'text', def: '三' },
      { k: 'bihua', t: '笔画覆盖（可选）', type: 'text', hint: '格式 姓:8,名:3；留空则用内置笔画表', def: '' },
    ],
    run(v) {
      const ov = {};
      if (v.bihua && v.bihua.includes(':')) {
        const m = String(v.bihua).match(/姓\s*[:：]\s*(\d+)[,，]?\s*名\s*[:：]\s*(\d+)/);
        if (m) { ov.姓 = +m[1]; ov.名 = +m[2]; }
      }
      const r = wuGe(v.xing, v.ming, ov);
      return { engineId: 'xingming', text: xingmingToText(r), data: r };
    },
  },
  {
    id: 'modern', name: '现代玄学', cat: '命理', glyph: '星',
    desc: '星座（含元素与守护星）· 生命灵数 · 生肖三合相冲 · 血型。规则确定，边界已做全年 366 天无重叠校验。',
    fields: [...F_DATE, { k: 'blood', t: '血型（可选）', type: 'select', opts: [['', '不填'], ['A', 'A 型'], ['B', 'B 型'], ['O', 'O 型'], ['AB', 'AB 型']], def: '' }],
    run(v) {
      const r = paipanModern({ y: +v.y, mo: +v.mo, d: +v.d, blood: v.blood });
      return {
        engineId: 'modern', text: modernToText(r),
        data: {
          xingZuo: r.xingZuo && { name: r.xingZuo.name, el: r.xingZuo.el, lord: r.xingZuo.lord, key: r.xingZuo.key, good: r.xingZuo.good, bad: r.xingZuo.bad },
          lifePath: r.lingShu.lifePath, birthday: r.lingShu.birthday,
          shengXiao: r.shengXiao, shengXiaoInfo: r.shengXiaoInfo, blood: r.blood,
        },
      };
    },
  },

  // ────────── 卜筮 ──────────
  {
    id: 'liuyao', name: '六爻卦占', cat: '卜筮', glyph: '爻',
    desc: '京房纳甲 · 装卦 · 六亲六神 · 世应 · 动变 · 旺衰。用于「一件具体事情成不成」。',
    fields: [
      { k: 'mode', t: '起卦方式', type: 'select', opts: [['coin', '三枚钱（随机）'], ['time', '时间起卦']], def: 'coin' },
      { k: 'question', t: '所问之事', type: 'textarea', hint: '越具体越好，如「本月与 A 方签这笔合同能否成交」', def: '' },
      ...F_DATE, ...F_TIME,
    ],
    run(v) {
      const r = qiGua({ mode: v.mode, date: { y: +v.y, mo: +v.mo, d: +v.d, h: +v.h, mi: +v.mi }, question: v.question });
      return {
        engineId: 'liuyao', text: liuyaoToText(r),
        data: {
          question: v.question, ben: r.ben.name, bian: r.bian, palace: r.ben.palace, type: r.ben.type,
          kong: r.xunKong, changes: r.changes,
          yao: r.ben.yao.map(y => ({ pos: y.posName, gz: y.gz, liuQin: y.liuQin, liuShen: y.shen, shi: y.shi, ying: y.ying })),
        },
        chart: chartLiuyao(r),
      };
    },
  },
  {
    id: 'meihua', name: '梅花易数', cat: '卜筮', glyph: '梅',
    desc: '先天起卦 · 体用生克 · 互卦变卦 · 观物取象。用于快速判断事情走向与得失。',
    fields: [
      { k: 'mode', t: '起卦方式', type: 'select', opts: [['time', '时间起卦'], ['number', '数字起卦']], def: 'time' },
      { k: 'n1', t: '数字一（数字起卦时用）', type: 'number', def: 8 },
      { k: 'n2', t: '数字二（数字起卦时用）', type: 'number', def: 5 },
      { k: 'question', t: '所问之事', type: 'text', def: '' },
      ...F_DATE, ...F_TIME,
    ],
    run(v) {
      const r = qiGuaMeihua({ mode: v.mode, date: { y: +v.y, mo: +v.mo, d: +v.d, h: +v.h, mi: +v.mi }, n1: +v.n1, n2: +v.n2 });
      return { engineId: 'meihua', text: meihuaToText(r), data: { method: r.method, ben: r.ben, hu: r.hu, bian: r.bian, ti: r.ti, yong: r.yong, tiWx: r.tiWx, yongWx: r.yongWx, relation: r.relation, question: v.question }, chart: chartMeihua(r) };
    },
  },
  {
    id: 'yijing', name: '周易卦解', cat: '卜筮', glyph: '易',
    desc: '六十四卦经文原辞 · 本卦互卦错卦综卦 · 义理与象数并参。摇卦为三枚铜钱法。',
    fields: [
      { k: 'mode', t: '起卦方式', type: 'select', opts: [['coin', '摇卦（随机）'], ['manual', '手动指定六爻']], def: 'coin' },
      { k: 'yao', t: '手动六爻（自下而上）', type: 'text', hint: '如 101010（1=阳 0=阴），仅手动模式有效', def: '101010' },
      { k: 'question', t: '所问之事', type: 'text', def: '' },
    ],
    run(v) {
      let yao;
      if (v.mode === 'manual') {
        const s = String(v.yao).replace(/[^01]/g, '');
        yao = (s.length === 6 ? s : '101010').split('').map(Number);
      } else yao = yaoGua();
      const r = jieGua(yao);
      return {
        engineId: 'yijing', text: yijingToText(r, v.question),
        data: { yao, ben: r.ben?.[1], hu: r.hu?.[1], cuo: r.cuo?.[1], zong: r.zong?.[1], question: v.question },
        chart: chartYijing(r),
      };
    },
  },
  {
    id: 'xiaoliuren', name: '小六壬', cat: '卜筮', glyph: '六',
    desc: '掐指一算 · 六宫轮转 · 月上起日、日上起时。用于快速定性吉凶与宜忌。',
    fields: [
      { k: 'mode', t: '起课方式', type: 'select', opts: [['now', '按当前时间自动取农历'], ['manual', '手动指定农历月日时']], def: 'now' },
      { k: 'lm', t: '农历月', type: 'number', min: 1, max: 12, def: 8 },
      { k: 'ld', t: '农历日', type: 'number', min: 1, max: 30, def: 11 },
      { k: 'hz', t: '时支', type: 'select', opts: ZHI.map((z, i) => [i, z + '时']), def: 8 },
    ],
    run(v) {
      const r = v.mode === 'now' ? qiKeNow() : qiKe(+v.lm, +v.ld, +v.hz);
      return { engineId: 'xiaoliuren', text: xiaoliurenToText(r), data: { result: r.result.name, luck: r.result.luck, wx: r.result.wx, shen: r.result.shen, yi: r.result.yi, ji: r.result.ji, trace: r.trace, allGong: r.allGong.map(g => g.name) }, chart: chartLiugong(r) };
    },
  },

  // ────────── 上古三式 ──────────
  {
    id: 'qimen', name: '奇门遁甲', cat: '上古三式', glyph: '奇',
    desc: '时家奇门 · 转盘法。拆补法定局、三奇六仪、九星八门八神、格局提示。转盘与飞盘派结果不同，已在盘内标注。',
    fields: [...F_DATE, ...F_TIME, { k: 'question', t: '所问之事', type: 'text', def: '' }],
    run(v) {
      const r = paipanQimen({ y: +v.y, mo: +v.mo, d: +v.d, h: +v.h, mi: +v.mi });
      return {
        engineId: 'qimen', text: qimenToText(r),
        data: {
          dun: r.jieqi.dunName, jieqi: r.jieqi.jieqi, yuan: r.jieqi.yuanName, xunShou: r.xunShou,
          zhiFu: r.zhiFu, zhiShi: r.zhiShi, fuYin: r.fuYin, fanYin: r.fanYin, geju: r.geju, question: v.question,
          palaces: r.palaces.filter(p => !p.isCenter).map(p => ({ gong: p.gua + p.gong, diPan: p.diGan, tianPan: p.tianGan, xing: p.star, men: p.men, shen: p.shen })),
        },
        chart: chartQimen(r),
      };
    },
  },
  {
    id: 'liuren', name: '大六壬', cat: '上古三式', glyph: '壬',
    desc: '月将加时 · 四课三传 · 十二天将。九宗门（贼克/比用/涉害/遥克/昴星/别责/八专/伏吟/返吟）均已实现，经一年 448 样本验证。',
    fields: [...F_DATE, ...F_TIME, { k: 'question', t: '所问之事', type: 'text', def: '' }],
    run(v) {
      const r = paipanLiuren({ y: +v.y, mo: +v.mo, d: +v.d, h: +v.h, mi: +v.mi, question: v.question });
      return {
        engineId: 'liuren', text: liurenToText(r),
        data: {
          yueJiang: r.yueJiang, siKe: r.siKe.map(k => ({ no: k.no, up: k.upZhi, down: k.downZhi, rel: k.rel })),
          keTi: r.keTi, faYong: r.faYong, sanChuan: r.sanChuan, guiRen: r.guiRen, kongWang: r.kongWang, question: v.question,
        },
        chart: chartLiuren(r),
      };
    },
  },
  {
    id: 'taiyi', name: '太乙神数', cat: '上古三式', glyph: '乙',
    desc: '太乙九宫 · 行宫顺序与周期 · 十六神 · 格局要义。⚠️ 积年基数各本不一，具体入宫仅供参照，可用「指定宫位」绕开。',
    fields: [
      { k: 'y', t: '公元年', type: 'number', min: 1900, max: 2100, def: today().y },
      { k: 'gongIndex', t: '指定入宫（可选·绕开积年）', type: 'select', opts: [['', '用积年推算'], [0, '一乾'], [1, '二离'], [2, '三艮'], [3, '四震'], [4, '六兑'], [5, '七坤'], [6, '八坎'], [7, '九巽']], def: '' },
    ],
    run(v) {
      const opt = { year: +v.y };
      if (v.gongIndex !== '' && v.gongIndex !== undefined) opt.gongIndex = +v.gongIndex;
      const r = paipanTaiyi(opt);
      return { engineId: 'taiyi', text: taiyiToText(r), data: { pos: r.pos, geju: r.geju, zhuDaJiang: r.zhuDaJiang, keDaJiang: r.keDaJiang, yin: r.yinGong, yang: r.yangGong }, chart: chartTaiyi(r) };
    },
  },

  // ────────── 风水 ──────────
  {
    id: 'xuankong', name: '玄空飞星', cat: '风水', glyph: '玄',
    desc: '三元九运 · 运盘 · 山星向星 · 旺山旺向判定。二十四山按 15° 分度，与山中线已做回代校验。',
    fields: [
      { k: 'y', t: '起造/入伙年（定元运）', type: 'number', min: 1900, max: 2100, def: today().y },
      { k: 'sitShan', t: '坐山', type: 'select', opts: SHAN_24.map(s => [s, s + ' 山']), def: '午' },
      { k: 'sitDegree', t: '坐山精确度数（可选·0-360）', type: 'number', def: 180, step: 0.5 },
    ],
    run(v) {
      const deg = +v.sitDegree;
      const r = paipanXuankong({ year: +v.y, sitDegree: deg, facingDegree: (deg + 180) % 360, sitShan: v.sitShan });
      const lp = luopan(deg, +v.y);
      return {
        engineId: 'xuankong',
        text: xuankongToText(r) + '\n\n【罗盘九层】\n' + lp.layers.map(l => `　${l.name}：${l.value}`).join('\n'),
        data: { yun: r.yun, yuan: r.yunInfo.yuan, sitShan: r.sitShan, facingShan: r.facingShan, geju: r.geju, yunPan: r.yunPan, shanPan: r.shanPan, xiangPan: r.xiangPan, shuangXing: r.shuangXing, notes: r.notes },
        chart: chartFeixing(r),
      };
    },
  },
  {
    id: 'bazhai', name: '八宅阳宅', cat: '风水', glyph: '宅',
    desc: '命卦 · 宅卦 · 游年八星 · 八方宜忌。游年由翻卦法推导，已与大游年歌 8 卦 × 7 星全量交叉验证。',
    fields: [
      { k: 'y', t: '出生年（算命卦）', type: 'number', min: 1900, max: 2100, def: 1990 },
      { k: 'gender', t: '性别', type: 'select', opts: [['M', '男'], ['F', '女']], def: 'M' },
      { k: 'sitShan', t: '宅坐山', type: 'select', opts: SHAN_24.map(s => [s, s + ' 山']), def: '子' },
    ],
    run(v) {
      const r = paipanBazhai({ year: +v.y, gender: v.gender, sitShan: v.sitShan });
      return { engineId: 'bazhai', text: bazhaiToText(r), data: { zhaiGua: r.zhaiGua, mingGua: r.mingGua, match: r.match, zhaiXiSi: r.zhaiXiSi, mingXiSi: r.mingXiSi, directions: r.directions.map(d => ({ xing: d.xing, gua: d.gua, dir: d.dir, tone: d.tone })), notes: r.notes }, chart: chartBazhai(r) };
    },
  },
  {
    id: 'zeri', name: '择日 · 黄历', cat: '风水', glyph: '历',
    desc: '黄历宜忌 · 建除十二神 · 二十八宿 · 冲煞 · 纳音。星宿算法已与权威历法库交叉校准。',
    fields: [
      ...F_DATE,
      { k: 'mode', t: '模式', type: 'select', opts: [['day', '看单日'], ['range', '区间择日']], def: 'day' },
      { k: 'd2', t: '区间截止日（择日模式用）', type: 'number', min: 1, max: 31, def: Math.min(today().d + 14, 28) },
      { k: 'filter', t: '择日过滤', type: 'select', opts: [['', '不过滤'], ['__any', '凡有宜即可'], ['开市', '宜开市'], ['嫁娶', '宜嫁娶'], ['出行', '宜出行'], ['交易', '宜交易']], def: '' },
    ],
    run(v) {
      const y = +v.y, mo = +v.mo;
      if (v.mode === 'range') {
        const dTo = Math.max(+v.d, Math.min(+v.d + 31, +v.d2));
        const filter = {};
        if (v.filter === '__any') filter.yiAny = ['祈福', '出行', '开市', '嫁娶', '交易', '求财', '祭祀', '纳财', '安床'];
        else if (v.filter) filter.yiAny = [v.filter];
        const list = zeRi(y, mo, +v.d, dTo, filter);
        const txt = [`【${y}年${mo}月 择日】范围 ${v.d} - ${dTo} 日${v.filter && v.filter !== '__any' ? `　过滤：宜${v.filter}` : ''}`,
          `命中 ${list.length} 天`, '']
          .concat(list.map(r => `${mo}/${r.date.d}　${r.ganzhi.day}日　${r.jianChu}日　${r.xiu.n}${r.xiu.e}宿（${r.xiu.luck}）　宜：${r.yi.join('、')}`))
          .join('\n');
        return {
          engineId: 'zeri', text: txt,
          data: {
            mode: 'range', from: `${y}-${mo}-${v.d}`, to: `${y}-${mo}-${dTo}`, count: list.length,
            days: list.map(r => ({ date: `${y}-${mo}-${r.date.d}`, gz: r.ganzhi.day, jianChu: r.jianChu, xiu: r.xiu.n + r.xiu.e + r.xiu.a, luck: r.xiu.luck, yi: r.yi, ji: r.ji })),
          },
          chart: chartZeri(list, mo),
        };
      }
      const r = huangli(y, mo, +v.d);
      return {
        engineId: 'zeri', text: huangliToText(r),
        data: { date: `${y}-${mo}-${v.d}`, ganzhi: r.ganzhi, jianChu: r.jianChu, xiu: r.xiu.n + r.xiu.e + r.xiu.a + '（' + r.xiu.luck + '）', chong: r.chong.desc, yi: r.yi, ji: r.ji, jieqi: r.jieqi?.name },
        chart: chartHuangli(r),
      };
    },
  },

  // ────────── 相术 ──────────
  {
    id: 'xiangshu', name: '相术 · 面相手相', cat: '相术', glyph: '相',
    desc: '面相十二宫 · 三停五官 · 五行形人 · 手相三线七丘。勾选观察到的手面特征即得传统断语。⚠️ 相术属经验归纳，不做命运断定。',
    fields: [
      { k: 'tags', t: '勾选观察到的手面特征', type: 'chips', opts: XIANG_TIAO.map(x => x.key), def: [] },
      { k: 'free', t: '其他特征描述（补充给 AI）', type: 'textarea', def: '' },
    ],
    run(v) {
      const r = kanXiang(v.tags || []);
      const extra = v.free ? `\n\n【补充描述】${v.free}` : '';
      return { engineId: 'xiangshu', text: xiangshuToText(r) + extra, data: { tags: v.tags, hits: r.hits.map(h => ({ area: h.area, text: h.text })), missing: r.missing, free: v.free }, chart: chartShiErGong() };
    },
  },
  {
    id: 'calendar', name: '历法工具', cat: '相术', glyph: '历',
    desc: '公历 ↔ 农历 · 四柱 · 当月节气时刻 · 当前节气区间。所有历法功能的底层工具，数据覆盖 1900–2100。',
    fields: [...F_DATE, ...F_TIME],
    run(v) {
      const y = +v.y, mo = +v.mo, d = +v.d, h = +v.h, mi = +v.mi;
      const fp = fourPillars(y, mo, d, h, mi);
      const lunar = toLunar(y, mo, d);
      const rng = currentJieqiRange(y, mo, d, h, mi);
      const todayJq = jieqiOnDate(y, mo, d);
      const list = jieqiListOfYear(y).filter(j => j.month === mo);
      const zhiIdx = ZHI.indexOf(fp.hour[1]);
      const lines = [
        `【公历】${y}年${mo}月${d}日 ${pad(h)}:${pad(mi)}`,
        `【农历】${lunar ? `${lunar.year}年${lunar.text}${lunar.leap ? '（闰月）' : ''}` : '—'}`,
        `【四柱】${fp.pillars.join('　')}`,
        `【时支】${fp.hour[1]}时（${ZHI_HOUR_LABEL[zhiIdx]}）`,
        `【生肖】${SHENGXIAO[ZHI.indexOf(fp.year[1])]}　【日生肖】${SHENGXIAO[ZHI.indexOf(fp.day[1])]}`,
        '',
        `【当前节气区间】`,
        `　前：${rng?.prev ? `${rng.prev.name}　${rng.prev.month}/${rng.prev.day} ${pad(rng.prev.hour)}:${pad(rng.prev.minute)}` : '—'}`,
        `　后：${rng?.next ? `${rng.next.name}　${rng.next.month}/${rng.next.day} ${pad(rng.next.hour)}:${pad(rng.next.minute)}` : '—'}`,
        todayJq ? `【今日交节】${todayJq.name} ${pad(todayJq.hour)}:${pad(todayJq.minute)}` : '',
        '',
        `【${mo}月节气】`,
        ...list.map(j => `　${j.name}　${j.month}/${j.day} ${pad(j.hour)}:${pad(j.minute)}`),
        '',
        '【数据覆盖】1900 - 2100 年（节气表与农历表均为内置打包数据，节气 201 年无缺失）',
      ].filter(l => l !== '');
      return {
        engineId: 'calendar', text: lines.join('\n'),
        data: {
          solar: `${y}-${mo}-${d} ${pad(h)}:${pad(mi)}`,
          lunar: lunar ? `${lunar.year}年${lunar.text}` : null,
          pillars: fp.pillars,
          jieqiRange: { from: rng?.prev?.name, to: rng?.next?.name },
          todayJieqi: todayJq?.name || null,
          monthJieqi: list.map(j => ({ name: j.name, at: `${j.month}/${j.day} ${pad(j.hour)}:${pad(j.minute)}` })),
        },
        chart: chartBazi({ pillars: fp.pillars }),
      };
    },
  },
];

/** 所有分类（保持定义顺序） */
export const CATS = [...new Set(MODULES.map(m => m.cat))];
