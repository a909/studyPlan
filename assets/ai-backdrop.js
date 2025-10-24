/*!
 * AI Backdrop v1.0 (pure JS, no <script> wrapper)
 * Usage:
 *   <link rel="stylesheet" href="./ai-backdrop.css">
 *   <script src="./ai-backdrop.js"></script>
 *   <script>
 *     const bg = AIBackdrop.init({ mount: '#backdrop', fov: 26, speed: 0.3 });
 *   </script>
 */
(function (global){
  const defaults = {
    mount: 'body',
    fov: 26,             // deg
    speed: 0.3,          // rad/s
    ringsGap: 38,
    gridGap: 44,
    density: 140,
    meshDensityBase: 5200,
    colors: {
      beamStart: 'rgba(64,224,208,0.16)',
      beamEnd:   'rgba(255,255,255,0.04)',
      ring:      'rgba(0,169,149,.06)',
      grid:      'rgba(0,144,255,.40)',
      bgDot:     'rgba(34,148,175,.08)',
      beamDot:   'rgba(0,198,169,',  // 结尾会加透明度
      link:      'rgba(0,144,255,',  // 结尾会加透明度
      halo0:     'rgba(167,247,236,.14)',
      halo1:     'rgba(186,230,253,.08)'
    }
  };

  function init(user){
    const opt = Object.assign({}, defaults, user||{});
    const mountEl = typeof opt.mount === 'string' ? document.querySelector(opt.mount) : opt.mount;
    if (!mountEl) { throw new Error('AIBackdrop: mount element not found.'); }
    if (mountEl.__AIBackdrop__) return mountEl.__AIBackdrop__; // prevent duplicate

    // host
    const host = document.createElement('div');
    host.className = 'ai-backdrop';
    const cRadar = document.createElement('canvas');
    const cMesh  = document.createElement('canvas');
    const scan   = document.createElement('div');
    scan.className = 'ai-scan';
    host.appendChild(cRadar);
    host.appendChild(cMesh);
    host.appendChild(scan);

    if (mountEl === document.body){
      document.body.prepend(host);
      host.style.position = 'fixed';
      host.style.inset = '0';
      host.style.zIndex = '-2';
      host.style.pointerEvents = 'none';
    } else {
      const cs = getComputedStyle(mountEl).position;
      if (cs === 'static' || !cs) mountEl.style.position = 'relative';
      Object.assign(host.style, { position:'absolute', inset:'0', zIndex:'-1', pointerEvents:'none' });
      mountEl.appendChild(host);
    }

    const ctxR = cRadar.getContext('2d');
    const ctxM = cMesh.getContext('2d');
    const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    let w=0, h=0, dpr=1, last=0, theta=0, rafId=null;
    const radar = { x:0, y:0, r:0, fov: opt.fov*Math.PI/180, ringsGap: opt.ringsGap, gridGap: opt.gridGap, speed: opt.speed };
    const farPts = [];
    let nearPts = [];

    function setCanvasSize(c, W, H, _dpr){
      c.style.width  = W + 'px';
      c.style.height = H + 'px';
      c.width  = Math.max(1, Math.floor(W*_dpr));
      c.height = Math.max(1, Math.floor(H*_dpr));
    }

    function resize(){
      dpr = Math.max(1, window.devicePixelRatio || 1);
      const rect = host.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      setCanvasSize(cRadar, w, h, dpr);
      setCanvasSize(cMesh,  w, h, dpr);
      ctxR.setTransform(dpr,0,0,dpr,0,0);
      ctxM.setTransform(dpr,0,0,dpr,0,0);

      radar.r = Math.hypot(w,h) * 0.6 * 1.2;
      radar.x = w * 0.5;
      radar.y = h * 0.5;

      farPts.length = 0;
      for(let i=0;i<opt.density;i++){
        farPts.push({
          x: Math.random()*w*1.2 - w*0.1,
          y: Math.random()*h*1.2 - h*0.1,
          vx:(Math.random()-.5)*0.45,
          vy:(Math.random()-.5)*0.45,
          b: Math.random()*2
        });
      }
      const N = Math.min(140, Math.floor((w*h)/opt.meshDensityBase));
      nearPts = new Array(N).fill(0).map(()=>({
        x: Math.random()*w, y: Math.random()*h,
        vx:(Math.random()-.5)*0.22, vy:(Math.random()-.5)*0.22
      }));
      drawOnce();
    }

    const ang = (px,py)=>Math.atan2(py-radar.y, px-radar.x);
    function angDiff(a,b){ let d=a-b; while(d>Math.PI)d-=Math.PI*2; while(d<-Math.PI)d+=Math.PI*2; return Math.abs(d); }

    function drawStatic(){
      const {x,y,r,ringsGap,gridGap} = radar;
      const C = opt.colors;

      const g = ctxR.createRadialGradient(x,y,0, x,y,r*1.6);
      g.addColorStop(0.00, C.halo0);
      g.addColorStop(0.55, C.halo1);
      g.addColorStop(1.00, 'rgba(186,230,253,0)');
      ctxR.fillStyle=g; ctxR.fillRect(0,0,w,h);

      ctxR.save();
      ctxR.globalAlpha=.10;
      ctxR.strokeStyle=C.grid;
      ctxR.lineWidth=1;
      for(let gy=(y - r*1.6); gy<= (y + r*1.6); gy += gridGap){
        ctxR.beginPath(); ctxR.moveTo(x - r*1.6, gy); ctxR.lineTo(x + r*1.6, gy); ctxR.stroke();
      }
      for(let gx=(x - r*1.6); gx<= (x + r*1.6); gx += gridGap){
        ctxR.beginPath(); ctxR.moveTo(gx, y - r*1.6); ctxR.lineTo(gx, y + r*1.6); ctxR.stroke();
      }
      ctxR.restore();

      ctxR.save();
      ctxR.strokeStyle=C.ring;
      ctxR.lineWidth=0.8;
      for(let rr=ringsGap; rr<r*1.4; rr+=ringsGap){
        ctxR.beginPath(); ctxR.arc(x,y,rr,0,Math.PI*2); ctxR.stroke();
      }
      ctxR.restore();
    }

    function drawBeam(th){
      const {x,y} = radar;
      const half = radar.fov/2;
      const a0 = th - half, a1 = th + half;
      const R  = Math.hypot(w,h) * 1.1;

      ctxR.save();
      ctxR.beginPath(); ctxR.moveTo(x,y); ctxR.arc(x,y,R, a0, a1); ctxR.closePath();
      ctxR.fillStyle = 'rgba(125,236,255,0.03)';
      ctxR.fill();
      ctxR.clip();

      const steps = 72;
      const da = (a1 - a0) / steps;
      const start = { r: 64, g:224, b:208, a:0.16 };
      const end   = { r:255, g:255, b:255, a:0.04 };
      const lerp = (a,b,t)=>a+(b-a)*t;

      for(let i=0;i<steps;i++){
        const t = i/(steps-1);
        const aa = a0 + da*i, bb = aa + da + 0.0003;
        const r = Math.round(lerp(start.r,end.r,t));
        const g = Math.round(lerp(start.g,end.g,t));
        const b = Math.round(lerp(start.b,end.b,t));
        const a = lerp(start.a,end.a,t);
        ctxR.fillStyle = `rgba(${r},${g},${b},${a})`;
        ctxR.beginPath(); ctxR.moveTo(x,y); ctxR.arc(x,y,R, aa, bb); ctxR.closePath(); ctxR.fill();
      }
      ctxR.globalAlpha = 0.12;
      ctxR.strokeStyle = 'rgba(126,234,217,0.55)';
      ctxR.lineWidth   = 1.2;
      ctxR.beginPath(); ctxR.arc(x,y,R*0.985, a0, a1); ctxR.stroke();
      ctxR.restore();
    }

    function stepFarPts(dt){
      for(const p of farPts){
        p.x+=p.vx*dt*60; p.y+=p.vy*dt*60;
        if(p.x<-40)p.x=w+40; if(p.x>w+40)p.x=-40;
        if(p.y<-40)p.y=h+40; if(p.y>h+40)p.y=-40;
      }
    }

    function drawFarPts(th){
      const half=radar.fov/2, linkR=120, C=opt.colors;
      for(const p of farPts){
        ctxR.fillStyle=C.bgDot;
        ctxR.beginPath(); ctxR.arc(p.x,p.y,1.4,0,Math.PI*2); ctxR.fill();
      }
      ctxR.lineWidth=1;
      for(let i=0;i<farPts.length;i++){
        const a=farPts[i], ia=ang(a.x,a.y), inB=angDiff(ia, th)<half;
        if(!inB) continue;
        const pulse=.85+.15*Math.sin((performance.now()/420)+(a.b||0));
        ctxR.fillStyle = `${C.beamDot}${.62*pulse})`;
        ctxR.beginPath(); ctxR.arc(a.x,a.y,2.1,0,Math.PI*2); ctxR.fill();

        for(let j=i+1;j<farPts.length;j++){
          const b=farPts[j], jb=ang(b.x,b.y);
          if(angDiff(jb, th)<half){
            const dx=a.x-b.x, dy=a.y-b.y, d=Math.hypot(dx,dy);
            if(d<linkR){
              const al=(1-d/linkR)*.26;
              ctxR.strokeStyle = `${C.link}${al})`;
              ctxR.beginPath(); ctxR.moveTo(a.x,a.y); ctxR.lineTo(b.x,b.y); ctxR.stroke();
            }
          }
        }
      }
    }

    function stepNearPts(){
      for(const p of nearPts){
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<-20)p.x=w+20; if(p.x>w+20)p.x=-20;
        if(p.y<-20)p.y=h+20; if(p.y>h+20)p.y=-20;
      }
    }

    function drawNear(){
      ctxM.clearRect(0,0,w,h);
      for(const p of nearPts){
        ctxM.fillStyle='rgba(0,144,255,.07)';
        ctxM.beginPath(); ctxM.arc(p.x,p.y,1.2,0,Math.PI*2); ctxM.fill();
      }
      const maxD=Math.min(140,Math.max(90,Math.sqrt(w*h)/9));
      for(let i=0;i<nearPts.length;i++)for(let j=i+1;j<nearPts.length;j++){
        const a=nearPts[i],b=nearPts[j],dx=a.x-b.x,dy=a.y-b.y,d2=dx*dx+dy*dy;
        if(d2<maxD*maxD){
          const al=(1-Math.sqrt(d2)/maxD)*.09;
          ctxM.strokeStyle=`rgba(0,144,255,${al})`;
          ctxM.lineWidth=1; ctxM.beginPath(); ctxM.moveTo(a.x,a.y); ctxM.lineTo(b.x,b.y); ctxM.stroke();
        }
      }
    }

    function drawOnce(){
      ctxR.clearRect(0,0,w,h);
      drawStatic();
      drawBeam(theta);
      drawFarPts(theta);
      drawNear();
    }

    function frame(ts){
      if(!last) last=ts;
      const dt=Math.min(0.033,(ts-last)/1000); last=ts;
      theta += radar.speed*dt;

      ctxR.clearRect(0,0,w,h);
      drawStatic();
      drawBeam(theta);
      stepFarPts(dt);
      drawFarPts(theta);

      stepNearPts();
      drawNear();

      if(!reduce) rafId = requestAnimationFrame(frame);
    }

    function start(){
      if(rafId==null && !reduce){ rafId = requestAnimationFrame(frame); }
      else if(reduce){ drawOnce(); }
    }
    function stop(){ if(rafId!=null){ cancelAnimationFrame(rafId); rafId=null; } }
    function destroy(){
      stop();
      window.removeEventListener('resize', resize);
      host.remove();
      delete mountEl.__AIBackdrop__;
    }

    window.addEventListener('resize', resize, { passive:true });
    resize(); start();

    const api = {
      start, stop, destroy, resize,
      setSpeed:(s)=>{ radar.speed = +s || 0; },
      setFov:(deg)=>{ radar.fov = (+deg||0) * Math.PI/180; }
    };
    mountEl.__AIBackdrop__ = api;
    return api;
  }

  // export to global
  global.AIBackdrop = { init };
})(window);
