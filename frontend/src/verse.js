/* The Vastverse particle worlds.
   Every section of a page owns a particle shape. Scrolling through a section:
     collapse  -> particles rush in from a scattered cloud and assemble the shape
     hold      -> the shape slowly zooms toward you, reacting to the cursor
     explode   -> the shape blows outward past the camera, then the next one collapses in
   Everything is driven by scroll position, so it plays backwards when you scroll up. */
import * as THREE from 'three';

export const SHAPES = {
  ringed:     { label: 'Ringed giant',     pal: ['#FFF4E0', '#FFD08A', '#9FD0FF'], rx: .28, sc: 1 },
  moons:      { label: 'Moon system',      pal: ['#FFFFFF', '#9FD0FF', '#5B8CFF'], rx: .15, sc: 1 },
  gas:        { label: 'Gas giant',        pal: ['#FFE6D0', '#C9A2FF', '#7A6CFF'], rx: .2,  sc: 1 },
  continents: { label: 'Ocean world',      pal: ['#E6FFF6', '#5FE0B8', '#3B7BFF'], rx: .3,  sc: 1 },
  belt:       { label: 'Belt world',       pal: ['#E9F6FF', '#6FE3FF', '#3E6CFF'], rx: .38, sc: 1 },
  twin:       { label: 'Twin planets',     pal: ['#FFFFFF', '#FFB3E6', '#8F7BFF'], rx: .25, sc: 1 },
  orbits:     { label: 'Orbit planet',     pal: ['#FFFFFF', '#9FD0FF', '#59E1FF'], rx: .2,  sc: 1 },
  star:       { label: 'Young star',       pal: ['#FFFFFF', '#FFE2A8', '#FF9A5A'], rx: 0,   sc: 1 },
  globe:      { label: 'Digital planet',   pal: ['#FFFFFF', '#9FD0FF', '#3E7BFF'], rx: .3,  sc: 1 },
  craters:    { label: 'Cratered moon',    pal: ['#FFFFFF', '#D6D9E6', '#9C8CFF'], rx: .25, sc: 1 },
  halo:       { label: 'Aurora planet',    pal: ['#E6FFFB', '#7FF0D8', '#B06CFF'], rx: .35, sc: 1 },
};
export const PLANET_ORDER = ['ringed', 'moons', 'gas', 'continents', 'belt', 'orbits', 'twin', 'craters', 'halo', 'globe', 'star'];

const VS = `
uniform float uTime,uPix,uSize,uMouseStr,uRippleT,uWave,uGlow; uniform vec3 uMouse,uRipple,uA,uB,uC;
attribute float aRnd; varying vec3 vCol; varying float vA;
void main(){
  vec3 p = position;
  p.y += uWave * (sin(p.x*1.1 + uTime*1.4)*.45 + cos(p.z*1.4 + uTime*1.1)*.35 + sin((p.x+p.z)*.6 - uTime)*.25);
  p += vec3(sin(uTime*.7 + aRnd*40.), cos(uTime*.6 + aRnd*31.), sin(uTime*.5 + aRnd*17.)) * .035;
  vec3 dm = p - uMouse; float d = length(dm);
  float push = uMouseStr * smoothstep(1.9, 0., d);
  p += normalize(dm + 1e-4) * push * 1.1;
  float rd = distance(p, uRipple), wf = uRippleT * 7.;
  float ring = exp(-pow(rd - wf, 2.) * 2.5) * (1. - uRippleT);
  p += normalize(p - uRipple + 1e-4) * ring * .9;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  float tw = .65 + .35 * sin(uTime * (1.5 + aRnd * 3.) + aRnd * 60.);
  gl_PointSize = min(46., uSize * (.45 + aRnd*aRnd*1.6) * tw * (1. + push*1.4 + ring*2. + uGlow*.6) * uPix / -mv.z);
  float m = fract(aRnd * 7.31);
  vCol = m < .5 ? mix(uA, uB, m*2.) : mix(uB, uC, (m - .5)*2.);
  vCol += vec3(.6,.8,1.) * (push*.9 + ring*1.2 + uGlow*.35);
  vA = tw;
}`;
const FS = `
uniform float uOpacity; varying vec3 vCol; varying float vA;
void main(){ vec2 c = gl_PointCoord - .5; float d = length(c); float a = smoothstep(.5, 0., d); a = a*a*(1.2 - d);
  if (a < .01) discard; gl_FragColor = vec4(vCol, min(1., a*1.35) * uOpacity * (.6 + .4*vA)); }`;

export function createVerse(host, { reduce = false } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return null; }
  const small = innerWidth < 700, N = small ? 4800 : 9000;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); host.appendChild(renderer.domElement);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, 1, .1, 200); camera.position.z = 10;
  let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647, (seed - 1) / 2147483646);
  const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2832 * v); };
  const TAU = Math.PI * 2;
  const make = f => { const p = new Float32Array(N * 3); for (let i = 0; i < N; i++) { const q = f(i); p[i * 3] = q[0]; p[i * 3 + 1] = q[1]; p[i * 3 + 2] = q[2]; } return p; };

  /* ---------- particle planets ---------- */
  const sph = (R, j = .03) => { const u = rnd() * 2 - 1, a = rnd() * TAU, s = Math.sqrt(1 - u * u), r = R + gauss() * j; return [s * Math.cos(a) * r, u * r, s * Math.sin(a) * r]; };
  const tilt = (q, ax, az) => { let [x, y, z] = q; let c = Math.cos(ax), s = Math.sin(ax); [y, z] = [y * c - z * s, y * s + z * c]; c = Math.cos(az); s = Math.sin(az); [x, y] = [x * c - y * s, x * s + y * c]; return [x, y, z]; };
  const G = {};
  G.ringed = make(() => { if (rnd() < .58) return sph(2.05);
    let r; do { r = 2.8 + Math.pow(rnd(), .8) * 1.9; } while (r > 3.55 && r < 3.72);
    const a = rnd() * TAU; return tilt([Math.cos(a) * r, gauss() * .02, Math.sin(a) * r], .42, .18); });
  G.moons = (() => { const M = [[3.6, .45, .3, .2], [4.6, .32, 2.4, -.35], [3.1, .25, 4.3, .5]];
    return make(() => { if (rnd() < .74) return sph(2.2); const m = M[Math.floor(rnd() * 3)], [x, y, z] = sph(m[1], .015);
      return [Math.cos(m[2]) * m[0] + x, Math.sin(m[3]) * m[0] * .4 + y, Math.sin(m[2]) * m[0] + z]; }); })();
  G.gas = (() => { const bands = [-.85, -.62, -.4, -.18, .05, .27, .48, .68, .86];
    return make(() => { if (rnd() < .07) { const c = [.55, -.32]; const a = c[0] + gauss() * .12, u = c[1] + gauss() * .07, s = Math.sqrt(1 - u * u), r = 2.5; return [s * Math.cos(a) * r, u * r, s * Math.sin(a) * r]; }
      const u = Math.max(-.999, Math.min(.999, bands[Math.floor(rnd() * bands.length)] + gauss() * .045)), a = rnd() * TAU, s = Math.sqrt(1 - u * u), r = 2.5 + gauss() * .02; return [s * Math.cos(a) * r, u * r, s * Math.sin(a) * r]; }); })();
  const land = (x, y, z) => Math.sin(2.6 * x + 1.3) * Math.sin(2.9 * y + .7) * Math.sin(2.4 * z + 2.1) + .55 * Math.sin(5.3 * x + 4.1 * z) * Math.cos(4.7 * y);
  G.continents = make(() => { if (rnd() < .12) return sph(2.6, .05);
    for (let tries = 0; tries < 12; tries++) { const q = sph(2.3, .015), n = land(q[0] / 2.3, q[1] / 2.3, q[2] / 2.3); if (n > .12 || rnd() < .07) return n > .12 ? q.map(v => v * 1.012) : q; } return sph(2.3); });
  G.belt = make(() => { if (rnd() < .5) return sph(1.8); const r = 2.7 + Math.pow(rnd(), .6) * 2.6, a = rnd() * TAU; return tilt([Math.cos(a) * r, gauss() * .14 * (r / 4), Math.sin(a) * r], .5, -.12); });
  G.twin = make(() => { const k = rnd(); if (k < .52) { const q = sph(1.55); return [q[0] - 1.6, q[1] + .3, q[2]]; } if (k < .85) { const q = sph(1.0); return [q[0] + 2.2, q[1] - .5, q[2] + .4]; }
    const a = rnd() * TAU; return tilt([Math.cos(a) * 3.9, gauss() * .02, Math.sin(a) * 2.2], .35, .1); });
  G.orbits = make(() => { if (rnd() < .6) return sph(2.0); const o = Math.floor(rnd() * 3), a = rnd() * TAU, r = 3.1 + o * .45 + gauss() * .02;
    const clump = rnd() < .12 ? 0 : 1, aa = clump ? a : o * 2 + gauss() * .05; return tilt([Math.cos(aa) * r, 0, Math.sin(aa) * r], .5 + o * .55, o * .9); });
  G.star = (() => { const rays = Array.from({ length: 26 }, () => sph(1, 0));
    return make(() => { const k = rnd(); if (k < .4) { const q = sph(1, 0), r = Math.pow(rnd(), 2) * 1.8; return q.map(v => v * r); } if (k < .78) return sph(1.95, .04);
      const d = rays[Math.floor(rnd() * rays.length)], l = 2 + Math.pow(rnd(), 1.6) * 2.4; return [d[0] * l + gauss() * .04, d[1] * l + gauss() * .04, d[2] * l + gauss() * .04]; }); })();
  G.globe = make(() => { const k = rnd(), R = 2.5, a = rnd() * TAU; if (k < .45) return sph(R, .01);
    if (k < .82) { if (rnd() < .5) { const lat = (Math.floor(rnd() * 9) - 4) * .33, r = Math.cos(lat) * R; return [Math.cos(a) * r, Math.sin(lat) * R, Math.sin(a) * r]; }
      const lon = Math.floor(rnd() * 10) / 10 * Math.PI; return [Math.cos(a) * R * Math.cos(lon), Math.sin(a) * R, Math.cos(a) * R * Math.sin(lon)]; }
    const r = 3.4 + gauss() * .03, oz = Math.sin(a) * r; return [Math.cos(a) * r, oz * .35, oz * .94]; });
  G.craters = (() => { const C = Array.from({ length: 16 }, () => [sph(1, 0), .12 + rnd() * .3]);
    return make(() => { if (rnd() < .55) return sph(2.3, .02); const [c, cr] = C[Math.floor(rnd() * C.length)], a = rnd() * TAU;
      let t1 = [-c[1], c[0], 0]; const l1 = Math.hypot(...t1) || 1; t1 = t1.map(v => v / l1); const t2 = [c[1] * t1[2] - c[2] * t1[1], c[2] * t1[0] - c[0] * t1[2], c[0] * t1[1] - c[1] * t1[0]];
      const rr = cr * (1 + gauss() * .06), p = [c[0] + (t1[0] * Math.cos(a) + t2[0] * Math.sin(a)) * rr, c[1] + (t1[1] * Math.cos(a) + t2[1] * Math.sin(a)) * rr, c[2] + (t1[2] * Math.cos(a) + t2[2] * Math.sin(a)) * rr];
      const l = Math.hypot(...p), R = 2.36; return p.map(v => v / l * R); }); })();
  G.halo = make(() => { const k = rnd(); if (k < .55) return sph(2.0); if (k < .72) return sph(2.4, .06); if (k < .84) return sph(2.85, .1);
    const pole = rnd() < .5 ? 1 : -1, a = rnd() * TAU, u = pole * (.86 + gauss() * .03), s = Math.sqrt(Math.max(0, 1 - u * u)), r = 2.1 + Math.abs(gauss()) * .5; return [s * Math.cos(a) * r, u * r, s * Math.sin(a) * r]; });
  // the exploded cloud: shape-independent, wide and reaching past the camera so the explosion flies through you
  const E = make(() => { const u = rnd() * 2 - 1, a = rnd() * TAU, s = Math.sqrt(1 - u * u), R = 7 + Math.pow(rnd(), .5) * 13; return [Math.cos(a) * s * R * 1.5, u * R * .9, Math.sin(a) * s * R * .8 + 3]; });

  /* ---------- particles ---------- */
  const pos = new Float32Array(E), aRnd = new Float32Array(N), cs = new Float32Array(N), sn = new Float32Array(N);
  for (let i = 0; i < N; i++) aRnd[i] = rnd();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aRnd', new THREE.BufferAttribute(aRnd, 1));
  const U = { uTime: { value: 0 }, uPix: { value: renderer.getPixelRatio() }, uSize: { value: small ? 40 : 36 }, uOpacity: { value: 0 }, uGlow: { value: 0 },
    uMouse: { value: new THREE.Vector3(99, 99, 99) }, uMouseStr: { value: 0 }, uRipple: { value: new THREE.Vector3() }, uRippleT: { value: 1 }, uWave: { value: 0 },
    uA: { value: new THREE.Color('#fff') }, uB: { value: new THREE.Color('#9FD0FF') }, uC: { value: new THREE.Color('#5BA8FF') } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const grp = new THREE.Group(), points = new THREE.Points(geo, mat); points.frustumCulled = false; grp.add(points); scene.add(grp);

  /* background stars: they fly toward the camera as you scroll (wrapped in the shader, so it never runs out) */
  const SU = { uFly: { value: 0 }, uPix: U.uPix, uOpacity: { value: .9 } };
  { const n = small ? 1400 : 3200, p = new Float32Array(n * 3), r = new Float32Array(n);
    for (let i = 0; i < n; i++) { p.set([(rnd() - .5) * 120, (rnd() - .5) * 76, -90 + rnd() * 98], i * 3); r[i] = rnd(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('aRnd', new THREE.BufferAttribute(r, 1));
    const sm = new THREE.ShaderMaterial({ uniforms: SU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uFly,uPix; attribute float aRnd; varying float vA; varying vec3 vC;
        void main(){ vec3 p = position; p.z = -90. + mod(p.z + 90. + uFly, 98.);
          vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
          float near = smoothstep(8., 2., p.z), far = smoothstep(-90., -70., p.z);
          vA = far * near * (.45 + .55 * aRnd);
          gl_PointSize = clamp((1.2 + aRnd * 2.2) * 26. * uPix / -mv.z, .8, 7. * uPix);
          vC = aRnd > .82 ? vec3(.62,.82,1.) : vec3(.9,.95,1.); }`,
      fragmentShader: `uniform float uOpacity; varying float vA; varying vec3 vC;
        void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .0, d); if (a < .02) discard; gl_FragColor = vec4(vC, a * vA * uOpacity); }` });
    const stars = new THREE.Points(g, sm); stars.frustumCulled = false; stars.renderOrder = -2; scene.add(stars); var starField = stars; }

  /* nebula behind each world, tinted with its planet colours; zooms in with the section and fades during transitions */
  const NU = { uTime: U.uTime, uB: U.uB, uC: U.uC, uAlpha: { value: 0 }, uZoom: { value: 1 } };
  const neb = new THREE.Mesh(new THREE.PlaneGeometry(90, 56), new THREE.ShaderMaterial({ uniforms: NU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform float uTime,uAlpha,uZoom; uniform vec3 uB,uC; varying vec2 vP;
      float blob(vec2 p, vec2 c, float r){ vec2 d = (p - c) / r; return exp(-dot(d, d)); }
      void main(){ vec2 p = vP / uZoom; float t = uTime * .05;
        float a = blob(p, vec2(sin(t) * 2.5, cos(t * .8) * 1.5), 11.) * .55
                + blob(p, vec2(6. + cos(t * 1.3) * 3., -3. + sin(t) * 2.), 7.) * .35
                + blob(p, vec2(-7. + sin(t * .9) * 2., 4. + cos(t * 1.1) * 2.), 8.) * .25;
        vec3 col = mix(uC, uB, blob(p, vec2(0.), 6.) * .6);
        gl_FragColor = vec4(col * a, 1.) * uAlpha; }` }));
  neb.position.z = -26; neb.renderOrder = -1; neb.frustumCulled = false; scene.add(neb);

  /* constellation lines from the cursor */
  const MAXL = small ? 22 : 44, lp = new Float32Array(MAXL * 6), lc = new Float32Array(MAXL * 6), lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.BufferAttribute(lp, 3)); lg.setAttribute('color', new THREE.BufferAttribute(lc, 3));
  const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); lines.frustumCulled = false; grp.add(lines);

  /* ---------- state ---------- */
  let sections = [], sTarget = 0, sNow = 0, vis = 0, visT = 0, spin = 0, burst = 0, lastScroll = scrollY, scrollV = 0;
  const pal = [new THREE.Color(), new THREE.Color(), new THREE.Color()];
  const m = { x: 0, y: 0, nx: 0, ny: 0, active: false, str: 0 };
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(), hit = new THREE.Vector3(), mLocal = new THREE.Vector3();
  addEventListener('pointermove', e => { m.x = e.clientX; m.y = e.clientY; m.nx = e.clientX / innerWidth * 2 - 1; m.ny = e.clientY / innerHeight * 2 - 1; m.active = true; }, { passive: true });
  document.addEventListener('pointerleave', () => m.active = false);
  addEventListener('scroll', () => { scrollV += (scrollY - lastScroll) * .001; lastScroll = scrollY; }, { passive: true });
  function localPoint(cx, cy, out) {
    ray.setFromCamera({ x: cx / innerWidth * 2 - 1, y: -(cy / innerHeight * 2 - 1) }, camera);
    const n = new THREE.Vector3(); camera.getWorldDirection(n); plane.setFromNormalAndCoplanarPoint(n, grp.position);
    if (!ray.ray.intersectPlane(plane, hit)) return false; out.copy(hit); grp.worldToLocal(out); return true;
  }
  addEventListener('pointerdown', e => {
    if (vis < .5 || e.target.closest('a,button,input,select,textarea,label,.card,.film,.jmap,.drawer,.modal,header,.chip-in')) return;
    const v = new THREE.Vector3(); if (localPoint(e.clientX, e.clientY, v)) { U.uRipple.value.copy(v); U.uRippleT.value = 0; }
    if (!reduce) burst = 1;
  });
  function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  addEventListener('resize', resize); resize();

  /* sections: [{shape, side, top, height}] in document coordinates */
  function setSections(list) { sections = list; burst = Math.max(burst, reduce ? 0 : .9); }
  function currentFrom(y) {
    const c = y + innerHeight * .5;
    for (let i = 0; i < sections.length; i++) { const s = sections[i]; if (c < s.top + s.height || i === sections.length - 1) return i + Math.max(0, Math.min(.9999, (c - s.top) / s.height)); }
    return 0;
  }
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 16.67, 3); last = now;
    vis += (visT - vis) * .06; host.style.opacity = vis.toFixed(3);
    if (vis > .01 && sections.length) {
      sTarget = currentFrom(scrollY);
      sNow += (sTarget - sNow) * (reduce ? 1 : Math.min(1, .12 * dt));
      if (Math.abs(sTarget - sNow) > 1.5) sNow = sTarget;              // big jumps (navigation) snap
      const i = Math.floor(sNow), t = sNow - i, sec = sections[i] || {}, cfg = SHAPES[sec.shape];
      burst *= Math.pow(.965, dt);
      // e: 1 = fully exploded cloud, 0 = assembled shape
      const eIn = 1 - smooth(0, .24, t), eOut = smooth(.72, 1, t);
      let e = cfg ? Math.max(eIn, eOut, burst * .75) : 1;
      if (reduce && cfg) e = 0;
      const S = cfg ? G[sec.shape] : E;
      const zoom = (.82 + .38 * smooth(.2, .75, t)) * (1 + eOut * 1.6);  // the slow zoom-in, then rushing through
      const T = now * .001;
      for (let k = 0; k < N; k++) {
        const j = k * 3, r = aRnd[k], ep = Math.max(0, Math.min(1, e * 1.35 - r * .35));
        const sx = S[j] * zoom, sy = S[j + 1] * zoom, sz = S[j + 2] * zoom;
        let x = sx + (E[j] - sx) * ep, y = sy + (E[j + 1] - sy) * ep, z = sz + (E[j + 2] - sz) * ep;
        const sw = ep * (1 - ep) * 4 * (r - .5) * 3.2;                     // spiral while collapsing / exploding
        if (sw) { const c = Math.cos(sw), s = Math.sin(sw), nx = x * c - z * s; z = x * s + z * c; x = nx; }
        if (!cfg) { y += Math.sin(T * .3 + r * 20) * .4; }
        pos[j] = x; pos[j + 1] = y; pos[j + 2] = z;
      }
      geo.attributes.position.needsUpdate = true;

      // colour, glow, wave
      const p = (cfg || SHAPES.globe).pal;
      U.uA.value.lerp(pal[0].set(p[0]), .05); U.uB.value.lerp(pal[1].set(p[1]), .05); U.uC.value.lerp(pal[2].set(p[2]), .05);
      U.uGlow.value = e; U.uWave.value = 0;
      U.uTime.value = T; U.uOpacity.value = vis * (small ? .62 : .92) * (cfg ? 1 : .55);
      U.uRippleT.value = Math.min(1, U.uRippleT.value + .011 * dt);

      // placement: beside the content while assembled, centre stage while exploding
      const wide = innerWidth > 900, side = sec.side || 0;
      grp.position.x += ((wide ? side * 3.4 : 0) * (1 - e) - grp.position.x) * .08;
      grp.position.y += ((wide ? 0 : 1.2) * (1 - e) - grp.position.y) * .08;
      grp.scale.setScalar((cfg ? cfg.sc : 1) * (wide ? 1 : .72));
      scrollV *= .9;
      if (!reduce) spin += (.0022 + scrollV * .5) * dt;
      grp.rotation.y = spin;
      grp.rotation.x += (((cfg ? cfg.rx : 0) + m.ny * .2) - grp.rotation.x) * .05;
      grp.rotation.z += (m.nx * -.06 - grp.rotation.z) * .05;
      camera.position.x += (m.nx * .5 - camera.position.x) * .03; camera.position.y += (-m.ny * .35 - camera.position.y) * .03; camera.lookAt(0, 0, 0);
      starField.rotation.z = sNow * .08;
      SU.uFly.value = sNow * 16 + (reduce ? 0 : T * .35);            // each section flies you ~16 units deeper
      SU.uOpacity.value = vis * .95;
      // nebula sits behind the planet, zooms with section progress, hides while the planet explodes/reforms
      neb.position.x = grp.position.x * 2.2; neb.position.y = grp.position.y;
      NU.uZoom.value = .85 + .55 * smooth(0, 1, t);
      NU.uAlpha.value += ((cfg ? (1 - Math.max(eIn, eOut)) * .5 : .12) * vis - NU.uAlpha.value) * .08;
      grp.updateMatrixWorld();

      // cursor: repel + constellation lines
      m.str += ((m.active && !reduce && e < .5 ? 1 : 0) - m.str) * .08; U.uMouseStr.value = m.str;
      if (m.active && localPoint(m.x, m.y, mLocal)) U.uMouse.value.lerp(mLocal, .25);
      let n = 0;
      if (m.str > .05) {
        const mx = U.uMouse.value.x, my = U.uMouse.value.y, mz = U.uMouse.value.z, R2 = 6.8, step = small ? 5 : 3, off = Math.floor(now / 60) % step;
        for (let k = off; k < N && n < MAXL; k += step) {
          const j = k * 3, dx = pos[j] - mx, dy = pos[j + 1] - my, dz = pos[j + 2] - mz, d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < R2 && d2 > .5) { const q = n * 6, f = (1 - d2 / R2) * m.str * .9, d = Math.sqrt(d2), o = 1.1 * (1 - d / 2.6);
            lp[q] = mx; lp[q + 1] = my; lp[q + 2] = mz; lp[q + 3] = pos[j] + dx / d * o; lp[q + 4] = pos[j + 1] + dy / d * o; lp[q + 5] = pos[j + 2] + dz / d * o;
            lc[q] = U.uB.value.r * f; lc[q + 1] = U.uB.value.g * f; lc[q + 2] = U.uB.value.b * f; lc[q + 3] = lc[q + 4] = lc[q + 5] = 0; n++; }
        }
      }
      for (let q = n * 6; q < MAXL * 6; q++) { lp[q] = 0; lc[q] = 0; }
      lg.attributes.position.needsUpdate = true; lg.attributes.color.needsUpdate = true;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return { setSections, setVisible: v => visT = v, burst: () => { burst = 1; } };
}
