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
   TESTIMONIALS — Load from data/testimonials.json
   Groups 3 testimonials per slide automatically.
═══════════════════════════════════════════ */
(function loadTestimonials() {

  const container = document.getElementById('testi-container');
  if (!container) return;

  // Show a loading placeholder while the JSON fetches
  container.innerHTML = '<div class="testi-loading">Loading testimonials...</div>';

  fetch('/data/testimonials.json')
    .then(function(res) {
      if (!res.ok) throw new Error('Could not load testimonials');
      return res.json();
    })
    .then(function(data) {
      let html     = '';
      let isFirst  = true;

      // Group into slides of 3
      for (let i = 0; i < data.length; i += 3) {
        const group = data.slice(i, i + 3);
        html += '<div class="testi-slide' + (isFirst ? ' active' : '') + '">';

        group.forEach(function(t) {
          html += '<div class="testi-card-c">' +
            '<div class="testi-quote">"</div>' +
            '<div class="testi-stars">★★★★★</div>' +
            '<p class="testi-text">' + escapeHtml(t.text) + '</p>' +
            '<div class="testi-author">' +
              '<div class="testi-avatar">' + escapeHtml(t.avatar) + '</div>' +
              '<div>' +
                '<div class="testi-name">' + escapeHtml(t.name) + '</div>' +
                '<div class="testi-meta">' + escapeHtml(t.route) + ' • ' + escapeHtml(t.airline) + '</div>' +
              '</div>' +
            '</div>' +
          '</div>';
        });

        html += '</div>';
        isFirst = false;
      }

      container.innerHTML = html;

      // Restart the carousel now that slides exist
      initTestiCarousel();
    })
    .catch(function(err) {
      console.warn('Testimonials JSON failed to load:', err);
      // On error, show nothing — the section heading is still visible
      container.innerHTML = '';
    });

  // Safely escape user content to prevent XSS
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();

/* ═══════════════════════════════════════════
   DESTINATION OFFERS CAROUSEL (multi-card)
   Static square offer graphics — one airline
   promo per card, 5 visible at once like the
   hero's "Flights from Karachi" carousel.
═══════════════════════════════════════════ */
const DESTINATION_OFFERS = [
  { img: '/images/offers/airblue.png',       alt: 'Airblue Special Offer' },
  { img: '/images/offers/airsial.png',       alt: 'AirSial Special Offer' },
  { img: '/images/offers/emirates.png',      alt: 'Emirates Special Offer' },
  { img: '/images/offers/etihad.png',        alt: 'Etihad Airways Special Offer' },
  { img: '/images/offers/flydubai.png',      alt: 'FlyDubai Special Offer' },
  { img: '/images/offers/flynas.png',        alt: 'Flynas Special Offer' },
  { img: '/images/offers/flyadeal.png',      alt: 'Flyadeal Special Offer' },
  { img: '/images/offers/flyjinnah.png',     alt: 'Fly Jinnah Special Offer' },
  { img: '/images/offers/gulfair.png',       alt: 'Gulf Air Special Offer' },
  { img: '/images/offers/omanair.png',       alt: 'Oman Air Special Offer' },
  { img: '/images/offers/pia.png',           alt: 'PIA Special Offer' },
  { img: '/images/offers/qatarairways.png',  alt: 'Qatar Airways Special Offer' },
  { img: '/images/offers/salamair.png',      alt: 'SalamAir Special Offer' },
  { img: '/images/offers/saudia.png',        alt: 'Saudia Special Offer' },
  { img: '/images/offers/turkish.png',       alt: 'Turkish Airlines Special Offer' },
];

(function initDestinationCarousel() {
  const track    = document.getElementById('destTrack');
  const dotsWrap = document.getElementById('destDots');
  if (!track || !dotsWrap) return;

  const items = DESTINATION_OFFERS;
  const total = items.length;
  let index   = 0;
  let bgActive = 'A';

  track.innerHTML = items.map(function (d, i) {
    return '<div class="dest-card" data-idx="' + i + '" title="' + d.alt + '" style="background-image:url(\'' + d.img + '\')"></div>';
  }).join('');

  dotsWrap.innerHTML = items.map(function (d, i) {
    return '<div class="dest-dot" data-idx="' + i + '"></div>';
  }).join('');

  const cards = track.querySelectorAll('.dest-card');
  const dots  = dotsWrap.querySelectorAll('.dest-dot');

  function updateBackground() {
    const dest = items[index];
    if (!dest) return;
    const showing   = document.getElementById('destBg' + bgActive);
    const nextLayer = bgActive === 'A' ? 'B' : 'A';
    const hidden    = document.getElementById('destBg' + nextLayer);
    if (!showing || !hidden) return;
    hidden.style.backgroundImage = "url('" + dest.img + "')";
    hidden.classList.add('active');
    showing.classList.remove('active');
    bgActive = nextLayer;
  }

  function render() {
    cards.forEach(function (card, i) {
      const offset = (i - index + total) % total;
      let pos;
      if (offset === 0) pos = 'center';
      else if (offset === 1) pos = 'near-right';
      else if (offset === total - 1) pos = 'near-left';
      else if (offset === 2) pos = 'far-right';
      else if (offset === total - 2) pos = 'far-left';
      else pos = 'hidden';
      card.dataset.pos = pos;
    });
    dots.forEach(function (dot, i) {
      dot.classList.toggle('active', i === index);
    });
    updateBackground();
  }

  function goTo(n) {
    index = (n + total) % total;
    render();
  }

  let autoTimer = null;
  function restartAuto() {
    clearInterval(autoTimer);
    autoTimer = setInterval(function () { goTo(index + 1); }, 4000);
  }

  cards.forEach(function (card) {
    card.addEventListener('click', function () {
      goTo(parseInt(card.dataset.idx, 10));
      restartAuto();
    });
  });
  dots.forEach(function (dot) {
    dot.addEventListener('click', function () {
      goTo(parseInt(dot.dataset.idx, 10));
      restartAuto();
    });
  });

  const prevBtn = document.getElementById('destPrev');
  const nextBtn = document.getElementById('destNext');
  if (prevBtn) prevBtn.addEventListener('click', function () { goTo(index - 1); restartAuto(); });
  if (nextBtn) nextBtn.addEventListener('click', function () { goTo(index + 1); restartAuto(); });

  render();
  restartAuto();
})();


/* ═══════════════════════════════════════════
   FAQ — Load from data/faq.json
   Renders an accordion into #faqList. Each
   question toggles its own answer open/closed
   independently — no limit on how many can be
   open at once.
═══════════════════════════════════════════ */
(function loadFAQ() {

  const container = document.getElementById('faqList');
  if (!container) return;

  container.innerHTML = '<div class="testi-loading">Loading FAQs...</div>';

  fetch('/data/faq.json')
    .then(function(res) {
      if (!res.ok) throw new Error('Could not load FAQ');
      return res.json();
    })
    .then(function(data) {
      let html = '';

      data.forEach(function(item, i) {
        if (!item.q || !item.q.trim()) return; // skip blank/placeholder entries
        html += '<div class="faq-item reveal" id="faq-item-' + i + '">';
        html += '<button class="faq-question" onclick="toggleFAQ(' + i + ')" aria-expanded="false" aria-controls="faq-answer-' + i + '">';
        html += '<span>' + escapeHtml(item.q) + '</span>';
        html += '<span class="faq-chevron">▼</span>';
        html += '</button>';
        html += '<div class="faq-answer" id="faq-answer-' + i + '"><p>' + escapeHtml(item.a) + '</p></div>';
        html += '</div>';
      });

      container.innerHTML = html;

      if (typeof initScrollReveal === 'function') initScrollReveal();
    })
    .catch(function(err) {
      console.warn('FAQ JSON failed to load:', err);
      container.innerHTML = '<p style="text-align:center;color:var(--muted)">Unable to load FAQs right now — please call us at +92 300 0041510.</p>';
    });

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

})();

/** Toggles a single FAQ item open/closed. Exposed globally for the inline onclick. */
function toggleFAQ(index) {
  const item = document.getElementById('faq-item-' + index);
  const question = item.querySelector('.faq-question');
  const isOpen = item.classList.contains('open');

  item.classList.toggle('open', !isOpen);
  question.setAttribute('aria-expanded', String(!isOpen));
}
window.toggleFAQ = toggleFAQ;

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
        const revealClass = ['reveal', 'reveal delay-1', 'reveal delay-2', 'reveal delay-3', 'reveal delay-4'][i % 5];

        const hubTextClass = a.textOnColor === 'dark' ? 'acard-hub-dark' : 'acard-hub-light';

        html += '<div class="acard ' + revealClass + '" data-cat="' + escapeHtml(a.categories.join(' ')) + '">';
        html += '<div class="acard-top" style="background:' + escapeHtml(a.colorTop) + '">';
        html += '<div class="acard-logo-plate"><img src="' + escapeHtml(a.logo) + '" alt="' + escapeHtml(a.name) + ' logo" loading="lazy"></div>';
        html += '<div class="acard-hub ' + hubTextClass + '">✈ Hub: ' + escapeHtml(a.hub) + '</div>';
        html += '</div>';
        html += '<div class="acard-body"><p class="acard-desc">' + escapeHtml(a.desc) + '</p>';

        a.destinations.forEach(function(section) {
          html += '<div class="dest-section"><div class="dest-section-label">' + escapeHtml(section.label) + '</div><div class="dest-chips">';
          section.chips.forEach(function(chip) {
            const newClass = chip.new ? ' new' : '';
            const codeStr = chip.code ? ' (' + escapeHtml(chip.code) + ')' : '';
            html += '<span class="dest-chip' + newClass + '">' + escapeHtml(chip.name) + codeStr + (chip.new ? ' 🆕' : '') + '</span>';
          });
          html += '</div></div>';
        });

        const btnTextColor = a.textOnColor === 'dark' ? '#1a1a1a' : '#ffffff';

        html += '<div class="acard-footer"><div class="seats-badge">⚡ Limited Seats</div>';
        html += '<button class="book-btn" style="background:' + escapeHtml(a.colorBtn) + ';color:' + btnTextColor + '" onclick="window.location.href=\'tel:+923000041510\'">Book Now →</button></div>';
        html += '</div></div>';
      });

      container.innerHTML = html;

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

})();