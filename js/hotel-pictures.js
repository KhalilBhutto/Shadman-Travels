/* js/hotel-pictures.js
 * Runs on the Umrah packages page. For every hotel box on every package card it:
 *   - shows the hotel's cover photo (from our own gallery) with a zoom cursor
 *   - makes the photo, the hotel name and a "Pictures" link open our gallery page
 * It does not touch js/umrah-packages.js - it simply decorates the cards after they are drawn.
 */
(function () {
  function keyOf(name) {                       // same rule as the gallery page + build script
    return String(name || '').toUpperCase().replace(/\bOR\s+SIMILAR\b/g, '').replace(/[^A-Z0-9]/g, '');
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var covers = {};                              // key -> cover image path

  function decorate(root) {
    root.querySelectorAll('.up-hotel:not([data-hp])').forEach(function (box) {
      var nameEl = box.querySelector('.up-hotel-name');
      if (!nameEl) return;
      box.setAttribute('data-hp', '1');
      var name = nameEl.textContent.trim();
      var url = '/pages/hotel-gallery.html?hotel=' + encodeURIComponent(name);
      var cover = covers[keyOf(name)];

      if (nameEl.tagName === 'A') { nameEl.href = url; }

      var ph = box.querySelector('.up-hotel-imgph');
      if (ph && cover) {
        ph.innerHTML = '<a class="up-hotel-zoom" href="' + esc(url) + '" target="_blank" rel="noopener" title="View all photos of ' + esc(name) + '">' +
          '<img src="' + esc(cover) + '" alt="' + esc(name) + '" loading="lazy" decoding="async">' +
          '<span class="up-hotel-zoom-icon"><i class="fa-solid fa-magnifying-glass-plus"></i></span></a>';
      }

      var pic = box.querySelector('.up-hotel-pictures');
      if (!pic) {
        var after = box.querySelector('.up-hotel-viewloc');
        pic = document.createElement('a');
        pic.className = 'up-hotel-pictures';
        pic.textContent = 'Pictures';
        pic.target = '_blank'; pic.rel = 'noopener';
        if (after) { after.insertAdjacentElement('afterend', pic); } else { box.appendChild(pic); }
      }
      pic.href = url; pic.target = '_blank'; pic.rel = 'noopener';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var grid = document.getElementById('upGrid');
    if (!grid) return;
    fetch('/data/hotel-gallery.json')
      .then(function (r) { return r.ok ? r.json() : { hotels: [] }; })
      .catch(function () { return { hotels: [] }; })
      .then(function (d) {
        (d.hotels || []).forEach(function (h) { if (h.cover) covers[h.key] = h.cover; });
        decorate(grid);
        // cards are redrawn on search / filter / sort, so decorate again whenever that happens
        new MutationObserver(function () { decorate(grid); }).observe(grid, { childList: true });
      });
  });
})();