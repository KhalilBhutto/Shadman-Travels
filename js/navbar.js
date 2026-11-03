/**
 * navbar.js
 * Shadman Travels & Tours — Project Shadman Platform
 *
 *  - Announcement bar: running ticker filled from data/announcements.json, with a pause button
 *  - Mobile route menu: opened by the dock's Menu button (phones and tablets)
 *  - Navbar scroll class, scroll progress bar, smooth in-page anchors
 *  - Active link highlight (navbar, route menu, dock)
 *  - Umrah & Hajj double link
 * Styles: css/navbar.css      Markup: components/navbar.html, components/mobile-menu.html
 */

'use strict';

(function () {

  const DOCK_BREAKPOINT = 1100;   // must match the breakpoint in css/navbar.css

  const navbarEl  = document.getElementById('navbar');
  const menuEl    = document.getElementById('mobileMenu');
  const menuBtn   = document.getElementById('dockMenu');
  const menuClose = document.getElementById('mmClose');

  /* ═══ ANNOUNCEMENT BAR ═══ */
  function initAnnouncementBar() {
    const bar     = document.getElementById('announceBar');
    const track   = document.getElementById('abTrack');
    if (!bar || !track) return;
    const ticker = bar.querySelector('.ab-ticker');

    fetch('/data/announcements.json')
      .then(function (res) {
        if (!res.ok) throw new Error('Could not load announcements');
        return res.json();
      })
      .then(function (list) {
        const items = (Array.isArray(list) ? list : []).filter(function (it) { return it && it.text; });
        if (!items.length) throw new Error('No announcements');

        function addItems(set) {
          items.forEach(function (it) {
            const item = document.createElement('span');
            item.className = 'ab-item';
            if (it.icon) {
              const icon = document.createElement('i');
              icon.className = 'fa-solid fa-' + it.icon;
              icon.setAttribute('aria-hidden', 'true');
              item.appendChild(icon);
            }
            item.appendChild(document.createTextNode(it.text));
            const sep = document.createElement('span');
            sep.className = 'ab-sep';
            sep.setAttribute('aria-hidden', 'true');
            sep.textContent = '\u25C6';
            set.appendChild(item);
            set.appendChild(sep);
          });
        }

        const first = document.createElement('div');
        first.className = 'ab-set';
        addItems(first);
        track.textContent = '';
        track.appendChild(first);
        bar.hidden = false;

        // make one set at least as wide as the bar, so the loop never shows a gap
        let guard = 0;
        while (first.offsetWidth < ticker.offsetWidth && guard < 4) { addItems(first); guard++; }

        // second copy makes the loop seamless (hidden from screen readers)
        const copy = first.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        track.appendChild(copy);

        // about 45 pixels per second
        track.style.setProperty('--ab-dur', Math.max(20, Math.round(first.offsetWidth / 45)) + 's');
      })
      .catch(function (err) {
        console.warn('Announcement bar unavailable:', err);
        bar.hidden = true;
      });
  }

  /* ═══ MOBILE ROUTE MENU ═══ */
  function setMenu(open) {
    if (!menuEl || !menuBtn) return;

    // the menu starts right below the navbar, wherever the navbar is on screen

    menuEl.classList.toggle('open', open);
    menuEl.setAttribute('aria-hidden', String(!open));
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.documentElement.classList.toggle('menu-open', open);

    const icon  = menuBtn.querySelector('i');
    const label = menuBtn.querySelector('span');
    if (icon) {
      icon.classList.toggle('fa-bars', !open);
      icon.classList.toggle('fa-xmark', open);
    }
    if (label) label.textContent = open ? 'Close' : 'Menu';

    // the dock is hidden while the menu is open, so keyboard focus moves to the menu's own ✕ button
    if (open && menuClose) menuClose.focus({ preventScroll: true });
  }

  function toggleMobileMenu() { setMenu(!(menuEl && menuEl.classList.contains('open'))); }
  function closeMobileMenu()  { setMenu(false); }

  if (menuBtn) menuBtn.addEventListener('click', toggleMobileMenu);

  // the ✕ at the top-right of the menu closes it and gives focus back to the dock's Menu button
  if (menuClose) menuClose.addEventListener('click', function () {
    closeMobileMenu();
    if (menuBtn) menuBtn.focus({ preventScroll: true });
  });

  // any link in the menu or dock closes the menu
  document.querySelectorAll('.mm-stop, .dock a').forEach(function (a) {
    a.addEventListener('click', closeMobileMenu);
  });

  // Escape closes the menu and returns focus to the Menu button
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuEl && menuEl.classList.contains('open')) {
      closeMobileMenu();
      if (menuBtn) menuBtn.focus();
    }
  });

  // growing the window past the dock breakpoint closes the menu
  window.addEventListener('resize', function () {
    if (window.innerWidth > DOCK_BREAKPOINT) closeMobileMenu();
  });

  // kept so any other script that still calls these keeps working
  window.toggleMobileMenu = toggleMobileMenu;
  window.closeMobileMenu  = closeMobileMenu;

  /* ═══ NAVBAR: scrolled class + progress bar ═══ */
  function handleNavScroll() {
    if (navbarEl) navbarEl.classList.toggle('scrolled', window.scrollY > 80);
  }

  function handleScrollProgress() {
    const s   = document.documentElement;
    const pct = (s.scrollTop / (s.scrollHeight - s.clientHeight)) * 100;
    const bar = document.getElementById('progress');
    if (bar) bar.style.width = pct + '%';
  }

  /* ═══ ACTIVE LINK (navbar, route menu, dock) ═══
     The link whose section is nearest the top of the screen gets the .active class. */
  function initActiveLinks() {
    const links = Array.from(document.querySelectorAll('.nav-link, .mm-stop, .dock-item[href]'));
    const hashOf = function (a) {
      const h = a.getAttribute('href') || '';
      const i = h.indexOf('#');
      return i > -1 ? h.slice(i + 1) : '';
    };
    const ids = Array.from(new Set(links.map(hashOf).filter(Boolean)));
    const sections = ids.map(function (id) { return document.getElementById(id); }).filter(Boolean);
    if (!sections.length) return;

    let queued = false;
    function update() {
      queued = false;
      const line = window.innerHeight * 0.35;
      let current = '';
      let bestTop = -Infinity;
      sections.forEach(function (s) {
        const top = s.getBoundingClientRect().top;
        if (top <= line && top > bestTop) { bestTop = top; current = s.id; }
      });
      links.forEach(function (a) {
        a.classList.toggle('active', !!current && hashOf(a) === current);
      });
    }
    function onScroll() {
      if (!queued) { queued = true; requestAnimationFrame(update); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }

  /* ═══ SMOOTH SCROLL for in-page anchors ═══ */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  /* ═══ UMRAH & HAJJ: open packages page + scroll this page to the section ═══ */
  document.querySelectorAll('.umrah-dual-link').forEach(function (link) {
    link.addEventListener('click', function () {
      // target="_blank" already opens the packages page in a new tab —
      // this additionally scrolls the CURRENT page to the Umrah & Hajj section.
      const section = document.getElementById('umrah');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ═══ WIRE UP ═══ */
  window.addEventListener('scroll', function () {
    handleNavScroll();
    handleScrollProgress();
  });

  document.addEventListener('DOMContentLoaded', function () {
    initSmoothScroll();
    initActiveLinks();
    initAnnouncementBar();
  });

})();