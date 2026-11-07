/* Hyperspace jump between pages: stars streak out from the centre, then settle. */
export function createWarp(cv, { reduce = false } = {}) {
  if (!cv || reduce) return { jump() {} };
  const ctx = cv.getContext('2d');
  const N = 260, stars = [];
  let raf = 0, t0 = 0, dur = 1000;

  function size() {
    const d = Math.min(devicePixelRatio, 2);
    cv.width = innerWidth * d; cv.height = innerHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  function seed() {
    stars.length = 0;
    for (let i = 0; i < N; i++) stars.push({ a: Math.random() * Math.PI * 2, r: Math.random() * 40, v: .4 + Math.random() * 1.6, c: Math.random() < .2 ? '#9FD0FF' : '#FFFFFF' });
  }
  function frame(now) {
    // rAF's timestamp can be slightly earlier than t0 on the first frame; clamp so speed never goes NaN
    const p = Math.min(1, Math.max(0, (now - t0) / dur));
    // speed ramps up, peaks around 45%, then eases back out
    const speed = Math.sin(Math.PI * p) ** 1.5, w = innerWidth, h = innerHeight, cx = w / 2, cy = h / 2, maxR = Math.hypot(cx, cy);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = `rgba(0,0,8,${.55 * speed})`; ctx.fillRect(0, 0, w, h);
    ctx.lineCap = 'round';
    for (const s of stars) {
      s.r += s.v * (2 + speed * 38);
      if (s.r > maxR) { s.r = Math.random() * 30; s.a = Math.random() * Math.PI * 2; }
      const len = 2 + speed * s.v * 90 * (s.r / maxR + .2), cos = Math.cos(s.a), sin = Math.sin(s.a);
      ctx.strokeStyle = s.c; ctx.globalAlpha = Math.min(1, s.r / 80) * (.35 + speed * .65);
      ctx.lineWidth = .6 + (s.r / maxR) * 1.8;
      ctx.beginPath(); ctx.moveTo(cx + cos * s.r, cy + sin * s.r); ctx.lineTo(cx + cos * (s.r + len), cy + sin * (s.r + len)); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // bright core flash at peak speed
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * .5);
    g.addColorStop(0, `rgba(159,208,255,${.35 * speed})`); g.addColorStop(1, 'rgba(159,208,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    if (p < 1) raf = requestAnimationFrame(frame);
    else { cv.classList.remove('on'); ctx.clearRect(0, 0, w, h); raf = 0; }
  }
  addEventListener('resize', () => raf && size());

  return {
    jump(ms = 1000) {
      dur = ms; size(); seed(); cv.classList.add('on');
      cancelAnimationFrame(raf); t0 = performance.now(); raf = requestAnimationFrame(frame);
    },
  };
}
