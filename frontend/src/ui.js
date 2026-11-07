/* Cursor, tilt cards, mini canvas art, modal, split headings. */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function initCursor() {
  const cur = $('#cur'); let cx = -100, cy = -100, tx = -100, ty = -100, rot = 0;
  if (!matchMedia('(pointer:fine)').matches) return;
  document.documentElement.classList.add('hand-cursor');
  addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; cur.classList.remove('away'); }, { passive: true });
  document.addEventListener('pointerleave', () => cur.classList.add('away'));
  document.addEventListener('pointerover', e => {
    const target = e.target instanceof Element ? e.target : null;
    cur.classList.toggle('hover', !!target?.closest('a,button,.tilt,select,label,.film'));
  });
  addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') cur.classList.add('press');
  });
  addEventListener('pointerup', () => cur.classList.remove('press'));
  (function loop() {
    const vx = tx - cx; cx += vx * .35; cy += (ty - cy) * .35; rot += (Math.max(-18, Math.min(18, vx * .6)) - rot) * .15;
    cur.style.transform = `translate(${cx - 14}px,${cy - 2}px) rotate(${rot}deg)`; requestAnimationFrame(loop);
  })();
}
export function setPlanetCursor(on) { $('#cur').classList.toggle('hover', on); }

export function initTilt(reduce) {
  if (reduce || !matchMedia('(pointer:fine)').matches) return;
  document.addEventListener('pointermove', e => {
    const el = e.target.closest('.tilt'); if (!el) return;
    const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    el.style.transform = `perspective(1000px) rotateX(${(.5 - py) * 8}deg) rotateY(${(px - .5) * 10}deg) translateZ(6px)`;
    el.style.setProperty('--mx', px * 100 + '%'); el.style.setProperty('--my', py * 100 + '%');
  });
  document.addEventListener('pointerout', e => { const el = e.target.closest('.tilt'); if (el && !el.contains(e.relatedTarget)) el.style.transform = ''; });
}

export function splitHeadings(root = document) {
  $$('.split', root).forEach(el => {
    if (el.dataset.split) return; el.dataset.split = 1;
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.append(part);
          else { const w = document.createElement('span'); w.className = 'w'; const i = document.createElement('span'); i.textContent = part; w.append(i); frag.append(w); }
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(el);
  });
}

/* ---------- modal ---------- */
let lastFocus = null;
export function openModal(html, gsap, reduce) {
  lastFocus = document.activeElement;
  $('#mBody').innerHTML = html; $('#modal').classList.add('open'); document.body.style.overflow = 'hidden';
  if (!reduce) gsap.fromTo('#sheet', { y: 60, opacity: 0, rotateX: -10, transformPerspective: 1000 }, { y: 0, opacity: 1, rotateX: 0, duration: .6, ease: 'power3.out' });
  $('#mClose').focus();
}
export function closeModal() { $('#modal').classList.remove('open'); document.body.style.overflow = ''; lastFocus && lastFocus.focus(); }
export function initModal() {
  $('#mClose').addEventListener('click', closeModal);
  $('#modal').addEventListener('click', e => { if (e.target.id === 'modal' || e.target.closest('[data-link]')) closeModal(); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && $('#modal').classList.contains('open')) closeModal(); });
}

/* ---------- mini canvas art ---------- */
const arts = [];
export function initArt(root, reduce) {
  $$('canvas[data-art]', root).forEach(cv => {
    if (cv._a) return; cv._a = 1;
    let seed = +(cv.dataset.seed || 7); const rnd = () => (seed = (seed * 16807) % 2147483647, (seed - 1) / 2147483646);
    const o = { cv, ctx: cv.getContext('2d'), kind: cv.dataset.art, pts: Array.from({ length: 46 }, () => ({ x: rnd(), y: rnd(), v: rnd() })), vis: false, hov: 0, hovT: 0 };
    cv.parentElement.addEventListener('pointerenter', () => o.hovT = 1); cv.parentElement.addEventListener('pointerleave', () => o.hovT = 0);
    new IntersectionObserver(es => es.forEach(en => o.vis = en.isIntersecting)).observe(cv);
    arts.push(o);
  });
  if (!initArt.loop) { initArt.loop = true; (function loop(t) { arts.forEach(o => o.vis && drawArt(o, reduce ? 4000 : t)); requestAnimationFrame(loop); })(0); }
}
function drawArt(o, t) {
  const { cv, ctx, kind, pts } = o, dpr = Math.min(devicePixelRatio, 2), w = cv.clientWidth, h = cv.clientHeight;
  if (!w) return; if (cv.width !== Math.round(w * dpr)) { cv.width = w * dpr; cv.height = h * dpr; }
  o.hov += (o.hovT - o.hov) * .08; const sp = 1 + o.hov * 2.5, T = t * .0004 * sp;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w * .7, h * .3, 0, w * .7, h * .3, w * .8); g.addColorStop(0, `rgba(91,168,255,${.18 + o.hov * .15})`); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); ctx.lineWidth = 1;
  if (kind === 'net') {
    const P = pts.map(p => [w * (.15 + .7 * p.x + .03 * Math.sin(T * 3 + p.v * 9)), h * (.12 + .76 * p.y + .04 * Math.cos(T * 2 + p.v * 7))]);
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) { const d = Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]); if (d < w * .16) { ctx.strokeStyle = `rgba(159,208,255,${.35 * (1 - d / (w * .16))})`; ctx.beginPath(); ctx.moveTo(...P[i]); ctx.lineTo(...P[j]); ctx.stroke(); } }
    P.forEach((p, i) => { ctx.fillStyle = i % 7 === 0 ? '#fff' : 'rgba(159,208,255,.8)'; ctx.beginPath(); ctx.arc(p[0], p[1], i % 7 === 0 ? 2.4 : 1.4, 0, 7); ctx.fill(); });
  } else if (kind === 'grid') {
    const n = 9, hz = h * .42;
    for (let i = 0; i <= n * 2; i++) { ctx.strokeStyle = 'rgba(159,208,255,.22)'; ctx.beginPath(); ctx.moveTo(w / 2 + (i - n) * w * .02, hz); ctx.lineTo(w / 2 + (i - n) * w * .12, h); ctx.stroke(); }
    for (let k = 0; k < 10; k++) { const f = (k / 10 + T * .5) % 1, y = hz + (h - hz) * f * f; ctx.strokeStyle = `rgba(159,208,255,${.08 + .3 * f})`; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(w / 2, hz - 6, 3 + o.hov * 3, 0, 7); ctx.fill();
  } else if (kind === 'orbit') {
    const cx = w * .62, cy = h * .5;
    for (let r = 1; r <= 4; r++) { ctx.strokeStyle = `rgba(159,208,255,${.12 + .05 * r})`; ctx.beginPath(); ctx.ellipse(cx, cy, r * w * .08, r * w * .03, -.35, 0, 7); ctx.stroke();
      const a = T * (5 - r) * 1.5 + r, ex = r * w * .08 * Math.cos(a), ey = r * w * .03 * Math.sin(a); ctx.fillStyle = r === 2 ? '#fff' : '#9FD0FF'; ctx.beginPath();
      ctx.arc(cx + ex * Math.cos(-.35) - ey * Math.sin(-.35), cy + ex * Math.sin(-.35) + ey * Math.cos(-.35), 2.6, 0, 7); ctx.fill(); }
    const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * .08); cg.addColorStop(0, 'rgba(255,255,255,.95)'); cg.addColorStop(1, 'rgba(91,168,255,0)'); ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, w * .08, 0, 7); ctx.fill();
  } else if (kind === 'flow' || kind === 'wave') {
    for (let k = 0; k < 14; k++) { ctx.strokeStyle = `rgba(159,208,255,${.08 + k * .025})`; ctx.beginPath();
      for (let x = 0; x <= w; x += 6) { const y = h * .5 + Math.sin(x * .012 + T * 4 + k * .35) * h * (.08 + k * .012) + (k - 7) * h * .02; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
    if (kind === 'flow') for (let i = 0; i < 5; i++) { const x = ((T * .6 + i / 5) % 1) * w, y = h * .5 + Math.sin(x * .012 + T * 4 + 2.4) * h * .15; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 7); ctx.fill(); }
  } else if (kind === 'stack') {
    for (let i = 0; i < 5; i++) { const y = h * (.72 - i * .11) + Math.sin(T * 3 + i) * 4 * sp, x = w * .58; ctx.strokeStyle = `rgba(159,208,255,${.25 + i * .12})`; ctx.fillStyle = `rgba(91,168,255,${.04 + i * .03})`;
      ctx.beginPath(); ctx.moveTo(x, y - h * .06); ctx.lineTo(x + w * .2, y); ctx.lineTo(x, y + h * .06); ctx.lineTo(x - w * .2, y); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  }
}
