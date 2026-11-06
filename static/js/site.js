/* Sentrix Link — shared behaviour. All clicks go through one delegated listener keyed by data-action. */
(() => {
  const cfg = window.SL || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* mobile menu */
  const menu = () => $('#mnav');
  function setMenu(open) {
    const m = menu(); const btn = $('[data-action="toggle-menu"]');
    if (!m || !btn) return;
    m.dataset.open = String(open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    document.body.dataset.menuOpen = String(open);
  }

  /* brochure dialog: pick Sentrix or Sentrix HR (links to the HTML brochures) */
  const dlg = () => $('#download');
  function openDownload(trigger) {
    setMenu(false);
    const d = dlg(); if (!d) return;
    d._trigger = trigger;
    d.showModal();
    ($('a.bro', d) || $('[data-action="close-download"]', d)).focus();
  }
  function closeDownload() {
    const d = dlg(); if (!d || !d.open) return;
    d.close();
  }

  /* form validation and sending (Web3Forms; no own server) */
  const MSG = {
    valueMissing: '이 칸을 적어 주세요.',
    typeMismatch: '이메일 형식으로 적어 주세요. 예: name@company.com',
    consent: '동의해야 보낼 수 있습니다.',
  };
  function fieldError(input) {
    const id = input.getAttribute('aria-describedby');
    const box = id && document.getElementById(id.split(' ')[0]);
    let msg = '';
    if (!input.validity.valid) {
      msg = input.type === 'checkbox' ? MSG.consent : (input.validity.typeMismatch ? MSG.typeMismatch : MSG.valueMissing);
    }
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
    if (box) { box.textContent = msg; box.hidden = !msg; }
    return !msg;
  }
  async function send(form, subject) {
    const data = Object.fromEntries(new FormData(form).entries());
    if (data.botcheck) return { ok: true };
    delete data.botcheck;
    if (!cfg.formKey) {
      // Preview build: nothing is sent until the form service key is set in config.json.
      await new Promise((r) => setTimeout(r, 400));
      return { ok: true, preview: true };
    }
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ access_key: cfg.formKey, subject, from_name: 'Sentrix Link', ...data }),
    });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok && body.success !== false };
  }
  async function onSubmit(form) {
    const fields = $$('input[required], select[required], textarea[required]', form);
    const results = fields.map(fieldError);
    const firstBad = fields[results.indexOf(false)];
    if (firstBad) { firstBad.focus(); return; }
    const btn = $('button[type="submit"]', form);
    const err = $('[data-role="form-error"]', form);
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = '보내는 중…';
    if (err) err.hidden = true;
    try {
      const kind = form.dataset.form;
      const r = await send(form, '도입 문의');
      if (!r.ok) throw new Error('send failed');
      document.dispatchEvent(new CustomEvent('sl:sent', { detail: { form, data: Object.fromEntries(new FormData(form).entries()), preview: !!r.preview } }));
    } catch (e) {
      if (err) { err.textContent = '보내지 못했습니다. 잠시 뒤 다시 눌러 주세요.'; err.hidden = false; }
    } finally {
      btn.disabled = false; btn.textContent = label;
    }
  }

  /* role tabs (home) — arrow keys move between tabs */
  function selectTab(tab) {
    const list = tab.closest('[role="tablist"]');
    $$('[role="tab"]', list).forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (el) {
      const a = el.dataset.action;
      if (a === 'toggle-menu') setMenu(menu().dataset.open !== 'true');
      else if (a === 'open-download') { e.preventDefault(); openDownload(el); }
      else if (a === 'close-download') closeDownload();
      else if (a === 'select-tab') selectTab(el);
      return;
    }
    const d = dlg();
    if (d && d.open && e.target === d) closeDownload(); // click on the backdrop
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu() && menu().dataset.open === 'true') { setMenu(false); $('[data-action="toggle-menu"]').focus(); }
    const tab = e.target.closest && e.target.closest('[role="tab"]');
    if (tab && (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'Home' || e.key === 'End')) {
      const tabs = $$('[role="tab"]', tab.closest('[role="tablist"]'));
      let i = tabs.indexOf(tab);
      i = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[i].focus(); selectTab(tabs[i]); e.preventDefault();
    }
  });

  document.addEventListener('submit', (e) => {
    const form = e.target.closest('form[data-form]');
    if (!form) return;
    e.preventDefault();
    onSubmit(form);
  });
  /* Re-check a flagged field while it is edited (input), not only on change: a text field's change
     fires on blur, so its error box would vanish between mousedown and mouseup on the next control,
     shift the layout and lose that click. */
  const recheck = (e) => {
    const t = e.target;
    if (t.matches && t.matches('form[data-form] [aria-invalid="true"]')) fieldError(t);
  };
  document.addEventListener('input', recheck);
  document.addEventListener('change', recheck);

  document.addEventListener('DOMContentLoaded', () => {
    const d = dlg();
    if (d) d.addEventListener('close', () => { if (d._trigger && document.contains(d._trigger)) d._trigger.focus(); });
    window.matchMedia('(min-width: 900px)').addEventListener('change', (m) => { if (m.matches) setMenu(false); });

    /* 「엑셀 그대로」 sheets: fit the drawn Excel crop to its column (down to 70 % (about Excel's 75 % view); narrower
       screens scroll sideways) and place each pin box over the cells it names (data-box="B5:C7"). */
    const sheets = $$('.xwin__sheet');
    const a1 = (s) => { const m = /^([A-Z]+)(\d+)$/.exec(s); let c = 0; for (const ch of m[1]) c = c * 26 + ch.charCodeAt(0) - 64; return [c, +m[2]]; };
    const layoutSheets = () => sheets.forEach((sh) => {
      const fit = sh.parentElement; const scroller = fit.parentElement;
      const t = $('table', sh); const w = Math.max(sh.offsetWidth, t ? t.offsetWidth : 0), h = sh.offsetHeight;
      const k = Math.max(0.7, Math.min(1, (scroller.clientWidth - 1) / w));
      sh.style.transform = k < 1 ? `scale(${k})` : '';
      fit.style.width = `${Math.floor(w * k)}px`; fit.style.height = `${Math.ceil(h * k)}px`;
      $$('.xpin', sh).forEach((pin) => {
        const [from, to] = pin.dataset.box.split(':').map(a1);
        let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
        $$('td[data-a1]', sh).forEach((td) => {
          const [c, r] = a1(td.dataset.a1);
          if (c < from[0] || c > to[0] || r < from[1] || r > to[1]) return;
          x1 = Math.min(x1, td.offsetLeft); y1 = Math.min(y1, td.offsetTop);
          x2 = Math.max(x2, td.offsetLeft + td.offsetWidth); y2 = Math.max(y2, td.offsetTop + td.offsetHeight);
        });
        if (!isFinite(x1)) { pin.hidden = true; return; }
        const pad = 3;
        Object.assign(pin.style, { left: `${x1 - pad}px`, top: `${y1 - pad}px`, width: `${x2 - x1 + pad * 2}px`, height: `${y2 - y1 + pad * 2}px` });
      });
    });
    if (sheets.length) {
      layoutSheets();
      (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(layoutSheets);
      window.addEventListener('resize', layoutSheets);
    }

    /* scroll scene: sentences light up one at a time (home problem scene) */
    const seq = $$('[data-seq]');
    if (seq.length && !reduced.matches && 'IntersectionObserver' in window) {
      seq.forEach((list) => {
        const items = $$('li', list);
        list.classList.add('is-seq');
        const io = new IntersectionObserver((entries) => {
          entries.forEach((en) => { if (en.isIntersecting) { items.forEach((li) => li.classList.toggle('is-on', li === en.target)); } });
        }, { rootMargin: '-45% 0px -45% 0px' });
        items.forEach((li) => io.observe(li));
        items[0].classList.add('is-on');
      });
    }

    /* reveal: progress dashes fill when they enter the viewport */
    const fills = $$('[data-fill]');
    if (fills.length && !reduced.matches && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-filled'); io.unobserve(en.target); } });
      }, { threshold: 0.4 });
      fills.forEach((el) => { el.classList.add('will-fill'); io.observe(el); });
    }
  });
})();
