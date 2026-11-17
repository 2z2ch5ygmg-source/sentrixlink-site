// 대회 참가 팀 기본값 (팀_라인.xlsx 설문 답변 1-9 기준, 2026-11-17)
// 점수: 마스터 70(고LP 90) · 다이아 60 · 에메랄드 45 · 플래티넘 35 · 골드 25 · 실버 15 · 브론즈 5
// 숙련도: 3=상, 2=중, 1=하, one=true → 원챔(주력 한 챔프)
window.SEED_VERSION = 3; // 2: 수빈이의아이들 서폿 계정 변경(11-17), 3: 먹 보#냠 이·이수근의도박파티#KR1 계정 정정(11-17)
window.SEED_OUR_TEAM = "subin";
window.SEED_TEAMS = [
  { id: "banclutch", name: "반클러치", players: {
    T: { riot: "도도한낫쵸#kr1", tier: "마스터 700LP", pts: 90, pool: [] },
    J: { riot: "김진규#0516", tier: "마스터", pts: 70, pool: [] },
    M: { riot: "달 구#1234", tier: "실버", pts: 15, pool: [] },
    A: { riot: "しわあわせ#KR2", tier: "브론즈", pts: 5, pool: [] },
    S: { riot: "판도라의 대민석#증강체", tier: "에메랄드", pts: 45, pool: [] } } },
  { id: "gangjo", name: "강조 드리겠습니다.", players: {
    T: { riot: "CodeedoC#KR1", tier: "골드 4", pts: 25, pool: [] },
    J: { riot: "펭귄의 신#KR1", tier: "실버 3", pts: 15, pool: [] },
    M: { riot: "톰과 제리 망치#KR1", tier: "브론즈 3", pts: 5, pool: [] },
    A: { riot: "찐폭탄#KR1", tier: "에메랄드 2", pts: 45, pool: [] },
    S: { riot: "MID VEIGAR#KR1", tier: "실버 1", pts: 15, pool: [] } } },
  { id: "jaesin", name: "재신형과 아이들", players: {
    T: { riot: "알상#kr1", tier: "에메랄드", pts: 45, pool: [] },
    J: { riot: "우리행복해질까요#하루하루", tier: "플래티넘", pts: 35, pool: [] },
    M: { riot: "먹 보#냠 이", tier: "마스터 710LP", pts: 90, pool: [] },
    A: { riot: "동탄하늘유치원킥보드도둑엄준식#0000", tier: "골드", pts: 25, pool: [] },
    S: { riot: "감 자#災厄の狐", tier: "플래티넘", pts: 35, pool: [] } } },
  { id: "trionfo", name: "trionfo", players: {
    T: { riot: "Phoebus#solar", tier: "골드", pts: 25, pool: [] },
    J: { riot: "Novelbright#流星群", tier: "마스터", pts: 70, pool: [] },
    M: { riot: "Loki#살 하", tier: "플래티넘", pts: 35, pool: [] },
    A: { riot: "AD Wondealer#KR1", tier: "다이아", pts: 60, pool: [] },
    S: { riot: "모몽가#나귀엽지", tier: "플래티넘", pts: 35, pool: [] } } },
  { id: "maple", name: "메이플 메소 훈지좀 제발", players: {
    T: { riot: "굉장나 엄청해#123", tier: "마스터 36LP", pts: 70, pool: [] },
    J: { riot: "하이칸c#kr1", tier: "플래티넘", pts: 35, pool: [] },
    M: { riot: "파워레인저#버건디", tier: "실버", pts: 15, pool: [] },
    A: { riot: "산책하는마루#kr3", tier: "마스터 844LP", pts: 90, pool: [] },
    S: { riot: "반건조땅콩#kr1", tier: "실버", pts: 15, pool: [] } } },
  { id: "subin", name: "수빈이의아이들", players: {
    T: { riot: "loegu#kr1", tier: "에메랄드", pts: 45, pool: [
      ["Darius", 3], ["Malphite", 3], ["Kennen", 2], ["Mordekaiser", 2], ["Pantheon", 1]] },
    J: { riot: "키아나#1234", tier: "에메랄드", pts: 45, pool: [
      ["Qiyana", 3], ["Nunu", 3], ["Zac", 2], ["Chogath", 2], ["Vi", 1]] },
    M: { riot: "예전같지않아#노인의공격", tier: "에메랄드", pts: 45, pool: [
      ["Azir", 3], ["Orianna", 3], ["Lissandra", 2], ["Malzahar", 2], ["Galio", 1]] },
    A: { riot: "한다면 하는 남자#참회하기", tier: "다이아", pts: 60, pool: [
      ["Ezreal", 3], ["Kaisa", 3], ["Lucian", 2], ["Caitlyn", 2], ["Yunara", 1]] },
    S: { riot: "평가원국어담당#kr1", tier: "플래티넘 2", pts: 35, pool: [
      ["Nautilus", 3], ["Blitzcrank", 3], ["Leona", 2], ["Alistar", 2], ["Lulu", 1], ["Braum", 1], ["Thresh", 1]] } } },
  { id: "1seung", name: "1승쫑", players: {
    T: { riot: "원제대#kr00", tier: "다이아", pts: 60, pool: [] },
    J: { riot: "First eye#kr1", tier: "플래티넘", pts: 35, pool: [] },
    M: { riot: "말랑흰자#kr1", tier: "플래티넘", pts: 35, pool: [] },
    A: { riot: "fofo#hwan", tier: "에메랄드", pts: 45, pool: [] },
    S: { riot: "tilttilt#tilt", tier: "에메랄드", pts: 45, pool: [] } } },
  { id: "hanjung", name: "한중비즈니스", players: {
    T: { riot: "wind#5959", tier: "다이아", pts: 60, pool: [] },
    J: { riot: "이수근의도박파티#KR1", tier: "다이아", pts: 60, pool: [] },
    M: { riot: "고경록#kr1", tier: "에메랄드", pts: 45, pool: [] },
    A: { riot: "김싼타#kr1", tier: "플래티넘", pts: 35, pool: [] },
    S: { riot: "우치하#han", tier: "플래티넘", pts: 35, pool: [] } } },
];
