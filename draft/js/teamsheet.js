// 팀·챔프폭 엑셀(사용자 요청 11-19): 한 시트에 팀마다 섹션. 내보내기 줄 만들기 · 불러오기 읽기·검사 · 바뀌는 것 계산.
// 엑셀 파일 읽고 쓰기는 js/vendor/xlsx(SheetJS 0.20.3)가 하고, 여기는 표(줄 배열)만 다룬다 — 화면 없이 시험할 수 있게.
//
// 시트 모양(섹션 하나):
//   팀     | 수빈이의아이들 | 우리팀            ← 셋째 칸: 「우리팀」 또는 「상대」(비우면 상대)
//   라인   | 본계정 | 부계정1 | 부계정2 | 티어 | 점수 | 챔프폭
//   탑     | loegu#kr1 |  |  | 에메랄드 4 24LP | 45 | 다리우스:상, 말파이트:상, 케넨:중
//   …(정글·미드·원딜·서폿)
//   (빈 줄)
(function (root) {
  const LANES = [["T", "탑"], ["J", "정글"], ["M", "미드"], ["A", "원딜"], ["S", "서폿"]];
  const LANE_OF = { 탑: "T", top: "T", t: "T", 정글: "J", jg: "J", jungle: "J", j: "J", 미드: "M", mid: "M", m: "M",
    원딜: "A", 바텀: "A", 봇: "A", ad: "A", adc: "A", bot: "A", a: "A", 서폿: "S", 서포터: "S", 서포트: "S", sup: "S", support: "S", s: "S" };
  const LV_OF = { 상: 3, 중: 2, 하: 1, 3: 3, 2: 2, 1: 1, high: 3, mid: 2, low: 1 };
  const ONE = /^(원챔|원챔프|원|one)$/i;
  const LV_TXT = { 3: "상", 2: "중", 1: "하" };
  const HEAD = ["라인", "본계정", "부계정1", "부계정2", "티어", "점수", "챔프폭"];
  const MAX = { teams: 40, rows: 2000, name: 30, tier: 30, pool: 40 };
  const txt = (v) => (v == null ? "" : String(v)).replace(/\s+/g, " ").trim();
  // 라이엇 ID: 「이름 #태그」처럼 # 앞뒤 빈칸은 붙임. 이름 1~32자·태그 1~8자(둘 다 가운데 빈칸 가능 — 실제 「Loki#살 하」 같은 태그가 있음)
  const riotOf = (v) => { const t = txt(v).replace(/\s*#\s*/, "#"); return /^[^#<>"`\\]{1,32}#[^#<>"`\\]{1,8}$/.test(t) ? t : null; };

  // ---- 내보내기: 팀 목록 → 줄 배열 ----
  // teams: [{id,name,players:{T:{riot,alts,tier,pts,pool}}}], nameOf(champId) → 화면 이름
  function toRows(teams, ourId, nameOf, at) {
    const rows = [["피어리스 밴픽 보드 · 팀 챔프폭", "", "", "", "", "", at ? `내보낸 날 ${at}` : ""],
      ["작성법: 「팀」 줄 셋째 칸에 우리팀/상대, 아래 라인 5줄. 계정은 이름#태그(라인당 3개까지), 챔프폭은 「챔프:상/중/하/원챔」을 쉼표로."], []];
    const sorted = teams.slice().sort((a, b) => (b.id === ourId) - (a.id === ourId));
    sorted.forEach((t) => {
      rows.push(["팀", t.name, t.id === ourId ? "우리팀" : "상대"]);
      rows.push(HEAD.slice());
      LANES.forEach(([r, ko]) => {
        const p = (t.players && t.players[r]) || {};
        const acc = [p.riot || ""].concat(p.alts || []).slice(0, 3);
        while (acc.length < 3) acc.push("");
        const pool = (p.pool || []).map(([id, lv, one]) => `${nameOf(id) || id}:${one ? "원챔" : LV_TXT[lv] || "중"}`).join(", ");
        rows.push([ko].concat(acc, [p.tier || "", p.pts == null ? "" : p.pts, pool]));
      });
      rows.push([]);
    });
    return rows;
  }

  // ---- 불러오기: 줄 배열 → 팀 목록 + 오류·주의 ----
  // resolve(이름) → 챔프 ID 또는 null. 줄 번호는 엑셀과 같은 1부터.
  function parse(rows, resolve) {
    const out = { teams: [], errors: [], warnings: [] };
    if (!Array.isArray(rows)) { out.errors.push({ row: 0, msg: "시트를 읽지 못했습니다" }); return out; }
    if (rows.length > MAX.rows) { out.errors.push({ row: 0, msg: `줄이 너무 많습니다(${MAX.rows}줄까지)` }); return out; }
    let cur = null;
    const err = (row, msg) => out.errors.push({ row, msg });
    rows.forEach((raw, i) => {
      const row = i + 1, c = (raw || []).map(txt);
      const first = (c[0] || "").toLowerCase();
      if (!c.some(Boolean)) return;
      if (first === "팀" || first === "팀명" || first === "team") {
        const name = c[1] || "";
        if (!name) { err(row, "팀 이름이 비어 있습니다"); cur = null; return; }
        if (name.length > MAX.name || /[<>"`\\]/.test(name)) { err(row, `팀 이름은 ${MAX.name}자까지, < > " 같은 기호 없이`); cur = null; return; }
        if (out.teams.some((t) => t.name === name)) { err(row, `「${name}」 팀이 두 번 나옵니다`); cur = null; return; }
        const kind = (c[2] || "").replace(/\s/g, "");
        cur = { name, our: kind === "우리팀" || kind === "우리", row, players: {} };
        out.teams.push(cur); return;
      }
      if (first === "라인" || /^피어리스|^작성법/.test(c[0] || "")) return;   // 머리·제목 줄
      const r = LANE_OF[first];
      if (!r) { if (cur) err(row, `라인 이름 「${c[0]}」을(를) 모릅니다(탑·정글·미드·원딜·서폿)`); return; }
      if (!cur) { err(row, "이 줄 위에 「팀」 줄이 없습니다"); return; }
      if (cur.players[r]) { err(row, `${cur.name}: ${LANES.find((x) => x[0] === r)[1]} 줄이 두 번 나옵니다`); return; }
      const acc = [];
      for (const v of c.slice(1, 4)) {
        if (!v) continue;
        const id = riotOf(v);
        if (!id) { err(row, `계정 「${v}」은(는) 이름#태그 형식이 아닙니다`); continue; }
        if (!acc.includes(id)) acc.push(id);
      }
      const tier = c[4] || "";
      if (tier.length > MAX.tier || /[<>"`\\]/.test(tier)) err(row, `티어는 ${MAX.tier}자까지`);
      let pts = null;
      if (c[5]) { const n = Number(c[5]); if (Number.isFinite(n) && n >= 0 && n <= 100) pts = Math.round(n); else err(row, `점수 「${c[5]}」는 0~100 숫자여야 합니다`); }
      const pool = [], seen = new Set();
      String(raw[6] == null ? "" : raw[6]).split(/[,，、\n;/]+/).map((x) => x.trim()).filter(Boolean).forEach((tok) => {
        const m = tok.match(/^(.+?)\s*[:：(]\s*([^)]*?)\s*\)?\s*$/) || tok.match(/^(.+?)\s+(상|중|하|원챔|원챔프|원)$/);
        const nm = m ? m[1].trim() : tok, lvTxt = m ? m[2].trim() : "";
        const id = resolve(nm);
        if (!id) { err(row, `챔프 이름 「${nm}」을(를) 모릅니다`); return; }
        if (seen.has(id)) return;
        seen.add(id);
        if (ONE.test(lvTxt)) pool.push([id, 3, true]);
        else if (!lvTxt) pool.push([id, 2]);
        else if (LV_OF[lvTxt.toLowerCase()]) pool.push([id, LV_OF[lvTxt.toLowerCase()]]);
        else err(row, `「${tok}」의 숙련도 「${lvTxt}」은(는) 상·중·하·원챔 중 하나여야 합니다`);
      });
      if (pool.length > MAX.pool) err(row, `챔프폭은 라인당 ${MAX.pool}개까지`);
      cur.players[r] = { row, riot: acc[0] || "", alts: acc.slice(1), tier, pts, pool };
    });
    if (out.teams.length > MAX.teams) err(0, `팀은 한 번에 ${MAX.teams}개까지`);
    if (out.teams.filter((t) => t.our).length > 1) err(out.teams.filter((t) => t.our)[1].row, "「우리팀」은 한 팀만 표시할 수 있습니다");
    out.teams.forEach((t) => {
      const miss = LANES.filter(([r]) => !t.players[r]).map(([, ko]) => ko);
      if (miss.length === 5) err(t.row, `${t.name}: 라인 줄이 없습니다`);
      else if (miss.length) out.warnings.push({ row: t.row, msg: `${t.name}: ${miss.join("·")} 줄이 없어 그 라인은 지금 그대로 둡니다` });
      LANES.forEach(([r, ko]) => { const p = t.players[r]; if (p && !p.riot) out.warnings.push({ row: p.row, msg: `${t.name} ${ko}: 계정이 비어 있어 전적을 못 가져옵니다` }); });
    });
    return out;
  }

  // ---- 바뀌는 것: 지금 팀 목록과 비교(팀 이름으로 맞춤) ----
  const sameList = (a, b) => JSON.stringify(a || []) === JSON.stringify(b || []);
  const poolKey = (pool) => (pool || []).map(([id, lv, one]) => `${id}:${one ? "one" : lv}`);
  function diff(current, parsed, ourId) {
    return parsed.teams.map((pt) => {
      const cur = current.find((t) => !t.solo && t.name === pt.name) || null;
      const lanes = [];
      LANES.forEach(([r, ko]) => {
        const n = pt.players[r];
        if (!n) return;
        const o = (cur && cur.players[r]) || {};
        const ch = [];
        const accO = [o.riot || ""].concat(o.alts || []).filter(Boolean), accN = [n.riot].concat(n.alts).filter(Boolean);
        if (!sameList(accO, accN)) ch.push({ k: "acc", from: accO, to: accN });
        if ((o.tier || "") !== n.tier) ch.push({ k: "tier", from: o.tier || "", to: n.tier });
        if (n.pts != null && o.pts !== n.pts) ch.push({ k: "pts", from: o.pts, to: n.pts });
        const pk = new Set(poolKey(o.pool)), nk = new Set(poolKey(n.pool));
        const add = n.pool.filter((e) => !pk.has(poolKey([e])[0])), del = (o.pool || []).filter((e) => !nk.has(poolKey([e])[0]));
        if (add.length || del.length) ch.push({ k: "pool", add, del });
        if (ch.length || !cur) lanes.push({ r, ko, ch });
      });
      return { name: pt.name, id: cur ? cur.id : null, isNew: !cur, our: pt.our, becomesOur: pt.our && (!cur || cur.id !== ourId), lanes };
    });
  }

  // ---- 적용: 새 팀 목록(원본은 그대로) ----
  // newId() → 새 팀 ID. 반환: { teams, ourId(바뀌면), touched:[[팀ID,라인]…] }
  function apply(current, parsed, ourId, newId) {
    const teams = JSON.parse(JSON.stringify(current));
    const touched = [];
    let our = ourId;
    parsed.teams.forEach((pt) => {
      let t = teams.find((x) => !x.solo && x.name === pt.name);
      if (!t) {
        t = { id: newId(), name: pt.name, players: Object.fromEntries(LANES.map(([r]) => [r, { riot: "", alts: [], tier: "", pts: 50, pool: [] }])) };
        teams.push(t);
      }
      LANES.forEach(([r]) => {
        const n = pt.players[r];
        if (!n) return;
        const p = t.players[r] || (t.players[r] = { pool: [] });
        p.riot = n.riot; p.alts = n.alts.slice(0, 2); p.tier = n.tier;
        if (n.pts != null) p.pts = n.pts; else if (p.pts == null) p.pts = 50;
        p.pool = n.pool.map((e) => e.slice());
        touched.push([t.id, r]);
      });
      if (pt.our) our = t.id;
    });
    return { teams, ourId: our, touched };
  }

  root.TeamSheet = { LANES, HEAD, MAX, riotOf, toRows, parse, diff, apply };
})(typeof window !== "undefined" ? window : globalThis);
