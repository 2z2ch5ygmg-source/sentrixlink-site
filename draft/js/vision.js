// 시야 공부 자료: 소환사의 협곡 정석 와드 자리 (블루 진영 기준 좌표, 미니맵 가로·세로 %)
// 레드 진영은 강을 기준으로 뒤집는다: (x, y) → (y, x). 용·바론 자리는 그대로, 우리·상대 정글이 바뀐다.
// 자리는 일반적인 정석을 미니맵에 대략 찍은 것(근처 표시) — 팀원 피드백으로 다듬는다.
// type: ward = 일반 와드, ctrl = 제어 와드, sweep = 와드 지우기(렌즈)
// tag: def = 갱·인베 대비(방어), agg = 끊기·동선 확인(공격), obj = 용·바론 주도권
window.VISION = {
  phases: [
    { id: "lv1", name: "1레벨", time: "0:00~1:30", tip: "인베이드 대비 + 상대 정글 시작 위치 확인" },
    { id: "lane", name: "라인전", time: "2:30~6:00", tip: "첫 갱(3레벨 전후) 대비 · 바텀 강가 장악" },
    { id: "mid", name: "6레벨 뒤", time: "6:00~14:00", tip: "로밍 길 · 상대 정글 동선 · 끊기 각" },
    { id: "drake", name: "용 준비", time: "생성 60초 전", tip: "용 둥지 둘레 시야 장악 → 상대 와드 지우기" },
    { id: "baron", name: "전령·바론", time: "생성 60초 전", tip: "위쪽 강가 · 바론 둥지 시야 장악" },
  ],
  spots: [
    { id: 1, x: 75, y: 83, type: "ward", tag: "def", phases: ["lane", "mid"], roles: ["S", "A"], name: "바텀 삼거리 부쉬(우리)", why: "상대 정글이 바텀으로 오는 가장 흔한 길 — 갱의 첫 신호" },
    { id: 2, x: 81, y: 77, type: "ward", tag: "def", phases: ["lane"], roles: ["S"], name: "바텀 강가 부쉬", why: "상대 정글·서폿이 숨어 기다리는 자리 — 2:30 전후 첫 갱 대비" },
    { id: 3, x: 62, y: 65, type: "ctrl", tag: "obj", phases: ["lane", "drake"], roles: ["S", "J"], name: "용 둥지 앞 부쉬", why: "용 앞 시야 = 용 싸움 주도권. 제어 와드로 상대 와드도 지움" },
    { id: 4, x: 76, y: 63, type: "ward", tag: "agg", phases: ["drake"], roles: ["J", "S"], name: "용 쪽 상대 정글 입구", why: "상대가 용으로 들어오는 길을 먼저 봄 — 들어오는 순간 받아치기" },
    { id: 5, x: 74, y: 46, type: "ward", tag: "agg", phases: ["lv1", "mid"], roles: ["S", "J"], name: "상대 정글 바텀 쪽 버프 입구", why: "상대 정글 시작·동선 확인, 끊기 각" },
    { id: 6, x: 55, y: 73, type: "ward", tag: "def", phases: ["lv1", "mid"], roles: ["J", "S"], name: "우리 정글 바텀 쪽 버프 입구", why: "인베이드·역정글 대비" },
    { id: 7, x: 58, y: 57, type: "ward", tag: "def", phases: ["lane", "mid"], roles: ["M", "S"], name: "미드 아래 강가 부쉬", why: "미드 갱 대비 · 바텀↔미드 로밍 길" },
    { id: 8, x: 42, y: 43, type: "ward", tag: "def", phases: ["lane", "mid"], roles: ["M", "J"], name: "미드 위 강가 부쉬", why: "미드 갱 대비 · 탑↔미드 로밍 길" },
    { id: 9, x: 61, y: 37, type: "ward", tag: "agg", phases: ["mid"], roles: ["M", "J"], name: "상대 칼날부리 입구", why: "상대 정글이 미드 근처에 있는지 — 미드 주도권 싸움 전" },
    { id: 10, x: 38, y: 61, type: "ward", tag: "def", phases: ["lv1", "mid"], roles: ["J", "M"], name: "우리 칼날부리 입구", why: "우리 정글 캠프 보호 · 역정글 확인" },
    { id: 11, x: 20, y: 22, type: "ward", tag: "def", phases: ["lane"], roles: ["T", "J"], name: "탑 강가 부쉬", why: "탑 갱 대비 · 상대 정글 위쪽 동선" },
    { id: 12, x: 16, y: 30, type: "ward", tag: "def", phases: ["lane"], roles: ["T"], name: "탑 삼거리 부쉬(우리)", why: "탑 뒤 갱 대비 — 라인을 밀었을 때 필수" },
    { id: 13, x: 37, y: 34, type: "ctrl", tag: "obj", phases: ["baron"], roles: ["J", "S", "M"], name: "바론 둥지 앞 부쉬", why: "바론·전령 앞 시야 = 주도권. 제어 와드로 상대 와드도 지움" },
    { id: 14, x: 45, y: 26, type: "ward", tag: "agg", phases: ["baron"], roles: ["S", "J"], name: "바론 쪽 상대 정글 입구", why: "상대가 바론으로 들어오는 길 — 먼저 보고 받아치기" },
    { id: 15, x: 53, y: 18, type: "ward", tag: "agg", phases: ["lv1", "mid"], roles: ["J"], name: "상대 정글 위쪽 버프 입구", why: "상대 정글이 위에서 시작했는지 확인" },
    { id: 16, x: 28, y: 48, type: "ward", tag: "def", phases: ["lv1"], roles: ["J", "S", "M"], name: "우리 정글 위쪽 버프 입구", why: "1레벨 인베이드 대비 — 상대 다섯 명이 오는지" },
    { id: 17, x: 67, y: 69, type: "sweep", tag: "obj", phases: ["drake"], roles: ["S"], name: "용 둥지 둘레 와드 지우기", why: "용 60초 전 렌즈로 상대 와드를 지우고 우리 와드로 바꿈" },
    { id: 18, x: 33, y: 30, type: "sweep", tag: "obj", phases: ["baron"], roles: ["S"], name: "바론 둥지 둘레 와드 지우기", why: "바론 60초 전 렌즈로 상대 와드를 지우고 우리 와드로 바꿈" },
    { id: 19, x: 85, y: 71, type: "ward", tag: "agg", phases: ["mid"], roles: ["S"], name: "상대 바텀 삼거리", why: "라인을 밀었을 때 상대 정글 동선 — 끊기용" },
  ],
};
