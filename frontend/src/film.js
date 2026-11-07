/* Scroll-scrubbed hand-touch film with the "synapse" overlay (circuit traces, energy rings, lens flare). */
const FRAMES = 95;
const INT = [0,0,.01,.01,.02,.02,.03,.03,.03,.04,.04,.05,.05,.07,.11,.15,.21,.25,.3,.34,.37,.38,.39,.39,.39,.39,.39,.39,.4,.4,.41,.42,.43,.43,.43,.44,.45,.47,.48,.49,.5,.51,.53,.54,.56,.57,.59,.61,.63,.65,.66,.68,.7,.72,.73,.74,.76,.78,.81,.83,.85,.86,.88,.9,.92,.94,.95,.96,.98,.98,.98,.99,.99,.99,1,1,1,1,1,1,1,.99,.96,.95,.92,.9,.87,.85,.82,.8,.77,.75,.72,.7,.66];

export function createFilm({ reduce, gsap, $ }) {
  const host = $('#film'), cv = $('#filmCv'), ctx = cv.getContext('2d'), sc = $('#syn'), sx = sc.getContext('2d');
  const imgs = new Array(FRAMES); let loaded = 0, ready = false;
  const st = { f: reduce ? 40 : 0, zoom: 1, alpha: 1, active: true };
  const m = { x: -9999, y: -9999, in: false, px: 0, py: 0 };
  let contact = { x: 0, y: 0 }, W = 0, H = 0, dpr = 1, scaleNow = 1, onScreen = true;

  function loadAll() {
    const order = [0, 94, 47, 20, 70]; for (let i = 0; i < FRAMES; i++) if (!order.includes(i)) order.push(i);
    order.forEach(i => {
      const im = new Image(); im.decoding = 'async';
      im.onload = () => { imgs[i] = im; loaded++; $('#loadBar').style.setProperty('--p', loaded / FRAMES);
        if (loaded >= FRAMES * .35 && !ready) { ready = true; $('#loader').style.opacity = 0; setTimeout(() => $('#fhint').classList.add('show'), 600); setTimeout(() => $('#fhint').classList.remove('show'), 6500); } };
      im.onerror = () => { loaded++; };
      im.src = (window.__FRAMES && window.__FRAMES[i]) || './frames/f' + String(i + 1).padStart(3, '0') + '.webp';
    });
  }
  const nearest = i => { for (let d = 0; d < FRAMES; d++) { if (imgs[i - d]) return imgs[i - d]; if (imgs[i + d]) return imgs[i + d]; } return null; };
  function size() { dpr = Math.min(devicePixelRatio, 2); W = cv.clientWidth; H = cv.clientHeight; [cv, sc].forEach(c => { c.width = W * dpr; c.height = H * dpr; }); draw(); }
  function layout() {
    const portrait = W / H < 1.05, iw = 1280, ih = 720, fi = st.f / (FRAMES - 1), cxN = .482 + .02 * fi, cyN = .47;
    let s = portrait ? (W * 2.15) / iw : Math.max(W / iw, H / ih) * 1.06; s *= st.zoom;
    const fx = W * .5, fy = portrait ? H * .29 : H * .5, par = reduce ? 0 : 1;
    const ox = fx - cxN * iw * s - m.px * 14 * par, oy = fy - cyN * ih * s - m.py * 10 * par;
    contact = { x: ox + cxN * iw * s, y: oy + cyN * ih * s };
    return { s, ox, oy, portrait, iw, ih };
  }
  function draw() {
    if (!W) return;
    const L = layout(), im = nearest(Math.round(st.f)); scaleNow = L.s;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (im) {
      ctx.globalAlpha = st.alpha; ctx.drawImage(im, L.ox, L.oy, L.iw * L.s, L.ih * L.s);
      if (L.portrait) { const top = L.oy, bot = L.oy + L.ih * L.s, g1 = ctx.createLinearGradient(0, top, 0, top + 80), g2 = ctx.createLinearGradient(0, bot - 120, 0, bot);
        g1.addColorStop(0, '#000'); g1.addColorStop(1, 'rgba(0,0,0,0)'); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, '#000');
        ctx.globalAlpha = 1; ctx.fillStyle = g1; ctx.fillRect(0, top, W, 80); ctx.fillStyle = g2; ctx.fillRect(0, bot - 120, W, 120); }
    }
    const I = INT[Math.round(st.f)] || 0, near = m.in ? Math.max(0, 1 - Math.hypot(m.x - contact.x, m.y - contact.y) / 300) : 0;
    $('#glow').style.transform = `translate(${contact.x}px,${contact.y}px) scale(${.4 + I * .9 + near * .3})`;
    $('#glow').style.opacity = st.alpha * Math.min(1, I * .8 + near * .5);
    $('#flash').style.setProperty('--fx', contact.x + 'px'); $('#flash').style.setProperty('--fy', contact.y + 'px');
  }

  /* synapse overlay */
  const spr = document.createElement('canvas'); spr.width = spr.height = 32;
  { const g = spr.getContext('2d'), r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.3, 'rgba(190,225,255,.7)'); r.addColorStop(1, 'rgba(91,168,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 32, 32); }
  let ts = 9; const tr = () => (ts = (ts * 16807) % 2147483647, (ts - 1) / 2147483646);
  const DIRS = [0, Math.PI / 4, -Math.PI / 4, Math.PI, Math.PI * 3 / 4, -Math.PI * 3 / 4, Math.PI / 2, -Math.PI / 2];
  const TRACES = Array.from({ length: innerWidth < 700 ? 18 : 30 }, (_, k) => {
    let a = DIRS[k % 8 < 6 ? k % 6 : 6 + (k % 2)] + (tr() - .5) * .2, x = (tr() - .5) * 6, y = (tr() - .5) * 6;
    const pts = [[x, y]], segs = 3 + Math.floor(tr() * 6); let len = 0;
    for (let i = 0; i < segs; i++) { if (i && tr() < .5) a += (tr() < .5 ? 1 : -1) * Math.PI / 4; const l = 16 + tr() * 40; x += Math.cos(a) * l; y += Math.sin(a) * l * .8; len += l; pts.push([x, y]); }
    return { pts, len, delay: tr() * .45, speed: .004 + tr() * .006, ph: tr(), boost: 0 };
  });
  const RINGS = []; let ringClock = 0;
  const ring = power => RINGS.push({ life: 0, max: 80 + power * 40, power });
  function pointAt(t, dist) { let acc = 0; for (let i = 1; i < t.pts.length; i++) { const a = t.pts[i - 1], b = t.pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc + l >= dist) { const f = (dist - acc) / l; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]; } acc += l; } return t.pts[t.pts.length - 1]; }
  function synapse() {
    sx.setTransform(dpr, 0, 0, dpr, 0, 0); sx.clearRect(0, 0, W, H);
    if (st.alpha < .02) return;
    const I = INT[Math.round(st.f)] || 0, near = m.in ? Math.max(0, 1 - Math.hypot(m.x - contact.x, m.y - contact.y) / 280) : 0;
    const k = scaleNow * 1.15, cx = contact.x, cy = contact.y, T = performance.now();
    sx.globalCompositeOperation = 'lighter'; sx.lineCap = 'round'; sx.lineJoin = 'round';
    const fl = Math.min(1, I * 1.2 + near * .4) * st.alpha;
    if (fl > .02) {
      const wl = W * (.25 + .55 * fl), g = sx.createLinearGradient(cx - wl, 0, cx + wl, 0);
      g.addColorStop(0, 'rgba(91,168,255,0)'); g.addColorStop(.5, `rgba(220,238,255,${.75 * fl})`); g.addColorStop(1, 'rgba(91,168,255,0)');
      sx.fillStyle = g; sx.fillRect(cx - wl, cy - 1, wl * 2, 2); sx.globalAlpha = .25 * fl; sx.fillRect(cx - wl * .7, cy - 7, wl * 1.4, 14); sx.globalAlpha = 1;
    }
    if (!reduce && I > .12) { ringClock += 1 + I + near; if (ringClock > 70 - I * 35) { ringClock = 0; ring(I); } }
    for (let i = RINGS.length - 1; i >= 0; i--) {
      const r = RINGS[i]; r.life++; if (r.life > r.max) { RINGS.splice(i, 1); continue; }
      const t = r.life / r.max, e = 1 - Math.pow(1 - t, 3), R = e * (140 + r.power * 220) * k;
      sx.strokeStyle = `rgba(170,215,255,${Math.pow(1 - t, 1.6) * .7 * st.alpha})`; sx.lineWidth = 1.2 + (1 - t) * 1.5;
      sx.beginPath(); sx.ellipse(cx, cy, R, R * .32, -.12, 0, Math.PI * 2); sx.stroke();
      sx.strokeStyle = `rgba(170,215,255,${Math.pow(1 - t, 2) * .18 * st.alpha})`; sx.lineWidth = 1; sx.beginPath(); sx.arc(cx, cy, R * .75, 0, Math.PI * 2); sx.stroke();
    }
    TRACES.forEach(t => {
      t.boost *= .97;
      const grow = reduce ? 1 : Math.max(0, Math.min(1, (I * 1.5 + near * .35 + t.boost - t.delay) / .55));
      if (grow <= 0) return;
      const drawn = t.len * grow, a = st.alpha * (.35 + .65 * Math.min(1, I + near + t.boost));
      sx.beginPath(); let acc = 0; sx.moveTo(cx + t.pts[0][0] * k, cy + t.pts[0][1] * k);
      for (let i = 1; i < t.pts.length; i++) { const p0 = t.pts[i - 1], p1 = t.pts[i], l = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
        if (acc + l >= drawn) { const f = (drawn - acc) / l; sx.lineTo(cx + (p0[0] + (p1[0] - p0[0]) * f) * k, cy + (p0[1] + (p1[1] - p0[1]) * f) * k); break; }
        sx.lineTo(cx + p1[0] * k, cy + p1[1] * k); acc += l; }
      sx.strokeStyle = `rgba(91,168,255,${.22 * a})`; sx.lineWidth = 4; sx.stroke();
      sx.strokeStyle = `rgba(200,230,255,${.7 * a})`; sx.lineWidth = 1.1; sx.stroke();
      if (grow >= 1) { const e = t.pts[t.pts.length - 1]; sx.strokeStyle = `rgba(220,240,255,${.8 * a})`; sx.lineWidth = 1.2; sx.beginPath(); sx.arc(cx + e[0] * k, cy + e[1] * k, 2.6, 0, Math.PI * 2); sx.stroke(); }
      for (let n = 0; n < 1 + (I > .6 ? 1 : 0); n++) {
        const ph = reduce ? .5 : ((T * t.speed * .06 + t.ph + n * .5) % 1), p = pointAt(t, ph * drawn), s = (5 + 6 * (t.boost + near)) * (1 - ph * .6);
        sx.globalAlpha = a * (1 - ph * .5); sx.drawImage(spr, cx + p[0] * k - s, cy + p[1] * k - s, s * 2, s * 2); sx.globalAlpha = 1;
      }
    });
    const rr = 40 * k * (.5 + I), cg = sx.createRadialGradient(cx, cy, 0, cx, cy, rr); cg.addColorStop(0, `rgba(255,255,255,${.9 * fl})`); cg.addColorStop(1, 'rgba(159,208,255,0)');
    sx.fillStyle = cg; sx.beginPath(); sx.arc(cx, cy, rr, 0, Math.PI * 2); sx.fill(); sx.globalCompositeOperation = 'source-over';
  }

  new IntersectionObserver(es => es.forEach(en => { onScreen = en.isIntersecting; })).observe(host);
  (function loop() {
    if (st.active && onScreen) { m.px += ((m.in ? (m.x / W * 2 - 1) : 0) - m.px) * .05; m.py += ((m.in ? (m.y / H * 2 - 1) : 0) - m.py) * .05; draw(); synapse(); }
    requestAnimationFrame(loop);
  })();
  host.addEventListener('pointermove', e => { const r = host.getBoundingClientRect(); m.x = e.clientX - r.left; m.y = e.clientY - r.top; m.in = true; });
  host.addEventListener('pointerleave', () => { m.in = false; });
  host.addEventListener('pointerdown', e => { if (e.target.closest('a,button')) return; ring(1.2); ring(.6); TRACES.forEach(t => t.boost = 1); gsap.fromTo('#glow', { opacity: 1 }, { opacity: .4, duration: .8 }); });
  addEventListener('resize', size);
  if (!matchMedia('(pointer:fine)').matches) $('#fhint').textContent = 'Tap near the light to send a pulse.';

  /* timeline over the pinned hero */
  function timeline(ScrollTrigger, { onDone }) {
    st.f = reduce ? 40 : 0; st.zoom = 1; st.alpha = 1;
    if (reduce) { size(); return null; }
    gsap.set(['#hLeft', '#hRight', '#hMeet'], { opacity: 0 }); gsap.set('#flash', { opacity: 0 }); gsap.set('#hIntro', { opacity: 1, y: 0 });
    const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: host, start: 'top top', end: '+=360%', pin: true, scrub: .6,
      onUpdate: s => onDone(s.progress > .9) } });
    tl.to(st, { f: 15, duration: .3 }, 0).to(st, { f: 94, duration: .55 }, .3)
      .to('#hIntro', { opacity: 0, y: -60, duration: .12 }, .03).to('#cue', { opacity: 0, duration: .05 }, 0)
      .fromTo('#hLeft', { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: .07 }, .12)
      .fromTo('#hRight', { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: .07 }, .17)
      .to(['#hLeft', '#hRight'], { opacity: 0, y: -30, duration: .06 }, .36)
      .fromTo('#hMeet', { opacity: 0, scale: .92 }, { opacity: 1, scale: 1, duration: .08 }, .47)
      .to('#hMeet', { opacity: 0, scale: 1.08, duration: .06 }, .72)
      .to(st, { zoom: 2.6, duration: .17 }, .8).to('#flash', { opacity: 1, duration: .09 }, .84)
      .to(st, { alpha: 0, duration: .01 }, .93).to('#flash', { opacity: 0, duration: .07 }, .93);
    size();
    return tl;
  }
  return { st, loadAll, size, timeline };
}
