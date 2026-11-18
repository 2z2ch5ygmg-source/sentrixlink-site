// 전체 미니맵 맥락: 포탑 자리, 우리 팀 다섯 명의 기본 위치(시점별), 맞라인 상대의 기본 위치.
// 장면에 없는 우리 팀원은 시점(ph)에 맞는 자리에 채우고, 상대 라이너는 우리 시야 안일 때만 그린다(그 판정은 app.js).
// 좌표는 맵 % (왼쪽 위 0,0 · 블루 기지 왼쪽 아래). 게임 좌표 → % : x/147.5, 100 − y/148.
(function () {
  const g = (x, y) => [Math.round((x / 147.5) * 10) / 10, Math.round((100 - y / 148) * 10) / 10];
  // 포탑(게임 좌표, 라이엇 위치 자료) — b = 블루, r = 레드
  const T = [
    ["b", "top", "1차", 981, 10441], ["b", "top", "2차", 1512, 6699], ["b", "top", "억제기", 1169, 4287],
    ["b", "mid", "1차", 5846, 6396], ["b", "mid", "2차", 5048, 4812], ["b", "mid", "억제기", 3651, 3696],
    ["b", "bot", "1차", 10504, 1029], ["b", "bot", "2차", 6919, 1483], ["b", "bot", "억제기", 4281, 1253],
    ["b", "nex", "쌍둥이", 1748, 2270], ["b", "nex", "쌍둥이", 2177, 1807],
    ["r", "top", "1차", 4318, 13875], ["r", "top", "2차", 7943, 13411], ["r", "top", "억제기", 10481, 13650],
    ["r", "mid", "1차", 8955, 8510], ["r", "mid", "2차", 9767, 10113], ["r", "mid", "억제기", 11134, 11207],
    ["r", "bot", "1차", 13866, 4505], ["r", "bot", "2차", 13327, 8226], ["r", "bot", "억제기", 13624, 10572],
    ["r", "nex", "쌍둥이", 12611, 13084], ["r", "nex", "쌍둥이", 13052, 12612],
  ];
  const towers = T.map(([side, lane, kind, x, y]) => ({ side, lane, kind, at: g(x, y) }));
  // 이 자료의 고정 출전 명단(문제·장면에 나오는 챔프)
  const CAST = { us: { T: "Malphite", J: "Nunu", M: "Orianna", A: "Kaisa", S: "Nautilus" }, them: { T: "Rumble", J: "MonkeyKing", M: "Hwei", A: "Xayah", S: "Lulu" } };
  const ROLE = { Malphite: "T", Nunu: "J", Orianna: "M", Kaisa: "A", Nautilus: "S", Blitzcrank: "S", Leona: "S",
    Rumble: "T", MonkeyKing: "J", Hwei: "M", Xayah: "A", Zeri: "A", Lulu: "S" };
  // 블루(우리) 기준 시점별 자리. 상대 정글은 넣지 않는다(위치를 모른다).
  // start = 게임 시작 직후(라인으로 걸어가는 중), lane = 라인전 중(웨이브는 라인 가운데쯤)
  const SPOT = {
    start: { us: { T: [7, 27], J: [26.5, 47.5], M: [41.5, 57.5], A: [72, 91.5], S: [74, 90] },
             them: { T: [28, 6.5], M: [58, 42.5], A: [92.5, 73], S: [91, 74.5] } },
    lane: { us: { T: [8.3, 14.7], J: [27.6, 43.4], M: [46, 54], A: [80, 92], S: [82, 90.5] },
            them: { T: [9.5, 9.6], M: [53, 47], A: [88.3, 89.7], S: [90.7, 88.7] } },
  };
  // 라인전 중 우리 라인 미니언 시야(1100): 탑·미드·바텀 웨이브 자리
  const WAVES = { lane: { T: [8.4, 11.6, "우리 탑 라인 미니언"], M: [49.6, 50.4, "우리 미드 라인 미니언"], A: [86.6, 91, "우리 바텀 라인 미니언"] } };
  const RED = (p) => [Math.round((100 - p[0]) * 10) / 10, Math.round((100 - p[1]) * 10) / 10];
  // sc 를 받아, 비어 있는 역할을 채운 토큰 목록과 미니언 시야를 돌려준다. 이미 있는 역할(같은 쪽)은 건드리지 않는다.
  function fill(sc, ph) {
    const P = SPOT[ph]; if (!P) return { add: {}, vis: [] };
    const have = { us: new Set(), them: new Set() };
    Object.values(sc.a || {}).forEach((t) => { const r = ROLE[t.c]; if (r && have[t.s]) have[t.s].add(r); });
    const flip = sc.red ? RED : (p) => p;
    const add = {};
    ["us", "them"].forEach((side) => Object.entries(P[side]).forEach(([r, at]) => {
      if (have[side].has(r)) return;
      add[`ctx-${side}-${r}`] = { c: CAST[side][r], s: side, at: flip(at), ctx: 1, role: r };
    }));
    const vis = Object.entries((WAVES[ph] || {})).filter(([r]) => !(sc.noWave || []).includes(r)).map(([, v]) => { const p = flip(v); return [p[0], p[1], 1100, v[2]]; });
    return { add, vis };
  }
  // 문제의 시점 글 → 시점 키
  function phaseOf(time) {
    const t = String(time || "");
    if (/시작/.test(t)) return "start";
    if (/라인전 중|첫 귀환|라인전$/.test(t)) return "lane";
    return "";
  }
  window.WORLD = { towers, fill, phaseOf, CAST, ROLE };
})();
