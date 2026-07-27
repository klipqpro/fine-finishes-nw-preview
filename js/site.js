/* ============================================================
   FINE FINISHES NW — shared site script
   Loaded by every page. GSAP is optional; everything degrades
   gracefully without it and without JS entirely where possible.
   ============================================================ */

/* ------------------------------------------------------------
   LEAD DESTINATION — the only block you need to edit
   ------------------------------------------------------------
   Today every form emails you through Web3Forms (free, no account
   server required). To turn it on:

     1. Go to https://web3forms.com  →  enter your email  →  copy
        the Access Key they send you.
     2. Paste it into accessKey below, replacing PASTE_YOUR_KEY_HERE.
     3. Save. That's it — every form on the site starts working.

   Until a key is set, forms fall back to opening the visitor's
   email app with all their details pre-filled, so no lead is lost.

   MOVING TO A CRM LATER (Jobber, HubSpot, Housecall Pro, Zapier):
   set provider to 'webhook' and put the CRM's inbound URL in
   webhookUrl. Nothing else on the site needs to change.
------------------------------------------------------------ */
const LEAD_CONFIG = {
  provider:   'web3forms',              // 'web3forms' | 'webhook'
  accessKey:  'PASTE_YOUR_KEY_HERE',    // ← from web3forms.com
  webhookUrl: '',                       // ← used only when provider is 'webhook'
  toEmail:    'info@finefinishesnw.com',
  phone:      '+13606351080',
  subject:    'New estimate request — finefinishesnw.com',
  redirect:   'thank-you.html'
};

(function () {
  'use strict';

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof gsap !== 'undefined';
  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ---------- header state + floating CTA ---------- */
  const header  = $('header.site');
  const bookNow = $('#bookNow');
  const heroForm = $('#estimate');

  function onScroll() {
    if (header) header.classList.toggle('scrolled', window.scrollY > 40);
    if (bookNow) {
      // show once the top estimate form has scrolled away (or after 600px)
      const gone = heroForm
        ? heroForm.getBoundingClientRect().bottom < 0
        : window.scrollY > 600;
      bookNow.classList.toggle('show', gone);
    }
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- mobile menu ---------- */
  const burger = $('#burger');
  const menu   = $('#mobileMenu');
  if (burger && menu) {
    burger.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    $$('a', menu).forEach(a => a.addEventListener('click', () => {
      menu.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }));
    addEventListener('keydown', e => {
      if (e.key === 'Escape' && menu.classList.contains('open')) burger.click();
    });
  }

  /* ---------- custom dropdowns ---------- */
  $$('[data-select]').forEach(sel => {
    const btn    = $('.select-btn', sel);
    const list   = $('.select-list', sel);
    const hidden = $('input[type=hidden]', sel);
    const opts   = $$('li', list);
    const close  = () => { sel.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };

    btn.addEventListener('click', () => {
      const open = sel.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
    opts.forEach(li => li.addEventListener('click', () => {
      opts.forEach(o => o.setAttribute('aria-selected', String(o === li)));
      $('span', btn).textContent = li.textContent;
      hidden.value = li.textContent;
      close(); btn.focus();
    }));
    btn.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const cur  = opts.findIndex(o => o.getAttribute('aria-selected') === 'true');
        const next = opts[(cur + (e.key === 'ArrowDown' ? 1 : opts.length - 1)) % opts.length];
        next.click();
        sel.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
      if (e.key === 'Escape') close();
    });
    document.addEventListener('click', e => { if (!sel.contains(e.target)) close(); });
  });

  /* ---------- lead forms ---------- */
  const keyIsSet = LEAD_CONFIG.accessKey && !/PASTE_YOUR_KEY/.test(LEAD_CONFIG.accessKey);

  function mailtoFallback(data) {
    const lines = Object.entries(data)
      .filter(([k, v]) => v && !k.startsWith('_'))
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    const href = `mailto:${LEAD_CONFIG.toEmail}`
      + `?subject=${encodeURIComponent(LEAD_CONFIG.subject)}`
      + `&body=${encodeURIComponent(lines)}`;
    window.location.href = href;
  }

  $$('form[data-lead]').forEach(form => {
    const btn  = $('button[type=submit]', form);
    const note = $('.form-note', form);
    const label = btn ? btn.textContent : '';

    function say(kind, msg) {
      if (!note) return;
      note.className = 'form-note ' + kind;
      note.textContent = msg;
    }

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!form.reportValidity()) return;

      // honeypot: bots fill hidden fields, humans never see them
      const trap = form.elements._hp_company;
      if (trap && trap.value) return;

      const data = Object.fromEntries(new FormData(form).entries());
      delete data._hp_company;               // never send the trap to the CRM
      data.page = location.pathname.split('/').pop() || 'index.html';

      if (!keyIsSet && LEAD_CONFIG.provider === 'web3forms') {
        say('ok', 'Opening your email app so you can send this to us directly…');
        mailtoFallback(data);
        return;
      }

      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
      say('', '');

      try {
        let res;
        if (LEAD_CONFIG.provider === 'webhook') {
          res = await fetch(LEAD_CONFIG.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
        } else {
          res = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              access_key: LEAD_CONFIG.accessKey,
              subject: LEAD_CONFIG.subject,
              from_name: 'Fine Finishes NW website',
              ...data
            })
          });
        }
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        location.href = LEAD_CONFIG.redirect;
      } catch (err) {
        if (btn) { btn.disabled = false; btn.textContent = label; }
        say('err', 'Sorry — that didn\'t go through. Please call us at (360) 635-1080 and we\'ll take care of you right away.');
      }
    });
  });

  /* ---------- before / after slider ---------- */
  $$('.ba').forEach(ba => {
    const range  = $('input[type=range]', ba);
    const after  = $('.ba-after', ba);
    const handle = $('.ba-handle', ba);
    if (!range || !after || !handle) return;
    const setPos = v => {
      after.style.clipPath = `inset(0 0 0 ${v}%)`;
      handle.style.left = v + '%';
    };
    range.addEventListener('input', e => setPos(e.target.value));
    setPos(range.value || 50);
  });

  /* ---------- portfolio filters ---------- */
  const filterBar = $('[data-filters]');
  if (filterBar) {
    const cards = $$('[data-type]');
    $$('button', filterBar).forEach(b => b.addEventListener('click', () => {
      const want = b.dataset.filter;
      $$('button', filterBar).forEach(o => o.setAttribute('aria-pressed', String(o === b)));
      cards.forEach(c => {
        const show = want === 'all' || c.dataset.type === want;
        c.style.display = show ? '' : 'none';
      });
    }));
  }

  /* ---------- lightbox gallery ---------- */
  const lb = $('#lightbox');
  if (lb) {
    const lbImg = $('img', lb);
    const lbCap = $('figcaption', lb);
    let items = [], idx = 0;

    function show(i) {
      idx = (i + items.length) % items.length;
      const it = items[idx];
      lbImg.src = it.full;
      lbImg.alt = it.alt;
      lbCap.textContent = `${idx + 1} / ${items.length}`;
      // warm the neighbours so arrow-keying feels instant
      [idx + 1, idx - 1].forEach(n => {
        const nb = items[(n + items.length) % items.length];
        if (nb) new Image().src = nb.full;
      });
    }
    function open(i) {
      show(i);
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
      $('.lb-close', lb).focus();
    }
    function close() {
      lb.classList.remove('open');
      document.body.style.overflow = '';
      lbImg.src = '';
    }

    $$('.gal button').forEach((b, i) => {
      const img = $('img', b);
      items.push({ full: b.dataset.full, alt: img ? img.alt : '' });
      b.addEventListener('click', () => open(i));
    });

    $('.lb-close', lb).addEventListener('click', close);
    $('.lb-prev', lb).addEventListener('click', () => show(idx - 1));
    $('.lb-next', lb).addEventListener('click', () => show(idx + 1));
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    addEventListener('keydown', e => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape')     close();
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'ArrowLeft')  show(idx - 1);
    });

    // swipe on touch devices
    let x0 = null;
    lb.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
      x0 = null;
    }, { passive: true });
  }

  /* ---------- counters ---------- */
  function runCounters() {
    $$('[data-count]').forEach(el => {
      const target = +el.dataset.count, suffix = el.dataset.suffix || '';
      if (reduced || !hasGsap || typeof ScrollTrigger === 'undefined') {
        el.textContent = target + suffix; return;
      }
      const obj = { v: 0 };
      gsap.to(obj, {
        v: target, duration: 1.6, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 92%' },
        onUpdate: () => el.textContent = Math.round(obj.v) + suffix
      });
      setTimeout(() => { if (obj.v === 0) el.textContent = target + suffix; }, 6000);
    });
  }

  /* ---------- motion ---------- */
  if (!hasGsap || reduced) { runCounters(); return; }

  document.documentElement.classList.add('js-anim');
  if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

  const heroLines = $$('[data-hero-line]');
  if (heroLines.length) {
    const tl = gsap.timeline();
    tl.from(heroLines, { yPercent: 110, duration: .9, stagger: .12, ease: 'expo.out' })
      .from('[data-hero]', { opacity: 0, y: 22, duration: .7, stagger: .1, ease: 'power2.out' }, '-=0.55');
    setTimeout(() => { if (tl.progress() < 1) tl.progress(1); }, 5000); // never leave the hero hidden
  } else {
    gsap.from('[data-hero]', { opacity: 0, y: 22, duration: .7, stagger: .08, ease: 'power2.out' });
  }

  const reveals = $$('[data-reveal]');
  reveals.forEach(el => {
    gsap.fromTo(el, { opacity: 0, y: 22 }, {
      opacity: 1, y: 0, duration: .55, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' }
    });
  });

  /* Fail-safes so content can NEVER be left invisible.
     [data-reveal] starts at opacity:0, so anything that stops ScrollTrigger from
     firing — a deep link to an #anchor, images loading late and shifting layout,
     ScrollTrigger failing to load — would otherwise hide a whole section. */
  function forceVisible(el) {
    gsap.set(el, { opacity: 1, y: 0, clearProps: 'opacity,transform' });
  }
  function revealInView() {
    reveals.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight && r.bottom > 0 && getComputedStyle(el).opacity === '0') {
        forceVisible(el);
      }
    });
  }
  // recalculate once images have settled, then sweep anything visible but hidden
  addEventListener('load', () => {
    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
    revealInView();
  });
  setTimeout(revealInView, 1200);
  // last resort: after 3s nothing stays hidden, anywhere on the page
  setTimeout(() => reveals.forEach(el => {
    if (getComputedStyle(el).opacity === '0') forceVisible(el);
  }), 3000);

  $$('[data-parallax]').forEach(img => {
    gsap.fromTo(img, { yPercent: -5 }, {
      yPercent: 5, ease: 'none',
      scrollTrigger: { trigger: img.closest('div'), start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  const fill = $('#procFill');
  if (fill) {
    gsap.to(fill, {
      width: '100%', ease: 'none',
      scrollTrigger: { trigger: '.proc-grid', start: 'top 75%', end: 'bottom 60%', scrub: true }
    });
  }

  runCounters();
})();
