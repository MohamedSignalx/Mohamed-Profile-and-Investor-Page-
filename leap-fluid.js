/* Navier–Stokes ink on the GPU: splat → advect → vorticity → project.
   Dye stores absorption, the display pass inverts it, so the canvas
   multiplies cleanly over the near-white page and the ghost word below. */
(function(){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var canvas = document.querySelector('[data-fluid]');
  if (!canvas) return;
  var OPTS = {alpha:true, premultipliedAlpha:false, antialias:false, depth:false, stencil:false, preserveDrawingBuffer:true};
  var gl = canvas.getContext('webgl2', OPTS), is2 = !!gl;
  if (!gl) gl = canvas.getContext('webgl', OPTS) || canvas.getContext('experimental-webgl', OPTS);
  if (!gl) return;

  // float render targets are the whole ballgame — probe, don't assume
  var TEX, FILTER;
  (function(){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var linear;
    if (is2){
      gl.getExtension('EXT_color_buffer_float');
      linear = gl.getExtension('OES_texture_float_linear');
      TEX = {internal: gl.RGBA16F, format: gl.RGBA, type: gl.HALF_FLOAT};
    } else {
      var hf = gl.getExtension('OES_texture_half_float');
      gl.getExtension('EXT_color_buffer_half_float');
      linear = gl.getExtension('OES_texture_half_float_linear');
      TEX = hf ? {internal: gl.RGBA, format: gl.RGBA, type: hf.HALF_FLOAT_OES} : null;
    }
    function renderable(t){
      if (!t) return false;
      var tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, t.internal, 4, 4, 0, t.format, t.type, null);
      var f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      var ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.deleteFramebuffer(f); gl.deleteTexture(tex);
      return ok;
    }
    if (!renderable(TEX) && is2) TEX = renderable({internal: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT})
      ? {internal: gl.RGBA32F, format: gl.RGBA, type: gl.FLOAT} : null;
    if (!TEX) { canvas.style.display = 'none'; throw new Error('no float render target'); }
    FILTER = linear ? gl.LINEAR : gl.NEAREST;
  })();

  var SIM = 140, DYE = 640;
  var CFG = {
    dt: 0.016,
    velDiss: 0.18,     // how fast motion calms
    dyeDiss: 0.55,     // ink lingers, then bleeds away
    pressure: 0.8,
    iterations: 20,
    curl: 34,          // filament detail
    radius: 0.0045
  };

  function compile(type, src){
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(s));
    return s;
  }
  function program(vs, fs){
    var p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs);
    gl.bindAttribLocation(p, 0, 'aPosition');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) console.warn(gl.getProgramInfoLog(p));
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++){ var nm = gl.getActiveUniform(p, i).name; u[nm] = gl.getUniformLocation(p, nm); }
    return {p:p, u:u};
  }

  var baseVS = compile(gl.VERTEX_SHADER, [
    'precision highp float;','attribute vec2 aPosition;',
    'varying vec2 vUv,vL,vR,vT,vB;','uniform vec2 texelSize;',
    'void main(){vUv=aPosition*0.5+0.5;',
    'vL=vUv-vec2(texelSize.x,0.0);vR=vUv+vec2(texelSize.x,0.0);',
    'vT=vUv+vec2(0.0,texelSize.y);vB=vUv-vec2(0.0,texelSize.y);',
    'gl_Position=vec4(aPosition,0.0,1.0);}'].join('\n'));

  function FS(src){ return compile(gl.FRAGMENT_SHADER, 'precision highp float;precision highp sampler2D;\n' + src); }

  var clearP = program(baseVS, FS(
    'varying vec2 vUv;uniform sampler2D uTexture;uniform float value;' +
    'void main(){gl_FragColor=value*texture2D(uTexture,vUv);}'));

  var splatP = program(baseVS, FS(
    'varying vec2 vUv;uniform sampler2D uTarget;uniform float aspectRatio;' +
    'uniform vec3 color;uniform vec2 point;uniform float radius;' +
    'void main(){vec2 p=vUv-point.xy;p.x*=aspectRatio;' +
    'vec3 splat=exp(-dot(p,p)/radius)*color;' +
    'vec3 base=texture2D(uTarget,vUv).xyz;gl_FragColor=vec4(base+splat,1.0);}'));

  var advectP = program(baseVS, FS(
    'varying vec2 vUv;uniform sampler2D uVelocity;uniform sampler2D uSource;' +
    'uniform vec2 texelSize;uniform float dt;uniform float dissipation;' +
    'void main(){vec2 coord=vUv-dt*texture2D(uVelocity,vUv).xy*texelSize;' +
    'vec4 result=texture2D(uSource,coord);' +
    'float decay=1.0+dissipation*dt;gl_FragColor=result/decay;}'));

  var divP = program(baseVS, FS(
    'varying vec2 vUv,vL,vR,vT,vB;uniform sampler2D uVelocity;' +
    'void main(){float L=texture2D(uVelocity,vL).x;float R=texture2D(uVelocity,vR).x;' +
    'float T=texture2D(uVelocity,vT).y;float B=texture2D(uVelocity,vB).y;' +
    'vec2 C=texture2D(uVelocity,vUv).xy;' +
    'if(vL.x<0.0)L=-C.x; if(vR.x>1.0)R=-C.x; if(vT.y>1.0)T=-C.y; if(vB.y<0.0)B=-C.y;' +
    'float div=0.5*(R-L+T-B);gl_FragColor=vec4(div,0.0,0.0,1.0);}'));

  var curlP = program(baseVS, FS(
    'varying vec2 vUv,vL,vR,vT,vB;uniform sampler2D uVelocity;' +
    'void main(){float L=texture2D(uVelocity,vL).y;float R=texture2D(uVelocity,vR).y;' +
    'float T=texture2D(uVelocity,vT).x;float B=texture2D(uVelocity,vB).x;' +
    'gl_FragColor=vec4(R-L-T+B,0.0,0.0,1.0);}'));

  var vortP = program(baseVS, FS(
    'varying vec2 vUv,vL,vR,vT,vB;uniform sampler2D uVelocity;uniform sampler2D uCurl;' +
    'uniform float curl;uniform float dt;' +
    'void main(){float L=texture2D(uCurl,vL).x;float R=texture2D(uCurl,vR).x;' +
    'float T=texture2D(uCurl,vT).x;float B=texture2D(uCurl,vB).x;float C=texture2D(uCurl,vUv).x;' +
    'vec2 force=0.5*vec2(abs(T)-abs(B),abs(R)-abs(L));' +
    'force/=length(force)+0.0001;force*=curl*C;force.y*=-1.0;' +
    'vec2 vel=texture2D(uVelocity,vUv).xy+force*dt;' +
    'vel=min(max(vel,-1000.0),1000.0);gl_FragColor=vec4(vel,0.0,1.0);}'));

  var pressP = program(baseVS, FS(
    'varying vec2 vUv,vL,vR,vT,vB;uniform sampler2D uPressure;uniform sampler2D uDivergence;' +
    'void main(){float L=texture2D(uPressure,vL).x;float R=texture2D(uPressure,vR).x;' +
    'float T=texture2D(uPressure,vT).x;float B=texture2D(uPressure,vB).x;' +
    'float divergence=texture2D(uDivergence,vUv).x;' +
    'gl_FragColor=vec4((L+R+B+T-divergence)*0.25,0.0,0.0,1.0);}'));

  var gradP = program(baseVS, FS(
    'varying vec2 vUv,vL,vR,vT,vB;uniform sampler2D uPressure;uniform sampler2D uVelocity;' +
    'void main(){float L=texture2D(uPressure,vL).x;float R=texture2D(uPressure,vR).x;' +
    'float T=texture2D(uPressure,vT).x;float B=texture2D(uPressure,vB).x;' +
    'vec2 vel=texture2D(uVelocity,vUv).xy-vec2(R-L,T-B);gl_FragColor=vec4(vel,0.0,1.0);}'));

  // dye holds absorption; invert it so blank stays white under multiply
  var showP = program(baseVS, FS(
    'varying vec2 vUv;uniform sampler2D uTexture;' +
    'void main(){vec3 a=texture2D(uTexture,vUv).rgb;' +
    'a=min(a,vec3(0.42));' +
    'vec3 c=clamp(1.0-a,0.0,1.0);' +
    'gl_FragColor=vec4(c,1.0);}'));

  var quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, -1,1, 1,1, 1,-1]), gl.STATIC_DRAW);
  var idx = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0,1,2, 0,2,3]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(0);

  function blit(target){
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx);
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fbo : null);
    gl.viewport(0, 0, target ? target.w : gl.drawingBufferWidth, target ? target.h : gl.drawingBufferHeight);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  function fbo(w, h, filter){
    gl.activeTexture(gl.TEXTURE0);
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, TEX.internal, w, h, 0, TEX.format, TEX.type, null);
    var f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) console.warn('fbo incomplete', w, h);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return {tex:tex, fbo:f, w:w, h:h, texelX:1/w, texelY:1/h,
      attach:function(id){ gl.activeTexture(gl.TEXTURE0 + id); gl.bindTexture(gl.TEXTURE_2D, tex); return id; }};
  }
  function dbl(w, h, filter){
    var a = fbo(w, h, filter), b = fbo(w, h, filter);
    return {w:w, h:h, texelX:1/w, texelY:1/h,
      get read(){ return a; }, get write(){ return b; },
      swap:function(){ var t = a; a = b; b = t; }};
  }

  var velocity, dye, divergence, curlTex, pressure, simW, simH, dyeW, dyeH;
  function init(){
    var ar = canvas.width / canvas.height || 1;
    simW = Math.round(ar >= 1 ? SIM * ar : SIM);  simH = Math.round(ar >= 1 ? SIM : SIM / ar);
    dyeW = Math.round(ar >= 1 ? DYE * ar : DYE);  dyeH = Math.round(ar >= 1 ? DYE : DYE / ar);
    velocity   = dbl(simW, simH, FILTER);
    dye        = dbl(dyeW, dyeH, FILTER);
    divergence = fbo(simW, simH, gl.NEAREST);
    curlTex    = fbo(simW, simH, gl.NEAREST);
    pressure   = dbl(simW, simH, gl.NEAREST);
  }

  function resize(){
    var dpr = Math.min(devicePixelRatio || 1, 2);
    var w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width === w && canvas.height === h) return false;
    canvas.width = w; canvas.height = h;
    return true;
  }
  resize(); init();
  addEventListener('resize', function(){ if (resize()) init(); }, {passive:true});

  function use(prog){ gl.useProgram(prog.p); }

  function splat(px, py, dx, dy, color, rad){
    use(splatP);
    gl.uniform1i(splatP.u.uTarget, velocity.read.attach(0));
    gl.uniform1f(splatP.u.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(splatP.u.point, px, py);
    gl.uniform3f(splatP.u.color, dx, dy, 0);
    gl.uniform1f(splatP.u.radius, rad || CFG.radius);
    blit(velocity.write); velocity.swap();

    gl.uniform1i(splatP.u.uTarget, dye.read.attach(0));
    gl.uniform3f(splatP.u.color, color[0], color[1], color[2]);
    blit(dye.write); dye.swap();
  }

  // the profile's own palette, stored as absorption (1 - colour)
  var INKS = [
    [0.52,0.88,0.08],   // violet  #7A1FEA
    [0.39,0.72,0.00],   // purple  #9B47FF
    [0.28,0.55,0.00],   // lift    #B872FF
    [0.28,0.55,0.00],
    [0.16,0.04,0.04],   // aqua    #D6F6F6
    [0.01,0.14,0.05],   // blush   #FDDCF2
    [0.11,0.15,0.02],   // lavender #E4DBFB
    [0.91,0.30,0.33]    // teal    #16B3AC
  ];
  function ink(strength){
    var c = INKS[(Math.random() * INKS.length) | 0];
    return [c[0]*strength, c[1]*strength, c[2]*strength];
  }

  var ptr = {x:.5, y:.5, px:.5, py:.5, moved:false, live:false};
  function aim(cx, cy){
    var r = canvas.getBoundingClientRect();
    ptr.px = ptr.x; ptr.py = ptr.y;
    ptr.x = (cx - r.left) / r.width;
    ptr.y = 1 - (cy - r.top) / r.height;
    ptr.moved = true; ptr.live = true;
  }
  addEventListener('pointermove', function(e){ aim(e.clientX, e.clientY); }, {passive:true});
  addEventListener('touchmove', function(e){ if (e.touches[0]) aim(e.touches[0].clientX, e.touches[0].clientY); }, {passive:true});
  addEventListener('pointerleave', function(){ ptr.live = false; }, {passive:true});

  // an opening bloom so the hero is never empty
  for (var i = 0; i < 9; i++){
    var a = Math.random() * 6.283;
    splat(0.14 + Math.random() * .74, 0.2 + Math.random() * .6,
      Math.cos(a) * 1100, Math.sin(a) * 1100, ink(.3 + Math.random() * .25), CFG.radius * 2.6);
  }

  var last = performance.now(), idle = 0;
  function step(now){
    requestAnimationFrame(step);
    var dt = Math.min((now - last) / 1000, 0.0166); last = now;

    if (ptr.moved){
      ptr.moved = false;
      var dx = (ptr.x - ptr.px) * canvas.width * 5.2;
      var dy = (ptr.y - ptr.py) * canvas.height * 5.2;
      var speed = Math.min(Math.sqrt(dx*dx + dy*dy) / 900, 1.6);
      splat(ptr.x, ptr.y, dx, dy, ink(0.2 + speed * 0.42), CFG.radius * (0.8 + speed * 1.0));
      idle = 0;
    } else if (!ptr.live) {
      // a slow curl of its own so the page breathes
      idle += dt;
      if (idle > 1.1){
        idle = 0;
        var t = now * 0.00016, ax = .5 + Math.cos(t) * .34, ay = .5 + Math.sin(t * 1.3) * .28;
        splat(ax, ay, Math.cos(t * 2.1) * 520, Math.sin(t * 1.7) * 520, ink(.24), CFG.radius * 2.4);
      }
    }

    gl.disable(gl.BLEND);

    use(curlP);
    gl.uniform2f(curlP.u.texelSize, velocity.texelX, velocity.texelY);
    gl.uniform1i(curlP.u.uVelocity, velocity.read.attach(0));
    blit(curlTex);

    use(vortP);
    gl.uniform2f(vortP.u.texelSize, velocity.texelX, velocity.texelY);
    gl.uniform1i(vortP.u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(vortP.u.uCurl, curlTex.attach(1));
    gl.uniform1f(vortP.u.curl, CFG.curl);
    gl.uniform1f(vortP.u.dt, dt);
    blit(velocity.write); velocity.swap();

    use(divP);
    gl.uniform2f(divP.u.texelSize, velocity.texelX, velocity.texelY);
    gl.uniform1i(divP.u.uVelocity, velocity.read.attach(0));
    blit(divergence);

    use(clearP);
    gl.uniform1i(clearP.u.uTexture, pressure.read.attach(0));
    gl.uniform1f(clearP.u.value, CFG.pressure);
    blit(pressure.write); pressure.swap();

    use(pressP);
    gl.uniform2f(pressP.u.texelSize, velocity.texelX, velocity.texelY);
    gl.uniform1i(pressP.u.uDivergence, divergence.attach(0));
    for (var k = 0; k < CFG.iterations; k++){
      gl.uniform1i(pressP.u.uPressure, pressure.read.attach(1));
      blit(pressure.write); pressure.swap();
    }

    use(gradP);
    gl.uniform2f(gradP.u.texelSize, velocity.texelX, velocity.texelY);
    gl.uniform1i(gradP.u.uPressure, pressure.read.attach(0));
    gl.uniform1i(gradP.u.uVelocity, velocity.read.attach(1));
    blit(velocity.write); velocity.swap();

    use(advectP);
    gl.uniform2f(advectP.u.texelSize, velocity.texelX, velocity.texelY);
    gl.uniform1i(advectP.u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(advectP.u.uSource, velocity.read.attach(0));
    gl.uniform1f(advectP.u.dt, dt);
    gl.uniform1f(advectP.u.dissipation, CFG.velDiss);
    blit(velocity.write); velocity.swap();

    gl.uniform1i(advectP.u.uVelocity, velocity.read.attach(0));
    gl.uniform1i(advectP.u.uSource, dye.read.attach(1));
    gl.uniform1f(advectP.u.dissipation, CFG.dyeDiss);
    blit(dye.write); dye.swap();

    use(showP);
    gl.uniform1i(showP.u.uTexture, dye.read.attach(0));
    blit(null);
  }
  requestAnimationFrame(step);
})();