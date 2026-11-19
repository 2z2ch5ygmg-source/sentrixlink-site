// 상대 연습 픽 계산 — tools/recent.py practice()와 같은 규칙. 연습 픽·판수는 등록 라인으로 한 판만(라인 바꿈 통계는 모든 판)(tools/test-practice.cjs가 두 결과가 같은지 확인).
// 「갱신하기」로 Worker(/games)에서 받은 상대 팀 경기와, 매일 0시 수집의 기준선(RECENT.practiceBase: 이전 랭크·숙련도)으로 다시 계산한다.
// games: [{ id, q, t, map, p:{라인:[팀ID, 승(1/0), 챔프ID, 실제 라인, 킬, 데스, 어시]}, b:{팀ID:[밴 챔프ID]} }]
(function (root) {
  const SR_QUEUES = new Set([0, 400, 420, 430, 440, 490]);
  const W = { custom: 4.0, five: 3.0, three: 2.0, duo: 1.5, solo: 1.0 };
  const RECENT_DAYS = 3, RECENT_MULT = 1.5;
  const NEW_MIN = 3, NEW_PRE_MAX = 1, NEW_MASTERY_MAX = 30000, LOW_SAMPLE = 3;
  const COMBO_PAIRS = [["A", "S", "bot"], ["J", "M", "jm"], ["T", "J", "tj"]];
  const ROLE_ORDER = ["T", "J", "M", "A", "S"];

  function gameWeight(q, n) {
    if (n >= 2 && q === 0) return W.custom;
    if (n >= 5) return W.five;
    if (n >= 3) return W.three;
    if (n === 2) return W.duo;
    return W.solo;
  }
  function readiness(g, w, kda) {
    if (g < LOW_SAMPLE) return "표본 적음";
    return w / g >= 0.5 && kda >= 2.5 ? "완성" : "연습 중";
  }
  // 파이썬 round(x, 1)과 같게: 정확히 반인 경우 짝수 쪽
  function round1(x) {
    const y = x * 10, f = Math.floor(y);
    if (y - f === 0.5) return (f % 2 === 0 ? f : f + 1) / 10;
    return Math.round(y) / 10;
  }
  const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const cmpList = (a, b) => { for (let i = 0; i < Math.min(a.length, b.length); i++) { const c = cmp(a[i], b[i]); if (c) return c; } return a.length - b.length; };
  const inc = (o, k, v = 1) => { o[k] = (o[k] || 0) + v; };

  // roles: 계정을 찾은 라인(분석 대상), base: { 라인: { preN, pre:{챔프:판}, mp:{챔프:숙련도} } }
  function compute(games, roles, base, sinceMs, nowMs) {
    const recentMs = RECENT_DAYS * 86400 * 1000;
    const pc = {}, posN = {}, posTg = {}, posCh = {}, gamesN = {};
    ROLE_ORDER.forEach((r) => { pc[r] = {}; posN[r] = {}; posTg[r] = {}; posCh[r] = {}; gamesN[r] = 0; });
    const combos = {}, bans = {};
    const tgs = { n: 0, custom: 0, five: 0, r3: 0, banGames: 0 };
    const sorted = games.slice().sort((a, b) => cmp(a.id, b.id));   // recent.py: sorted(set(mids))
    const seen = new Set();
    for (const m of sorted) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      const t0 = m.t || 0;
      if (t0 < sinceMs || !SR_QUEUES.has(m.q) || !(m.map == null || m.map === 11)) continue;
      const here = Object.entries(m.p || {}).filter(([r]) => roles.includes(r));
      if (!here.length) continue;
      const side = {}, order = [];
      here.forEach(([r, x]) => { if (!side[x[0]]) { side[x[0]] = {}; order.push(x[0]); } side[x[0]][r] = x; });
      const fresh = nowMs - t0 <= recentMs;
      for (const sideId of order) {
        const mem = side[sideId], keys = Object.keys(mem), n = keys.length;
        const wt = gameWeight(m.q, n) * (fresh ? RECENT_MULT : 1.0);
        for (const r of keys) {
          const [, win, c, pos, k, d, a] = mem[r];
          if (!c) continue;
          if (pos) {   // 라인 바꿈 통계는 모든 판으로
            inc(posN[r], pos);
            (posCh[r][pos] = posCh[r][pos] || {}); inc(posCh[r][pos], c);
            if (n >= 2) inc(posTg[r], pos);
          }
          if (pos !== r) continue;   // 연습 픽은 등록 라인으로 한 판만
          const x = pc[r][c] || (pc[r][c] = { g: 0, w: 0, k: 0, d: 0, a: 0, r3: 0, tg: 0, cu: 0, s: 0, pos: {}, posOrder: [] });
          x.g += 1; x.w += win ? 1 : 0; x.k += k || 0; x.d += d || 0; x.a += a || 0;
          x.r3 += fresh ? 1 : 0; x.s += wt;
          if (n >= 2) { x.tg += 1; if (m.q === 0) x.cu += 1; }
          if (!(pos in x.pos)) x.posOrder.push(pos);
          inc(x.pos, pos);
          gamesN[r] += 1;
        }
        if (n < 2) continue;
        tgs.n += 1; tgs.custom += m.q === 0 ? 1 : 0; tgs.five += n >= 5 ? 1 : 0; tgs.r3 += fresh ? 1 : 0;
        const win = !!mem[keys[0]][1];
        for (const [ra, rb, kind] of COMBO_PAIRS) {
          if (!mem[ra] || !mem[rb]) continue;
          const pa = mem[ra], pb = mem[rb];
          if ((pa[3] || ra) !== ra || (pb[3] || rb) !== rb) continue;
          const ca = pa[2], cb = pb[2];
          if (!ca || !cb) continue;
          const key = `${kind}|${ca}|${cb}`;
          const cx = combos[key] || (combos[key] = { kind, roles: [ra, rb], ids: [ca, cb], g: 0, w: 0, cu: 0, r3: 0, s: 0 });
          cx.g += 1; cx.w += win ? 1 : 0; cx.cu += m.q === 0 ? 1 : 0; cx.r3 += fresh ? 1 : 0; cx.s += wt;
        }
        if (n >= 3 || m.q === 0) {
          const ids = ((m.b || {})[sideId] || []).filter(Boolean);
          if (ids.length) tgs.banGames += 1;
          ids.forEach((b) => { const v = bans[b] || (bans[b] = [0, 0]); v[0] += 1; v[1] += m.q === 0 ? 1 : 0; });
        }
      }
    }
    const players = {}, swaps = [];
    for (const r of ROLE_ORDER) {
      if (!roles.includes(r)) continue;
      const b = (base && base[r]) || { preN: 0, pre: {}, mp: {} };
      const pre = b.pre || {}, preN = b.preN || 0, mast = b.mp || {};
      const hasBase = preN >= 10 || Object.keys(mast).length > 0;
      const picks = [];
      for (const [c, x] of Object.entries(pc[r])) {
        if (x.g < 2 && !x.cu) continue;
        const kda = round1((x.k + x.a) / Math.max(1, x.d));
        const isNew = hasBase && x.g >= NEW_MIN && (pre[c] || 0) <= NEW_PRE_MAX && (mast[c] || 0) < NEW_MASTERY_MAX;
        let role = r;
        if (x.posOrder.length) {   // 가장 많이 한 라인, 같으면 등록 라인, 그래도 같으면 먼저 나온 라인
          let best = null;
          for (const p of x.posOrder) { const key = [x.pos[p], p === r ? 1 : 0]; if (!best || key[0] > best[0][0] || (key[0] === best[0][0] && key[1] > best[0][1])) best = [key, p]; }
          role = best[1];
        }
        picks.push({ id: c, r: role, g: x.g, w: x.w, kda, r3: x.r3, tg: x.tg, cu: x.cu, pre: pre[c] || 0, mp: mast[c] || 0, new: isNew, ready: readiness(x.g, x.w, kda), s: round1(x.s) });
      }
      picks.sort((a, b) => b.s - a.s || b.g - a.g || cmp(a.id, b.id));
      players[r] = { n: gamesN[r], preN, picks: picks.slice(0, 6) };
      const tot = Object.values(posN[r]).reduce((a, v) => a + v, 0);
      Object.entries(posN[r]).sort((a, b) => b[1] - a[1] || cmp(a[0], b[0])).forEach(([to, g]) => {
        if (to === r) return;
        const tg = posTg[r][to] || 0;
        if ((g >= 3 && tot && g / tot >= 0.3) || tg >= 2) {
          const top = Object.entries(posCh[r][to] || {}).sort((a, b) => b[1] - a[1] || cmp(a[0], b[0])).slice(0, 3);
          swaps.push({ r, to, g, tg, of: tot, ids: top.map(([c]) => c) });
        }
      });
    }
    const comboList = Object.values(combos).filter((c) => c.g >= 2).sort((a, b) => b.s - a.s || b.g - a.g || cmp(a.kind, b.kind) || cmpList(a.ids, b.ids));
    comboList.forEach((c) => { c.s = round1(c.s); });
    const banList = Object.entries(bans).map(([id, v]) => ({ id, n: v[0], cu: v[1] })).sort((a, b) => b.n - a.n || b.cu - a.cu || cmp(a.id, b.id));
    return { players, combos: comboList.slice(0, 8), bans: banList.slice(0, 8), swaps, teamGames: tgs };
  }

  // 함께 한 경기(tools/recent.py groups와 같은 규칙): 이 팀 선수 2명 이상이 같은 편이었던 경기, 큐 무관, 최근 순
  //  {date:"MM-DD HH:MM"(한국 시각), queue, n, win, picks:{라인:챔프}, playedRole:{라인:실제 라인}}
  // 상대 팀은 Worker /groups(우리 팀 전용) 대신 /games 경기로 화면에서 만든다(사용자 요청 11-19: 우리팀 갱신하기 한 번에 상대도)
  function groups(games, roles) {
    const pad = (n) => String(n).padStart(2, "0");
    const kst = (ms) => { const d = new Date(ms + 9 * 3600e3); return `${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
    const out = [];
    (games || []).forEach((g) => {
      const bySide = {};
      roles.forEach((r) => { const x = g.p && g.p[r]; if (x) (bySide[x[0]] = bySide[x[0]] || []).push([r, x]); });
      Object.values(bySide).forEach((mem) => {
        if (mem.length < 2) return;
        out.push({ date: kst(g.t), queue: g.q, n: mem.length, win: !!mem[0][1][1],
          picks: Object.fromEntries(mem.map(([r, x]) => [r, x[2]])), playedRole: Object.fromEntries(mem.map(([r, x]) => [r, x[3] || ""])) });
      });
    });
    return out.sort((a, b) => cmp(b.date, a.date));
  }

  root.Practice = { compute, groups, gameWeight, RECENT_DAYS };
})(typeof window !== "undefined" ? window : globalThis);
