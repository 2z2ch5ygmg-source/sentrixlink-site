// Privacy policy pages: mark the table-of-contents entry for the section being read (aria-current="location").
(() => {
  const secs = Array.from(document.querySelectorAll('.pv-sec[id]'));
  if (!secs.length || !('IntersectionObserver' in window)) return;
  const links = Array.from(document.querySelectorAll('.toc a[href^="#p"]'));
  const mark = (id) => links.forEach((a) => {
    if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'location');
    else a.removeAttribute('aria-current');
  });
  const io = new IntersectionObserver((entries) => {
    const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (hit) mark(hit.target.id);
  }, { rootMargin: '-20% 0px -70% 0px' });
  secs.forEach((s) => io.observe(s));
})();
