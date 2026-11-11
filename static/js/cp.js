/* 씨피(CP) 첫 화면: 급구 공고가 위에서 하나씩 올라온다(2026-11-11 user: 실시간 급구 모션). 예시 데이터. */
(function () {
  var list = document.querySelector('[data-cp-feed]');
  if (!list) return;
  var POSTS = [
    ['코엑스 전시회 출입 통제 요원', '삼성동 · 지금 도착 즉시', '13만', 2],
    ['잠실 실내체육관 콘서트 관객 안내', '잠실 · 오늘 16:00', '15만', 5],
    ['판교 사옥 주말 주간 경비 대근', '판교 · 내일 07:00', '12만', 1],
    ['고척돔 경기 출입 통제', '고척 · 오늘 17:30', '14만', 4],
    ['킨텍스 박람회 주차 안내', '일산 · 내일 08:00', '12만', 6],
    ['강남 오피스 야간 경비 대근', '역삼 · 오늘 22:00', '13만', 1],
    ['상암 경기장 관중석 안전 요원', '상암 · 토 15:00', '14만', 8],
    ['성수 팝업스토어 대기열 관리', '성수 · 내일 10:00', '12만', 3],
    ['송도 컨벤시아 VIP 출입 통제', '송도 · 금 09:00', '16만', 2],
    ['여의도 야외 행사 동선 안내', '여의도 · 토 17:00', '15만', 10]
  ];
  var BOLT = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>';
  var MAX = 9, next = 0, ages = [];
  function esc(t) { return t.replace(/[&<>]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;'}[c]; }); }
  function item(p) {
    var li = document.createElement('li');
    li.innerHTML = '<div class="cp-feed__row"><span class="cp-feed__ic">' + BOLT + '</span><span class="cp-feed__t"><b>' + esc(p[0]) + '</b><span>' + esc(p[1]) + ' · ' + p[3] + '자리</span></span><span class="cp-feed__pay"><b>일급 ' + p[2] + '</b><small>방금</small></span></div>';
    return li;
  }
  function relabel() {
    Array.prototype.forEach.call(list.children, function (li, i) {
      var m = ages[i];
      li.querySelector('small').textContent = m === 0 ? '방금' : m + '분 전';
    });
  }
  function push(animate) {
    var li = item(POSTS[next % POSTS.length]);
    next++;
    if (animate) li.className = 'is-new';
    list.insertBefore(li, list.firstChild);
    ages = ages.map(function (a) { return a + 1; });
    ages.unshift(0);
    while (list.children.length > MAX) { list.removeChild(list.lastChild); ages.pop(); }
    Array.prototype.forEach.call(list.children, function (el, i) { if (i > 0) el.classList.remove('is-new'); });
    relabel();
  }
  for (var i = 0; i < 8; i++) push(false);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var timer = null, seen = false;
  function run() { if (!timer && seen && !document.hidden) timer = setInterval(function () { push(true); }, 2200); }
  function stop() { clearInterval(timer); timer = null; }
  new IntersectionObserver(function (es) { seen = es[0].isIntersecting; seen ? run() : stop(); }, {threshold: 0.3}).observe(list);
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : run(); });
})();
