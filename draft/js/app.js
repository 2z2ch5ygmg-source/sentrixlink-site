(function () {
  const { ROLES, ROLE_KO, COMPS, ORDER, LEVEL_KO, STYLE_KO } = window.KB;
  const E = window.Engine;
  const KEY = "sentrix-draft.v1";
  const CH = {};
  window.CHAMPIONS.forEach((c) => (CH[c.id] = c));

  // ---------- state ----------
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const emptySteps = () => ORDER.map(() => ({ champ: null, role: null, skip: false }));
  // 솔랭·자랭: 팀 자료 없이 쓰는 빈 팀(챔프폭·전적 없음 → 메타·상성·조합으로만 추천)
  const SOLO = { our: "solo-our", enemy: "solo-enemy" };
  const soloTeam = (id, name) => ({ id, name, solo: true, players: Object.fromEntries(ROLES.map((r) => [r, { riot: "", tier: "", pts: 50, pool: [] }])) });
  function ensureSolo(st) {
    if (!st.teams.find((t) => t.id === SOLO.our)) st.teams.push(soloTeam(SOLO.our, "솔랭·자랭 우리팀"));
    if (!st.teams.find((t) => t.id === SOLO.enemy)) st.teams.push(soloTeam(SOLO.enemy, "솔랭·자랭 상대팀"));
    return st;
  }
  const isSolo = (id) => id === SOLO.our || id === SOLO.enemy;
  // 상대가 솔랭·자랭이면 랭크 드래프트 순서(밴 10 → 픽 1-2-2-2-2-1), 아니면 대회 순서
  function syncQueue(resetDraft) {
    const kind = isSolo(S.enemyTeam) ? "ranked" : "tournament";
    if (ORDER.kind !== kind) {
      window.KB.useOrder(kind, S.draft.ourSide);
      if (resetDraft) { S.draft.steps = emptySteps(); S.draft.idx = 0; }
      // 솔랭·자랭은 피어리스 끔, 대회로 돌아오면 전에 쓰던 피어리스 설정으로
      if (kind === "ranked") { S.series.prevMode = S.series.mode; S.series.mode = "off"; }
      else if (S.series.prevMode) { S.series.mode = S.series.prevMode; delete S.series.prevMode; }
    }
  }
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
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.teams && s.draft) {
          // 기본 명단이 바뀌면(계정·티어) 저장된 팀에도 반영하고, 직접 넣은 챔프폭은 유지
          if (s.seed !== window.SEED_VERSION) {
            window.SEED_TEAMS.forEach((st) => {
              const t = s.teams.find((x) => x.id === st.id);
              if (!t) return;
              Object.keys(st.players).forEach((r) => { const p = t.players[r] || (t.players[r] = { pool: [] }); Object.assign(p, { riot: st.players[r].riot, tier: st.players[r].tier, pts: st.players[r].pts }); });
            });
            s.seed = window.SEED_VERSION;
          }
          return Object.assign(fresh(), s);
        }
      }
    } catch (e) { /* 저장소를 못 쓰는 환경: 기본값 */ }
    return fresh();
  }
  let S = ensureSolo(load());
  if (isSolo(S.enemyTeam)) window.KB.useOrder("ranked", S.draft.ourSide);
  S.ui.sheet = false;
  S.ui.predRole = "";
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 무시 */ } }

  // ---------- helpers ----------
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const IMG = (id) => `https://ddragon.leagueoflegends.com/cdn/${window.DDRAGON_VERSION}/img/champion/${id}.png`;
  // 선 아이콘(24 격자, currentColor): 글 대신 상태를 보여 주는 배지·태그용
  const ICO = {
    sword: "M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2",
    link: "M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    trophy: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3",
    alert: "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01",
    eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
    users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
    layers: "M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    flag: "M4 22V4M4 4h12l-2 4 2 4H4",
    cut: "M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12",
    target: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
    down: "M12 5v14M19 12l-7 7-7-7",
    map: "M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15",
    swap: "M7 16V4M3 8l4-4 4 4M17 8v12M21 16l-4 4-4-4",
  };
  const ico = (n) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICO[n] || ICO.alert}"/></svg>`;
  // 픽 순서 이유 종류 → 아이콘·색
  const KIND = { safe: ["shield", "good"], counter: ["sword", "good"], grab: ["flag", "good"], set: ["link", "good"], meta: ["trophy", "info"],
    core: ["layers", "info"], flex: ["swap", "info"], wait: ["eye", "warn"], risk: ["alert", "bad"], thin: ["alert", "bad"], cut: ["cut", "bad"], sylas: ["alert", "bad"] };
  // 배지: 짧은 말만 보이고, 누르면(PC는 마우스도) 전체 이유가 펼쳐짐
  function badge(t) {
    const [ic, tone] = KIND[t.k] || ["alert", "info"];
    // 챔프가 걸린 배지는 글 대신 초상화 + 한 줄(cap). 전체 문장은 화면 낭독용으로만 둔다
    const pop = t.ids && t.ids.length
      ? `<div class="bdg-pop"><div class="bdg-ch">${t.ids.map((id) => `<span class="pc">${icon(id).replace(/ title="[^"]*"/, "")}<span>${esc(CH[id].ko)}</span></span>`).join("")}</div>${t.cap ? `<p class="bdg-cap">${esc(t.cap)}</p>` : ""}<span class="sr-only">${esc(t.d)}</span></div>`
      : `<div class="bdg-pop"><p class="bdg-cap">${esc(t.d)}</p></div>`;
    return `<details class="bdg t-${tone}"><summary>${ico(ic)}<span>${esc(t.t)}</span></summary>${pop}</details>`;
  }
  // 추천 카드 장단점 문장 → 아이콘 + 짧은 말
  function shortTag(g, good) {
    let m;
    if (good) {
      if ((m = g.match(/^(.+?) 상대 강함(.*)$/))) return ["sword", m[1] + m[2]];
      if ((m = g.match(/^(.+) 조합에 맞음$/))) return ["layers", m[1]];
      if (g === "갱 버팀") return ["shield", "갱 버팀"];
      if (g === "앞라인 보강") return ["shield", "앞라인"];
      if ((m = g.match(/^팀 경기 (.+)$/))) return ["users", "팀 " + m[1]];
      if (g === "상대 주력 뺏기") return ["target", "주력 뺏기"];
      if (g === "대회 메타 픽") return ["trophy", "메타"];
      if (g === "상대 궁 뺏어 쓰기") return ["target", "궁 뺏기"];
      if ((m = g.match(/^(.+?)[과와] 세트$/))) return ["link", m[1]];
      if ((m = g.match(/^(\S+) 시나리오 \S+ (주 픽|대체 픽)$/))) return ["map", m[1] + " " + (m[2] === "주 픽" ? "주 픽" : "대체")];
      return ["layers", g];
    }
    if (/사일러스 밴 필요/.test(g)) return ["alert", "사일러스 밴"];
    if (/사일러스에 궁/.test(g)) return ["alert", "사일러스"];
    if ((m = g.match(/^(.+) 조합에 약함$/))) return ["down", m[1]];   // 빨간 아래 화살표 = 약함
    if ((m = g.match(/^(.+?) 상대 불리(.*)$/))) return ["alert", m[1] + " 불리" + m[2]];
    return ["down", g];
  }
  const tagHtml = (g, good) => { const [i, t] = shortTag(g, good); return `<span class="tg ${good ? "good" : "bad"}" title="${esc(g)}">${ico(i)}${esc(t)}<span class="sr-only"> (${esc(g)})</span></span>`; };
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
    return pool.map(([id, lv, one]) => `<span class="chip ${opts && opts.edit ? "ed-chip" : ""}" ${opts && opts.edit ? `data-act="cycle" data-team="${t.id}" data-role="${r}" data-id="${id}"` : ""}>${icon(id, "sm")}${esc(CH[id] ? CH[id].ko : id)} ${lvTag({ lv, one })}${opts && opts.edit ? `<span class="del" data-act="del" data-team="${t.id}" data-role="${r}" data-id="${id}" title="삭제" role="button" aria-label="삭제"><svg class="ico-x" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></span>` : ""}</span>`).join("");
  }
  const TIER_KO = { IRON: "아이언", BRONZE: "브론즈", SILVER: "실버", GOLD: "골드", PLATINUM: "플래티넘", EMERALD: "에메랄드", DIAMOND: "다이아", MASTER: "마스터", GRANDMASTER: "그랜드마스터", CHALLENGER: "챌린저" };
  function totalTxt(t, r) {
    const sc = E.scoutOf(t, r);
    if (!sc || !sc.total || !sc.total.g) return "";
    const tierTxt = sc.tier ? ` · 솔랭 ${TIER_KO[sc.tier.tier] || sc.tier.tier}${sc.tier.rank && !/MASTER|CHALLENGER/.test(sc.tier.tier) ? " " + ({ I: 1, II: 2, III: 3, IV: 4 }[sc.tier.rank] || sc.tier.rank) : ""}` : "";
    return `${tierTxt} · 랭크 ${sc.total.g}판 ${Math.round((sc.total.w / sc.total.g) * 100)}%`;
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
  // 초성: "ㅁㅍ" → 말파이트. 글자 조합 중인 끝 자음(예: "말ㅍ")도 초성으로 비교
  const CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
  const cho = (s) => [...s].map((ch) => { const k = ch.charCodeAt(0) - 0xac00; return k >= 0 && k <= 11171 ? CHO[Math.floor(k / 588)] : ch; }).join("");
  function matches(c, q) {
    if (!q) return true;
    q = q.toLowerCase().replace(/\s+/g, "");
    const names = [c.ko.replace(/\s+/g, ""), c.al.replace(/\s+/g, "")].filter(Boolean);
    if (names.some((n) => n.includes(q)) || c.id.toLowerCase().includes(q)) return true;
    if (/[ㄱ-ㅎ]/.test(q)) {
      // 앞부분은 글자 그대로, 자음만 친 부분은 초성으로
      return names.some((n) => { for (let i = 0; i + q.length <= n.length; i++) { const part = n.slice(i, i + q.length); if ([...q].every((ch, k) => ch === part[k] || (/[ㄱ-ㅎ]/.test(ch) && cho(part[k]) === ch))) return true; } return false; });
    }
    return false;
  }

  // ---------- header ----------
  function renderTop() {
    document.querySelectorAll(".tab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === S.tab)));
    // 대회 팀 목록 아래에 「솔랭·자랭」(팀 자료 없음)
    const opts = (sel, excl, soloId) => S.teams.filter((t) => t.id !== excl && !t.solo).map((t) => `<option value="${t.id}" ${t.id === sel ? "selected" : ""}>${esc(t.name)}</option>`).join("")
      + `<optgroup label="팀 자료 없이"><option value="${soloId}" ${sel === soloId ? "selected" : ""}>솔랭·자랭</option></optgroup>`;
    document.getElementById("ourSel").innerHTML = opts(S.ourTeam, null, SOLO.our);
    document.getElementById("enemySel").innerHTML = opts(S.enemyTeam, S.ourTeam, SOLO.enemy);
  }

  // ---------- live draft ----------
  // 단계 이름: 대회 = 1차 밴·1차 픽·2차 밴·2차 픽, 솔랭·자랭 = 밴·픽
  function phaseName(i) {
    const t = ORDER[i][1];
    if (ORDER.kind === "ranked") return (t === "ban" ? "밴" : "픽") + " 단계";
    let n = 0;
    for (let k = 0; k <= i; k++) if (ORDER[k][1] === t && (k === 0 || ORDER[k - 1][1] !== t)) n++;
    return `${n}차 ${t === "ban" ? "밴" : "픽"}`;
  }
  const curStep = () => (S.draft.idx < ORDER.length ? ORDER[S.draft.idx] : null);
  function sideIdx(side, type) { return ORDER.map((o, i) => (o[0] === side && o[1] === type ? i : -1)).filter((i) => i >= 0); }

  function renderSide(side, planned) {
    const who = E.whoOfSide(S, side);
    const t = E.teamOf(S, who);
    const bans = sideIdx(side, "ban").map((i) => {
      const s = S.draft.steps[i];
      const now = i === S.draft.idx ? "now" : "";
      return `<div class="slot-ban ${now}">${s.champ ? `<img src="${IMG(s.champ)}" alt="${esc(CH[s.champ].ko)}" title="${esc(CH[s.champ].ko)}" onerror="this.remove()"><span class="x"><svg class="ico-x" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></span>` : s.skip ? `<span class="dim">없음</span>` : ""}</div>`;
    }).join("");
    const picks = sideIdx(side, "pick").map((i) => {
      const s = S.draft.steps[i];
      const now = i === S.draft.idx ? "now" : "";
      if (!s.champ) {
        const pr = who === "our" && planned ? planned[i] : null;
        return `<div class="slot-pick empty ${now}"><span class="ic"></span><div class="who"><div class="cn">${now ? "선택 중" : pr ? ROLE_KO[pr] : "대기"}</div><div class="pn">${pr ? (now ? ROLE_KO[pr] + " 차례" : "예정") : ""}</div></div></div>`;
      }
      // 라인 '모름': 다른 픽으로 좁혀진 라인(자동) 또는 남은 후보를 보여 준다
      const ep = s.role === "?" ? E.picks(S, who).find((x) => x.i === i) : null;
      const eff = ep ? ep.role : s.role;
      const p = eff ? t.players[eff] : null;
      const unk = who === "enemy" || s.role === "?"
        ? `<option value="?" ${s.role === "?" ? "selected" : ""}>${ep && ep.role ? `모름→${ROLE_KO[ep.role]}` : "모름"}</option>` : "";
      const sel = `<select data-act="role" data-i="${i}" aria-label="라인">${unk}${ROLES.map((r) => `<option value="${r}" ${r === s.role ? "selected" : ""}>${ROLE_KO[r]}</option>`).join("")}</select>`;
      const pn = ep && !ep.role ? `<span class="unk">${ep.cands.map((r) => ROLE_KO[r]).join("·")} 중</span>` : p ? esc(nick(p.riot)) + (ep && ep.guessed ? " (추정)" : "") : "";
      return `<div class="slot-pick ${now}">${icon(s.champ)}<div class="who"><div class="cn">${esc(CH[s.champ].ko)}</div><div class="pn">${pn}</div></div>${sel}</div>`;
    }).join("");
    return `<section class="side ${side}"><div class="side-h"><span class="nm">${esc(t.name)}</span><span class="tag">${side === "B" ? "블루" : "레드"} · ${who === "our" ? "우리" : "상대"}</span></div><div class="bans">${bans}</div><div class="picks">${picks}</div></section>`;
  }

  function recCard(r, type, muted, rank) {
    // 우리 픽: 무엇에 좋고 무엇에 약한지만 짧게. 밴·상대 예상: 근거 두 줄
    // 이름표와 같은 말(예: '한타 조합' + '한타 조합에 맞음')은 한 번만
    const goods = r.good ? r.good.filter((g) => !(r.label && / 조합$/.test(r.label) && g === r.label + "에 맞음")) : null;
    const why = r.good ? `<span class="tgs">${goods.map((g) => tagHtml(g, true)).join("")}${r.bad.map((b) => tagHtml(b, false)).join("")}</span>`
      : r.reasons.filter((x) => x.v > 0 && !x.order).slice(0, 2).map((x) => esc(x.d)).join("<br>");
    return `<button class="rec ${type} ${muted ? "muted" : ""} ${rank === 1 ? "first" : ""}" data-act="pick" data-id="${r.id}" ${r.role ? `data-role="${r.role}"` : ""}>
      ${rank ? `<span class="rk" aria-label="추천 ${rank}순위">${rank}</span>` : ""}<span class="lab">${esc(r.label)}</span>${icon(r.id, "lg").replace(/ title="[^"]*"/, "")}<span class="cn">${esc(CH[r.id].ko)}</span>
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
    const pr = who === "enemy" ? S.ui.predRole || "" : "";
    const theirPicks = who === "enemy" ? E.picks(S, "enemy") : [];
    const roleTabs = who === "enemy" ? `<div class="seg pred-seg" role="group" aria-label="라인별 예상">${[["", "전체"]].concat(ROLES.map((r) => [r, ROLE_KO[r]])).map(([r, n]) => {
      const done = r && theirPicks.find((p) => p.role === r);
      return `<button data-act="pred" data-r="${r}" aria-pressed="${pr === r}" ${done ? `disabled title="${esc(CH[done.champ].ko)} 픽 완료"` : ""}>${n}</button>`; }).join("")}</div>` : "";
    if (pr) {
      const pl = E.predictRole(S, "enemy", pr);
      const p = t.players[pr];
      body = pl.length ? `<p class="help pred-h">${ROLE_KO[pr]} ${esc(nick(p.riot))} 선수가 꺼낼 수 있는 챔프 · 눌러서 상대 ${type === "ban" ? "밴" : "픽"}으로 기록</p><div class="recs">${pl.map((x) => `<button class="rec muted pred" data-act="pick" data-id="${x.id}">
        <span class="lab">${esc(x.label)}</span>${icon(x.id, "lg")}<span class="cn">${esc(CH[x.id].ko)}</span><span class="why">${esc(x.d)}${x.meta ? `<br>${esc(x.meta)}` : ""}</span>
        ${x.vsOurs.length ? `<span class="vs-ours">${x.vsOurs.map(esc).join("<br>")}</span>` : ""}
        ${x.answers.length ? `<span class="ans">우리 대응 ${x.answers.map((id) => `<b>${esc(CH[id].ko)}</b>`).join("·")}</span>` : ""}</button>`).join("")}</div>`
        : `<div class="empty-recs">${ROLE_KO[pr]} 예상 챔프가 없습니다.</div>`;
    } else if (list.length) body = `<div class="recs">${list.map((r, i) => recCard(r, type, who === "enemy", who === "our" ? i + 1 : 0)).join("")}</div>`;
    else body = `<div class="empty-recs">${who === "enemy" && !E.teamHasPools(t) ? "상대 챔프폭이 비어 있어 예상이 어렵습니다. 「상대팀 분석」에서 챔프폭을 넣으면 예상이 나옵니다." : "추천할 챔프가 없습니다. 아래에서 직접 고르세요."}</div>`;
    return `<div class="now-box"><div class="now-h"><span class="what ${side}">${who === "our" ? "추천 순서" : "상대 예상"}</span><span class="step">${title}</span>${roleTabs}<span class="dir">${dirTxt}</span></div>${body}</div>`;
  }

  function renderStatus(extra) {
    const st = curStep();
    const done = !st;
    const side = st ? st[0] : null;
    const who = st ? E.whoOfSide(S, side) : null;
    const t = st ? E.teamOf(S, who) : null;
    const what = done ? "밴픽 완료" : `${who === "our" ? "우리팀" : esc(t.name)} ${st[1] === "ban" ? "밴" : "픽"}`;
    const phase = done ? "아래 전략 확인" : phaseName(S.draft.idx);
    return `<div class="dstat ${side || ""} ${extra || ""}"><div class="dstat-top"><span class="dstat-n">${done ? 20 : S.draft.idx + 1}<small>/20</small></span><span class="dstat-ph">${phase}</span></div>
      <div class="dstat-what">${what}</div>
      <div class="dstat-act">${st && st[1] === "ban" ? `<button class="btn sm ghost" data-act="skip">밴 넘기기</button>` : ""}<button class="btn sm" data-act="undo" ${S.draft.idx ? "" : "disabled"}>되돌리기</button>${done ? "" : `<button class="btn sm primary m-only" data-act="sheet">고르기</button>`}</div></div>`;
  }

  // 챔피언 버튼 목록만 따로 만든다: 검색 입력 중에는 이것만 바꿔서 한글 조합(ㄹ+ㅜ→루)이 끊기지 않게
  function champButtons() {
    const st = curStep();
    const who = st ? E.whoOfSide(S, st[0]) : "our";
    const taken = E.taken(S);
    const locked = E.lockedFor(S, who);
    const ourPool = new Set();
    const ot = E.teamOf(S, "our");
    ROLES.forEach((r) => (ot.players[r].pool || []).forEach((p) => ourPool.add(p[0])));
    const u = S.ui;
    const list = window.CHAMPIONS.filter((c) => matches(c, u.q) && (!u.role || c.pos.includes(u.role)) && (!u.onlyPool || ourPool.has(c.id)));
    return list.map((c) => {
      const dis = !st || taken.has(c.id) || locked.has(c.id);
      return `<button class="cbtn ${ourPool.has(c.id) ? "mine" : ""} ${locked.has(c.id) ? "locked" : ""}" data-act="pick" data-id="${c.id}" ${dis ? "disabled" : ""} aria-label="${esc(c.ko)}">${icon(c.id).replace(/ title="[^"]*"/, "")}<span>${esc(c.ko)}</span></button>`;
    }).join("") || `<span class="muted champs-empty">검색 결과 없음</span>`;
  }
  function renderGrid() {
    const u = S.ui;
    const btns = champButtons();
    const roleBtns = [["", "전체"]].concat(ROLES.map((r) => [r, ROLE_KO[r]])).map(([r, n]) => `<button aria-pressed="${u.role === r}" data-act="frole" data-r="${r}">${n}</button>`).join("");
    return `<div class="pool"><div class="sheet-h m-only"><b>챔피언 고르기</b><button class="btn sm" data-act="sheet">닫기</button></div><div class="pool-bar"><input id="q" class="input" placeholder="챔피언 검색 (예: 말파, 오리)" value="${esc(u.q)}" autocomplete="off">
      <div class="seg">${roleBtns}</div>
      <button class="btn sm ${u.onlyPool ? "primary" : ""}" data-act="onlypool">우리 챔프폭만</button></div>
      <div class="champs" id="champs">${btns}</div></div>`;
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

  function renderThreat(compact) {
    if (!E.teamHasPools(E.teamOf(S, "enemy")) && !E.picks(S, "enemy").length) return "";   // 솔랭·자랭: 상대 정보가 없으면 픽이 나온 뒤부터
    const k = E.keyThreats(S, "our");
    if (!k || !k.top) return "";
    const th = k.top, a = k.advice;
    const typeTxt = { gank: "갱킹형 정글", jungle: "정글", carry: "핵심 딜러", lane: "라이너" }[th.type];
    const opts = a.opts.map((o) => `<div class="th-opt"><div class="th-ot"><b title="${esc(o.d)}">${esc(o.t)}</b>${compact ? "" : ` <span class="help">${esc(o.d)}</span>`}</div>
      <div class="row-chips">${o.picks.map((id) => `<span class="chip">${icon(id, "sm")}${esc(CH[id].ko)}</span>`).join("")}</div></div>`).join("");
    const lanes = ROLES.filter((r) => a.lanes[r]).map((r) => `<li><b>${ROLE_KO[r]}</b> ${esc(a.lanes[r])}</li>`).join("");
    const second = k.second && k.second.champ ? `<span class="help">다음: ${ROLE_KO[k.second.r]} ${esc(k.second.p.riot.split("#")[0])} · ${esc(CH[k.second.champ].ko)}</span>` : "";
    return `<section class="threat-box ${compact ? "compact" : ""}">
      <div class="now-h th-head"><span class="what th-title">요주의 인물</span><span class="pill bad">${typeTxt}</span><span class="pill">${th.picked ? "픽 확정" : "예상 픽"}</span></div>
      <div class="th-h">${th.champ ? icon(th.champ, "lg") : ""}<div class="th-who">
        <div class="th-n">${ROLE_KO[th.r]} ${esc(th.p.riot.split("#")[0])} · ${esc(th.champ ? CH[th.champ].ko : "-")}</div>
        <div class="help">${esc(th.why.join(" · "))}</div>${second}</div></div>
      <p class="th-comp">${esc(a.comp)}</p>
      ${opts ? `<div class="th-opts">${opts}</div>` : ""}
      <details class="th-lanes" ${compact ? "" : "open"}><summary>라인별 움직임</summary><ul class="plain">${lanes}</ul></details></section>`;
  }

  // 상대 분석 탭: 밴픽 전 상태 기준으로 요주의 인물 보기
  function renderThreatFor(enemyId) {
    const keep = { enemyTeam: S.enemyTeam, draft: S.draft, series: S.series };
    S.enemyTeam = enemyId; S.draft = { ourSide: keep.draft.ourSide, steps: emptySteps(), idx: 0 }; S.series = { game: 1, mode: "off", locked: [] };
    try { return renderThreat(false); } finally { Object.assign(S, keep); }
  }

  const cutChips = (lost) => (lost || []).map((l) => `<span class="chip cut" title="${esc(CH[l.id].ko)} ${esc(l.st)}">${icon(l.id, "sm")}<s>${esc(CH[l.id].ko)}</s><span class="st">${esc(l.st)}</span></span>`).join("");
  // 큰 그림: 1차 밴 뒤 남은 챔프로 만들 수 있는 우리 조합 시나리오 (픽마다 갱신, 칸마다 대체 픽)
  function renderScenarios() {
    const list = E.scenarios(S, "our");
    if (!list || !list.length) return "";
    const cur = list.find((x) => x.key === S.ui.scen) || list[0];
    const st = curStep();
    const ourTurn = st && st[1] === "pick" && E.whoOfSide(S, st[0]) === "our";
    const tabs = list.map((x, k) => `<button data-act="scen" data-k="${x.key}" aria-pressed="${x === cur}">${"ABC"[k]} ${esc(x.short)}</button>`).join("");
    const chip = (id, r, notes, main) => `<button class="chip pp-c ${main ? "sc-main" : ""}" data-act="${ourTurn ? "pick" : ""}" data-id="${id}" data-role="${r}" ${notes && notes.length ? `title="${esc(notes.join(" · "))}"` : ""}>${icon(id, "sm")}${esc(CH[id].ko)}</button>`;
    const rows = ROLES.map((r) => {
      const x = cur.slots[r];
      if (!x) return "";
      if (x.done) return `<div class="sc-row done"><span class="pp-role">${ROLE_KO[r]}</span><span class="sc-pick">${icon(x.id, "sm")}<b>${esc(CH[x.id].ko)}</b><span class="dim">확정</span></span></div>`;
      const main = x.id ? chip(x.id, r, x.notes, true) : `<span class="dim">남은 챔프폭 없음</span>`;
      const alts = x.alts && x.alts.length ? `<span class="sc-alt-l">대체</span>${x.alts.map((a) => chip(a.id, r, a.notes)).join("")}` : x.id ? `<span class="sc-warn">대체 없음</span>` : "";
      const notes = (x.notes || []).map((n) => {
        let m;
        if ((m = n.match(/^(.+?) 상대 강함(\(라인 모름\))?$/))) return `<span class="tg good" title="${esc(n)}">${ico("sword")}${esc(m[1])}${m[2] ? "?" : ""}</span>`;
        if ((m = n.match(/^(.+?) 상대 불리(\(라인 모름\))?$/))) return `<span class="tg bad" title="${esc(n)}">${ico("alert")}${esc(m[1])} 불리${m[2] ? "?" : ""}</span>`;
        if ((m = n.match(/^(.+?)[과와] 세트$/))) return `<span class="tg good" title="${esc(n)}">${ico("link")}${esc(m[1])}</span>`;
        if (n === "사일러스 주의") return `<span class="tg bad" title="사일러스가 남아 있어 궁을 뺏길 수 있음">${ico("alert")}사일러스</span>`;
        return `<span class="tg" title="${esc(n)}">${esc(n)}</span>`;
      }).join("");
      return `<div class="sc-row"><span class="pp-role">${ROLE_KO[r]}</span><div class="sc-cells"><div class="row-chips">${main}${alts}${cutChips(x.lost)}</div>${notes ? `<span class="tgs">${notes}</span>` : ""}</div></div>`;
    }).join("");
    return `<section class="plan-box scen-box"><div class="now-h"><span class="what">큰 그림</span><span class="step">남은 챔프로 만들 수 있는 조합 · 픽마다 갱신</span><div class="seg" role="group" aria-label="시나리오">${tabs}</div></div>
      <div class="sc-sum"><b title="${esc(cur.win)}">${esc(cur.name)}</b>${cur.why.length ? `<span class="tgs">${cur.why.map((w) => /잡는 방향/.test(w) ? `<span class="tg good" title="${esc(w)}">${ico("target")}${esc(w.replace(/^상대 (\S+) 조합을 잡는 방향$/, "$1 상대 유리"))}</span>` : `<span class="tg bad" title="${esc(w)}">${ico("alert")}${esc(w.replace(/ — .*$/, "").replace(/ → .*$/, ""))}</span>`).join("")}</span>` : ""}</div>
      <div class="sc-rows">${rows}</div>
      <p class="help sc-foot">${ourTurn ? "칩을 누르면 바로 픽 · " : ""}고른 조합이 추천 순서에 반영</p></section>`;
  }

  const ROLE_1 = { T: "탑", J: "정", M: "미", A: "원", S: "서" };
  // 밴픽 20칸 타임라인: 옅은 칸 = 밴, 진한 칸 = 픽, 파랑 = 블루, 빨강 = 레드, 노란 테두리 = 지금, 점선 = 남은 차례(우리 예정 라인)
  function timeline(planned) {
    const cells = ORDER.map(([side, type], i) => {
      const s = S.draft.steps[i];
      const who = E.whoOfSide(S, side);
      const pr = !s.champ && planned[i];
      const cls = ["tl-c", side === "B" ? "b" : "r", type, i === S.draft.idx ? "now" : "", s.champ ? "filled" : s.skip ? "skip" : "open", i > 0 && ORDER[i - 1][1] !== type ? "gap" : ""].join(" ");
      const label = `${i + 1}. ${side === "B" ? "블루" : "레드"}(${who === "our" ? "우리" : "상대"}) ${type === "ban" ? "밴" : "픽"}${s.champ ? ` · ${CH[s.champ].ko}` : pr ? ` · ${ROLE_KO[pr]} 예정` : ""}`;
      const inner = s.champ ? `<img src="${IMG(s.champ)}" alt="" loading="lazy" onerror="this.remove()">` : pr ? `<span>${ROLE_1[pr]}</span>` : "";
      return `<li class="${cls}" title="${esc(label)}"><span class="sr-only">${esc(label)}</span>${inner}</li>`;
    }).join("");
    return `<ol class="tl" aria-label="밴픽 순서">${cells}</ol>
      <p class="tl-key"><span><i class="k ban"></i>밴</span><span><i class="k pick"></i>픽</span><span><i class="k b"></i>블루</span><span><i class="k r"></i>레드</span><span><i class="k now"></i>지금</span><span><i class="k open"></i>우리 예정</span></p>`;
  }

  function renderPlan() {
    const p = E.pickPlan(S, "our");
    if (!p.plan.some((s) => s.items.some((x) => !x.done && x.role))) return "";
    const st = curStep();
    const planned = {};
    p.plan.forEach((sl) => sl.items.forEach((x) => !x.done && x.role && (planned[x.i] = x.role)));
    const cards = p.plan.map((s) => {
      const items = s.items.map((x) => {
        if (x.done) return `<div class="pp-item done">${icon(x.champ, "sm")}<span><b>${esc(CH[x.champ].ko)}</b> <span class="dim">${x.role ? ROLE_KO[x.role] : ""} · 완료</span></span></div>`;
        if (!x.role) return "";
        const cands = x.cands.length ? x.cands.map((c) => `<button class="chip pp-c" data-act="${st && st[1] === "pick" && E.whoOfSide(S, st[0]) === "our" && s.now ? "pick" : ""}" data-id="${c.id}" data-role="${x.role}" title="${esc(E.statText(c.e))}">${icon(c.id, "sm")}${esc(CH[c.id].ko)}${c.e.g ? `<span class="st">${c.e.g}판</span>` : ""}</button>`).join("") : `<span class="dim">남은 챔프폭 없음</span>`;
        // 잘린 주력은 취소선 칩으로(글 대신)
        const cut = (x.mains || []).filter((m) => m.st !== "가능").map((m) => `<span class="chip cut" title="${esc(CH[m.id].ko)} ${esc(m.st)}">${icon(m.id, "sm")}<s>${esc(CH[m.id].ko)}</s><span class="st">${esc(m.st)}</span></span>`).join("");
        const tags = (x.tags || []).filter((t) => t.k !== "cut");
        return `<div class="pp-item"><div class="pp-role">${ROLE_KO[x.role]}</div><div class="row-chips">${cands}${cut}</div>${tags.length ? `<div class="bdgs">${tags.slice(0, 4).map(badge).join("")}</div>` : ""}</div>`;
      }).join("");
      return `<div class="pp-slot ${s.now ? "now" : ""} ${s.items.every((x) => x.done) ? "past" : ""}"><div class="pp-h"><b>${s.label}</b>${s.now ? `<span class="pill gold">지금</span>` : ""}</div>${items}</div>`;
    }).join("");
    const src = window.META ? `메타: op.gg 솔랭 ${window.META.patch} · gol.gg 2026 대회 · 라인 상대 전적 (${window.META.at})` : "밴·진영·상대 공개 라인에 따라 계속 바뀜";
    return `<section class="plan-box"><div class="now-h"><span class="what">픽 순서 전략</span><span class="step" title="${esc(src)}">${window.META ? `메타 ${esc(window.META.patch)}` : ""}</span></div>
      ${timeline(planned)}<div class="pp-grid">${cards}</div></section>`;
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
      <div class="col-main">${renderNow()}${renderScenarios()}${renderThreat(true)}${renderPlan()}</div>
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

  // ---------- 자료 출처·최근 기록·5인 경기 ----------
  const QUEUE = { 420: "솔로랭크", 440: "자유랭크", 400: "일반", 430: "일반", 490: "빠른 대전", 450: "칼바람", 0: "사용자 설정" };
  function recentLine(t, r) {
    const R = window.RECENT;
    if (!R) return "";
    if (R.status !== "ok") return `<div class="help">11/10~ 최근 기록 미확보</div>`;
    const raw = R.players && R.players[t.id] && R.players[t.id][r];
    if (raw && raw.riot && raw.riot !== t.players[r].riot) return `<div class="help">11/10~ 최근 기록 미확보 (계정 변경 — 다음 수집 때 반영)</div>`;
    const x = E.recentOf(t, r);
    if (!x) return `<div class="help">11/10~ 최근 기록 미확보 (계정 조회 실패)</div>`;
    const ar = E.actualRole(t, r);
    const top = (x.champs || []).slice(0, 3).map((c) => `${CH[c.id] ? CH[c.id].ko : c.id} ${c.g}`).join(" · ");
    return `<div class="help">11/10~ 랭크 ${x.n}판${x.n ? ` ${Math.round((x.w / x.n) * 100)}%` : ""}${top ? ` · ${esc(top)}` : ""}</div>`
      + (ar && ar.differs ? `<div class="warn">등록 ${ROLE_KO[r]}인데 최근 ${ar.tot}판 중 ${ROLE_KO[ar.role]} ${ar.n}판</div>` : "");
  }
  function stacksHtml(t, mine) {
    const R = window.RECENT;
    const head = `<div class="section-title"><h2>${mine ? "우리 팀 함께 한 경기" : "상대 팀 함께 한 경기"}</h2><p>같은 팀 선수 2명 이상이 같은 편이었던 경기(자랭 등) · ${R && R.since ? esc(R.since) : "11/10"} 이후</p></div>`;
    if (!R || R.status !== "ok") return head + `<div class="note">미확보 — Riot 최근 경기 수집 전입니다.</div>`;
    const st = E.groupsOf(t);
    const miss = ROLES.filter((r) => { const x = R.players[t.id] && R.players[t.id][r]; return !x || x.error; }).map((r) => `${ROLE_KO[r]} ${esc(t.players[r].riot)}`);
    const missNote = miss.length ? `<p class="help warn" style="margin:0 0 8px">계정을 찾지 못해 빠진 선수: ${miss.join(", ")}</p>` : "";
    if (st === null) return head + `<div class="note">미확보 — 이 팀 자료가 없습니다.</div>`;
    if (!st.length) return head + `<div class="card muted">${missNote}0판 — ${esc(R.since)} 이후 팀원 2명 이상이 같이 한 경기가 없습니다. (수집 ${esc(R.at)})</div>`;
    const wins = st.filter((g) => g.win).length;
    const banCount = {};
    st.forEach((g) => (g.bans || []).forEach((b) => b && (banCount[b] = (banCount[b] || 0) + 1)));
    const bans = Object.entries(banCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const rows = st.map((g) => `<tr><td data-label="시각">${esc(g.date)}</td><td data-label="큐·인원">${QUEUE[g.queue] || g.queue} · ${g.n || 5}명</td><td data-label="결과"><span class="pill ${g.win ? "good" : "bad"}">${g.win ? "승" : "패"}</span></td>
      <td data-label="픽"><div class="row-chips">${ROLES.map((r) => g.picks[r] && CH[g.picks[r]] ? `<span class="chip" title="${ROLE_KO[r]}${g.playedRole && g.playedRole[r] && g.playedRole[r] !== r ? ` (실제 ${ROLE_KO[g.playedRole[r]] || "-"})` : ""}">${icon(g.picks[r], "sm")}${esc(CH[g.picks[r]].ko)}</span>` : "").join("")}</div></td>
      <td data-label="밴"><div class="row-chips">${(g.bans || []).filter((b) => CH[b]).map((b) => `<span class="chip">${icon(b, "sm")}</span>`).join("") || `<span class="dim">-</span>`}</div></td></tr>`).join("");
    const five = st.filter((g) => g.n === 5).length;
    return head + `<div class="card">${missNote}<p class="help" style="margin:0 0 8px">${st.length}판 ${wins}승 (5인 ${five}판) · 출처 ${esc(R.source)} · 수집 ${esc(R.at)}${bans.length ? ` · 자주 밴: ${bans.map(([b, n]) => `${esc(CH[b].ko)} ${n}`).join(", ")}` : ""}</p>
      <div class="tbl-wrap"><table class="study cards-m"><thead><tr><th>시각</th><th>큐·인원</th><th>결과</th><th>함께 한 선수의 픽</th><th>밴</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }
  function dataStatus() {
    const R = window.RECENT, M = window.META, P = window.PRO, SC = window.SCOUT;
    const okCount = (obj, pred) => { let ok = 0, all = 0; Object.values(obj || {}).forEach((t) => Object.values(t).forEach((x) => { all++; if (pred(x)) ok++; })); return `${ok}/${all}명`; };
    const ours = team(S.ourTeam);
    const selfN = ROLES.filter((r) => (ours.players[r].pool || []).length).length;
    const stackTxt = R && R.status === "ok" ? S.teams.map((t) => { const st = E.groupsOf(t); return `${esc(t.name)} ${st === null ? "미확보" : st.length + "판" + (st.some((g) => g.n === 5) ? `(5인 ${st.filter((g) => g.n === 5).length})` : "")}`; }).join(" · ") : "미확보";
    const last = R && R.lastAttempt && !R.lastAttempt.ok ? ` · 마지막 시도 ${esc(R.lastAttempt.at)} 실패: ${esc(R.lastAttempt.reason)}` : "";
    const rows = [
      ["선수 전적 (티어·숙련도·최근 랭크)", "Riot API (league·champion-mastery·match)", R && R.status === "ok" && R.season ? R.at : "미확보", R && R.status === "ok" && R.season ? okCount(R.season, (x) => !x.error) + ` · 선수당 최근 랭크 ${R.seasonCap}판` : "새 키로 수집 전"],
      ["최근 랭크 (11/10~)", "Riot API match-v5", R && R.status === "ok" ? R.at : "미확보", (R && R.status === "ok" ? okCount(R.players, (x) => !x.error) + ` · 선수당 최대 ${R.cap}판` : (R ? esc(R.reason || "") : "-")) + last],
      ["함께 한 경기(2인 이상)", "Riot API match-v5", R && R.status === "ok" ? R.at : "미확보", stackTxt],
      ["메타·라인 상성", "op.gg 솔랭 · gol.gg 시즌 통계", M ? M.at : "미확보", M ? `패치 ${esc(M.patch)} · 상성 ${Object.keys(M.mu || {}).length}챔프` : "-"],
      ["프로 밴픽 순서·바텀 조합", "gol.gg 경기별 페이지", P ? P.at : "미확보", P ? `${P.games}경기 (${P.tournaments.filter((t) => t.games).map((t) => esc(t.name) + " " + t.games).join(", ")})` : "-"],
      ["자기평가", window.SELF_EVAL.status === "ok" ? "팀 공유 시트(CSV)" : "팀원 직접 입력", window.SELF_EVAL.status === "ok" ? window.SELF_EVAL.at : selfN ? "입력됨" : "미입력",
        window.SELF_EVAL.status === "ok" ? `${window.SELF_EVAL.rows}개 응답 · ${selfN}/5명` : window.SELF_EVAL.status === "error" ? `공유 시트 읽기 실패: ${esc(window.SELF_EVAL.reason)}` : `${selfN}/5명 · 이 브라우저에 저장(공유 저장소 미설정)`],
    ];
    return `<div class="section-title"><h2>자료 현황</h2><p>출처 · 수집 시각 · 표본</p></div>
      <div class="card tbl-wrap"><table class="study cards-m"><thead><tr><th>자료</th><th>출처</th><th>수집 시각</th><th>표본</th></tr></thead><tbody>
      ${rows.map((x) => `<tr><td data-label="자료"><b>${x[0]}</b></td><td data-label="출처">${x[1]}</td><td data-label="수집 시각">${x[2] === "미확보" || x[2] === "미입력" ? `<span class="pill bad">${x[2]}</span>` : esc(x[2])}</td><td data-label="표본">${x[3]}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function renderOur() {
    const t = team(S.ourTeam);
    const roster = ROLES.map((r) => { const p = t.players[r]; return `<div class="pl"><div class="role">${ROLE_KO[r]}</div><div class="id" title="${esc(p.riot)}">${esc(nick(p.riot))}</div><div class="tier">${esc(p.tier)} · ${p.pts}점${totalTxt(t, r)}</div>${recentLine(t, r)}<div class="chips">${poolChips(t, r)}</div></div>`; }).join("");
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
    return `<div class="section-title"><h2>${esc(t.name)} 로스터</h2><p>숙련도: 상·중·하, 원챔 = 주력 한 챔프</p><button class="btn sm primary" data-act="edit" data-team="${t.id}">자기평가 입력</button></div>
      <div class="roster">${roster}</div>
      ${stacksHtml(t, true)}
      ${has ? "" : `<div class="note" style="margin-top:12px">챔프폭이 비어 있습니다. 「챔프폭 편집」으로 선수별 챔피언을 넣으면 조합이 계산됩니다.</div>`}
      ${has ? `<div class="section-title"><h2>숙련도 기준 추천 조합</h2><p>잘하는 챔프로 만들 수 있는 조합 순서</p></div>
      <div class="comps">${comps.map((c, i) => compCard(c, null, `<span class="pill ${i === 0 ? "gold" : ""}">${i === 0 ? "주력" : "대안 " + i}</span>`)).join("")}</div>
      <div class="section-title"><h2>피어리스 세트별 조합 배분</h2><p>앞 세트에서 쓴 챔프를 빼고 다시 짠 조합 — 1세트에 주력을 다 쓰면 3세트가 비는지 확인</p></div>
      <div class="series">${plan.map((c, i) => compCard(c, `${i + 1}세트 · ${COMPS[c.key].name}`, `<span class="pill">숙련도 합 ${c.comfort.toFixed(0)}</span>`, true)).join("")}</div>
      <div class="section-title"><h2>챔프폭 보강</h2><p>숙련도 중 이상 챔프가 3개 미만인 라인은 피어리스 후반 세트에서 막힙니다</p></div>
      <div class="card tbl-wrap"><table class="study"><thead><tr><th>라인</th><th>중 이상</th><th>주력 조합에 맞는 연습 추천</th></tr></thead><tbody>
      ${thin.map((x) => `<tr><td><b>${ROLE_KO[x.r]}</b></td><td><span class="pill ${x.solid >= 3 ? "good" : "bad"}">${x.solid}개</span></td><td><div class="row-chips">${x.add.map((id) => `<span class="chip">${icon(id, "sm")}${esc(CH[id].ko)}</span>`).join("")}</div></td></tr>`).join("")}
      </tbody></table></div>` : ""}
      ${dataStatus()}`;
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
        <td data-label="상대 선수"><a href="${opgg(p.riot)}" target="_blank" rel="noopener">${esc(nick(p.riot))}</a><div class="help">${esc(p.tier)} · ${p.pts}점${totalTxt(en, r)}</div>${recentLine(en, r)}</td>
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
      <div style="margin-top:12px">${renderThreatFor(en.id)}</div>
      ${has ? "" : `<div class="note" style="margin-top:12px">이 팀은 op.gg 전적을 읽지 못했고 직접 입력한 챔프폭도 없습니다. 「상대 챔프폭 편집」에 넣으면 카운터·연습 추천·예상 조합이 채워집니다.</div>`}
      <div class="section-title"><h2>라인별 상대와 연습 포인트</h2><p>점수 차 = 우리 − 상대</p></div>
      <div class="card tbl-wrap"><table class="study cards-m"><thead><tr><th>라인</th><th>상대 선수</th><th>우리 선수</th><th>점수 차</th><th>상대 챔프폭</th><th>우리 대응 가능</th><th>새로 연습 추천</th><th>우리 챔프 중 주의</th></tr></thead><tbody>${rows}</tbody></table></div>
      ${compsHtml}
      ${stacksHtml(en, false)}
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
      <div class="modal-h"><h2>${esc(t.name)} · ${t.id === S.ourTeam ? "자기평가 입력" : "챔프폭 편집"}</h2><button class="btn sm" data-act="close">닫기</button></div>
      <p class="help">${t.id === S.ourTeam ? "<b>대회에서 실제로 꺼낼 수 있는 챔프</b>만 넣고 자신감을 고르세요. 본인 평가가 있는 선수는 이 목록만 추천에 쓰고, 전적은 참고로만 붙습니다. " : ""}칩을 누르면 상 → 중 → 하 → 원챔 순서로 바뀝니다. ×는 삭제. 지금은 이 브라우저에만 저장됩니다(팀 공유 저장소 미설정) — 나누려면 상단 「데이터」에서 내보내기 하세요.</p>
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
  function choose(id, wantRole) {
    const st = curStep();
    if (!st || !CH[id]) return;
    const who = E.whoOfSide(S, st[0]);
    if (E.taken(S).has(id) || E.lockedFor(S, who).has(id)) return;
    const step = S.draft.steps[S.draft.idx];
    step.champ = id; step.skip = false;
    step.cands = undefined;
    if (st[1] !== "pick") step.role = null;
    else if (who === "enemy" && S.ui.predRole && E.openRoles(S, "enemy").includes(S.ui.predRole)) step.role = S.ui.predRole;
    else if (who === "our" && wantRole && E.openRoles(S, "our").includes(wantRole)) step.role = wantRole;
    else { const pr = E.pickRole(S, who, id); step.role = pr.role; step.cands = pr.cands; }
    S.draft.idx++;
    if (S.ui.predRole && !E.openRoles(S, "enemy").includes(S.ui.predRole)) S.ui.predRole = "";
    S.ui.sheet = false; S.ui.q = "";
    save(); render();
  }
  function setRole(i, r) {
    const side = ORDER[i][0];
    const s = S.draft.steps[i];
    if (r === "?") { s.role = "?"; if (!s.cands || !s.cands.length) s.cands = E.flexRoles(s.champ); save(); render(); return; }
    const other = S.draft.steps.find((x, j) => j !== i && ORDER[j][0] === side && ORDER[j][1] === "pick" && x.role === r);
    if (other) other.role = s.role === "?" ? "?" : s.role;
    if (other && other.role === "?" && (!other.cands || !other.cands.length)) other.cands = E.flexRoles(other.champ);
    s.role = r; save(); render();
  }

  // ---------- 시야 공부: 정석 와드 자리(목적별) + 이번 판 시야 계획 + 상황 훈련 ----------
  const TYPE_KO = { ward: "와드", ctrl: "제어 와드", sweep: "렌즈(지우기)" };
  // 우리 팀 맞춤: 상대 정글 성향(갱킹형이면 방어 와드), 우리 서폿 성향(이니시면 끊기 와드)
  function visionFocus() {
    const ourT = E.teamOf(S, "our"), enT = E.teamOf(S, "enemy");
    const enJ = E.picks(S, "enemy").find((p) => p.role === "J");
    const topOf = (t, r) => Object.entries(E.poolMap(t, r)).sort((a, b) => (b[1].score || 0) - (a[1].score || 0))[0];
    const jId = enJ ? enJ.champ : (topOf(enT, "J") || [])[0];
    const ourS = E.picks(S, "our").find((p) => p.role === "S");
    const sId = ourS ? ourS.champ : (topOf(ourT, "S") || [])[0];
    const gank = !!(jId && window.KB.GANK.includes(jId));
    const engage = !!(sId && CH[sId] && (CH[sId].st.includes("eng") || CH[sId].st.includes("pick")));   // 이니시·그랩(끌어오기) 서폿
    return { jId, jPicked: !!enJ, gank, sId, sPicked: !!ourS, engage };
  }
  const vseg = (act, cur, items, label) => `<div class="seg" role="group" aria-label="${label}">${items.map(([v, n]) => `<button data-act="${act}" data-v="${v}" aria-pressed="${cur === v}">${n}</button>`).join("")}</div>`;
  // 레드 진영 좌표: 강을 기준으로 뒤집되, 뒤집으면 강·벽에 걸리는 자리는 따로 잰 rx·ry
  function redXY(x, y) {
    const sp = window.VISION.spots.find((p) => p.x === x && p.y === y);
    return sp && sp.rx != null ? { x: sp.rx, y: sp.ry } : { x: y, y: x };
  }
  // 문제 목록 + 레드 진영 변형(-r): 강의가 "레드(퍼플)일 때도 같다/반대편"이라고 한 와드 문제
  function allDrills() {
    const V = window.VISION;
    if (V._all) return V._all;
    const out = [];
    V.drills.forEach((d) => {
      out.push(d);
      if (d.mirror) out.push({ ...d, id: d.id + "-r", side: "R", title: d.title + " (레드)", opts: d.opts.map((o) => ({ ...o, ...(o.rx != null ? { x: o.rx, y: o.ry } : redXY(o.x, o.y)) })) });
    });
    V._all = out;
    return out;
  }
  const drillById = (id) => allDrills().find((d) => d.id === id);
  function renderVision() {
    const V = window.VISION;
    if (!V) return `<div class="card">시야 자료를 불러오지 못했습니다.</div>`;
    const mode = S.ui.vMode || "learn";
    const head = `<div class="vmode">${vseg("vmode", mode, [["learn", "단계별 배우기"], ["spots", "자리 보기"], ["drill", "문제 모음"]], "시야 공부 보기")}</div>`;
    return head + (mode === "drill" ? renderDrill(V) : mode === "spots" ? renderSpots(V) : renderLearn(V));
  }
  const mmss = (t) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
  const vlink = (V, t) => `<a class="vlink" href="${V.source.url}&t=${t}s" target="_blank" rel="noopener" title="${esc(V.source.title)} ${mmss(t)} 장면 열기">${ico("eye")}영상 ${mmss(t)}</a>`;
  function renderSpots(V) {
    const u = S.ui;
    const phase = V.phases.find((p) => p.id === u.vPhase) || V.phases[1];
    // 진영은 실시간 벤픽의 우리 진영을 따르고, 직접 바꾸면 그 진영이 바뀔 때까지 유지
    const side = (u.vSide && u.vSideBase === S.draft.ourSide ? u.vSide : S.draft.ourSide) || "B";
    const role = u.vRole || "", purp = u.vPurp || "";
    const f = visionFocus();
    const pri = (l) => (f.gank && l.tag === "def") || (f.engage && l.tag === "agg");
    const pos = (sp) => (side === "B" ? { x: sp.x, y: sp.y } : redXY(sp.x, sp.y));   // 레드는 강을 기준으로 뒤집기
    const spotOf = (id) => V.spots.find((x) => x.id === id);
    // 역할·목적을 고르면 나머지는 아예 숨긴다
    const lessons = V.lessons.filter((l) => l.phase === phase.id && (!role || l.roles.includes(role)) && (!purp || l.tag === purp));
    const areas = [...new Set(lessons.map((l) => l.spot))].map(spotOf);
    const marks = areas.map((sp) => {
      const ls = lessons.filter((l) => l.spot === sp.id), p = pos(sp);
      const ctrl = ls.some((l) => l.type === "ctrl");
      return `<span class="varea p-${ls[0].tag}" style="left:${p.x}%;top:${p.y}%" aria-hidden="true"></span><button class="vm p-${ls[0].tag} ${ctrl ? "t-ctrl" : ""} ${ls.some(pri) ? "pri" : ""} ${u.vSpot === sp.id ? "sel" : ""}" style="left:${p.x}%;top:${p.y}%" data-act="vspot" data-id="${sp.id}" aria-label="${sp.id}번 ${esc(sp.name)}">${sp.id}</button>`;
    }).join("");
    const base = side === "B" ? `<span class="vbase ours" style="left:9%;top:91%">우리</span><span class="vbase theirs" style="left:91%;top:9%">상대</span>` : `<span class="vbase ours" style="left:91%;top:9%">우리</span><span class="vbase theirs" style="left:9%;top:91%">상대</span>`;
    // 목록: 목적별 묶음 — 강의 한 줄 요약 + 그 장면 영상 링크
    const groups = V.purposes.map((pu) => {
      const items = lessons.filter((l) => l.tag === pu.id);
      if (!items.length) return "";
      const rows = items.map((l) => { const sp = spotOf(l.spot); return `<li class="vrow ${u.vSpot === l.spot ? "sel" : ""}" data-act="vspot" data-id="${l.spot}" tabindex="0">
        <span class="vm p-${l.tag} ${l.type === "ctrl" ? "t-ctrl" : ""} ${pri(l) ? "pri" : ""}" aria-hidden="true">${l.spot}</span>
        <span class="vr-main"><b>${esc(l.title)}</b><span class="vr-sub">${esc(sp.name)} · ${l.type === "ctrl" ? "제어 와드" : "와드"} · ${l.roles.map((r) => ROLE_KO[r]).join("·")}${pri(l) ? ` · <span class="vr-pri">우리 팀 우선</span>` : ""}</span><span class="vr-why">${esc(l.text)}</span>${vlink(V, l.t)}</span></li>`; }).join("");
      return `<li class="vgrp"><div class="vgrp-h p-${pu.id}"><b>${pu.name}</b><span>${esc(pu.when)}</span></div><ol class="vlist">${rows}</ol></li>`;
    }).join("");
    // 이번 판 시야 계획: 단계마다 누가 몇 번 구역
    const plan = V.phases.map((ph) => {
      const ls = V.lessons.filter((l) => l.phase === ph.id && (!role || l.roles.includes(role)));
      const by = {};
      ls.forEach((l) => { const r = role || l.roles[0]; (by[r] = by[r] || []); if (!by[r].some((x) => x.spot === l.spot)) by[r].push(l); });
      const who = ROLES.filter((r) => by[r]).map((r) => `<span class="vp-who"><b>${ROLE_KO[r]}</b>${by[r].map((l) => `<span class="vm mini p-${l.tag} ${l.type === "ctrl" ? "t-ctrl" : ""} ${pri(l) ? "pri" : ""}">${l.spot}</span>`).join("")}</span>`).join("") || `<span class="dim">없음</span>`;
      return `<button class="vp ${ph.id === phase.id ? "on" : ""}" data-act="vphase" data-v="${ph.id}"><span class="vp-h"><b>${ph.name}</b><span class="dim">${ph.time}</span></span><span class="vp-r">${who}</span></button>`;
    }).join("");
    const fx = [];
    if (f.jId) fx.push(`<span class="tg ${f.gank ? "bad" : ""}">${icon(f.jId, "sm")}상대 정글 ${esc(CH[f.jId].ko)}${f.jPicked ? "" : "(예상)"} · ${f.gank ? "갱킹형 → 갱·카정 대비 우선" : "성장형 → 상대 정글 시야"}</span>`);
    if (f.sId) fx.push(`<span class="tg ${f.engage ? "good" : ""}">${icon(f.sId, "sm")}우리 서폿 ${esc(CH[f.sId].ko)} · ${f.engage ? "이니시·그랩 → 낚시 와드" : "보호형 → 방어 시야"}</span>`);
    const purpKey = V.purposes.map((pu) => `<button class="vpk p-${pu.id}" data-act="vpurp" data-v="${pu.id}" aria-pressed="${purp === pu.id}"><b>${pu.name}</b><span>${esc(pu.what)}</span></button>`).join("");
    return `<section class="card vbox">
      <div class="now-h"><span class="what">이번 판 시야 계획</span><span class="step">${side === "B" ? "블루" : "레드"} 진영 · ${esc(E.teamOf(S, "our").name)} vs ${esc(E.teamOf(S, "enemy").name)}</span></div>
      ${fx.length ? `<div class="tgs vfx">${fx.join("")}</div>` : ""}
      <div class="vplan">${plan}</div></section>
    <section class="card vbox">
      <p class="vsrc">출처 <a href="${V.source.url}" target="_blank" rel="noopener">${esc(V.source.author)} · ${esc(V.source.title)}</a> — 자리는 영상 장면의 미니맵 위치를 구역으로 표시, 정확한 지점은 각 「영상」 링크에서</p>
      <div class="vpks" role="group" aria-label="와드 목적">${purpKey}</div>
      <div class="vctl">${vseg("vphase", phase.id, V.phases.map((p) => [p.id, p.name]), "단계")}${vseg("vrole", role, [["", "전체"]].concat(ROLES.map((r) => [r, ROLE_KO[r]])), "역할")}${vseg("vside", side, [["B", "블루"], ["R", "레드"]], "진영")}</div>
      <p class="vtip"><b>${phase.name}</b> <span class="dim">${phase.time}</span> — ${esc(phase.tip)}${purp ? ` · <b>${V.purposes.find((x) => x.id === purp).name}</b>만` : ""}${role ? ` · <b>${ROLE_KO[role]}</b>만` : ""}</p>
      <div class="vgrid">
        <div class="vmap"><img src="https://ddragon.leagueoflegends.com/cdn/${window.DDRAGON_VERSION}/img/map/map11.png" alt="소환사의 협곡 미니맵" loading="lazy">${base}${marks}</div>
        <ol class="vlist vgroups">${groups || `<li class="dim">이 단계에 ${role ? ROLE_KO[role] + " " : ""}강의 내용이 없습니다.</li>`}</ol>
      </div>
      <p class="vkey"><span><i class="vm p-def"></i>갱·카정 대비</span><span><i class="vm p-agg"></i>낚시·정보</span><span><i class="vm p-obj"></i>오브젝트</span><span><i class="vm p-def t-ctrl"></i>분홍 테두리 = 제어 와드</span><span class="dim">번호 둘레 = 강의 장면의 구역</span></p>
    </section>`;
  }
  // 문제 한 장: 상황(시간·오브젝트·양 팀 레벨·아이템) → 질문 → 고르기 → 왜 맞고 틀린지
  function drillCard(V, d, numLabel) {
    const ans = (S.ui.ans || {})[d.id];
    const done = ans != null;
    const team = (arr, cls) => `<div class="dteam ${cls}">${arr.map(([id, lv, it]) => `<span class="dch">${icon(id, "sm")}<b>${esc(CH[id].ko)}</b><span class="dlv">${lv}레벨</span><span class="dit">${esc(it)}</span></span>`).join("")}</div>`;
    const optCls = (o, i) => !done ? "" : o.ok ? "ok" : i === ans ? "no" : "";
    let body;
    if (d.kind === "map" || d.kind === "pos") {
      const F = d.field || {};
      const champ = ([id, x, y], cls) => `<span class="df-ch ${cls}" style="left:${x}%;top:${y}%" title="${esc(CH[id].ko)}">${icon(id, "sm")}</span>`;
      const bg = `<div class="dfield">${F.fog ? `<span class="df-fog" style="left:${F.fog.x}%;top:${F.fog.y}%;width:${F.fog.w}%;height:${F.fog.h}%">${esc(F.fog.t)}</span>` : ""}
          ${(F.danger || []).map((z) => `<span class="df-zone" style="left:${z.x}%;top:${z.y}%;width:${z.r * 2}%;height:${z.r * 2}%"><em>${esc(z.t)}</em></span>`).join("")}
          ${(F.them || []).map((c) => champ(c, "them")).join("")}${(F.us || []).map((c) => champ(c, "us")).join("")}
          <span class="df-side them">상대</span><span class="df-side us">우리</span></div>`;
      // 맵 훈련: 보기들이 있는 구역만 확대(옆 구역과 헷갈리지 않게) + 모서리에 전체 맵·확대 위치
      let vx = 0, vy = 0, vs = 100;
      if (d.kind === "map") {
        const xs = d.opts.map((o) => o.x), ys = d.opts.map((o) => o.y);
        vs = Math.min(100, Math.max(40, Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + 22));
        vx = Math.max(0, Math.min(100 - vs, (Math.max(...xs) + Math.min(...xs)) / 2 - vs / 2));
        vy = Math.max(0, Math.min(100 - vs, (Math.max(...ys) + Math.min(...ys)) / 2 - vs / 2));
      }
      const px = (v, o) => ((v - o) / vs) * 100;
      const mapImg = `https://ddragon.leagueoflegends.com/cdn/${window.DDRAGON_VERSION}/img/map/map11.png`;
      const zoomBg = d.kind === "map" ? `<img class="dzoom" src="${mapImg}" alt="소환사의 협곡 미니맵 확대" style="width:${10000 / vs}%;left:${-vx * 100 / vs}%;top:${-vy * 100 / vs}%">
        ${vs < 100 ? `<span class="dmini" aria-hidden="true"><img src="${mapImg}" alt=""><i style="left:${vx}%;top:${vy}%;width:${vs}%;height:${vs}%"></i></span>` : ""}` : bg;
      const pins = d.opts.map((o, i) => { const l = px(o.x, vx), t = px(o.y, vy); return `<button class="dpin ${optCls(o, i)}" style="left:${l}%;top:${t}%" data-act="dans" data-id="${d.id}" data-i="${i}" ${done ? "disabled" : ""} aria-label="${"ABCD"[i]} ${esc(o.t)}">${"ABCD"[i]}</button>${d.kind === "map" ? `<span class="dpin-l" style="left:${l}%;top:${t}%" aria-hidden="true">${esc(o.t)}</span>` : ""}`; }).join("");
      body = `<div class="dgrid"><div class="vmap dmap ${d.kind}">${zoomBg}${pins}</div><ol class="dopts">${d.opts.map((o, i) => `<li><button class="dopt ${optCls(o, i)}" data-act="dans" data-id="${d.id}" data-i="${i}" ${done ? "disabled" : ""}><b>${"ABCD"[i]}</b><span>${esc(o.t)}${done ? `<small>${esc(o.why)}</small>` : ""}</span></button></li>`).join("")}</ol></div>`;
    } else {
      body = `<ol class="dopts wide">${d.opts.map((o, i) => `<li><button class="dopt ${optCls(o, i)}" data-act="dans" data-id="${d.id}" data-i="${i}" ${done ? "disabled" : ""}><b>${"ABCD"[i]}</b><span>${esc(o.t)}${done ? `<small>${esc(o.why)}</small>` : ""}</span></button></li>`).join("")}</ol>`;
    }
    const verdict = done ? (d.opts[ans].ok ? `<p class="dres ok">맞음 — ${esc(d.opts[ans].why)}</p>` : `<p class="dres no">아쉬움 — 정답은 ${"ABCD"[d.opts.findIndex((o) => o.ok)]}. ${esc(d.opts.find((o) => o.ok).why)}</p>`) : "";
    const sideTxt = d.side === "R" ? "레드 진영(우리 = 오른쪽 위)" : "블루 진영(우리 = 왼쪽 아래)";
    return `<div class="dhead"><span class="pill">${esc(d.cat)}</span><b>${numLabel ? esc(numLabel) + " " : ""}${esc(d.title)}</b><span class="dmeta">${ico("eye")}${esc(d.time)} · ${esc(d.obj)}</span><span class="dim">${sideTxt}</span>${d.src != null ? vlink(V, d.src) : `<span class="dim">기본 원칙</span>`}</div>
      <div class="dteams"><div><span class="dt-l us">우리</span>${team(d.us, "us")}</div><div><span class="dt-l them">상대</span>${team(d.them, "them")}</div></div>
      ${d.note ? `<p class="dnote">${esc(d.note)}</p>` : ""}
      <p class="dq">${esc(d.q)}</p>${body}${verdict}`;
  }
  // 문제 모음: 종류별로 차례대로
  function renderDrill(V) {
    const D = allDrills(), u = S.ui;
    const cats = ["전체", ...new Set(D.map((d) => d.cat))];
    const cat = u.dCat || "전체";
    const pool = D.filter((d) => cat === "전체" || d.cat === cat);
    const k = Math.min(u.dIdx || 0, pool.length - 1);
    const d = pool[k];
    const score = u.dScore || {};
    const right = Object.values(score).filter(Boolean).length, tried = Object.keys(score).length;
    return `<section class="card vbox drill">
      <div class="dtop">${vseg("dcat", cat, cats.map((c) => [c, c]), "문제 종류")}<span class="dsc">맞힘 ${right} / 푼 문제 ${tried} · 전체 ${D.length}</span></div>
      ${drillCard(V, d, `${k + 1}.`)}
      <div class="dnav"><button class="btn sm" data-act="dprev" ${k ? "" : "disabled"}>이전</button><button class="btn sm primary" data-act="dnext" ${k < pool.length - 1 ? "" : "disabled"}>다음 문제</button>${(u.ans && u.ans[d.id] != null) ? `<button class="btn sm ghost" data-act="dretry" data-id="${d.id}">다시 풀기</button>` : ""}${tried ? `<button class="btn sm ghost" data-act="dreset">점수 지우기</button>` : ""}</div>
    </section>`;
  }
  // 단계별 배우기: 단원 고르기 → ① 핵심(강의 요약·영상) → ② 문제 → ③ 틀린 문제 다시 → 완료
  function renderLearn(V) {
    const T = S.ui.tut || {};
    const units = V.units;
    const lessonByT = (t) => V.lessons.find((l) => l.t === t);
    const unitScore = (un) => { const sc = (S.ui.dScore || {}); const ok = un.drills.filter((id) => sc[id]).length; return { ok, n: un.drills.length }; };
    if (!T.u) {
      const cards = units.map((un, i) => { const sc = unitScore(un); const fin = (S.ui.tutDone || {})[un.id];
        return `<button class="lu ${fin ? "fin" : ""}" data-act="tunit" data-v="${un.id}"><span class="lu-n">${fin ? ico("shield") : i + 1}</span><span class="lu-b"><b>${esc(un.title)}</b><span>${esc(un.goal)}</span><span class="lu-p"><i style="width:${(sc.ok / sc.n) * 100}%"></i></span><small>${fin ? "완료" : `문제 ${sc.n}개 · 맞힘 ${sc.ok}`}</small></span></button>`; }).join("");
      return `<section class="card vbox"><div class="now-h"><span class="what">단계별 배우기</span><span class="step">핵심 보기 → 문제 → 틀린 문제 다시 · 와드는 ${esc(V.source.author)} 강의 기준</span></div><div class="lus">${cards}</div></section>`;
    }
    const un = units.find((x) => x.id === T.u);
    const steps = [["learn", "① 핵심"], ["quiz", "② 문제"], ["review", "③ 정리"]];
    const stepBar = `<ol class="lsteps">${steps.map(([k, n]) => `<li class="${T.step === k ? "on" : ""}">${n}</li>`).join("")}</ol>`;
    const top = `<div class="lhead"><button class="btn sm ghost" data-act="tback">← 단원 목록</button><b>${esc(un.title)}</b><span class="dim">${esc(un.goal)}</span></div>${stepBar}`;
    let body = "";
    if (T.step === "learn") {
      const ls = un.lessons.map(lessonByT).filter(Boolean);
      body = ls.length ? `<ol class="lcore">${ls.map((l) => `<li><b>${esc(l.title)}</b><p>${esc(l.text)}</p>${vlink(V, l.t)}</li>`).join("")}</ol>`
        : `<p class="dnote">영상 밖 기본 원칙: 한타는 숫자(몇 대 몇)·체력·이니시 궁·상대 딜러 위치를 보고 판단합니다. 문제에서 바로 연습해 보세요.</p>`;
      body += `<div class="dnav"><button class="btn sm primary" data-act="tstart">문제 풀기 (${un.drills.length}문제)</button></div>`;
    } else if (T.step === "quiz") {
      const q = T.queue || un.drills, k = Math.min(T.k || 0, q.length - 1);
      const d = drillById(q[k]);
      const answered = (S.ui.ans || {})[d.id] != null;
      body = `<p class="lprog">${T.retry ? "틀린 문제 다시 · " : ""}${k + 1} / ${q.length}</p>${drillCard(V, d, "")}
        <div class="dnav">${answered ? `<button class="btn sm primary" data-act="tnext">${k < q.length - 1 ? "다음 문제" : "정리 보기"}</button>` : `<span class="dim">보기를 하나 고르세요</span>`}</div>`;
    } else {
      const res = un.drills.map((id) => ({ d: drillById(id), ok: !!(S.ui.dScore || {})[id] }));
      const wrong = res.filter((r) => !r.ok);
      body = `<p class="lsum ${wrong.length ? "no" : "ok"}">${wrong.length ? `${res.length}문제 중 ${res.length - wrong.length}개 맞힘 — 틀린 ${wrong.length}문제를 다시 풀면 단원 완료` : `${res.length}문제 모두 맞힘 — 단원 완료`}</p>
        <ol class="lres">${res.map((r) => `<li class="${r.ok ? "ok" : "no"}">${ico(r.ok ? "shield" : "alert")}<span>${esc(r.d.title)}</span></li>`).join("")}</ol>
        <div class="dnav">${wrong.length ? `<button class="btn sm primary" data-act="tretry">틀린 문제 다시 (${wrong.length})</button><button class="btn sm ghost" data-act="tlearn">핵심 다시 보기</button>`
          : `${units.indexOf(un) < units.length - 1 ? `<button class="btn sm primary" data-act="tunit" data-v="${units[units.indexOf(un) + 1].id}">다음 단원</button>` : ""}<button class="btn sm ghost" data-act="tback">단원 목록</button>`}</div>`;
    }
    return `<section class="card vbox drill">${top}${body}</section>`;
  }

  function render() {
    if (typeof hideHover === "function") hideHover();
    renderTop();
    const v = document.getElementById("view");
    const keepFocus = document.activeElement && document.activeElement.id === "q";
    const pos = keepFocus ? document.activeElement.selectionStart : 0;
    v.innerHTML = S.tab === "live" ? renderLive() : S.tab === "our" ? renderOur() : S.tab === "vision" ? renderVision() : renderEnemy();
    if (keepFocus) { const q = document.getElementById("q"); if (q) { q.focus(); q.setSelectionRange(pos, pos); } }
  }

  document.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-act], .tab");
    if (!el) return;
    if (el.classList.contains("tab")) { S.tab = el.dataset.tab; save(); render(); window.scrollTo(0, 0); return; }
    const a = el.dataset.act;
    if (a === "close" && ev.target !== el && el.classList.contains("modal-bg")) return; // 모달 안쪽 클릭
    switch (a) {
      case "pick": choose(el.dataset.id, el.dataset.role); break;
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
        S.draft.ourSide = el.dataset.v; if (ORDER.kind === "ranked") window.KB.useOrder("ranked", S.draft.ourSide);   // 솔랭·자랭: 우리 밴이 먼저
        S.draft.steps = emptySteps(); S.draft.idx = 0; save(); render(); } break;
      case "mode": S.series.mode = el.dataset.v; save(); render(); break;
      case "frole": S.ui.role = el.dataset.r; save(); render(); break;
      case "onlypool": S.ui.onlyPool = !S.ui.onlyPool; save(); render(); break;
      case "pred": S.ui.predRole = el.dataset.r; render(); break;
      case "scen": S.ui.scen = el.dataset.k; save(); render(); break;
      case "vphase": S.ui.vPhase = el.dataset.v; S.ui.vSpot = null; save(); render(); break;
      case "vside": S.ui.vSide = el.dataset.v; S.ui.vSideBase = S.draft.ourSide; save(); render(); break;
      case "vrole": S.ui.vRole = el.dataset.v; save(); render(); break;
      case "vmode": S.ui.vMode = el.dataset.v; save(); render(); break;
      case "vpurp": S.ui.vPurp = S.ui.vPurp === el.dataset.v ? "" : el.dataset.v; S.ui.vSpot = null; save(); render(); break;
      case "dcat": S.ui.dCat = el.dataset.v; S.ui.dIdx = 0; S.ui.dAns = null; save(); render(); break;
      case "dans": { const d = drillById(el.dataset.id); if (!d) break; const i = Number(el.dataset.i);
        S.ui.ans = { ...(S.ui.ans || {}), [d.id]: i }; S.ui.dScore = { ...(S.ui.dScore || {}), [d.id]: !!d.opts[i].ok }; save(); render(); break; }
      case "dretry": { const a = { ...(S.ui.ans || {}) }; delete a[el.dataset.id]; S.ui.ans = a; save(); render(); break; }
      case "dnext": S.ui.dIdx = (S.ui.dIdx || 0) + 1; save(); render(); window.scrollTo(0, 0); break;
      case "dprev": S.ui.dIdx = Math.max(0, (S.ui.dIdx || 0) - 1); save(); render(); window.scrollTo(0, 0); break;
      case "dreset": S.ui.dScore = {}; S.ui.ans = {}; save(); render(); break;
      // 단계별 배우기
      case "tunit": S.ui.tut = { u: el.dataset.v, step: "learn" }; save(); render(); window.scrollTo(0, 0); break;
      case "tback": S.ui.tut = {}; save(); render(); window.scrollTo(0, 0); break;
      case "tlearn": S.ui.tut = { ...S.ui.tut, step: "learn" }; save(); render(); break;
      case "tstart": { const un = window.VISION.units.find((x) => x.id === S.ui.tut.u); const a = { ...(S.ui.ans || {}) }; un.drills.forEach((id) => delete a[id]); S.ui.ans = a;
        S.ui.tut = { ...S.ui.tut, step: "quiz", queue: un.drills.slice(), k: 0, retry: false }; save(); render(); window.scrollTo(0, 0); break; }
      case "tnext": { const T = S.ui.tut; if ((T.k || 0) < T.queue.length - 1) S.ui.tut = { ...T, k: (T.k || 0) + 1 };
        else { const un = window.VISION.units.find((x) => x.id === T.u); const allOk = un.drills.every((id) => (S.ui.dScore || {})[id]); if (allOk) S.ui.tutDone = { ...(S.ui.tutDone || {}), [un.id]: true }; S.ui.tut = { ...T, step: "review" }; }
        save(); render(); window.scrollTo(0, 0); break; }
      case "tretry": { const un = window.VISION.units.find((x) => x.id === S.ui.tut.u); const wrong = un.drills.filter((id) => !(S.ui.dScore || {})[id]); const a = { ...(S.ui.ans || {}) }; wrong.forEach((id) => delete a[id]); S.ui.ans = a;
        S.ui.tut = { ...S.ui.tut, step: "quiz", queue: wrong, k: 0, retry: true }; save(); render(); window.scrollTo(0, 0); break; }
      case "vspot": S.ui.vSpot = S.ui.vSpot === Number(el.dataset.id) ? null : Number(el.dataset.id); render(); break;
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
    if (t.id === "q") { S.ui.q = t.value; const box = document.getElementById("champs"); if (box) box.innerHTML = champButtons(); else render(); return; }
    if (t.dataset && t.dataset.f && editing) {
      const p = team(editing).players[t.dataset.role];
      p[t.dataset.f] = t.dataset.f === "pts" ? Number(t.value) || 0 : t.value; save();
    }
  });
  document.addEventListener("change", (ev) => {
    const t = ev.target;
    if (t.id === "ourSel") { S.ourTeam = t.value; if (S.enemyTeam === S.ourTeam) S.enemyTeam = S.teams.find((x) => x.id !== S.ourTeam && !x.solo).id; syncQueue(true); save(); render(); }
    else if (t.id === "enemySel" || t.id === "enemyPick") { S.enemyTeam = t.value; syncQueue(true); save(); render(); }
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

  // ---------- 팀 공유 자기평가 (게시된 CSV) ----------
  window.SELF_EVAL = { status: window.SELF_EVAL_CSV_URL ? "loading" : "unset" };
  function parseCsv(text) {
    const rows = []; let row = [], cur = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === ",") { row.push(cur); cur = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
      else cur += ch;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter((r) => r.some((c) => c.trim()));
  }
  async function loadSelfEval() {
    const url = window.SELF_EVAL_CSV_URL;
    if (!url) return;
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const rows = parseCsv(await res.text());
      const head = rows.shift().map((h) => h.trim());
      const col = (kw) => head.findIndex((h) => h.includes(kw));
      const ci = { role: col("라인"), champ: col("챔피언"), conf: col("자신감"), use: col("대회") };
      if (ci.role < 0 || ci.champ < 0) throw new Error("열 이름(라인·챔피언)을 찾지 못함");
      const roleOf = { 탑: "T", 정글: "J", 미드: "M", 원딜: "A", 바텀: "A", 서폿: "S", 서포터: "S" };
      const latest = {};
      rows.forEach((r) => {
        const role = roleOf[(r[ci.role] || "").trim()];
        const c = findChamp(r[ci.champ]);
        if (!role || !c) return;
        const use = ci.use < 0 || !/아니|no|x/i.test(r[ci.use] || "");
        const conf = (r[ci.conf] || "").trim();
        latest[role + "|" + c.id] = use ? [c.id, conf.includes("원챔") ? 3 : conf.includes("상") ? 3 : conf.includes("하") ? 1 : 2, conf.includes("원챔") || undefined] : null;
      });
      const t = team(S.ourTeam);
      const byRole = {};
      Object.entries(latest).forEach(([k, v]) => { const r = k.split("|")[0]; byRole[r] = byRole[r] || []; if (v) byRole[r].push(v.filter((x) => x !== undefined)); });
      Object.entries(byRole).forEach(([r, list]) => { if (list.length) t.players[r].pool = list; });
      window.SELF_EVAL = { status: "ok", rows: rows.length, at: new Date().toLocaleString("ko-KR") };
    } catch (err) {
      window.SELF_EVAL = { status: "error", reason: String(err.message || err) };
    }
    render();
  }

  // ---------- 픽 후보 정보 카드 (PC 전용: 마우스 올림·키보드 초점) ----------
  const hc = document.createElement("div");
  hc.className = "hovercard"; hc.hidden = true; hc.setAttribute("role", "tooltip"); hc.id = "hovercard";
  document.body.appendChild(hc);
  let hcFor = null;
  const pcPointer = matchMedia("(hover: hover) and (pointer: fine) and (min-width: 761px)");
  // PC: 배지에 마우스를 올리면 초상화 팝업을 열고, 벗어나면 닫는다(휴대폰은 눌러서 펼침)
  document.addEventListener("mouseover", (ev) => { if (!pcPointer.matches) return; const b = ev.target.closest && ev.target.closest(".bdg"); if (b && !b.open) {
    b.open = true; b.dataset.hov = "1";
    const pop = b.querySelector(".bdg-pop");
    if (pop) { pop.classList.remove("flip"); if (pop.getBoundingClientRect().right > document.documentElement.clientWidth - 8) pop.classList.add("flip"); }
  } });
  document.addEventListener("mouseout", (ev) => { const b = ev.target.closest && ev.target.closest(".bdg"); if (b && b.dataset.hov && !b.contains(ev.relatedTarget)) { b.open = false; delete b.dataset.hov; } });
  function hcAllowed() { return pcPointer.matches && S.tab === "live" && !!curStep(); }
  function showHover(el) {
    if (!hcAllowed() || !CH[el.dataset.id]) return;
    const id = el.dataset.id;
    // 누구의 챔프로 볼지: 우리 픽 차례이거나 우리 챔프폭에 있으면 우리 관점, 아니면 상대 관점
    const st = curStep();
    const ourTurnPick = st[1] === "pick" && E.whoOfSide(S, st[0]) === "our";
    const inOurPool = ROLES.some((r) => E.poolMap(E.teamOf(S, "our"), r)[id]);
    const who = ourTurnPick || inOurPool ? "our" : "enemy";
    const role = (who === "our" && el.dataset.role) || E.guessRole(S, who, id);
    if (!role) return;
    const h = E.hoverInfo(S, who, id, role);
    const labels = who === "our"
      ? { bad: h.laner ? "상대 같은 라인" : "카운터 위험 · 상대 " + ROLE_KO[role], good: "우리 팀 시너지", tag: "우리" }
      : { bad: h.laner ? "우리 같은 라인" : "우리 카운터 후보 · " + ROLE_KO[role], good: "상대 시너지", tag: "상대" };
    const row = (x) => `<li>${icon(x.id, "sm")}<span><b>${esc(CH[x.id].ko)}</b><small>${esc(x.d)}</small></span></li>`;
    hc.innerHTML = `<div class="hc-h">${icon(id, "sm")}<b>${esc(CH[id].ko)}</b><span class="pill">${labels.tag} ${ROLE_KO[role]}</span></div>
      <div class="hc-sec"><div class="hc-t ${who === "our" ? "bad" : "good"}">${labels.bad}</div>${h.threats.length ? `<ul>${h.threats.map(row).join("")}</ul>` : `<p class="help">뚜렷한 카운터 없음</p>`}</div>
      <div class="hc-sec"><div class="hc-t ${who === "our" ? "good" : "bad"}">${labels.good}</div>${h.synergy.length ? `<ul>${h.synergy.map(row).join("")}</ul>` : `<p class="help">남은 라인 챔프폭에서 뚜렷한 시너지 없음</p>`}</div>`;
    hc.hidden = false;
    hcFor = el;
    el.setAttribute("aria-describedby", "hovercard");
    const r = el.getBoundingClientRect(), w = hc.offsetWidth, hgt = hc.offsetHeight, gap = 10;
    let left = r.right + gap; if (left + w > innerWidth - 8) left = r.left - w - gap; if (left < 8) left = Math.min(innerWidth - w - 8, Math.max(8, r.left));
    let top = r.top; if (top + hgt > innerHeight - 8) top = innerHeight - hgt - 8; if (top < 8) top = 8;
    hc.style.left = left + "px"; hc.style.top = top + "px";
  }
  function hideHover() { if (hcFor) hcFor.removeAttribute("aria-describedby"); hc.hidden = true; hcFor = null; }
  document.addEventListener("mouseover", (ev) => {
    const el = ev.target.closest("[data-act='pick'][data-id]");
    if (el === hcFor) return;
    if (el) showHover(el); else if (hcFor && !ev.target.closest(".hovercard")) hideHover();
  });
  document.addEventListener("focusin", (ev) => { const el = ev.target.closest("[data-act='pick'][data-id]"); if (el) showHover(el); else hideHover(); });
  window.addEventListener("scroll", () => hcFor && hideHover(), { passive: true });

  document.getElementById("champList").innerHTML = window.CHAMPIONS.map((c) => `<option value="${esc(c.ko)}">`).join("");
  render();
  loadSelfEval();
})();
