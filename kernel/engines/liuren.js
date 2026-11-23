/**
 * 大六壬引擎 —— 月将加时 · 四课三传 · 十二天将
 * ─────────────────────────────────────────────────────────
 * 流程：中气定月将 → 月将加时布天盘 → 日干寄宫起四课
 *      → 九宗门取三传 → 贵人起十二天将 → 旬空
 *
 * 九宗门实现情况：
 *   已实现：贼克（下贼上 / 上克下）、比用、涉害（计克深浅）、
 *          遥克（蒿矢 / 弹射）、昴星、别责、八专、伏吟、返吟
 *   说明：涉害取「克之深浅」，本盘按「自本家顺行至现位所遇之克」
 *         计数，遇等则退取比者；个别流派另有「孟仲季」次序，
 *         结果可能不同。
 *
 * 十二将顺逆：贵人临亥子丑寅卯辰 → 顺布；临巳午未申酉戌 → 逆布。
 * 昼夜贵：卯～申时用昼贵，酉～寅时用夜贵。
 */
import { fourPillars, currentJieqiRange, toLunar } from '../core/calendar.js';
import { GAN, ZHI, ZHI_WX, GAN_WX, GAN_YINYANG, ZHI_YINYANG, KE, SHENG, TIAN_JIANG, xunKong } from '../core/constants.js';

// ───────────────────────── 基础表 ─────────────────────────

/** 十二将（贵人起，顺序固定） */
export const JIANG = TIAN_JIANG;
export const JIANG_NOTE = {
  贵人: '主贵人、尊长、官爵、和合、恩泽',
  腾蛇: '主虚惊、怪异、缠绕、火烛',
  朱雀: '主文书、口舌、书信、飞禽',
  六合: '主和合、婚姻、交易、中介',
  勾陈: '主田土、争斗、勾连、迟滞',
  青龙: '主财帛、喜庆、酒色、富贵',
  天空: '主虚诈、欺骗、空亡、僧道',
  白虎: '主道路、刀兵、疾病、凶丧',
  太常: '主衣食、文书、印信、宴会',
  玄武: '主盗贼、暗昧、逃亡、暧昧',
  太阴: '主阴私、暗中、妇女、密谋',
  天后: '主妇女、婚姻、后宫、恩宠',
};

/** 月将（太阳过宫）：以中气换将 */
export const YUE_JIANG = {
  大寒: '子', 雨水: '亥', 春分: '戌', 谷雨: '酉', 小满: '申', 夏至: '未',
  大暑: '午', 处暑: '巳', 秋分: '辰', 霜降: '卯', 小雪: '寅', 冬至: '丑',
};
const JIANG_NAME = {
  子: '神后', 丑: '大吉', 寅: '功曹', 卯: '太冲', 辰: '天罡', 巳: '太乙',
  午: '胜光', 未: '小吉', 申: '传送', 酉: '从魁', 戌: '河魁', 亥: '登明',
};

/** 十二将之「本家」宫（用于涉害计与天将布） */
export const 日干寄宫 = { 甲: '寅', 乙: '辰', 丙: '巳', 丁: '未', 戊: '巳', 己: '未', 庚: '申', 辛: '戌', 壬: '亥', 癸: '丑' };

/** 昼夜贵人：日干 → [昼贵, 夜贵] */
export const GUI_REN = {
  甲: ['丑', '未'], 戊: ['丑', '未'], 庚: ['丑', '未'],
  乙: ['子', '申'], 己: ['子', '申'],
  丙: ['亥', '酉'], 丁: ['亥', '酉'],
  辛: ['午', '寅'],
  壬: ['卯', '巳'], 癸: ['卯', '巳'],
};

/** 地支三合之冲（驿马）：用于返吟 */
const YI_MA = { 申: '寅', 子: '寅', 辰: '寅', 寅: '申', 午: '申', 戌: '申', 巳: '亥', 酉: '亥', 丑: '亥', 亥: '巳', 卯: '巳', 未: '巳' };

const zi = (z) => ZHI.indexOf(z);
const mod12 = (n) => ((n % 12) + 12) % 12;
const sheng = (a, b) => SHENG[a] === b;      // a 生 b
const ke = (a, b) => KE[a] === b;            // a 克 b

// ───────────────────────── 排盘 ─────────────────────────

/** 中气定位月将 */
export function dingYueJiang(y, m, d, h = 0, mi = 0) {
  const rng = currentJieqiRange(y, m, d, h, mi);
  let jq = rng && rng.prev ? rng.prev.name : '冬至';
  // 若当前节气不是中气，回退到最近的中气
  const ZHONG_QI = Object.keys(YUE_JIANG);
  if (!ZHONG_QI.includes(jq)) {
    // 用节气索引向前找最近的中气
    const ALL = ['小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至',
      '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'];
    let i = ALL.indexOf(jq);
    for (let k = 1; k <= 24; k++) {
      const cand = ALL[((i - k) % 24 + 24) % 24];
      if (ZHONG_QI.includes(cand)) { jq = cand; break; }
    }
  }
  const jiangZhi = YUE_JIANG[jq] || '丑';
  return { zhongQi: jq, jiangZhi, jiangName: JIANG_NAME[jiangZhi] };
}

export function paipanLiuren(input) {
  const { y, mo, d, h = 0, mi = 0, question = '' } = input;
  const notes = [];

  const fp = fourPillars(y, mo, d, h, mi);
  const [dayGan, dayZhi] = [fp.day[0], fp.day[1]];
  const hourZhi = fp.hour[1];
  const yj = dingYueJiang(y, mo, d, h, mi);

  const shiIdx = zi(hourZhi);
  const jiangIdx = zi(yj.jiangZhi);

  // ── 天盘：月将加时 ──
  // 地盘宫 i（支 i）上承天盘支 ZHI[(jiangIdx + i - shiIdx) mod 12]
  const tianPan = new Array(12);   // tianPan[i] = 天盘支 index
  for (let i = 0; i < 12; i++) tianPan[i] = mod12(jiangIdx + i - shiIdx);
  const ganPan = (zhiIdx) => tianPan[mod12(zhiIdx)];   // 某地盘支上的天盘支
  const zhiOn = (zhi) => ganPan(zi(zhi));              // 简写

  // ── 四课 ──
  const jiGong = 日干寄宫[dayGan];
  const k1Down = zi(jiGong), k1Up = tianPan[k1Down];
  const k2Down = k1Up, k2Up = tianPan[k2Down];
  const k3Down = zi(dayZhi), k3Up = tianPan[k3Down];
  const k4Down = k3Up, k4Up = tianPan[k4Down];
  const siKe = [
    { no: 1, down: k1Down, up: k1Up, label: `干上（日干${dayGan}寄${jiGong}）` },
    { no: 2, down: k2Down, up: k2Up, label: '干阴' },
    { no: 3, down: k3Down, up: k3Up, label: `支上（日支${dayZhi}）` },
    { no: 4, down: k4Down, up: k4Up, label: '支阴' },
  ].map(k => ({
    ...k,
    downZhi: ZHI[k.down], upZhi: ZHI[k.up],
    downWx: ZHI_WX[k.down], upWx: ZHI_WX[k.up],
    rel: (() => {
      if (ke(ZHI_WX[k.down], ZHI_WX[k.up])) return '下贼上';
      if (ke(ZHI_WX[k.up], ZHI_WX[k.down])) return '上克下';
      if (sheng(ZHI_WX[k.down], ZHI_WX[k.up])) return '下生上';
      if (sheng(ZHI_WX[k.up], ZHI_WX[k.down])) return '上生下';
      return '比和';
    })(),
  }));

  // ── 三传（九宗门）──
  const dayYang = GAN_YINYANG[GAN.indexOf(dayGan)] === 1;
  const t = { keTi: '', lu: '', faYong: '', chuan: [], notes: [] };
  const next2 = (z) => tianPan[z];
  const mk = (chu, reason) => {
    const c0 = chu, c1 = next2(c0), c2 = next2(c1);
    return { chu: c0, zhong: c1, mo: c2, reason };
  };

  const xiaZei = siKe.filter(k => k.rel === '下贼上');
  const shangKe = siKe.filter(k => k.rel === '上克下');
  const allBis = (arr) => arr.filter(k => ZHI_YINYANG[k.up] === GAN_YINYANG[GAN.indexOf(dayGan)]);

  // 涉害：上神自「本家」（同为该支的地盘宫）顺行至其所乘地盘宫，途中遇克计数
  const sheHaiCount = (k) => {
    const upWx = ZHI_WX[k.up];
    let cnt = 0, pos = k.up;
    for (let step = 1; step <= 12; step++) {
      pos = mod12(pos + 1);
      const diWx = ZHI_WX[pos];
      if (ke(diWx, upWx) || ke(upWx, diWx)) cnt++;
      if (pos === k.down) break;
    }
    return cnt;
  };

  if (xiuWei(yj.jiangZhi, hourZhi)) {
    // 伏吟
    t.keTi = '伏吟课';
    let chu;
    if (dayYang) chu = k1Up; else chu = k3Up;
    let c1 = xingOf(chu), c2 = xingOf(c1);
    if (c1 === chu) c1 = mod12(chu + 6);        // 自刑取冲
    if (c2 === c1) c2 = mod12(c1 + 6);
    t.lu = dayYang ? '干上发用' : '支上发用';
    t.faYong = '阳日取干上神，阴日取支上神；中末递取其刑，自刑者取冲';
    t.chuan = { chu, zhong: c1, mo: c2, reason: t.faYong };
  } else if (fanYin(yj.jiangZhi, hourZhi)) {
    // 返吟
    t.keTi = '返吟课';
    if (xiaZei.length || shangKe.length) {
      const pool = xiaZei.length ? xiaZei : shangKe;
      const chu = pool[0].up;
      t.faYong = xiaZei.length ? '返吟有克，取下贼上' : '返吟有克，取上克下';
      t.lu = xiaZei.length ? '贼' : '克';
      t.chuan = mk(chu, t.faYong);
    } else {
      const chu = zi(YI_MA[dayZhi]);            // 井栏射：驿马发用
      t.lu = '井栏射（无克）';
      t.faYong = '返吟无克，取日支驿马发用，中传支上神，末传干上神';
      t.chuan = { chu, zhong: k3Up, mo: k1Up, reason: t.faYong };
    }
  } else if (zi(jiGong) === zi(dayZhi)) {
    // 八专
    t.keTi = '八专课';
    let chu;
    if (dayYang) chu = tianPan[mod12(zi(jiGong) + 2)];   // 干上神顺数三神
    else chu = tianPan[mod12(k4Down - 2)];               // 第四课逆数三神
    t.lu = dayYang ? '阳日顺数' : '阴日逆数';
    t.faYong = '八专课：阳日干上神顺数三位，阴日第四课上神逆数三位；中末皆取干上神';
    t.chuan = { chu, zhong: k1Up, mo: k1Up, reason: t.faYong };
  } else if (xiaZei.length === 1) {
    t.keTi = '贼克课（重审）'; t.lu = '下贼上';
    t.faYong = '四课唯一下贼上者发用；中末递取天盘上神';
    t.chuan = mk(xiaZei[0].up, t.faYong);
  } else if (shangKe.length === 1 && !xiaZei.length) {
    t.keTi = '贼克课（元首）'; t.lu = '上克下';
    t.faYong = '四课无下贼上，唯一上克下发用；中末递取天盘上神';
    t.chuan = mk(shangKe[0].up, t.faYong);
  } else if (xiaZei.length > 1 || shangKe.length > 1) {
    const pool = xiaZei.length ? xiaZei : shangKe;
    const bis = allBis(pool);
    if (bis.length === 1) {
      t.keTi = '比用课'; t.lu = xiaZei.length ? '下贼上·比用' : '上克下·比用';
      t.faYong = '涉害有克者多，取与日干比（同阴阳）者发用';
      t.chuan = mk(bis[0].up, t.faYong);
    } else {
      // 涉害：计克深浅
      const cands = bis.length ? bis : pool;
      const scored = cands.map(k => ({ k, depth: sheHaiCount(k) }));
      scored.sort((a, b) => b.depth - a.depth);
      t.keTi = '涉害课'; t.lu = (xiaZei.length ? '下贼上' : '上克下') + '·涉害';
      t.faYong = `比用不能决，取涉害深者发用（各候选计克：${scored.map(s => `${ZHI[s.k.up]}${s.depth}重`).join('、')}）`;
      t.chuan = mk(scored[0].k.up, t.faYong);
    }
  } else {
    // 四课无克 → 遥克
    const yaoShang = siKe.filter(k => ke(ZHI_WX[k.up], GAN_WX[GAN.indexOf(dayGan)]));   // 上神克日干（蒿矢）
    const yaoGan = siKe.filter(k => ke(GAN_WX[GAN.indexOf(dayGan)], ZHI_WX[k.up]));     // 日干克上神（弹射）
    if (yaoShang.length || yaoGan.length) {
      const pool = yaoShang.length ? yaoShang : yaoGan;
      const bis = allBis(pool);
      const use = bis.length ? bis[0] : pool[0];
      t.keTi = '遥克课'; t.lu = yaoShang.length ? '蒿矢（上克日）' : '弹射（日克上）';
      t.faYong = '四课无克，取遥克日干者发用（蒿矢优先于弹射）';
      t.chuan = mk(use.up, t.faYong);
    } else {
      // 昴星 / 别责
      const ups = siKe.map(k => k.up);
      const dup = ups.length !== new Set(ups).size;
      if (dup) {
        t.keTi = '别责课';
        let chu;
        if (dayYang) {
          const ganHe = { 甲: '己', 己: '甲', 乙: '庚', 庚: '乙', 丙: '辛', 辛: '丙', 丁: '壬', 壬: '丁', 戊: '癸', 癸: '戊' }[dayGan];
          chu = tianPan[zi(日干寄宫[ganHe])];
        } else {
          chu = tianPan[mod12(zi(dayZhi) + 2)];
        }
        t.lu = dayYang ? '阳日干合上神' : '阴日支前三位';
        t.faYong = '别责课：阳日取干合神之上神，阴日取日支三合前位之上神；中末皆用干上神';
        t.chuan = { chu, zhong: k1Up, mo: k1Up, reason: t.faYong };
      } else {
        t.keTi = '昴星课';
        let chu;
        if (dayYang) chu = tianPan[zi('酉')];                        // 虎视转蓬
        else { const p = tianPan.findIndex(v => v === zi('酉')); chu = p; }  // 冬蛇掩目
        t.lu = dayYang ? '虎视转蓬（阳日）' : '冬蛇掩目（阴日）';
        t.faYong = dayYang
          ? '昴星课阳日：取地盘酉上神发用，中传支上神，末传干上神'
          : '昴星课阴日：取天盘酉所临地盘支发用，中传干上神，末传支上神';
        t.chuan = dayYang
          ? { chu, zhong: k3Up, mo: k1Up, reason: t.faYong }
          : { chu, zhong: k1Up, mo: k3Up, reason: t.faYong };
      }
    }
  }

  // ── 十二天将 ──
  const [guiDay, guiNight] = GUI_REN[dayGan];
  const isDay = h >= 6 && h < 18;              // 卯～申时用昼贵（简化为 6-18 时）
  const guiZhi = isDay ? guiDay : guiNight;
  const guiPos = tianPan.findIndex(v => v === zi(guiZhi));   // 贵人所临地盘宫
  const forward = ['亥', '子', '丑', '寅', '卯', '辰'].includes(ZHI[guiPos]);
  const jiangOfZhi = new Array(12);
  for (let i = 0; i < 12; i++) {
    const d = mod12(i - zi(guiZhi));
    jiangOfZhi[i] = JIANG[mod12(forward ? d : -d)];
  }
  if (guiPos < 0) notes.push('贵人落宫异常（天盘未含贵人支）');

  // ── 旬空 ──
  const [k1, k2] = xunKong(dayGan, dayZhi);

  // ── 三传附信息 ──
  const chuanInfo = ['chu', 'zhong', 'mo'].map((key, i) => {
    const z = t.chuan[key];
    const wx = ZHI_WX[z];
    const dayWx = GAN_WX[GAN.indexOf(dayGan)];
    const rel = ke(wx, dayWx) ? '克我' : ke(dayWx, wx) ? '我克'
      : sheng(wx, dayWx) ? '生我' : sheng(dayWx, wx) ? '我生' : '同类';
    return {
      name: ['初传', '中传', '末传'][i], zhi: ZHI[z], wx,
      jiang: jiangOfZhi[z], 六亲: rel,
      kong: [k1, k2].includes(ZHI[z]),
      shengXiao: null,
    };
  });

  const fuYin = xiuWei(yj.jiangZhi, hourZhi);
  const fanYinFlag = fanYin(yj.jiangZhi, hourZhi);

  notes.push('昼夜贵：卯～申时用昼贵，酉～寅时用夜贵（本盘按 6:00-18:00 划分）');
  notes.push('涉害深浅按「自本家顺行遇克计重」，与「孟仲季」派结果或有差异');
  if (!t.chuan || t.chuan.chu === undefined) notes.push('三传取值异常，请核对输入');

  return {
    input, question, lunar: toLunar(y, mo, d), pillars: fp.pillars,
    dayGan, dayZhi, hourZhi, jiGong,
    yueJiang: yj, shiZhi: hourZhi,
    diPan: Array.from({ length: 12 }, (_, i) => ZHI[i]),
    tianPan: tianPan.map(i => ZHI[i]),
    ganPanMap: Object.fromEntries(ZHI.map((z, i) => [z, ZHI[tianPan[i]]])),
    siKe, sanChuan: chuanInfo, sanChuanRaw: t.chuan,
    keTi: t.keTi, faYong: t.faYong, lu: t.lu,
    jiangOfZhi: jiangOfZhi.map(i => i),
    guiRen: { zhi: guiZhi, night: !isDay, pos: guiPos, forward },
    kongWang: [k1, k2],
    fuYin, fanYin: fanYinFlag,
    notes,
  };
}

// ───────────────────────── 辅助 ─────────────────────────

function xiuWei(jiangZhi, hourZhi) { return jiangZhi === hourZhi; }
function fanYin(jiangZhi, hourZhi) { return zi(jiangZhi) === mod12(zi(hourZhi) + 6); }
/** 三刑：用于伏吟中末传 */
const XING_MAP = {
  子: '卯', 卯: '子', 寅: '巳', 巳: '申', 申: '寅',
  丑: '戌', 戌: '未', 未: '丑', 辰: '辰', 午: '午', 酉: '酉', 亥: '亥',
};
const xingOf = (zIdx) => zi(XING_MAP[ZHI[zIdx]] || ZHI[zIdx]);

// ───────────────────────── 文本 ─────────────────────────

export function liurenToText(r) {
  const L = [];
  const g = r.input;
  L.push(`【时间】${g.y}年${g.mo}月${g.d}日 ${String(g.h).padStart(2, '0')}:${String(g.mi || 0).padStart(2, '0')}　时支${r.hourZhi}`);
  if (r.question) L.push(`【所问】${r.question}`);
  L.push(`【四柱】${r.pillars.join('　')}`);
  L.push(`【月将】${r.yueJiang.zhongQi}后 · ${r.yueJiang.jiangName}（${r.yueJiang.jiangZhi}）加 ${r.shiZhi}时`);
  L.push(`【日干寄宫】${r.dayGan}寄${r.jiGong}　【旬空】${r.kongWang.join('、')}`);
  if (r.fuYin) L.push('【局格】伏吟（月将＝时支，天地盘重合）');
  if (r.fanYin) L.push('【局格】返吟（月将冲时支，天地盘全冲）');
  L.push('');
  L.push('【十二宫天地盘】（地盘支 → 天盘神／天将）');
  for (let i = 0; i < 12; i++) {
    const tz = r.tianPan[i];
    L.push(`　${ZHI[i]}宫 → ${tz}　${r.jiangOfZhi[zi(tz)]}`);
  }
  L.push('');
  L.push('【四课】（上神 / 下神）');
  for (const k of r.siKe) {
    L.push(`　第${k.no}课　上神 ${k.upZhi}（天将 ${r.jiangOfZhi[k.up]}） / 下神 ${k.downZhi}　〔${k.label}〕　${k.downWx}与${k.upWx} → ${k.rel}`);
  }
  L.push('');
  L.push(`【课体】${r.keTi}　${r.lu ? '· ' + r.lu : ''}`);
  L.push(`【发用】${r.faYong}`);
  L.push('【三传】');
  for (const c of r.sanChuan) {
    L.push(`　${c.name}：${c.zhi}（${c.wx}）　天将 ${c.jiang}　六亲 ${c.六亲}${c.kong ? '　※旬空' : ''}`);
  }
  L.push('');
  L.push(`【贵人】${r.guiRen.zhi}（${r.guiRen.night ? '夜贵' : '昼贵'}），临地盘${ZHI[r.guiRen.pos]}宫 → ${r.guiRen.forward ? '顺布' : '逆布'}十二将`);
  L.push('');
  L.push('【说明】');
  for (const n of r.notes) L.push(`　· ${n}`);
  return L.join('\n');
}
