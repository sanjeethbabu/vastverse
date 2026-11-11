/* Portal jump between pages.
   1) Cover: a glowing iris opens from where the user tapped and swallows the page, with tunnel rings
      rushing outward inside it (the "dive").
   2) Reveal: once the next page is rendered underneath, a second iris opens from the screen centre and
      the new world grows out through it. */
export function createWarp(cv, { reduce = false } = {}) {
  if (!cv || reduce) return { jump() {} };
  const ctx = cv.getContext('2d');
  const VOID = '#02040A', SWAP = .47;           // SWAP ≈ when main.js renders the next page (520ms of 1100ms)
  let raf = 0, t0 = 0, dur = 1100, w = 0, h = 0, ox = 0, oy = 0, sparks = [];
  let lastTap = { x: 0, y: 0, t: -1e9 };

  addEventListener('pointerdown', e => { lastTap = { x: e.clientX, y: e.clientY, t: performance.now() }; }, { passive: true });

  const ease = t => t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
  const far = (x, y) => Math.hypot(Math.max(x, w - x), Math.max(y, h - y));

  function size() {
    const d = Math.min(devicePixelRatio, 2);
    w = innerWidth; h = innerHeight;
    cv.width = w * d; cv.height = h * d; ctx.setTransform(d, 0, 0, d, 0, 0);
  }

  // soft glowing rim: transparent inside, bright blue-white edge, quick falloff outside
  function rim(x, y, r, a) {
    if (r < 1) return;
    const g = ctx.createRadialGradient(x, y, Math.max(0, r - 46), x, y, r + 10);
    g.addColorStop(0, 'rgba(91,168,255,0)');
    g.addColorStop(.72, `rgba(91,168,255,${.28 * a})`);
    g.addColorStop(.86, `rgba(159,208,255,${.85 * a})`);
    g.addColorStop(.9, `rgba(255,255,255,${a})`);
    g.addColorStop(1, 'rgba(159,208,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r + 10, 0, Math.PI * 2); ctx.fill();
  }

  function orbit(x, y, r, a, spin) {
    for (const s of sparks) {
      const ang = s.a + spin * s.v, rr = r + s.o;
      ctx.globalAlpha = a * s.l;
      ctx.fillStyle = s.c;
      ctx.beginPath(); ctx.arc(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr, s.s, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function frame(now) {
    const p = Math.min(1, Math.max(0, (now - t0) / dur));
    ctx.clearRect(0, 0, w, h);

    if (p < SWAP) {
      // ---- cover: iris grows from the tap point
      const q = ease(p / SWAP), R = q * far(ox, oy) * 1.08;
      ctx.fillStyle = VOID; ctx.beginPath(); ctx.arc(ox, oy, R, 0, Math.PI * 2); ctx.fill();
      // tunnel rings rushing outward inside the iris
      ctx.save(); ctx.beginPath(); ctx.arc(ox, oy, R, 0, Math.PI * 2); ctx.clip();
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 6; i++) {
        const k = ((p * 2.6 + i / 6) % 1), rr = k * k * R;
        ctx.strokeStyle = `rgba(159,208,255,${.22 * (1 - k) * q})`;
        ctx.beginPath(); ctx.arc(ox, oy, rr, 0, Math.PI * 2); ctx.stroke();
      }
      const core = ctx.createRadialGradient(ox, oy, 0, ox, oy, Math.max(1, R * .5));
      core.addColorStop(0, `rgba(159,208,255,${.3 * q})`); core.addColorStop(1, 'rgba(159,208,255,0)');
      ctx.fillStyle = core; ctx.fillRect(0, 0, w, h);
      ctx.restore();
      rim(ox, oy, R, 1 - q * .25);
      orbit(ox, oy, R, 1 - q * .4, p * 9);
    } else {
      // ---- reveal: a new iris opens from the centre, showing the next page
      const q = ease((p - SWAP) / (1 - SWAP)), cx = w / 2, cy = h / 2, R = q * far(cx, cy) * 1.1;
      ctx.fillStyle = VOID; ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      rim(cx, cy, R, 1 - q);
      orbit(cx, cy, R, (1 - q) * .9, -p * 9);
    }

    if (p < 1) raf = requestAnimationFrame(frame);
    else { cv.classList.remove('on'); ctx.clearRect(0, 0, w, h); raf = 0; }
  }
  addEventListener('resize', () => raf && size());

  return {
    jump(ms = 1100) {
      dur = ms; size();
      // open from the tap/click that triggered the navigation; back/forward buttons fall back to centre
      const recent = performance.now() - lastTap.t < 1500;
      ox = recent ? lastTap.x : w / 2; oy = recent ? lastTap.y : h / 2;
      sparks = Array.from({ length: 36 }, () => ({
        a: Math.random() * Math.PI * 2, v: .4 + Math.random(), o: (Math.random() - .5) * 18,
        s: .6 + Math.random() * 1.6, l: .4 + Math.random() * .6, c: Math.random() < .3 ? '#FFFFFF' : '#9FD0FF',
      }));
      cv.classList.add('on');
      cancelAnimationFrame(raf); t0 = performance.now(); raf = requestAnimationFrame(frame);
    },
  };
}
