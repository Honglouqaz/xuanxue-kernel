/**
 * 六爻纳甲引擎
 * 起卦（铜钱 / 时间 / 手动）→ 装卦（纳甲·六亲·世应·六神）→ 变卦 → 断卦要素
 */
import { zhuangGua, flipBit, guaFromBits, guaPalace, liuQin, LIUQIN_MEANING, YONGSHEN_RULE } from '../core/bagua.js';
import { fourPillars, toLunar } from '../core/calendar.js';
import { GAN, ZHI, xunKong, nayin, ZHI_WX, CANG_GAN, LIU_CHONG, LIU_HE, GAN_WX } from '../core/constants.js';

/** 摇一爻：三枚铜钱（背=3 阳，字=2 阴） */
function tossYao(rnd) {
  let sum = 0;
  for (let i = 0; i < 3; i++) sum += (rnd() < 0.5 ? 2 : 3);
  const map = {
    6: { value: 6, yang: false, change: true, name: '老阴', mark: '×' },
    7: { value: 7, yang: true, change: false, name: '少阳', mark: '' },
    8: { value: 8, yang: false, change: false, name: '少阴', mark: '' },
    9: { value: 9, yang: true, change: true, name: '老阳', mark: '○' },
  };
  return map[sum];
}

/** 默认随机源（可注入以获得可复现结果） */
function defaultRnd() { return Math.random(); }

/**
 * 起卦
 * @param {object} opt
 *   mode: 'coin' 摇钱 / 'time' 时间起卦 / 'manual' 手动
 *   bits: 手动模式下的六爻数组（初→上，1 阳 0 阴）
 *   changes: 手动模式下的变爻位置数组（0-5）
 *   date: { y, mo, d, h, mi }
 *   question: 所问之事
 */
export function qiGua(opt = {}) {
  const mode = opt.mode || 'coin';
  const rand = opt.rnd || defaultRnd;
  const now = opt.date || nowParts();

  let bits, changes = [], tosses = null;

  if (mode === 'manual' && Array.isArray(opt.bits)) {
    bits = [...opt.bits];
    changes = Array.isArray(opt.changes) ? [...opt.changes] : [];
  } else if (mode === 'time') {
    // 时间起卦：上卦 = (年支序+月+日) % 8；下卦 = (年支序+月+日+时支序) % 8
    const yz = ZHI.indexOf(fourPillars(now.y, now.mo, now.d, now.h, now.mi).year[1]);
    const hz = Math.floor(((now.h + 1) % 24) / 2);
    const lunar = toLunar(now.y, now.mo, now.d);
    const lm = lunar ? lunar.month : now.mo;
    const ld = lunar ? lunar.day : now.d;
    const up = ((yz + lm + ld - 1) % 8 + 8) % 8;
    const lo = ((yz + lm + ld + hz - 1) % 8 + 8) % 8;
    bits = bitsFromTrigrams(up, lo);
    const mv = ((yz + lm + ld + hz - 1) % 6 + 6) % 6;
    changes = [mv];
  } else {
    tosses = [];
    bits = [];
    for (let i = 0; i < 6; i++) {
      const t = tossYao(rand);
      tosses.push(t);
      bits.push(t.yang ? 1 : 0);
      if (t.change) changes.push(i);
    }
  }

  // ── 装卦 ──
  const fp = fourPillars(now.y, now.mo, now.d, now.h, now.mi);
  const dayGan = fp.day[0], dayZhi = fp.day[1];
  const monthZhi = fp.month[1];

  const ben = zhuangGua(bits, dayGan);
  let bian = null, bianDetail = null;
  if (changes.length) {
    let bbits = [...bits];
    changes.forEach(i => { bbits = flipBit(bbits, i); });
    bianDetail = zhuangGua(bbits, dayGan);
    bian = bianDetail.name;
  }

  // 变卦六亲标注（以本卦宫五行为「我」，通行做法）
  if (bianDetail) {
    bianDetail.yao.forEach(y => {
      y.liuQinByBen = liuQin(ben.palaceWx, y.zhiWx);
    });
  }

  const kong = xunKong(dayGan, dayZhi);

  return {
    question: opt.question || '',
    mode,
    time: now,
    lunar: toLunar(now.y, now.mo, now.d),
    ganzhi: { year: fp.year, month: fp.month, day: fp.day, hour: fp.hour },
    dayGan, dayZhi, monthZhi,
    dayWx: ZHI_WX[ZHI.indexOf(dayZhi)],
    monthWx: ZHI_WX[ZHI.indexOf(monthZhi)],
    xunKong: kong,
    tosses,
    ben, bian, bianDetail, changes,
    // 旺衰：各爻相对日月建
    yaoState: ben.yao.map(y => yaoStrength(y, monthZhi, dayZhi)),
    yongShenRule: YONGSHEN_RULE,
  };
}

/** 由两个卦索引（0-7 先天序 乾兑离震巽坎艮坤）取六爻 */
const XIANTIAN_BITS = [
  [1, 1, 1], [1, 1, 0], [1, 0, 1], [1, 0, 0],
  [0, 1, 1], [0, 1, 0], [0, 0, 1], [0, 0, 0],
];
function bitsFromTrigrams(upIdx, loIdx) {
  return [...XIANTIAN_BITS[loIdx], ...XIANTIAN_BITS[upIdx]];
}

/** 爻的旺衰 */
function yaoStrength(yao, monthZhi, dayZhi) {
  const z = yao.zhi;
  const tags = [];
  if (z === monthZhi) tags.push('月建（当令，极旺）');
  if (z === dayZhi) tags.push('日建（得助）');
  if (LIU_CHONG[z] === monthZhi) tags.push('月破（极弱）');
  if (LIU_CHONG[z] === dayZhi) tags.push('日破（弱）');
  if (LIU_HE[z] === monthZhi) tags.push('月合（合住，力减）');
  if (LIU_HE[z] === dayZhi) tags.push('日合（合住，力减）');
  const mwx = ZHI_WX[ZHI.indexOf(monthZhi)];
  const ywx = yao.zhiWx;
  if (!tags.length) {
    if (mwx === ywx) tags.push('临月令之五行（得气）');
    else tags.push('休囚（无特殊助力）');
  }
  return tags;
}

/** 当前时间 */
function nowParts(d = new Date()) {
  return { y: d.getFullYear(), mo: d.getMonth() + 1, d: d.getDate(), h: d.getHours(), mi: d.getMinutes() };
}

/** 卦象文本图（自上而下 6 行） */
export function guaText(g) {
  return g.yao.slice().reverse().map(y =>
    (y.yang ? '███████' : '███ ███') + '  ' +
    `${y.shen} ${y.liuQin}${y.gz}${y.shi ? ' 【世】' : ''}${y.ying ? ' 【应】' : ''}`
  ).join('\n');
}

/** 输出结构化文本（供 AI 解读） */
export function liuyaoToText(r) {
  const L = [];
  L.push(`【所问】${r.question || '（未填写）'}`);
  L.push(`【时间】${r.time.y}年${r.time.mo}月${r.time.d}日 ${r.time.h}:${String(r.time.mi).padStart(2, '0')}`);
  if (r.lunar) L.push(`【农历】${r.lunar.year}年${r.lunar.text}`);
  L.push(`【四柱】${r.ganzhi.year} ${r.ganzhi.month} ${r.ganzhi.day} ${r.ganzhi.hour}`);
  L.push(`【日建】${r.dayGan}${r.dayZhi}（${r.dayWx}）　【月建】${r.monthZhi}　【旬空】${r.xunKong.join('、')}`);
  L.push('');
  L.push(`【本卦】${r.ben.name}　${r.ben.palace}（${r.ben.palaceWx}）　${r.ben.type}`);
  L.push('　' + guaText(r.ben).split('\n').join('\n　'));
  if (r.bian) {
    L.push('');
    L.push(`【变卦】${r.bian}　${r.bianDetail.palace}（${r.bianDetail.palaceWx}）`);
    L.push('　' + guaText(r.bianDetail).split('\n').join('\n　'));
    L.push(`【动爻】第 ${r.changes.map(i => i + 1).join('、')} 爻`);
  } else {
    L.push('【静卦】无动爻');
  }
  L.push('');
  L.push('【爻位旺衰】');
  r.ben.yao.forEach((y, i) => {
    L.push(`　${y.posName} ${y.gz}（${y.zhiWx}）${y.liuQin}：${r.yaoState[i].join('；')}`);
  });
  L.push('');
  L.push('【六亲义象】' + Object.entries(LIUQIN_MEANING).map(([k, v]) => `${k}=${v}`).join('　'));
  return L.join('\n');
}
