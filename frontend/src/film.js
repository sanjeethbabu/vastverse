/* Scroll-scrubbed hand-touch film with the "synapse" overlay (circuit traces, energy rings, lens flare). */
const FRAMES = 95;
const INT = [0,0,.01,.01,.02,.02,.03,.03,.03,.04,.04,.05,.05,.07,.11,.15,.21,.25,.3,.34,.37,.38,.39,.39,.39,.39,.39,.39,.4,.4,.41,.42,.43,.43,.43,.44,.45,.47,.48,.49,.5,.51,.53,.54,.56,.57,.59,.61,.63,.65,.66,.68,.7,.72,.73,.74,.76,.78,.81,.83,.85,.86,.88,.9,.92,.94,.95,.96,.98,.98,.98,.99,.99,.99,1,1,1,1,1,1,1,.99,.96,.95,.92,.9,.87,.85,.82,.8,.77,.75,.72,.7,.66];

export function createFilm({ reduce, gsap, $ }) {
  const host = $('#film'), cv = $('#filmCv'), ctx = cv.getContext('2d'), sc = $('#syn'), sx = sc.getContext('2d'), shade = host.querySelector('.shade');
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
    let s = portrait ? (W * 2.35) / iw : Math.max(W / iw, H / ih) * 1.06; s *= st.zoom;
    // portrait: hands sit high while the intro copy fills the bottom, then glide to the centre once it fades
    const pf = Math.min(1, st.f / 14), glide = pf * pf * (3 - 2 * pf);
    const fx = W * .5, fy = portrait ? H * (.3 + .17 * glide) : H * .5, par = reduce ? 0 : 1;
    const ox = fx - cxN * iw * s - m.px * 14 * par, oy = fy - cyN * ih * s - m.py * 10 * par;
    contact = { x: ox + cxN * iw * s, y: oy + cyN * ih * s };
    return { s, ox, oy, portrait, iw, ih };
  }
  function draw() {
    if (!W) return;
    const L = layout(), im = nearest(Math.round(st.f)); scaleNow = L.s;
    // the black backdrop fades with the film, so once the flash clears the universe behind shows through (no blackout)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = st.alpha; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    shade.style.opacity = st.alpha;
    if (im && st.alpha > .01) {
      ctx.globalAlpha = st.alpha; ctx.drawImage(im, L.ox, L.oy, L.iw * L.s, L.ih * L.s);
      if (L.portrait) {   // feather the frame's top/bottom edges into black so there is no visible seam
        const top = L.oy, bot = L.oy + L.ih * L.s, fe = Math.min(170, (bot - top) * .3);
        const g1 = ctx.createLinearGradient(0, top, 0, top + fe), g2 = ctx.createLinearGradient(0, bot - fe, 0, bot);
        g1.addColorStop(0, '#000'); g1.addColorStop(.4, 'rgba(0,0,0,.6)'); g1.addColorStop(1, 'rgba(0,0,0,0)');
        g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(.6, 'rgba(0,0,0,.6)'); g2.addColorStop(1, '#000');
        ctx.globalAlpha = st.alpha; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, Math.max(0, top)); ctx.fillRect(0, bot, W, H - bot);
        ctx.fillStyle = g1; ctx.fillRect(0, top, W, fe); ctx.fillStyle = g2; ctx.fillRect(0, bot - fe, W, fe); }
    }
    const I = INT[Math.round(st.f)] || 0, near = m.in ? Math.max(0, 1 - Math.hypot(m.x - contact.x, m.y - contact.y) / 300) : 0;
    $('#glow').style.transform = `translate(${contact.x}px,${contact.y}px) scale(${.4 + I * .9 + near * .3})`;
    $('#glow').style.opacity = st.alpha * Math.min(1, I * .8 + near * .5);
    $('#flash').style.setProperty('--fx', contact.x + 'px'); $('#flash').style.setProperty('--fy', contact.y + 'px');
  }

  /* spark overlay: crackling lightning arcs, ember sparks and a pulsing star core at the touch point */
  const spr = document.createElement('canvas'); spr.width = spr.height = 32;
  { const g = spr.getContext('2d'), r = g.createRadialGradient(16, 16, 0, 16, 16, 16); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.3, 'rgba(190,225,255,.7)'); r.addColorStop(1, 'rgba(91,168,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 32, 32); }
  const TAU = Math.PI * 2, R = Math.random, SPARKS = [], MAXS = innerWidth < 700 ? 180 : 360;
  let arcs = [], arcClock = 0, boost = 0, emitAcc = 0;
  function bolt(x0, y0, x1, y1, disp, out) {                 // midpoint displacement: a jagged lightning path
    if (disp < 2.5) { out.push(x1, y1); return; }
    const mx = (x0 + x1) / 2 + (R() - .5) * disp, my = (y0 + y1) / 2 + (R() - .5) * disp;
    bolt(x0, y0, mx, my, disp / 2, out); bolt(mx, my, x1, y1, disp / 2, out);
  }
  function makeArcs(I) {
    const n = Math.round(2 + I * 4 + boost * 6), list = [];
    for (let i = 0; i < n; i++) {
      const a = (R() < .5 ? 0 : Math.PI) + (R() - .5) * (i < 2 ? .5 : 2.4), len = (30 + R() * 90) * (.6 + I * .8 + boost * .6);
      const pts = [0, 0]; bolt(0, 0, Math.cos(a) * len, Math.sin(a) * len * .75, len * .35, pts); list.push({ pts, w: .6 + R() * .6 });
      const np = pts.length / 2;
      if (np > 3 && R() < .55) {                              // a forked branch
        const j = 2 * (1 + Math.floor(R() * (np - 2))), bx = pts[j], by = pts[j + 1], ba = a + (R() - .5) * 1.6, bl = len * (.25 + R() * .3), bp = [bx, by];
        bolt(bx, by, bx + Math.cos(ba) * bl, by + Math.sin(ba) * bl, bl * .4, bp); list.push({ pts: bp, w: .4 });
      }
    }
    return list;
  }
  function emit(n, power) {
    for (let i = 0; i < n && SPARKS.length < MAXS; i++) {
      const a = R() * TAU, sp = (1.5 + R() * 4.5) * power;
      SPARKS.push({ x: (R() - .5) * 4, y: (R() - .5) * 4, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * .8, life: 0, max: 30 + R() * 40 });
    }
  }
  function synapse() {
    sx.setTransform(dpr, 0, 0, dpr, 0, 0); sx.clearRect(0, 0, W, H);
    if (st.alpha < .02) { SPARKS.length = 0; return; }
    const I = INT[Math.round(st.f)] || 0, near = m.in ? Math.max(0, 1 - Math.hypot(m.x - contact.x, m.y - contact.y) / 280) : 0;
    const k = scaleNow * 1.15, cx = contact.x, cy = contact.y, T = performance.now();
    boost *= .95;
    const energy = Math.max(I, near * .6, boost), fl = Math.min(1, I * 1.2 + near * .4 + boost * .6) * st.alpha;
    sx.globalCompositeOperation = 'lighter'; sx.lineCap = 'round'; sx.lineJoin = 'round';

    /* soft halo */
    if (fl > .02) {
      const hr = 170 * k * (.4 + fl), hg = sx.createRadialGradient(cx, cy, 0, cx, cy, hr);
      hg.addColorStop(0, `rgba(159,208,255,${.22 * fl})`); hg.addColorStop(1, 'rgba(91,168,255,0)');
      sx.fillStyle = hg; sx.fillRect(cx - hr, cy - hr, hr * 2, hr * 2);
    }

    /* crackling arcs: regenerated every few frames so they flicker like real electricity */
    if (energy > .08) { if (reduce) { if (!arcs.length) arcs = makeArcs(energy); } else if (++arcClock > 3) { arcClock = 0; arcs = makeArcs(energy); } }
    else arcs = [];
    const flick = reduce ? 1 : .6 + .4 * R();
    arcs.forEach(arc => {
      const p = arc.pts; sx.beginPath(); sx.moveTo(cx + p[0] * k, cy + p[1] * k);
      for (let i = 2; i < p.length; i += 2) sx.lineTo(cx + p[i] * k, cy + p[i + 1] * k);
      sx.strokeStyle = `rgba(91,168,255,${.28 * fl * flick})`; sx.lineWidth = 5 * arc.w; sx.stroke();
      sx.strokeStyle = `rgba(228,243,255,${.9 * fl * flick})`; sx.lineWidth = 1.3 * arc.w; sx.stroke();
    });

    /* ember sparks thrown off the contact */
    if (!reduce) { emitAcc += I * 2.2 + near * .8; while (emitAcc > 1) { emitAcc--; emit(1, .6 + I); } }
    for (let i = SPARKS.length - 1; i >= 0; i--) {
      const s = SPARKS[i]; if (++s.life > s.max) { SPARKS.splice(i, 1); continue; }
      s.x += s.vx; s.y += s.vy; s.vx *= .95; s.vy = s.vy * .95 + .04;
      const t = s.life / s.max, a = (1 - t) * st.alpha, hx = cx + s.x * k, hy = cy + s.y * k;
      sx.strokeStyle = `rgba(200,230,255,${.8 * a})`; sx.lineWidth = 1.2;
      sx.beginPath(); sx.moveTo(hx - s.vx * k * 3, hy - s.vy * k * 3); sx.lineTo(hx, hy); sx.stroke();
      const z = 3 + 3 * (1 - t); sx.globalAlpha = a; sx.drawImage(spr, hx - z, hy - z, z * 2, z * 2); sx.globalAlpha = 1;
    }

    /* pulsing star core with diffraction spikes */
    if (fl > .02) {
      const rr = 34 * k * (.5 + I + boost * .5) * (1 + .12 * Math.sin(T * .012)), cg = sx.createRadialGradient(cx, cy, 0, cx, cy, rr);
      cg.addColorStop(0, `rgba(255,255,255,${.95 * fl})`); cg.addColorStop(.35, `rgba(207,230,255,${.5 * fl})`); cg.addColorStop(1, 'rgba(159,208,255,0)');
      sx.fillStyle = cg; sx.beginPath(); sx.arc(cx, cy, rr, 0, TAU); sx.fill();
      const L = rr * (2.5 + fl * 3.5), rot = reduce ? .2 : T * .00025;
      for (let i = 0; i < 4; i++) {
        const thin = i % 2, len = L * (thin ? .55 : 1), sg = sx.createLinearGradient(-len, 0, len, 0);
        sg.addColorStop(0, 'rgba(159,208,255,0)'); sg.addColorStop(.5, `rgba(240,248,255,${(thin ? .45 : .8) * fl})`); sg.addColorStop(1, 'rgba(159,208,255,0)');
        sx.save(); sx.translate(cx, cy); sx.rotate(rot + i * Math.PI / 4); sx.fillStyle = sg; sx.fillRect(-len, thin ? -.5 : -.9, len * 2, thin ? 1 : 1.8); sx.restore();
      }
    }
    sx.globalCompositeOperation = 'source-over';
  }

  new IntersectionObserver(es => es.forEach(en => { onScreen = en.isIntersecting; })).observe(host);
  (function loop() {
    if (st.active && onScreen) { m.px += ((m.in ? (m.x / W * 2 - 1) : 0) - m.px) * .05; m.py += ((m.in ? (m.y / H * 2 - 1) : 0) - m.py) * .05; draw(); synapse(); }
    requestAnimationFrame(loop);
  })();
  host.addEventListener('pointermove', e => { const r = host.getBoundingClientRect(); m.x = e.clientX - r.left; m.y = e.clientY - r.top; m.in = true; });
  host.addEventListener('pointerleave', () => { m.in = false; });
  host.addEventListener('pointerdown', e => { if (e.target.closest('a,button')) return; boost = 1; emit(70, 1.6); arcs = makeArcs(1); gsap.fromTo('#glow', { opacity: 1 }, { opacity: .4, duration: .8 }); });
  addEventListener('resize', size);
  if (!matchMedia('(pointer:fine)').matches) $('#fhint').textContent = 'Tap near the light to send a pulse.';

  /* timeline over the pinned hero */
  function timeline(ScrollTrigger, { onDone }) {
    st.f = reduce ? 40 : 0; st.zoom = 1; st.alpha = 1;
    if (reduce) { size(); return null; }
    gsap.set(['#hLeft', '#hRight', '#hMeet'], { opacity: 0 }); gsap.set('#flash', { opacity: 0 }); gsap.set('#hIntro', { opacity: 1, y: 0 });
    const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: host, start: 'top top', end: '+=360%', pin: true, scrub: .6,
      onUpdate: s => onDone(s.progress > .85) } });   // universe starts fading in under the flash peak
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
