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
