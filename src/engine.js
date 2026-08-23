import { CHARACTERS, DIMENSIONS, QUESTIONS, TAROT } from "./data.js";

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const STEM_ELEMENTS = ["木", "木", "火", "火", "土", "土", "金", "金", "水", "水"];
const BRANCH_ELEMENTS = ["水", "土", "木", "木", "土", "火", "火", "土", "金", "金", "土", "水"];
const ELEMENT_TRAITS = {
  木: "成長を求め、理想へ向かってしなやかに伸びる",
  火: "情熱と表現力で、周囲の温度を動かす",
  土: "現実感覚と持久力で、安心できる土台を作る",
  金: "判断力と美意識で、不要なものを研ぎ澄ます",
  水: "柔軟さと洞察力で、変化の奥にある本質を読む"
};
const NINE_STARS = [null,
  { name:"一白水星", element:"水", trait:"静かな適応力と人の本音を読む洞察" },
  { name:"二黒土星", element:"土", trait:"育てる力と地道に積み上げる粘り" },
  { name:"三碧木星", element:"木", trait:"若々しい行動力と先陣を切る発信力" },
  { name:"四緑木星", element:"木", trait:"人と機会を結ぶ調整力と信用" },
  { name:"五黄土星", element:"土", trait:"中心に立って状況を変える強い影響力" },
  { name:"六白金星", element:"金", trait:"高い理想と責任を背負うリーダー性" },
  { name:"七赤金星", element:"金", trait:"会話と楽しさで豊かさを引き寄せる魅力" },
  { name:"八白土星", element:"土", trait:"節目で流れを変え、受け継いだものを育てる力" },
  { name:"九紫火星", element:"火", trait:"直感と美意識で本質を照らす華やかさ" }
];
const ZODIAC = ["牡羊座","牡牛座","双子座","蟹座","獅子座","乙女座","天秤座","蠍座","射手座","山羊座","水瓶座","魚座"];
const ZODIAC_ELEMENTS = ["火","地","風","水","火","地","風","水","火","地","風","水"];
const PLANET_ROLES = {
  sun: ["太陽", "核となる意志"], moon: ["月", "感情と安心"], mercury: ["水星", "思考と伝え方"],
  venus: ["金星", "恋愛と美意識"], mars: ["火星", "行動と闘い方"]
};
const TAROT_VECTORS = [
  [3,3,2,5,4,1], [5,2,4,4,3,2], [1,4,4,2,5,4], [2,5,2,2,5,5], [5,2,5,1,1,5], [2,4,4,1,3,5],
  [2,5,2,4,5,3], [5,2,3,5,2,2], [4,4,3,3,4,4], [1,2,5,2,5,4], [4,3,2,5,4,2], [3,3,5,2,2,5],
  [1,5,3,2,5,3], [3,2,3,5,5,1], [2,5,4,2,4,5], [4,2,2,4,5,2], [3,1,2,5,5,1], [3,4,2,4,5,3],
  [1,4,2,3,5,2], [5,4,2,4,4,3], [4,3,4,4,4,3], [4,4,4,3,4,5]
];
const FLOW_STAGES = [null,
  { palace:"坎宮", label:"充電期", copy:"急ぐより、内側を整えて次の一手を育てる流れ" },
  { palace:"坤宮", label:"準備期", copy:"目立たない積み重ねが、次の成長を支える流れ" },
  { palace:"震宮", label:"始動期", copy:"新しい声や行動を外へ出すほど展開が生まれる流れ" },
  { palace:"巽宮", label:"発展期", copy:"信用とご縁を広げ、形を整えていく流れ" },
  { palace:"中宮", label:"転換期", copy:"これまでの結果が集まり、軸を選び直す流れ" },
  { palace:"乾宮", label:"勝負期", copy:"責任を引き受け、実力を結果へ変える流れ" },
  { palace:"兌宮", label:"収穫期", copy:"成果を受け取り、人と喜びを分かち合う流れ" },
  { palace:"艮宮", label:"変革期", copy:"終わりと始まりの境目で、暮らしを組み替える流れ" },
  { palace:"離宮", label:"注目期", copy:"評価と本質が明るみに出て、手放すものも見える流れ" }
];

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const mod = (value, base) => ((value % base) + base) % base;
const rad = value => value * Math.PI / 180;
const deg = value => value * 180 / Math.PI;
const normalizeAngle = value => mod(value, 360);
const round = (value, digits = 1) => Number(value.toFixed(digits));

function parseDate(dateString) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString || "");
  if (!match) throw new Error("生年月日の形式が正しくありません");
  const [, y, m, d] = match.map(Number);
  const stamp = Date.UTC(y, m - 1, d);
  const date = new Date(stamp);
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) throw new Error("存在しない生年月日です");
  return { year: y, month: m, day: d };
}

export function julianDay(dateString, timeString = "12:00") {
  const { year, month, day } = parseDate(dateString);
  const [hours = 12, minutes = 0] = (timeString || "12:00").split(":").map(Number);
  return Date.UTC(year, month - 1, day, hours, minutes) / 86400000 + 2440587.5;
}

function sexagenary(index) {
  return { index: mod(index, 60), stemIndex: mod(index, 10), branchIndex: mod(index, 12) };
}

function pillarLabel(pillar) {
  return `${STEMS[pillar.stemIndex]}${BRANCHES[pillar.branchIndex]}`;
}

function solarMonthIndex(month, day) {
  const md = month * 100 + day;
  if (md >= 1207 || md < 106) return 11;
  if (md < 204) return 12;
  if (md < 306) return 1;
  if (md < 405) return 2;
  if (md < 506) return 3;
  if (md < 606) return 4;
  if (md < 707) return 5;
  if (md < 808) return 6;
  if (md < 908) return 7;
  if (md < 1008) return 8;
  if (md < 1107) return 9;
  return 10;
}

export function calculateShichu(profile) {
  const { year, month, day } = parseDate(profile.birthdate);
  const beforeRisshun = month < 2 || (month === 2 && day < 4);
  const pillarYear = beforeRisshun ? year - 1 : year;
  const yearPillar = sexagenary(pillarYear - 4);
  const monthNumber = solarMonthIndex(month, day);
  const monthPillar = {
    stemIndex: mod(yearPillar.stemIndex * 2 + monthNumber + 1, 10),
    branchIndex: mod(monthNumber + 1, 12)
  };
  const jdn = Math.floor(julianDay(profile.birthdate, profile.birthTimeKnown ? profile.birthtime : "12:00") + 0.5);
  const dayPillar = sexagenary(jdn + 49);
  let hourPillar = null;
  if (profile.birthTimeKnown && /^\d{2}:\d{2}$/.test(profile.birthtime || "")) {
    const hour = Number(profile.birthtime.slice(0, 2));
    const branchIndex = mod(Math.floor((hour + 1) / 2), 12);
    hourPillar = { stemIndex: mod(dayPillar.stemIndex * 2 + branchIndex, 10), branchIndex };
  }
  const pillars = [yearPillar, monthPillar, dayPillar, ...(hourPillar ? [hourPillar] : [])];
  const elements = { 木:0, 火:0, 土:0, 金:0, 水:0 };
  pillars.forEach(pillar => {
    elements[STEM_ELEMENTS[pillar.stemIndex]] += 1;
    elements[BRANCH_ELEMENTS[pillar.branchIndex]] += 0.7;
  });
  const ranked = Object.entries(elements).sort((a, b) => b[1] - a[1]);
  const dayElement = STEM_ELEMENTS[dayPillar.stemIndex];
  return {
    pillars: {
      year: pillarLabel(yearPillar), month: pillarLabel(monthPillar), day: pillarLabel(dayPillar),
      hour: hourPillar ? pillarLabel(hourPillar) : "出生時間未入力"
    },
    dayMaster: STEMS[dayPillar.stemIndex], dayElement, elements,
    strongest: ranked[0][0], support: ranked[1][0], weakest: ranked.at(-1)[0],
    summary: `${ELEMENT_TRAITS[dayElement]}日主。${ranked[0][0]}の気が強く、${ranked[1][0]}がその力を支えています。`,
    precision: hourPillar ? "年・月・日・時の四柱で算出" : "年・月・日の三柱で算出（時柱のみ除外）"
  };
}

function eccentricAnomaly(M, e) {
  let E = M + e * deg(Math.sin(rad(M))) * (1 + e * Math.cos(rad(M)));
  for (let i = 0; i < 4; i += 1) E -= (E - deg(e * Math.sin(rad(E))) - M) / (1 - e * Math.cos(rad(E)));
  return E;
}

function orbitalPosition(body, d) {
  const elements = {
    mercury: [48.3313 + 3.24587e-5*d, 7.0047 + 5e-8*d, 29.1241 + 1.01444e-5*d, .387098, .205635 + 5.59e-10*d, 168.6562 + 4.0923344368*d],
    venus: [76.6799 + 2.46590e-5*d, 3.3946 + 2.75e-8*d, 54.8910 + 1.38374e-5*d, .72333, .006773 - 1.302e-9*d, 48.0052 + 1.6021302244*d],
    mars: [49.5574 + 2.11081e-5*d, 1.8497 - 1.78e-8*d, 286.5016 + 2.92961e-5*d, 1.523688, .093405 + 2.516e-9*d, 18.6021 + .5240207766*d]
  }[body];
  const [N, i, w, a, e, M] = elements;
  const E = eccentricAnomaly(normalizeAngle(M), e);
  const xv = a * (Math.cos(rad(E)) - e);
  const yv = a * Math.sqrt(1 - e*e) * Math.sin(rad(E));
  const v = deg(Math.atan2(yv, xv));
  const r = Math.hypot(xv, yv);
  const vw = rad(v + w);
  return {
    x: r * (Math.cos(rad(N))*Math.cos(vw) - Math.sin(rad(N))*Math.sin(vw)*Math.cos(rad(i))),
    y: r * (Math.sin(rad(N))*Math.cos(vw) + Math.cos(rad(N))*Math.sin(vw)*Math.cos(rad(i))),
    z: r * Math.sin(vw) * Math.sin(rad(i))
  };
}

function sunPosition(d) {
  const w = 282.9404 + 4.70935e-5*d;
  const e = .016709 - 1.151e-9*d;
  const M = normalizeAngle(356.0470 + .9856002585*d);
  const E = eccentricAnomaly(M, e);
  const xv = Math.cos(rad(E)) - e;
  const yv = Math.sqrt(1 - e*e) * Math.sin(rad(E));
  const v = deg(Math.atan2(yv, xv));
  const r = Math.hypot(xv, yv);
  const lon = normalizeAngle(v + w);
  return { lon, x:r*Math.cos(rad(lon)), y:r*Math.sin(rad(lon)) };
}

function moonLongitude(d) {
  const N = 125.1228 - .0529538083*d;
  const i = 5.1454;
  const w = 318.0634 + .1643573223*d;
  const a = 60.2666;
  const e = .0549;
  const M = normalizeAngle(115.3654 + 13.0649929509*d);
  const E = eccentricAnomaly(M, e);
  const xv = a * (Math.cos(rad(E)) - e);
  const yv = a * Math.sqrt(1 - e*e) * Math.sin(rad(E));
  const v = deg(Math.atan2(yv, xv));
  const r = Math.hypot(xv, yv);
  const vw = rad(v + w);
  const x = r*(Math.cos(rad(N))*Math.cos(vw) - Math.sin(rad(N))*Math.sin(vw)*Math.cos(rad(i)));
  const y = r*(Math.sin(rad(N))*Math.cos(vw) + Math.cos(rad(N))*Math.sin(vw)*Math.cos(rad(i)));
  let lon = normalizeAngle(deg(Math.atan2(y, x)));
  const sun = sunPosition(d);
  const Lm = normalizeAngle(N + w + M);
  const Ls = normalizeAngle(sun.lon);
  const D = normalizeAngle(Lm - Ls);
  const F = normalizeAngle(Lm - N);
  lon += -1.274*Math.sin(rad(M - 2*D)) + .658*Math.sin(rad(2*D)) - .186*Math.sin(rad(normalizeAngle(356.0470 + .9856002585*d)))
    - .059*Math.sin(rad(2*M - 2*D)) - .057*Math.sin(rad(M - 2*D + normalizeAngle(356.0470 + .9856002585*d)))
    + .053*Math.sin(rad(M + 2*D)) + .046*Math.sin(rad(2*D - normalizeAngle(356.0470 + .9856002585*d)))
    + .041*Math.sin(rad(M - normalizeAngle(356.0470 + .9856002585*d))) - .035*Math.sin(rad(D)) - .031*Math.sin(rad(M + normalizeAngle(356.0470 + .9856002585*d)))
    - .015*Math.sin(rad(2*F - 2*D)) + .011*Math.sin(rad(M - 4*D));
  return normalizeAngle(lon);
}

function zodiacFromLongitude(longitude) {
  const index = Math.floor(normalizeAngle(longitude) / 30);
  return { index, sign: ZODIAC[index], element: ZODIAC_ELEMENTS[index], degree: round(mod(longitude, 30), 1) };
}

export function calculateAstrology(profile) {
  const jd = julianDay(profile.birthdate, profile.birthTimeKnown ? profile.birthtime : "12:00");
  const d = jd - 2451543.5;
  const sun = sunPosition(d);
  const longitudes = { sun:sun.lon, moon:moonLongitude(d) };
  for (const body of ["mercury", "venus", "mars"]) {
    const p = orbitalPosition(body, d);
    longitudes[body] = normalizeAngle(deg(Math.atan2(p.y + sun.y, p.x + sun.x)));
  }
  const planets = Object.fromEntries(Object.entries(longitudes).map(([key, lon]) => {
    const z = zodiacFromLongitude(lon);
    return [key, { key, label:PLANET_ROLES[key][0], role:PLANET_ROLES[key][1], longitude:round(lon, 2), ...z }];
  }));
  const elements = { 火:0, 地:0, 風:0, 水:0 };
  Object.values(planets).forEach(p => elements[p.element] += 1);
  const dominant = Object.entries(elements).sort((a,b) => b[1] - a[1])[0][0];
  const elementCopy = {
    火:"直感的に始める力", 地:"現実へ定着させる力", 風:"言葉と情報でつなぐ力", 水:"感情と空気を読む力"
  }[dominant];
  return {
    planets, elements, dominant,
    summary:`太陽は${planets.sun.sign}、月は${planets.moon.sign}。5天体では${dominant}の性質が強く、${elementCopy}が個性の軸です。`,
    precision:profile.birthTimeKnown ? "入力された出生時刻で黄経を近似計算" : "出生日の正午を基準に黄経を近似計算"
  };
}

function digitRoot(value, keepMaster = true) {
  let number = Math.abs(Number(value));
  while (number > 9 && !(keepMaster && [11,22,33].includes(number))) {
    number = String(number).split("").reduce((sum, digit) => sum + Number(digit), 0);
  }
  return number;
}

const NUMEROLOGY = {
  1:"自分の道を切り開く開拓者", 2:"人をつなぎ調和を育てる協力者", 3:"喜びと言葉を広げる表現者",
  4:"仕組みと信頼を積み上げる建設者", 5:"変化を楽しみ自由を運ぶ冒険者", 6:"愛と責任で居場所を守る養育者",
  7:"真理と本質を深く探る研究者", 8:"現実を動かし豊かさを循環させる実力者", 9:"経験を愛へ変えて手渡す完成者",
  11:"直感で未来の方向を照らすメッセンジャー", 22:"大きな理想を現実に建てるマスタービルダー", 33:"無条件の共感で人を癒やす奉仕者"
};

export function calculateNumerology(profile, targetYear = new Date().getFullYear()) {
  const { month, day } = parseDate(profile.birthdate);
  const lifePath = digitRoot(profile.birthdate.replaceAll("-", "").split("").reduce((s,d) => s + Number(d), 0));
  const birthday = digitRoot(day);
  const personalYear = digitRoot(digitRoot(month, false) + digitRoot(day, false) + digitRoot(targetYear, false), false);
  return {
    lifePath, birthday, personalYear, targetYear,
    theme:NUMEROLOGY[lifePath], birthdayTheme:NUMEROLOGY[birthday] || NUMEROLOGY[digitRoot(birthday, false)],
    yearTheme:[null,"始める","協力する","表現する","整える","変える","育てる","見つめる","実らせる","手放す"][personalYear],
    summary:`運命数${lifePath}は「${NUMEROLOGY[lifePath]}」。${targetYear}年は${personalYear}の年で、${[null,"始める","協力する","表現する","整える","変える","育てる","見つめる","実らせる","手放す"][personalYear]}流れです。`
  };
}

function digitalRootNine(value) {
  let result = String(value).split("").reduce((sum, digit) => sum + Number(digit), 0);
  while (result > 9) result = String(result).split("").reduce((sum, digit) => sum + Number(digit), 0);
  return result;
}

function wrapNine(value) { return mod(value - 1, 9) + 1; }

export function calculateKyusei(profile, targetDate = new Date()) {
  const { year, month, day } = parseDate(profile.birthdate);
  const beforeRisshun = month < 2 || (month === 2 && day < 4);
  const solarYear = beforeRisshun ? year - 1 : year;
  const mainNumber = wrapNine(11 - digitalRootNine(solarYear));
  const yearBranch = mod(solarYear - 4, 12);
  const startMonthStar = [0,3,6,9].includes(yearBranch) ? 8 : [1,4,7,10].includes(yearBranch) ? 5 : 2;
  const monthNumber = solarMonthIndex(month, day);
  const monthStarNumber = wrapNine(startMonthStar - (monthNumber - 1));
  const main = NINE_STARS[mainNumber];
  const monthStar = NINE_STARS[monthStarNumber];
  const direction = ["北","南西","東","東南","中央","北西","西","北東","南"][mainNumber - 1];
  const target = targetDate instanceof Date ? targetDate : new Date(Date.UTC(Number(targetDate), 6, 1));
  const targetYear = target.getUTCFullYear();
  const targetMonth = target.getUTCMonth() + 1;
  const targetDay = target.getUTCDate();
  const flowYear = targetMonth < 2 || (targetMonth === 2 && targetDay < 4) ? targetYear - 1 : targetYear;
  const annualNumber = wrapNine(11 - digitalRootNine(flowYear));
  const annual = NINE_STARS[annualNumber];
  const flowPalaceNumber = wrapNine(5 + mainNumber - annualNumber);
  const flow = FLOW_STAGES[flowPalaceNumber];
  return {
    mainNumber, monthStarNumber, main, monthStar, direction, targetYear:flowYear,
    annualNumber, annual, flowPalaceNumber, flow,
    summary:`本命星は${main.name}。${main.trait}を持ち、月命星${monthStar.name}の${monthStar.trait}が対人面に表れます。`,
    flowSummary:`${flowYear}年は${annual.name}が年盤の中心。あなたの${main.name}は${flow.palace}を巡り、「${flow.copy}」です。`
  };
}

function emptyScores() { return Array(DIMENSIONS.length).fill(3); }

export function scoreQuestionRange(answers, start = 0, end = QUESTIONS.length) {
  const totals = Array(DIMENSIONS.length).fill(0);
  const counts = Array(DIMENSIONS.length).fill(0);
  QUESTIONS.slice(start, end).forEach((question, localIndex) => {
    const answerIndex = Number(answers[start + localIndex]);
    if (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 4) return;
    const score = question.reverse ? 5 - answerIndex : answerIndex + 1;
    totals[question.axis] += score;
    counts[question.axis] += 1;
  });
  return totals.map((total, index) => counts[index] ? round(total / counts[index], 2) : 3);
}

export function fortuneTraitScores(fortunes) {
  const scores = emptyScores();
  const addElement = element => {
    const map = { 木:[.5,.3,0,.4,.2,0], 火:[.7,.2,0,.5,.3,-.2], 土:[.1,.2,.3,-.3,0,.7], 金:[.3,-.1,.7,0,-.2,.4], 水:[0,.4,.3,.2,.7,0] }[element];
    map?.forEach((value, index) => scores[index] += value);
  };
  addElement(fortunes.shichu.strongest);
  const astroElement = { 火:"火", 地:"土", 風:"金", 水:"水" }[fortunes.astrology.dominant];
  addElement(astroElement);
  const numberBias = {
    1:[.7,0,.2,.5,0,-.2],2:[0,.7,0,-.1,.5,.3],3:[.3,.4,0,.5,.4,-.2],4:[0,0,.5,-.3,0,.8],5:[.3,0,0,.8,.2,-.5],
    6:[0,.7,0,-.2,.4,.5],7:[0,-.1,.8,.1,.5,.2],8:[.8,0,.5,.2,0,.4],9:[.1,.7,0,.2,.6,0],11:[.2,.4,.1,.4,.8,-.1],22:[.7,.2,.7,.1,.1,.7],33:[0,.9,0,-.1,.8,.2]
  }[fortunes.numerology.lifePath] || [];
  numberBias.forEach((value,index) => scores[index] += value);
  addElement(fortunes.kyusei.main.element);
  return scores.map(value => round(clamp(value / 1.55, 1, 5), 2));
}

export function tarotTraitScores(selections, mode = "balanced") {
  const weights = mode === "surface" ? [.15,.35,.5] : mode === "inner" ? [.4,.45,.15] : [.28,.44,.28];
  const totals = Array(DIMENSIONS.length).fill(0);
  let totalWeight = 0;
  (selections || []).slice(0,3).forEach((selection, position) => {
    const source = TAROT_VECTORS[Number(selection.id)];
    if (!source) return;
    const weight = weights[position];
    source.forEach((value,index) => {
      const oriented = selection.reversed
        ? clamp(3 + (value - 3) * .58 - ([0,5].includes(index) ? .2 : 0), 1, 5)
        : value;
      totals[index] += oriented * weight;
    });
    totalWeight += weight;
  });
  return totalWeight ? totals.map(value => round(value / totalWeight, 2)) : emptyScores();
}

function weightedScores(primary, secondary, primaryWeight = .72) {
  return primary.map((score,index) => round(clamp(score*primaryWeight + secondary[index]*(1-primaryWeight), 1, 5), 2));
}

function distance(a, b) { return Math.sqrt(a.reduce((sum,value,index) => sum + (value - b[index])**2, 0)); }

export function closestCharacter(scores, excludedId = null) {
  return [...CHARACTERS]
    .filter(character => character.id !== excludedId)
    .sort((a,b) => distance(scores,a.vector) - distance(scores,b.vector) || a.id - b.id)[0];
}

export function analyzeProfile(profile, answers, tarotSelections = []) {
  if (!Array.isArray(answers) || answers.length !== 24 || answers.some(value => !Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > 4)) throw new Error("24問すべての回答が必要です");
  if (!Array.isArray(tarotSelections) || tarotSelections.length !== 3 || new Set(tarotSelections.map(card => Number(card.id))).size !== 3 || tarotSelections.some(card => !TAROT.some(item => item.id === Number(card.id)))) throw new Error("過去・現在・近未来のタロットを3枚選んでください");
  const fortunes = {
    shichu: calculateShichu(profile), astrology: calculateAstrology(profile),
    numerology: calculateNumerology(profile), kyusei: calculateKyusei(profile)
  };
  const surfaceQuestions = scoreQuestionRange(answers, 0, 12);
  const innerQuestions = scoreQuestionRange(answers, 12, 24);
  const traditionalFortuneScores = fortuneTraitScores(fortunes);
  const tarotScores = { surface:tarotTraitScores(tarotSelections,"surface"), inner:tarotTraitScores(tarotSelections,"inner") };
  const surfaceFortuneScores = traditionalFortuneScores.map((score,index) => round(score*.82 + tarotScores.surface[index]*.18,2));
  const innerFortuneScores = traditionalFortuneScores.map((score,index) => round(score*.78 + tarotScores.inner[index]*.22,2));
  const fortuneScores = surfaceFortuneScores.map((score,index) => round((score+innerFortuneScores[index])/2,2));
  const surfaceScores = weightedScores(surfaceQuestions, surfaceFortuneScores, .74);
  const innerScores = weightedScores(innerQuestions, innerFortuneScores.map((score,index) => index === 1 || index === 4 ? clamp(score+.25,1,5) : score), .76);
  const surface = closestCharacter(surfaceScores);
  const inner = closestCharacter(innerScores);
  const combination = buildCombination(surface.id, inner.id);
  const cross = buildCrossAnalysis(surfaceQuestions, innerQuestions, fortuneScores);
  return { profile, answers, tarotSelections, fortunes, surface, inner, surfaceScores, innerScores, traditionalFortuneScores, tarotScores, fortuneScores, cross, combination };
}

export function buildCrossAnalysis(surfaceQuestions, innerQuestions, fortuneScores) {
  const agreement = DIMENSIONS.filter((_,i) => Math.abs(((surfaceQuestions[i]+innerQuestions[i])/2)-fortuneScores[i]) <= .7);
  const fortuneHidden = DIMENSIONS.filter((_,i) => fortuneScores[i] >= 3.7 && (surfaceQuestions[i]+innerQuestions[i])/2 <= 3);
  const selfDeveloped = DIMENSIONS.filter((_,i) => (surfaceQuestions[i]+innerQuestions[i])/2 >= 3.7 && fortuneScores[i] <= 3);
  const outward = DIMENSIONS.filter((_,i) => surfaceQuestions[i] - innerQuestions[i] >= .8);
  const inward = DIMENSIONS.filter((_,i) => innerQuestions[i] - surfaceQuestions[i] >= .8);
  return {
    agreement, fortuneHidden, selfDeveloped, outward, inward,
    headline: agreement.length ? `${agreement.slice(0,2).join("と")}は、生まれ持った性質と今の選択が重なる強い軸です。` : "占術の素質と現在の選択に差があり、変化の途中にいる人です。",
    hiddenText: inward.length ? `${inward.slice(0,2).join("・")}は外から見える以上に内側で強く動いています。` : "表と内側の温度差が小さく、比較的まっすぐ伝わるタイプです。"
  };
}

function relationshipType(surface, inner) {
  if (surface.id === inner.id) return { key:"pure", label:"純粋タイプ", phrase:"表と裏の力が一直線につながる" };
  const gap = distance(surface.vector, inner.vector);
  if (gap >= 5.1) return { key:"gap", label:"ギャップタイプ", phrase:"外の顔と心の奥に鮮やかな反転がある" };
  return { key:"balance", label:"バランスタイプ", phrase:"二つの資質を場面に応じて使い分ける" };
}

export function buildCombination(surfaceId, innerId) {
  const surface = CHARACTERS.find(item => item.id === Number(surfaceId));
  const inner = CHARACTERS.find(item => item.id === Number(innerId));
  if (!surface || !inner) throw new Error("タイプ番号が正しくありません");
  const relation = relationshipType(surface, inner);
  const code = `${String(surface.id).padStart(2,"0")}×${String(inner.id).padStart(2,"0")}`;
  const title = surface.id === inner.id ? `芯まで貫く${surface.name}` : `${surface.name}の奥に住む${inner.name}`;
  return {
    code, title, relation,
    identity:`あなたは外では「${surface.catch}」として動きながら、心の奥には「${inner.catch}」という衝動を抱えています。${relation.phrase}組み合わせです。`,
    gap: surface.id === inner.id ? `表と裏の方向が同じぶん、長所も弱点も強く出ます。${surface.weakness}が続く時は意識的に速度を落として。` : `周囲には${surface.surface} 一方、本音では${inner.inner} この差は矛盾ではなく、状況を生き抜くために育てた二つの才能です。`,
    love:`表では${surface.love} 心の奥では${inner.love} 相手に求める前に、この二つの望みを自分の言葉で伝えると関係が安定します。`,
    work:`外向きの武器は「${surface.strength}」、内側の燃料は「${inner.strength}」。${surface.work} 同時に、${inner.work}`,
    money:`${surface.money} ただし本音では、${inner.money} 二つの傾向を分けて予算化すると後悔が減ります。`,
    relations:`人前では${surface.surface} 親しくなるほど${inner.inner} 相手に『別人になった』と思わせないよう、変化の理由を短く共有して。`,
    strengths:[...new Set([...surface.strength.split("・"), ...inner.strength.split("・")])].slice(0,5),
    weaknesses:[...new Set([...surface.weakness.split("・"), ...inner.weakness.split("・")])].slice(0,5),
    caution:`${surface.caution} そして、${inner.caution}`,
    growth:`${surface.growth} さらに、${inner.growth}`,
    shareCopy:`私のウラセラは【表：${surface.name} × 裏：${inner.name}】${code}｜${title} #URASELA #ウラセラ診断`
  };
}

export function allCombinations() {
  return CHARACTERS.flatMap(surface => CHARACTERS.map(inner => buildCombination(surface.id, inner.id)));
}

export function shuffleTarot(random = Math.random) {
  const deck = TAROT.map(card => ({ ...card, reversed: random() < .28 }));
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function tarotMessage(selection, positionLabel) {
  const direction = selection.reversed ? "逆位置" : "正位置";
  const main = selection.reversed
    ? `${selection.meaning} ただ今は、その力が内側で詰まりやすい時。焦らず整えることが先です。`
    : selection.meaning;
  return { ...selection, direction, positionLabel, message:`${positionLabel}のカードは「${selection.name}」。${main}`, attention:selection.caution };
}

export function combinedTarotReading(selections) {
  if (selections.length !== 3) return "";
  const [past,current,future] = selections;
  return `過去の「${past.name}」で得た${past.key.split("・")[0]}が、現在の「${current.name}」が示す${current.key.split("・")[0]}へつながっています。近未来の「${future.name}」は${future.meaning} 3枚に共通する鍵は、自分で選んだ一歩を途中で他人任せにしないことです。`;
}

function weightedVector(surface, inner) { return surface.vector.map((value,index) => value*.58 + inner.vector[index]*.42); }

export function calculateCompatibility(selfSurfaceId, selfInnerId, partnerSurfaceId, partnerInnerId, mode = "love") {
  const get = id => CHARACTERS.find(item => item.id === Number(id));
  const ss=get(selfSurfaceId), si=get(selfInnerId), ps=get(partnerSurfaceId), pi=get(partnerInnerId);
  if (![ss,si,ps,pi].every(Boolean)) throw new Error("4つのタイプを選択してください");
  const a=weightedVector(ss,si), b=weightedVector(ps,pi);
  const weights = { love:[.6,1.25,.45,.75,1.2,.65], friend:[.5,1.1,.55,1.15,.8,.55], work:[1.05,.55,1.25,.55,.45,1.2] }[mode];
  let weightedDistance=0, maxDistance=0;
  weights.forEach((weight,index) => { weightedDistance += Math.abs(a[index]-b[index])*weight; maxDistance += 4*weight; });
  const similarity = 1-weightedDistance/maxDistance;
  const complementary = a.reduce((sum,value,index) => sum + (Math.abs(value-b[index]) >= 1.2 && Math.abs(value-b[index]) <= 2.8 ? 1 : .35),0)/a.length;
  const innerTrust = 1-Math.abs(si.vector[1]-pi.vector[1])/4;
  const score = Math.round(clamp(55 + similarity*31 + complementary*7 + innerTrust*4, 52, 97));
  const differences = DIMENSIONS.map((label,index) => ({label,diff:Math.abs(a[index]-b[index]),sum:a[index]+b[index]})).sort((x,y)=>y.diff-x.diff);
  const strengths = [...DIMENSIONS.map((label,index)=>({label,value:5-Math.abs(a[index]-b[index])+Math.min(a[index],b[index])*.25})).sort((x,y)=>y.value-x.value)];
  const modeLabel = {love:"恋愛",friend:"友達",work:"仕事"}[mode];
  return {
    mode, modeLabel, score,
    headline: score >= 90 ? "言葉の奥まで自然に通じ合う相性" : score >= 80 ? "違いを魅力に変えられる好相性" : score >= 70 ? "理解するほど育つ相性" : "距離感の設計で伸びる相性",
    attraction:`${strengths.slice(0,2).map(item=>item.label).join("と")}の呼吸が合いやすく、${ss.name}の行動力と${ps.name}の反応が互いの魅力を引き出します。`,
    friction:`${differences[0].label}の温度差が出やすい組み合わせ。${si.name}が心の中で求めるペースを、${pi.name}が別の意味に受け取ることがあります。`,
    advice:`${modeLabel}では「分かってくれるはず」を減らし、予定・お金・連絡頻度のうち一つだけ先に言葉で合わせると長続きします。`,
    parts:{ surface:Math.round(clamp(100-distance(ss.vector,ps.vector)*8,45,98)), inner:Math.round(clamp(100-distance(si.vector,pi.vector)*8,45,98)), cross:Math.round(clamp(100-(distance(ss.vector,pi.vector)+distance(si.vector,ps.vector))*4,45,98)) }
  };
}

export function encodeSharedResult(result) {
  const tarot = (result.tarotSelections || []).map(card => `${card.id}${card.reversed ? "r" : "u"}`).join(".");
  return `${String(result.surface.id).padStart(2,"0")}-${String(result.inner.id).padStart(2,"0")}${tarot ? `-${tarot}` : ""}`;
}

export function decodeSharedResult(code) {
  const match = /^(\d{2})-(\d{2})(?:-([0-9ru.]+))?$/.exec(code || "");
  if (!match) return null;
  const surface=CHARACTERS.find(item=>item.id===Number(match[1])), inner=CHARACTERS.find(item=>item.id===Number(match[2]));
  if (!surface || !inner) return null;
  const tarotSelections = (match[3] || "").split(".").filter(Boolean).map(token => {
    const card=TAROT.find(item=>item.id===Number(token.slice(0,-1)));
    return card ? {...card,reversed:token.endsWith("r")} : null;
  }).filter(Boolean).slice(0,3);
  return { surface, inner, tarotSelections, combination:buildCombination(surface.id,inner.id), shared:true };
}
