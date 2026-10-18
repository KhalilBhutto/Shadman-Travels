/**
 * google-reviews.js
 * Shadman Travels & Tours — Project Shadman Platform
 *
 * Loads data/google-reviews.json ONCE, then:
 *   1. fills the rotating review card in the hero (#heroReview)
 *   2. exposes window.ShadmanReviews so animations.js can build the
 *      "What Our Customers Say" section from the same data.
 *
 * Rules for data/google-reviews.json:
 *   - Only reviews that have text are shown. Copy the text EXACTLY as the
 *     customer wrote it (spelling included) — never edit it.
 *   - "hero": true  -> also rotates in the hero card.
 *   - "rating" / "total" / "asOf" are typed by hand — update them when a
 *     new review arrives (Google Business Profile shows the official numbers).
 *
 * Load order in index.html:  ... google-reviews.js -> animations.js
 */
'use strict';

(function () {

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function monthLabel(v) {                       // "2026-08" -> "Aug 2026"
    var m = /^(\d{4})-(\d{2})$/.exec(String(v || ''));
    return m && +m[2] >= 1 && +m[2] <= 12 ? MONTHS[+m[2] - 1] + ' ' + m[1] : '';
  }
  function clean(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }
  function pct(r) { r = Number(r); return isFinite(r) ? Math.max(0, Math.min(100, r / 5 * 100)) : 0; }
  function initial(name) { return (Array.from(String(name || '?'))[0] || '?').toUpperCase(); }
  // Star row filled to the real rating (4.5 -> 90 %). Colours come from CSS (.rv-stars).
  function stars(r) {
    return '<span class="rv-stars" style="--p:' + pct(r) + '%" role="img" aria-label="' + esc(r) + ' out of 5 stars">★★★★★</span>';
  }
  var G_ICON = '<svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">' +
    '<path fill="#FFC107" d="M43.6 20.5H42V20.4H24v7.2h11.3c-1.6 4.6-6 7.9-11.3 7.9-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.1-5.1C33.6 6.5 29.1 4.4 24 4.4 12.9 4.4 4 13.3 4 24.4s8.9 20 20 20c10 0 19.1-7.2 19.1-20 0-1.3-.1-2.2-.5-3.9z"/>' +
    '<path fill="#FF3D00" d="M6.3 14.7l5.9 4.3c1.6-4 5.5-6.8 10.1-6.8 3.1 0 5.8 1.2 8 3l5.1-5.1C33.6 6.5 29.1 4.4 24 4.4c-7.5 0-13.9 4.3-17.1 10.6z"/>' +
    '<path fill="#4CAF50" d="M24 44.4c5 0 9.5-1.9 12.9-5l-6-5c-1.9 1.4-4.4 2.2-6.9 2.2-5.3 0-9.7-3.3-11.3-8l-6.1 4.7c3.2 6.3 9.6 11.1 17.4 11.1z"/>' +
    '<path fill="#1976D2" d="M43.6 20.5H42V20.4H24v7.2h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6 5C40.9 35 44 30.3 44 24.4c0-1.3-.1-2.2-.4-3.9z"/></svg>';

  var ready = fetch('/data/google-reviews.json')
    .then(function (res) {
      if (!res.ok) throw new Error('Could not load google-reviews.json (HTTP ' + res.status + ')');
      return res.json();
    })
    .then(function (d) {
      d.reviews = (d.reviews || []).map(function (r) {
        return { name: String(r.name || '').trim(), rating: Number(r.rating), text: clean(r.text), when: monthLabel(r.when), hero: r.hero === true };
      }).filter(function (r) { return r.name && r.text && r.rating >= 1 && r.rating <= 5; });
      return d;
    });

  window.ShadmanReviews = { ready: ready, esc: esc, stars: stars, initial: initial, monthLabel: monthLabel, gIcon: G_ICON };

  /* ─── HERO REVIEW CARD ─── */
  function setText(id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; }

  function renderHero(d) {
    var root = document.getElementById('heroReview');
    if (!root) return;
    var list = d.reviews.filter(function (r) { return r.hero; });
    if (!list.length) { root.hidden = true; return; }

    var head = document.getElementById('hrHead');
    if (head) {
      if (d.profileUrl) head.href = d.profileUrl;
      if (isFinite(Number(d.rating)) && Number(d.total) > 0) {
        setText('hrRating', Number(d.rating).toFixed(1));
        var avg = document.getElementById('hrAvgStars');
        if (avg) avg.style.setProperty('--p', pct(d.rating) + '%');
        setText('hrCount', d.total + ' Google reviews');
        var asOf = monthLabel(d.asOf);
        setText('hrAsOf', asOf ? 'as of ' + asOf : '');
      } else {
        head.hidden = true;
      }
    }

    var slidesEl = document.getElementById('hrSlides');
    var dotsEl   = document.getElementById('hrDots');
    slidesEl.innerHTML = list.map(function (r, i) {
      return '<div class="hr-slide' + (i === 0 ? ' active' : '') + '" role="group" aria-roledescription="slide" aria-label="' + (i + 1) + ' of ' + list.length + '"' + (i ? ' aria-hidden="true"' : '') + '>' +
        '<blockquote class="hr-text">“' + esc(r.text) + '”</blockquote>' +
        '<div class="hr-who"><span class="hr-avatar" aria-hidden="true">' + esc(initial(r.name)) + '</span>' +
        '<div><div class="hr-name">' + esc(r.name) + '</div>' +
        '<div class="hr-meta">' + stars(r.rating) + ' · Google review' + (r.when ? ' · ' + esc(r.when) : '') + '</div></div></div></div>';
    }).join('');
    dotsEl.innerHTML = list.map(function (_, i) {
      return '<button type="button" class="hr-dot' + (i === 0 ? ' active' : '') + '" aria-label="Show review ' + (i + 1) + ' of ' + list.length + '"></button>';
    }).join('');
    if (list.length < 2) dotsEl.hidden = true;
    root.classList.add('is-ready');

    var slides = slidesEl.children, dots = dotsEl.children;
    var idx = 0, timer = null;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function show(n) {
      slides[idx].classList.remove('active'); slides[idx].setAttribute('aria-hidden', 'true'); dots[idx].classList.remove('active');
      idx = (n + list.length) % list.length;
      slides[idx].classList.add('active'); slides[idx].removeAttribute('aria-hidden'); dots[idx].classList.add('active');
    }
    function start() { if (reduce || list.length < 2 || timer || document.hidden) return; timer = setInterval(function () { show(idx + 1); }, 6500); }
    function stop()  { clearInterval(timer); timer = null; }

    // Pause while the visitor hovers or tabs into the card; never auto-rotate for reduced-motion visitors.
    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', function (e) { if (!root.contains(e.relatedTarget)) start(); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    dotsEl.addEventListener('click', function (e) {
      var b = e.target.closest('.hr-dot');
      if (!b) return;
      show(Array.prototype.indexOf.call(dots, b));
    });
    start();
  }

  ready.then(renderHero).catch(function (err) {
    console.warn('Hero reviews unavailable:', err);
    var root = document.getElementById('heroReview');
    if (root) root.hidden = true;
  });

})();