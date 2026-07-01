/**
 * main.js
 * Shadman Travels & Tours — Project Shadman Platform
 *
 * Application entry point.
 * Initialises all modules that require the DOM to be ready.
 *
 * Load order in index.html:
 *   config.js → navbar.js → forms.js → airports.js → animations.js → main.js
 */

'use strict';

document.addEventListener('DOMContentLoaded', function () {

  /* ─── AIRPORT COMBOBOXES ───────────────────
     Initialise all static .ap-wrap elements
     that exist in the initial HTML.
     Dynamically-added legs (multi-city) call
     initCombobox() directly in forms.js.
  ─────────────────────────────────────────── */
  initAllComboboxes();

  /* ─── TRUST-STRIP MARQUEE DUPLICATE CHECK ──
     The marquee already contains a duplicate
     set of items for seamless looping — nothing
     extra needed. Keeping this comment as a
     reminder for future maintainers.
  ─────────────────────────────────────────── */

  /* ─── BOOK-NOW BUTTONS ─────────────────────
     All .book-btn elements redirect to the
     business phone number. Centralise here so
     the phone number comes from config.js.
  ─────────────────────────────────────────── */
  document.querySelectorAll('.book-btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      window.location.href = BUSINESS.phoneHref;
    });
  });

  /* ─── SET CURRENT YEAR IN FOOTER ───────────
     If the footer copyright element has
     id="footer-year" this keeps it current
     automatically. Falls back gracefully if
     the element does not exist.
  ─────────────────────────────────────────── */
  const yearEl = document.getElementById('footer-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

    /* ─── GA4 CONTACT CLICK TRACKING ───────────
     Tracks WhatsApp, Phone and Email clicks.
  ─────────────────────────────────────────── */
  document.addEventListener('click', function (e) {

    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href') || '';

    // WhatsApp
    if (href.includes('wa.me')) {
      if (typeof gtag === 'function') {
        gtag('event', 'whatsapp_click');
      }
    }

    // Phone
    if (href.startsWith('tel:')) {
      if (typeof gtag === 'function') {
        gtag('event', 'phone_click');
      }
    }

    // Email
    if (href.startsWith('mailto:')) {
      if (typeof gtag === 'function') {
        gtag('event', 'email_click');
      }
    }

  });

  console.info(
    '%c✈ Shadman Travels & Tours — Project Shadman Platform loaded.',
    'color:#c9a028;font-weight:bold;font-size:13px'
  );
});
