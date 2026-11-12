/* B 기능 한 장면: 화면에 보이면 위에서부터 단추가 차례로 「완료」로 바뀌고, 다 끝나면 잠시 뒤 처음부터(2026-11-11). */
(function () {
  var figs = document.querySelectorAll('[data-scn]');
  if (!figs.length) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  Array.prototype.forEach.call(figs, function (fig) {
    var rows = Array.prototype.slice.call(fig.querySelectorAll('.scn__row.is-todo'));
    var max = Number(fig.dataset.max) || rows.length;
    var count = fig.querySelector('[data-scn-count]');
    var step = 0, timer = null, seen = false;
    function paint() {
      rows.forEach(function (r, i) { r.classList.toggle('is-done', i < step); });
      if (count) count.textContent = String(rows.length - step);
    }
    if (reduced) { step = Math.min(1, max); paint(); return; }
    function tick() {
      if (step < max) { step++; paint(); timer = setTimeout(tick, step < max ? 1300 : 2800); }
      else { step = 0; paint(); timer = setTimeout(tick, 1100); }
    }
    function run() { if (!timer && seen && !document.hidden) timer = setTimeout(tick, 900); }
    function stop() { clearTimeout(timer); timer = null; }
    new IntersectionObserver(function (es) { seen = es[0].isIntersecting; seen ? run() : stop(); }, {threshold: 0.4}).observe(fig);
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : run(); });
  });
})();
/* 홈 급구 통화 카드: 한 통씩 「연결 중…」 → 결과. 다 돌려도 확정 0명(2026-11-11). */
(function () {
  var fig = document.querySelector('[data-calls]');
  if (!fig || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var rows = Array.prototype.slice.call(fig.querySelectorAll('.calls__row'));
  var i = 0, timer = null, seen = false;
  function reset() { rows.forEach(function (r) { r.classList.add('is-wait'); r.classList.remove('is-dial'); r.querySelector('.calls__st').textContent = ''; }); i = 0; }
  function tick() {
    if (i >= rows.length) { timer = setTimeout(function () { reset(); tick(); }, 3200); return; }
    var r = rows[i], st = r.querySelector('.calls__st');
    r.classList.remove('is-wait'); r.classList.add('is-dial'); st.textContent = '연결 중…';
    timer = setTimeout(function () { r.classList.remove('is-dial'); st.textContent = r.dataset.final; i++; timer = setTimeout(tick, 450); }, 1100);
  }
  function run() { if (!timer && seen && !document.hidden) { reset(); tick(); } }
  function stop() { clearTimeout(timer); timer = null; rows.forEach(function (r) { r.classList.remove('is-wait', 'is-dial'); r.querySelector('.calls__st').textContent = r.dataset.final; }); }
  new IntersectionObserver(function (es) { seen = es[0].isIntersecting; seen ? run() : stop(); }, {threshold: 0.4}).observe(fig);
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : run(); });
})();
