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

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    init();
  }

  function init() {
    stars = [];
    for (let i = 0; i < 160; i++) {
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
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(201,160,40,${s.a * 0.6})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
})();

/* ═══════════════════════════════════════════
   SCROLL REVEAL  (.reveal / .reveal-left / .reveal-right)
═══════════════════════════════════════════ */
(function initScrollReveal() {
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
})();

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
(function initTestiCarousel() {
  const slides    = document.querySelectorAll('.testi-slide');
  const total     = slides.length;
  if (!total) return;

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
})();

/* ═══════════════════════════════════════════
   AIRLINE CARD FILTER
═══════════════════════════════════════════ */
(function initAirlineFilter() {
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
})();
