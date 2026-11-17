(function () {
  const { ROLES, ROLE_KO, COMPS, ORDER, LEVEL_KO, STYLE_KO } = window.KB;
  const E = window.Engine;
  const KEY = "sentrix-draft.v1";
  const CH = {};
  window.CHAMPIONS.forEach((c) => (CH[c.id] = c));

  // ---------- state ----------
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const emptySteps = () => ORDER.map(() => ({ champ: null, role: null, skip: false }));
  function fresh() {
    const teams = clone(window.SEED_TEAMS);
    const our = window.SEED_OUR_TEAM;
    return {
      seed: window.SEED_VERSION, teams, ourTeam: our,
      enemyTeam: teams.find((t) => t.id !== our).id, tab: "live",
      draft: { ourSide: "B", steps: emptySteps(), idx: 0 },
      series: { game: 1, mode: "hard", locked: [] },
      ui: { q: "", role: "", onlyPool: false },
    };
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const s = JSON.parse(raw); if (s && s.teams && s.draft) return Object.assign(fresh(), s); }
    } catch (e) { /* 저장소를 못 쓰는 환경: 기본값 */ }
    return fresh();
  }
  let S = load();
  S.ui.sheet = false;
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 무시 */ } }

  // ---------- helpers ----------
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const IMG = (id) => `https://ddragon.leagueoflegends.com/cdn/${window.DDRAGON_VERSION}/img/champion/${id}.png`;
  function icon(id, cls) {
    const c = CH[id];
    if (!c) return `<span class="ic ${cls || ""}"></span>`;
    return `<span class="ic ${cls || ""}" title="${esc(c.ko)}">${esc(c.ko.slice(0, 2))}<img src="${IMG(id)}" alt="" loading="lazy" onerror="this.remove()"></span>`;
  }
  const team = (id) => S.teams.find((t) => t.id === id);
  const nick = (riot) => String(riot || "").split("#")[0].trim();
  const lvTag = (e) => (e.one ? `<span class="lv lvone">원챔</span>` : `<span class="lv lv${e.lv}">${LEVEL_KO[e.lv]}</span>`);
  function poolChips(t, r, opts) {
    if (!(opts && opts.edit)) {
      // 보기용: 직접 입력 + op.gg 전적을 합친 챔프폭 (숙련 점수 순)
      const pm = E.poolMap(t, r);
      const list = Object.entries(pm).sort((a, b) => E.lvScore(b[1]) - E.lvScore(a[1])).slice(0, (opts && opts.max) || 8);
      if (!list.length) return `<span class="dim">챔프폭·전적 없음</span>`;
      return list.map(([id, e]) => `<span class="chip" title="${esc(CH[id] ? CH[id].ko : id)}${e.kda ? " · KDA " + e.kda : ""}${e.mp ? " · 숙련도 " + e.mp.toLocaleString() : ""}">${icon(id, "sm")}${esc(CH[id] ? CH[id].ko : id)} ${lvTag({ lv: e.lv, one: e.one })}${e.g ? `<span class="st">${e.g}판 ${Math.round(e.wr)}%</span>` : ""}</span>`).join("");
    }
    const pool = (t.players[r].pool || []).slice().sort((a, b) => (b[2] ? 4 : b[1]) - (a[2] ? 4 : a[1]));
    if (!pool.length) return `<span class="dim">직접 입력한 챔프 없음 (op.gg 전적은 자동 반영)</span>`;
    return pool.map(([id, lv, one]) => `<span class="chip ${opts && opts.edit ? "ed-chip" : ""}" ${opts && opts.edit ? `data-act="cycle" data-team="${t.id}" data-role="${r}" data-id="${id}"` : ""}>${icon(id, "sm")}${esc(CH[id] ? CH[id].ko : id)} ${lvTag({ lv, one })}${opts && opts.edit ? `<span class="del" data-act="del" data-team="${t.id}" data-role="${r}" data-id="${id}" title="삭제">×</span>` : ""}</span>`).join("");
  }
  function totalTxt(t, r) {
    const sc = E.scoutOf(t, r);
    if (!sc || !sc.total || !sc.total.g) return window.SCOUT && window.SCOUT.teams && window.SCOUT.teams[t.id] && window.SCOUT.teams[t.id][r] && window.SCOUT.teams[t.id][r].error ? " · 전적 못 읽음" : "";
    return ` · 시즌 ${sc.total.g}판 ${Math.round((sc.total.w / sc.total.g) * 100)}%`;
  }
  function opgg(riot) {
    const [n, tag] = String(riot).split("#");
    return `https://op.gg/ko/lol/summoners/kr/${encodeURIComponent((n || "").trim() + "-" + (tag || "KR1").trim())}`;
  }
  function findChamp(q) {
    q = String(q || "").trim().toLowerCase().replace(/\s+/g, "");
    if (!q) return null;
    const norm = (s) => s.toLowerCase().replace(/\s+/g, "");
    return window.CHAMPIONS.find((c) => norm(c.ko) === q || c.id.toLowerCase() === q || c.al.split(" ").includes(q))
      || window.CHAMPIONS.find((c) => norm(c.ko).startsWith(q) || c.id.toLowerCase().startsWith(q))
      || null;
  }
  function matches(c, q) {
    if (!q) return true;
    q = q.toLowerCase().replace(/\s+/g, "");
    return c.ko.replace(/\s+/g, "").includes(q) || c.id.toLowerCase().includes(q) || c.al.replace(/\s+/g, "").includes(q);
  }

  // ---------- header ----------
  function renderTop() {
    document.querySelectorAll(".tab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === S.tab)));
    const opts = (sel, excl) => S.teams.filter((t) => t.id !== excl).map((t) => `<option value="${t.id}" ${t.id === sel ? "selected" : ""}>${esc(t.name)}</option>`).join("");
    document.getElementById("ourSel").innerHTML = opts(S.ourTeam, null);
    document.getElementById("enemySel").innerHTML = opts(S.enemyTeam, S.ourTeam);
  }

  // ---------- live draft ----------
  const curStep = () => (S.draft.idx < ORDER.length ? ORDER[S.draft.idx] : null);
  function sideIdx(side, type) { return ORDER.map((o, i) => (o[0] === side && o[1] === type ? i : -1)).filter((i) => i >= 0); }

  function renderSide(side, planned) {
    const who = E.whoOfSide(S, side);
    const t = E.teamOf(S, who);
    const bans = sideIdx(side, "ban").map((i) => {
      const s = S.draft.steps[i];
      const now = i === S.draft.idx ? "now" : "";
      return `<div class="slot-ban ${now}">${s.champ ? `<img src="${IMG(s.champ)}" alt="${esc(CH[s.champ].ko)}" title="${esc(CH[s.champ].ko)}" onerror="this.remove()"><span class="x">✕</span>` : s.skip ? `<span class="dim">없음</span>` : ""}</div>`;
    }).join("");
    const picks = sideIdx(side, "pick").map((i) => {
      const s = S.draft.steps[i];
      const now = i === S.draft.idx ? "now" : "";
      if (!s.champ) {
        const pr = who === "our" && planned ? planned[i] : null;
        return `<div class="slot-pick empty ${now}"><span class="ic"></span><div class="who"><div class="cn">${now ? "선택 중" : pr ? ROLE_KO[pr] : "대기"}</div><div class="pn">${pr ? (now ? ROLE_KO[pr] + " 차례" : "예정") : ""}</div></div></div>`;
      }
      const p = s.role ? t.players[s.role] : null;
      const sel = `<select data-act="role" data-i="${i}" aria-label="라인">${ROLES.map((r) => `<option value="${r}" ${r === s.role ? "selected" : ""}>${ROLE_KO[r]}</option>`).join("")}</select>`;
      return `<div class="slot-pick ${now}">${icon(s.champ)}<div class="who"><div class="cn">${esc(CH[s.champ].ko)}</div><div class="pn">${p ? esc(nick(p.riot)) : ""}</div></div>${sel}</div>`;
    }).join("");
    return `<section class="side ${side}"><div class="side-h"><span class="nm">${esc(t.name)}</span><span class="tag">${side === "B" ? "블루" : "레드"} · ${who === "our" ? "우리" : "상대"}</span></div><div class="bans">${bans}</div><div class="picks">${picks}</div></section>`;
  }

  function recCard(r, type, muted) {
    const why = r.reasons.filter((x) => x.v > 0 && !x.order).slice(0, 2).map((x) => esc(x.d)).join("<br>");
    return `<button class="rec ${type} ${muted ? "muted" : ""}" data-act="pick" data-id="${r.id}">
      <span class="lab">${esc(r.label)}</span>${icon(r.id, "lg")}<span class="cn">${esc(CH[r.id].ko)}</span>
      ${r.role ? `<span class="pill">${ROLE_KO[r.role]}</span>` : ""}<span class="why">${why}</span></button>`;
  }

  function renderNow() {
    const st = curStep();
    if (!st) return `<div class="now-box"><div class="now-h"><span class="what">밴픽 완료</span><span class="step">아래 전략을 확인하세요</span></div></div>`;
    const [side, type] = st;
    const who = E.whoOfSide(S, side);
    const t = E.teamOf(S, who);
    const list = type === "ban" ? E.recommendBan(S, who) : E.recommendPick(S, who);
    const dir = E.direction(S, who);
    const dirTxt = dir ? `${who === "our" ? "우리" : "상대"} 조합 방향 <b>${COMPS[dir].name}</b>` : "";
    const title = `${who === "our" ? "우리팀" : esc(t.name)} ${type === "ban" ? "밴" : "픽"} 차례${who === "enemy" ? " · 예상" : ""}`;
    let body;
    if (list.length) body = `<div class="recs">${list.map((r) => recCard(r, type, who === "enemy")).join("")}</div>`;
    else body = `<div class="empty-recs">${who === "enemy" && !E.teamHasPools(t) ? "상대 챔프폭이 비어 있어 예상이 어렵습니다. 「상대팀 분석」에서 챔프폭을 넣으면 예상이 나옵니다." : "추천할 챔프가 없습니다. 아래에서 직접 고르세요."}</div>`;
    return `<div class="now-box"><div class="now-h"><span class="what ${side}">${who === "our" ? "추천" : "상대 예상"}</span><span class="step">${title}</span><span class="dir">${dirTxt}</span></div>${body}</div>`;
  }

  function renderStatus(extra) {
    const st = curStep();
    const done = !st;
    const side = st ? st[0] : null;
    const who = st ? E.whoOfSide(S, side) : null;
    const t = st ? E.teamOf(S, who) : null;
    const what = done ? "밴픽 완료" : `${who === "our" ? "우리팀" : esc(t.name)} ${st[1] === "ban" ? "밴" : "픽"}`;
    const phase = done ? "아래 전략 확인" : S.draft.idx < 6 ? "1차 밴" : S.draft.idx < 12 ? "1차 픽" : S.draft.idx < 16 ? "2차 밴" : "2차 픽";
    return `<div class="dstat ${side || ""} ${extra || ""}"><div class="dstat-top"><span class="dstat-n">${done ? 20 : S.draft.idx + 1}<small>/20</small></span><span class="dstat-ph">${phase}</span></div>
      <div class="dstat-what">${what}</div>
      <div class="dstat-act">${st && st[1] === "ban" ? `<button class="btn sm ghost" data-act="skip">밴 넘기기</button>` : ""}<button class="btn sm" data-act="undo" ${S.draft.idx ? "" : "disabled"}>되돌리기</button>${done ? "" : `<button class="btn sm primary m-only" data-act="sheet">고르기</button>`}</div></div>`;
  }

  function renderGrid() {
    const st = curStep();
    const who = st ? E.whoOfSide(S, st[0]) : "our";
    const taken = E.taken(S);
    const locked = E.lockedFor(S, who);
    const ourPool = new Set();
    const ot = E.teamOf(S, "our");
    ROLES.forEach((r) => (ot.players[r].pool || []).forEach((p) => ourPool.add(p[0])));
    const u = S.ui;
    const list = window.CHAMPIONS.filter((c) => matches(c, u.q) && (!u.role || c.pos.includes(u.role)) && (!u.onlyPool || ourPool.has(c.id)));
    const btns = list.map((c) => {
      const dis = !st || taken.has(c.id) || locked.has(c.id);
      return `<button class="cbtn ${ourPool.has(c.id) ? "mine" : ""} ${locked.has(c.id) ? "locked" : ""}" data-act="pick" data-id="${c.id}" ${dis ? "disabled" : ""} title="${esc(c.ko)}">${icon(c.id)}<span>${esc(c.ko)}</span></button>`;
    }).join("");
    const roleBtns = [["", "전체"]].concat(ROLES.map((r) => [r, ROLE_KO[r]])).map(([r, n]) => `<button aria-pressed="${u.role === r}" data-act="frole" data-r="${r}">${n}</button>`).join("");
    return `<div class="pool"><div class="sheet-h m-only"><b>챔피언 고르기</b><button class="btn sm" data-act="sheet">닫기</button></div><div class="pool-bar"><input id="q" class="input" placeholder="챔피언 검색 (예: 말파, 오리)" value="${esc(u.q)}" autocomplete="off">
      <div class="seg">${roleBtns}</div>
      <button class="btn sm ${u.onlyPool ? "primary" : ""}" data-act="onlypool">우리 챔프폭만</button></div>
      <div class="champs" id="champs">${btns || `<span class="muted">검색 결과 없음</span>`}</div></div>`;
  }

  function renderFearless() {
    const L = S.series.locked;
    if (!L.length) return "";
    const games = [...new Set(L.map((x) => x.game))];
    const rows = games.map((g) => `<span class="g">${g}세트</span>` + L.filter((x) => x.game === g).map((x) => `<span class="chip" title="${x.who === "our" ? "우리 픽" : "상대 픽"}">${icon(x.id, "sm")}${esc(CH[x.id].ko)}<span class="lv ${x.who === "our" ? "lv2" : "lvone"}">${x.who === "our" ? "우리" : "상대"}</span></span>`).join("")).join("");
    return `<div class="card" style="margin-top:12px"><h3>피어리스 잠금 · ${S.series.mode === "hard" ? "양 팀 모두 사용 불가" : S.series.mode === "soft" ? "자기 팀만 사용 불가" : "꺼짐"}</h3><div class="fearless">${rows}</div></div>`;
  }

  function renderStrategy() {
    if (E.picks(S, "our").length < 5 || E.picks(S, "enemy").length < 5) return "";
    const g = E.buildStrategy(S);
    const lanes = g.lanes.map((l) => `<div class="lane"><span class="r">${ROLE_KO[l.r]}</span>
      <span class="c">${l.a ? icon(l.a, "sm") + esc(CH[l.a].ko) : "-"}</span><span class="vs">vs</span>
      <span class="c right">${l.b ? esc(CH[l.b].ko) + icon(l.b, "sm") : "-"}</span>
      <span class="t"><span class="pill ${l.sc > 0 ? "good" : l.sc < 0 ? "bad" : ""}">${l.tone === "good" ? "유리" : l.tone === "bad" ? "불리" : l.sc > 0 ? "약간 유리" : l.sc < 0 ? "약간 불리" : "비슷"}</span> ${esc(l.t)}${l.plan ? ` — ${esc(l.plan)}` : ""}</span></div>`).join("");
    return `<div class="section-title"><h2>운영 전략 · 시나리오</h2><p>${S.series.game}세트 밴픽 결과 기준</p></div>
    <div class="strat">
      <div class="banner ${g.matchup.tone} wide">우리 ${esc(g.O.name)} vs 상대 ${esc(g.E.name)} — ${esc(g.matchup.t)}${g.answer ? `<div style="font-weight:500;margin-top:6px">대처: ${esc(g.answer)}</div>` : ""}</div>
      <div class="card plan"><h3>우리 승리 플랜</h3><dl>
        <dt>승리 조건</dt><dd>${esc(g.O.win)}</dd>
        <dt>초반 (0~14분)</dt><dd>${esc(g.O.early)}</dd>
        <dt>중반 (14~25분)</dt><dd>${esc(g.O.mid)}</dd>
        <dt>후반</dt><dd>${esc(g.O.late)}</dd>
        <dt>주의</dt><dd>${esc(g.O.risk)}</dd></dl></div>
      <div class="card"><h3>라인별 구도</h3><div class="lanes">${lanes}</div></div>
      ${jungleCard(g.jungle)}
      <div class="card"><h3>초반 동선 · 타이밍</h3><dl class="kv"><dt>정글</dt><dd>${esc(g.jungle.jgDuel)}</dd><dt>타이밍</dt><dd>${esc(g.timing)}</dd><dt>상대 위협</dt><dd>${esc(g.threats.join(", ") || "-")}</dd><dt>집중 대상</dt><dd>${esc(CH[g.enCarry.champ].ko)}</dd></dl></div>
      <div class="card"><h3>상황별 시나리오</h3><ol class="steps">${g.scenarios.map((s) => `<li><b>${esc(s.t)}</b> — ${esc(s.d)}</li>`).join("")}</ol>
        <p class="help" style="margin-top:10px">상대 ${esc(g.E.name)}의 약점: ${esc(g.E.risk)}</p></div>
    </div>`;
  }

  function jungleCard(j) {
    const cls = { "집중 투자": "good", "기회 갱": "blue", "최소 관리": "", "커버": "bad" };
    const ranks = j.ranks.map((x, i) => `<div class="jr"><span class="jn">${i + 1}</span><div><div><b>${esc(x.name)}</b> <span class="pill ${cls[x.verdict]}">${esc(x.verdict)}</span></div>
      <div class="help">${esc(x.reasons.join(" · ") || "특이 사항 없음")}</div></div></div>`).join("");
    return `<div class="card wide jungle"><h3>정글 기준 운영 — ${esc(j.ourJg)}</h3>
      <div class="jgrid"><div><div class="sub">풀어 줄 라인 우선순위</div>${ranks}<p class="help" style="margin-top:8px">시작: ${esc(j.startSide)}</p></div>
      <div><div class="sub">힘을 뿌리는 타이밍</div><ol class="steps">${j.timeline.map((t) => `<li><b>${esc(t.when)}</b> — ${esc(t.what)}</li>`).join("")}</ol>
      <div class="sub" style="margin-top:12px">이득을 퍼뜨리는 방법</div><ul class="plain">${j.spread.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div></div></div>`;
  }

  function renderPlan() {
    const p = E.pickPlan(S, "our");
    if (!p.plan.some((s) => s.items.some((x) => !x.done && x.role))) return "";
    const st = curStep();
    const cards = p.plan.map((s) => {
      const items = s.items.map((x) => {
        if (x.done) return `<div class="pp-item done">${icon(x.champ, "sm")}<span><b>${esc(CH[x.champ].ko)}</b> <span class="dim">${x.role ? ROLE_KO[x.role] : ""} · 완료</span></span></div>`;
        if (!x.role) return "";
        const cands = x.cands.length ? x.cands.map((c) => `<button class="chip pp-c" data-act="${st && st[1] === "pick" && E.whoOfSide(S, st[0]) === "our" && s.now ? "pick" : ""}" data-id="${c.id}" title="${esc(E.statText(c.e))}">${icon(c.id, "sm")}${esc(CH[c.id].ko)}${c.e.g ? `<span class="st">${c.e.g}판</span>` : ""}</button>`).join("") : `<span class="dim">남은 챔프폭 없음</span>`;
        return `<div class="pp-item"><div class="pp-role">${ROLE_KO[x.role]}${x.duo ? ` <span class="pill blue">세트</span>` : ""}</div><div class="row-chips">${cands}</div>${x.why.length ? `<ul class="pp-why">${x.why.slice(0, 3).map((w) => `<li>${esc(w)}</li>`).join("")}</ul>` : ""}</div>`;
      }).join("");
      return `<div class="pp-slot ${s.now ? "now" : ""} ${s.items.every((x) => x.done) ? "past" : ""}"><div class="pp-h"><b>${s.label}</b>${s.now ? `<span class="pill gold">지금</span>` : ""}</div>${items}</div>`;
    }).join("");
    return `<section class="plan-box"><div class="now-h"><span class="what">픽 순서 전략</span><span class="step">밴·진영·상대 공개 라인에 따라 계속 바뀜</span></div>
      <ul class="plain pp-sum">${p.summary.map((t) => `<li>${esc(t)}</li>`).join("")}</ul><div class="pp-grid">${cards}</div></section>`;
  }

  function renderLive() {
    const seg = (act, cur, items) => `<div class="seg">${items.map(([v, n]) => `<button data-act="${act}" data-v="${v}" aria-pressed="${cur === v}">${n}</button>`).join("")}</div>`;
    const plan = E.pickPlan(S, "our");
    const planned = {};
    plan.plan.forEach((p) => p.items.forEach((x) => !x.done && x.role && (planned[x.i] = x.role)));
    return `<div class="draft-bar">
      <span class="pill gold">${S.series.game}세트</span>
      <span class="sel"><span class="sel-l">우리 진영</span> ${seg("side", S.draft.ourSide, [["B", "블루"], ["R", "레드"]])}</span>
      <span class="sel"><span class="sel-l">피어리스</span> ${seg("mode", S.series.mode, [["hard", "하드"], ["soft", "소프트"], ["off", "끔"]])}</span>
      <span class="spacer"></span>
      <button class="btn sm" data-act="resetGame">이번 세트 다시</button>
      <button class="btn sm primary" data-act="nextGame">세트 종료 → 다음 세트</button>
      ${S.series.locked.length ? `<button class="btn sm ghost" data-act="resetSeries">시리즈 초기화</button>` : ""}
    </div>
    ${renderStatus("dstat-m")}
    <div class="board">
      <div class="dh">${renderSide("B", planned)}${renderStatus()}${renderSide("R", planned)}</div>
      <div class="col-main">${renderNow()}${renderPlan()}</div>
      <aside class="col-grid ${S.ui.sheet ? "open" : ""}">${renderGrid()}</aside>
    </div>
    ${S.ui.sheet ? `<div class="sheet-bg m-only" data-act="sheet"></div>` : ""}
    ${renderFearless()}${renderStrategy()}`;
  }

  // ---------- our team ----------
  function compCard(c, title, sub, compact, enemy) {
    const C = COMPS[c.key];
    const five = ROLES.map((r) => { const s = c.slots[r]; if (!s) return `<div class="s"><span class="ic"></span></div>`;
      return `<div class="s ${s.suggest ? "suggest" : ""}"><span class="r">${ROLE_KO[r]}</span>${icon(s.id)}<span class="n">${esc(CH[s.id].ko)}</span>${s.suggest ? `<span class="lv lv1">새로</span>` : lvTag({ lv: Math.min(3, Math.round(s.lv)), one: s.lv > 3 })}</div>`; }).join("");
    const filled = ROLES.map((r) => c.slots[r]).filter(Boolean);
    const first = filled.filter((s) => !s.suggest).sort((a, b) => b.lv - a.lv || CH[b.id].pos.length - CH[a.id].pos.length)[0];
    const last = filled.filter((s) => (window.KB.COUNTERS[s.id] || []).length && s !== first).sort((a, b) => (window.KB.COUNTERS[b.id] || []).length - (window.KB.COUNTERS[a.id] || []).length)[0];
    return `<div class="card"><div class="comp-h"><h3>${esc(title || C.name)}</h3>${sub || ""}</div><div class="five">${five}</div>
      <div class="plan"><dl>${compact ? "" : `<dt>승리 조건</dt><dd>${esc(C.win)}</dd><dt>초반</dt><dd>${esc(C.early)}</dd><dt>중반</dt><dd>${esc(C.mid)}</dd><dt>후반</dt><dd>${esc(C.late)}</dd>`}
      ${enemy ? `<dt>밴 포인트</dt><dd>${first ? `조합의 중심 <b>${esc(CH[first.id].ko)}</b> — 밴하거나 먼저 가져가면 이 조합이 흔들립니다` : ""}</dd>`
        : `<dt>밴픽 순서</dt><dd>${first ? `먼저 가져갈 챔프: <b>${esc(CH[first.id].ko)}</b>` : ""}${last ? ` · 카운터가 있는 <b>${esc(CH[last.id].ko)}</b>는 마지막 픽으로 숨기기` : ""}</dd>`}
      ${compact ? "" : `<dt>주의</dt><dd>${esc(C.risk)}</dd>`}</dl></div></div>`;
  }

  function renderOur() {
    const t = team(S.ourTeam);
    const roster = ROLES.map((r) => { const p = t.players[r]; return `<div class="pl"><div class="role">${ROLE_KO[r]}</div><div class="id" title="${esc(p.riot)}">${esc(nick(p.riot))}</div><div class="tier">${esc(p.tier)} · ${p.pts}점${totalTxt(t, r)}</div><div class="chips">${poolChips(t, r)}</div></div>`; }).join("");
    const has = E.teamHasPools(t);
    const comps = has ? E.teamComps(t).slice(0, 4) : [];
    const plan = has ? E.fearlessPlan(t, 3) : [];
    // 챔프폭 보강
    const topKeys = comps.slice(0, 2).map((c) => c.key);
    const thin = ROLES.map((r) => {
      const pm = E.poolMap(t, r);
      const solid = Object.values(pm).filter((e) => e.lv >= 2).length;
      const add = window.CHAMPIONS.filter((c) => c.pos[0] === r && !pm[c.id])
        .map((c) => ({ c, s: topKeys.reduce((s, k) => s + E.fit(c, k), 0) })).sort((a, b) => b.s - a.s).slice(0, 3).map((x) => x.c.id);
      return { r, solid, add };
    });
    return `<div class="section-title"><h2>${esc(t.name)} 로스터</h2><p>숙련도: 상·중·하, 원챔 = 주력 한 챔프</p><button class="btn sm" data-act="edit" data-team="${t.id}">챔프폭 편집</button></div>
      <div class="roster">${roster}</div>
      ${has ? "" : `<div class="note" style="margin-top:12px">챔프폭이 비어 있습니다. 「챔프폭 편집」으로 선수별 챔피언을 넣으면 조합이 계산됩니다.</div>`}
      ${has ? `<div class="section-title"><h2>숙련도 기준 추천 조합</h2><p>잘하는 챔프로 만들 수 있는 조합 순서</p></div>
      <div class="comps">${comps.map((c, i) => compCard(c, null, `<span class="pill ${i === 0 ? "gold" : ""}">${i === 0 ? "주력" : "대안 " + i}</span>`)).join("")}</div>
      <div class="section-title"><h2>피어리스 세트별 조합 배분</h2><p>앞 세트에서 쓴 챔프를 빼고 다시 짠 조합 — 1세트에 주력을 다 쓰면 3세트가 비는지 확인</p></div>
      <div class="series">${plan.map((c, i) => compCard(c, `${i + 1}세트 · ${COMPS[c.key].name}`, `<span class="pill">숙련도 합 ${c.comfort.toFixed(0)}</span>`, true)).join("")}</div>
      <div class="section-title"><h2>챔프폭 보강</h2><p>숙련도 중 이상 챔프가 3개 미만인 라인은 피어리스 후반 세트에서 막힙니다</p></div>
      <div class="card tbl-wrap"><table class="study"><thead><tr><th>라인</th><th>중 이상</th><th>주력 조합에 맞는 연습 추천</th></tr></thead><tbody>
      ${thin.map((x) => `<tr><td><b>${ROLE_KO[x.r]}</b></td><td><span class="pill ${x.solid >= 3 ? "good" : "bad"}">${x.solid}개</span></td><td><div class="row-chips">${x.add.map((id) => `<span class="chip">${icon(id, "sm")}${esc(CH[id].ko)}</span>`).join("")}</div></td></tr>`).join("")}
      </tbody></table></div>` : ""}`;
  }

  // ---------- opponent ----------
  function renderEnemy() {
    const ours = team(S.ourTeam), en = team(S.enemyTeam);
    const has = E.teamHasPools(en);
    const opts = S.teams.filter((t) => t.id !== S.ourTeam).map((t) => `<option value="${t.id}" ${t.id === en.id ? "selected" : ""}>${esc(t.name)}</option>`).join("");
    const sum = (t) => ROLES.reduce((s, r) => s + (t.players[r].pts || 0), 0);
    const rows = ROLES.map((r) => {
      const p = en.players[r], o = ours.players[r];
      const gap = (o.pts || 0) - (p.pts || 0);
      const study = E.laneStudy(ours, en, r);
      const have = [...new Set(study.flatMap((x) => x.have))];
      const learn = [...new Set(study.flatMap((x) => x.learn))].slice(0, 4);
      const risky = [...new Set(study.flatMap((x) => x.risky))];
      return `<tr><td data-label="라인"><b>${ROLE_KO[r]}</b></td>
        <td data-label="상대 선수"><a href="${opgg(p.riot)}" target="_blank" rel="noopener">${esc(nick(p.riot))}</a><div class="help">${esc(p.tier)} · ${p.pts}점${totalTxt(en, r)}</div></td>
        <td data-label="우리 선수">${esc(nick(o.riot))}<div class="help">${esc(o.tier)} · ${o.pts}점${totalTxt(ours, r)}</div></td>
        <td data-label="점수 차"><span class="pill ${gap >= 15 ? "good" : gap <= -15 ? "bad" : ""}">${gap > 0 ? "+" : ""}${gap}</span></td>
        <td data-label="상대 챔프폭"><div class="row-chips">${poolChips(en, r)}</div></td>
        <td data-label="우리 대응 가능"><div class="row-chips">${have.map((id) => `<span class="chip">${icon(id, "sm")}${esc(CH[id].ko)}</span>`).join("") || `<span class="dim">-</span>`}</div></td>
        <td data-label="새로 연습 추천"><div class="row-chips">${learn.map((id) => `<span class="chip">${icon(id, "sm")}${esc(CH[id].ko)}</span>`).join("") || `<span class="dim">-</span>`}</div></td>
        <td data-label="우리 챔프 중 주의"><div class="row-chips">${risky.map((id) => `<span class="chip">${icon(id, "sm")}${esc(CH[id].ko)}</span>`).join("") || `<span class="dim">-</span>`}</div></td></tr>`;
    }).join("");
    let compsHtml = "";
    if (has) {
      const theirs = E.teamComps(en).slice(0, 2);
      const tk = theirs[0].key;
      const ansKey = Object.keys(COMPS).filter((k) => COMPS[k].beats.includes(tk))
        .map((k) => E.buildComp(ours, k)).sort((a, b) => b.comfort * 3 + b.fitScore - (a.comfort * 3 + a.fitScore))[0];
      compsHtml = `<div class="section-title"><h2>상대 예상 조합 → 연습할 대응 조합</h2><p>상대 챔프폭으로 만든 조합과, 그걸 잡는 우리 조합</p></div>
        <div class="comps">${theirs.map((c, i) => compCard(c, `상대 ${i === 0 ? "주력" : "대안"} · ${COMPS[c.key].name}`, `<span class="pill bad">상대</span>`, false, true)).join("")}
        ${ansKey ? compCard(ansKey, `우리 대응 · ${COMPS[ansKey.key].name}`, `<span class="pill good">연습 추천</span>`) : ""}</div>`;
    }
    // 사전 밴 후보
    const virtual = Object.assign({}, S, { enemyTeam: en.id, draft: { ourSide: "B", steps: emptySteps(), idx: 0 }, series: { game: 1, mode: "off", locked: [] } });
    const preBans = E.recommendBan(virtual, "our").slice(0, 5);
    const gaps = ROLES.map((r) => ({ r, g: (ours.players[r].pts || 0) - (en.players[r].pts || 0) }));
    const weak = gaps.filter((x) => x.g <= -15).map((x) => ROLE_KO[x.r]);
    const strong = gaps.filter((x) => x.g >= 15).map((x) => ROLE_KO[x.r]);
    return `<div class="section-title"><h2>상대팀 사전 분석</h2><select id="enemyPick" aria-label="상대팀">${opts}</select><button class="btn sm" data-act="edit" data-team="${en.id}">상대 챔프폭 편집</button>${window.SCOUT ? `<p>op.gg 전적 기준 ${esc(window.SCOUT.at)}</p>` : ""}</div>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
        <div class="card"><div class="muted">티어 점수 합</div><div style="font-size:22px;font-weight:800">${sum(ours)} <span class="muted" style="font-size:14px">우리</span> : ${sum(en)} <span class="muted" style="font-size:14px">상대</span></div></div>
        <div class="card"><div class="muted">우세 라인</div><div style="font-weight:700">${strong.join(", ") || "없음"}</div><div class="muted" style="margin-top:6px">열세 라인</div><div style="font-weight:700">${weak.join(", ") || "없음"}</div></div>
        <div class="card"><div class="muted">운영 방향</div><div>${weak.length ? `${esc(weak.join("·"))}은 버티는 픽, 정글이 커버` : "라인전 무난"}${strong.length ? ` · ${esc(strong.join("·"))} 주도권으로 동선 시작` : ""}</div></div>
      </div>
      ${has ? "" : `<div class="note" style="margin-top:12px">이 팀은 op.gg 전적을 읽지 못했고 직접 입력한 챔프폭도 없습니다. 「상대 챔프폭 편집」에 넣으면 카운터·연습 추천·예상 조합이 채워집니다.</div>`}
      <div class="section-title"><h2>라인별 상대와 연습 포인트</h2><p>점수 차 = 우리 − 상대</p></div>
      <div class="card tbl-wrap"><table class="study cards-m"><thead><tr><th>라인</th><th>상대 선수</th><th>우리 선수</th><th>점수 차</th><th>상대 챔프폭</th><th>우리 대응 가능</th><th>새로 연습 추천</th><th>우리 챔프 중 주의</th></tr></thead><tbody>${rows}</tbody></table></div>
      ${compsHtml}
      <div class="section-title"><h2>사전 밴 후보</h2><p>첫 밴 페이즈 기준</p></div>
      <div class="card">${preBans.length ? `<div class="recs">${preBans.map((r) => recCard(r, "ban")).join("")}</div>` : `<span class="muted">상대 챔프폭을 넣으면 나옵니다.</span>`}</div>`;
  }

  // ---------- pool editor ----------
  let editing = null;
  function renderEditor() {
    const root = document.getElementById("modal");
    if (!editing) { root.innerHTML = ""; return; }
    const t = team(editing);
    const roles = ROLES.map((r) => { const p = t.players[r]; return `<div class="ed-role"><div class="ed-row"><b style="width:40px">${ROLE_KO[r]}</b>
      <input class="input" style="flex:2" data-f="riot" data-role="${r}" value="${esc(p.riot)}" aria-label="${ROLE_KO[r]} 라이엇 ID">
      <input class="input" style="flex:1" data-f="tier" data-role="${r}" value="${esc(p.tier)}" aria-label="티어">
      <input class="input" style="width:70px" type="number" data-f="pts" data-role="${r}" value="${p.pts}" aria-label="점수"></div>
      <div class="row-chips">${poolChips(t, r, { edit: true })}</div>
      <div class="ed-row"><input class="input" style="flex:1" list="champList" data-add="${r}" placeholder="챔피언 추가 (이름 입력 후 Enter)">
      <select data-addlv="${r}" aria-label="숙련도"><option value="3">상</option><option value="2" selected>중</option><option value="1">하</option><option value="one">원챔</option></select>
      <button class="btn sm" data-act="add" data-role="${r}">추가</button></div></div>`; }).join("");
    root.innerHTML = `<div class="modal-bg" data-act="close"><div class="modal" role="dialog" aria-modal="true" aria-label="챔프폭 편집">
      <div class="modal-h"><h2>${esc(t.name)} · 챔프폭 편집</h2><button class="btn sm" data-act="close">닫기</button></div>
      <p class="help">칩을 누르면 숙련도가 상 → 중 → 하 → 원챔 순서로 바뀝니다. ×는 삭제. 이 브라우저에만 저장되니 팀원과 나누려면 상단 「데이터」에서 내보내기 하세요.</p>
      ${roles}</div></div>`;
  }
  function addChamp(r) {
    const inp = document.querySelector(`[data-add="${r}"]`);
    const c = findChamp(inp.value);
    if (!c) { inp.setCustomValidity("챔피언을 찾을 수 없습니다"); inp.reportValidity(); return; }
    inp.setCustomValidity("");
    const lvv = document.querySelector(`[data-addlv="${r}"]`).value;
    const p = team(editing).players[r];
    p.pool = (p.pool || []).filter((x) => x[0] !== c.id);
    p.pool.push(lvv === "one" ? [c.id, 3, true] : [c.id, Number(lvv)]);
    save(); renderEditor(); render();
    const again = document.querySelector(`[data-add="${r}"]`); if (again) again.focus();
  }

  // ---------- data menu ----------
  function exportData() {
    const blob = new Blob([JSON.stringify({ teams: S.teams, ourTeam: S.ourTeam }, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "draft-teams.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function importData(file) {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const d = JSON.parse(fr.result);
        if (!Array.isArray(d.teams)) throw new Error("teams 없음");
        S.teams = d.teams; if (d.ourTeam) S.ourTeam = d.ourTeam;
        if (!S.teams.find((t) => t.id === S.enemyTeam) || S.enemyTeam === S.ourTeam) S.enemyTeam = S.teams.find((t) => t.id !== S.ourTeam).id;
        save(); render(); alert("불러왔습니다.");
      } catch (e) { alert("파일 형식이 맞지 않습니다: " + e.message); }
    };
    fr.readAsText(file);
  }

  // ---------- actions ----------
  function choose(id) {
    const st = curStep();
    if (!st || !CH[id]) return;
    const who = E.whoOfSide(S, st[0]);
    if (E.taken(S).has(id) || E.lockedFor(S, who).has(id)) return;
    const step = S.draft.steps[S.draft.idx];
    step.champ = id; step.skip = false;
    step.role = st[1] === "pick" ? E.guessRole(S, who, id) : null;
    S.draft.idx++;
    S.ui.sheet = false; S.ui.q = "";
    save(); render();
  }
  function setRole(i, r) {
    const side = ORDER[i][0];
    const s = S.draft.steps[i];
    const other = S.draft.steps.find((x, j) => j !== i && ORDER[j][0] === side && ORDER[j][1] === "pick" && x.role === r);
    if (other) other.role = s.role;
    s.role = r; save(); render();
  }

  function render() {
    renderTop();
    const v = document.getElementById("view");
    const keepFocus = document.activeElement && document.activeElement.id === "q";
    const pos = keepFocus ? document.activeElement.selectionStart : 0;
    v.innerHTML = S.tab === "live" ? renderLive() : S.tab === "our" ? renderOur() : renderEnemy();
    if (keepFocus) { const q = document.getElementById("q"); if (q) { q.focus(); q.setSelectionRange(pos, pos); } }
  }

  document.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-act], .tab");
    if (!el) return;
    if (el.classList.contains("tab")) { S.tab = el.dataset.tab; save(); render(); window.scrollTo(0, 0); return; }
    const a = el.dataset.act;
    if (a === "close" && ev.target !== el && el.classList.contains("modal-bg")) return; // 모달 안쪽 클릭
    switch (a) {
      case "pick": choose(el.dataset.id); break;
      case "skip": { const st = curStep(); if (st && st[1] === "ban") { S.draft.steps[S.draft.idx].skip = true; S.draft.idx++; save(); render(); } break; }
      case "undo": if (S.draft.idx > 0) { S.draft.idx--; S.draft.steps[S.draft.idx] = { champ: null, role: null, skip: false }; save(); render(); } break;
      case "resetGame": if (confirm("이번 세트 밴픽을 지울까요?")) { S.draft.steps = emptySteps(); S.draft.idx = 0; save(); render(); } break;
      case "nextGame": {
        const ps = ["our", "enemy"].flatMap((w) => E.picks(S, w).map((p) => ({ id: p.champ, who: w, game: S.series.game })));
        if (!ps.length) { alert("이번 세트에 픽이 없습니다."); break; }
        if (!confirm(`${S.series.game}세트 픽 ${ps.length}개를 피어리스 잠금에 넣고 다음 세트로 갈까요?`)) break;
        S.series.locked = S.series.locked.concat(ps); S.series.game++;
        S.draft.steps = emptySteps(); S.draft.idx = 0; save(); render(); window.scrollTo(0, 0); break;
      }
      case "resetSeries": if (confirm("피어리스 잠금과 세트 번호를 모두 초기화할까요?")) { S.series = { game: 1, mode: S.series.mode, locked: [] }; S.draft.steps = emptySteps(); S.draft.idx = 0; save(); render(); } break;
      case "side": if (S.draft.ourSide !== el.dataset.v) {
        if (S.draft.idx > 0 && !confirm("진영을 바꾸면 이번 세트 밴픽이 지워집니다. 바꿀까요?")) break;
        S.draft.ourSide = el.dataset.v; S.draft.steps = emptySteps(); S.draft.idx = 0; save(); render(); } break;
      case "mode": S.series.mode = el.dataset.v; save(); render(); break;
      case "frole": S.ui.role = el.dataset.r; save(); render(); break;
      case "onlypool": S.ui.onlyPool = !S.ui.onlyPool; save(); render(); break;
      case "sheet": S.ui.sheet = !S.ui.sheet; render(); if (S.ui.sheet) { const q = document.getElementById("q"); if (q && matchMedia("(min-width: 761px)").matches) q.focus(); } break;
      case "edit": editing = el.dataset.team; renderEditor(); break;
      case "close": editing = null; renderEditor(); break;
      case "add": addChamp(el.dataset.role); break;
      case "del": { ev.stopPropagation(); const p = team(el.dataset.team).players[el.dataset.role]; p.pool = p.pool.filter((x) => x[0] !== el.dataset.id); save(); renderEditor(); render(); break; }
      case "cycle": { const p = team(el.dataset.team).players[el.dataset.role]; const e = p.pool.find((x) => x[0] === el.dataset.id);
        if (e[2]) { e[1] = 3; e.length = 2; } else if (e[1] === 1) { e[1] = 3; e[2] = true; } else e[1] = e[1] - 1;
        save(); renderEditor(); render(); break; }
      case "export": exportData(); break;
      case "import": document.getElementById("file").click(); break;
      case "wipe": if (confirm("모든 입력(챔프폭·밴픽·피어리스)을 처음 상태로 되돌릴까요?")) { S = fresh(); save(); render(); } break;
      case "data": { const m = document.getElementById("dataMenu"); m.hidden = !m.hidden; break; }
    }
  });
  document.addEventListener("input", (ev) => {
    const t = ev.target;
    if (t.id === "q") { S.ui.q = t.value; render(); return; }
    if (t.dataset && t.dataset.f && editing) {
      const p = team(editing).players[t.dataset.role];
      p[t.dataset.f] = t.dataset.f === "pts" ? Number(t.value) || 0 : t.value; save();
    }
  });
  document.addEventListener("change", (ev) => {
    const t = ev.target;
    if (t.id === "ourSel") { S.ourTeam = t.value; if (S.enemyTeam === S.ourTeam) S.enemyTeam = S.teams.find((x) => x.id !== S.ourTeam).id; save(); render(); }
    else if (t.id === "enemySel" || t.id === "enemyPick") { S.enemyTeam = t.value; save(); render(); }
    else if (t.dataset && t.dataset.act === "role") setRole(Number(t.dataset.i), t.value);
    else if (t.id === "file" && t.files[0]) { importData(t.files[0]); t.value = ""; }
    else if (t.dataset && t.dataset.f && editing) render();
  });
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" && ev.target.dataset && ev.target.dataset.add) { ev.preventDefault(); addChamp(ev.target.dataset.add); }
    else if (ev.key === "Enter" && ev.target.id === "q") { const first = document.querySelector("#champs .cbtn:not([disabled])"); if (first) choose(first.dataset.id); }
    else if (ev.key === "Escape" && editing) { editing = null; renderEditor(); }
    else if (ev.key === "Escape" && S.ui.sheet) { S.ui.sheet = false; render(); }
    else if (ev.key === "Escape" && ev.target.id === "q") { S.ui.q = ""; render(); }
    else if (S.tab === "live" && !editing && ev.key.length === 1 && !ev.metaKey && !ev.ctrlKey && !ev.altKey
      && !/^(INPUT|SELECT|TEXTAREA)$/.test(ev.target.tagName) && matchMedia("(min-width: 761px)").matches) {
      const q = document.getElementById("q"); if (q) q.focus(); // PC: 아무 글자나 치면 바로 챔피언 검색
    }
  });

  document.getElementById("champList").innerHTML = window.CHAMPIONS.map((c) => `<option value="${esc(c.ko)}">`).join("");
  render();
})();
