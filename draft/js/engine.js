// 추천·전략 계산 (화면과 분리된 순수 함수)
window.Engine = (function () {
  const { ROLES, ROLE_KO, COMPS, COUNTERS, LEVEL_KO, ORDER, STYLE_KO } = window.KB;
  const CH = {};
  window.CHAMPIONS.forEach((c) => (CH[c.id] = c));
  const COMP_KEYS = Object.keys(COMPS);

  const champ = (id) => CH[id];
  // 받침에 따라 조사 고르기: j("케이틀린", "이", "가") → "케이틀린이"
  function j(w, a, b) {
    const ch = String(w).trim().slice(-1).charCodeAt(0);
    if (ch < 0xac00 || ch > 0xd7a3) return w + a + "(" + b + ")";
    const jong = (ch - 0xac00) % 28;
    if (a === "으로") return w + (jong && jong !== 8 ? "으로" : "로");
    return w + (jong ? a : b);
  }
  const ko = (id) => (CH[id] ? CH[id].ko : id);

  // ---- 챔프폭 ----
  // op.gg 전적(tools/scout.py → js/scout.js)
  function scoutOf(team, role) {
    const S = window.SCOUT;
    const t = S && S.teams && team && S.teams[team.id];
    return t && t[role] && !t[role].error ? t[role] : null;
  }
  // 판수·승률(표본 보정)·숙련도 점수·라인 일치로 0~1 숙련 점수를 만든다
  function statEntry(x, total, role) {
    const c = CH[x.id];
    if (!c) return null;
    const g = x.g || 0;
    const wr = g ? (x.w / g) * 100 : 0;
    const wrS = (x.w + 5) / (g + 10);
    const vol = Math.min(1, g / 40);
    const wrPart = Math.max(0, Math.min(1, (wrS - 0.45) / 0.15)) * Math.min(1, g / 10);
    const mast = Math.min(1, (x.mp || 0) / 300000);
    const share = total && total.g ? g / total.g : 0;
    // 판수 비중이 큰 챔프는 라인과 상관없이 대회에서도 꺼낼 수 있는 주력으로 본다(예: 미드 브라이어 원챔)
    const one = g >= 25 && share >= 0.35;
    const onRole = c.pos.includes(role) || one || share >= 0.2;
    const score = (0.55 * vol + 0.3 * wrPart + 0.15 * mast) * (onRole ? 1 : 0.45);
    return { lv: score >= 0.6 ? 3 : score >= 0.35 ? 2 : 1, one, score: one ? Math.max(score, 0.9) : score, g, w: x.w || 0, wr, kda: x.kda, mp: x.mp || 0, share, scout: true };
  }
  const MANUAL_SCORE = { 3: 0.75, 2: 0.45, 1: 0.2 };
  function poolMap(team, role) {
    const m = {};
    const p = team && team.players[role];
    if (!p) return m;
    const sc = scoutOf(team, role);
    const stats = {};
    if (sc) sc.champs.forEach((x) => { const e = statEntry(x, sc.total, role); if (e) stats[x.id] = e; });
    const manual = p.pool || [];
    manual.forEach(([id, lv, one]) => {
      const st = stats[id];
      m[id] = { lv: lv || 1, one: !!one, score: one ? 1 : MANUAL_SCORE[lv || 1], manual: true };
      if (st) Object.assign(m[id], { g: st.g, w: st.w, wr: st.wr, kda: st.kda, mp: st.mp, score: Math.max(m[id].score, st.score), one: !!one || st.one });
    });
    // 직접 입력이 없는 라인은 전적 전체를, 있는 라인은 전적상 강한 챔프만 더한다
    Object.entries(stats).forEach(([id, e]) => {
      if (m[id] || e.score < 0.15) return;
      if (!manual.length || e.score >= 0.6 || e.one) m[id] = e;
    });
    // 판수가 적은 선수라도 라인이 비지 않게: 판수·숙련도 상위 3개는 남긴다
    if (!Object.keys(m).length) {
      Object.entries(stats).sort((a, b) => b[1].score - a[1].score || b[1].mp - a[1].mp).slice(0, 3).forEach(([id, e]) => (m[id] = e));
    }
    return m;
  }
  const lvScore = (e) => (!e ? 0 : e.one ? 3.6 : 1 + (e.score != null ? e.score : MANUAL_SCORE[e.lv] || 0.2) * 2.6);
  function statText(e) {
    if (!e) return "";
    if (e.g) return `${e.g}판 ${Math.round(e.wr)}%${e.one ? " · 원챔" : ""}`;
    if (e.mp && !e.manual) return `숙련도 ${Math.round(e.mp / 1000)}k`;
    return e.one ? "원챔" : LEVEL_KO[e.lv];
  }
  function teamHasPools(team) {
    return !!team && ROLES.some((r) => (team.players[r].pool || []).length || (scoutOf(team, r) && scoutOf(team, r).champs.length));
  }

  // ---- 조합 적합도 ----
  function fit(c, key) {
    const w = COMPS[key].w;
    return (c ? c.st : []).reduce((s, st) => s + (w[st] || 0), 0);
  }
  function compScores(ids) {
    return COMP_KEYS.map((k) => ({ key: k, score: ids.reduce((s, id) => s + fit(CH[id], k), 0) }))
      .sort((a, b) => b.score - a.score);
  }
  // ---- 메타 자료(tools/meta.py → js/meta.js) ----
  // a가 b를 라인에서 만났을 때 a의 승률 (op.gg 라인 상대 전적)
  function muWr(a, b) {
    const M = window.META;
    if (!M || !M.mu) return null;
    const ma = M.mu[a];
    if (ma) for (const r in ma) { const x = ma[r][b]; if (x) return { wr: x[0], g: x[1] }; }
    const mb = M.mu[b];
    if (mb) for (const r in mb) { const x = mb[r][a]; if (x) return { wr: 100 - x[0], g: x[1] }; }
    return null;
  }
  // a가 b 상대로 유리: 전적이 충분하면 실제 승률(52.5%↑), 아니면 기본 카운터 표
  function lanesCounter(a, b) {
    const d = muWr(a, b);
    if (d && d.g >= 150) return d.wr >= 52.5;
    return (COUNTERS[b] || []).includes(a);
  }
  const TIER_SCORE = { 0: 1, 1: 1, 2: 0.75, 3: 0.5, 4: 0.3, 5: 0.15 };
  function metaInfo(id, role) {
    const M = window.META;
    if (!M) return null;
    const pro = M.pro && M.pro[id];
    const sq = M.soloq && M.soloq[id] && (M.soloq[id][role] || Object.values(M.soloq[id])[0]);
    if (!pro && !sq) return null;
    const prio = pro ? pro.prio : 0;
    const score = Math.min(1, prio / 60) * 0.6 + (sq ? TIER_SCORE[sq.tier] || 0.1 : 0.1) * 0.4;
    return { prio, rp: pro ? pro.rp : 0, games: pro ? pro.p + pro.b : 0, tier: sq ? sq.tier : null, br: sq ? sq.br : 0, wr: sq ? sq.wr : null, score };
  }
  function metaText(m) {
    if (!m) return "";
    const a = [];
    if (m.prio) a.push(`대회 밴픽 우선도 ${Math.round(m.prio)}%`);
    if (m.tier) a.push(`솔랭 ${m.tier}티어`);
    return a.join(" · ");
  }

  // 팀 챔프폭으로 조합 하나 만들기 (exclude: 쓸 수 없는 챔프, fixed: {role:id})
  function buildComp(team, key, exclude, fixed) {
    exclude = exclude || new Set();
    fixed = fixed || {};
    const used = new Set(Object.values(fixed));
    const slots = {};
    let total = 0;
    // 챔프폭이 좁은 라인부터 채워서 겹침을 줄인다
    const order = ROLES.slice().sort((a, b) => Object.keys(poolMap(team, a)).length - Object.keys(poolMap(team, b)).length);
    let hasFront = Object.values(fixed).some((id) => CH[id] && CH[id].st.includes("front"));
    for (const r of order) {
      if (fixed[r]) { slots[r] = { id: fixed[r], lv: lvScore(poolMap(team, r)[fixed[r]]), fixed: true }; continue; }
      const pm = poolMap(team, r);
      let best = null;
      for (const id of Object.keys(pm)) {
        if (exclude.has(id) || used.has(id) || !CH[id]) continue;
        const c = CH[id];
        let s = lvScore(pm[id]) * 4 + fit(c, key) * 2;
        if (!hasFront && c.st.includes("front") && "TJS".includes(r)) s += 3;
        if (!best || s > best.s) best = { id, s, lv: lvScore(pm[id]) };
      }
      if (!best) {
        // 챔프폭이 없으면 그 라인 챔프 중 조합에 맞는 것을 제안
        for (const c of window.CHAMPIONS) {
          if (!c.pos.includes(r) || exclude.has(c.id) || used.has(c.id)) continue;
          const s = fit(c, key) * 2 + (c.pos[0] === r ? 1 : 0);
          if (!best || s > best.s) best = { id: c.id, s, lv: 0, suggest: true };
        }
      }
      if (best) {
        used.add(best.id);
        slots[r] = best;
        total += best.s;
        if (CH[best.id].st.includes("front")) hasFront = true;
      }
    }
    const ids = ROLES.map((r) => slots[r] && slots[r].id).filter(Boolean);
    const sc = compScores(ids);
    const comfort = ROLES.reduce((s, r) => s + (slots[r] ? slots[r].lv : 0), 0);
    return { key, slots, total, comfort, identity: sc[0].key, fitScore: (sc.find((x) => x.key === key) || {}).score || 0 };
  }

  function teamComps(team, exclude) {
    return COMP_KEYS.map((k) => buildComp(team, k, exclude))
      .filter((c) => c.identity === c.key || c.fitScore >= 9)
      .sort((a, b) => b.comfort * 3 + b.fitScore - (a.comfort * 3 + a.fitScore));
  }

  // 피어리스 세트별 조합 배분: 앞 세트에서 쓴 챔프는 다음 세트에서 제외
  function fearlessPlan(team, games) {
    const out = [];
    const used = new Set();
    for (let g = 0; g < games; g++) {
      const comps = COMP_KEYS.map((k) => buildComp(team, k, used));
      comps.sort((a, b) => b.comfort * 3 + b.fitScore - (a.comfort * 3 + a.fitScore));
      const pick = comps[0];
      out.push(pick);
      ROLES.forEach((r) => pick.slots[r] && used.add(pick.slots[r].id));
    }
    return out;
  }

  // ---- 드래프트 상태 ----
  function sideOf(state, who) {
    return who === "our" ? state.draft.ourSide : state.draft.ourSide === "B" ? "R" : "B";
  }
  function whoOfSide(state, side) { return side === state.draft.ourSide ? "our" : "enemy"; }
  function picks(state, who) {
    const side = sideOf(state, who);
    return state.draft.steps.map((s, i) => ({ ...s, i })).filter((s, i) => ORDER[i][0] === side && ORDER[i][1] === "pick" && s.champ);
  }
  function bans(state) { return state.draft.steps.filter((s, i) => ORDER[i][1] === "ban" && s.champ).map((s) => s.champ); }
  function taken(state) { return new Set(state.draft.steps.filter((s) => s.champ).map((s) => s.champ)); }
  function lockedFor(state, who) {
    const L = state.series.locked || [];
    if (state.series.mode === "off") return new Set();
    if (state.series.mode === "hard") return new Set(L.map((x) => x.id));
    return new Set(L.filter((x) => x.who === who).map((x) => x.id));
  }
  function available(state, who) {
    const t = taken(state);
    const lk = lockedFor(state, who);
    return window.CHAMPIONS.filter((c) => !t.has(c.id) && !lk.has(c.id));
  }
  function openRoles(state, who) {
    const used = new Set(picks(state, who).map((p) => p.role));
    return ROLES.filter((r) => !used.has(r));
  }
  function teamOf(state, who) {
    const id = who === "our" ? state.ourTeam : state.enemyTeam;
    return state.teams.find((t) => t.id === id);
  }

  // 픽된 챔프의 라인 추정 (챔프폭 우선)
  function guessRole(state, who, id) {
    const open = openRoles(state, who);
    if (!open.length) return null;
    const team = teamOf(state, who);
    let best = null;
    for (const r of open) {
      const pm = poolMap(team, r);
      const c = CH[id];
      let s = lvScore(pm[id]) * 3;
      const pi = c.pos.indexOf(r);
      if (pi === 0) s += 4; else if (pi > 0) s += 3 - pi * 0.5;
      if (!best || s > best.s) best = { r, s };
    }
    return best.r;
  }

  function direction(state, who) {
    const team = teamOf(state, who);
    const mine = picks(state, who).map((p) => p.champ);
    const avail = new Set(available(state, who).map((c) => c.id));
    const excl = new Set(window.CHAMPIONS.map((c) => c.id).filter((id) => !avail.has(id) && !mine.includes(id)));
    const fixed = {};
    picks(state, who).forEach((p) => p.role && (fixed[p.role] = p.champ));
    const hasPool = teamHasPools(team);
    let best = null;
    for (const k of COMP_KEYS) {
      const picked = mine.reduce((s, id) => s + fit(CH[id], k), 0);
      let pot = 0;
      if (hasPool) { const b = buildComp(team, k, excl, fixed); pot = b.fitScore * 0.35 + b.comfort * 0.6; }
      const s = picked * 1.4 + pot;
      if (!best || s > best.s) best = { key: k, s, picked };
    }
    if (!hasPool && !mine.length) return null;
    return best.key;
  }

  // ---- 추천 ----
  function strengthFactor(p) {
    const v = p && p.pts ? p.pts / 50 : 1;
    return Math.max(0.6, Math.min(1.5, v));
  }

  function recommendBan(state, who) {
    const opp = who === "our" ? "enemy" : "our";
    const oppTeam = teamOf(state, opp);
    const myTeam = teamOf(state, who);
    const oppOpen = openRoles(state, opp);
    const oppDir = picks(state, opp).length ? direction(state, opp) : null;
    const myPicks = picks(state, who);
    // 우리 주력: 아직 우리가 고를 수 있는(밴·픽·피어리스 잠금 아님) 상 숙련도 챔프, 비어 있는 라인만
    const myAvail = new Set(available(state, who).map((c) => c.id));
    const myOpen = openRoles(state, who);
    const myComfort = [];
    myOpen.forEach((r) => Object.entries(poolMap(myTeam, r)).forEach(([id, e]) => (e.lv >= 3 || e.one) && myAvail.has(id) && !myComfort.includes(id) && myComfort.push(id)));
    const res = [];
    for (const c of available(state, opp)) {
      const reasons = [];
      let s = 0, tgt = null;
      for (const r of oppOpen) {
        const e = poolMap(oppTeam, r)[c.id];
        if (!e) continue;
        const p = oppTeam.players[r];
        const f = strengthFactor(p);
        const v = Math.max(e.one ? 40 : 0, 8 + 34 * e.score) * f;
        if (v > s) {
          s = v;
          const t = e.one ? "원챔 차단" : e.g >= 15 && e.wr >= 60 ? "고승률 차단" : e.score >= 0.6 ? "숙련도 높음" : "상대 챔프폭";
          reasons[0] = { t, d: `${ROLE_KO[r]} ${p.riot.split("#")[0]} · ${statText(e)}`, v };
          tgt = r;
        }
      }
      const onRole = c.pos.some((r) => oppOpen.includes(r));
      if (!onRole && !s) continue;
      if (oppDir && onRole) {
        const f2 = fit(c, oppDir);
        if (f2 >= 2.5) { const v = 8 + f2 * 2; s += v; reasons.push({ t: `${COMPS[oppDir].short} 조합 차단`, d: `상대가 ${COMPS[oppDir].name} 방향`, v }); }
      }
      for (const p of myPicks) {
        if (lanesCounter(c.id, p.champ)) {
          const v = 12 + (c.pos.includes(p.role) ? 4 : 0);
          s += v; reasons.push({ t: "카운터 차단", d: `우리 ${ko(p.champ)} 상대로 강함`, v });
        }
      }
      {
        let k = 0;
        for (const id of myComfort) if (lanesCounter(c.id, id) && k < 2) { k++; s += 4; reasons.push({ t: "카운터 차단", d: `우리 ${ko(id)} 상대로 강함`, v: 4 }); }
      }
      if (c.pos.length >= 2 && onRole) s += 1;
      const mi = onRole ? metaInfo(c.id, c.pos.find((r) => oppOpen.includes(r))) : null;
      if (mi && mi.score >= 0.5) { const v = mi.score * (s >= 10 ? 4 : 7); s += v; reasons.push({ t: "메타 강세", d: metaText(mi), v }); }
      if (s < 3) continue;
      reasons.sort((a, b) => b.v - a.v);
      res.push({ id: c.id, score: s, label: reasons[0] ? reasons[0].t : "견제", reasons, tgt });
    }
    // 한 선수만 계속 밴하지 않도록: 같은 선수를 다시 노릴수록 점수를 낮춰 고른다
    res.sort((a, b) => b.score - a.score);
    const out = [], hits = {};
    const pool = res.slice(0, 30);
    while (out.length < 6 && pool.length) {
      let bi = 0, bv = -1;
      pool.forEach((r, i) => { const v = r.tgt ? r.score * Math.pow(0.7, hits[r.tgt] || 0) : r.score; if (v > bv) { bv = v; bi = i; } });
      const r = pool.splice(bi, 1)[0];
      if (r.tgt) hits[r.tgt] = (hits[r.tgt] || 0) + 1;
      out.push(r);
    }
    return out;
  }

  function recommendPick(state, who) {
    const opp = who === "our" ? "enemy" : "our";
    const team = teamOf(state, who);
    const oppTeam = teamOf(state, opp);
    const open = openRoles(state, who);
    if (!open.length) return [];
    const mine = picks(state, who);
    const theirs = picks(state, opp);
    const dir = direction(state, who);
    const pp = pickPlan(state, who);
    const threat = keyThreats(state, who);
    const nowRoles = (pp.plan.find((p) => p.idxs.includes(state.draft.idx)) || { items: [] }).items.filter((x) => !x.done && x.role).map((x) => x.role);
    const hasFront = mine.some((p) => CH[p.champ].st.includes("front"));
    const ad = mine.filter((p) => CH[p.champ].dmg === "AD").length;
    const ap = mine.filter((p) => CH[p.champ].dmg === "AP").length;
    const oppOpen = openRoles(state, opp);
    const res = [];
    for (const c of available(state, who)) {
      let best = null;
      for (const r of open) {
        const pm = poolMap(team, r);
        const e = pm[c.id];
        if (!e && !c.pos.includes(r)) continue;
        const reasons = [];
        let s = 0;
        const lv = lvScore(e);
        if (lv) { s += lv * 9; reasons.push({ t: lv >= 2.9 ? "숙련도 높음" : `숙련도 ${LEVEL_KO[e.lv]}`, d: `${ROLE_KO[r]} ${team.players[r].riot.split("#")[0]} · ${statText(e)}`, v: lv * 9 }); }
        else s -= teamHasPools(team) ? 8 : 0;
        if (!c.pos.includes(r)) s -= 4;
        const mi = metaInfo(c.id, r);
        if (mi && mi.score >= 0.45) { const v = mi.score * 4; s += v; reasons.push({ t: "메타 강세", d: metaText(mi), v }); }
        if (dir) {
          const f = fit(c, dir);
          if (f >= 2) { s += f * 2.5; reasons.push({ t: `${COMPS[dir].short} 조합`, d: `${COMPS[dir].name}에 맞음`, v: f * 2.5, comp: true }); }
        }
        if (!hasFront && c.st.includes("front") && "TJS".includes(r)) { s += 5; reasons.push({ t: "앞라인 보강", d: "아직 탱커가 없음", v: 5 }); }
        if (mine.length >= 2 && ad >= 2 && ap === 0 && (c.dmg === "AP" || c.dmg === "MX")) { s += 4; reasons.push({ t: "AP 딜 보강", d: "물리 딜만 있음", v: 4 }); }
        if (mine.length >= 2 && ap >= 2 && ad === 0 && (c.dmg === "AD" || c.dmg === "MX")) { s += 4; reasons.push({ t: "AD 딜 보강", d: "마법 딜만 있음", v: 4 }); }
        for (const t of theirs) {
          if (lanesCounter(c.id, t.champ)) {
            const same = t.role === r;
            const v = same ? 12 : 2;
            s += v; if (same) reasons.push({ t: "카운터 픽", d: `vs ${ko(t.champ)} 라인전 우위`, v });
          }
          if (lanesCounter(t.champ, c.id) && t.role === r) { s -= 10; reasons.push({ t: "주의", d: `${ko(t.champ)} 상대로 불리`, v: -10 }); }
        }
        for (const rr of oppOpen) {
          const e2 = poolMap(oppTeam, rr)[c.id];
          if (e2 && (e2.lv >= 2 || e2.one)) { const v = e2.one ? 8 : 3 + e2.score * 4; s += v; reasons.push({ t: "상대 주력 뺏기", d: `${ROLE_KO[rr]} ${oppTeam.players[rr].riot.split("#")[0]} · ${statText(e2)}`, v }); break; }
        }
        if (threat) {
          const th = threat.top;
          if ((th.type === "gank") && "TMAS".includes(r) && holdable(c)) { s += 4; reasons.push({ t: "갱 대비", d: `상대 정글 ${ko(th.champ)} 갱 버팀`, v: 4 }); }
          if (th.type !== "gank" && th.type !== "jungle" && th.r === r && th.champ && lanesCounter(c.id, th.champ)) { s += 6; reasons.push({ t: "요주의 대비", d: `상대 ${th.p.riot.split("#")[0]} ${ko(th.champ)} 상대로 유리`, v: 6 }); }
        }
        if (nowRoles.length) {
          if (nowRoles.includes(r)) { s += 8; reasons.push({ t: "픽 순서", d: `지금은 ${nowRoles.map((x) => ROLE_KO[x]).join("+")} 차례`, v: 8, order: true }); }
          else { s -= 18; reasons.push({ t: "나중에", d: `${j(ROLE_KO[r], "은", "는")} 뒤 순서에서`, v: -18 }); }
        }
        if (!best || s > best.s) best = { r, s, reasons };
      }
      if (!best) continue;
      if (best.s <= 0 && !best.reasons.some((x) => x.v > 0)) best.reasons.push({ t: `${ROLE_KO[best.r]} 기본 픽`, d: "챔프폭 정보 없음 · 라인 주 챔프", v: 0.1 });
      const pos = best.reasons.filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
      const compR = best.reasons.find((x) => x.comp);
      res.push({
        id: c.id, score: best.s, role: best.r,
        label: compR ? compR.t : pos[0] ? pos[0].t : "추천",
        reasons: best.reasons.sort((a, b) => b.v - a.v),
      });
    }
    return res.sort((a, b) => b.score - a.score).slice(0, 6);
  }

  // ---- 픽 순서 전략: 남은 우리 픽 차례에 어느 라인을 넣을지 ----
  function pickSlots(side) {
    const idx = ORDER.map((o, i) => (o[0] === side && o[1] === "pick" ? i : -1)).filter((i) => i >= 0);
    const groups = [];
    idx.forEach((i) => {
      const g = groups[groups.length - 1];
      if (g && g[g.length - 1] === i - 1) g.push(i); else groups.push([i]);
    });
    let n = 0;
    return groups.map((g) => { const nums = g.map(() => ++n); return { idxs: g, label: `${side === "B" ? "B" : "R"}${nums.join("·")}`, nums }; });
  }

  function roleOutlook(state, who, r) {
    const opp = who === "our" ? "enemy" : "our";
    const team = teamOf(state, who), oppTeam = teamOf(state, opp);
    const avail = new Set(available(state, who).map((c) => c.id));
    const banned = new Set(bans(state));
    const takenSet = taken(state);
    const locked = lockedFor(state, who);
    const pm = poolMap(team, r);
    const all = Object.entries(pm).sort((a, b) => lvScore(b[1]) - lvScore(a[1]));
    const mains = all.filter(([, e]) => lvScore(e) >= 2.9).map(([id, e]) => ({ id, e,
      st: banned.has(id) ? "밴" : locked.has(id) ? "피어리스" : takenSet.has(id) ? "픽됨" : "가능" }));
    const left = all.filter(([id]) => avail.has(id));
    const good = left.filter(([, e]) => lvScore(e) >= 2.2);
    const enemyLaner = picks(state, opp).find((p) => p.role === r);
    // 상대 라이너가 공개됐으면 그 상대로 유리한 챔프를 앞으로
    const cands = left.map(([id, e]) => {
      let v = lvScore(e);
      if (enemyLaner && lanesCounter(id, enemyLaner.champ)) v += 1.5;
      if (enemyLaner && lanesCounter(enemyLaner.champ, id)) v -= 1.5;
      return { id, e, v };
    }).sort((a, b) => b.v - a.v);
    const oppOpen = openRoles(state, opp);
    const best = cands[0];
    const contested = best && oppOpen.some((rr) => { const e2 = poolMap(oppTeam, rr)[best.id]; return e2 && (e2.one || e2.score >= 0.45); });
    return { r, mains, cands: cands.slice(0, 3), depth: good.length, best, enemyLaner, contested };
  }

  function pickPlan(state, who) {
    who = who || "our";
    const side = sideOf(state, who);
    const slots = pickSlots(side);
    const open = openRoles(state, who);
    const remainingIdx = slots.flatMap((s) => s.idxs).filter((i) => !state.draft.steps[i].champ);
    const bansLeft = ORDER.some(([, t], i) => t === "ban" && i >= state.draft.idx);
    const outlook = {};
    ROLES.forEach((r) => (outlook[r] = roleOutlook(state, who, r)));
    const oppWho = who === "our" ? "enemy" : "our";
    const oppTeamP = teamOf(state, oppWho);
    const oppAvailP = new Set(available(state, oppWho).map((c) => c.id));
    const scored = open.map((r) => {
      const o = outlook[r];
      const why = [];
      let u = 0;
      const bestName = o.best ? ko(o.best.id) : null;
      if (o.contested) { u += 3; why.push(`${j(bestName, "은", "는")} 상대도 잘 다룸 → 먼저 가져가기`); }
      if (o.best && o.depth <= 1) {
        u += bansLeft ? 3 : 1.5;
        why.push(bansLeft ? `쓸 만한 챔프가 ${bestName} 하나뿐 → 2차 밴 전에 확보` : `남은 주력이 ${bestName} 하나`);
      }
      const bannedMains = o.mains.filter((m) => m.st !== "가능").map((m) => `${ko(m.id)}(${m.st})`);
      if (bannedMains.length) why.push(`주력 ${bannedMains.join("·")} 잘림`);
      const solo = r === "T" ? 2.5 : r === "M" ? 1.2 : 0;
      // 상대 같은 라인 선수가 실제로 꺼낼 수 있는 챔프 중 우리 1순위의 카운터가 있는지
      let safe = false;
      if (o.best && !o.enemyLaner) {
        const theirs = Object.entries(poolMap(oppTeamP, r)).filter(([id, e]) => oppAvailP.has(id) && e.score >= 0.2).map(([id]) => id);
        const threats = theirs.filter((id) => lanesCounter(id, o.best.id));
        if (theirs.length >= 2 && !threats.length) {
          safe = true; u += 1.5;
          why.push(`상대 ${ROLE_KO[r]} 챔프폭에 ${bestName} 카운터 없음 → 먼저 뽑아도 안전`);
        } else if (threats.length) {
          u -= 1;
          why.push(`상대가 ${j(threats.slice(0, 2).map(ko).join("·"), "으로", "로")} ${bestName} 카운터 가능 → 뒤에`);
        }
      }
      if (!o.enemyLaner && solo && !safe) {
        u -= solo;
        if (o.best && (COUNTERS[o.best.id] || []).length >= 3) u -= 1;
        why.push(r === "T" ? "탑은 상대 탑을 보고 카운터로 뽑기" : "미드는 상대 미드 확인 후가 안전");
      }
      // 메타 선픽 가치: 대회에서 밴픽이 많고 일찍 뽑히는 챔프는 먼저 확보
      const mi = o.best ? metaInfo(o.best.id, r) : null;
      if (mi && (mi.prio >= 40 || (mi.rp && mi.rp <= 1.7 && mi.games >= 200))) {
        u += 1.5; why.push(`${bestName} 대회 밴픽 우선도 ${Math.round(mi.prio)}%${mi.rp ? `·평균 ${mi.rp}라운드 픽` : ""} → 먼저 확보`);
      }
      if (o.enemyLaner) {
        const ctr = o.cands.find((c) => lanesCounter(c.id, o.enemyLaner.champ));
        u += 0.5;
        why.push(ctr ? `상대 ${ko(o.enemyLaner.champ)} 공개 → ${j(ko(ctr.id), "으로", "로")} 바로 카운터 가능` : `상대 ${ko(o.enemyLaner.champ)} 공개됨`);
      }
      if (r === "J" || r === "S") { u += 1; if (!why.length) why.push(r === "J" ? "정글은 초반 동선·조합 축이라 먼저" : "서폿은 조합 이니시 축이라 먼저"); }
      if (o.best && CH[o.best.id].pos.length >= 2 && open.some((x) => x !== r && CH[o.best.id].pos.includes(x))) {
        u += 1.5; why.push(`${j(bestName, "은", "는")} 여러 라인 가능 → 라인을 숨긴 채 먼저`);
      }
      if (!o.best) { u -= 1; why.push("챔프폭이 비어 있음 — 상대 픽을 보고 결정"); }
      return { r, u, why };
    }).sort((a, b) => b.u - a.u);

    // 남은 픽 칸에 순서대로 배치 + 바텀은 연속 두 칸이 있으면 세트로
    let order = scored.map((x) => x.r);
    const freeSlots = slots.map((s) => ({ ...s, free: s.idxs.filter((i) => !state.draft.steps[i].champ) })).filter((s) => s.free.length);
    let duo = false;
    if (order.includes("A") && order.includes("S")) {
      const pair = freeSlots.filter((s) => s.free.length === 2);
      if (pair.length) {
        const posOf = (s) => remainingIdx.indexOf(s.free[0]);
        const first = Math.min(order.indexOf("A"), order.indexOf("S"));
        const target = pair.sort((a, b) => Math.abs(posOf(a) - first) - Math.abs(posOf(b) - first))[0];
        const p = posOf(target);
        order = order.filter((x) => x !== "A" && x !== "S");
        order.splice(Math.min(p, order.length), 0, "A", "S");
        duo = true;
      }
    }
    let k = 0;
    const lastIdx = remainingIdx[remainingIdx.length - 1];
    const plan = slots.map((s) => {
      const items = s.idxs.map((i) => {
        const st = state.draft.steps[i];
        if (st.champ) return { i, done: true, champ: st.champ, role: st.role };
        const r = order[k++];
        if (!r) return { i, done: false };
        const sc = scored.find((x) => x.r === r);
        const why = sc.why.slice();
        if (i === lastIdx && remainingIdx.length > 1) why.unshift("마지막 픽 — 상대 픽을 다 보고 결정");
        if (side === "B" && i === 6) why.unshift("블루 1픽 — 밴에서 살아남은 가장 강한 챔프 선점");
        const isDuo = duo && (r === "A" || r === "S");
        if (isDuo) why.unshift("바텀 세트 — 원딜·서폿을 같은 차례에 함께");
        return { i, done: false, role: r, cands: outlook[r].cands, why, duo: isDuo };
      });
      return { label: s.label, idxs: s.idxs, items, now: s.idxs.includes(state.draft.idx) };
    });
    const nextRoles = plan.flatMap((p) => p.items).filter((x) => !x.done && x.role);
    const summary = [];
    if (nextRoles.length) {
      const seq = plan.filter((p) => p.items.some((x) => !x.done && x.role)).map((p) => `${p.label} ${p.items.filter((x) => !x.done && x.role).map((x) => ROLE_KO[x.role]).join("+")}`);
      summary.push(`${side === "B" ? "블루" : "레드"} 진영 픽 순서: ${seq.join(" → ")}`);
    }
    if (duo) summary.push("원딜·서폿은 연속 두 칸에서 세트로 — 라인전 시너지를 맞추고 상대가 바텀 조합을 보고 대응하지 못하게");
    const cut = ROLES.filter((r) => outlook[r].mains.some((m) => m.st !== "가능"));
    if (cut.length) summary.push(`주력이 잘린 라인: ${cut.map((r) => `${ROLE_KO[r]}(${outlook[r].mains.filter((m) => m.st !== "가능").map((m) => ko(m.id)).join("·")})`).join(", ")}`);
    return { side, plan, summary, outlook, nextRole: nextRoles[0] ? nextRoles[0].role : null, order };
  }

  // ---- 요주의 인물: 상대에서 가장 위험한 선수와 그에 맞춘 라인별 움직임·조합 ----
  function keyThreats(state, who) {
    who = who || "our";
    const opp = who === "our" ? "enemy" : "our";
    const oppTeam = teamOf(state, opp), myTeam = teamOf(state, who);
    const oppAvail = new Set(available(state, opp).map((c) => c.id));
    const theirPicks = picks(state, opp);
    const list = ROLES.map((r) => {
      const p = oppTeam.players[r];
      const pm = poolMap(oppTeam, r);
      const sc = scoutOf(oppTeam, r);
      const picked = theirPicks.find((x) => x.role === r);
      let champId = picked ? picked.champ : null;
      if (!champId) {
        const best = Object.entries(pm).filter(([id]) => oppAvail.has(id)).sort((a, b) => b[1].score - a[1].score)[0];
        champId = best ? best[0] : null;
      }
      const e = champId ? pm[champId] : null;
      const why = [];
      let t = (p.pts || 40) / 10;
      if ((p.pts || 0) >= 60) why.push(`${p.tier} (${p.pts}점)`);
      if (e) { t += e.score * 6; if (e.g) why.push(`${ko(champId)} ${statText(e)}`); }
      else if (picked) t += 0.4 * 6; // 기록에 없는 챔프를 꺼냈어도 선수 기본 실력은 남는다
      if (e && e.one) t += 3;
      if (sc && sc.total && sc.total.g >= 50) {
        const wr = sc.total.w / sc.total.g;
        t += (wr - 0.5) * 20;
        if (wr >= 0.55) why.push(`시즌 ${sc.total.g}판 승률 ${Math.round(wr * 100)}%`);
      }
      const gank = r === "J" && champId && window.KB.GANK.includes(champId);
      if (gank) { t += picked ? 5 : 2; why.push("초반 갱킹이 강한 정글"); }
      if (champId && CH[champId].st.includes("carry")) t += 1;
      if (picked) t += 1;
      return { r, p, champ: champId, e, picked: !!picked, t, why, type: gank ? "gank" : r === "J" ? "jungle" : (champId && CH[champId].st.includes("carry")) || r === "A" ? "carry" : "lane" };
    }).sort((a, b) => b.t - a.t);
    const top = list[0];
    if (!top) return null;
    return { top, second: list[1], advice: threatAdvice(state, who, top), list };
  }

  // 우리 챔프폭에서 조건에 맞는 아직 쓸 수 있는 챔프
  function ourPoolWhere(state, who, role, test) {
    const team = teamOf(state, who);
    const avail = new Set(available(state, who).map((c) => c.id));
    return Object.entries(poolMap(team, role)).filter(([id]) => avail.has(id) && test(CH[id], id))
      .sort((a, b) => lvScore(b[1]) - lvScore(a[1])).map(([id]) => id).slice(0, 3);
  }
  const holdable = (c) => c.st.includes("prot") || window.KB.SLIPPERY.includes(c.id);
  const punisher = (c) => c.st.includes("eng") && c.st.includes("cc");

  function threatAdvice(state, who, th) {
    const name = th.p.riot.split("#")[0];
    const champ = th.champ ? ko(th.champ) : "주력";
    const lanes = {};
    let comp = null;
    const opts = [];
    if (th.type === "gank" || th.type === "jungle") {
      const hold = { A: ourPoolWhere(state, who, "A", holdable), S: ourPoolWhere(state, who, "S", holdable) };
      const fight = { S: ourPoolWhere(state, who, "S", punisher), J: ourPoolWhere(state, who, "J", (c) => c.st.includes("cc") || c.st.includes("eng")) };
      comp = th.type === "gank" ? `상대 정글 ${champ}의 초반 갱이 핵심 — 바텀은 버티는 조합이나 받아치는 조합으로` : `상대 정글 ${j(name, "이", "가")} 운영의 중심 — 정글 싸움에서 밀리지 않게`;
      opts.push({ t: "버티기", d: "보호형 서폿 + 이동기 있는 원딜. 갱이 와도 살아서 CS를 지킵니다.", picks: [...hold.A, ...hold.S] });
      opts.push({ t: "받아치기", d: "CC 많은 서폿 + 우리 정글이 바텀 근처 대기. 상대 갱을 역으로 잡습니다.", picks: [...fight.S, ...fight.J] });
      lanes.T = "강가 와드 1개 이상 유지, 상대 정글 위치가 안 보이면 라인을 당겨서 받기";
      lanes.J = `상대 ${champ} 첫 갱 타이밍(3레벨·6레벨)에 갱 올 라인 근처에서 역갱 대기 — 반대편 카운터 정글은 시야가 있을 때만`;
      lanes.M = "양쪽 강가 시야를 먼저 확보하고, 바텀·탑에 갱이 보이면 바로 합류";
      lanes.A = "3레벨 전후 무리한 딜교 금지, 체력이 빠지면 바로 라인 당기기";
      lanes.S = "바텀 강가·삼거리 와드를 3분 전에 깔고, 정글 위치 핑을 계속 공유";
    } else {
      const r = th.r;
      const answers = ourPoolWhere(state, who, r, (c, id) => th.champ && lanesCounter(id, th.champ));
      const safe = ourPoolWhere(state, who, r, (c, id) => !(th.champ && lanesCounter(th.champ, id)) && (c.st.includes("front") || holdable(c)));
      comp = `상대 ${ROLE_KO[r]} ${name}의 ${j(champ, "이", "가")} 가장 위험 — ${j(ROLE_KO[r], "은", "는")} 버티고 정글이 그쪽을 먼저 챙기기`;
      opts.push({ t: "카운터", d: `${champ} 상대로 라인전이 편한 챔프`, picks: answers });
      opts.push({ t: "안정형", d: "라인전에서 크게 지지 않는 챔프로 버티고 다른 라인에서 이기기", picks: safe });
      if (th.type === "carry") {
        const press = ourPoolWhere(state, who, "S", punisher);
        opts.push({ t: "성장 막기", d: "초반 2:2에서 압박해 상대 원딜 성장을 끊는 CC 서폿", picks: press });
      }
      ROLES.forEach((x) => (lanes[x] = x === r ? `${champ} 상대로 무리하지 말고 CS·체력 유지, 정글 도움 오면 그때 싸우기`
        : x === "J" ? `${ROLE_KO[r]} 쪽 시야·커버 우선, ${champ} 성장을 막는 갱이 1순위` : `${j(ROLE_KO[r], "이", "가")} 버티는 동안 ${ROLE_KO[x]}에서 이득 만들기`));
    }
    return { comp, opts: opts.filter((o) => o.picks.length), lanes, name, champ };
  }

  // ---- 밴픽 완료 후 전략 ----
  function buildStrategy(state) {
    const our = picks(state, "our");
    const en = picks(state, "enemy");
    const ourTeam = teamOf(state, "our");
    const enTeam = teamOf(state, "enemy");
    const oc = compScores(our.map((p) => p.champ));
    const ec = compScores(en.map((p) => p.champ));
    const ok = oc[0].key, ek = ec[0].key;
    const O = COMPS[ok], E = COMPS[ek];
    let matchup;
    if (O.beats.includes(ek)) matchup = { tone: "good", t: `조합 상성 유리 — 우리 ${j(O.short, "이", "가")} 상대 ${j(E.short, "을", "를")} 잡는 구도입니다.` };
    else if (E.beats.includes(ok)) matchup = { tone: "bad", t: `조합 상성 불리 — 상대 ${j(E.short, "이", "가")} 우리 ${j(O.short, "을", "를")} 잡는 구도입니다. 아래 대처를 먼저 공유하세요.` };
    else matchup = { tone: "even", t: `조합 상성 비슷 — 라인전과 오브젝트 운영에서 차이가 납니다.` };

    const byRole = (arr) => { const m = {}; arr.forEach((p) => (m[p.role] = p.champ)); return m; };
    const om = byRole(our), em = byRole(en);
    const lanes = ROLES.map((r) => {
      const a = om[r], b = em[r];
      if (!a || !b) return { r, a, b, tone: "even", t: "라인 정보 없음" };
      const pa = ourTeam.players[r].pts || 0, pb = enTeam.players[r].pts || 0;
      let sc = 0; const notes = [];
      if (lanesCounter(a, b)) { sc += 2; notes.push(`${j(ko(a), "이", "가")} ${ko(b)} 상대로 라인전 우위`); }
      if (lanesCounter(b, a)) { sc -= 2; notes.push(`${j(ko(b), "이", "가")} ${ko(a)} 상대로 강함`); }
      const cvA = CH[a].cv, cvB = CH[b].cv;
      if (cvA === "E" && cvB === "L") { sc += 1; notes.push("초반은 우리가 강함 — 6레벨 전 압박"); }
      if (cvA === "L" && cvB === "E") { sc -= 1; notes.push("초반은 상대가 강함 — CS 위주로 버티기"); }
      const gap = pa - pb;
      if (gap >= 20) { sc += 1; notes.push(`티어 점수 우위 (${pa} vs ${pb})`); }
      if (gap <= -20) { sc -= 1; notes.push(`티어 점수 열세 (${pa} vs ${pb})`); }
      const tone = sc >= 2 ? "good" : sc <= -2 ? "bad" : "even";
      const plan = tone === "good" ? "주도권 라인 — 정글 첫 동선을 이쪽으로" : tone === "bad" ? "버티는 라인 — 와드 넉넉히, 정글이 커버" : "무난 — 정글 위치에 맞춰 주도권 교환";
      return { r, a, b, tone, sc, t: notes.length ? notes.join(" · ") : "비슷한 라인전", plan };
    });
    const strong = lanes.filter((l) => l.tone === "good").map((l) => ROLE_KO[l.r]);
    const weak = lanes.filter((l) => l.tone === "bad").map((l) => ROLE_KO[l.r]);
    const botSide = lanes.find((l) => l.r === "A").tone === "good" || lanes.find((l) => l.r === "S").tone === "good";
    const jg = strong.includes("탑") && !botSide
      ? "탑 쪽에서 시작해 탑 갱 → 전령·유충 우선, 용은 교환"
      : botSide ? "바텀 쪽에서 끝나도록 동선을 짜고 첫 용 싸움을 준비"
      : weak.length ? `${weak.join("·")} 라인 커버 위주, 상대 정글 반대편에서 이득 챙기기`
      : "상대 정글 시작 위치 확인 후 반대편 오브젝트 챙기기";

    const threats = en.map((p) => CH[p.champ]).filter((c) => c.st.some((s) => ["eng", "carry", "burst", "dive"].includes(s)))
      .map((c) => `${c.ko} (${c.st.filter((s) => ["eng", "carry", "burst", "dive", "pick"].includes(s)).map((s) => STYLE_KO[s]).join("·")})`);
    const enCarry = (en.find((p) => CH[p.champ].st.includes("carry")) || en.find((p) => p.role === "A") || en[0]);
    const engagers = our.filter((p) => CH[p.champ].st.includes("eng")).map((p) => ko(p.champ));
    const peelers = our.filter((p) => CH[p.champ].st.includes("prot") && !CH[p.champ].st.includes("eng")).map((p) => ko(p.champ));
    const curve = (arr) => arr.reduce((s, p) => s + ({ E: -1, M: 0, L: 1 })[CH[p.champ].cv], 0);
    const cO = curve(our), cE = curve(en);
    const timing = cO < cE - 1 ? "우리가 초반에 강합니다. 20분 안에 오브젝트로 격차를 벌리고 끝내세요."
      : cO > cE + 1 ? "우리가 후반에 강합니다. 초반 무리한 싸움을 피하고 30분 이후 한타를 노리세요."
      : "파워 타이밍이 비슷합니다. 첫 오브젝트(유충·용) 결과가 흐름을 정합니다.";

    const answer = E.beats.includes(ok) ? counterAdvice(ok, ek) : null;
    const scenarios = [
      { t: "앞설 때", d: `${O.mid} 상대 ${j(ko(enCarry.champ), "이", "가")} 성장하기 전에 바론 시야를 먼저 잡습니다.` },
      { t: "뒤처질 때", d: `${weak.length ? weak.join("·") + " 라인은 포탑 근처에서 받고, " : ""}웨이브를 정리하며 상대 ${E.short} 조합의 실수(무리한 진입·흩어짐)를 기다립니다. 오브젝트는 1개씩만 교환합니다.` },
      { t: "한타 순서", d: `${engagers.length ? j(engagers.join("·"), "이", "가") + " 진입 → " : ""}${peelers.length ? j(peelers.join("·"), "은", "는") + " 우리 딜러 보호 → " : ""}목표는 ${ko(enCarry.champ)}. 상대 ${threats[0] ? threats[0].replace(/ \(.*$/, "") + "의 주요 스킬" : "핵심 스킬"}이 빠진 뒤 싸웁니다.` },
    ];
    const jungle = jungleGuide(state, lanes, ok, cO, cE);
    return { ok, ek, O, E, matchup, lanes, jg, threats, timing, answer, scenarios, enCarry, jungle };
  }

  // ---- 정글 기준: 어느 라인을 풀어 줄지, 언제 어떻게 힘을 뿌릴지 ----
  function jungleGuide(state, lanes, ok, cO, cE) {
    const SLIP = window.KB.SLIPPERY;
    const our = picks(state, "our"), en = picks(state, "enemy");
    const om = {}, emap = {};
    our.forEach((p) => (om[p.role] = p.champ));
    en.forEach((p) => (emap[p.role] = p.champ));
    const ourJg = om.J && CH[om.J], enJg = emap.J && CH[emap.J];
    const laneSc = {};
    lanes.forEach((l) => (laneSc[l.r] = l.sc || 0));
    const has = (id, ...tags) => !!id && CH[id] && tags.some((t) => CH[id].st.includes(t));
    const jgCc = ourJg && has(om.J, "cc", "eng", "pick");
    const groups = [
      { key: "top", name: "탑", roles: ["T"], obj: "유충·전령" },
      { key: "mid", name: "미드", roles: ["M"], obj: "양쪽 강가 오브젝트" },
      { key: "bot", name: "바텀", roles: ["A", "S"], obj: "용" },
    ];
    const ranks = groups.map((g) => {
      const reasons = [];
      let s = 0;
      const adv = g.roles.reduce((x, r) => x + (laneSc[r] || 0), 0);
      s += adv * 1.3;
      if (adv >= 2) reasons.push("라인전 우위라 갱이 쉽게 이어짐");
      else if (adv <= -2) reasons.push("라인전 불리 — 갱보다 역갱·커버 위주");
      const follow = g.roles.filter((r) => has(om[r], "cc", "eng", "burst")).map((r) => ko(om[r]));
      if (follow.length) { s += Math.min(2, follow.length) * 1.2; reasons.push(`${follow.join("·")}의 CC·딜로 갱 마무리 가능`); }
      const slip = g.roles.filter((r) => emap[r] && SLIP.includes(emap[r])).map((r) => ko(emap[r]));
      if (slip.length) { s -= slip.length * 1.5; reasons.push(`상대 ${j(slip.join("·"), "은", "는")} 이동기가 있어 갱 성공률 낮음`); }
      const carry = g.roles.filter((r) => has(om[r], "carry", "scale", "burst") && r !== "S").map((r) => ko(om[r]));
      if (carry.length) { s += 1; reasons.push(`${carry.join("·")} 성장이 팀 딜로 이어짐`); }
      const threat = g.roles.filter((r) => has(emap[r], "carry", "scale")).map((r) => ko(emap[r]));
      if (threat.length) { s += 1; reasons.push(`상대 ${threat.join("·")} 성장 억제`); }
      if (g.key === "bot" && (ok === "eng" || ok === "skirm" || ok === "prot")) { s += 1; reasons.push("우리 조합이 용 한타에 강함"); }
      if (g.key === "top" && (ok === "split" || ok === "dive")) { s += 1; reasons.push("유충·전령으로 사이드 압박 연결"); }
      if (g.key === "mid") { s += 0.5; reasons.push("미드 주도권이 양쪽 오브젝트 합류 속도를 정함"); }
      if (jgCc && adv >= 0) s += 0.5;
      const verdict = adv <= -2 ? "커버" : s >= 3 ? "집중 투자" : s >= 1 ? "기회 갱" : "최소 관리";
      return { ...g, score: s, adv, reasons, verdict };
    }).sort((a, b) => b.score - a.score);

    const first = ranks[0];
    const cover = ranks.filter((x) => x.verdict === "커버");
    const startSide = first.key === "top" ? "봇 쪽(아래)에서 시작해 탑 쪽에서 첫 정리를 끝내기"
      : first.key === "bot" ? "탑 쪽(위)에서 시작해 봇 쪽에서 첫 정리를 끝내기"
      : "강가 스커틀 싸움이 가능한 쪽으로 정리를 끝내고 미드 갱";
    const ourE = ourJg ? ourJg.cv : "M", enE = enJg ? enJg.cv : "M";
    const jgDuel = ourE === "E" && enE !== "E" ? `우리 정글(${ourJg.ko})이 초반에 강함 — 상대 정글 동선 반대편이 아니라 같은 쪽으로 가서 카운터 정글·스커틀 싸움`
      : enE === "E" && ourE !== "E" ? `상대 정글(${enJg ? enJg.ko : "?"})이 초반에 강함 — 첫 정리 동안 침입 주의, 3레벨 전 1:1 싸움 금지`
      : "정글 초반 힘은 비슷 — 라인 주도권이 있는 쪽 싸움만 받기";

    // 6레벨 강한 궁극기: 이니시·순간딜 챔프
    const ult6 = our.filter((p) => has(p.champ, "eng", "burst") && p.role !== "J").map((p) => ({ name: ko(p.champ), role: ROLE_KO[p.role] }));
    const early = our.filter((p) => CH[p.champ].cv === "E").map((p) => ko(p.champ));
    const late = our.filter((p) => CH[p.champ].cv === "L").map((p) => ko(p.champ));
    const carryPick = our.filter((p) => has(p.champ, "carry")).map((p) => ko(p.champ))[0]
      || (first.key === "bot" ? ko(om.A) : first.key === "top" ? ko(om.T) : ko(om.M));

    const timeline = [];
    timeline.push({ when: "첫 정리 직후 (3레벨)", what: first.adv >= 0 && first.reasons.some((r) => r.includes("갱 마무리"))
      ? `${first.name} 첫 갱. ${startSide}. 실패해도 ${first.obj} 쪽 시야를 남겨 둡니다.`
      : `무리한 첫 갱보다 스커틀·카운터 정글. ${startSide}.` });
    timeline.push({ when: "첫 오브젝트", what: first.key === "bot" ? "바텀 주도권으로 첫 용 — 미드가 먼저 웨이브를 밀고 합류." : first.key === "top" ? "탑 주도권으로 유충 — 용은 상대에게 주더라도 반대편에서 교환." : "미드 주도권을 잡은 뒤 상대 정글 위치 반대편 오브젝트." });
    if (ult6.length) timeline.push({ when: "6레벨", what: `${ult6.map((u) => `${u.role} ${u.name}`).join(", ")} 궁극기가 생기는 순간 — 정글이 그 라인 근처에서 다이브·합류 갱을 겁니다.` });
    if (early.length) timeline.push({ when: "첫 코어 아이템", what: `${j(early.join("·"), "이", "가")} 가장 강한 구간. 이 시간에 포탑 1차·오브젝트를 몰아서 가져갑니다.` });
    timeline.push({ when: late.length ? `2코어 이후 (${late.join("·")} 완성)` : "2코어 이후", what: cO > cE ? "우리 후반 힘이 위 — 이때부터 정면 한타를 받습니다." : cO < cE ? "상대가 따라오는 구간 — 그 전에 벌린 골드로 바론·포탑을 마무리합니다." : "힘이 비슷 — 시야 장악 후 오브젝트 앞 싸움." });

    const spread = [
      `${first.name}에서 이득이 나면 바로 귀환하지 말고 ${first.obj}로 바꾸기.`,
      first.key === "bot" ? "바텀 1차 포탑을 깬 뒤 원딜·서폿이 미드로 옮겨 미드 포탑까지 압박 (라인 스왑)." :
        first.key === "top" ? "탑 1차 포탑을 깬 뒤 전령을 미드에 써서 미드 포탑까지 열기." :
        "미드 포탑을 먼저 깨고 미드 라이너가 사이드로 로밍해 다른 라인을 같이 앞서게 만들기.",
      `골드는 ${carryPick}에게 모으기 — 킬·오브젝트 마무리를 몰아줍니다.`,
      cover.length ? `${j(cover.map((c) => c.name).join("·"), "은", "는")} 투자 대신 와드·역갱으로 버티게 하고, 상대 정글이 그쪽에 가면 반대편에서 이득을 챙깁니다.` : "모든 라인이 버틸 만합니다 — 상대 정글이 보인 반대편에서 이득을 챙깁니다.",
    ];
    return { ranks, startSide, jgDuel, timeline, spread, ourJg: ourJg ? ourJg.ko : "-" };
  }

  function counterAdvice(ours, theirs) {
    const m = {
      "eng>prot": "상대가 받아치기를 기다리면 먼저 들어가지 말고 사이드 웨이브로 시간을 끌어 보호 스킬을 빼고 싸우세요.",
      "poke>eng": "포킹에 체력이 빠지기 전에 짧게 들어가세요. 수풀·옆길로 돌아 들어가 포킹 각을 없애야 합니다.",
      "prot>poke": "오래 싸울수록 불리합니다. 포탑 앞에서 버티지 말고 웨이브를 넘겨 먼저 오브젝트를 시작하세요.",
      "dive>prot": "진입 순서를 늦추세요. 상대 보호 스킬(실드·밀어내기)이 빠진 걸 확인한 뒤 들어갑니다.",
      "scale>eng": "초반 오브젝트는 교환하고 포탑을 지키세요. 2코어 이후부터 정면 싸움 가능합니다.",
      "split>pick": "사이드는 시야 없는 곳에 깊게 들어가지 말고 본대와 같이 시야를 걷어 주세요.",
    };
    return m[`${ours}>${theirs}`] || "상대가 원하는 싸움 형태를 피하고, 우리 조합이 좋아하는 타이밍(우리 파워 스파이크)까지 오브젝트를 교환하세요.";
  }

  // ---- 상대 분석 ----
  function laneStudy(ourTeam, enTeam, role) {
    const ep = poolMap(enTeam, role);
    const op = poolMap(ourTeam, role);
    const rows = Object.entries(ep).sort((a, b) => lvScore(b[1]) - lvScore(a[1])).map(([id, e]) => {
      const counters = (COUNTERS[id] || []).filter((x) => CH[x]);
      const have = counters.filter((x) => op[x]);
      const learn = counters.filter((x) => !op[x] && CH[x].pos.includes(role)).slice(0, 3);
      const risky = Object.keys(op).filter((x) => lanesCounter(id, x));
      return { id, e, have, learn, risky };
    });
    return rows;
  }

  return {
    champ, ko, j, poolMap, scoutOf, statText, lvScore, teamHasPools, fit, compScores, buildComp, teamComps, fearlessPlan,
    picks, bans, taken, available, openRoles, teamOf, guessRole, direction, sideOf, whoOfSide,
    recommendBan, recommendPick, buildStrategy, laneStudy, lockedFor, pickPlan, keyThreats, metaInfo, metaText, muWr,
  };
})();
