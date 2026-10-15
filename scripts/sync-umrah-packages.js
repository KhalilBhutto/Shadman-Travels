#!/usr/bin/env node
/**
 * sync-umrah-packages.js
 * Shadman Travels & Tours — Project Shadman Platform
 *
 * Pulls the supplier's live package list, keeps only upcoming KHI -> JED
 * packages, adds the Shadman markup to the customer prices, and writes
 * data/umrah-packages.json in the format the website already uses.
 *
 * Usage:
 *   node scripts/sync-umrah-packages.js                 (live fetch, writes the file)
 *   node scripts/sync-umrah-packages.js --dry           (live fetch, prints summary only)
 *   node scripts/sync-umrah-packages.js --input f.json  (use a local file instead of fetching; for tests)
 *
 * Safety: if the fetch fails, the feed is not a list, nothing valid comes back,
 * or the result is suspiciously smaller than what is on the site now, the script
 * exits with an error and leaves data/umrah-packages.json untouched.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const FEED_URL   = process.env.SUPPLIER_FEED_URL || 'https://fullumrahpackage.com/PackagesData.ashx';
const MARKUP     = Number(process.env.MARKUP_PKR || 10000);
const OUT_FILE   = path.join(__dirname, '..', 'data', 'umrah-packages.json');
const TZ         = 'Asia/Karachi';

const args   = process.argv.slice(2);
const DRY    = args.includes('--dry');
const inIdx  = args.indexOf('--input');
const INPUT  = inIdx !== -1 ? args[inIdx + 1] : null;

const AIRLINES = {
  PK: 'Pakistan International Airlines',
  '9P': 'Fly Jinnah',
  PA: 'AirBlue',
  SV: 'Saudia'
};
const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fail(msg) { console.error('SYNC ABORTED: ' + msg); process.exit(1); }

async function fetchFeed() {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 30000);
      const res = await fetch(FEED_URL, {
        signal: ctrl.signal,
        headers: { 'Accept': 'application/json', 'User-Agent': 'ShadmanTravels-PackageSync/1.0 (+https://shadmantravels.com)' }
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) {
      lastErr = e;
      console.warn('Fetch attempt ' + attempt + ' failed: ' + e.message);
      if (attempt < 3) await new Promise(r => setTimeout(r, 5000 * attempt));
    }
  }
  fail('could not fetch supplier feed (' + (lastErr && lastErr.message) + ')');
}

// "2026-11-04T00:00:00" -> "2026-11-04" (taken from the text, so time zones can't shift the day)
function isoDay(v) {
  const m = String(v || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[1] + '-' + m[2] + '-' + m[3] : null;
}
function longDate(iso) {            // 2026-11-04 -> "04 Nov 2026"
  const [y, m, d] = iso.split('-');
  return d + ' ' + MON[Number(m) - 1] + ' ' + y;
}
function shortDate(iso) {           // 2026-11-04 -> "04-NOV"
  const [, m, d] = iso.split('-');
  return d + '-' + MON[Number(m) - 1].toUpperCase();
}
// Supplier times look like seconds after midnight (77400 = 9:30 PM). "HH:MM" text is also accepted.
function clock(v) {
  if (v === null || v === undefined || v === '') return '';
  let mins;
  if (typeof v === 'string' && /^\d{1,2}:\d{2}/.test(v)) {
    const [h, m] = v.split(':').map(Number); mins = h * 60 + m;
  } else {
    const n = Number(v);
    if (!isFinite(n)) return '';
    mins = Math.round(n / 60);
  }
  mins = ((mins % 1440) + 1440) % 1440;
  let h = Math.floor(mins / 60); const m = mins % 60;
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12; if (h === 0) h = 12;
  return h + ':' + String(m).padStart(2, '0') + ' ' + ap;
}
// Shown exactly as the supplier shows it: just the number (e.g. "20" or "30").
function baggage(v) {
  const n = parseInt(v, 10);
  return n > 0 ? String(n) : '';
}
function flightNo(code, no) {
  const n = String(no || '').trim();
  if (!n) return code;
  return /^([A-Za-z]\d|\d[A-Za-z]|[A-Za-z]{2})-?\d/.test(n) ? n : code + '-' + n;
}
function price(base, addMarkup) {
  const n = Number(base);
  if (!isFinite(n) || n <= 0) return null;
  return Math.round(n) + (addMarkup ? MARKUP : 0);
}
function isKhiJed(r) {
  const title = String(r.PackageTitle || '').toUpperCase();
  const a = String(r.RouteStart || '').toUpperCase();
  const b = String(r.RouteEnd || '').toUpperCase();
  return (a === 'KHI' && b === 'JED') || title.includes('KHI-JED');
}

function mapPackage(r, todayIso) {
  if (r.IsActive === false || r.IsActive === 0 || String(r.IsActive).toLowerCase() === 'false') return null;
  if (!isKhiJed(r)) return null;

  const dep = isoDay(r.DepartureDate) || isoDay(r.TravelDate);
  if (!dep || dep < todayIso) return null;
  const ret = isoDay(r.ArrivalDate);

  const code = String(r.Airline || '').trim().toUpperCase();
  const sharing = price(r.PriceSharing, true);
  if (!sharing) return null;                       // no usable price -> don't show it

  const seats = Number(r.AvailableSeats);
  const seatsLeft = isFinite(seats) ? Math.max(0, seats) : 0;
  const pricing = {
    sharing,
    quad:   price(r.PriceQuad, true),
    triple: price(r.PriceTriple, true),
    double: price(r.PriceDouble, true),
    infant: price(r.InfantPrice, true)
  };

  const titleRoute = (String(r.PackageTitle || '').split('|').pop() || '').trim();
  const route = /^[A-Z]{3}(-[A-Z]{3})+$/.test(titleRoute) ? titleRoute : 'KHI-JED-KHI';

  return {
    code: 'PKG ' + r.PackageId,
    packageCode: String(r.PackageCode || ''),
    groupCode: String(r.GroupCode || ''),
    airline: AIRLINES[code] || String(r.AirlineName || code),
    airlineCode: code,
    status: seatsLeft > 0 ? 'Available' : 'Sold Out',
    route,
    nights: Number(r.NightsCount),
    travelDate: shortDate(dep),
    seatsLeft,
    outbound: {
      flightNo: flightNo(code, r.DepartureFlightNo),
      from: r.DepartureSectorFrom || 'KHI',
      to:   r.DepartureSectorTo   || 'JED',
      date: longDate(dep),
      depTime: clock(r.DepartureETD),
      arrTime: clock(r.DepartureETA),
      baggage: baggage(r.DepartureBaggage)
    },
    return: {
      flightNo: flightNo(code, r.ArrivalFlightNo),
      from: r.ArrivalSectorFrom || 'JED',
      to:   r.ArrivalSectorTo   || 'KHI',
      date: ret ? longDate(ret) : '',
      // The supplier's return-leg fields are swapped: "ArrivalETA" holds the time the
      // flight leaves Jeddah and "ArrivalETD" the time it lands in Karachi (checked on
      // all KHI-JED flights: this order gives a 4-hour flight, the other gives 16 hours).
      depTime: clock(r.ArrivalETA),
      arrTime: clock(r.ArrivalETD),
      baggage: baggage(r.ArrivalBaggage)
    },
    makkahHotel:  { name: String(r.MakkahHotel || '').trim(),  nights: Number(r.MakkahNights)  || 0, location: String(r.MakkahHotelDistance || '').trim() },
    madinahHotel: { name: String(r.MadinahHotel || '').trim(), nights: Number(r.MadinahNights) || 0, location: String(r.MedinahHotelDistance || r.MadinahHotelDistance || '').trim() },
    pricing,
    bestValue: 'sharing',
    _dep: dep
  };
}

(async function main() {
  const raw = INPUT ? JSON.parse(fs.readFileSync(INPUT, 'utf8')) : await fetchFeed();
  if (!Array.isArray(raw)) fail('supplier feed was not a list');

  const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: TZ });
  const mapped = raw.map(r => mapPackage(r, todayIso)).filter(Boolean);
  mapped.sort((a, b) => a._dep.localeCompare(b._dep) || a.code.localeCompare(b.code));
  const out = mapped.map(p => { delete p._dep; return p; });

  console.log('Feed rows: ' + raw.length + ' | kept (active, KHI-JED, upcoming): ' + out.length + ' | today (' + TZ + '): ' + todayIso);
  out.slice(0, 3).forEach(p => console.log('  ' + p.code + ' ' + p.airlineCode + ' ' + p.outbound.date + ' ' + p.outbound.depTime + ' -> ' + p.outbound.arrTime + ' | return ' + p.return.depTime + ' -> ' + p.return.arrTime + ' | sharing ' + p.pricing.sharing));

  if (raw.length === 0) fail('supplier feed was empty');

  // Compare with what is on the site now (only upcoming packages count)
  let oldList = [];
  try { oldList = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8')); } catch (e) { /* first run */ }
  const oldUpcoming = oldList.filter(p => {
    const m = String(p.outbound && p.outbound.date).match(/^(\d{2}) (\w{3}) (\d{4})$/);
    if (!m) return false;
    const iso = m[3] + '-' + String(MON.indexOf(m[2]) + 1).padStart(2, '0') + '-' + m[1];
    return iso >= todayIso;
  });
  if (out.length === 0 && oldUpcoming.length > 0) fail('result is empty but the site currently shows ' + oldUpcoming.length + ' upcoming package(s)');
  if (oldUpcoming.length >= 6 && out.length < oldUpcoming.length * 0.5) fail('result (' + out.length + ') is less than half of the current ' + oldUpcoming.length + ' upcoming packages — check the feed');

  const text = JSON.stringify(out, null, 2) + '\n';
  const current = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf8').replace(/\r\n/g, '\n') : '';
  if (text === current) { console.log('No changes — data/umrah-packages.json is already up to date.'); return; }
  if (DRY) { console.log('DRY RUN — changes found but file not written.'); return; }
  fs.writeFileSync(OUT_FILE, text);
  console.log('Wrote ' + out.length + ' package(s) to data/umrah-packages.json');
})();