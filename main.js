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
    '',
    'float n2(vec2 p){',
    '  vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);',
    '  return mix(mix(dot(h2(i),f),dot(h2(i+vec2(1,0)),f-vec2(1,0)),u.x),',
    '             mix(dot(h2(i+vec2(0,1)),f-vec2(0,1)),dot(h2(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);',
    '}',
    '',
    'float fbm(vec2 p){',
    '  float v=0.,a=.5;mat2 r=mat2(.877,.479,-.479,.877);',
    '  for(int i=0;i<4;i++){v+=a*n2(p);p=r*p*2.;a*=.5;}',
    '  return v;',
    '}',
    '',
    'void main(){',
    '  vec2 uv=(gl_FragCoord.xy-.5*R)/min(R.x,R.y);',
    '  float t=T,d=length(uv),ang=atan(uv.y,uv.x);',
    '',
    '  // Organic surface deformation',
    '  float w=fbm(vec2(ang*2.+t*.3,d*5.-t*.2))*.05;',
    '  w+=sin(ang*3.+t*.5)*.012+sin(ang*7.-t*.35)*.006;',
    '  w+=sin(t*.6)*.006;',
    '',
    '  // Mouse interaction',
    '  vec2 mUV=(M-.5*R)/min(R.x,R.y);',
    '  float mD=length(uv-mUV),mI=smoothstep(.5,.0,mD)*H;',
    '  w+=mI*.06;',
    '  vec2 dUV=uv+(mUV-uv)*mI*.1;',
    '  float ed=length(dUV)-w;',
    '',
    '  // Orb shape + glow layers',
    '  float rad=.34;',
    '  float orb=1.-smoothstep(rad-.08,rad+.03,ed);',
    '  float g1=exp(-ed*3.2)*.45;',
    '  float g2=exp(-ed*1.5)*.12;',
    '  float core=exp(-ed*9.)*.35;',
    '',
    '  // Color — cosine palette (blue / teal / purple cycle)',
    '  float ct=t*.07+d*.9+fbm(uv*2.5+t*.12)*.25+mI*.35;',
    '  vec3 col=clamp(vec3(',
    '    .52+.38*cos(6.2832*(ct+.00)),',
    '    .50+.40*cos(6.2832*(ct+.13)),',
    '    .68+.32*cos(6.2832*(ct+.32))),0.,1.);',
    '',
    '  float a=clamp(orb*.88+g1+g2+core,0.,1.);',
    '  vec3 fc=col*(orb*.88+g1)+col*.6*g2+vec3(.92,.90,1.)*core*1.8;',
    '  gl_FragColor=vec4(fc,a);',
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
