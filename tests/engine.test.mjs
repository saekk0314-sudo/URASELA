import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  allCombinations, analyzeProfile, buildCombination, calculateAstrology, calculateCompatibility,
  calculateKyusei, calculateNumerology, calculateShichu, decodeSharedResult, encodeSharedResult,
  shuffleTarot, tarotTraitScores
} from "../src/engine.js";
import { CHARACTERS, QUESTIONS, TAROT } from "../src/data.js";

const unknownTimeProfile = {
  birthdate:"2000-02-24", gender:"男性", birthplace:"茨城県", city:"水戸市",
  country:"", birthTimeKnown:false, birthtime:""
};

test("正式データは16タイプ・24問・大アルカナ22枚を満たす", () => {
  assert.equal(CHARACTERS.length, 16);
  assert.equal(new Set(CHARACTERS.map(item => item.name)).size, 16);
  assert.equal(QUESTIONS.length, 24);
  assert.ok(QUESTIONS.every(question => question.choices.length === 5));
  assert.equal(TAROT.length, 22);
  assert.equal(new Set(TAROT.map(card => card.id)).size, 22);
});

test("出生時間不明でも四柱推命の年・月・日柱と日主・五行を計算する", () => {
  const result = calculateShichu(unknownTimeProfile);
  assert.match(result.pillars.year, /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/);
  assert.match(result.pillars.month, /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/);
  assert.match(result.pillars.day, /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/);
  assert.equal(result.pillars.hour, "出生時間未入力");
  assert.ok(["木","火","土","金","水"].includes(result.dayElement));
  assert.equal(Object.keys(result.elements).length, 5);
});

test("出生時間入力時は時柱も実計算する", () => {
  const result = calculateShichu({...unknownTimeProfile,birthTimeKnown:true,birthtime:"08:35"});
  assert.match(result.pillars.hour, /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/);
});

test("西洋占星術は太陽・月・水星・金星・火星の黄経と星座を返す", () => {
  const result = calculateAstrology(unknownTimeProfile);
  assert.deepEqual(Object.keys(result.planets), ["sun","moon","mercury","venus","mars"]);
  for (const planet of Object.values(result.planets)) {
    assert.ok(planet.longitude >= 0 && planet.longitude < 360);
    assert.match(planet.sign, /座$/);
  }
  assert.equal(result.planets.sun.sign, "魚座");
});

test("数秘術は運命数・誕生日数・個人年数を返す", () => {
  const result = calculateNumerology(unknownTimeProfile, 2026);
  assert.equal(result.lifePath, 1);
  assert.equal(result.birthday, 6);
  assert.ok(result.personalYear >= 1 && result.personalYear <= 9);
  assert.ok(result.theme.length > 8);
});

test("九星気学は本命星と月命星を計算する", () => {
  const result = calculateKyusei(unknownTimeProfile, 2026);
  assert.equal(result.main.name, "九紫火星");
  assert.match(result.monthStar.name, /星$/);
  assert.ok(result.summary.includes("月命星"));
  assert.equal(result.targetYear, 2026);
  assert.match(result.flow.label, /期$/);
  assert.ok(result.flowSummary.includes("年盤"));
});

test("24回答と5占術を別ロジックでクロスし表・裏・最終結果を必ず返す", () => {
  const answers = [3,3,1,3,3,4,4,2,3,4,2,4,4,1,3,3,1,3,3,4,1,4,3,4];
  const tarot = shuffleTarot(() => .42).slice(0,3);
  const result = analyzeProfile(unknownTimeProfile, answers, tarot);
  assert.ok(result.surface.id >= 1 && result.surface.id <= 16);
  assert.ok(result.inner.id >= 1 && result.inner.id <= 16);
  assert.match(result.combination.code, /^\d{2}×\d{2}$/);
  assert.ok(result.combination.identity.length > 40);
  assert.equal(result.tarotSelections.length, 3);
  assert.equal(result.tarotScores.surface.length, 6);
  assert.equal(result.tarotScores.inner.length, 6);
  assert.notDeepEqual(result.tarotScores.surface, result.tarotScores.inner);
});

test("タロット3枚は位置と正逆を含む性質スコアとしてクロス解析に参加する", () => {
  const upright = tarotTraitScores([{...TAROT[0],reversed:false},{...TAROT[4],reversed:false},{...TAROT[19],reversed:false}],"surface");
  const reversed = tarotTraitScores([{...TAROT[0],reversed:true},{...TAROT[4],reversed:true},{...TAROT[19],reversed:true}],"surface");
  assert.equal(upright.length, 6);
  assert.notDeepEqual(upright, reversed);
  assert.ok(upright.every(value => value >= 1 && value <= 5));
});

test("16×16の256組み合わせがすべて存在しコードが重複しない", () => {
  const combinations = allCombinations();
  assert.equal(combinations.length, 256);
  assert.equal(new Set(combinations.map(item => item.code)).size, 256);
  for (const combo of combinations) {
    assert.ok(combo.love.length > 40);
    assert.ok(combo.work.length > 40);
    assert.ok(combo.money.length > 30);
    assert.ok(combo.growth.length > 20);
  }
});

test("タロットは22枚を重複なくシャッフルし各カードに解釈を持つ", () => {
  let seed = 7;
  const random = () => ((seed = seed * 16807 % 2147483647) - 1) / 2147483646;
  const deck = shuffleTarot(random);
  assert.equal(deck.length, 22);
  assert.equal(new Set(deck.map(card => card.id)).size, 22);
  assert.ok(deck.every(card => card.key && card.meaning && card.caution));
});

test("恋愛・友達・仕事の相性を表×裏で計算する", () => {
  for (const mode of ["love","friend","work"]) {
    const result = calculateCompatibility(1,2,7,8,mode);
    assert.ok(result.score >= 52 && result.score <= 97);
    assert.ok(result.attraction.length > 20);
    assert.ok(result.friction.length > 20);
    assert.ok(result.advice.length > 20);
  }
});

test("共有コードに個人情報を含めず結果を復元できる", () => {
  const surface=CHARACTERS[0],inner=CHARACTERS[1];
  const result={surface,inner,combination:buildCombination(1,2),tarotSelections:[{...TAROT[0],reversed:false},{...TAROT[10],reversed:true},{...TAROT[21],reversed:false}]};
  const code=encodeSharedResult(result);
  assert.equal(code,"01-02-0u.10r.21u");
  assert.ok(!code.includes("2000"));
  const decoded=decodeSharedResult(code);
  assert.equal(decoded.surface.id,1);
  assert.equal(decoded.inner.id,2);
  assert.equal(decoded.tarotSelections.length,3);
});

test("表示ソースに禁止された unavailable を含まない", async () => {
  const sources=await Promise.all(["../src/app.js","../src/data.js","../src/engine.js"].map(path=>readFile(new URL(path,import.meta.url),"utf8")));
  assert.ok(sources.every(source=>!source.toLowerCase().includes("unavailable")));
});
