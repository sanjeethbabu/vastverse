/* The Vastverse universe: a horizontal flight past procedural planets.
   Each page owns a region of space; each section (panel) owns a planet.
   Scroll progress moves the camera left to right; fast moves stretch the stars into warp streaks. */
import * as THREE from 'three';

const NOISE = `
float hash(vec3 p){ p = fract(p*.3183099 + .1); p *= 17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x), mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x), f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x), mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x), f.y), f.z); }
float fbm(vec3 p){ float v = 0., a = .5; for (int i = 0; i < 5; i++){ v += a*noise(p); p *= 2.03; a *= .5; } return v; }`;

const PLANET_VS = `
varying vec3 vObj; varying vec3 vN; varying vec3 vV;
void main(){ vObj = position; vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vV = -mv.xyz; gl_Position = projectionMatrix*mv; }`;

const PLANET_FS = `
uniform vec3 uC1,uC2,uC3,uAtmo,uLight; uniform float uType,uSeed,uTime,uHover;
varying vec3 vObj; varying vec3 vN; varying vec3 vV;
${NOISE}
void main(){
  vec3 p = normalize(vObj); vec3 col; float e = 0.;
  if (uType < .5){            // ocean world
    float h = fbm(p*2.2 + uSeed);
    float land = smoothstep(.5,.53,h);
    col = mix(mix(uC1*.6, uC1, smoothstep(.3,.5,h)), mix(uC2, uC3, smoothstep(.55,.78,h)), land);
    col = mix(col, vec3(.93,.97,1.), smoothstep(.78,.92, abs(p.y) + (h-.5)*.3));
    col = mix(col, vec3(1.), smoothstep(.56,.78, fbm(p*3. + vec3(uTime*.02,0.,uSeed)))*.5);
  } else if (uType < 1.5){    // gas giant
    float t = fbm(vec3(p.x*1.5, p.y*7., p.z*1.5) + uSeed + vec3(uTime*.012,0.,0.));
    col = mix(uC1, uC2, sin(p.y*14. + t*6.)*.5 + .5);
    col = mix(col, uC3, smoothstep(.6,.9,t));
  } else if (uType < 2.5){    // molten world
    float h = fbm(p*3. + uSeed);
    col = mix(uC1, uC2, h);
    e = 1. - smoothstep(0., .035, abs(h - .5)); col += uC3*e*1.6;
  } else if (uType < 3.5){    // ice world
    float h = fbm(p*2.6 + uSeed);
    col = mix(uC1, uC2, smoothstep(.35,.7,h));
    col = mix(col, uC3, (1. - smoothstep(0., .02, abs(fbm(p*5. + uSeed) - .5)))*.8);
  } else {                    // desert / rock
    float h = fbm(p*3.4 + uSeed);
    col = mix(uC1, uC2, smoothstep(.3,.7,h));
    col = mix(col, uC3, smoothstep(.62,.8, fbm(p*8. + uSeed))*.6);
    col *= 1. - smoothstep(.72,.75, noise(p*9. + uSeed))*.25;
  }
  vec3 N = normalize(vN), V = normalize(vV);
  float diff = max(dot(N, normalize(uLight)), 0.);
  float rim = pow(1. - max(dot(N, V), 0.), 2.5);
  vec3 lit = col*(.05 + diff*1.15) + uAtmo*rim*(.55 + uHover*1.4)*(.3 + diff) + col*e*.8*(1. - diff*.5);
  gl_FragColor = vec4(lit, 1.);
}`;

const ATMO_FS = `
uniform vec3 uAtmo; uniform float uHover; varying vec3 vN; varying vec3 vV;
void main(){ float i = pow(max(0., .62 - dot(normalize(vN), normalize(vV))), 4.); gl_FragColor = vec4(uAtmo*(1. + uHover*1.4), i*(.55 + uHover*.8)); }`;
const ATMO_VS = `varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.); vV = -mv.xyz; gl_Position = projectionMatrix*mv; }`;

const RING_VS = `varying float vR; void main(){ vR = length(position.xy); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const RING_FS = `uniform float uIn,uOut,uSeed; uniform vec3 uCol; varying float vR;
void main(){ float t = (vR - uIn)/(uOut - uIn);
  float b = .45 + .55*fract(sin(floor(t*42. + uSeed)*12.9898)*43758.5);
  float a = smoothstep(0.,.04,t)*smoothstep(1.,.9,t)*b*(.35 + .4*sin(t*90. + uSeed));
  gl_FragColor = vec4(uCol*(.6 + b*.6), a*.75); }`;

const STAR_VS = `uniform float uTime,uPix; attribute float aSize; attribute float aTw; varying float vA;
void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mv;
  float tw = .6 + .4*sin(uTime*(1. + aTw*2.) + aTw*50.); vA = tw;
  gl_PointSize = aSize*uPix*tw*(220./-mv.z); }`;
const STAR_FS = `uniform vec3 uCol; varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5,0.,d); a *= a; if (a < .02) discard; gl_FragColor = vec4(uCol, a*vA); }`;

const STREAK_VS = `uniform float uWarp; attribute float aEnd; varying float vEnd;
void main(){ vec3 p = position; p.x -= aEnd*uWarp*(6. + fract(p.y*13.7)*10.); vEnd = aEnd; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.); }`;
const STREAK_FS = `uniform float uWarp; varying float vEnd; void main(){ gl_FragColor = vec4(.75,.88,1., (1. - vEnd)*clamp(uWarp,0.,1.)*.8); }`;

/* planet looks: type, three surface colours, atmosphere */
const LOOKS = [
  [0, '#0B2A5B', '#2F7D6B', '#C9C29A', '#6FB6FF'],   // ocean
  [1, '#C7A27A', '#6E4E3A', '#F1E2C8', '#FFD9A8'],   // amber gas giant
  [3, '#CFE6FF', '#7FA8D8', '#FFFFFF', '#BFE3FF'],   // ice
  [1, '#5B4FB8', '#1E2A6E', '#B9A8FF', '#9C8CFF'],   // violet gas giant
  [2, '#1A0E0A', '#3A1B12', '#FF7A2E', '#FF9A5A'],   // molten
  [4, '#B98454', '#6A4227', '#E7C79A', '#FFC48A'],   // desert
  [1, '#2C7FA8', '#0E3D5C', '#9FE8FF', '#7FDBFF'],   // teal gas giant
  [0, '#152B47', '#4F5F3A', '#D8D0B8', '#9FD0FF'],   // dusk ocean
  [3, '#E9E4FF', '#9A8FD8', '#FFFFFF', '#D6CCFF'],   // lilac ice
];

export function createUniverse(host, { reduce = false, onPlanetClick = () => {}, onHover = () => {} } = {}) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { return null; }
  const small = innerWidth < 700;
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, .1, 600);
  camera.position.set(0, 0, 14);
  const lightWorld = new THREE.Vector3(-.65, .45, .62).normalize();
  const lightView = new THREE.Vector3();
  const clock = { t: 0 };
  const sphereGeo = new THREE.SphereGeometry(1, small ? 48 : 72, small ? 32 : 48);
  const REGION = 1400, D = 58;                                // world units per page region / per screen of travel

  /* ---------- stars (3 parallax layers) ---------- */
  function starLayer(n, zMin, zMax, size, color) {
    const pos = new Float32Array(n * 3), s = new Float32Array(n), tw = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = -120 + Math.random() * (REGION * 6 + 240);
      pos[i * 3 + 1] = (Math.random() - .5) * (-zMin) * 1.6;
      pos[i * 3 + 2] = zMin + Math.random() * (zMax - zMin);
      s[i] = size * (.4 + Math.random() * Math.random() * 1.8); tw[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(s, 1));
    g.setAttribute('aTw', new THREE.BufferAttribute(tw, 1));
    const m = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uPix: { value: renderer.getPixelRatio() }, uCol: { value: new THREE.Color(color) } },
      vertexShader: STAR_VS, fragmentShader: STAR_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const p = new THREE.Points(g, m); p.frustumCulled = false; scene.add(p); return m;
  }
  const k = small ? .45 : 1;
  const starMats = [starLayer(26000 * k, -260, -140, 2.2, '#DCE8FF'), starLayer(12000 * k, -130, -60, 2.6, '#BFD8FF'), starLayer(4000 * k, -50, -12, 2.2, '#9FD0FF')];

  /* ---------- nebulae ---------- */
  function nebulaTex(c1, c2) {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d');
    for (let i = 0; i < 9; i++) {
      const x = 60 + Math.random() * 136, y = 60 + Math.random() * 136, r = 50 + Math.random() * 80, gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, i % 2 ? c1 : c2); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    }
    return new THREE.CanvasTexture(cv);
  }
  const NEB = [['rgba(91,120,255,.18)', 'rgba(160,90,255,.12)'], ['rgba(60,180,255,.14)', 'rgba(40,90,200,.12)'], ['rgba(255,120,180,.10)', 'rgba(120,90,255,.12)'], ['rgba(80,220,200,.10)', 'rgba(60,120,255,.12)']];
  for (let x = -40; x < REGION * 6 + 100; x += 110 + Math.random() * 90) {
    const n = NEB[Math.floor(Math.random() * NEB.length)];
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: nebulaTex(n[0], n[1]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .9 }));
    const s = 120 + Math.random() * 140; sp.scale.set(s * 1.4, s, 1);
    sp.position.set(x, (Math.random() - .5) * 80, -200 - Math.random() * 60); scene.add(sp);
  }

  /* ---------- warp streaks ---------- */
  const SN = small ? 300 : 700, sPos = new Float32Array(SN * 6), sEnd = new Float32Array(SN * 2);
  for (let i = 0; i < SN; i++) {
    const x = (Math.random() - .5) * 90, y = (Math.random() - .5) * 50, z = -10 - Math.random() * 60;
    sPos.set([x, y, z, x, y, z], i * 6); sEnd[i * 2] = 0; sEnd[i * 2 + 1] = 1;
  }
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3)); sGeo.setAttribute('aEnd', new THREE.BufferAttribute(sEnd, 1));
  const streakMat = new THREE.ShaderMaterial({ uniforms: { uWarp: { value: 0 } }, vertexShader: STREAK_VS, fragmentShader: STREAK_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const streaks = new THREE.LineSegments(sGeo, streakMat); streaks.frustumCulled = false; scene.add(streaks);

  /* ---------- planets ---------- */
  const glowTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.15, 'rgba(255,240,220,.85)'); r.addColorStop(.4, 'rgba(159,208,255,.25)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv); })();

  function makePlanet(spec, look, seed) {
    const [type, c1, c2, c3, atmo] = look, grp = new THREE.Group();
    if (spec.flags.includes('star')) {
      const core = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: '#FFF6E8' })); core.scale.setScalar(spec.r * .5); grp.add(core);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      halo.scale.setScalar(spec.r * 7); grp.add(halo);
      const halo2 = halo.clone(); halo2.material = halo.material.clone(); halo2.material.opacity = .35; halo2.scale.set(spec.r * 26, spec.r * 1.2, 1); grp.add(halo2);
      grp.userData = { core, isStar: true, hover: 0, hoverT: 0, uniforms: null }; return grp;
    }
    const uniforms = { uC1: { value: new THREE.Color(c1) }, uC2: { value: new THREE.Color(c2) }, uC3: { value: new THREE.Color(c3) }, uAtmo: { value: new THREE.Color(atmo) },
      uLight: { value: lightView }, uType: { value: type }, uSeed: { value: seed }, uTime: { value: 0 }, uHover: { value: 0 } };
    const body = new THREE.Mesh(sphereGeo, new THREE.ShaderMaterial({ uniforms, vertexShader: PLANET_VS, fragmentShader: PLANET_FS }));
    body.scale.setScalar(spec.r); body.rotation.z = (Math.random() - .5) * .5; grp.add(body);
    const atmoMesh = new THREE.Mesh(sphereGeo, new THREE.ShaderMaterial({ uniforms: { uAtmo: uniforms.uAtmo, uHover: uniforms.uHover }, vertexShader: ATMO_VS, fragmentShader: ATMO_FS,
      side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    atmoMesh.scale.setScalar(spec.r * 1.12); grp.add(atmoMesh);
    const ud = { body, uniforms, hover: 0, hoverT: 0, moons: [] };
    if (spec.flags.includes('ring')) {
      const inR = spec.r * 1.4, outR = spec.r * 2.35;
      const ring = new THREE.Mesh(new THREE.RingGeometry(inR, outR, 160, 1), new THREE.ShaderMaterial({
        uniforms: { uIn: { value: inR }, uOut: { value: outR }, uSeed: { value: seed }, uCol: { value: new THREE.Color(c3).lerp(new THREE.Color(atmo), .4) } },
        vertexShader: RING_VS, fragmentShader: RING_FS, side: THREE.DoubleSide, transparent: true, depthWrite: false }));
      ring.rotation.x = Math.PI / 2 - .38; ring.rotation.y = .25; grp.add(ring);
    }
    if (spec.flags.includes('moons')) {
      for (let i = 0; i < 2; i++) {
        const mu = { ...uniforms, uType: { value: 4 }, uC1: { value: new THREE.Color('#8C8F99') }, uC2: { value: new THREE.Color('#4A4D57') }, uC3: { value: new THREE.Color('#C9CCD6') },
          uAtmo: { value: new THREE.Color('#9FD0FF') }, uSeed: { value: seed + i * 7 }, uHover: { value: 0 } };
        const moon = new THREE.Mesh(sphereGeo, new THREE.ShaderMaterial({ uniforms: mu, vertexShader: PLANET_VS, fragmentShader: PLANET_FS }));
        moon.scale.setScalar(spec.r * (.12 + i * .07)); grp.add(moon);
        ud.moons.push({ mesh: moon, dist: spec.r * (1.9 + i * .8), speed: .25 - i * .08, phase: i * 2.4, tilt: .3 + i * .25 });
      }
    }
    if (spec.flags.includes('belt')) {
      const n = small ? 500 : 1200, bp = new Float32Array(n * 3), bs = new Float32Array(n), bt = new Float32Array(n);
      for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = spec.r * (1.7 + Math.random() * .9); bp.set([Math.cos(a) * r, (Math.random() - .5) * spec.r * .08, Math.sin(a) * r], i * 3); bs[i] = .8 + Math.random() * 1.6; bt[i] = Math.random(); }
      const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(bp, 3)); bg.setAttribute('aSize', new THREE.BufferAttribute(bs, 1)); bg.setAttribute('aTw', new THREE.BufferAttribute(bt, 1));
      const belt = new THREE.Points(bg, new THREE.ShaderMaterial({ uniforms: { uTime: starMats[0].uniforms.uTime, uPix: { value: renderer.getPixelRatio() }, uCol: { value: new THREE.Color(atmo) } },
        vertexShader: STAR_VS, fragmentShader: STAR_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      belt.rotation.x = .35; belt.rotation.z = -.2; grp.add(belt); ud.belt = belt;
    }
    grp.userData = ud; return grp;
  }

  /* ---------- route regions ---------- */
  const regions = {};
  let current = null, targetX = 0, camX = 0, lastCamX = 0, vis = 0, visT = 0;
  const m = { x: 0, y: 0, px: 0, py: 0, sx: -1, sy: -1 };

  function visibleAt(dist) { const h = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist; return { h, w: h * camera.aspect }; }

  /* specs: [{fx,fy,z,r,flags,service}], anchors: progress 0..1 per panel, travel: world units for progress 0→1 */
  function setRoute(index, specs, anchors, travel, { jump = false } = {}) {
    const key = index + ':' + specs.length;
    if (current) current.group.visible = false;
    let reg = regions[key];
    if (!reg || reg.travel !== travel || reg.aspect !== camera.aspect) {
      if (reg) scene.remove(reg.group);
      const group = new THREE.Group(), planets = [], start = index * REGION;
      specs.forEach((s, i) => {
        if (!s) return;
        const dist = camera.position.z - s.z, v = visibleAt(dist), mobile = camera.aspect < 1;
        const look = LOOKS[(index * 3 + i * 2) % LOOKS.length];
        const p = makePlanet({ ...s, r: s.r * (mobile ? .62 : 1) }, look, index * 11.3 + i * 3.7);
        const fx = mobile ? s.fx * .6 : s.fx;
        p.position.set(start + anchors[i] * travel + fx * v.w, s.fy * v.h * (mobile ? .55 : 1), s.z);
        p.userData.service = s.service; p.userData.name = s.name; p.userData.label = s.label;
        group.add(p); planets.push(p);
      });
      scene.add(group);
      reg = regions[key] = { group, planets, start, travel, aspect: camera.aspect };
    }
    reg.group.visible = true; current = reg;
    targetX = reg.start; if (jump || reduce) { camX = targetX; camera.position.x = camX; }
  }
  function setProgress(p) { if (current) targetX = current.start + p * current.travel; }
  function setVisible(v) { visT = v; }

  /* ---------- interaction ---------- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let hovered = null;
  addEventListener('pointermove', e => { m.x = e.clientX / innerWidth * 2 - 1; m.y = e.clientY / innerHeight * 2 - 1; m.sx = e.clientX; m.sy = e.clientY; }, { passive: true });
  addEventListener('pointerdown', e => {
    if (!hovered || vis < .5) return;
    if (e.target.closest('a,button,input,select,textarea,label,.card,.film,.jmap,.drawer,.modal')) return;
    onPlanetClick(hovered.userData);
  });
  function pick() {
    if (!current || vis < .5 || m.sx < 0) return null;
    const el = document.elementFromPoint(m.sx, m.sy);
    if (el && el.closest('a,button,input,select,textarea,.card,.film,.jmap,.drawer,.modal,header')) return null;
    ndc.set(m.x, -m.y); ray.setFromCamera(ndc, camera);
    const bodies = current.planets.map(p => p.userData.body || p.userData.core).filter(Boolean);
    const hit = ray.intersectObjects(bodies, false)[0];
    return hit ? current.planets.find(p => (p.userData.body || p.userData.core) === hit.object) : null;
  }

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  const tmp = new THREE.Vector3();
  let last = performance.now(), frameN = 0;
  function frame(now) {
    const dt = Math.min((now - last) / 16.67, 3); last = now; frameN++;
    vis += (visT - vis) * .06; host.style.opacity = vis.toFixed(3);
    if (vis > .01) {
      clock.t = now * .001;
      starMats.forEach(s => s.uniforms.uTime.value = clock.t);
      camX += (targetX - camX) * (reduce ? 1 : .07 * dt);
      const vx = camX - lastCamX; lastCamX = camX;
      streakMat.uniforms.uWarp.value += (Math.min(1.6, Math.max(0, Math.abs(vx) - .6) * .25) - streakMat.uniforms.uWarp.value) * .2;
      streaks.position.x = camX; streaks.scale.x = vx < 0 ? -1 : 1;
      m.px += (m.x - m.px) * .04; m.py += (m.y - m.py) * .04;
      camera.position.x = camX + m.px * 1.2;
      camera.position.y = -m.py * .8 + Math.sin(clock.t * .3) * .3;
      camera.lookAt(camera.position.x + m.px * 1.5, camera.position.y * .6, -30);
      camera.rotation.z = -vx * .004;
      camera.updateMatrixWorld();
      lightView.copy(lightWorld).transformDirection(camera.matrixWorldInverse);

      if (frameN % 3 === 0) {
        const h = pick();
        if (h !== hovered) { if (hovered) hovered.userData.hoverT = 0; hovered = h; if (h) h.userData.hoverT = 1; }
      }
      if (current) current.planets.forEach(p => {
        const u = p.userData; u.hover += (u.hoverT - u.hover) * .12;
        if (u.uniforms) { u.uniforms.uTime.value = clock.t; u.uniforms.uHover.value = u.hover; }
        if (u.body && !reduce) u.body.rotation.y += .0012 * dt;
        if (u.core) u.core.scale.setScalar(u.core.scale.x);
        u.moons && u.moons.forEach(mo => { const a = clock.t * mo.speed + mo.phase; mo.mesh.position.set(Math.cos(a) * mo.dist, Math.sin(a) * mo.dist * mo.tilt, Math.sin(a) * mo.dist); });
        if (u.belt && !reduce) u.belt.rotation.y += .0006 * dt;
        p.scale.setScalar(1 + u.hover * .05);
      });
      if (hovered) {
        tmp.copy(hovered.position); tmp.y += (hovered.userData.body ? hovered.userData.body.scale.x : 2) * 1.1; tmp.project(camera);
        onHover(hovered.userData, (tmp.x * .5 + .5) * innerWidth, (-tmp.y * .5 + .5) * innerHeight);
      } else onHover(null);
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return { setRoute, setProgress, setVisible, D, get hovered() { return hovered; } };
}
