/**
 * faq.js
 * Shadman Travels & Tours — Project Shadman Platform
 *
 * FAQ section (#faq): topic tabs, question list and answer panel.
 *  - Desktop: answer panel sits beside the list.
 *  - Phone / tablet (<= 900px): the panel opens directly under the tapped question.
 * Data: data/faq.json  (each item: { topic, q, a })
 * Styles: css/faq.css
 */

'use strict';

(function loadFAQ() {
  const tabsEl = document.getElementById('faqTabs');
  const listEl = document.getElementById('faqList');
  const panel  = document.getElementById('faqAnswer');
  const qEl    = document.getElementById('faqQuestion');
  const aEl    = document.getElementById('faqAnswerText');
  if (!tabsEl || !listEl || !panel || !qEl || !aEl) return;

  const home = panel.parentNode;                          // desktop position of the panel
  const mq   = window.matchMedia('(max-width: 900px)');   // same breakpoint as css/faq.css
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  listEl.innerHTML = '<p class="faq3-msg">Loading questions…</p>';

  let topics   = [];   // [{ name, items: [{q, a}] }]
  let topicIdx = 0;
  let qIdx     = 0;

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* Phone: panel goes under the open question. Desktop: back beside the list. */
  function placePanel() {
    if (mq.matches) {
      const btn = listEl.querySelector('.faq3-q[data-q="' + qIdx + '"]');
      if (btn) btn.insertAdjacentElement('afterend', panel);
    } else if (panel.parentNode !== home) {
      home.appendChild(panel);
    }
  }

  function renderTabs() {
    tabsEl.innerHTML = topics.map(function (t, i) {
      return '<button type="button" class="faq3-tab" data-t="' + i + '" aria-pressed="' + (i === topicIdx) + '">' +
        esc(t.name) + '<span class="faq3-count">' + t.items.length + '</span></button>';
    }).join('');
  }

  function renderList() {
    home.appendChild(panel);   // rescue the panel before the list is rebuilt
    listEl.innerHTML = topics[topicIdx].items.map(function (it, i) {
      return '<button type="button" class="faq3-q" data-q="' + i + '" aria-pressed="false">' +
        '<span>' + pad(i + 1) + '</span><i class="faq3-qt">' + esc(it.q) + '</i></button>';
    }).join('');
  }

  function select(i, scroll) {
    const it = topics[topicIdx].items[i];
    qIdx = i;
    qEl.textContent = it.q;
    aEl.textContent = it.a || '';

    listEl.querySelectorAll('.faq3-q').forEach(function (b) {
      b.setAttribute('aria-pressed', String(parseInt(b.dataset.q, 10) === i));
    });
    placePanel();

    // restart the small fade-in on the answer panel
    panel.classList.remove('faq3-pop');
    void panel.offsetWidth;
    panel.classList.add('faq3-pop');

    // Phone: bring the tapped question (with its answer below it) to the top of the screen
    if (scroll && mq.matches) {
      const btn = listEl.querySelector('.faq3-q[data-q="' + i + '"]');
      if (btn) btn.scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
    }
  }

  /* Keep the chosen tab centred in the swipeable row */
  function centreTab(btn) {
    if (!mq.matches) return;
    tabsEl.scrollTo({
      left: btn.offsetLeft - (tabsEl.clientWidth - btn.offsetWidth) / 2,
      behavior: reduceMotion.matches ? 'auto' : 'smooth'
    });
  }

  tabsEl.addEventListener('click', function (e) {
    const b = e.target.closest('[data-t]');
    if (!b) return;
    topicIdx = parseInt(b.dataset.t, 10);
    tabsEl.querySelectorAll('.faq3-tab').forEach(function (t, i) {
      t.setAttribute('aria-pressed', String(i === topicIdx));
    });
    centreTab(b);
    renderList();
    select(0, false);
  });

  listEl.addEventListener('click', function (e) {
    const b = e.target.closest('[data-q]');
    if (b) select(parseInt(b.dataset.q, 10), true);
  });

  // Rotating a phone or resizing the window: move the panel to the right place
  mq.addEventListener('change', placePanel);

  fetch('/data/faq.json')
    .then(function (res) {
      if (!res.ok) throw new Error('Could not load FAQ');
      return res.json();
    })
    .then(function (data) {
      const items = data.filter(function (it) { return it.q && it.q.trim(); });
      if (!items.length) throw new Error('No FAQ items');

      // Group by topic, keeping the order topics first appear in the JSON
      items.forEach(function (it) {
        const name = (it.topic || 'General').trim();
        let t = topics.find(function (x) { return x.name === name; });
        if (!t) { t = { name: name, items: [] }; topics.push(t); }
        t.items.push({ q: it.q, a: it.a });
      });

      renderTabs();
      renderList();
      select(0, false);
    })
    .catch(function (err) {
      console.warn('FAQ JSON failed to load:', err);
      tabsEl.innerHTML = '';
      listEl.innerHTML = '<p class="faq3-msg">Unable to load FAQs right now — please call us at +92 300 0041510.</p>';
    });
})();