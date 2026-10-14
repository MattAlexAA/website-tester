(function(){
  /* ---------- 3D logo marks: one face, straight on ----------
     Each mark is its letter face of the cube, seen square-on (no turning, no isometric angle), drawn in 3D
     so the tiles stand proud of the black body and catch the light. The marks don't move, so each one is
     drawn once when it appears and again only if the page is resized: nothing runs frame to frame.
     mode 'badges': only the big badge on each package page. mode 'all': every ASAP mark on the site. */
  if(!window.THREE) return;
  var MODE = 'all';
  try{ MODE = localStorage.getItem('asap-logos') || 'all'; }catch(e){}

  var A = [0,1,1,1,0, 1,0,0,0,1, 1,1,1,1,1, 1,0,0,0,1, 1,0,0,0,1];
  var S = [0,1,1,1,1, 1,0,0,0,0, 0,1,1,1,0, 0,0,0,0,1, 1,1,1,1,0];
  var P = [1,1,1,1,0, 1,0,0,0,1, 1,1,1,1,0, 1,0,0,0,0, 1,0,0,0,0];
  var LETTER = [A, S, A, P];
  var WHITE = 0xFFFBFB, COLOUR = [0xFF0000, 0x0048FF, 0x00C24A, 0xFF6A00];
  var H = 2, GAP = 1.06, SPAN = 4 * GAP + 1, FRONT = H * GAP + 0.5;

  // only the front wall is ever seen, so build just that: 25 black blocks with a raised tile on each
  var blockGeo = new THREE.BoxGeometry(1, 1, 1), blockMat = new THREE.MeshLambertMaterial({color:0x050505});
  var tileGeo = new THREE.BoxGeometry(0.84, 0.84, 0.16), mats = {};
  function mat(c){ return mats[c] || (mats[c] = new THREE.MeshLambertMaterial({color:c})); }
  var faces = [0,1,2,3].map(function(f){
    var g = new THREE.Group();
    for(var row = 0; row < 5; row++) for(var col = 0; col < 5; col++){
      var b = new THREE.Mesh(blockGeo, blockMat);
      b.position.set((col - H) * GAP, (H - row) * GAP, H * GAP);
      var t = new THREE.Mesh(tileGeo, mat(LETTER[f][row*5 + col] ? WHITE : COLOUR[f]));
      t.position.set(0, 0, 0.58);
      b.add(t); g.add(b);
    }
    return g;
  });

  var renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);
  var scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.74));
  var key = new THREE.DirectionalLight(0xffffff, 0.5); key.position.set(-5, 7, 9); scene.add(key);
  var FOV = 30, cam = new THREE.PerspectiveCamera(FOV, 1, 0.1, 400);

  var PAD = 0.12;                                     // a little room round each mark for the raised edges
  function drawFace(ctx, f, x, y, size){
    var box = Math.ceil(size * (1 + 2 * PAD));
    renderer.setSize(box, box, false);
    // straight on, far enough back that the face spans exactly `size` pixels
    var dist = (SPAN * box / size) / (2 * Math.tan(FOV * Math.PI / 360)) + FRONT;
    cam.aspect = 1; cam.position.set(0, 0, dist); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
    scene.add(faces[f]);
    renderer.setClearColor(0x000000, 0); renderer.clear();
    renderer.render(scene, cam);
    scene.remove(faces[f]);
    ctx.drawImage(renderer.domElement, (x - box / 2) * DPR, (y - box / 2) * DPR, box * DPR, box * DPR);
  }

  var FACE_BY_COLOUR = {red:0, blue:1, green:2, orange:3};
  function faceOf(el){
    var m = null;
    for(var n = el; n && !m; n = n.parentElement){ m = /--c:\s*var\(--(red|blue|green|orange)\)/.exec(n.getAttribute && n.getAttribute('style') || ''); }
    return m ? FACE_BY_COLOUR[m[1]] : 0;
  }

  var mounted = [];
  function mount(host, marks){
    var hr = host.getBoundingClientRect();
    if(!hr.width) return;
    var pad = Math.ceil(marks[0].getBoundingClientRect().width * PAD) + 2;
    if(getComputedStyle(host).position === 'static') host.style.position = 'relative';
    var cv = document.createElement('canvas'); cv.className = 'mini3d';
    var w = hr.width + 2 * pad, h = hr.height + 2 * pad;
    cv.style.cssText = 'position:absolute;left:' + -pad + 'px;top:' + -pad + 'px;width:' + w + 'px;height:' + h + 'px;pointer-events:none';
    cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR);
    var ctx = cv.getContext('2d');
    marks.forEach(function(m){
      var r = m.getBoundingClientRect();
      drawFace(ctx, faceOf(m), r.left - hr.left + r.width / 2 + pad, r.top - hr.top + r.height / 2 + pad, r.width);
    });
    host.appendChild(cv); host.classList.add('is-3d');
    mounted.push({host: host, canvas: cv});
  }
  function unmountAll(){
    mounted.forEach(function(m){ m.canvas.remove(); m.host.classList.remove('is-3d'); });
    mounted = [];
  }
  function mountAll(){
    unmountAll();
    document.querySelectorAll('.view:not([hidden]) .badge').forEach(function(b){ mount(b, [b]); });
    if(MODE === 'all'){
      document.querySelectorAll('nav .logo, footer .logo, .view:not([hidden]) .cube-links, .view:not([hidden]) .cmp .cube-name .logo').forEach(function(l){
        var lcs = Array.prototype.slice.call(l.querySelectorAll('.lc'));
        if(lcs.length) mount(l, lcs);
      });
    }
  }
  window.setLogoMode = function(m){ MODE = m; try{ localStorage.setItem('asap-logos', m); }catch(e){} mountAll(); };
  window.addEventListener('hashchange', function(){
    if(window.__asapZooming){ unmountAll(); return; }          // the cube transition remounts once it lands
    requestAnimationFrame(function(){ requestAnimationFrame(mountAll); });
  });
  window.addEventListener('asap:landed', mountAll);
  window.addEventListener('resize', function(){ clearTimeout(mountAll._t); mountAll._t = setTimeout(mountAll, 150); });
  if(document.readyState === 'complete') mountAll(); else window.addEventListener('load', mountAll);
})();
