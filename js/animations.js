/**
 * animations.js
 * Shadman Travels & Tours — Project Shadman Platform
 *
 * Handles all visual / animation functionality:
 *  - Preloader hide on window load
 *  - Animated star canvas (hero background)
 *  - IntersectionObserver scroll-reveal
 *  - Animated stat counters
 *  - Testimonial carousel (auto-fade, no controls)
 *  - Airline card filter bar
 *
 * Depends on: nothing (self-contained)
 */

'use strict';

/* ═══════════════════════════════════════════
   PRELOADER
═══════════════════════════════════════════ */
window.addEventListener('load', () => {
  setTimeout(() => {
    const preloader = document.getElementById('preloader');
    if (preloader) preloader.classList.add('hidden');
  }, 1800);
});

/* ═══════════════════════════════════════════
   STAR CANVAS
═══════════════════════════════════════════ */
(function initStarCanvas() {
  const canvas = document.getElementById('starCanvas');
  if (!canvas) return;

  const ctx   = canvas.getContext('2d');
  let   stars = [];

  let animationId = null;
  let running = true;

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    init();
  }

  function init() {
    stars = [];

    const starCount = window.innerWidth < 768 ? 100 : 160;

    for (let i = 0; i < starCount; i++) {
      stars.push({
        x:  Math.random() * canvas.width,
        y:  Math.random() * canvas.height,
        r:  Math.random() * 1.5 + 0.3,
        a:  Math.random(),
        da: (Math.random() - 0.5) * 0.006,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.06,
      });
    }
  }
  
  function draw() {
    if (!running) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      // Twinkle
      s.a += s.da;
      if (s.a < 0.1 || s.a > 0.9) s.da *= -1;

      // Drift
      s.x += s.vx;
      s.y += s.vy;

      // Wrap around edges
      if (s.x < 0)             s.x = canvas.width;
      if (s.x > canvas.width)  s.x = 0;
      if (s.y < 0)             s.y = canvas.height;
      if (s.y > canvas.height) s.y = 0;

      ctx.beginPath();

      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(255,215,90,0.8)";

      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,215,90,${s.a * 0.75})`;
      ctx.fill();
      ctx.shadowBlur = 0;
      
    });

    animationId = requestAnimationFrame(draw);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      running = false;

      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    } else {
      if (!running) {
        running = true;
        draw();
      }
    }
  });

  window.addEventListener('resize', resize);
  resize();
  draw();
})();

/* ═══════════════════════════════════════════
   SCROLL REVEAL  (.reveal / .reveal-left / .reveal-right)
═══════════════════════════════════════════ */
function initScrollReveal() {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('in');
      });
    },
    { threshold: 0.08 }
  );

  document
    .querySelectorAll('.reveal, .reveal-left, .reveal-right')
    .forEach(el => observer.observe(el));
}
initScrollReveal();

/* ═══════════════════════════════════════════
   STAT COUNTER ANIMATION
═══════════════════════════════════════════ */

/**
 * Animates a single counter element from 0 to its data-count value.
 * @param {HTMLElement} el - Element with data-count and optional data-suffix
 */
function animateCount(el) {
  const target = parseInt(el.dataset.count, 10);
  const suffix = el.dataset.suffix || '+';
  const dur    = 1800;
  const start  = performance.now();

  function update(now) {
    const progress = Math.min((now - start) / dur, 1);
    const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.floor(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

(function initStatCounters() {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const numEl = entry.target.querySelector('.stat-num[data-count]');
          if (numEl && !numEl.dataset.animated) {
            numEl.dataset.animated = '1';
            animateCount(numEl);
          }
        }
      });
    },
    { threshold: 0.3 }
  );

  document.querySelectorAll('.stat-cell').forEach(c => observer.observe(c));
})();

/* ═══════════════════════════════════════════
   TESTIMONIAL CAROUSEL
   Auto-fades through slides every 5 seconds.
   No visible controls — accessibility-friendly
   because content is also available as static text.
═══════════════════════════════════════════ */
function initTestiCarousel() {
  const slides    = document.querySelectorAll('.testi-slide');
  const total     = slides.length;
  if (!total) return;

  // Clear any existing timer before restarting
  if (window._testiTimer) clearInterval(window._testiTimer);

  let current        = 0;
  let autoSlideTimer = null;

  function goToSlide(n) {
    slides[current].classList.remove('active');
    current = (n + total) % total;
    slides[current].classList.add('active');
  }

  function nextSlide() {
    goToSlide(current + 1);
  }

  function startAuto() {
    autoSlideTimer = setInterval(nextSlide, 5000);
  }

  function stopAuto() {
    clearInterval(autoSlideTimer);
  }

  // Expose manual controls so they remain available if navigation buttons
  // are ever added back to the HTML.
  window.testiNext = function () { stopAuto(); nextSlide(); startAuto(); };
  window.testiPrev = function () { stopAuto(); goToSlide(current - 1); startAuto(); };

  startAuto();
}

// Call once immediately for any server-rendered slides
initTestiCarousel();

/* ═══════════════════════════════════════════
   AIRLINE CARD FILTER
═══════════════════════════════════════════ */
function initAirlineFilter() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      // Update active state
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      const filter = this.dataset.filter;
      document.querySelectorAll('.acard').forEach(card => {
        if (filter === 'all') {
          card.style.display = '';
          return;
        }
        const cats = (card.dataset.cat || '').split(' ');
        card.style.display = cats.includes(filter) ? '' : 'none';
      });
    });
  });
}
initAirlineFilter();

/* ═══════════════════════════════════════════
   REVIEWS — dark bento wall, built from data/google-reviews.json
   Rating tile + one featured review + up to 4 smaller reviews.
   Clicking a smaller review makes it the featured one.
═══════════════════════════════════════════ */
(function loadTestimonials() {
  const container = document.getElementById('testi-container');
  if (!container) return;
  const section = container.closest('.testi-sec');
  const RV = window.ShadmanReviews;
  if (!RV) { if (section) section.hidden = true; return; }

  RV.ready.then(function (d) {
    const list = d.reviews.slice(0, 5);
    if (!list.length) throw new Error('no reviews with text');

    let featIdx = 0;
    const asOf = RV.monthLabel(d.asOf);
    const hasRating = isFinite(Number(d.rating)) && Number(d.total) > 0;

    const link = document.getElementById('rv2Link');
    if (link && d.profileUrl) link.href = d.profileUrl;

    function stars(rating, cls) {
      return '<div class="' + cls + ' rv-stars" style="--p:' + (rating / 5 * 100) + '%" role="img" aria-label="' + RV.esc(rating) + ' out of 5 stars">★★★★★</div>';
    }

    function author(r) {
      return '<div class="rv2-au"><div class="rv2-av" aria-hidden="true">' + RV.esc(RV.initial(r.name)) + '</div>' +
        '<div><div class="rv2-nm">' + RV.esc(r.name) + '</div>' +
        '<div class="rv2-meta">' + RV.gIcon + '<span>Google review' + (r.when ? ' · ' + RV.esc(r.when) : '') + '</span></div></div></div>';
    }

    function render() {
      let html = '';

      if (hasRating) {
        html += '<div class="rv2-rate"><span class="rv2-gpill">' + RV.gIcon + 'Google reviews</span>' +
          '<div class="rv2-big">' + Number(d.rating).toFixed(1) + '</div>' +
          stars(Number(d.rating), 'rv2-stars') +
          '<div class="rv2-total">' + Number(d.total) + ' Google reviews</div>' +
          (asOf ? '<small>as of ' + RV.esc(asOf) + '</small>' : '') + '</div>';
      }

      const f = list[featIdx];
      html += '<article class="rv2-feat"><span class="rv2-qm" aria-hidden="true">“</span>' +
        stars(f.rating, 'rv2-fstars') +
        '<p class="rv2-qt' + (String(f.text).length > 110 ? ' rv2-long' : '') + '">' + RV.esc(f.text) + '</p>' +
        author(f) + '</article>';

      list.forEach(function (r, i) {
        if (i === featIdx) return;
        html += '<article class="rv2-card" data-i="' + i + '" tabindex="0" role="button" aria-label="Show the review by ' + RV.esc(r.name) + '">' +
          stars(r.rating, 'rv2-cstars') +
          '<p class="rv2-ct">' + RV.esc(r.text) + '</p>' +
          author(r) + '</article>';
      });

      container.innerHTML = html;
    }

    function pick(e) {
      const c = e.target.closest('[data-i]');
      if (!c) return;
      featIdx = parseInt(c.dataset.i, 10);
      render();
    }
    container.addEventListener('click', pick);
    container.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(e); }
    });

    render();
  }).catch(function (err) {
    console.warn('Testimonials unavailable:', err);
    if (section) section.hidden = true;
  });
})();

/* ═══════════════════════════════════════════
   WHERE WE FLY — region tabs + featured destination
   Data: data/where-we-fly.json
═══════════════════════════════════════════ */
(function loadWhereWeFly() {
  const mount  = document.getElementById('wwfMount');
  const tabsEl = document.getElementById('wwfTabs');
  if (!mount || !tabsEl) return;

  let regions = [];
  let regionIdx = 0;
  let featIdx = 0;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // Photo (if the JSON has one) on top of a dark gradient; empty = CSS default gradient
  function bg(c) {
    return c.image
      ? "background-image:linear-gradient(180deg,rgba(6,15,9,.05) 20%,rgba(6,15,9,.9)),url('" + esc(c.image) + "')"
      : '';
  }

  function quoteUrl(c) {
    return 'https://wa.me/923000041510?text=' + encodeURIComponent(
      'Hello Shadman Travels, I would like a fare quote for ' + c.city + ' (' + c.country + ').');
  }

  function syncTabs() {
    tabsEl.querySelectorAll('.wwf-tab').forEach(function (b, i) {
      b.classList.toggle('on', i === regionIdx);
      b.setAttribute('aria-pressed', String(i === regionIdx));
    });
  }

  function render() {
    const list = regions[regionIdx].cities;
    const f = list[featIdx];

    let html = '<article class="wwf-banner" style="' + bg(f) + '">';
    html += '<span class="wwf-pill">Featured destination</span>';
    html += '<span class="wwf-idx">' + pad(featIdx + 1) + ' / ' + pad(list.length) + '</span>';
    html += '<div class="wwf-row"><div><h3 class="wwf-big">' + esc(f.city) + '</h3>';
    html += '<div class="wwf-country">' + esc(f.country) + '</div>';
    if (f.hook) html += '<p class="wwf-hook">' + esc(f.hook) + '</p>';
    html += '</div><a class="wwf-cta" href="' + quoteUrl(f) + '" target="_blank" rel="noopener">Get a quote →</a></div>';
    html += '</article>';

    html += '<div class="wwf-rail">';
    list.forEach(function (c, i) {
      if (i === featIdx) return;
      html += '<button type="button" class="wwf-tile" data-c="' + i + '" style="' + bg(c) + '">';
      html += '<span class="wwf-n">' + pad(i + 1) + '</span>';
      html += '<span class="wwf-tname">' + esc(c.city) + '</span>';
      html += '<span class="wwf-tcountry">' + esc(c.country) + '</span></button>';
    });
    html += '</div>';

    mount.innerHTML = html;
    syncTabs();
  }

  tabsEl.addEventListener('click', function (e) {
    const b = e.target.closest('[data-r]');
    if (!b) return;
    regionIdx = parseInt(b.dataset.r, 10);
    featIdx = 0;
    render();
  });

  mount.addEventListener('click', function (e) {
    const t = e.target.closest('[data-c]');
    if (!t) return;
    featIdx = parseInt(t.dataset.c, 10);
    render();
  });

  fetch('/data/where-we-fly.json')
    .then(function (res) {
      if (!res.ok) throw new Error('Could not load destinations');
      return res.json();
    })
    .then(function (data) {
      regions = (data.regions || []).filter(function (r) { return r.cities && r.cities.length; });
      if (!regions.length) throw new Error('No destinations in JSON');
      tabsEl.innerHTML = regions.map(function (r, i) {
        return '<button type="button" class="wwf-tab" data-r="' + i + '" aria-pressed="false">' + esc(r.name) + '</button>';
      }).join('');
      render();
    })
    .catch(function (err) {
      console.warn('Where We Fly failed to load:', err);
      mount.innerHTML = '<p class="wwf-error">Unable to load destinations right now — please call us at +92 300 0041510.</p>';
    });
})();


/* ═══════════════════════════════════════════
   FAQ — chat hub, built from data/faq.json
   Questions split left/right of the phone. Tapping one shows it
   as a chat message with its answer. On phones/tablets the page
   scrolls up to the chat after a tap.
═══════════════════════════════════════════ */
(function loadFAQ() {
  const left  = document.getElementById('faqLeft');
  const right = document.getElementById('faqRight');
  const qEl   = document.getElementById('faqQ');
  const aEl   = document.getElementById('faqA');
  const phone = document.getElementById('faqPhone');
  if (!left || !right || !qEl || !aEl) return;

  left.innerHTML = '<p class="faq2-msg">Loading questions…</p>';

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  fetch('/data/faq.json')
    .then(function (res) {
      if (!res.ok) throw new Error('Could not load FAQ');
      return res.json();
    })
    .then(function (data) {
      const items = data.filter(function (it) { return it.q && it.q.trim(); });
      if (!items.length) throw new Error('No FAQ items');

      const half = Math.ceil(items.length / 2);

      function btn(it, i) {
        return '<button type="button" class="faq2-q" data-i="' + i + '" aria-pressed="false"><span>' + pad(i + 1) + '</span>' + esc(it.q) + '</button>';
      }
      left.innerHTML  = items.slice(0, half).map(function (it, i) { return btn(it, i); }).join('');
      right.innerHTML = items.slice(half).map(function (it, i) { return btn(it, i + half); }).join('');

      function select(i, scroll) {
        const it = items[i];
        qEl.textContent = it.q;
        aEl.textContent = it.a || '';

        // restart the small fade-in on the answer bubble
        aEl.classList.remove('faq2-pop');
        void aEl.offsetWidth;
        aEl.classList.add('faq2-pop');

        document.querySelectorAll('.faq2-q').forEach(function (b) {
          const on = parseInt(b.dataset.i, 10) === i;
          b.classList.toggle('on', on);
          b.setAttribute('aria-pressed', String(on));
        });

        if (scroll && phone && window.innerWidth <= 1000) {
          const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          phone.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        }
      }

      [left, right].forEach(function (col) {
        col.addEventListener('click', function (e) {
          const b = e.target.closest('.faq2-q');
          if (b) select(parseInt(b.dataset.i, 10), true);
        });
      });

      select(0, false);
    })
    .catch(function (err) {
      console.warn('FAQ JSON failed to load:', err);
      left.innerHTML = '<p class="faq2-msg">Unable to load FAQs right now — please call us at +92 300 0041510.</p>';
    });
})();

/* ═══════════════════════════════════════════
   AIRLINES — Load from data/airlines.json
   Replaces the previously hardcoded airline
   cards. Renders into #airlinesGrid, then
   re-runs initAirlineFilter() so the existing
   filter bar still works against the new cards.
═══════════════════════════════════════════ */
(function loadAirlines() {

  const container = document.getElementById('airlinesGrid');
  if (!container) return;

  container.innerHTML = '<div class="testi-loading">Loading airlines...</div>';

  fetch('/data/airlines.json')
    .then(function(res) {
      if (!res.ok) throw new Error('Could not load airlines');
      return res.json();
    })
    .then(function(data) {
      let html = '';

      data.forEach(function(a, i) {
        const revealClass = ['reveal', 'reveal delay-1'][i % 2];
        const regions = (a.destinations || []).map(function(s) { return s.label; }).join(' · ');
        // Flyer file has the same name as the logo file, but lives in /images/offers/
        const offerImg = '/images/offers/' + String(a.logo || '').split('/').pop();

        html += '<article class="acard ' + revealClass + '" data-cat="' + escapeHtml(a.categories.join(' ')) + '" style="--brand:' + escapeHtml(a.colorTop) + '">';
        html += '<div class="acard-main">';
        html += '<div class="acard-head"><div class="acard-logo-plate"><img src="' + escapeHtml(a.logo) + '" alt="' + escapeHtml(a.name) + ' logo" loading="lazy"></div>';
        html += '<div><h3 class="acard-name">' + escapeHtml(a.name) + '</h3><div class="acard-hub">Hub: ' + escapeHtml(a.hub) + '</div></div></div>';
        html += '<p class="acard-desc">' + escapeHtml(a.desc) + '</p>';
        if (regions) html += '<div class="acard-regions">' + escapeHtml(regions) + '</div>';
        html += '</div>';
        html += '<div class="acard-stub"><span class="notch notch-t"></span><span class="notch notch-b"></span>';
        html += '<small>Exclusive fare</small>';
        html += '<button type="button" class="book-btn" data-call="tel:+923000041510">Book Now →</button>';
        html += '<button type="button" class="offer-btn" data-offer="' + escapeHtml(offerImg) + '" data-name="' + escapeHtml(a.name) + '">View offer</button>';
        html += '</div></article>';
      });

      container.innerHTML = html;

      container.querySelectorAll('.book-btn[data-call]').forEach(function(btn) {
        btn.addEventListener('click', function() {
          window.location.href = btn.dataset.call;
        });
      });

      container.querySelectorAll('.offer-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          openOfferDialog(btn.dataset.offer, btn.dataset.name);
        });
      });

      if (typeof initAirlineFilter === 'function') initAirlineFilter();
      if (typeof initScrollReveal === 'function') initScrollReveal();
    })
    .catch(function(err) {
      console.warn('Airlines JSON failed to load:', err);
      container.innerHTML = '<p style="text-align:center;color:var(--muted)">Unable to load airline partners right now — please call us at +92 300 0041510.</p>';
    });

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* Opens one airline's flyer full-size in a native <dialog> pop-up. */
  function openOfferDialog(src, name) {
    let dlg = document.getElementById('offerDialog');
    if (!dlg) {
      dlg = document.createElement('dialog');
      dlg.id = 'offerDialog';
      dlg.className = 'offer-dialog';
      dlg.setAttribute('aria-labelledby', 'offerDialogTitle');
      dlg.innerHTML =
        '<div class="offer-box">' +
          '<button type="button" class="offer-close" aria-label="Close offer">&times;</button>' +
          '<h3 class="offer-title" id="offerDialogTitle"></h3>' +
          '<img class="offer-img" alt="">' +
          '<div class="offer-actions">' +
            '<a class="offer-call" href="tel:+923000041510"><i class="fas fa-phone"></i> Call to book</a>' +
            '<a class="offer-wa" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>' +
          '</div>' +
        '</div>';
      document.body.appendChild(dlg);
      dlg.querySelector('.offer-close').addEventListener('click', function() { dlg.close(); });
      dlg.addEventListener('click', function(e) { if (e.target === dlg) dlg.close(); });
    }
    dlg.querySelector('.offer-title').textContent = name + ' — Special Offer';
    const img = dlg.querySelector('.offer-img');
    img.src = src;
    img.alt = name + ' special offer flyer';
    dlg.querySelector('.offer-wa').href = 'https://wa.me/923000041510?text=' +
      encodeURIComponent('Hello Shadman Travels, I saw the ' + name + ' offer and would like today\'s fare.');
    if (typeof dlg.showModal === 'function') dlg.showModal();
  }

})();