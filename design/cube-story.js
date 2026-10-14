(function(){
  /* ---------- homepage cube story ----------
     Intro: the cube tumbles slowly, blurred, behind "Stop scrambling."
     Scroll: it sharpens, slides left and turns to each face (A, S, A, P) as that cube's panel scrolls past.
     Click a face or a panel button: a quick solve sequence, then a dive into one tile of that face, which opens the page. */
  var stage = document.getElementById('hero-cube');
  var story = document.getElementById('cube-story');
  if(!stage || !story) return;
  if(!window.THREE){ story.classList.add('no-3d'); return; }
  var panels = Array.prototype.slice.call(story.querySelectorAll('.story-panel'));
  var intro = story.querySelector('.story-intro');

  /* 1 = letter tile, read left-to-right, top-to-bottom as you face that side */
  var A = [0,1,1,1,0, 1,0,0,0,1, 1,1,1,1,1, 1,0,0,0,1, 1,0,0,0,1];
  var S = [0,1,1,1,1, 1,0,0,0,0, 0,1,1,1,0, 0,0,0,0,1, 1,1,1,1,0];
  var P = [1,1,1,1,0, 1,0,0,0,1, 1,1,1,1,0, 1,0,0,0,0, 1,0,0,0,0];
  var Q = [0,1,1,1,0, 0,0,0,0,1, 0,0,1,1,0, 0,0,0,0,0, 0,0,1,0,0];   // ?
  var X = [0,0,1,0,0, 0,0,1,0,0, 0,0,1,0,0, 0,0,0,0,0, 0,0,1,0,0];   // !
  var WHITE = 0xFFFBFB, RED = 0xFF0000, BLUE = 0x0048FF, GREEN = 0x00C24A, ORANGE = 0xFF6A00, ACID = 0xF9FF2D, INK = 0x111116;
  var FACE_COLOUR = [RED, BLUE, GREEN, ORANGE];
  var H = 2, GAP = 1.06, TURN_MS = 115;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  var CAM_Z = 21;
  camera.position.set(0, 0, CAM_Z);
  var renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  stage.appendChild(renderer.domElement);
  scene.add(new THREE.AmbientLight(0xffffff, 0.72));
  var key = new THREE.DirectionalLight(0xffffff, 0.45); key.position.set(-4, 8, 10); scene.add(key);
  var under = new THREE.DirectionalLight(0xffffff, 0.3); under.position.set(2, -8, 4); scene.add(under);

  var cube = new THREE.Group();
  scene.add(cube);
  var bodyGeo = new THREE.BoxGeometry(1, 1, 1);
  var bodyMat = new THREE.MeshLambertMaterial({color:0x050505});
  var stickerGeo = new THREE.PlaneGeometry(0.84, 0.84);
  var mats = {};
  function mat(c){ return mats[c] || (mats[c] = new THREE.MeshLambertMaterial({color:c})); }
  var stickers = [], cubies = [];
  function sticker(cubie, normal, color, face){
    var s = new THREE.Mesh(stickerGeo, mat(color));
    s.position.copy(normal).multiplyScalar(0.502);
    s.lookAt(normal.clone().multiplyScalar(2));
    s.userData.face = face; s.userData.colour = color;
    cubie.add(s); stickers.push(s);
  }
  function tile(pat, col, row, face){ return pat[row*5 + col] ? WHITE : face; }
  for(var x=-H; x<=H; x++) for(var y=-H; y<=H; y++) for(var z=-H; z<=H; z++){
    if(Math.max(Math.abs(x),Math.abs(y),Math.abs(z)) < H) continue;
    var c = new THREE.Mesh(bodyGeo, bodyMat);
    c.position.set(x*GAP, y*GAP, z*GAP);
    var row = H - y;
    if(z ===  H) sticker(c, new THREE.Vector3(0,0,1),  tile(A, x+H, row, RED), 0);        // front: A, Small Business
    if(x ===  H) sticker(c, new THREE.Vector3(1,0,0),  tile(S, H-z, row, BLUE), 1);       // right: S, Brands
    if(z === -H) sticker(c, new THREE.Vector3(0,0,-1), tile(A, H-x, row, GREEN), 2);      // back:  A, Creators
    if(x === -H) sticker(c, new THREE.Vector3(-1,0,0), tile(P, z+H, row, ORANGE), 3);     // left:  P, Personalised
    if(y ===  H) sticker(c, new THREE.Vector3(0,1,0),  tile(Q, x+H, z+H, ACID), 4);       // top: ?
    if(y === -H) sticker(c, new THREE.Vector3(0,-1,0), X[(H-z)*5 + x+H] ? INK : WHITE, 5); // bottom: !
    cube.add(c); cubies.push(c);
  }

  /* ---------- orientations ---------- */
  var Y = new THREE.Vector3(0,1,0);
  var ISO = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.atan(1/Math.SQRT2), -Math.PI/4, 0));
  var TILT = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, -0.42, 0));
  var SPIN_AXIS = new THREE.Vector3(0.35, 1, 0.2).normalize();
  function faceQ(i, tilted){
    var q = new THREE.Quaternion().setFromAxisAngle(Y, -i * Math.PI/2);
    return tilted ? q.premultiply(TILT) : q;
  }
  var FACE_TILTED = [0,1,2,3].map(function(i){ return faceQ(i, true); });
  cube.quaternion.copy(ISO); cube.scale.setScalar(1.2);       // first view: classic isometric

  /* ---------- slice turns (used by the click transition) ---------- */
  function layerOf(c, axis){ return Math.round(c.position[axis] / GAP); }
  function snap(c){
    c.position.set(Math.round(c.position.x/GAP)*GAP, Math.round(c.position.y/GAP)*GAP, Math.round(c.position.z/GAP)*GAP);
    c.updateMatrix();
    var e = c.matrix.elements;
    [0,1,2,4,5,6,8,9,10].forEach(function(i){ e[i] = Math.round(e[i]); });
    c.matrix.decompose(c.position, c.quaternion, c.scale);
  }
  function runTurn(m, ms){
    return new Promise(function(done){
      var pivot = new THREE.Object3D(); cube.add(pivot);
      var group = cubies.filter(function(c){ return layerOf(c, m.axis) === m.layer; });
      group.forEach(function(c){ pivot.attach(c); });
      var t0 = performance.now(), target = m.dir * Math.PI/2;
      (function step(now){
        var k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3);
        pivot.rotation[m.axis] = target * e;
        if(k < 1) return requestAnimationFrame(step);
        pivot.updateMatrixWorld(true);
        group.forEach(function(c){ cube.attach(c); snap(c); });
        cube.remove(pivot); done();
      })(t0);
    });
  }
  function runAll(moves){
    return moves.reduce(function(p, m){ return p.then(function(){ return runTurn(m, TURN_MS); }); }, Promise.resolve());
  }

  /* ---------- scroll state ---------- */
  function clamp(v, a, b){ return v < a ? a : v > b ? b : v; }
  function smooth(a, b, v){ var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  var w = 0, facePos = 0, active = -1;
  function readScroll(){
    var s = -story.getBoundingClientRect().top;
    var introH = intro.offsetHeight || innerHeight;
    var panelH = (panels[0] && panels[0].offsetHeight) || innerHeight;
    w = smooth(0, introH * 0.85, s);
    var fp = clamp((s - introH) / panelH, 0, panels.length - 1);
    var i0 = Math.floor(fp);
    facePos = Math.min(i0 + smooth(0.25, 0.75, fp - i0), panels.length - 1);
    var a = w > 0.6 ? Math.round(fp) : -1;
    if(a !== active){
      active = a;
      panels.forEach(function(p, i){ p.classList.toggle('on', i === a); });
    }
    var blur = ((1 - w) * 12).toFixed(1);
    if(stage._blur !== blur){ stage._blur = blur; stage.style.filter = blur > 0 ? 'blur(' + blur + 'px)' : ''; stage.style.opacity = (0.55 + 0.45 * w).toFixed(2); }
  }

  /* ---------- click a face: solve sequence, then dive into a tile ---------- */
  var mode = 'scroll', busy = false, zoom = null, overlay = null, home = stage.parentNode;
  var flood = null;
  function goTo(i){
    var href = panels[i] && panels[i].getAttribute('data-href');
    if(!href || busy) return;
    if(reduce){ location.hash = '#' + href; return; }
    busy = true; mode = 'zoom';
    document.documentElement.classList.add('cube-zoom');
    // lift the canvas into a full-screen layer (the page's own animation would trap a fixed element)
    overlay = document.createElement('div'); overlay.className = 'cube-overlay';
    document.body.appendChild(overlay); overlay.appendChild(stage);
    zoom = {t0: performance.now(), q0: cube.quaternion.clone(), q1: faceQ(i, true), flat: faceQ(i, false),
            p0: cube.position.clone(), s0: cube.scale.x, dive: null};
    // R U R' U' F, then undo it: a quick, recognisable solve that ends on the logo
    var seq = [['x',2,1],['y',2,1],['x',2,-1],['y',2,-1],['z',2,1],['x',0,-1]].map(function(m){ return {axis:m[0], layer:m[1], dir:m[2]}; });
    var undo = seq.slice().reverse().map(function(m){ return {axis:m.axis, layer:m.layer, dir:-m.dir}; });
    runAll(seq.concat(undo)).then(function(){ dive(i, href); });
  }

  function dive(i, href){
    // find the tile with the cube squared up to the camera, then put the tilt back for the turn-in
    var keepQ = cube.quaternion.clone(), keepP = cube.position.clone(), keepS = cube.scale.x;
    cube.quaternion.copy(zoom.flat); cube.position.set(0, 0, 0); cube.scale.setScalar(1);
    cube.updateMatrixWorld(true);
    // the coloured tile of that face nearest its centre
    var best = null, bestD = 1e9, wp = new THREE.Vector3();
    stickers.forEach(function(s){
      if(s.userData.face !== i || s.userData.colour === WHITE) return;
      s.getWorldPosition(wp);
      var d = wp.x * wp.x + wp.y * wp.y;
      if(d < bestD){ bestD = d; best = wp.clone(); }
    });
    cube.quaternion.copy(keepQ); cube.position.copy(keepP); cube.scale.setScalar(keepS);
    zoom.dive = {t0: performance.now(), qFrom: keepQ, from: camera.position.clone(), to: best.clone().add(new THREE.Vector3(0, 0, 0.75)), look: best};
    flood = document.createElement('div');
    flood.className = 'cube-flood';
    flood.style.background = '#' + FACE_COLOUR[i].toString(16).padStart(6, '0');
    document.body.appendChild(flood);
    setTimeout(function(){ flood.classList.add('in'); }, 380);
    setTimeout(function(){
      location.hash = '#' + href;
      mode = 'scroll'; zoom = null; busy = false;
      camera.position.set(0, 0, CAM_Z); camera.lookAt(0, 0, 0);
      document.documentElement.classList.remove('cube-zoom');
      home.appendChild(stage); overlay.remove(); overlay = null;
      requestAnimationFrame(function(){ flood.classList.remove('in'); flood.classList.add('out'); });
      setTimeout(function(){ if(flood){ flood.remove(); flood = null; } }, 700);
    }, 900);
  }

  /* ---------- pointer: point at a face, click to open it ---------- */
  var ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), cvs = renderer.domElement;
  function faceAt(e){
    var r = cvs.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    var h = ray.intersectObjects(stickers, false)[0];
    return h && h.object.userData.face < 4 ? h.object.userData.face : -1;
  }
  cvs.addEventListener('pointermove', function(e){ if(e.pointerType === 'mouse') cvs.style.cursor = !busy && faceAt(e) >= 0 ? 'pointer' : ''; });
  cvs.addEventListener('click', function(e){ var f = faceAt(e); if(f >= 0) goTo(f); });
  story.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[data-face]');
    if(!a || reduce) return;
    e.preventDefault(); e.stopPropagation();
    goTo(+a.getAttribute('data-face'));
  });

  /* ---------- render ---------- */
  var onScreen = true;
  function resize(){
    var w2 = stage.clientWidth, h2 = stage.clientHeight;
    if(!w2 || !h2) return;
    renderer.setSize(w2, h2, false); camera.aspect = w2 / h2; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage); resize();
  if(window.IntersectionObserver) new IntersectionObserver(function(es){ onScreen = es[0].isIntersecting; }).observe(story);

  var qIdle = new THREE.Quaternion(), qFace = new THREE.Quaternion(), qSpin = new THREE.Quaternion(), goal = new THREE.Quaternion();
  var pos = new THREE.Vector3(), t0 = performance.now();
  function ease(k){ return k < .5 ? 4*k*k*k : 1 - Math.pow(-2*k + 2, 3) / 2; }
  (function loop(now){
    requestAnimationFrame(loop);
    if(!(onScreen || busy) || !stage.offsetWidth) return;
    if(mode === 'scroll'){
      readScroll();
      var t = reduce ? 0 : (now - t0) / 1000;
      qIdle.copy(ISO).premultiply(qSpin.setFromAxisAngle(SPIN_AXIS, t * 0.35));
      var i0 = Math.floor(facePos), i1 = Math.min(i0 + 1, 3);
      qFace.copy(FACE_TILTED[i0]).slerp(FACE_TILTED[i1], facePos - i0);
      goal.copy(qIdle).slerp(qFace, w);
      var visH = 2 * CAM_Z * Math.tan(Math.PI / 12), visW = visH * camera.aspect;
      var narrow = innerWidth < 880;
      pos.set(narrow ? 0 : -visW * 0.22 * w, narrow ? visH * 0.2 * w : 0, 0);
      var sc = 1.2 + ((narrow ? 0.7 : 0.88) - 1.2) * w;
      var k = reduce ? 1 : 0.14;
      cube.quaternion.slerp(goal, k);
      cube.position.lerp(pos, k);
      cube.scale.setScalar(cube.scale.x + (sc - cube.scale.x) * k);
    } else if(zoom){
      var kz = ease(Math.min(1, (now - zoom.t0) / 700));
      if(zoom.dive) cube.quaternion.copy(zoom.dive.qFrom).slerp(zoom.flat, ease(Math.min(1, (now - zoom.dive.t0) / 320)));
      else cube.quaternion.copy(zoom.q0).slerp(zoom.q1, kz);
      cube.position.copy(zoom.p0).lerp(pos.set(0, 0, 0), kz);
      cube.scale.setScalar(zoom.s0 + (1 - zoom.s0) * kz);
      if(zoom.dive){
        var kd = Math.min(1, (now - zoom.dive.t0) / 650); kd = kd * kd * kd;
        camera.position.copy(zoom.dive.from).lerp(zoom.dive.to, kd);
        camera.lookAt(zoom.dive.look.x * kd, zoom.dive.look.y * kd, 0);
      }
    }
    renderer.render(scene, camera);
  })(t0);
})();
