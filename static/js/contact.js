/* Contact page: after site.js sends the form (event sl:sent), swap the form card for the done card. */
(() => {
  document.addEventListener('sl:sent', (e) => {
    const { form, data = {}, preview } = e.detail || {};
    if (!form || form.dataset.form !== 'contact') return;
    const done = document.querySelector('.c-done');
    if (!done) return;
    done.querySelectorAll('[data-out]').forEach((el) => {
      el.textContent = String(data[el.dataset.out] || '').trim() || '—';
    });
    const note = done.querySelector('[data-role="preview-note"]');
    if (note) note.hidden = !preview;
    form.hidden = true;
    done.hidden = false;
    const h = done.querySelector('#doneTitle');
    if (h) h.focus({ preventScroll: true });
    const top = done.getBoundingClientRect().top;
    const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 0;
    if (top < headerH || top > window.innerHeight * 0.6) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: window.scrollY + top - headerH - 24, behavior: reduced ? 'auto' : 'smooth' });
    }
  });
})();
