/**
 * config.js
 * Shadman Travels & Tours — Project Shadman Platform
 * Business configuration, constants, and Google Sheets endpoint.
 * Update SHEETS_URL once your Apps Script is deployed.
 */

'use strict';

/* ─── GOOGLE SHEETS SUBMISSION ENDPOINT ─── */
const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwU10GNoOnSphx5Vsmr4mzHRUi60FtLvWUs5y_-WrTS--duoCZGNGbhz89qLi5kMc6TSg/exec';

/* ─── SHARED FORM SUBMISSION SECRET ───
   Must match SHARED_SECRET in Code.gs exactly.
   Blocks casual/automated bot spam — not a
   determined attacker (this code is publicly
   visible in the browser, same as SHEETS_URL). */
const FORM_SECRET = 'shdmn-b7f3-9k2x-travel-2026';

const TURNSTILE_SITE_KEY = '0x4AAAAAAFbTD5WJxNM0nVVq';

/* ─── BUSINESS INFO ─── */
const BUSINESS = {
  name:        'Shadman Travels & Tours',
  tagline:     'New Horizon Everyday',
  phone:       '+923000041510',
  phoneHref:   'tel:+923000041510',
  whatsapp:    'https://wa.me/923000041510',
  email:       'shadmantravel@yahoo.com',
  emailHref:   'mailto:shadmantravel@yahoo.com',
  instagram:   'https://instagram.com/shadman_travels',
  govLicense:  '3322',
  founded:     2005,
  customers:   '54k+',
  airlines:    '15+',
  yearsActive: '21+',
};