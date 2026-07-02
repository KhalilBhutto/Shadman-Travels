/**
 * navbar.js
 * Shadman Travels & Tours — Project Shadman Platform
 * Mobile drawer, hamburger toggle, sticky nav scroll class,
 * and smooth-scroll for in-page anchor links.
 * Depends on: nothing (self-contained DOM manipulation)
 */

'use strict';

/* ─── ELEMENTS ─── */
const navbarEl     = document.getElementById('navbar');
const mobileMenuEl = document.getElementById('mobileMenu');
const hamBtn       = document.getElementById('ham');
const overlayEl    = document.getElementById('overlay');

/* ─── MOBILE MENU FOCUSABILITY ─── */
// When menu is closed, make all links inside un-tabbable so keyboard
// users cannot accidentally reach invisible hidden links.
function setMobileMenuFocusability(isOpen) {
  const links = mobileMenuEl.querySelectorAll('a, button');
  links.forEach(function(el) {
    if (isOpen) {
      el.removeAttribute('tabindex');
    } else {
      el.setAttribute('tabindex', '-1');
    }
  });
}

/* ─── MOBILE MENU ─── */
function toggleMobileMenu() {
  const isOpen = mobileMenuEl.classList.toggle('open');

  hamBtn.classList.toggle('open', isOpen);
  overlayEl.classList.toggle('show', isOpen);

  mobileMenuEl.setAttribute('aria-hidden', String(!isOpen));
  hamBtn.setAttribute('aria-expanded', String(isOpen));
  setMobileMenuFocusability(isOpen);

  if (!isOpen) {
    hamBtn.focus();
  }
}

function closeMobileMenu() {
  hamBtn.focus();

  mobileMenuEl.classList.remove('open');
  hamBtn.classList.remove('open');
  overlayEl.classList.remove('show');

  mobileMenuEl.setAttribute('aria-hidden', 'true');
  hamBtn.setAttribute('aria-expanded', 'false');
  setMobileMenuFocusability(false);
}

/* ─── STICKY NAV — add .scrolled class after 80 px ─── */
function handleNavScroll() {
  if (!navbarEl) return;
  navbarEl.classList.toggle('scrolled', window.scrollY > 80);
}

/* ─── SCROLL PROGRESS BAR ─── */
function handleScrollProgress() {
  const s   = document.documentElement;
  const pct = (s.scrollTop / (s.scrollHeight - s.clientHeight)) * 100;
  const bar = document.getElementById('progress');
  if (bar) bar.style.width = pct + '%';
}

/* ─── SMOOTH SCROLL for in-page anchors ─── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/* ─── WIRE UP ─── */
window.addEventListener('scroll', () => {
  handleNavScroll();
  handleScrollProgress();
});

// Hamburger button — onclick is also set inline in HTML as fallback;
// attaching here keeps JS in one place.
if (hamBtn) {
  hamBtn.addEventListener('click', toggleMobileMenu);
}

// Overlay click closes menu
if (overlayEl) {
  overlayEl.addEventListener('click', closeMobileMenu);
}

// Expose for inline HTML onclick attributes (mobile-menu links)
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu  = closeMobileMenu;

document.addEventListener('DOMContentLoaded', initSmoothScroll);
// Set menu links as un-tabbable on first load (menu starts closed)
document.addEventListener('DOMContentLoaded', function() { setMobileMenuFocusability(false); });