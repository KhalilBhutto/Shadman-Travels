/**
 * hero-globe.js
 * Shadman Travels & Tours — Project Shadman Platform
 * Route medallion: a small rotating globe in the hero that turns to the
 * route in the search widget, blinks the departure (gold) and arrival
 * (aqua) airports and draws the flight arc between them.
 *
 * Public API:  ShadmanGlobe.setRoute('KHI', 'DXB')
 * Called from: search-widget.js → rtSetPair()
 * Depends on:  js/land-mask.js (land data), airports.js (city names)
 * Needs:       <canvas id="rmCanvas"> inside .rm-globe (see index.html)
 *
 * Safe to fail: if the canvas or land data is missing, setRoute() only
 * updates the text cards and the rest of the page is unaffected.
 */
'use strict';

(function () {
  var RAD = Math.PI / 180;

  /* code → [latitude, longitude, country]   (airports in airports.js) */
  var AP = {
    KHI: [24.91, 67.16, 'Pakistan'], LHE: [31.52, 74.40, 'Pakistan'], ISB: [33.55, 72.83, 'Pakistan'],
    PEW: [33.99, 71.51, 'Pakistan'], MUX: [30.20, 71.42, 'Pakistan'], LYP: [31.36, 72.99, 'Pakistan'],
    SKT: [32.54, 74.36, 'Pakistan'], UET: [30.25, 66.94, 'Pakistan'],
    DXB: [25.25, 55.36, 'UAE'], AUH: [24.43, 54.65, 'UAE'], SHJ: [25.33, 55.52, 'UAE'],
    JED: [21.68, 39.16, 'Saudi Arabia'], RUH: [24.96, 46.70, 'Saudi Arabia'], MED: [24.55, 39.70, 'Saudi Arabia'],
    DMM: [26.47, 49.80, 'Saudi Arabia'], DOH: [25.27, 51.61, 'Qatar'], MCT: [23.59, 58.28, 'Oman'],
    BAH: [26.27, 50.63, 'Bahrain'], KWI: [29.23, 47.97, 'Kuwait'],
    LHR: [51.47, -0.45, 'United Kingdom'], MAN: [53.35, -2.27, 'United Kingdom'], BHX: [52.45, -1.75, 'United Kingdom'],
    CDG: [49.01, 2.55, 'France'], FRA: [50.03, 8.57, 'Germany'], MXP: [45.63, 8.72, 'Italy'], FCO: [41.80, 12.25, 'Italy'],
    IST: [41.26, 28.74, 'Türkiye'], AMS: [52.31, 4.76, 'Netherlands'], BCN: [41.30, 2.08, 'Spain'], MAD: [40.49, -3.57, 'Spain'],
    VIE: [48.11, 16.57, 'Austria'], ZRH: [47.46, 8.55, 'Switzerland'],
    JFK: [40.64, -73.78, 'United States'], ORD: [41.98, -87.90, 'United States'], LAX: [33.94, -118.41, 'United States'],
    IAD: [38.95, -77.46, 'United States'], IAH: [29.98, -95.34, 'United States'], YYZ: [43.68, -79.63, 'Canada'],
    BKK: [13.69, 100.75, 'Thailand'], HKT: [8.11, 98.32, 'Thailand'], KUL: [2.75, 101.71, 'Malaysia'], SIN: [1.36, 103.99, 'Singapore'],
    SYD: [-33.94, 151.18, 'Australia'], MEL: [-37.67, 144.84, 'Australia'], GYD: [40.47, 50.05, 'Azerbaijan'],
    MLE: [4.19, 73.53, 'Maldives'], CAI: [30.12, 31.41, 'Egypt'], NBO: [-1.32, 36.93, 'Kenya'], CMN: [33.37, -7.59, 'Morocco']
  };

  function $(id) { return document.getElementById(id); }
  function setText(id, v) { var e = $(id); if (e) e.textContent = v; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function wrap(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  function cityOf(code) {
    try { for (var i = 0; i < AIRPORTS.length; i++) if (AIRPORTS[i].code === code) return AIRPORTS[i].name; } catch (e) { /* AIRPORTS not loaded */ }
    return code;
  }
  function vec(c) { var la = c[0] * RAD, lo = c[1] * RAD; return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)]; }

  var canvas = $('rmCanvas');
  var ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  var maskSrc = window.SHADMAN_LAND_MASK;
  var route = null;                 // current route (see setRoute)
  var canDraw = !!(ctx && maskSrc);
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ───────── DOM text (works even when drawing is unavailable) ───────── */
  function updateText(fromCode, toCode, km) {
    var a = AP[fromCode], b = AP[toCode];
    setText('rtOriginLabel', fromCode); setText('rtDestLabel', toCode);
    setText('rmFromCity', cityOf(fromCode)); setText('rmFromCtry', a ? a[2] : '');
    setText('rmToCity', cityOf(toCode));     setText('rmToCtry', b ? b[2] : '');
    setText('rmReadFrom', fromCode); setText('rmReadTo', toCode);
    if (km) {
      var hrs = km / 820 + 0.55, hh = Math.floor(hrs), mm = Math.round((hrs - hh) * 12) * 5;
      if (mm === 60) { hh += 1; mm = 0; }
      setText('rmReadDist', km.toLocaleString('en-US') + ' km');
      setText('rmReadTime', '≈ ' + hh + 'h ' + (mm < 10 ? '0' : '') + mm + 'm non-stop');
    }
    var box = $('routeMedallion');
    if (box) box.setAttribute('aria-label', 'Route from ' + cityOf(fromCode) + ' to ' + cityOf(toCode));
  }

  /* ───────── drawing set-up ───────── */
  var S = 0, R = 0, DPR = 1, bz1 = 0, bz2 = 0, sc = 1;
  var land = null, water = null, oceanG = null, shadeG = null;
  var mask = null;

  function decodeMask() {
    mask = new Uint8Array(64800);
    var pos = 0, v = 0;
    maskSrc.split(',').forEach(function (s) { var n = +s; if (v) mask.fill(1, pos, pos + n); pos += n; v ^= 1; });
  }
  function isLand(lat, lon) {
    var r = Math.floor(90 - lat); if (r < 0) r = 0; if (r > 179) r = 179;
    var c = Math.floor(lon + 180); c = ((c % 360) + 360) % 360;
    return mask[r * 360 + c] === 1;
  }
  function lattice(step, wantLand) {
    var out = [], row = 0;
    for (var lat = -84; lat <= 84; lat += step, row++) {
      var n = Math.max(1, Math.round(360 * Math.cos(lat * RAD) / step)), dl = 360 / n;
      for (var i = 0; i < n; i++) {
        var lon = -180 + (i + (row % 2) * 0.5) * dl;
        if (isLand(lat, lon) === wantLand) out.push({ lo: lon * RAD, sl: Math.sin(lat * RAD), cl: Math.cos(lat * RAD) });
      }
    }
    return out;
  }

  function resize() {
    if (!canDraw) return;
    var css = canvas.clientWidth || 246;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    S = css;
    canvas.width = Math.round(css * DPR); canvas.height = Math.round(css * DPR);
    var big = css > 200;
    R = css / 2 - (big ? 20 : 14);
    bz1 = R + (big ? 8 : 6); bz2 = R + (big ? 16 : 12);
    sc = clamp(R / 500, 0.5, 1.1);
    if (!mask) decodeMask();
    var step = Math.max(1.5, 6 / (R * RAD));
    land = lattice(step, true); water = lattice(step * 2, false);
    var cx = css / 2, cy = css / 2;
    oceanG = ctx.createRadialGradient(cx - 0.24 * R, cy - 0.4 * R, 0, cx - 0.24 * R, cy - 0.4 * R, 1.7 * R);
    oceanG.addColorStop(0, '#11736c'); oceanG.addColorStop(0.5, '#083c3a'); oceanG.addColorStop(1, '#010d0b');
    shadeG = ctx.createRadialGradient(cx - 0.4 * R, cy - 0.48 * R, 0, cx - 0.4 * R, cy - 0.48 * R, 1.9 * R);
    shadeG.addColorStop(0.45, 'rgba(0,8,6,0)'); shadeG.addColorStop(1, 'rgba(0,8,6,.85)');
  }

  /* ───────── camera + route state ───────── */
  var cam = null, lastT = 0, routeT0 = 0;

  function setRoute(fromCode, toCode) {
    var a = AP[fromCode], b = AP[toCode];
    if (!a || !b) { updateText(fromCode, toCode, 0); route = null; return; }
    var aV = vec(a), bV = vec(b);
    var Om = Math.acos(clamp(aV[0] * bV[0] + aV[1] * bV[1] + aV[2] * bV[2], -1, 1));
    var m = [aV[0] + bV[0], aV[1] + bV[1], aV[2] + bV[2]], ml = Math.hypot(m[0], m[1], m[2]) || 1;
    route = {
      aV: aV, bV: bV, Om: Om, so: Math.sin(Om) || 1e-6,
      mLat: Math.asin(m[2] / ml), mLon: Math.atan2(m[1], m[0]),
      lift: 0.02 + 0.07 * Math.min(1, Om / 1.6), t0: performance.now() / 1000
    };
    updateText(fromCode, toCode, Math.round(Om * 6371 / 10) * 10);
    if (!cam) cam = { L0: route.mLon, p0: clamp(route.mLat, -1.2, 1.2) };
    if (!running) draw(performance.now() / 1000, true);
  }

  /* ───────── one frame ───────── */
  function draw(now, still) {
    if (!canDraw || !route) return;
    var dt = still ? 1 : clamp(now - (lastT || now), 0, 0.3); lastT = now;
    var k = still ? 1 : 1 - Math.exp(-dt / 0.45);
    cam.L0 += wrap(route.mLon - cam.L0) * k;
    cam.p0 += (clamp(route.mLat, -1.2, 1.2) - cam.p0) * k;
    var L0 = cam.L0 + (still ? 0 : Math.sin(now * 0.35) * 0.045), p0 = cam.p0 + (still ? 0 : Math.cos(now * 0.27) * 0.018);
    var sp = Math.sin(p0), cp = Math.cos(p0), cL = Math.cos(L0), sL = Math.sin(L0);
    var cx = S / 2, cy = S / 2, i, p, d, cd, z, x, y;

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, S, S);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    /* glow + ocean */
    ctx.save();
    ctx.shadowColor = 'rgba(111,224,208,.65)'; ctx.shadowBlur = 14 * sc + 6;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.fillStyle = oceanG; ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.clip();

    /* graticule */
    ctx.beginPath();
    var pen, q, la, lo;
    for (la = -60; la <= 60; la += 30) { pen = false; for (lo = -180; lo <= 180; lo += 5) { q = gp(la, lo); if (q[2] > 0) { pen ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); pen = true; } else pen = false; } }
    for (lo = -180; lo < 180; lo += 30) { pen = false; for (la = -85; la <= 85; la += 6) { q = gp(la, lo); if (q[2] > 0) { pen ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); pen = true; } else pen = false; } }
    ctx.strokeStyle = 'rgba(159,232,220,.17)'; ctx.lineWidth = 1; ctx.stroke();

    /* dots: water (2 depths) then land (3 depths) */
    var wb = [[], []], lb = [[], [], []];
    for (i = 0; i < water.length; i++) { p = water[i]; d = p.lo - L0; cd = Math.cos(d); z = sp * p.sl + cp * p.cl * cd; if (z <= 0.02) continue; wb[z > 0.4 ? 0 : 1].push(cx + R * p.cl * Math.sin(d), cy - R * (cp * p.sl - sp * p.cl * cd)); }
    for (i = 0; i < land.length; i++) { p = land[i]; d = p.lo - L0; cd = Math.cos(d); z = sp * p.sl + cp * p.cl * cd; if (z <= 0.02) continue; lb[z > 0.55 ? 0 : (z > 0.25 ? 1 : 2)].push(cx + R * p.cl * Math.sin(d), cy - R * (cp * p.sl - sp * p.cl * cd)); }
    dots(wb[1], 'rgba(63,163,150,.3)', 1.5 * sc); dots(wb[0], 'rgba(88,196,180,.5)', 2 * sc);
    dots(lb[2], 'rgba(243,217,138,.5)', 1.8 * sc); dots(lb[1], 'rgba(243,217,138,.82)', 2.6 * sc); dots(lb[0], 'rgba(255,233,168,.98)', 3.3 * sc);

    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.fillStyle = shadeG; ctx.fill();
    ctx.restore();

    /* rim + bezel */
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.strokeStyle = 'rgba(229,195,109,.6)'; ctx.lineWidth = 2 * sc; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, bz1, 0, 6.2832); ctx.strokeStyle = 'rgba(229,195,109,.75)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.save();
    ctx.setLineDash([1.2, 7]); ctx.lineDashOffset = still ? 0 : -now * 4.7;
    ctx.beginPath(); ctx.arc(cx, cy, bz2, 0, 6.2832); ctx.strokeStyle = 'rgba(229,195,109,.6)'; ctx.lineWidth = 5; ctx.lineCap = 'butt'; ctx.stroke();
    ctx.restore();

    /* route: arc, plane, pins */
    var el = still ? 9 : now - route.t0;
    var prog = clamp((el - 0.7) / 1.5, 0, 1), pe = 1 - Math.pow(1 - prog, 3);
    var A = pv(route.aV, 1), B = pv(route.bV, 1);
    var arcPts = [], t;
    for (i = 0; i <= 56; i++) { t = i / 56; if (t > pe + 1e-6) break; arcPts.push(arcPt(t)); }
    if (arcPts.length > 1) {
      var grad = ctx.createLinearGradient(A[0], A[1], B[0], B[1]);
      grad.addColorStop(0, '#FFD66B'); grad.addColorStop(1, '#6FF2E0');
      strokeArc(arcPts, grad, 0.28, 9 * Math.max(sc, 0.6)); strokeArc(arcPts, grad, 1, 2.4 * Math.max(sc, 0.8));
    }
    if (prog >= 1 && el > 2.2 && !still) {
      t = ((el - 2.2) * 0.13) % 1;
      var q1 = arcPt(t), q2 = arcPt(Math.min(1, t + 0.012));
      if (q1[2] > 0.05) {
        ctx.save(); ctx.translate(q1[0], q1[1]); ctx.rotate(Math.atan2(q2[1] - q1[1], q2[0] - q1[0]) + Math.PI / 2); ctx.scale(0.7, 0.7);
        var pg = ctx.createRadialGradient(0, 0, 0, 0, 0, 14); pg.addColorStop(0, 'rgba(255,233,168,.95)'); pg.addColorStop(1, 'rgba(255,184,77,0)');
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(0, 0, 14, 0, 6.2832); ctx.fill();
        ctx.fillStyle = '#FFF8E1'; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(7, 8); ctx.lineTo(0, 4); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
    }
    pin(A, true, 1);
    pin(B, false, clamp((prog - 0.8) * 5, 0, 1));

    /* helpers (closures over this frame's camera) */
    function gp(lat, lon) { var la2 = lat * RAD, d2 = lon * RAD - L0, c2 = Math.cos(d2); return [cx + R * Math.cos(la2) * Math.sin(d2), cy - R * (cp * Math.sin(la2) - sp * Math.cos(la2) * c2), sp * Math.sin(la2) + cp * Math.cos(la2) * c2]; }
    function pv(v, s) { var Q = v[0] * cL + v[1] * sL; return [cx + R * s * (v[1] * cL - v[0] * sL), cy - R * s * (cp * v[2] - sp * Q), sp * v[2] + cp * Q]; }
    function arcPt(u) { var a1 = Math.sin((1 - u) * route.Om) / route.so, b1 = Math.sin(u * route.Om) / route.so; return pv([a1 * route.aV[0] + b1 * route.bV[0], a1 * route.aV[1] + b1 * route.bV[1], a1 * route.aV[2] + b1 * route.bV[2]], 1 + route.lift * Math.sin(Math.PI * u)); }
    function strokeArc(pts, style, alpha, w) {
      ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = style; ctx.lineWidth = w; ctx.beginPath();
      var on = false;
      for (var j = 0; j < pts.length; j++) { if (pts[j][2] > 0.03) { on ? ctx.lineTo(pts[j][0], pts[j][1]) : ctx.moveTo(pts[j][0], pts[j][1]); on = true; } else on = false; }
      ctx.stroke(); ctx.restore();
    }
    function dots(arr, style, w) {
      if (!arr.length) return;
      ctx.beginPath();
      for (var j = 0; j < arr.length; j += 2) { ctx.moveTo(arr[j], arr[j + 1]); ctx.lineTo(arr[j] + 0.01, arr[j + 1]); }
      ctx.strokeStyle = style; ctx.lineWidth = w; ctx.stroke();
    }
    function pin(P, isDep, appear) {
      var vis = clamp((P[2] - 0.1) * 4, 0, 1) * appear; if (vis <= 0.01) return;
      var ms = clamp(R / 500, 0.4, 1), ph = (now * 0.8 + (isDep ? 0 : 0.5)) % 1;
      var b = still ? 0.9 : 0.65 + 0.35 * Math.sin(now * 5 + (isDep ? 0 : 2.4));
      var col = isDep ? '255,214,107' : '111,242,224', core = isDep ? '#FFF6D6' : '#E8FFFB';
      ctx.save(); ctx.globalAlpha = vis;
      if (!still) {
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(' + col + ',' + (1 - ph) + ')'; ctx.beginPath(); ctx.arc(P[0], P[1], (10 + 30 * ph) * ms, 0, 6.2832); ctx.stroke();
        var ph2 = (ph + 0.5) % 1; ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(' + col + ',' + (1 - ph2) + ')'; ctx.beginPath(); ctx.arc(P[0], P[1], (10 + 30 * ph2) * ms, 0, 6.2832); ctx.stroke();
      }
      var g = ctx.createRadialGradient(P[0], P[1], 0, P[0], P[1], 30 * ms); g.addColorStop(0, 'rgba(' + col + ',.95)'); g.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.globalAlpha = vis * b; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(P[0], P[1], 30 * ms, 0, 6.2832); ctx.fill();
      ctx.fillStyle = core; ctx.beginPath(); ctx.arc(P[0], P[1], Math.max(3, 5.5 * ms), 0, 6.2832); ctx.fill();
      ctx.restore();
    }
  }

  /* ───────── loop: only while visible, ~30 fps ───────── */
  var running = false, visible = true, lastFrame = 0;
  function loop(ts) {
    if (!running) return;
    if (ts - lastFrame >= 33) { lastFrame = ts; draw(ts / 1000, false); }
    requestAnimationFrame(loop);
  }
  function start() { if (running || reduce || !canDraw || !visible || document.hidden) return; running = true; requestAnimationFrame(loop); }
  function stop() { running = false; }

  if (canDraw) {
    resize();
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { resize(); if (route) draw(performance.now() / 1000, !running); }, 150); });
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; visible ? start() : stop(); }).observe(canvas);
    }
    start();
  }

  window.ShadmanGlobe = { setRoute: setRoute };
})();