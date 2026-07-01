/**
 * config.js
 * Shadman Travels & Tours — Project Shadman Platform
 * Business configuration, constants, and Google Sheets endpoint.
 * Update SHEETS_URL once your Apps Script is deployed.
 */

'use strict';

/* ─── GOOGLE SHEETS SUBMISSION ENDPOINT ─── */
const SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwU10GNoOnSphx5Vsmr4mzHRUi60FtLvWUs5y_-WrTS--duoCZGNGbhz89qLi5kMc6TSg/exec';

/* ─── BUSINESS INFO ─── */
const BUSINESS = {
  name:        'Shadman Travels & Tours',
  tagline:     'New Horizon Everyday',
  phone:       '+923000041510',
  phoneHref:   'tel:+923000041510',
  whatsapp:    'https://wa.me/923000041510',
  email:       'Shadmantravel@yahoo.com',
  emailHref:   'mailto:Shadmantravel@yahoo.com',
  instagram:   'https://instagram.com/shadman_travels',
  govLicense:  '3322',
  founded:     2005,
  customers:   '81k+',
  airlines:    '15+',
  yearsActive: '19+',
};

/* ─── PASSENGER PICKER STATE ─── */
// Shared mutable state for all three trip-type passenger pickers (oneway / roundtrip / multicity).
const paxState = {
  ow: { adults: 1, children: 0, infants: 0 },
  rt: { adults: 1, children: 0, infants: 0 },
  mc: { adults: 1, children: 0, infants: 0 },
};

/* ─── MULTI-CITY LEG COUNTERS ─── */
// Tracked here so forms.js and the hero search card share the same counter.
let mcLegCount    = 1;   // hero search card
