/**
 * 姓名学引擎 —— 五格剖象 + 三才配置 + 音韵五行
 *
 * ⚠️ 局限说明：传统五格剖象以「康熙笔画（繁体）」为准，本模块使用简体笔画。
 *    两套笔画的数理结果并不相同，此处结果仅供文化参考。
 */

/** 常见姓氏笔画（简体） */
export const XING_BIHUA = {
  王: 4, 李: 7, 张: 7, 刘: 6, 陈: 7, 杨: 7, 黄: 11, 赵: 9, 吴: 7, 周: 8,
  徐: 10, 孙: 6, 马: 3, 朱: 6, 胡: 9, 郭: 10, 何: 7, 高: 10, 林: 8, 罗: 8,
  郑: 8, 梁: 11, 谢: 12, 宋: 7, 唐: 10, 许: 6, 韩: 12, 冯: 5, 邓: 4, 曹: 11,
  彭: 12, 曾: 12, 肖: 7, 田: 5, 董: 12, 袁: 10, 潘: 15, 于: 3, 蒋: 12, 蔡: 14,
  余: 7, 杜: 7, 叶: 5, 程: 12, 苏: 7, 魏: 17, 吕: 6, 丁: 2, 任: 6, 沈: 7,
  姚: 9, 卢: 5, 姜: 9, 崔: 11, 钟: 9, 谭: 14, 陆: 7, 汪: 7, 范: 8, 金: 8,
  石: 5, 廖: 13, 贾: 10, 夏: 10, 韦: 4, 付: 5, 方: 4, 白: 5, 邹: 7, 孟: 8,
  熊: 14, 秦: 10, 邱: 7, 江: 6, 尹: 4, 薛: 16, 闫: 9, 段: 9, 雷: 13, 侯: 9,
  龙: 5, 史: 5, 陶: 10, 黎: 15, 贺: 9, 顾: 10, 毛: 4, 郝: 9, 龚: 11, 邵: 7,
  万: 3, 钱: 10, 严: 7, 覃: 12, 武: 8, 戴: 17, 莫: 10, 孔: 4, 向: 6, 汤: 6,
  欧: 8, 欧阳: 23, 上官: 11, 司徒: 14, 诸葛: 25, 司马: 13, 皇甫: 19, 慕容: 22,
};

/** 声母 → 五音 → 五行 */
const SHENGMU_WUXING = {
  喉: { yin: '宫', wx: '土', sm: ['a', 'o', 'e', 'y', 'w', ''] },
  牙: { yin: '角', wx: '木', sm: ['g', 'k', 'h'] },
  舌: { yin: '徵', wx: '火', sm: ['d', 't', 'n', 'l'] },
  齿: { yin: '商', wx: '金', sm: ['z', 'c', 's', 'j', 'q', 'x', 'r'] },
  唇: { yin: '羽', wx: '水', sm: ['b', 'p', 'm', 'f'] },
};

/** 由拼音首字母取音韵五行 */
export function yinyunWuxing(initial) {
  const s = (initial || '').toLowerCase();
  for (const [k, v] of Object.entries(SHENGMU_WUXING)) {
    if (v.sm.some(x => x && s.startsWith(x))) return { wuyin: v.yin, wx: v.wx, lei: k };
  }
  return { wuyin: '宫', wx: '土', lei: '喉' };
}

/** 数理五行：以尾数定（1·2木，3·4火，5·6土，7·8金，9·0水） */
export function shuLiWuxing(n) {
  const t = n % 10;
  if (t === 1 || t === 2) return '木';
  if (t === 3 || t === 4) return '火';
  if (t === 5 || t === 6) return '土';
  if (t === 7 || t === 8) return '金';
  return '水';
}

/** 81 数理吉凶（简化分级：大吉 / 吉 / 半吉 / 凶） */
const SHULI_81 = (() => {
  const da = new Set([1, 3, 5, 6, 11, 13, 15, 16, 21, 23, 24, 31, 32, 33, 35, 37, 39, 41, 45, 47, 48, 52, 57, 61, 63, 65, 67, 68, 81]);
  const ji = new Set([7, 8, 17, 18, 25, 29, 57, 71, 73, 75, 77, 78]);
  const ban = new Set([26, 27, 30, 38, 40, 42, 43, 50, 51, 53, 55, 58, 71, 73, 75, 77, 78, 80]);
  const arr = [];
  for (let i = 1; i <= 81; i++) {
    arr.push(da.has(i) ? '大吉' : (ji.has(i) ? '吉' : (ban.has(i) ? '半吉' : '凶')));
  }
  return arr;
})();

/** 数理含义简表（核心吉凶数） */
const SHULI_DESC = {
  1: '太极之数，万物开泰，生发无穷', 3: '进取如意，名利双收', 5: '阴阳和合，福禄长寿',
  6: '万宝集门，安稳余庆', 11: '旱苗逢雨，枯木逢春', 13: '天赋吉运，能得人望',
  15: '福寿圆满，雅量厚重', 16: '厚德载物，能成大业', 21: '明月中天，光风霁月',
  23: '旭日东升，壮丽壮观', 24: '家门余庆，金钱丰盈', 31: '智勇得志，博得名利',
  32: '宝马金鞍，侥幸多能', 33: '旭日升天，鸾凤相会', 35: '温和平静，智达通畅',
  37: '猛虎出林，权威显达', 39: '云开见月，富贵荣华', 41: '德望高大，纯阳独秀',
  45: '顺风扬帆，新生泰和', 47: '点石成金，花开之象', 48: '智谋兼备，德量荣达',
  52: '达眼卓识，先见之明', 63: '富贵荣华，身心安泰', 65: '天长地久，家运隆昌',
  67: '独营事业，事事如意', 68: '思虑周详，兴家立业', 81: '还原复始，最极之数',
  2: '混沌未定，进退保守', 4: '日被云遮，苦难折磨', 9: '兴尽凶始，穷乏困苦',
  10: '万事终局，充满损耗', 12: '薄弱无力，孤立无援', 14: '破兆之数，家庭缘薄',
  19: '风云蔽日，虽有智谋', 20: '屋下藏金，非业破运', 22: '秋草逢霜，怀才不遇',
  26: '变怪奇异，英雄豪杰（半吉）', 28: '鱼临旱地，难逃恶运', 34: '破家亡身，见识短小',
  36: '波澜重叠，侠肝义胆', 42: '寒蝉在柳，十艺不成', 44: '须发早白，事难遂愿',
  49: '遇吉则吉，遇凶则凶', 54: '石上栽花，多难非运', 56: '事与愿违，终难成功',
  59: '寒蝉悲风，意志不坚', 60: '黑暗无光，心迷意乱', 62: '衰柳寒蝉，内外不和',
  64: '骨肉分离，孤独悲愁', 66: '进退维谷，艰难不堪', 69: '非业破运，坐立不安',
  70: '惨淡经营，晚景悲凉', 72: '先甜后苦，万难忍受', 74: '残菊经霜，秋叶落寞',
  76: '倾覆离散，内外不和', 79: '云头望月，身疲力尽', 80: '凶星入命，晚景凄凉',
};

/**
 * 五格剖象
 * @param {string} xing 姓（1-2 字）
 * @param {string} ming 名（1-2 字）
 * @param {object} [bhOverride] 指定笔画 { xing:[], ming:[] }
 */
export function wuGe(xing, ming, bhOverride) {
  const xb = bhOverride?.xing || [...xing].map(c => XING_BIHUA[c] ?? null);
  const mb = bhOverride?.ming || [...ming].map(c => null);
  const xSum = xb.reduce((a, b) => a + (b || 0), 0);
  const mSum = mb.reduce((a, b) => a + (b || 0), 0);

  const singleXing = xb.length === 1;
  const singleMing = mb.length === 1;

  const tian = singleXing ? xb[0] + 1 : xSum;
  const ren = singleXing ? xb[0] + (mb[0] || 0) : (xb[xb.length - 1] + (mb[0] || 0));
  const di = singleMing ? (mb[0] || 0) + 1 : mSum;
  const zong = xSum + mSum;
  const wai = singleXing && singleMing
    ? 2
    : (singleXing ? (mb[mb.length - 1] || 0) + 1 : (mb.length === 1 ? xb[0] + 1 : xb[0] + (mb[mb.length - 1] || 0)));

  const norm = (n) => ((n - 1) % 81) + 1;
  const ge = {
    天格: { n: tian, wx: shuLiWuxing(tian), luck: SHULI_81[norm(tian) - 1], desc: SHULI_DESC[norm(tian)] || '' },
    人格: { n: ren, wx: shuLiWuxing(ren), luck: SHULI_81[norm(ren) - 1], desc: SHULI_DESC[norm(ren)] || '' },
    地格: { n: di, wx: shuLiWuxing(di), luck: SHULI_81[norm(di) - 1], desc: SHULI_DESC[norm(di)] || '' },
    外格: { n: wai, wx: shuLiWuxing(wai), luck: SHULI_81[norm(wai) - 1], desc: SHULI_DESC[norm(wai)] || '' },
    总格: { n: zong, wx: shuLiWuxing(zong), luck: SHULI_81[norm(zong) - 1], desc: SHULI_DESC[norm(zong)] || '' },
  };

  const sanCai = ge.天格.wx + ge.人格.wx + ge.地格.wx;
  const rel1 = wuxingRelSimple(ge.天格.wx, ge.人格.wx);
  const rel2 = wuxingRelSimple(ge.人格.wx, ge.地格.wx);

  return {
    xing, ming, bihua: { xing: xb, ming: mb, xSum, mSum },
    ge, sanCai, sanCaiRel: { 天人: rel1, 人地: rel2 },
    comment: sanCaiComment(ge.人格.wx, rel1, rel2),
    missing: [...xb, ...mb].some(v => v === null),
  };
}

function wuxingRelSimple(a, b) {
  const SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  const KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
  if (a === b) return '比和';
  if (SHENG[a] === b) return '相生';
  if (KE[a] === b) return '相克';
  return '相泄';
}

function sanCaiComment(renWx, r1, r2) {
  const good = r1 === '相生' || r1 === '比和';
  const good2 = r2 === '相生' || r2 === '比和';
  if (good && good2) return '三才配置顺畅，基础稳固，事业与身心皆易得助力。';
  if (good && !good2) return '天人相生而人地不谐：早年得长辈助力，中年后需靠自己调理根基。';
  if (!good && good2) return '天人相克而人地相生：早年多阻力，中年后渐入佳境。';
  return '三才配置多阻，需以行事谨慎、稳中求进为宜。';
}

/** 文本输出 */
export function xingmingToText(r) {
  const L = [];
  L.push(`【姓名】${r.xing}${r.ming}`);
  L.push(`【笔画】姓 ${r.bihua.xing.join('+')}=${r.bihua.xSum}　名 ${r.bihua.ming.join('+') || '（未填）'}=${r.bihua.mSum}`);
  L.push('');
  L.push('【 五格 】');
  for (const [k, v] of Object.entries(r.ge)) {
    L.push(`　${k} ${v.n}（${v.wx}）${v.luck}${v.desc ? ' — ' + v.desc : ''}`);
  }
  L.push('');
  L.push(`【三才】${r.sanCai}（天人${r.sanCaiRel.天人} · 人地${r.sanCaiRel.人地}）`);
  L.push(`【总评】${r.comment}`);
  if (r.missing) L.push('\n⚠️ 部分字的笔画未能自动识别，可手动补全后结果更准。');
  return L.join('\n');
}
