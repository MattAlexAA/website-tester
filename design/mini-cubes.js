(function(){
  /* ---------- small 3D cubes in place of the flat logo marks ----------
     One shared WebGL renderer draws every visible mark and copies it into that mark's own small canvas,
     so a page full of logos costs one 3D context. Each cube shows its letter face, turned to a 3/4 view
     with a slow drift; hovering one spins it a full turn.
     mode 'badges': only the big badge on each package page. mode 'all': every ASAP mark on the site. */
  if(!window.THREE) return;
  var MODE = 'badges';
  try{ MODE = localStorage.getItem('asap-logos') || 'badges'; }catch(e){}
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var A = [0,1,1,1,0, 1,0,0,0,1, 1,1,1,1,1, 1,0,0,0,1, 1,0,0,0,1];
  var S = [0,1,1,1,1, 1,0,0,0,0, 0,1,1,1,0, 0,0,0,0,1, 1,1,1,1,0];
  var P = [1,1,1,1,0, 1,0,0,0,1, 1,1,1,1,0, 1,0,0,0,0, 1,0,0,0,0];
  var Q = [0,1,1,1,0, 0,0,0,0,1, 0,0,1,1,0, 0,0,0,0,0, 0,0,1,0,0];
  var X = [0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0, 0,0,0,0,0, 0,0,1,0,0];
  var WHITE = 0xFFFBFB, RED = 0xFF0000, BLUE = 0x0048FF, GREEN = 0x00C24A, ORANGE = 0xFF6A00, ACID = 0xF9FF2D, INK = 0x111116;
  var H = 2, GAP = 1.06, SPAN = 4 * GAP + 1;

  var bodyGeo = new THREE.BoxGeometry(1, 1, 1), bodyMat = new THREE.MeshLambertMaterial({color:0x050505});
  var stickerGeo = new THREE.PlaneGeometry(0.84, 0.84), mats = {};
  function mat(c){ return mats[c] || (mats[c] = new THREE.MeshLambertMaterial({color:c})); }
  function tile(pat, col, row, face){ return pat[row*5 + col] ? WHITE : face; }
  function buildCube(){
    var g = new THREE.Group();
    function sticker(c, n, color){
      var s = new THREE.Mesh(stickerGeo, mat(color));
      s.position.copy(n).multiplyScalar(0.502); s.lookAt(n.clone().multiplyScalar(2)); c.add(s);
    }
    for(var x=-H; x<=H; x++) for(var y=-H; y<=H; y++) for(var z=-H; z<=H; z++){
      if(Math.max(Math.abs(x),Math.abs(y),Math.abs(z)) < H) continue;
      var c = new THREE.Mesh(bodyGeo, bodyMat), row = H - y;
      c.position.set(x*GAP, y*GAP, z*GAP);
      if(z ===  H) sticker(c, new THREE.Vector3(0,0,1),  tile(A, x+H, row, RED));
      if(x === -H) sticker(c, new THREE.Vector3(-1,0,0), tile(S, z+H, row, BLUE));
      if(z === -H) sticker(c, new THREE.Vector3(0,0,-1), tile(A, H-x, row, GREEN));
      if(x ===  H) sticker(c, new THREE.Vector3(1,0,0),  tile(P, H-z, row, ORANGE));
      if(y ===  H) sticker(c, new THREE.Vector3(0,1,0),  tile(Q, x+H, z+H, ACID));
      if(y === -H) sticker(c, new THREE.Vector3(0,-1,0), X[(H-z)*5 + x+H] ? INK : WHITE);
      g.add(c);
    }
    return g;
  }

  var Y = new THREE.Vector3(0,1,0);
  function faceQ(i){ return new THREE.Quaternion().setFromAxisAngle(Y, i * Math.PI/2); }
  var TILT = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.42, -0.58, 0));
  var FACE_BY_COLOUR = {red:0, blue:1, green:2, orange:3};
  function faceOf(el){
    var m = null;
    for(var n = el; n && !m; n = n.parentElement){ m = /--c:\s*var\(--(red|blue|green|orange)\)/.exec(n.getAttribute && n.getAttribute('style') || ''); }
    return m ? FACE_BY_COLOUR[m[1]] : 0;
  }

  var renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);
  var scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.72));
  var key = new THREE.DirectionalLight(0xffffff, 0.45); key.position.set(-4, 8, 10); scene.add(key);
  var under = new THREE.DirectionalLight(0xffffff, 0.3); under.position.set(2, -8, 4); scene.add(under);
  var cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200); cam.position.z = 100;

  var items = [];       // one per mark group: {host, canvas, ctx, w, h, pad, cubes: [{group, face, el, x, y, size, phase, spin0, arrive0}]}
  function mount(host, marks){
    var hr = host.getBoundingClientRect();
    if(!hr.width) return;
    var size0 = marks[0].getBoundingClientRect().width, pad = Math.round(size0 * 0.45);
    if(getComputedStyle(host).position === 'static') host.style.position = 'relative';
    var cv = document.createElement('canvas'); cv.className = 'mini3d';
    cv.style.cssText = 'position:absolute;left:' + -pad + 'px;top:' + -pad + 'px;width:' + (hr.width + 2*pad) + 'px;height:' + (hr.height + 2*pad) + 'px;pointer-events:none';
    cv.width = Math.round((hr.width + 2*pad) * DPR); cv.height = Math.round((hr.height + 2*pad) * DPR);
    host.appendChild(cv); host.classList.add('is-3d');
    var it = {host:host, canvas:cv, ctx:cv.getContext('2d'), w:hr.width + 2*pad, h:hr.height + 2*pad, pad:pad, cubes:[], visible:true};
    marks.forEach(function(m, k){
      var r = m.getBoundingClientRect();
      var c = {group: buildCube(), face: faceOf(m), el: m, phase: k * 1.3,
               x: r.left - hr.left + r.width/2 + pad, y: r.top - hr.top + r.height/2 + pad, size: r.width, spin0: -1, arrive0: -1};
      m.addEventListener('mouseenter', function(){ if(!reduce && c.spin0 < 0) c.spin0 = performance.now(); });
      it.cubes.push(c);
    });
    if(window.IntersectionObserver) new IntersectionObserver(function(es){ it.visible = es[0].isIntersecting; }).observe(host);
    items.push(it);
  }
  function unmountAll(){
    items.forEach(function(it){ it.canvas.remove(); it.host.classList.remove('is-3d'); });
    items = [];
  }
  function mountAll(){
    unmountAll();
    // badges on the package pages (measured when their page is showing, see remount below)
    document.querySelectorAll('.view:not([hidden]) .badge').forEach(function(b){ mount(b, [b]); });
    if(MODE === 'all'){
      document.querySelectorAll('nav .logo, footer .logo, .view:not([hidden]) .cube-links, .view:not([hidden]) .cmp .cube-name .logo').forEach(function(l){
        var lcs = Array.prototype.slice.call(l.querySelectorAll('.lc'));
        if(lcs.length) mount(l, lcs);
      });
    }
  }
  window.setLogoMode = function(m){ MODE = m; try{ localStorage.setItem('asap-logos', m); }catch(e){} mountAll(); };
  // pages are shown and hidden by the router, so measure again whenever the page changes or the window resizes
  window.addEventListener('hashchange', function(){
    if(window.__asapZooming){ unmountAll(); return; }          // the cube transition remounts once it lands
    requestAnimationFrame(function(){ requestAnimationFrame(mountAll); });
  });
  window.addEventListener('resize', function(){ clearTimeout(mountAll._t); mountAll._t = setTimeout(mountAll, 150); });
  window.addEventListener('asap:landed', function(){
    mountAll();
    var now = performance.now();
    items.forEach(function(it){ it.cubes.forEach(function(c){ c.arrive0 = now; }); });   // start flat, ease into 3D
  });

  var q = new THREE.Quaternion(), qw = new THREE.Quaternion(), qs = new THREE.Quaternion(), flat = new THREE.Quaternion();
  function maxSize(){
    var w = 1, h = 1;
    items.forEach(function(it){ if(it.visible){ w = Math.max(w, it.w); h = Math.max(h, it.h); } });
    return [Math.ceil(w), Math.ceil(h)];
  }
  var rw = 0, rh = 0;
  (function loop(now){
    requestAnimationFrame(loop);
    if(!items.length) return;
    var ms = maxSize();
    if(ms[0] !== rw || ms[1] !== rh){ rw = ms[0]; rh = ms[1]; renderer.setSize(rw, rh, false); }
    var t = reduce ? 0 : now / 1000;
    items.forEach(function(it){
      if(!it.visible || !it.host.offsetParent) return;
      scene.children.slice().forEach(function(o){ if(o.isGroup) scene.remove(o); });
      it.cubes.forEach(function(c){
        var g = c.group;
        g.scale.setScalar(c.size / SPAN * 0.9);
        g.position.set(c.x - it.w/2, it.h/2 - c.y, 0);
        flat.copy(faceQ(c.face));
        q.copy(flat).premultiply(qw.setFromAxisAngle(Y, Math.sin(t * 0.6 + c.phase) * 0.22)).premultiply(TILT);
        if(c.spin0 >= 0){
          var k = Math.min(1, (now - c.spin0) / 900), e = k < .5 ? 4*k*k*k : 1 - Math.pow(-2*k + 2, 3) / 2;
          q.premultiply(qs.setFromAxisAngle(Y, e * Math.PI * 2));
          if(k >= 1) c.spin0 = -1;
        }
        // a badge stays flat, exactly like the page's own mark, while the camera pulls back, then turns into 3D
        if(window.__asapZooming) q.copy(flat);
        else if(c.arrive0 >= 0){
          var ka = Math.min(1, (now - c.arrive0) / 900), ea = 1 - Math.pow(1 - ka, 3);
          q.copy(flat.clone().slerp(q.clone(), ea));
          if(ka >= 1) c.arrive0 = -1;
        }
        g.quaternion.copy(q);
        scene.add(g);
      });
      cam.left = -it.w/2; cam.right = it.w/2; cam.top = it.h/2; cam.bottom = -it.h/2; cam.updateProjectionMatrix();
      renderer.setViewport(0, 0, it.w, it.h); renderer.setScissor(0, 0, it.w, it.h); renderer.setScissorTest(true);
      renderer.setClearColor(0x000000, 0); renderer.clear();
      renderer.render(scene, cam);
      var src = renderer.domElement, sw = Math.round(it.w * DPR), sh = Math.round(it.h * DPR);
      it.ctx.clearRect(0, 0, it.canvas.width, it.canvas.height);
      it.ctx.drawImage(src, 0, src.height - sh, sw, sh, 0, 0, it.canvas.width, it.canvas.height);
    });
  })(performance.now());

  if(document.readyState === 'complete') mountAll(); else window.addEventListener('load', mountAll);
})();
