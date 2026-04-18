// Tech-grid: mouse-driven horizontal scroll + right-fade overlay
(function () {
  const grids = document.querySelectorAll('.tech-grid');
  grids.forEach(function (grid) {
    let rafId = null;
    let target = null;

    function updateFade() {
      const fade = grid.parentElement.querySelector('.tech-fade');
      const hasMore = grid.scrollWidth > grid.clientWidth + 1;
      const show = hasMore && grid.scrollLeft < grid.scrollWidth - grid.clientWidth - 1;
      if (fade) {
        fade.classList.toggle('visible', show);
        grid.style.paddingRight = show ? (fade.offsetWidth + 'px') : '0px';
      }
    }

    updateFade();
    window.addEventListener('resize', updateFade);
    grid.addEventListener('scroll', updateFade);

    grid.addEventListener('mousemove', function (e) {
      if (!(grid.scrollWidth > grid.clientWidth + 1)) return;
      const rect = grid.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const pct = x / rect.width;
      const max = Math.max(0, grid.scrollWidth - grid.clientWidth);
      target = Math.round(max * pct);
      if (!rafId) rafId = requestAnimationFrame(step);
    });

    grid.addEventListener('mouseleave', function () {
      target = null;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    });

    function step() {
      if (target === null) { rafId = null; return; }
      const cur = grid.scrollLeft;
      const delta = (target - cur) * 0.18;
      if (Math.abs(delta) < 0.5) { grid.scrollLeft = target; target = null; rafId = null; return; }
      grid.scrollLeft = cur + delta;
      rafId = requestAnimationFrame(step);
    }
  });
})();

// Scroll-driven: hero gently fades and scales back as content panel rises over it
(function () {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  let raf = null;
  function update() {
    const y = window.scrollY || window.pageYOffset;
    const heroH = hero.offsetHeight || window.innerHeight;
    const progress = Math.min(1, y / heroH);
    hero.style.opacity = String(1 - progress * 0.55);
    hero.style.transform = 'scale(' + (1 - progress * 0.03) + ')';
    raf = null;
  }
  function onScroll() { if (raf) return; raf = requestAnimationFrame(update); }
  window.addEventListener('scroll', onScroll, { passive: true });
  update();
})();

// Soft-glow orb (WebGL)
(function () {
  var c = document.getElementById('orb-canvas');
  if (!c) return;
  var gl = c.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: false });
  if (!gl) { c.outerHTML = '<div class="orb-fallback"></div>'; return; }

  var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}';
  var FS = [
    'precision highp float;',
    'uniform float T;uniform vec2 R;uniform vec2 M;uniform float H;',
    '',
    'vec2 h2(vec2 p){',
    '  p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));',
    '  return -1.+2.*fract(sin(p)*43758.5453);',
    '}',
    'float n2(vec2 p){',
    '  vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);',
    '  return mix(mix(dot(h2(i),f),dot(h2(i+vec2(1,0)),f-vec2(1,0)),u.x),',
    '             mix(dot(h2(i+vec2(0,1)),f-vec2(0,1)),dot(h2(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);',
    '}',
    'float fbm(vec2 p){',
    '  float v=0.,a=.5;mat2 r=mat2(.877,.479,-.479,.877);',
    '  for(int i=0;i<4;i++){v+=a*n2(p);p=r*p*2.;a*=.5;}',
    '  return v;',
    '}',
    'float fbm3(vec2 p){',
    '  float v=0.,a=.5;mat2 r=mat2(.877,.479,-.479,.877);',
    '  for(int i=0;i<3;i++){v+=a*n2(p);p=r*p*2.;a*=.5;}',
    '  return v;',
    '}',
    '',
    'void main(){',
    '  vec2 uv=(gl_FragCoord.xy-.5*R)/min(R.x,R.y);',
    '  float d=length(uv);',
    '  float rad=.36;',
    '',
    '  // ── Thermal warp: slow noise displaces glow geometry ─────────',
    '  // Makes the halo organic/convective — slightly more vertical drift',
    '  // so the radiance reads like heat rising off a warm body.',
    '  float ts=T*.040;',
    '  vec2 hWarp=vec2(',
    '    fbm(uv*2.1+ts)*0.028,',
    '    fbm(uv*2.1+ts+vec2(1.9,.7))*0.038);',
    '  float hd=length(uv+hWarp);',
    '',
    '  // Glow: single smooth exponential — two terms at different rates',
    '  // create an inflection ring the eye reads as an artifact.',
    '  float ed_out=max(0.,hd-rad);',
    '  float gRaw=exp(-ed_out*6.5)*.68;',
    '  float surfA=1.-smoothstep(rad-.006,rad+.014,d);',
    '  float fa=max(surfA,gRaw)*smoothstep(rad*1.80,rad*.90,hd);',
    '  if(fa<.002){gl_FragColor=vec4(0.);return;}',
    '',
    '  vec2 nxy=uv/rad;',
    '  float nz=sqrt(max(0.,1.-dot(nxy,nxy)));',
    '',
    '  vec2 mUV=(M-.5*R)/min(R.x,R.y);',
    '  float mDist=length(uv-mUV);',
    '  float mProx=smoothstep(.42,.0,mDist)*H;',
    '  float mI=smoothstep(.55,.0,mDist)*H;',
    '',
    '  // ── Palette: drifting noise phase so colors roam freely ─────',
    '  // nz removed — it locked hues to geometry (always same rim color).',
    '  // Two fbm layers at different speeds create organic flowing zones.',
    '  float drift =fbm(uv*1.6+T*.07 +vec2(1.3,.7));',
    '  float drift2=fbm(uv*2.4+T*.041+vec2(4.1,2.3));',
    '  float ct=T*.085 + drift*.55 + drift2*.28 + mProx*.55;',
    '  vec3 albedo=vec3(',
    '    .70+.18*cos(6.2832*(ct      )),',
    '    .62+.15*cos(6.2832*(ct+.33  )),',
    '    .57+.12*cos(6.2832*(ct+.67  )));',
    '',
    '  // ── Shoreline wave foam — zero until cursor enters sphere ─────',
    '  float warpStr=mProx;',
    '  float s=T*.14;',
    '  vec2 q=vec2(fbm3(uv*5.+s), fbm3(uv*5.+vec2(3.7,1.3)+s));',
    '  float wDist=length(uv-mUV);',
    '  float turb=fbm(uv*4.5+q*1.4+s*1.1)*1.2;',
    '  float crest1=pow(max(0.,sin(wDist*26.-T*2.8+turb)),4.);',
    '  float crest2=pow(max(0.,sin(wDist*14.-T*1.9+turb*.7+1.57)),3.);',
    '  float waveFade=smoothstep(.40,.0,wDist)*warpStr;',
    '  float foam=(crest1*.65+crest2*.35)*waveFade;',
    '  foam+=fbm(uv*9.+q*2.+s*1.5)*crest1*waveFade*.55;',
    '  foam=clamp(foam,0.,1.);',
    '  albedo+=foam*vec3(.46,.50,.44);',
    '',
    '  // ── Blinn-Phong ───────────────────────────────────────────────',
    '  vec2 rw=vec2(fbm3(uv*4.+vec2(1.7,9.2)+s*.5),',
    '               fbm3(uv*4.+vec2(8.3,2.8)+s*.4))*warpStr*.04;',
    '  rw+=normalize(uv-mUV+vec2(.0001))*foam*.04;',
    '  vec3 N=normalize(vec3(nxy.x+rw.x, nxy.y+rw.y, nz));',
    '  vec3 L=normalize(vec3(-0.40+mI*.55,0.65,0.75));',
    '  vec3 Hv=normalize(L+vec3(0.,0.,1.));',
    '  float diff=max(0.,dot(N,L));',
    '  float spec=pow(max(0.,dot(N,Hv)),18.)*0.18;',
    '  float fresnel=pow(1.-nz,2.8);',
    '',
    '  // ── Breathing pulse ───────────────────────────────────────────',
    '  float breath=0.78+0.22*sin(T*.55);',
    '  float gTb=gRaw*breath;',
    '',
    '  vec3 surfCol=albedo*(.18+diff*.28+gTb*.36)',
    '              +vec3(.96,.95,1.)*spec',
    '              +albedo*fresnel*.22;',
    '',
    '  // Outer radiance gets a warm thermal tint (orange bias on the corona)',
    '  vec3 radTint=albedo+vec3(.10,.03,-.05);',
    '  vec3 fc=surfCol*surfA+radTint*gTb*(1.-surfA);',
    '  gl_FragColor=vec4(fc,fa);',
    '}'
  ].join('\n');

  function mk(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('Orb:', gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  var vs = mk(gl.VERTEX_SHADER, VS), fs = mk(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  var pg = gl.createProgram();
  gl.attachShader(pg, vs); gl.attachShader(pg, fs); gl.linkProgram(pg);
  if (!gl.getProgramParameter(pg, gl.LINK_STATUS)) return;
  gl.useProgram(pg);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  var aL = gl.getAttribLocation(pg, 'a');
  gl.enableVertexAttribArray(aL);
  gl.vertexAttribPointer(aL, 2, gl.FLOAT, false, 0, 0);

  var uT = gl.getUniformLocation(pg, 'T'), uR = gl.getUniformLocation(pg, 'R'),
      uM = gl.getUniformLocation(pg, 'M'), uH = gl.getUniformLocation(pg, 'H');

  var mouse = [0, 0], hover = 0, hTarget = 0, t0 = performance.now();

  function resize() {
    var dpr = Math.min(devicePixelRatio || 1, 2), rect = c.getBoundingClientRect(),
        w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; gl.viewport(0, 0, w, h); }
  }
  resize(); window.addEventListener('resize', resize);

  c.addEventListener('mousemove', function (e) {
    var rect = c.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    mouse[0] = (e.clientX - rect.left) * dpr;
    mouse[1] = (rect.height - (e.clientY - rect.top)) * dpr;
    hTarget = 1;
  });
  c.addEventListener('mouseleave', function () { hTarget = 0; });

  // Touch support for the orb (passive so page scroll isn't blocked)
  c.addEventListener('touchmove', function (e) {
    var t = e.touches[0];
    var rect = c.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    mouse[0] = (t.clientX - rect.left) * dpr;
    mouse[1] = (rect.height - (t.clientY - rect.top)) * dpr;
    hTarget = 1;
  }, { passive: true });
  c.addEventListener('touchstart', function (e) {
    var t = e.touches[0];
    var rect = c.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    mouse[0] = (t.clientX - rect.left) * dpr;
    mouse[1] = (rect.height - (t.clientY - rect.top)) * dpr;
    hTarget = 1;
  }, { passive: true });
  c.addEventListener('touchend', function () { hTarget = 0; });
  c.addEventListener('touchcancel', function () { hTarget = 0; });

  (function loop() {
    hover += (hTarget - hover) * 0.05;
    var time = (performance.now() - t0) / 1000;
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform1f(uT, time); gl.uniform2f(uR, c.width, c.height);
    gl.uniform2f(uM, mouse[0], mouse[1]); gl.uniform1f(uH, hover);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(loop);
  })();
})();
