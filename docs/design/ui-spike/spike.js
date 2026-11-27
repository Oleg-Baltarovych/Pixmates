// UI concept spike: shared interactions for the three direction mockups (no dependencies).
// Hash parameters (also used for screenshots): screen, theme, step, sec, freeze=<ms>, static, ap=approved|denied, sub.
(() => {
  'use strict';

  // Atlas layout shared by every built-in pack (resources/characters/*/manifest.json): [originX, originY, frames, fps].
  const ANIMS = {
    idle: [576, 0, 8, 6],
    talk: [288, 224, 6, 8],
    think: [0, 112, 8, 6],
    wave: [0, 168, 8, 8],
    happy: [576, 224, 6, 8],
  };
  const FW = 48;
  const FH = 56;
  const AW = 1008;
  const AH = 336;
  const MS_PER_CHAR = 24;

  const doc = document.documentElement;
  const params = new URLSearchParams(location.hash.slice(1));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fixedAt = params.has('static') || reduced ? Infinity : params.has('freeze') ? Number(params.get('freeze')) : null;
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];

  /* ---------- theme ---------- */
  function setTheme(t) {
    doc.dataset.theme = t;
    for (const b of $$('[data-theme-toggle]')) b.setAttribute('aria-pressed', String(t === 'dark'));
    syncHash();
  }

  /* ---------- sprites ---------- */
  const sprites = $$('.sprite');
  for (const el of sprites) {
    const s = Number(el.dataset.scale || 3);
    el.style.width = `${FW * s}px`;
    el.style.height = `${FH * s}px`;
    el.style.backgroundImage = `url(atlas/${el.dataset.char}.png)`;
    el.style.backgroundSize = `${AW * s}px ${AH * s}px`;
    el.dataset.anim = el.dataset.anim || 'idle';
    el.dataset.t0 = '0';
  }
  function setPose(el, anim) {
    if (el && el.dataset.anim !== anim) {
      el.dataset.anim = anim;
      el.dataset.t0 = String(performance.now());
    }
  }
  function drawSprites() {
    const now = performance.now();
    for (const el of sprites) {
      if (el.offsetParent === null) continue;
      const [x, y, n, fps] = ANIMS[el.dataset.anim] || ANIMS.idle;
      const f = reduced ? 0 : Math.floor(((now - Number(el.dataset.t0)) * fps) / 1000) % n;
      const s = Number(el.dataset.scale || 3);
      el.style.backgroundPosition = `${-(x + f * FW) * s}px ${-y * s}px`;
    }
  }
  setInterval(drawSprites, 50);

  /* ---------- timelines: data-at / data-hide-at / data-stream / data-poses ---------- */
  for (const s of $$('[data-stream]')) s.dataset.text = s.textContent.trim().replace(/[ \t\r\n]+/g, ' '); // keeps no-break spaces
  const own = (tl, sel) => $$(sel, tl).filter((e) => e.closest('[data-timeline]') === tl);
  const at = (v, end) => (v == null ? null : v.startsWith('end') ? end + Number(v.slice(3) || 0) : Number(v));
  function endOf(tl) {
    let end = 0;
    for (const s of own(tl, '[data-stream]')) end = Math.max(end, Number(s.dataset.at || 0) + s.dataset.text.length * MS_PER_CHAR);
    return end;
  }
  function apply(tl, t) {
    const end = endOf(tl);
    let last = end;
    for (const el of own(tl, '[data-at],[data-hide-at]')) {
      const a = at(el.dataset.at ?? '0', end);
      const h = at(el.dataset.hideAt, end);
      el.hidden = !(t >= a && (h == null || t < h));
      last = Math.max(last, a, h ?? 0);
    }
    for (const s of own(tl, '[data-stream]')) {
      const n = Math.max(0, Math.floor((t - Number(s.dataset.at || 0)) / MS_PER_CHAR));
      const txt = s.dataset.text;
      if (s.textContent !== txt.slice(0, n)) s.textContent = txt.slice(0, n);
      s.classList.toggle('is-typing', n > 0 && n < txt.length);
    }
    if (tl.dataset.poses) {
      let pose = null;
      for (const p of tl.dataset.poses.split(',')) {
        const [name, when] = p.split('@');
        const w = at(when, end);
        last = Math.max(last, w);
        if (t >= w) pose = name;
      }
      if (pose) setPose(tl.closest('.screen, [data-step]')?.querySelector('.actor .sprite, .hero-sprite .sprite'), pose);
    }
    for (const m of $$('.msgs', tl.closest('.screen') || tl)) m.scrollTop = m.scrollHeight;
    return t > last + 50;
  }
  const timers = new Map();
  function stop(tl) {
    clearInterval(timers.get(tl));
    timers.delete(tl);
  }
  function run(tl) {
    stop(tl);
    if (fixedAt !== null) return void apply(tl, fixedAt);
    const t0 = performance.now();
    const tick = () => apply(tl, performance.now() - t0) && stop(tl);
    tick();
    timers.set(tl, setInterval(tick, 30));
  }

  /* ---------- screens ---------- */
  const screens = $$('.screen');
  let current = null;
  function show(id) {
    const s = screens.find((x) => x.dataset.screen === id) || screens[0];
    current = s.dataset.screen;
    for (const x of screens) {
      x.hidden = x !== s;
      if (x !== s) for (const tl of $$('[data-timeline]', x).concat(x)) stop(tl);
    }
    for (const b of $$('[data-go]')) b.setAttribute('aria-selected', String(b.dataset.go === current));
    for (const sub of $$('[data-after]', s)) {
      sub.hidden = true;
      stop(sub);
    }
    for (const c of $$('.approval', s)) {
      c.classList.remove('is-approved', 'is-denied');
      for (const b of $$('button', c)) b.disabled = false;
    }
    if (s.matches('[data-timeline]')) run(s);
    if (current === 'radial') radial(s, true);
    if (current === 'firstrun') step(s, Number(params.get('step') || 1));
    if (current === 'settings') section(s, params.get('sec') || 'ai');
    syncHash();
  }

  function decide(card, ok) {
    const s = card.closest('.screen');
    stop(s);
    card.classList.add(ok ? 'is-approved' : 'is-denied');
    for (const b of $$('button', card)) b.disabled = true;
    for (const w of $$('.status--wait', s)) w.hidden = true;
    const sub = $$(`[data-after="${ok ? 'approved' : 'denied'}"]`, s)[0];
    if (sub) {
      sub.hidden = false;
      run(sub);
    }
  }

  function radial(s, open) {
    const r = $$('.radial', s)[0];
    if (!r) return;
    r.classList.toggle('is-open', open);
    r.inert = !open;
    $$('.js-radial-target', s)[0]?.setAttribute('aria-expanded', String(open));
    const sub = $$('.radial-sub', s)[0];
    if (sub) sub.hidden = !(open && params.has('sub'));
  }

  function step(s, n) {
    const steps = $$('[data-step]', s);
    n = Math.min(Math.max(1, n), steps.length);
    for (const p of steps) {
      const on = Number(p.dataset.step) === n;
      p.hidden = !on;
      if (on && p.matches('[data-timeline]')) run(p);
      else stop(p);
    }
    for (const b of $$('[data-step-go]', s)) {
      const k = Number(b.dataset.stepGo);
      b.setAttribute('aria-current', k === n ? 'step' : 'false');
      b.classList.toggle('is-done', k < n);
    }
    const prev = $$('[data-step-prev]', s)[0];
    const next = $$('[data-step-next]', s)[0];
    if (prev) prev.disabled = n === 1;
    if (next) next.textContent = n === steps.length ? next.dataset.finish : next.dataset.next;
    s.dataset.stepNow = String(n);
    params.set('step', String(n));
    syncHash();
  }

  function section(s, id) {
    for (const p of $$('[data-sec]', s)) p.hidden = p.dataset.sec !== id;
    for (const b of $$('[data-sec-go]', s)) b.setAttribute('aria-current', String(b.dataset.secGo === id));
    params.set('sec', id);
    syncHash();
  }

  function syncHash() {
    if (!current) return;
    const h = new URLSearchParams({ screen: current, theme: doc.dataset.theme });
    if (current === 'firstrun') h.set('step', params.get('step') || '1');
    if (current === 'settings') h.set('sec', params.get('sec') || 'ai');
    history.replaceState(null, '', `#${h}`);
  }

  /* ---------- events ---------- */
  document.addEventListener('click', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    const go = t.closest('[data-go]');
    if (go) return show(go.dataset.go);
    if (t.closest('[data-theme-toggle]')) return setTheme(doc.dataset.theme === 'dark' ? 'light' : 'dark');
    const ap = t.closest('[data-approve],[data-deny]');
    if (ap) return decide(ap.closest('.approval'), ap.hasAttribute('data-approve'));
    const chip = t.closest('[data-chip]');
    if (chip) {
      const s = chip.closest('.screen');
      $$('[data-q]', s)[0].textContent = chip.dataset.q;
      $$('[data-tool]', s)[0].textContent = chip.dataset.tool;
      $$('[data-stream]', s)[0].dataset.text = chip.dataset.a;
      for (const c of $$('[data-chip]', s)) c.setAttribute('aria-pressed', String(c === chip));
      return run(s);
    }
    if (t.closest('[data-replay]')) return show(current);
    const sub = t.closest('[data-radial-sub]');
    if (sub) {
      const box = $$('.radial-sub', sub.closest('.screen'))[0];
      box.hidden = !box.hidden;
      return sub.setAttribute('aria-expanded', String(!box.hidden));
    }
    const pill = t.closest('[data-pill]');
    if (pill) {
      const on = pill.getAttribute('aria-pressed') !== 'true';
      pill.setAttribute('aria-pressed', String(on));
      const p = $$(`.pill[data-for="${pill.dataset.pill}"]`, pill.closest('.screen'))[0];
      if (p) p.hidden = !on;
      return;
    }
    if (t.closest('[data-radial-close]')) return radial(t.closest('.screen'), false);
    const sg = t.closest('[data-step-go]');
    if (sg) return step(sg.closest('.screen'), Number(sg.dataset.stepGo));
    if (t.closest('[data-step-next]')) {
      const s = t.closest('.screen');
      const n = Number(s.dataset.stepNow);
      return n === $$('[data-step]', s).length ? show('bubble') : step(s, n + 1);
    }
    if (t.closest('[data-step-prev]')) {
      const s = t.closest('.screen');
      return step(s, Number(s.dataset.stepNow) - 1);
    }
    const sec = t.closest('[data-sec-go]');
    if (sec) return section(sec.closest('.screen'), sec.dataset.secGo);
  });

  document.addEventListener('contextmenu', (e) => {
    const target = e.target instanceof Element && e.target.closest('.js-radial-target');
    if (!target) return;
    e.preventDefault();
    const s = target.closest('.screen');
    radial(s, !$$('.radial', s)[0].classList.contains('is-open'));
  });
  document.addEventListener('keydown', (e) => {
    const s = screens.find((x) => !x.hidden);
    if (e.key === 'Escape' && s) radial(s, false);
    const target = e.target instanceof Element && e.target.closest('.js-radial-target');
    if (target && (e.key === 'Enter' || e.key === ' ' || (e.key === 'F10' && e.shiftKey))) {
      e.preventDefault();
      radial(s, !$$('.radial', s)[0].classList.contains('is-open'));
    }
  });
  for (const r of $$('input[type=range][data-out]')) {
    const out = document.getElementById(r.dataset.out);
    const upd = () => (out.textContent = `$${(Number(r.value) / 100).toFixed(2).replace('.', ',')}`);
    r.addEventListener('input', upd);
    upd();
  }
  for (const tab of $$('[role=tablist]')) {
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const tabs = $$('[role=tab]', tab);
      const i = tabs.indexOf(document.activeElement);
      if (i < 0) return;
      const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      n.focus();
      n.click();
    });
  }

  setTheme(params.get('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  show(params.get('screen') || 'bubble');
  if (current === 'mcp' && params.get('ap')) {
    const card = $$('.approval', screens.find((x) => !x.hidden))[0];
    if (card) decide(card, params.get('ap') === 'approved');
  }
  drawSprites();
})();
