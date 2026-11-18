// 대회 참가 팀 기본값 (팀_라인.xlsx 설문 답변 1-9 기준, 2026-11-17)
// 티어: 2024 시즌~현재 솔랭·자유랭 최고 중 높은 쪽(11-18 조사) · 점수: 마스터 70(500LP 이상·그랜드마스터·챌린저 90) · 다이아 60 · 에메랄드 45 · 플래티넘 35 · 골드 25 · 실버 15 · 브론즈 5
// 숙련도: 3=상, 2=중, 1=하, one=true → 원챔(주력 한 챔프)
window.SEED_VERSION = 4; // 2: 수빈이의아이들 서폿 계정 변경(11-17), 3: 먹 보#냠 이·이수근의도박파티#KR1 계정 정정(11-17), 4: 최고 티어 기준(11-18)
window.SEED_OUR_TEAM = "subin";
window.SEED_TEAMS = [
  { id: "banclutch", name: "반클러치", players: {
    T: { riot: "도도한낫쵸#kr1", tier: "마스터 635LP", pts: 90, pool: [] },
    J: { riot: "김진규#0516", tier: "마스터 273LP", pts: 70, pool: [] },
    M: { riot: "달 구#1234", tier: "골드 3 50LP (자유랭)", pts: 25, pool: [] },
    A: { riot: "しわあわせ#KR2", tier: "골드 4 18LP (자유랭)", pts: 25, pool: [] },
    S: { riot: "판도라의 대민석#증강체", tier: "에메랄드 3 79LP", pts: 45, pool: [] } } },
  { id: "gangjo", name: "강조 드리겠습니다.", players: {
    T: { riot: "CodeedoC#KR1", tier: "골드 4 22LP", pts: 25, pool: [] },
    J: { riot: "펭귄의 신#KR1", tier: "골드 2 49LP", pts: 25, pool: [] },
    M: { riot: "톰과 제리 망치#KR1", tier: "실버 2 47LP", pts: 15, pool: [] },
    A: { riot: "찐폭탄#KR1", tier: "에메랄드 1 15LP", pts: 45, pool: [] },
    S: { riot: "MID VEIGAR#KR1", tier: "골드 4 60LP", pts: 25, pool: [] } } },
  { id: "jaesin", name: "재신형과 아이들", players: {
    T: { riot: "알상#kr1", tier: "에메랄드 4 32LP", pts: 45, pool: [] },
    J: { riot: "우리행복해질까요#하루하루", tier: "플래티넘 4 86LP", pts: 35, pool: [] },
    M: { riot: "먹 보#냠 이", tier: "마스터 710LP", pts: 90, pool: [] },
    A: { riot: "동탄하늘유치원킥보드도둑엄준식#0000", tier: "골드 3 19LP", pts: 25, pool: [] },
    S: { riot: "감 자#災厄の狐", tier: "플래티넘 1 0LP", pts: 35, pool: [] } } },
  { id: "trionfo", name: "trionfo", players: {
    T: { riot: "Phoebus#solar", tier: "골드 2 25LP", pts: 25, pool: [] },
    J: { riot: "Novelbright#流星群", alts: ["지예아나는다채로운래핑과라이밍혹#랩스킬로혼"], tier: "마스터 6LP", pts: 70, pool: [] },
    M: { riot: "Loki#살 하", tier: "플래티넘 1 4LP", pts: 35, pool: [] },
    A: { riot: "AD Wondealer#KR1", tier: "다이아 4 90LP", pts: 60, pool: [] },
    S: { riot: "모몽가#나귀엽지", tier: "플래티넘 2 85LP", pts: 35, pool: [] } } },
  { id: "maple", name: "메이플 메소 훈지좀 제발", players: {
    T: { riot: "굉장나 엄청해#123", tier: "마스터 35LP", pts: 70, pool: [] },
    J: { riot: "하이칸c#kr1", tier: "플래티넘 3 61LP", pts: 35, pool: [] },
    M: { riot: "파워레인저#버건디", tier: "실버 4 82LP", pts: 15, pool: [] },
    A: { riot: "산책하는마루#kr3", tier: "마스터 824LP", pts: 90, pool: [] },
    S: { riot: "반건조땅콩#kr1", tier: "실버 1 16LP", pts: 15, pool: [] } } },
  { id: "subin", name: "수빈이의아이들", players: {
    T: { riot: "loegu#kr1", tier: "에메랄드 4 24LP", pts: 45, pool: [
      ["Darius", 3], ["Malphite", 3], ["Kennen", 2], ["Mordekaiser", 2], ["Pantheon", 1]] },
    J: { riot: "키아나#1234", alts: ["장국보#KR1"], tier: "챌린저 630LP (자유랭)", pts: 90, pool: [
      ["Qiyana", 3], ["Nunu", 3], ["Zac", 2], ["Chogath", 2], ["Vi", 1]] },
    M: { riot: "예전같지않아#노인의공격", tier: "에메랄드 2 79LP", pts: 45, pool: [
      ["Azir", 3], ["Orianna", 3], ["Lissandra", 2], ["Malzahar", 2], ["Galio", 1]] },
    A: { riot: "한다면 하는 남자#참회하기", alts: ["버거boy#kr1"], tier: "다이아 4 66LP", pts: 60, pool: [
      ["Ezreal", 3], ["Kaisa", 3], ["Lucian", 2], ["Caitlyn", 2], ["Yunara", 1]] },
    S: { riot: "평가원국어담당#kr1", alts: ["나를존경하고받들어라나약한실골들#kr1"], tier: "에메랄드 4 21LP (자유랭)", pts: 45, pool: [
      ["Nautilus", 3], ["Blitzcrank", 3], ["Leona", 2], ["Alistar", 2], ["Lulu", 1], ["Braum", 1], ["Thresh", 1]] } } },
  { id: "1seung", name: "1승쫑", players: {
    T: { riot: "원제대#kr00", tier: "다이아 3 63LP", pts: 60, pool: [] },
    J: { riot: "First eye#kr1", tier: "플래티넘 1 81LP", pts: 35, pool: [] },
    M: { riot: "말랑흰자#kr1", tier: "플래티넘 4 61LP", pts: 35, pool: [] },
    A: { riot: "fofo#hwan", tier: "에메랄드 3 95LP", pts: 45, pool: [] },
    S: { riot: "tilttilt#tilt", tier: "에메랄드 2 28LP", pts: 45, pool: [] } } },
  { id: "hanjung", name: "한중비즈니스", players: {
    T: { riot: "wind#5959", tier: "다이아 1 39LP", pts: 60, pool: [] },
    J: { riot: "이수근의도박파티#KR1", tier: "다이아 2 26LP", pts: 60, pool: [] },
    M: { riot: "고경록#kr1", tier: "에메랄드 4 15LP", pts: 45, pool: [] },
    A: { riot: "김싼타#kr1", tier: "플래티넘 4 95LP", pts: 35, pool: [] },
    S: { riot: "우치하#han", tier: "플래티넘 3 88LP", pts: 35, pool: [] } } },
];
