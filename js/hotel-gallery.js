/* js/hotel-gallery.js
 * Hotel photo gallery page.  URL:  /pages/hotel-gallery.html?hotel=ABRAJ+TABAH+SILVER+OR+SIMILAR
 * Reads data/hotel-gallery.json (made by scripts/build-hotel-gallery.js from images/hotels/<name>/).
 */
(function () {
  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  // Same rule as the build script: ignore case, spaces, punctuation and "OR SIMILAR"
  function keyOf(name) {
    return String(name || '').toUpperCase().replace(/\bOR\s+SIMILAR\b/g, '').replace(/[^A-Z0-9]/g, '');
  }
  function pretty(name) {
    var s = String(name || '').replace(/\s*\bor\s+similar\b/i, '').trim().toLowerCase();
    return s.replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); });
  }
  function hotelUrl(name) { return '/pages/hotel-gallery.html?hotel=' + encodeURIComponent(name); }
  function waLink(text) { return 'https://wa.me/923000041510?text=' + encodeURIComponent(text); }

  var state = { hotel: null, idx: 0 };

  function renderOthers(all, currentKey) {
    var list = all.filter(function (h) { return h.key !== currentKey; });
    if (!list.length) return;
    $('hgOthersGrid').innerHTML = list.map(function (h) {
      return '<a class="hg-other" href="' + esc(hotelUrl(h.name)) + '">' +
        '<img src="' + esc(h.cover) + '" alt="' + esc(pretty(h.name)) + '" loading="lazy" decoding="async">' +
        '<span class="hg-other-name">' + esc(pretty(h.name)) + '</span>' +
        '<span class="hg-other-count"><i class="fa-regular fa-images"></i> ' + h.images.length + '</span></a>';
    }).join('');
    $('hgOthers').hidden = false;
  }

  function renderHotel(h) {
    state.hotel = h;
    var name = pretty(h.name);
    document.title = name + ' – Photo Gallery | Shadman Travels';
    $('hgEyebrow').textContent = 'Hotel Gallery';
    $('hgTitle').textContent = name;
    $('hgSub').textContent = h.images.length + ' photo' + (h.images.length === 1 ? '' : 's') +
      ' · Tap any photo to enlarge. Hotel shown is indicative – your package hotel may be "or similar".';

    var first = h.images[0], rest = h.images.slice(1);
    $('hgBody').innerHTML =
      '<button type="button" class="hg-hero" data-i="0" aria-label="Open photo 1">' +
        '<img src="' + esc(first) + '" alt="' + esc(name) + '" decoding="async">' +
        '<span class="hg-hero-tag"><i class="fa-solid fa-expand"></i> View full size</span>' +
      '</button>' +
      (rest.length ? '<div class="hg-grid">' + rest.map(function (src, i) {
        return '<button type="button" class="hg-tile" data-i="' + (i + 1) + '" aria-label="Open photo ' + (i + 2) + '">' +
          '<img src="' + esc(src) + '" alt="' + esc(name) + ' photo ' + (i + 2) + '" loading="lazy" decoding="async"></button>';
      }).join('') + '</div>' : '') +
      '<div class="hg-cta"><span>Interested in a package with this hotel?</span>' +
        '<a class="hg-btn hg-btn-wa" target="_blank" rel="noopener" href="' + esc(waLink('Assalam o Alaikum, I would like details of Umrah packages with ' + name)) + '">' +
        '<i class="fa-brands fa-whatsapp"></i> Ask on WhatsApp</a></div>';

    $('hgBody').onclick = function (e) {
      var b = e.target.closest('[data-i]');
      if (b) openLb(Number(b.getAttribute('data-i')));
    };
    var dl = $('hgDownloadAll');
    dl.hidden = false;
    dl.onclick = downloadAll;
  }

  function renderIndex(all, missingName) {
    document.title = 'Hotel Photo Gallery | Shadman Travels';
    $('hgTitle').textContent = 'Hotel Photo Gallery';
    $('hgSub').textContent = 'Choose a hotel to see its photos.';
    if (missingName) {
      $('hgBody').innerHTML = '<div class="hg-note"><strong>' + esc(pretty(missingName)) + '</strong> – photos coming soon. ' +
        '<a target="_blank" rel="noopener" href="' + esc(waLink('Assalam o Alaikum, please share photos of ' + pretty(missingName))) + '">Ask us on WhatsApp</a> and we will send them.</div>';
    } else {
      $('hgBody').innerHTML = '';
    }
    if (all.length) {
      $('hgOthers').querySelector('h2').textContent = missingName ? 'Hotels with photos' : 'All hotels';
      renderOthers(all, '');
    } else if (!missingName) {
      $('hgBody').innerHTML = '<p class="hg-note">No photos have been added yet.</p>';
    }
  }

  /* ── Lightbox ── */
  function show(i) {
    var imgs = state.hotel.images, n = imgs.length;
    state.idx = (i + n) % n;
    var src = imgs[state.idx];
    $('hgLbImg').src = src;
    $('hgLbImg').alt = pretty(state.hotel.name) + ' photo ' + (state.idx + 1);
    $('hgLbCount').textContent = (state.idx + 1) + ' / ' + n;
    var a = $('hgLbDl'); a.href = src; a.setAttribute('download', fileName(src));
    $('hgLbPrev').style.visibility = $('hgLbNext').style.visibility = n > 1 ? 'visible' : 'hidden';
    [1, -1].forEach(function (d) { new Image().src = imgs[(state.idx + d + n) % n]; });   // preload neighbours
  }
  function openLb(i) { $('hgLb').hidden = false; document.body.style.overflow = 'hidden'; show(i); $('hgLbClose').focus(); }
  function closeLb() { $('hgLb').hidden = true; document.body.style.overflow = ''; }
  function fileName(src) { try { return decodeURIComponent(src.split('/').pop()); } catch (e) { return 'photo.jpg'; } }

  function bindLb() {
    $('hgLbClose').onclick = closeLb;
    $('hgLbPrev').onclick = function () { show(state.idx - 1); };
    $('hgLbNext').onclick = function () { show(state.idx + 1); };
    $('hgLb').addEventListener('click', function (e) { if (e.target === $('hgLb')) closeLb(); });
    document.addEventListener('keydown', function (e) {
      if ($('hgLb').hidden) return;
      if (e.key === 'Escape') closeLb();
      else if (e.key === 'ArrowLeft') show(state.idx - 1);
      else if (e.key === 'ArrowRight') show(state.idx + 1);
    });
    var x0 = null;                                  // swipe on phones
    $('hgLb').addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    $('hgLb').addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) show(state.idx + (dx < 0 ? 1 : -1));
    });
  }

  /* ── Download all as one .zip ── */
  function loadZipLib() {
    return new Promise(function (ok, fail) {
      if (window.JSZip) return ok();
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload = ok; s.onerror = fail; document.head.appendChild(s);
    });
  }
  function downloadAll() {
    var btn = $('hgDownloadAll'), h = state.hotel, old = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Preparing…';
    loadZipLib().then(function () {
      var zip = new JSZip(), done = 0;
      return Promise.all(h.images.map(function (src, i) {
        return fetch(src).then(function (r) { if (!r.ok) throw new Error(); return r.blob(); }).then(function (b) {
          zip.file(String(i + 1).padStart(2, '0') + '-' + fileName(src), b);
          btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ' + (++done) + '/' + h.images.length;
        });
      })).then(function () { return zip.generateAsync({ type: 'blob' }); });
    }).then(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = pretty(h.name).replace(/[^\w ]+/g, '') + ' - Shadman Travels.zip';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
    }).catch(function () {
      alert('Could not prepare the download. Please open a photo and use "Save photo".');
    }).then(function () { btn.disabled = false; btn.innerHTML = old; });
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindLb();
    var want = new URLSearchParams(location.search).get('hotel') || '';
    fetch('/data/hotel-gallery.json')
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (data) {
        var all = (data.hotels || []).filter(function (h) { return h.images && h.images.length; });
        var k = keyOf(want);
        var hit = k && all.filter(function (h) { return h.key === k; })[0];
        if (hit) { renderHotel(hit); renderOthers(all, hit.key); }
        else renderIndex(all, want);
      })
      .catch(function () {
        $('hgTitle').textContent = 'Hotel Photo Gallery';
        $('hgBody').innerHTML = '<p class="hg-note">Photos are being updated. <a target="_blank" rel="noopener" href="https://wa.me/923000041510">WhatsApp us</a> and we will send them to you.</p>';
      });
  });
})();