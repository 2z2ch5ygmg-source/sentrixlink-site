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
  // 라인 가운데 선(게임 이동 격자에서 읽음). p = 0 우리(블루) 1차 포탑 앞 → 1 상대 1차 포탑 앞
  const LANES = { T: [[8.5, 29.5], [8.5, 14], [7, 11.2], [8.2, 8.6], [11, 7.4], [18.5, 7.2], [29, 7.2]], M: [[39.6, 56.8], [60.7, 42.5]], B: [[71.2, 90.6], [86, 90.6], [89.5, 86], [91.5, 80], [91.8, 70]] };
  function lanePt(l, p) {
    const L = LANES[l], seg = []; let tot = 0;
    for (let i = 1; i < L.length; i++) { const d = Math.hypot(L[i][0] - L[i - 1][0], L[i][1] - L[i - 1][1]); seg.push(d); tot += d; }
    let rest = Math.max(0, Math.min(1, p)) * tot;
    for (let i = 0; i < seg.length; i++) { if (rest <= seg[i] || i === seg.length - 1) { const t = seg[i] ? Math.min(1, rest / seg[i]) : 0; return [Math.round((L[i][0] + (L[i + 1][0] - L[i][0]) * t) * 10) / 10, Math.round((L[i][1] + (L[i + 1][1] - L[i][1]) * t) * 10) / 10]; } rest -= seg[i]; }
    return L[L.length - 1];
  }
  // 웨이브: { 라인: { p, us, them } } — us·them = 남은 미니언 수. 라인전 기본 = 라인 가운데 6:6
  const WAVE_DEFAULT = { lane: { T: { p: 0.5, us: 6, them: 6 }, M: { p: 0.5, us: 6, them: 6 }, B: { p: 0.5, us: 6, them: 6 } } };
  const LANE_KO = { T: "탑", M: "미드", B: "바텀" };
  // 장면의 웨이브 → 그릴 점(우리 묶음·상대 묶음 자리)과 우리 미니언 시야(1100)
  function waves(sc) {
    const W = { ...(WAVE_DEFAULT[sc.ph] || {}), ...(sc.waves || {}) }; if (!Object.keys(W).length) return [];
    return Object.entries(W).map(([l, w]) => {
      const gap = 0.022, flip = sc.red ? (q) => [Math.round((100 - q[0]) * 10) / 10, Math.round((100 - q[1]) * 10) / 10] : (q) => q;
      return { l, ko: LANE_KO[l], us: w.us, them: w.them, note: w.t || "", usAt: flip(lanePt(l, w.p)), themAt: flip(lanePt(l, w.p + (w.them && w.us ? gap : 0))) };
    });
  }
  const RED = (p) => [Math.round((100 - p[0]) * 10) / 10, Math.round((100 - p[1]) * 10) / 10];
  // sc 를 받아, 비어 있는 역할을 채운 토큰 목록과 미니언 시야를 돌려준다. 이미 있는 역할(같은 쪽)은 건드리지 않는다.
  function fill(sc, ph) {
    const P = SPOT[ph]; if (!P) return { add: {}, vis: [] };
    const have = { us: new Set(), them: new Set() };
    Object.values(sc.a || {}).forEach((t) => { const r = ROLE[t.c]; if (r && have[t.s]) have[t.s].add(r); });
    const flip = sc.red ? RED : (p) => p;
    const add = {};
    ["us", "them"].forEach((side) => Object.entries(P[side]).forEach(([r, at]) => {
      if (have[side].has(r) || (sc.gone || []).includes(`${side}:${r}`)) return;   // gone = 귀환·사망 등으로 맵에 없음
      add[`ctx-${side}-${r}`] = { c: CAST[side][r], s: side, at: flip(at), ctx: 1, role: r };
    }));
    return { add, vis: [] };
  }
  // 문제의 시점 글 → 시점 키
  function phaseOf(time) {
    const t = String(time || "");
    if (/시작/.test(t)) return "start";
    if (/라인전 중|첫 귀환|라인전$/.test(t)) return "lane";
    return "";
  }
  window.WORLD = { towers, fill, phaseOf, CAST, ROLE, LANES, lanePt, waves };
})();
