/* ============================================================================
   Mohamed Abuzaid — profile interactions
   1 nav  2 reveal  3 counters  4 cursor glow  5 product grid + filters
   6 full-screen overlay
   Products ARE showcases — one list, driven by data/showcases.json.
   Add an object there and a card appears, already wired to its overlay.
   ========================================================================= */
(() => {
'use strict';
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- 1. NAV ---------- */
const burger = $('#burger'), drawer = $('#drawer'), scrim = $('#scrim');
function menu(open){
  drawer.hidden = !open; scrim.hidden = !open;
  burger.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
  requestAnimationFrame(() => drawer.classList.toggle('open', open));
}
burger.addEventListener('click', () => menu(drawer.hidden));
scrim.addEventListener('click', () => menu(false));
$$('#drawer a').forEach(a => a.addEventListener('click', () => menu(false)));

const navMap = new Map($$('.nav-links a').map(a => [a.getAttribute('href').slice(1), a]));
const spy = new IntersectionObserver(es => es.forEach(e => {
  const l = navMap.get(e.target.id);
  if (l && e.isIntersecting){
    navMap.forEach(x => x.removeAttribute('aria-current'));
    l.setAttribute('aria-current','true');
  }
}), { rootMargin:'-45% 0px -50% 0px' });
['products','safety','progress','contact']
  .forEach(id => { const el = document.getElementById(id); if (el) spy.observe(el); });

/* ---------- 2. REVEAL ---------- */
const rev = new IntersectionObserver((es, o) => es.forEach(e => {
  if (e.isIntersecting){ e.target.classList.add('in'); o.unobserve(e.target); }
}), { threshold:.14 });
function watchReveal(root = document){
  $$('.reveal', root).forEach(el => reduce ? el.classList.add('in') : rev.observe(el));
}
watchReveal();

/* ---------- 3. COUNTERS ---------- */
function countUp(el){
  const target = +el.dataset.count || 0, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
  if (reduce || !target){ el.textContent = pre + target.toLocaleString('en-US') + suf; return; }
  const t0 = performance.now(), dur = 1400;
  (function f(now){
    const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = pre + Math.round(target * e).toLocaleString('en-US') + suf;
    if (p < 1) requestAnimationFrame(f);
  })(t0);
}
const cObs = new IntersectionObserver((es, o) => es.forEach(e => {
  if (e.isIntersecting){ countUp(e.target); o.unobserve(e.target); }
}), { threshold:.4 });
$$('[data-count]').forEach(el => cObs.observe(el));

/* ---------- 4. CURSOR-REACTIVE LEAP GLOW ----------
   A LEAP-gradient light follows the pointer inside any .glow surface.
   One delegated listener, rAF-throttled, so a grid of cards costs nothing.
   Falls back to a static sheen on touch and for reduced-motion users. */
if (!reduce && matchMedia('(hover:hover) and (pointer:fine)').matches){
  let pending = null;
  addEventListener('pointermove', e => {
    const card = e.target.closest?.('.glow');
    if (!card) return;
    pending = { card, x: e.clientX, y: e.clientY };
    if (pending.queued) return;
    pending.queued = true;
    requestAnimationFrame(() => {
      if (!pending) return;
      const { card, x, y } = pending;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', ((x - r.left) / r.width  * 100).toFixed(2) + '%');
      card.style.setProperty('--my', ((y - r.top)  / r.height * 100).toFixed(2) + '%');
      card.classList.add('lit');
      pending = null;
    });
  }, { passive:true });

  addEventListener('pointerout', e => {
    const card = e.target.closest?.('.glow');
    if (card && !card.contains(e.relatedTarget)) card.classList.remove('lit');
  }, { passive:true });
}

/* ---------- 5. PRODUCT GRID (products = showcases) ---------- */
let CASES = [], lane = 'all';

function badge(c){
  if (c.gated)                    return '<span class="chip soon">Client portal · access code</span>';
  if (c.open.type === 'local')    return '<span class="chip live">Plays here</span>';
  if (c.open.type === 'external') return '<span class="chip live">Live</span>';
  return '<span class="chip">The record</span>';
}

function cardHTML(c){
  return `
  <article class="svc glow reveal p-${esc(c.practice)}" data-lane="${esc(c.lane)}"
           data-open-case="${esc(c.id)}" role="button" tabindex="0"
           aria-label="${esc(c.tab)} — ${esc(c.cta)}">
    <span class="ico" aria-hidden="true">${esc(c.icon)}</span>
    <span class="head"><span class="from">${esc(c.from)}</span>${badge(c)}</span>
    <h3>${esc(c.headline)}</h3>
    <p>${esc(c.pitch)}</p>
    <span class="who">For: ${esc(c.who)}</span>
    <span class="svc-cta">${esc(c.cta)} <i aria-hidden="true">→</i></span>
  </article>`;
}

function renderGrid(){
  const list = CASES.filter(c => lane === 'all' || c.lane === lane);
  const grid = $('#productGrid');
  grid.innerHTML = list.map(cardHTML).join('');
  watchReveal(grid);
}

$('#filters').addEventListener('click', e => {
  const b = e.target.closest('.filt'); if (!b) return;
  lane = b.dataset.lane;
  $$('#filters .filt').forEach(x => x.setAttribute('aria-selected', String(x === b)));
  renderGrid();
});

/* ---------- 6. FULL-SCREEN OVERLAY ---------- */
const ov = $('#ov'), ovBody = $('#ovBody'), ovTitle = $('#ovTitle'), ovExt = $('#ovExt');
let lastFocus = null;

function videoRail(c){
  if (!Array.isArray(c.videos) || !c.videos.length) return '';
  return `<div class="vids">
    ${c.videos.map((v, i) => `
      <figure class="vid${v.short ? ' vid-short' : ''}">
        <div class="vid-frame">
          <iframe src="https://www.youtube-nocookie.com/embed/${esc(v.id)}?rel=0&modestbranding=1"
            title="${esc(v.label || 'Video ' + (i + 1))}" loading="lazy" allowfullscreen
            allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"
            referrerpolicy="strict-origin-when-cross-origin"></iframe>
        </div>
        <figcaption>${esc(v.label || '')}</figcaption>
      </figure>`).join('')}
  </div>`;
}

function richPanel(c){
  return `<div class="ov-rich">
    <p class="eyebrow">${esc(c.kicker)}</p>
    <h2 class="h2">${esc(c.title)}</h2>
    <p class="lead" style="margin-bottom:22px">${esc(c.lede)}</p>
    ${c.ar ? `<div class="ar ov-ar">
      <b>${esc(c.ar.title)}</b>
      <p>${esc(c.ar.lede)}</p>
      ${c.ar.cta && c.open.src ? `<a class="btn btn-p btn-sm" href="${esc(c.open.src)}" target="_blank" rel="noopener">${esc(c.ar.cta)}</a>` : ''}
    </div>` : ''}
    <div class="meta">${c.tags.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>
    ${videoRail(c)}
    <ul class="bullets">
      ${c.bullets.map(b => `<li><span>${esc(b)}</span></li>`).join('')}
    </ul>
    <div class="acts">
      ${c.open.src ? `<a class="btn btn-p" href="${esc(c.open.src)}" target="_blank" rel="noopener">${c.gated ? 'Open the client portal ↗' : 'Open the live product ↗'}</a>` : ''}
      <a class="btn btn-g" href="mailto:info@beautifulmindlifestyle.com?subject=${encodeURIComponent(c.tab)}">Ask about this</a>
    </div>
  </div>`;
}

function openCase(id){
  const c = CASES.find(x => x.id === id); if (!c) return;
  lastFocus = document.activeElement;
  ovTitle.textContent = c.tab;
  ovBody.innerHTML = '';
  ovExt.hidden = true;

  if (c.open.type === 'local'){
    // Self-contained file, same origin — always renders.
    // Big self-contained files take a moment; show a loader until onload fires.
    ovBody.innerHTML =
      `<div id="ovLoad" style="position:absolute;inset:0;display:grid;place-items:center;gap:14px;
         align-content:center;color:var(--muted);font-size:14px;z-index:2;background:var(--ink)">
         <div style="width:44px;height:44px;border-radius:50%;border:3px solid rgba(255,255,255,.12);
              border-top-color:var(--leap-cyan);animation:spin .9s linear infinite"></div>
         <span>Loading ${esc(c.tab)}…</span>
       </div>
       <iframe src="${esc(c.open.src)}" title="${esc(c.tab)}"></iframe>`;
    const fr = ovBody.querySelector('iframe');
    fr.addEventListener('load', () => ovBody.querySelector('#ovLoad')?.remove());
    setTimeout(() => ovBody.querySelector('#ovLoad')?.remove(), 12000);   // never trap the user
    ovExt.href = c.open.src; ovExt.hidden = false;
  } else {
    /* Many live sites refuse to be framed (X-Frame-Options), so we render a rich
       panel here and send the visitor out only if they choose to. The panel carries
       its own primary link, so the header's "open in new tab" stays hidden. */
    ovBody.innerHTML = richPanel(c);
  }

  ov.hidden = false;
  document.body.style.overflow = 'hidden';
  $('#ovClose').focus();
  document.addEventListener('keydown', trap);
}

function closeOv(){
  ov.hidden = true;
  ovBody.innerHTML = '';                     // stop any iframe media
  document.body.style.overflow = '';
  document.removeEventListener('keydown', trap);
  lastFocus?.focus?.();
}
function trap(e){
  if (e.key === 'Escape'){ closeOv(); return; }
  if (e.key !== 'Tab') return;
  const f = $$('button, [href], iframe, [tabindex]:not([tabindex="-1"])', ov).filter(x => !x.hidden);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
}
$('#ovClose').addEventListener('click', closeOv);
// a showcase iframe can ask to be closed (its own "back to profile" button)
window.addEventListener('message', e => {
  if (e.data && e.data.type === 'close-showcase') closeOv();
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-open-case]');
  if (b) openCase(b.dataset.openCase);
});
// the whole card is the door — keyboard too
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const card = e.target.closest?.('.svc[data-open-case]');
  if (!card) return;
  e.preventDefault();
  openCase(card.dataset.openCase);
});

/* ---------- 7. BOOT ---------- */
/* window.SHOWCASES is set by data/showcases.js. The fetch is only a fallback
   for anyone who removes that script tag. */
(window.SHOWCASES ? Promise.resolve(window.SHOWCASES) : fetch('./data/showcases.json').then(r => r.json()))
  .then(d => {
    CASES = d;
    const n = l => d.filter(c => l === 'all' || c.lane === l).length;
    $$('#filters .filt').forEach(b => {
      const s = b.querySelector('span'); if (s) s.textContent = n(b.dataset.lane);
    });
    renderGrid();
  })
  .catch(() => {
    $('#productGrid').innerHTML =
      '<p class="lead">Could not load the product list. Email ' +
      '<a href="mailto:info@beautifulmindlifestyle.com">info@beautifulmindlifestyle.com</a> and I will send it directly.</p>';
  });

/* Smooth in-page scroll with focus move (accessibility) */
$$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
  const id = a.getAttribute('href').slice(1), el = id && document.getElementById(id);
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  el.setAttribute('tabindex','-1'); el.focus({ preventScroll:true });
}));
})();
