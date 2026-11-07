import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import FALLBACK from './content.json';
import { api } from './api.js';
import { createVerse, PLANET_ORDER, SHAPES } from './verse.js';
import { createWarp } from './warp.js';
import { initChat } from './chat.js';
import { createFilm } from './film.js';
import { $, $$, esc, initCursor, initTilt, splitHeadings, openModal, initModal, initArt } from './ui.js';

gsap.registerPlugin(ScrollTrigger);
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (REDUCE) document.documentElement.classList.add('rm');
const ROUTES = ['home', 'services', 'projects', 'careers', 'insights', 'contact'];
const TITLES = { home: 'Vastverse — Innovation from Vision', services: 'What we do | Vastverse', projects: 'Projects | Vastverse', careers: 'Careers | Vastverse', insights: 'Insights | Vastverse', contact: "Let's talk | Vastverse" };
const HMODE = false;
const INTRO_LOADER_DURATION = 1750; // + ~0.75s explode exit = ~2.5s total intro

let C = FALLBACK, route = null, ctx = null, journey = null, pendingSvc = null, currentSvc = 0;

/* ============================================================ content */
function renderContent() {
  $('#stats').innerHTML = C.stats.map(s => `<div class="stat"><b data-count="${s.value}" data-dec="${s.decimals}" data-suf="${s.suffix}">0${s.suffix}</b><span>${esc(s.label)}</span></div>`).join('');
  const icons = ['<circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M5 19l3-3M16 8l3-3"/>', '<path d="M4 7l8-4 8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4M4 17l8 4 8-4"/>', '<path d="M3 20h18M6 16l4-5 3 3 5-7"/><path d="M15 7h3v3"/>', '<rect x="3" y="14" width="6" height="7" rx="1"/><rect x="9" y="9" width="6" height="12" rx="1"/><rect x="15" y="3" width="6" height="18" rx="1"/>'];
  $('#caps').innerHTML = C.capabilities.map((c, i) => `<article class="card cap tilt" data-reveal><div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="#9FD0FF" stroke-width="1.5">${icons[i]}</svg></div><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></article>`).join('');
  $('#principles').innerHTML = C.principles.map(p => `<div class="pr"><i></i><b>${esc(p[0])}</b><span>${esc(p[1])}</span></div>`).join('');
  const svcIndex = id => C.services.findIndex(s => s.id === id);
  $('#svcGrid').innerHTML = C.homeServices.map((s, i) => `<a class="card svc tilt" data-reveal href="${s[2] ? '#services' : '#contact'}" data-link ${s[2] ? `data-svc="${svcIndex(s[2])}"` : ''}><span class="n">${String(i + 1).padStart(2, '0')}</span><div><h3>${esc(s[0])}</h3><p>${esc(s[1])}</p></div></a>`).join('');
  $('#sols').innerHTML = C.solutions.map(s => `<article class="sol tilt" data-reveal><canvas data-art="${s.art}"></canvas><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></article>`).join('');
  $('#indGrid').innerHTML = C.industries.map(i => `<div class="ind" data-reveal><h3>${esc(i[0])}</h3><span>${esc(i[1])}</span></div>`).join('');
  $('#mq').innerHTML = [...C.tech, ...C.tech].map(t => `<span>${esc(t)}</span>`).join('');
  $('#steps').innerHTML = C.process.map((p, i) => `<div class="step" data-n="${i + 1}" data-reveal><div class="card"><small>${esc(p[1])}</small><h3>${esc(p[0])}</h3><p>${esc(p[2])}</p><ul>${p[3].map(b => `<li>${esc(b)}</li>`).join('')}</ul></div></div>`).join('');

  // services explorer
  $('#tabs').innerHTML = C.services.map((s, i) => `<button class="tabb" role="tab" id="tab${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-i="${i}"><span class="n">${String(i + 1).padStart(2, '0')}</span><b>${esc(s.name)}</b></button>`).join('');
  // projects
  const PF = ['All', ...new Set(C.projects.map(p => p.service))];
  $('#pfilters').innerHTML = PF.map((f, i) => `<button class="fchip" aria-pressed="${i === 0}" data-f="${esc(f)}">${esc(f)}</button>`).join('');
  $('#projGrid').innerHTML = C.projects.map((p, i) => `<button class="card proj tilt" data-i="${i}" data-key="${esc(p.service)}" data-reveal>
    <div class="art"><canvas data-art="${p.art}" data-seed="${i + 3}"></canvas><span class="demo">Demo project</span><div class="res">${esc(p.result)}<small>${esc(p.resultLabel)}</small></div></div>
    <div class="body"><div class="cat">${esc(p.category)}</div><h3>${esc(p.title)}</h3><p>${esc(p.problem)}</p><span class="more">View case study</span></div></button>`).join('');
  // careers
  $('#values').innerHTML = C.values.map(v => `<div class="card tilt" data-reveal><h3>${esc(v[0])}</h3><p>${esc(v[1])}</p></div>`).join('');
  // insights
  $('#ifilters').innerHTML = `<button class="fchip" aria-pressed="true" data-f="All">All topics</button>` + C.categories.map(c => `<button class="fchip" aria-pressed="false" data-f="${esc(c[0])}">${esc(c[0])} (${c[1]})</button>`).join('');
  const fp = C.posts[0];
  $('#feat').innerHTML = `<div class="art"><canvas data-art="net" data-seed="21"></canvas></div><div class="body"><div class="meta2"><span class="c">Featured. ${esc(fp[1])}</span><span>${fp[2]} min read</span></div><h2>${esc(fp[0])}</h2><p class="muted">${esc(fp[3])}</p><div style="margin-top:22px"><button class="btn btn-light" data-post="0">Read article</button></div></div>`;
  $('#posts').innerHTML = C.posts.slice(1).map((p, i) => `<button class="card post tilt" data-post="${i + 1}" data-key="${esc(p[1])}" data-reveal><div class="meta2"><span class="c">${esc(p[1])}</span><span>${p[2]} min read</span></div><h3>${esc(p[0])}</h3><p>${esc(p[3])}</p><span class="more">Read article</span></button>`).join('');
  // contact
  $('#svcSelect').innerHTML = '<option value="">Choose a service</option>' + C.services.map(s => `<option>${esc(s.name)}</option>`).join('') + '<option>Not sure yet</option>';
  const ct = C.contact;
  $('#chan').innerHTML = `<div class="card" data-reveal><small>Email</small><b>${esc(ct.email)}</b><span>Best for detailed inquiries</span></div>
    <div class="card" data-reveal><small>Phone</small><b>${esc(ct.phone)}</b><span>Call us to discuss your project</span></div>
    <div class="card" data-reveal><small>Office</small><b>${esc(ct.address)}</b><span>By appointment only</span></div>`;
  $('#next').innerHTML = C.nextSteps.map(n => `<div class="card" data-reveal><h3>${esc(n[0])}</h3><p>${esc(n[1])}</p></div>`).join('');
  $('#faq').innerHTML = C.faq.map((f, i) => `<div class="qa"><button aria-expanded="false" aria-controls="ans${i}" id="q${i}">${esc(f[0])}<i aria-hidden="true"></i></button><div class="ans" id="ans${i}" role="region" aria-labelledby="q${i}"><p>${esc(f[1])}</p></div></div>`).join('');
  // footer panels
  const foot = `<div class="pin" style="max-width:1100px"><div class="wm">vastverse</div><div class="fcols">
    <div><h4>Get in touch</h4><p>${esc(ct.address)}<br>${esc(ct.phone)}<br>${esc(ct.email)}</p></div>
  </div><div class="fbase"><span>© ${new Date().getFullYear()} vastverse. All rights reserved.</span></div></div>`;
  $$('[data-footer]').forEach(f => f.innerHTML = foot);
  splitHeadings(); initArt(document, REDUCE);
}

/* services explorer */
function showSvc(i, animate = true) {
  currentSvc = i; const s = C.services[i], d = $('#detail');
  $$('.tabb').forEach((t, k) => { t.setAttribute('aria-selected', k === i); t.tabIndex = k === i ? 0 : -1; });
  d.setAttribute('aria-labelledby', 'tab' + i);
  d.innerHTML = `<span class="kicker">${esc(s.world)}</span><h2>${esc(s.name)}</h2><p>${esc(s.summary)}</p>
    <div class="capgrid">${s.capabilities.map(c => `<div>${esc(c)}</div>`).join('')}</div>
    <div class="stack">${s.tools.map(t => `<span class="chip">${esc(t)}</span>`).join('')}<em>A modern stack selected for your project needs.</em></div>
    <div style="margin-top:22px"><a class="btn btn-light" href="#contact" data-link data-pick="${esc(s.name)}">Discuss this service</a></div>`;
  if (animate && !REDUCE) gsap.from(d.children, { y: 20, opacity: 0, duration: .5, stagger: .04, ease: 'power3.out' });
}

/* ============================================================ forms + interactions */
function validate(form, rules) {
  let bad = null;
  rules.forEach(([n, test]) => { const f = form.elements[n], ok = test(f.value.trim()); f.setAttribute('aria-invalid', !ok); if (!ok && !bad) bad = f; });
  return bad;
}
const OFFLINE = `This preview isn't connected to the Vastverse server, so nothing was sent. Please email ${FALLBACK.contact.email}.`;
$('#cf').addEventListener('submit', async e => {
  e.preventDefault(); const f = e.target, msg = $('#cfMsg'), btn = f.querySelector('[type=submit]');
  const bad = validate(f, [['name', v => v.length > 1], ['email', v => /^\S+@\S+\.\S+$/.test(v)], ['service', v => v.length > 0], ['details', v => v.length >= 20]]);
  if (bad) { msg.className = 'fmsg show err'; msg.textContent = 'Fill in your name, a valid email, a service and at least 20 characters of project details, then send again.'; bad.focus(); return; }
  btn.disabled = true; btn.textContent = 'Sending…';
  const body = { name: f.elements.name.value.trim(), email: f.elements.email.value.trim(), company: f.elements.company.value.trim() || null, service: f.elements.service.value, details: f.elements.details.value.trim(), website: f.elements.website.value };
  try { const r = await api('/api/contact', { method: 'POST', body }); msg.className = 'fmsg show'; msg.textContent = r.message; f.reset(); }
  catch (err) { msg.className = 'fmsg show err'; msg.textContent = err.offline ? OFFLINE : err.message; }
  finally { btn.disabled = false; btn.textContent = 'Send message'; }
});
$('#newsForm').addEventListener('submit', async e => {
  e.preventDefault(); const f = e.target, m = $('#newsMsg');
  if (validate(f, [['email', v => /^\S+@\S+\.\S+$/.test(v)]])) { m.className = 'fmsg show err'; m.textContent = 'Enter a valid email address to subscribe.'; return; }
  try { const r = await api('/api/newsletter', { method: 'POST', body: { email: f.elements.email.value.trim() } }); m.className = 'fmsg show'; m.textContent = r.message; f.reset(); }
  catch (err) { m.className = 'fmsg show err'; m.textContent = err.offline ? OFFLINE : err.message; }
});

document.addEventListener('click', e => {
  const tab = e.target.closest('.tabb'); if (tab) { showSvc(+tab.dataset.i); return; }
  const fc = e.target.closest('.fchip');
  if (fc) {
    const group = fc.parentElement, items = $$(group.id === 'pfilters' ? '#projGrid > *' : '#posts > *');
    $$('.fchip', group).forEach(b => b.setAttribute('aria-pressed', b === fc));
    const show = items.filter(it => fc.dataset.f === 'All' || it.dataset.key === fc.dataset.f);
    items.forEach(it => it.classList.toggle('hidden', !show.includes(it)));
    if (!REDUCE) {
      show.forEach(el => el.classList.add('revealing'));
      gsap.fromTo(show, { y: 40, opacity: 0, rotateX: -8 }, { y: 0, opacity: 1, rotateX: 0, duration: .6, stagger: .05, ease: 'power3.out', force3D: true,
        onComplete: () => { show.forEach(el => el.classList.remove('revealing')); gsap.set(show, { clearProps: 'transform,opacity' }); } });
    }
    if (group.id === 'ifilters' && fc.dataset.f !== 'All' && HMODE) setTimeout(() => journey.jumpTo(journey.panels.findIndex(p => p.dataset.name === 'Articles')), 250);
    setTimeout(() => ScrollTrigger.refresh(), 50); return;
  }
  const pj = e.target.closest('.proj');
  if (pj) { const p = C.projects[+pj.dataset.i];
    openModal(`<span class="kicker">Demo project. ${esc(p.category)}</span><h3 id="mTitle">${esc(p.title)}</h3>
      <div class="grid3"><div><b>Challenge</b><p>${esc(p.problem)}</p></div><div><b>Solution</b><p>${esc(p.solution)}</p></div><div><b>Result</b><p>${esc(p.outcome)}</p></div></div>
      <div class="stack" style="margin-bottom:24px">${p.tech.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>
      <a class="btn btn-light" href="#contact" data-link data-pick="${esc(p.service)}">Start a similar project</a>`, gsap, REDUCE); return; }
  const po = e.target.closest('[data-post]');
  if (po) { const p = C.posts[+po.dataset.post];
    openModal(`<span class="kicker">${esc(p[1])}. ${p[2]} min read</span><h3 id="mTitle">${esc(p[0])}</h3><p class="muted" style="font-size:1.05rem;margin-bottom:20px">${esc(p[3])}</p>
      <p class="note" style="margin:0 0 22px">The full article is being prepared. Subscribe to the monthly digest to get it as soon as it's published.</p>`, gsap, REDUCE); return; }
  const qa = e.target.closest('.qa button');
  if (qa) { const open = qa.getAttribute('aria-expanded') !== 'true', a = qa.nextElementSibling; qa.setAttribute('aria-expanded', open); a.style.height = open ? a.scrollHeight + 'px' : '0px'; }
});
$('#tabs').addEventListener('keydown', e => {
  if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  e.preventDefault(); e.stopPropagation(); const d = (e.key === 'ArrowDown' || e.key === 'ArrowRight') ? 1 : -1, n = (currentSvc + d + C.services.length) % C.services.length;
  $('#tab' + n).focus(); showSvc(n);
});

/* nav + compact drawer */
const nav = $('#nav'), burger = $('#burger'), drawer = $('#drawer'), bd = $('#drawerBd');
addEventListener('scroll', () => nav.classList.toggle('solid', scrollY > 40), { passive: true });
function setDrawer(o) { drawer.classList.toggle('open', o); bd.classList.toggle('open', o); burger.setAttribute('aria-expanded', o); burger.setAttribute('aria-label', o ? 'Close menu' : 'Open menu'); if (o) drawer.querySelector('a').focus(); }
burger.addEventListener('click', () => setDrawer(!drawer.classList.contains('open')));
bd.addEventListener('click', () => setDrawer(false));
addEventListener('keydown', e => { if (e.key === 'Escape') setDrawer(false); });

/* ============================================================ universe + film */
const universe = createVerse($('#universe'), { reduce: REDUCE });
const film = createFilm({ reduce: REDUCE, gsap, $ });
const warp = createWarp($('#warp'), { reduce: REDUCE });
film.loadAll();

/* ============================================================ journey: horizontal (desktop) or vertical (mobile) */
function buildJourney(page, r) {
  const wrap = $('.hwrap', page), panels = $$('.panel', page);
  const J = { panels, st: null };
  const routeIdx = ROUTES.indexOf(r);
  let z = 0;
  panels.forEach(p => {                       // zigzag: content left, planet right, then swap
    if (p.hasAttribute('data-footer')) return;
    p.classList.toggle('zz-r', z % 2 === 1);
    p.dataset.side = z % 2 === 1 ? -1 : 1;
    p.dataset.shape = PLANET_ORDER[(routeIdx * 3 + z) % PLANET_ORDER.length];
    // every section is a world: a coordinate tag names the planet beside it (nebula + flying stars live in verse.js)
    const shape = SHAPES[p.dataset.shape], total = panels.filter(x => !x.hasAttribute('data-footer')).length;
    const k = p.querySelector('.kicker');
    if (k && shape && !k.closest('.film')) {
      let tag = p.querySelector('.world-tag');
      if (!tag) { tag = document.createElement('div'); tag.className = 'world-tag'; tag.setAttribute('aria-hidden', 'true'); k.before(tag); }
      tag.innerHTML = `<i></i>World <b>${String(z + 1).padStart(2, '0')}</b> / ${String(total).padStart(2, '0')} &middot; ${esc(shape.label)}`;
    }
    z++;
  });
  J.st = ScrollTrigger.create({ trigger: wrap, start: 'top bottom', end: 'bottom top', onUpdate: () => active() });
  function measure() {
    const list = panels.map(p => { const b = p.getBoundingClientRect(); return { shape: p.dataset.shape || null, side: +(p.dataset.side || 0), top: b.top + scrollY, height: Math.max(1, p.offsetHeight) }; });
    universe && universe.setSections(list);
    J.list = list; buildMap(); active();
  }
  function active() {
    if (!J.list) return; const c = scrollY + innerHeight * .5; let best = 0;
    J.list.forEach((s, i) => { if (c >= s.top) best = i; });
    $$('#jdots button').forEach((b, i) => b.classList.toggle('on', i === best));
    $('#jlbl').textContent = panels[best] ? panels[best].dataset.name : '';
  }
  function buildMap() {
    $('#jdots').innerHTML = panels.map(p => `<button aria-label="Go to ${esc(p.dataset.name)}"><span>${esc(p.dataset.name)}</span></button>`).join('');
    $$('#jdots button').forEach((b, i) => b.addEventListener('click', () => J.jumpTo(i)));
  }
  J.jumpTo = i => { if (i < 0 || !J.list) return; scrollTo({ top: Math.round(J.list[i].top + J.list[i].height * .3 - innerHeight * .5 + 1), behavior: REDUCE ? 'auto' : 'smooth' }); };
  J.measure = measure;
  ScrollTrigger.addEventListener('refresh', measure);
  let mt; const ro = new ResizeObserver(() => { clearTimeout(mt); mt = setTimeout(measure, 120); }); ro.observe(wrap); ro.observe(document.body);
  document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
  J.kill = () => { ScrollTrigger.removeEventListener('refresh', measure); ro.disconnect(); };
  return J;
}

/* zigzag entrance: content in a left panel slides in from the left, right panel from the right */
const sideOf = el => { const p = el.closest('.panel'); return p && p.classList.contains('zz-r') ? 1 : -1; };
const SLIDE = () => Math.min(120, innerWidth * .08);

function animatePage(page, J) {
  const first = $('.panel', page);
  // background zoom: as a section scrolls through, its backdrop zooms in toward the content and fades in/out
  $$('.world-tag', page).forEach(t => {
    const now = first.contains(t) && page.dataset.page !== 'home';
    gsap.from(t, { opacity: 0, letterSpacing: '.5em', duration: 1.1, ease: 'power3.out', delay: now ? .2 : 0, scrollTrigger: now ? undefined : trig(t, J), clearProps: 'opacity,letterSpacing' });
  });
  $$('.split', page).forEach(h => {
    const inFirst = first.contains(h) && !h.closest('.film');
    const words = $$('.w > span', h);
    if (h.closest('.h-intro')) { gsap.from(words, { yPercent: 110, rotate: 4, duration: 1, ease: 'power4.out', stagger: .05, delay: .3 }); return; }
    const now = inFirst && page.dataset.page !== 'home', delay = now ? .35 : 0, scrollTrigger = now ? undefined : trig(h, J);
    gsap.from(words, { yPercent: 108, rotate: 3, scale: 1.04, opacity: 0, duration: .9, ease: 'expo.out', stagger: .06, delay, scrollTrigger });
    if (!h.closest('.film')) gsap.from(h, { x: sideOf(h) * SLIDE(), duration: 1.1, ease: 'power3.out', delay, scrollTrigger, clearProps: 'transform' });
  });
  $$('.kicker', page).forEach(k => {
    if (k.closest('.film, .h-intro, [data-reveal]')) return;
    const now = first.contains(k) && page.dataset.page !== 'home';
    gsap.from(k, { x: sideOf(k) * SLIDE() * .6, opacity: 0, duration: .9, ease: 'power3.out', delay: now ? .3 : 0, scrollTrigger: now ? undefined : trig(k, J), clearProps: 'transform,opacity' });
  });
  $$('[data-reveal]', page).forEach((el, i) => {
    const inFirst = first.contains(el) && page.dataset.page !== 'home';
    gsap.from(el, { x: sideOf(el) * SLIDE(), y: 20, opacity: 0, rotateY: sideOf(el) * -8, scale: .97, transformPerspective: 900, duration: 1, ease: 'power3.out', force3D: true,
      delay: inFirst ? .4 + (i % 4) * .07 : (i % 4) * .06, scrollTrigger: inFirst ? undefined : trig(el, J),
      ...revealHooks(el) });
  });
  $$('[data-count]', page).forEach(c => {
    const o = { v: 0 }, to = +c.dataset.count, dec = +c.dataset.dec || 0;
    gsap.to(o, { v: to, duration: 2, ease: 'power2.out', scrollTrigger: trig(c, J), onUpdate: () => c.textContent = o.v.toFixed(dec) + (c.dataset.suf || '') });
  });
}
const trig = el => ({ trigger: el, start: 'top 88%' });
/* while GSAP drives a card's transform, switch off its CSS transform transition (the tilt hover one),
   otherwise every GSAP frame gets re-eased by CSS and the reveal looks laggy; hand transform back when done */
function revealHooks(el) {
  return {
    onStart: () => el.classList.add('revealing'),
    onComplete: () => { el.classList.remove('revealing'); gsap.set(el, { clearProps: 'transform,opacity' }); },
    onReverseComplete: () => el.classList.remove('revealing'),
  };
}

function setupPage(r) {
  if (ctx) ctx.revert();
  if (journey && journey.kill) journey.kill();
  const page = $(`.page[data-page="${r}"]`);
  ctx = gsap.context(() => {
    gsap.to('#prog', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: true } });
    if (r === 'home') {
      universe && universe.setVisible(REDUCE ? 1 : 0);
      $('#jmap').classList.add('hide');
      let wasDone = false;
      film.timeline(ScrollTrigger, { onDone: done => {
        if (done && !wasDone && universe) universe.burst();   // particles burst out of the flash into the universe
        wasDone = done;
        universe && universe.setVisible(done ? 1 : 0); $('#jmap').classList.toggle('hide', !done);
      } });
    } else { universe && universe.setVisible(1); $('#jmap').classList.remove('hide'); }
    journey = buildJourney(page, r);
    if (REDUCE) $$('[data-count]', page).forEach(c => c.textContent = c.dataset.count + (c.dataset.suf || ''));
    else animatePage(page, journey);
  });
  ScrollTrigger.refresh();
  journey.measure();
}

/* ============================================================ router */
function go(r, after) {
  if (!ROUTES.includes(r)) r = 'home';
  setDrawer(false);
  if (r === route) { applyPending(); scrollTo({ top: 0, behavior: REDUCE ? 'auto' : 'smooth' }); after && after(); return; }
  if (location.hash.slice(1) !== r) history.pushState(null, '', '#' + r);
  if (route === null || REDUCE) { render(r); after && after(); return; }
  $('#app').classList.add('leaving');
  if (universe) { universe.setVisible(1); universe.burst(); }
  warp.jump(1100);   // hyperspace jump to the next world
  setTimeout(() => { render(r); $('#app').classList.remove('leaving'); after && after(); }, 520);
}
function applyPending() {
  if (route === 'services' && pendingSvc !== null) { showSvc(pendingSvc); pendingSvc = null; }
}
function render(r) {
  route = r;
  $$('.page').forEach(p => p.classList.toggle('active', p.dataset.page === r));
  $$('.menu .lk, .drawer a[data-r]').forEach(l => l.classList.toggle('on', l.dataset.r === r));
  document.title = TITLES[r];
  scrollTo(0, 0);
  if (r === 'services') { showSvc(pendingSvc ?? currentSvc, false); pendingSvc = null; }
  applyPending();
  setupPage(r);
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-link]'); if (!a) return;
  const h = a.getAttribute('href').slice(1); if (!ROUTES.includes(h)) return;
  e.preventDefault();
  if (a.dataset.svc !== undefined) pendingSvc = +a.dataset.svc;
  if (a.dataset.pick) { const s = $('#svcSelect'); setTimeout(() => { s.value = a.dataset.pick; }, 500); }
  go(h);
});
addEventListener('popstate', () => { const h = location.hash.slice(1); if (ROUTES.includes(h) && h !== route) go(h); });
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => journey && journey.measure(), 250); });

/* ============================================================ boot */
initCursor(); initTilt(REDUCE); initModal(); initChat();
(async () => {
  try { const live = await api('/api/content', { timeout: 1500 }); if (live && live.services) C = live; } catch { /* static preview: bundled content */ }
  renderContent();
  const start = ROUTES.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home';
  if (!ROUTES.includes(location.hash.slice(1))) history.replaceState(null, '', '#home');
  go(start);
  const loader = $('#introLoader');
  const elapsed = performance.now() - window.__vvLoaderStartedAt;
  const finish = () => {
    loader.classList.add('is-done');
    document.body.classList.remove('is-loading');
    setTimeout(() => { window.__vvIntro && window.__vvIntro.stop(); loader.remove(); }, 800);
  };
  setTimeout(() => {
    // the loader completes its bar, explodes the planet past the camera, then calls finish
    if (window.__vvIntro) window.__vvIntro.done(finish); else finish();
  }, Math.max(0, INTRO_LOADER_DURATION - elapsed));
})();
