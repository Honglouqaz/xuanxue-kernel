/**
 * 太乙神数引擎（上古三式之三）
 * ─────────────────────────────────────────────────────────
 * 太乙九宫（与后天洛书九宫不同）：
 *      巽九  离二  坤七
 *      震四  中五  兑六
 *      艮三  坎八  乾一
 *
 * 太乙行宫：一乾 → 二离 → 三艮 → 四震 →（五中不入）→ 六兑 → 七坤 → 八坎 → 九巽
 *          每宫三年，游八宫共二十四年为一小周。
 *
 * ⚠️ 重要声明（必读）：
 *   太乙排盘需「太乙积年」为基数，而积年之起算各本不一（有自太乙上元甲子
 *   起者、有另立纪元者），且「积年基数」差 1 即致入宫整体错位。本模块
 *   把积年基数**显式暴露为参数**，默认值 10153917 取自一种通行算法，
 *   **未经逐本校验**。因此：
 *     · 行宫顺序、周期、十六神布局、主客算框架 —— 有共识，可信
 *     · 由公元年推出的具体入宫 —— 依基数而定，仅供参照
 *   如需严谨，请直接传入 `gongIndex`（0-7）绕开积年。
 */

/** 太乙九宫：宫号 → 卦、方位、五行、阴阳 */
export const TAIYI_GONG = {
  1: { gua: '乾', dir: '西北', wx: '金', yang: true,  note: '阳气最盛，主君位、正治' },
  2: { gua: '离', dir: '南',   wx: '火', yang: true,  note: '主文明、显达' },
  3: { gua: '艮', dir: '东北', wx: '土', yang: true,  note: '主止、蓄积' },
  4: { gua: '震', dir: '东',   wx: '木', yang: true,  note: '主动、起兵、变革' },
  5: { gua: '中', dir: '中',   wx: '土', yang: null,  note: '太乙不入中宫，为「宫中之虚」' },
  6: { gua: '兑', dir: '西',   wx: '金', yang: false, note: '主说、刑杀' },
  7: { gua: '坤', dir: '西南', wx: '土', yang: false, note: '主臣位、后宫' },
  8: { gua: '坎', dir: '北',   wx: '水', yang: false, note: '主险、隐藏' },
  9: { gua: '巽', dir: '东南', wx: '木', yang: false, note: '主文、入、伏' },
};

/** 太乙行宫顺序（不含中宫） */
export const XING_GONG_ORDER = [1, 2, 3, 4, 6, 7, 8, 9];
/** 二十年一小周：8 宫 × 3 年 = 24 年 */
export const YI_GONG_YEARS = 3;
export const XIAO_ZHOU = XING_GONG_ORDER.length * YI_GONG_YEARS;   // 24

/** 太乙十六神（自地主起，分布于十二支与四维） */
export const SHI_LIU_SHEN = [
  { name: '地主', dir: '子', wang: '主田土、根基' },
  { name: '阳德', dir: '丑', wang: '主恩泽、德政' },
  { name: '和德', dir: '艮', wang: '主和合、安泰' },
  { name: '吕申', dir: '寅', wang: '主刑法、申令' },
  { name: '高丛', dir: '卯', wang: '主高显、登临' },
  { name: '太阳', dir: '辰', wang: '主光明、显赫' },
  { name: '太炅', dir: '巽', wang: '主炎热、火德' },
  { name: '大神', dir: '巳', wang: '主尊崇、威灵' },
  { name: '大威', dir: '午', wang: '主兵威、刑杀' },
  { name: '天道', dir: '未', wang: '主天道、公正' },
  { name: '大武', dir: '坤', wang: '主武备、征伐' },
  { name: '武德', dir: '申', wang: '主武而有德' },
  { name: '太簇', dir: '酉', wang: '主律令、秋收' },
  { name: '阴主', dir: '戌', wang: '主阴私、内主' },
  { name: '阴德', dir: '乾', wang: '主暗中之德' },
  { name: '大义', dir: '亥', wang: '主大义、决断' },
];

/** 格局要义（供 AI 解读调用） */
export const TAIYI_GEJU = [
  { name: '太乙在阳宫', text: '主正治、君明臣贤，宜守正、宜进取，事多顺。' },
  { name: '太乙在阴宫', text: '主臣强君弱或内耗，宜收敛、宜防小人，事多阻。' },
  { name: '主客算', text: '主算长则主胜，客算长则客胜；主算短宜守，客算短宜缓。' },
  { name: '计神', text: '计神所临之宫主「计谋成败」，与太乙相合则谋事可成。' },
  { name: '太乙与文昌', text: '文昌（主目）与太乙（主耳）同宫为「掩」，主事受蔽，须防耳目之误。' },
  { name: '太乙与始击', text: '始击主「变」，与太乙相冲为「迫」，主事被逼、宜速决。' },
];

/**
 * 由公元年求太乙入宫
 * @param {number} year 公元年
 * @param {number} base 太乙积年基数（默认通行值，见文件头声明）
 * @returns {{ jiNian, mod24, index, gong, gua, yearsIntoGong }}
 */
export function taiyiGongOfYear(year, base = 10153917) {
  const jiNian = base + year;
  return taiyiGongOfJiNian(jiNian);
}

/** 由积年求入宫 */
export function taiyiGongOfJiNian(jiNian) {
  const mod24 = ((jiNian % XIAO_ZHOU) + XIAO_ZHOU) % XIAO_ZHOU;
  const index = Math.floor(mod24 / YI_GONG_YEARS) % 8;
  const gong = XING_GONG_ORDER[index];
  return {
    jiNian, mod24, index, gong,
    gua: TAIYI_GONG[gong].gua,
    yearsIntoGong: (mod24 % YI_GONG_YEARS) + 1,
  };
}

/**
 * 太乙排盘
 * @param {object} input { year, base?, gongIndex? }
 */
export function paipanTaiyi(input) {
  const notes = [];
  const base = input.base ?? 10153917;

  let pos;
  if (Number.isInteger(input.gongIndex)) {
    const index = ((input.gongIndex % 8) + 8) % 8;
    const gong = XING_GONG_ORDER[index];
    pos = { index, gong, gua: TAIYI_GONG[gong].gua, mod24: index * YI_GONG_YEARS, jiNian: null, yearsIntoGong: 1, explicit: true };
    notes.push('入宫由 gongIndex 直接给定，未使用积年');
  } else {
    pos = taiyiGongOfYear(input.year, base);
    notes.push(`积年基数取 ${base}（通行算法之一，未逐本校验）；基数差 1 将使入宫整体错位`);
  }

  const info = TAIYI_GONG[pos.gong];

  // 太乙在阳宫 / 阴宫
  const yangGong = info.yang === true;
  const yinGong = info.yang === false;

  // 十六神：以太乙所在宫为基准的两个关键神（简化定位）
  const chongGong = XING_GONG_ORDER[(pos.index + 4) % 8];   // 对宫（用八宫序对冲）
  const chongInfo = TAIYI_GONG[chongGong];

  // 主客大将军位（按宫号差定位，框架性）
  const zhuDaJiang = XING_GONG_ORDER[(pos.index + 2) % 8];
  const keDaJiang = XING_GONG_ORDER[(pos.index + 6) % 8];

  const geju = [];
  if (yangGong) geju.push(TAIYI_GEJU[0]);
  if (yinGong) geju.push(TAIYI_GEJU[1]);
  geju.push(TAIYI_GEJU[2]);

  notes.push('「始击」「文昌」「计神」「主客算」的精确算法依所据古本而不同，本模块给出框架性定位与格局要义');
  notes.push('太乙不入中宫；游八宫二十四年为一小周');

  return {
    input, base, pos, info,
    yangGong, yinGong,
    chong: { gong: chongGong, ...chongInfo },
    zhuDaJiang: { gong: zhuDaJiang, gua: TAIYI_GONG[zhuDaJiang].gua, dir: TAIYI_GONG[zhuDaJiang].dir },
    keDaJiang: { gong: keDaJiang, gua: TAIYI_GONG[keDaJiang].gua, dir: TAIYI_GONG[keDaJiang].dir },
    geju,
    grid: [[9, 2, 7], [4, 5, 6], [3, 8, 1]],
    notes,
  };
}

export function taiyiToText(r) {
  const L = [];
  L.push(`【年份】${r.input.year}（公元）`);
  if (r.pos.jiNian) L.push(`【太乙积年】${r.pos.jiNian}　除 24 余 ${r.pos.mod24}`);
  L.push(`【太乙入宫】第 ${r.pos.gong} 宫 · ${r.info.gua}（${r.info.dir}，${r.info.wx}，${r.info.yang === true ? '阳宫' : '阴宫'}）`);
  L.push(`　本宫已居第 ${r.pos.yearsIntoGong} 年（每宫三年）`);
  L.push(`【宫义】${r.info.note}`);
  L.push(`【对宫】第 ${r.chong.gong} 宫 ${r.chong.gua}（${r.chong.dir}）`);
  L.push('');
  L.push('【九宫图】');
  const P = (n) => `${TAIYI_GONG[n].gua}${n}${n === r.pos.gong ? ' ★太乙' : ''}`;
  for (const row of r.grid) L.push('　' + row.map(c => P(c).padEnd(10, ' ')).join('│'));
  L.push('');
  L.push('【大将军位（框架性）】');
  L.push(`　主大将：第 ${r.zhuDaJiang.gong} 宫 ${r.zhuDaJiang.gua}（${r.zhuDaJiang.dir}）`);
  L.push(`　客大将：第 ${r.keDaJiang.gong} 宫 ${r.keDaJiang.gua}（${r.keDaJiang.dir}）`);
  L.push('');
  L.push('【格局要义】');
  for (const g of r.geju) L.push(`　· ${g.name}：${g.text}`);
  L.push('');
  L.push('【十六神】');
  for (const s of SHI_LIU_SHEN) L.push(`　${s.name}（${s.dir}）— ${s.wang}`);
  L.push('');
  L.push('【说明】');
  for (const n of r.notes) L.push(`　· ${n}`);
  return L.join('\n');
}
