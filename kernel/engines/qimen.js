/**
 * 奇门遁甲引擎（时家奇门 · 转盘法）
 * ─────────────────────────────────────────────────────────
 * 定局：拆补法 —— 以当前节气查「三元歌」定上/中/下元局数，
 *       阴阳遁以冬至/夏至为界。不做超神接气置闰。
 * 排盘：地盘三奇六仪（洛书数序飞布）→ 旬首定值符值使
 *       → 天盘九星随时干（八宫环转）→ 八门随值使（八宫环转）
 *       → 八神值符起，阳顺阴逆（八宫环转）。
 *
 * 九宫约定（洛书）：       八宫环（后天八卦顺序）：
 *   4巽 9离 2坤           坎1 → 艮8 → 震3 → 巽4
 *   3震 5中 7兑            ↑                    ↓
 *   8艮 1坎 6乾           乾6 ← 兑7 ← 坤2 ← 离9
 *
 * 转盘法 vs 飞盘法：本盘全用转盘（星/门/神均沿八宫环旋转），
 *   与飞盘派（按洛书数序飞布）结果不同，属门派差异而非错误。
 * 中宫：仅存地盘干；天禽寄坤二宫，随天芮同行。
 */
import { fourPillars, currentJieqiRange, jiaziIndex, toLunar } from '../core/calendar.js';
import { JIAZI } from '../core/constants.js';

// ───────────────────────── 基础表 ─────────────────────────

export const PALACE = {
  1: { gua: '坎', dir: '北', wx: '水' },
  2: { gua: '坤', dir: '西南', wx: '土' },
  3: { gua: '震', dir: '东', wx: '木' },
  4: { gua: '巽', dir: '东南', wx: '木' },
  5: { gua: '中', dir: '中', wx: '土' },
  6: { gua: '乾', dir: '西北', wx: '金' },
  7: { gua: '兑', dir: '西', wx: '金' },
  8: { gua: '艮', dir: '东北', wx: '土' },
  9: { gua: '离', dir: '南', wx: '火' },
};

/** 洛书盘面位置（3×3），值 = 宫数 */
export const LUOSHU_GRID = [[4, 9, 2], [3, 5, 7], [8, 1, 6]];

/** 八宫环（后天八卦顺时针）：坎 → 艮 → 震 → 巽 → 离 → 坤 → 兑 → 乾 */
export const RING = [1, 8, 3, 4, 9, 2, 7, 6];
export const ringIdx = (g) => RING.indexOf(g);
export const ringAt = (i) => RING[((i % 8) + 8) % 8];
/** 寄宫：中宫寄坤二宫 */
export const jiGong = (g) => (g === 5 ? 2 : g);

export const JIU_XING = {
  1: { name: '天蓬', wx: '水', ji: '凶', note: '主盗贼、水险、大胆、智谋' },
  2: { name: '天芮', wx: '土', ji: '凶', note: '主疾病、师徒、迟滞、结实（天禽寄此）' },
  3: { name: '天冲', wx: '木', ji: '吉', note: '主勇猛、冲锋、征战、快捷' },
  4: { name: '天辅', wx: '木', ji: '吉', note: '主文教、辅佐、仁慈、学业' },
  5: { name: '天禽', wx: '土', ji: '吉', note: '主中正、尊贵、掌权（寄坤二宫）' },
  6: { name: '天心', wx: '金', ji: '吉', note: '主医药、谋略、领导、决策' },
  7: { name: '天柱', wx: '金', ji: '凶', note: '主口舌、破坏、阻隔、辩才' },
  8: { name: '天任', wx: '土', ji: '吉', note: '主稳重、田产、责任、厚德' },
  9: { name: '天英', wx: '火', ji: '平', note: '主光明、文明、虚华、急躁' },
};

export const BA_MEN = {
  1: { name: '休门', wx: '水', ji: '吉', note: '主休养、安宁、求财、和解' },
  8: { name: '生门', wx: '土', ji: '大吉', note: '主生发、财利、生机、置业' },
  3: { name: '伤门', wx: '木', ji: '凶', note: '主伤害、争斗、捕猎、索债' },
  4: { name: '杜门', wx: '木', ji: '平', note: '主阻塞、隐藏、逃避、技术' },
  9: { name: '景门', wx: '火', ji: '平', note: '主文书、信息、宣传、虚象' },
  2: { name: '死门', wx: '土', ji: '大凶', note: '主死亡、丧事、终结、刑戮' },
  7: { name: '惊门', wx: '金', ji: '凶', note: '主惊恐、口舌、官非、疑虑' },
  6: { name: '开门', wx: '金', ji: '大吉', note: '主开拓、官贵、事业、公开' },
};

export const BA_SHEN = ['值符', '腾蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];
export const BA_SHEN_NOTE = {
  值符: '诸神之首，主贵人、核心、主事者',
  腾蛇: '主虚惊、怪异、缠绕、变诈',
  太阴: '主阴私、暗中庇护、谋划、女性',
  六合: '主和合、中介、婚姻、交易',
  白虎: '主凶暴、道路、血光、威权',
  玄武: '主盗贼、暗昧、欺骗、暧昧',
  九地: '主隐藏、稳固、地产、屯守',
  九天: '主高远、显扬、远行、张扬',
};

/** 六仪三奇布宫顺序 */
export const YIQI_ORDER = ['戊', '己', '庚', '辛', '壬', '癸', '丁', '丙', '乙'];

/** 三元局数表：节气 → [上元, 中元, 下元]；yin=true 为阴遁 */
export const JU_TABLE = {
  冬至: { ju: [1, 7, 4], yin: false }, 小寒: { ju: [2, 8, 5], yin: false },
  大寒: { ju: [3, 9, 6], yin: false }, 立春: { ju: [8, 5, 2], yin: false },
  雨水: { ju: [9, 6, 3], yin: false }, 惊蛰: { ju: [1, 7, 4], yin: false },
  春分: { ju: [3, 9, 6], yin: false }, 清明: { ju: [4, 1, 7], yin: false },
  谷雨: { ju: [5, 2, 8], yin: false }, 立夏: { ju: [4, 1, 7], yin: false },
  小满: { ju: [5, 2, 8], yin: false }, 芒种: { ju: [6, 3, 9], yin: false },
  夏至: { ju: [9, 3, 6], yin: true }, 小暑: { ju: [8, 2, 5], yin: true },
  大暑: { ju: [7, 1, 4], yin: true }, 立秋: { ju: [2, 5, 8], yin: true },
  处暑: { ju: [1, 4, 7], yin: true }, 白露: { ju: [9, 3, 6], yin: true },
  秋分: { ju: [7, 1, 4], yin: true }, 寒露: { ju: [6, 9, 3], yin: true },
  霜降: { ju: [5, 8, 2], yin: true }, 立冬: { ju: [6, 9, 3], yin: true },
  小雪: { ju: [5, 8, 2], yin: true }, 大雪: { ju: [4, 7, 1], yin: true },
};

/** 旬首（六甲）→ 所遁之仪 */
const XUN_TO_YI = { 甲子: '戊', 甲戌: '己', 甲申: '庚', 甲午: '辛', 甲辰: '壬', 甲寅: '癸' };

const KE_WX = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };

/** 洛书数序（用于地盘飞布） */
const luoshuNext = (n, dir) => ((n - 1 + dir + 9) % 9) + 1;

// ───────────────────────── 定局 ─────────────────────────

/**
 * 由日干支求符头，定上中下元
 * 天干为甲/己之日为符头；符头支属子午卯酉=上元，寅申巳亥=中元，辰戌丑未=下元
 */
export function dingYuan(y, m, d) {
  let dy = y, dm = m, dd = d;
  for (let back = 0; back <= 9; back++) {
    const fp = fourPillars(dy, dm, dd);
    const g = fp.day[0];
    if (g === '甲' || g === '己') {
      const z = fp.day[1];
      const yuan = ['子', '午', '卯', '酉'].includes(z) ? 0
        : ['寅', '申', '巳', '亥'].includes(z) ? 1 : 2;
      return {
        futou: fp.day, back, yuan,
        yuanName: ['上元', '中元', '下元'][yuan],
        futouDate: `${dy}-${dm}-${dd}`,
      };
    }
    const prev = new Date(Date.UTC(dy, dm - 1, dd));
    prev.setUTCDate(prev.getUTCDate() - 1);
    dy = prev.getUTCFullYear(); dm = prev.getUTCMonth() + 1; dd = prev.getUTCDate();
  }
  return { futou: null, back: -1, yuan: 0, yuanName: '上元', futouDate: null };
}

/** 定局：节气 + 元 → 阴阳遁 + 局数 */
export function dingJu(y, m, d, h = 0, mi = 0) {
  const rng = currentJieqiRange(y, m, d, h, mi);
  const jq = rng && rng.prev ? rng.prev.name : '冬至';
  const row = JU_TABLE[jq] || JU_TABLE['冬至'];
  const yuanInfo = dingYuan(y, m, d);
  const ju = row.ju[yuanInfo.yuan];
  return {
    jieqi: jq, yin: row.yin, ju,
    yuan: yuanInfo.yuan, yuanName: yuanInfo.yuanName,
    futou: yuanInfo.futou, futouDate: yuanInfo.futouDate,
    dun: row.yin ? '阴遁' : '阳遁',
    dunName: `${row.yin ? '阴遁' : '阳遁'}第${ju}局`,
    prev: rng && rng.prev ? { name: rng.prev.name, month: rng.prev.month, day: rng.prev.day, hour: rng.prev.hour, minute: rng.prev.minute } : null,
    next: rng && rng.next ? { name: rng.next.name, month: rng.next.month, day: rng.next.day, hour: rng.next.hour, minute: rng.next.minute } : null,
  };
}

// ───────────────────────── 排盘 ─────────────────────────

/** 地盘三奇六仪（洛书数序飞布，含中宫） */
export function buDiPan(ju, yin) {
  const dir = yin ? -1 : 1;
  const gong = {}, yi = {};
  let cur = ju;
  for (const yq of YIQI_ORDER) {
    gong[cur] = yq; yi[yq] = cur;
    cur = luoshuNext(cur, dir);
  }
  return { gong, yi };
}

export function paipanQimen(input) {
  const { y, mo, d, h = 0, mi = 0 } = input;
  const notes = [];
  const juInfo = dingJu(y, mo, d, h, mi);
  const { yin, ju } = juInfo;
  const dir = yin ? -1 : 1;

  // ── 地盘 ──
  const dp = buDiPan(ju, yin);

  // ── 时柱 / 旬首 / 旬序 ──
  const fp = fourPillars(y, mo, d, h, mi);
  const hourGZ = fp.hour;
  const hIdx = jiaziIndex(hourGZ[0], hourGZ[1]);
  const xunStart = Math.floor(hIdx / 10) * 10;
  const xunShou = JIAZI[xunStart];
  const xunYi = XUN_TO_YI[xunShou];
  const xunYiGongRaw = dp.yi[xunYi];
  const xunYiGong = jiGong(xunYiGongRaw);
  const xunOrdinal = hIdx - xunStart;

  // ── 值符（星）/ 值使（门）──
  const zhiFuHome = xunYiGong;
  const zhiShiHome = xunYiGong;
  const zhiFuName = JIU_XING[zhiFuHome].name + (xunYiGongRaw === 5 ? '（寄坤）' : '');
  const zhiShiName = BA_MEN[zhiShiHome].name;

  // ── 天盘九星：值符随时干，沿八宫环旋转 ──
  // 注意：甲在奇门中「遁」于六仪，盘面不显；甲时即旬首时，
  // 其宫位回落到旬首仪之宫（天盘归位 → 伏吟），这是「甲子时天蓬伏吟」之由来。
  const hourYiChar = hourGZ[0];
  const hourYiGongRaw = hourYiChar === '甲' ? dp.yi[xunYi] : dp.yi[hourYiChar];
  if (hourYiGongRaw === undefined) throw new Error(`时干 ${hourYiChar} 未在地盘上找到落宫`);
  const zhiFuLand = jiGong(hourYiGongRaw);
  const shiftStar = ((ringIdx(zhiFuLand) - ringIdx(zhiFuHome)) % 8 + 8) % 8;
  const starOf = {};   // 天盘宫 → 星本宫（八宫内）
  for (const g of RING) starOf[g] = ringAt(ringIdx(g) - shiftStar);

  // 天盘干（随星走：天盘宫得「星本宫」的地盘干）
  const tianGanOf = {};
  for (const g of RING) tianGanOf[g] = dp.gong[starOf[g]];

  // ── 八门：值使起，沿八宫环整体旋转 ──
  const shiftMen = ((dir * xunOrdinal) % 8 + 8) % 8;
  const menHomeOf = {};  // 落宫 → 门本宫
  for (let k = 0; k < 8; k++) menHomeOf[ringAt(k + shiftMen)] = RING[k];
  const zhiShiLand = ringAt(ringIdx(zhiShiHome) + shiftMen);

  // ── 八神：值符起，阳顺阴逆，沿八宫环 ──
  const shenOf = {};
  for (let i = 0; i < 8; i++) shenOf[ringAt(ringIdx(zhiFuLand) + dir * i)] = BA_SHEN[i];

  // ── 组装盘面 ──
  const palaces = [];
  for (let g = 1; g <= 9; g++) {
    const isCenter = g === 5;
    const sg = isCenter ? null : starOf[g];
    const mh = isCenter ? null : menHomeOf[g];
    const starName = isCenter ? null : (sg === 2 ? '天芮·天禽' : JIU_XING[sg].name);
    palaces.push({
      gong: g, gua: PALACE[g].gua, dir: PALACE[g].dir, wx: PALACE[g].wx,
      diGan: dp.gong[g] || null,
      tianGan: isCenter ? null : tianGanOf[g],
      star: starName,
      starInfo: isCenter ? null : JIU_XING[sg],
      starHome: sg,
      men: isCenter ? null : BA_MEN[mh].name,
      menInfo: isCenter ? null : BA_MEN[mh],
      menHome: mh,
      shen: isCenter ? null : shenOf[g],
      isZhiFu: !isCenter && g === zhiFuLand,
      isZhiShi: !isCenter && g === zhiShiLand,
      isXunShou: g === xunYiGongRaw,
      isHourGan: g === hourYiGongRaw,
      isCenter,
    });
  }

  // ── 格局提示（结构化，非断语）──
  const geju = [];
  for (const p of palaces) {
    if (p.isCenter) continue;
    if (p.menInfo && p.gong !== 5) {
      if (KE_WX[p.menInfo.wx] === p.wx) geju.push(`${p.gua}${p.gong}宫：${p.men}门迫（门克宫，力受制）`);
      else if (KE_WX[p.wx] === p.menInfo.wx) geju.push(`${p.gua}${p.gong}宫：${p.men}受宫克（宫克门，力减）`);
    }
    const good = ['开门', '生门', '休门'].includes(p.men);
    const bad = ['死门', '惊门', '伤门'].includes(p.men);
    const goodShen = ['值符', '九天', '太阴', '六合'].includes(p.shen);
    const badShen = ['白虎', '玄武', '腾蛇'].includes(p.shen);
    if (good && goodShen) geju.push(`${p.gua}${p.gong}宫：${p.men}临${p.shen}（吉门吉神叠，用神有力）`);
    if (bad && badShen) geju.push(`${p.gua}${p.gong}宫：${p.men}临${p.shen}（凶门凶神叠，事多阻）`);
    if (p.star && ['天辅', '天心', '天任'].includes(p.star) && ['开门', '生门'].includes(p.men)) {
      geju.push(`${p.gua}${p.gong}宫：${p.star}+${p.men}（星门皆吉，宜举事）`);
    }
  }
  // 伏吟 / 反吟
  const fuYin = shiftStar === 0;
  const fanYin = shiftStar === 4;
  if (fuYin) geju.unshift('全局伏吟：天盘归位，主静、守、迟滞、旧事重提');
  if (fanYin) geju.unshift('全局反吟：天盘对冲，主动、反复、去而复返、多变动');
  if (xunOrdinal === 0) notes.push('时柱即旬首（甲时），值符值使同宫');

  notes.push('定局用「拆补法」（节气 + 符头三元），未做超神接气置闰');
  notes.push('全盘用转盘法（星/门/神沿八宫环旋转），与飞盘派结果不同');
  notes.push('中宫仅存地盘干；天禽寄坤二宫，随天芮同行');

  return {
    input, jieqi: juInfo, lunar: toLunar(y, mo, d),
    pillars: fp.pillars, hourGZ, hourYiChar, hourYiGongRaw,
    xunShou, xunYi, xunYiGong, xunYiGongRaw, xunOrdinal,
    zhiFu: { name: zhiFuName, home: zhiFuHome, land: zhiFuLand, homeGua: PALACE[zhiFuHome].gua, landGua: PALACE[zhiFuLand].gua },
    zhiShi: { name: zhiShiName, home: zhiShiHome, land: zhiShiLand, homeGua: PALACE[zhiShiHome].gua, landGua: PALACE[zhiShiLand].gua },
    diPan: dp.gong, tianPanYi: tianGanOf, starOf, menAt: menHomeOf, shenAt: shenOf,
    shiftStar, fuYin, fanYin,
    palaces, geju, notes,
  };
}

// ───────────────────────── 文本 ─────────────────────────

export function qimenToText(r) {
  const L = [];
  const g = r.input;
  const P = (n) => r.palaces.find(x => x.gong === n);
  L.push(`【时间】${g.y}年${g.mo}月${g.d}日 ${String(g.h).padStart(2, '0')}:${String(g.mi || 0).padStart(2, '0')}`);
  L.push(`【四柱】${r.pillars.join('　')}　（时柱 ${r.hourGZ}）`);
  L.push(`【节气】${r.jieqi.jieqi} · ${r.jieqi.yuanName}（符头 ${r.jieqi.futou || '—'}${r.jieqi.futouDate ? '　' + r.jieqi.futouDate : ''}）`);
  L.push(`【定局】${r.jieqi.dunName}`);
  L.push(`【旬首】${r.xunShou}（遁${r.xunYi}，落 ${PALACE[r.xunYiGongRaw].gua}${r.xunYiGongRaw}宫），时柱居旬第 ${r.xunOrdinal + 1} 位`);
  L.push(`【值符】${r.zhiFu.name}　${r.zhiFu.homeGua}宫 → ${r.zhiFu.landGua}宫（随时干）`);
  L.push(`【值使】${r.zhiShi.name}　${r.zhiShi.homeGua}宫 → ${r.zhiShi.landGua}宫（随时支）`);
  if (r.fuYin) L.push('【局格】伏吟局');
  if (r.fanYin) L.push('【局格】反吟局');
  L.push('');
  L.push('【九宫盘】（上南下北，左东右西）');
  for (const row of LUOSHU_GRID) {
    const cells = row.map(n => {
      const p = P(n);
      const tag = [p.isZhiFu ? '符' : '', p.isZhiShi ? '使' : '', p.isXunShou ? '旬' : '', p.isHourGan ? '时' : ''].filter(Boolean).join('');
      return `${p.gua}${n}${tag ? '[' + tag + ']' : ''}`.padEnd(11, ' ');
    });
    L.push('　' + cells.join('│'));
    L.push('　' + row.map(n => { const p = P(n); return `${p.shen || '　'} ${p.star || '　'}`.padEnd(11, ' '); }).join('│'));
    L.push('　' + row.map(n => { const p = P(n); return `${p.men || '　'}`.padEnd(11, ' '); }).join('│'));
    L.push('　' + row.map(n => { const p = P(n); return `${p.diGan || '　'}/${p.tianGan || '　'}`.padEnd(11, ' '); }).join('│') + '  （地盘干/天盘干）');
    L.push('');
  }
  L.push('【逐宫】');
  for (const p of r.palaces) {
    if (p.isCenter) { L.push(`　中5宫｜地盘干 ${p.diGan || '—'}（无门无神，天禽寄坤二）`); continue; }
    L.push(`　${p.gua}${p.gong}宫(${p.dir})｜神 ${p.shen}｜星 ${p.star}｜门 ${p.men}｜干 ${p.diGan || '—'}/${p.tianGan || '—'}`);
  }
  if (r.geju.length) {
    L.push(''); L.push('【格局提示】');
    for (const x of r.geju) L.push(`　· ${x}`);
  }
  L.push(''); L.push('【说明】');
  for (const n of r.notes) L.push(`　· ${n}`);
  return L.join('\n');
}
