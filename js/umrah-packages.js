/**
 * umrah-packages.js
 * Shadman Travels & Tours — Project Shadman Platform
 * Fetches data/umrah-packages.json, renders detailed package cards,
 * and drives the filter bar (airline / nights / price range).
 * Structure and per-airline colors matched to the reference site's
 * real CSS values.
 * "Enquire Now" opens WhatsApp (see enquireUrl); it no longer uses js/notify.js.
 */

'use strict';

let ALL_PACKAGES = [];
let CURRENT_LIST = [];      // packages matching the current filters
let SHOWN = 0;              // how many cards are on screen
const PAGE_SIZE = 24;       // cards added per click of "Show more"

// Real per-airline colors (matched from reference site source)
const AIRLINE_INFO = {
  pia: {
    logo: '/images/airlines/pia.png',
    gradient: 'linear-gradient(160deg, #005432 0%, #005432 10%, #ba9d11 100%)',
    border: '#ba9d11'
  },
  ab: {
    logo: '/images/airlines/airblue.png',
    gradient: 'linear-gradient(160deg, #061d56 0%, #153375 60%, #828282 100%)',
    border: '#828282'
  },
  fj: {
    logo: '/images/airlines/flyjinnah.png',
    gradient: 'linear-gradient(160deg, #6b0909 0%, #b91c1c 60%, #dc2626 100%)',
    border: 'rgba(248, 113, 113, 0.6)'
  },
  sv: {
    logo: '/images/airlines/saudia.png',
    gradient: 'linear-gradient(160deg, #0b3d2e 0%, #00734a 55%, #3c8f6a 100%)',
    border: '#3c8f6a'
  },
};

// Used for any airline that has no colours of its own yet (shows no logo)
const OTHER_AIRLINE = {
  logo: '',
  gradient: 'linear-gradient(160deg, #1f2937 0%, #374151 60%, #6b7280 100%)',
  border: '#6b7280'
};

// Short name shown in the airline filter list (unknown airlines use their own name from the data)
const AIRLINE_LABEL = { pia: 'PIA', ab: 'AirBlue', fj: 'Fly Jinnah', sv: 'Saudia' };

// Picks the colour theme from the airline CODE (PK, 9P, PA, SV), which the
// supplier feed always provides. Falls back to the airline name, then to PIA.
function airlineClass(p) {
  const code = String(p.airlineCode || '').toUpperCase();
  if (code === 'PK') return 'pia';
  if (code === '9P') return 'fj';
  if (code === 'PA') return 'ab';
  if (code === 'SV') return 'sv';
  const name = String(p.airline || '');
  if (name.includes('Pakistan International')) return 'pia';
  if (name.includes('Fly Jinnah')) return 'fj';
  if (name.includes('AirBlue')) return 'ab';
  if (name.includes('Saudi')) return 'sv';
  // Unknown airline: give it its own group (never mislabel it as PIA)
  console.warn('Airline without its own colours in Umrah data:', p.airlineCode, p.airline);
  return 'x-' + (code || 'other').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function fmtPrice(n) {
  return (typeof n === 'number' && isFinite(n)) ? n.toLocaleString('en-PK') : 'Call us';
}

// Safely escape content before inserting into innerHTML — prevents
// a malicious value in the JSON data from running as code on the page.
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mapsUrl(hotelName, city) {
  const q = encodeURIComponent(hotelName + ', ' + city + ', Saudi Arabia');
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

// "Enquire Now" opens WhatsApp with the package already typed in, so the
// message reaches your phone straight away (no form, no email, no sheet).
function enquireUrl(p) {
  const text = 'Assalam o Alaikum, I would like details of Umrah package ' + p.packageCode +
    ' (' + p.airline + ', ' + p.nights + ' nights, departing ' + p.outbound.date + ').';
  return 'https://wa.me/923000041510?text=' + encodeURIComponent(text);
}

// Parses dates like "01 Sep 2026" explicitly (new Date("01 Sep 2026") is
// non-standard and not guaranteed in every browser). Returns an invalid
// Date if the text can't be understood.
const MONTHS = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
function parsePkgDate(str) {
  const m = String(str || '').trim().match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})$/);
  if (m && MONTHS[m[2].toLowerCase()] !== undefined) {
    return new Date(Number(m[3]), MONTHS[m[2].toLowerCase()], Number(m[1]));
  }
  return new Date(str); // fallback: ISO strings etc.
}

// True while the outbound flight date is today or later. Packages whose
// date can't be parsed are kept (and logged) rather than silently hidden.
function isUpcoming(p) {
  const d = parsePkgDate(p.outbound && p.outbound.date);
  if (isNaN(d)) {
    console.warn('Umrah package has an unreadable departure date:', p.code, p.outbound && p.outbound.date);
    return true;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d >= today;
}

// Hotel photo: the placeholder icon is always there; the photo is laid over it and hides itself if it fails to load
function hotelPhoto(h, icon) {
  if (!h || !h.image) return icon;
  return icon + '<img src="/' + escapeHtml(h.image) + '" alt="' + escapeHtml(h.name) + '" loading="lazy" decoding="async" ' +
         'onerror="this.style.display=\'none\'">';
}

// "PA - 170" style (the supplier writes a space around the dash)
function spacedFlightNo(n) { return String(n || '').replace(/\s*-\s*/, ' - '); }
// 18 Oct 2026 -> 18OCT
function compactDay(d) { const m = String(d || '').match(/^(\d{2}) (\w{3})/); return m ? m[1] + m[2].toUpperCase() : ''; }

// ─────────────────────────────────────────────────────────────────────
// COMPACT PACKAGE CARD
// The card shows the important facts. Hotels, photos, all prices, gifts
// and included services sit in a "details" area: it opens below the card
// on desktop, and as a pop-up (bottom sheet) on phones.
// ─────────────────────────────────────────────────────────────────────

// The supplier sends "12:00 AM" when it has no real time (all Saudia packages),
// so we treat it as "no time" and hide it instead of showing a wrong time.
function realTime(t) { return t && t !== '12:00 AM' ? t : ''; }

function legTimes(leg) {
  const d = realTime(leg.depTime), a = realTime(leg.arrTime);
  if (d && a) return d + ' → ' + a;
  if (d) return 'Departs ' + d;
  if (a) return 'Arrives ' + a;
  return '';
}

// One flight leg: label, flight number, route, date, times and baggage.
// A line that has no data is simply left out.
function legHTML(leg, label) {
  const sub = [legTimes(leg), leg.baggage ? 'Baggage ' + leg.baggage : ''].filter(Boolean).join(' · ');
  return `
        <div class="up2-leg">
          <div class="up2-leg-label">${label} · ${escapeHtml(spacedFlightNo(leg.flightNo))}</div>
          <div class="up2-leg-main">${escapeHtml(leg.from)} → ${escapeHtml(leg.to)} · ${escapeHtml(leg.date)}</div>
          ${sub ? `<div class="up2-leg-sub">${escapeHtml(sub)}</div>` : ''}
        </div>`;
}

// "850 METRE IBRAHIM KHALIL ROAD (INSIDE QUBRI)" -> "850 m"
// "350 METER - 400 METER SHAHRAH SALAM SIDE"     -> "350–400 m"
// "1100 METER HIJRA ROAD"                        -> "1.1 km"
// "SHUTTLE SERVICE IBRAHIM KHALIL ROAD"          -> "Shuttle"
// The full supplier text is still shown in the details area.
function fmtMeters(n) {
  return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + ' km' : n + ' m';
}
function distanceShort(loc) {
  const s = String(loc || '').toUpperCase();
  let m = s.match(/(\d+)\s*(?:METERS?|METRES?)\s*(?:-|TO)\s*(\d+)\s*(?:METERS?|METRES?)/);
  if (m) return Number(m[1]) + '–' + fmtMeters(Number(m[2]));
  m = s.match(/(\d+)\s*-?\s*(?:METERS?|METRES?)/);
  if (m) return fmtMeters(Number(m[1]));
  return /SHUTTLE/.test(s) ? 'Shuttle' : '';
}

// Bar showing how the nights are split, with the supplier's distance on each side.
function stayBarHTML(p) {
  const mk = Number(p.makkahHotel.nights) || 0;
  const md = Number(p.madinahHotel.nights) || 0;
  const dMk = distanceShort(p.makkahHotel.location);
  const dMd = distanceShort(p.madinahHotel.location);
  return `
          <div class="up2-stay">
            <div class="up2-stay-mk" style="flex:${mk || 1} 1 0"><span>Makkah${mk ? ' · ' + mk + 'N' : ''}</span>${dMk ? `<span class="up2-stay-d">${escapeHtml(dMk)}</span>` : ''}</div>
            <div class="up2-stay-md" style="flex:${md || 1} 1 0"><span>Madinah${md ? ' · ' + md + 'N' : ''}</span>${dMd ? `<span class="up2-stay-d">${escapeHtml(dMd)}</span>` : ''}</div>
          </div>`;
}

function seatsInfo(p) {
  const n = Number(p.seatsLeft) || 0;
  if (n <= 0) return { text: 'Sold out', cls: 'low' };
  return { text: n + (n === 1 ? ' seat left' : ' seats left'), cls: n <= 5 ? 'low' : 'ok' };
}

function priceText(n) {
  return (typeof n === 'number' && isFinite(n)) ? 'PKR ' + n.toLocaleString('en-PK') : 'Call us';
}

// The five price rows (used in the desktop price box and in the phone pop-up)
function priceRowsHTML(p) {
  return `
          <div class="up-price-row best"><span class="pr-label">Sharing</span><span class="pr-val">${fmtPrice(p.pricing.sharing)}</span></div>
          <div class="up-price-row"><span class="pr-label">Quad</span><span class="pr-val">${fmtPrice(p.pricing.quad)}</span></div>
          <div class="up-price-row"><span class="pr-label">Triple</span><span class="pr-val">${fmtPrice(p.pricing.triple)}</span></div>
          <div class="up-price-row"><span class="pr-label">Double</span><span class="pr-val">${fmtPrice(p.pricing.double)}</span></div>
          <div class="up-price-row"><span class="pr-label">Infant</span><span class="pr-val">${fmtPrice(p.pricing.infant)}</span></div>`;
}

// One hotel box. Same markup as before, so js/hotel-pictures.js keeps working.
function hotelHTML(h, label, city, icon) {
  return `
            <div class="up-hotel">
              <div class="up-hotel-label">${label}</div>
              <div class="up-hotel-name">${escapeHtml(h.name)}</div>
              <div class="up-hotel-nights"><i class="fa-solid fa-moon"></i> ${escapeHtml(h.nights)} Night(s)</div>
              <div class="up-hotel-loc"><i class="fa-solid fa-location-arrow"></i> ${escapeHtml(h.location)}</div>
              <div class="up-hotel-imgph">${hotelPhoto(h, icon)}</div>
              <a class="up-hotel-viewloc" href="${mapsUrl(h.name, city)}" target="_blank" rel="noopener"><i class="fa-solid fa-location-dot"></i> View Location</a>
            </div>`;
}

function packageCardHTML(p) {
  const cls = airlineClass(p);
  const info = AIRLINE_INFO[cls] || OTHER_AIRLINE;
  const seats = seatsInfo(p);
  const id = 'upd-' + String(p.code).replace(/[^A-Za-z0-9]/g, '');
  const title = escapeHtml(p.airlineCode) + '|' + escapeHtml(p.nights) + 'N|' +
                compactDay(p.outbound.date) + '-' + compactDay(p.return.date) + '|' + escapeHtml(p.route);
  const route = escapeHtml(String(p.route || '').replace(/-/g, ' → '));
  const enquire = escapeHtml(enquireUrl(p));
  const colours = `background:${info.gradient};border-color:${info.border};`;

  return `
    <div class="up-card" data-airline="${cls}" data-nights="${p.nights}" data-price="${p.pricing.sharing}">

      <div class="up-avail-badge">${escapeHtml(p.status)}</div>

      <div class="up-topbar">
        <div class="up-topbar-code">${title}</div>
      </div>

      <div class="up2-main">

        <div class="up2-side" style="${colours}">
          ${info.logo ? `<div class="up2-logo"><img src="${escapeHtml(info.logo)}" alt="${escapeHtml(p.airline)} logo"></div>` : ''}
          <div class="up2-air">${escapeHtml(p.airline)}</div>
          <div class="up2-rt"><span>${escapeHtml(p.outbound.from)}</span><i class="fa-solid fa-plane"></i><span>${escapeHtml(p.outbound.to)}</span></div>
          <div class="up2-date"><small>Travel date</small><b>${escapeHtml(p.travelDate)}</b></div>
          <div class="up2-seats"><b>${escapeHtml(p.seatsLeft)}</b><small>Seats left</small></div>
        </div>

        <div class="up2-mid">
          <div class="up2-m-top">
            <i class="up2-dot"></i>
            <span class="up2-m-air">${escapeHtml(p.airline)}</span>
            <span class="up2-m-date">${escapeHtml(p.travelDate)}</span>
            <span class="up2-m-seats ${seats.cls}">${seats.text}</span>
          </div>
          <div class="up2-legs">
            ${legHTML(p.outbound, 'Departure')}
            ${legHTML(p.return, 'Return')}
          </div>
          <div class="up2-nightsrow">
            <div><span class="up2-nights">${escapeHtml(p.nights)} nights</span><span class="up2-route">${route}</span></div>
            <div class="up2-m-from"><span>Sharing · per person</span><strong>${priceText(p.pricing.sharing)}</strong></div>
          </div>
          ${stayBarHTML(p)}
        </div>

        <div class="up-price-panel up2-price">
          <div class="up-price-title">Price Per Person (PKR)</div>
          ${priceRowsHTML(p)}
          <a class="up-enquire-btn" href="${enquire}" target="_blank" rel="noopener">Enquire Now</a>
        </div>

      </div>

      <div class="up2-actions">
        <button type="button" class="up2-toggle" data-up-toggle aria-expanded="false" aria-controls="${id}">
          <span class="up2-t-desk">Hotels, photos &amp; included services</span><span class="up2-t-mob">Details</span>
          <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>
        </button>
        <a class="up2-enq-m" href="${enquire}" target="_blank" rel="noopener">Enquire Now</a>
      </div>

      <div class="up2-details" id="${id}" role="region" aria-label="Package details">

        <div class="up2-sheet-head" style="${colours}">
          <div>
            <div class="up2-sheet-title">${escapeHtml(p.airline)} · ${escapeHtml(p.nights)} nights</div>
            <div class="up2-sheet-sub">${title}</div>
          </div>
          <button type="button" class="up2-sheet-close" data-up-close aria-label="Close details"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
        </div>

        <div class="up2-d-scroll">

          <div class="up2-sheet-only up2-d-flights">
            <div class="up2-d-title">Flights</div>
            ${legHTML(p.outbound, 'Departure')}
            ${legHTML(p.return, 'Return')}
          </div>

          <div class="up-hotels-wrap">
            ${hotelHTML(p.makkahHotel, 'Makkah Hotel', 'Makkah', '<i class="fa-solid fa-kaaba"></i>')}
            ${hotelHTML(p.madinahHotel, 'Madinah Hotel', 'Madinah', '<i class="fa-solid fa-mosque"></i>')}
          </div>

          <div class="up2-sheet-only up2-d-prices">
            <div class="up2-d-title">Price per person (PKR)</div>
            <div class="up2-d-pricebox">${priceRowsHTML(p)}</div>
          </div>

          <div class="up2-d-side">
            <div class="up2-codes" style="${colours}">
              <div><div class="pc-label">Package Code</div><div class="pc-val">${escapeHtml(p.packageCode)}</div></div>
              <div><div class="pc-label">Group Code</div><div class="pc-val">${escapeHtml(p.groupCode)}</div></div>
            </div>
            <div class="up-gifted-box">
              <div class="gb-title"><i class="fa-solid fa-gift"></i> Complimentary Gifted Services</div>
              <div class="gb-grid">
                <span><i class="fa-solid fa-mountain"></i>Taif Ziyarat</span>
                <span><i class="fa-solid fa-kaaba"></i>Umrah from Taif</span>
                <span><i class="fa-solid fa-kaaba"></i>Makkah Ziyarat</span>
                <span><i class="fa-solid fa-kaaba"></i>Madina Ziyarat</span>
              </div>
            </div>
          </div>

          <div class="up2-d-inc">
            <div class="up-included-heading">Included Services</div>
            <div class="up-included-row">
              <div class="ir-item"><i class="fa-solid fa-hotel"></i><span>Accommodation</span></div>
              <div class="ir-item"><i class="fa-solid fa-bus"></i><span>Transport</span></div>
              <div class="ir-item"><i class="fa-solid fa-passport"></i><span>Visa</span></div>
              <div class="ir-item"><i class="fa-solid fa-ticket"></i><span>Return Ticket</span></div>
              <div class="ir-item"><i class="fa-solid fa-bell-concierge"></i><span>Premium Support</span></div>
            </div>
          </div>

        </div>

        <div class="up2-sheet-foot">
          <div class="up2-foot-price"><span>Sharing · per person</span><strong>${priceText(p.pricing.sharing)}</strong></div>
          <a class="up2-foot-enq" href="${enquire}" target="_blank" rel="noopener">Enquire Now</a>
        </div>

      </div>

    </div>
  `;
}

// ── Open / close the details area ───────────────────────────────────────
// Desktop: the area opens under the card. Phone: it is a pop-up sheet, so the
// page behind it is locked and only one card can be open at a time.
function isPhone() {
  return !!(window.matchMedia && window.matchMedia('(max-width: 700px)').matches);
}

function setDetails(card, open) {
  if (!card) return;
  card.classList.toggle('is-open', open);
  const btn = card.querySelector('[data-up-toggle]');
  if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (isPhone()) {
    document.body.classList.toggle('up-sheet-open', open);
    const close = card.querySelector('[data-up-close]');
    if (open && close) close.focus({ preventScroll: true });
  }
}

function closeAllDetails() {
  document.querySelectorAll('.up-card.is-open').forEach(c => setDetails(c, false));
  document.body.classList.remove('up-sheet-open');
}

function toggleDetails(card) {
  const willOpen = !card.classList.contains('is-open');
  if (isPhone()) closeAllDetails();
  setDetails(card, willOpen);
}

function renderPackages(list, keepShown) {
  CURRENT_LIST = list;
  if (!keepShown) SHOWN = PAGE_SIZE;
  closeAllDetails();
  const grid = document.getElementById('upGrid');
  const count = document.getElementById('upResultsCount');
  if (!grid) return;

  if (!list.length) {
    grid.innerHTML = ALL_PACKAGES.length
      ? '<div class="up-no-results">No packages match these filters — try widening your search, or WhatsApp us for the full list.</div>'
      : '<div class="up-no-results">New Umrah packages are being finalised. <a href="https://wa.me/923000041510" target="_blank" rel="noopener">WhatsApp us</a> or call +92 300 0041510 for current dates and rates.</div>';
    if (count) count.innerHTML = '';
    return;
  }

  const visible = list.slice(0, SHOWN);
  const more = list.length - visible.length;
  grid.innerHTML = visible.map(packageCardHTML).join('') +
    (more > 0
      ? `<div class="up-showmore-wrap"><button type="button" id="upShowMore" class="up-reset-btn">Show ${Math.min(PAGE_SIZE, more)} more (${more} remaining)</button></div>`
      : '');
  if (count) count.innerHTML = `Showing <strong>${visible.length}</strong> of <strong>${list.length}</strong> matching packages` +
    (list.length !== ALL_PACKAGES.length ? ` (${ALL_PACKAGES.length} in total)` : '');
}

// Builds the airline / route / nights checkbox lists from the packages that
// are actually on sale, so new airlines or durations appear on their own.
function buildFilterOptions() {
  function fill(className, entries) {
    const first = document.querySelector('.' + className);
    if (!first) return;
    const group = first.closest('.up-checkbox-group');
    group.querySelectorAll('.up-checkbox-row').forEach(row => {
      const input = row.querySelector('.' + className);
      if (input && input.value !== 'all') row.remove();
    });
    entries.forEach(([value, label]) => {
      const row = document.createElement('label');
      row.className = 'up-checkbox-row';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.className = className;
      input.value = value;
      row.appendChild(input);
      row.appendChild(document.createTextNode(' ' + label));
      group.appendChild(row);
    });
  }
  const uniq = arr => Array.from(new Set(arr));
  const airlineLabels = {};
  ALL_PACKAGES.forEach(p => {
    const c = airlineClass(p);
    if (!airlineLabels[c]) airlineLabels[c] = AIRLINE_LABEL[c] || p.airline || p.airlineCode || c;
  });
  fill('up-cb-airline', Object.entries(airlineLabels).sort((a, b) => a[1].localeCompare(b[1])));
  fill('up-cb-route',   uniq(ALL_PACKAGES.map(p => p.route)).sort().map(r => [r, r]));
  fill('up-cb-nights',  uniq(ALL_PACKAGES.map(p => Number(p.nights))).sort((a, b) => a - b).map(n => [String(n), n + ' Nights']));
}

// ── Top "Featured Deals" bar ─────────────────────────────────────────────
// The text mentions only airlines that really have packages on sale right now.
const ANN_PX_PER_SEC = 34;   // scroll speed, close to the supplier's 32s loop

function airlineNamesText() {
  const labels = {};
  ALL_PACKAGES.forEach(p => {
    const c = airlineClass(p);
    if (!labels[c]) labels[c] = AIRLINE_LABEL[c] || p.airline || p.airlineCode || c;
  });
  const names = Object.values(labels).sort((a, b) => a.localeCompare(b));
  if (names.length <= 1) return names[0] || '';
  return names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
}

function buildAnnouncementBar() {
  const bar = document.getElementById('announcementBar');
  const track = document.getElementById('announcementTrack');
  if (!bar || !track || !ALL_PACKAGES.length) return;
  try { if (sessionStorage.getItem('shadmanAnnDismissed') === '1') return; } catch (e) { /* ignore */ }

  const firstDate = ALL_PACKAGES.map(p => parsePkgDate(p.outbound.date)).filter(d => !isNaN(d)).sort((a, b) => a - b)[0];
  const year = firstDate ? firstDate.getFullYear() : new Date().getFullYear();
  const airlines = airlineNamesText();
  const unit =
    '<span class="announcement-slide-item">✨ <strong>Umrah Season ' + year + ' Direct Flights Available!</strong> ' +
    (airlines ? 'Limited Seats on ' + escapeHtml(airlines) + ' • ' : '') +
    'Special Discounts on 5-Star Hotel Packages • 24/7 Visa Assistance</span>' +
    '<span class="announcement-separator">•</span>';

  bar.hidden = false;
  const wrap = track.parentElement;

  function layout() {
    track.innerHTML = unit;
    const unitW = track.scrollWidth || 1;
    const reps = Math.max(1, Math.ceil(wrap.clientWidth / unitW));
    const group = unit.repeat(reps);
    track.innerHTML = group + group;               // two identical halves = seamless loop
    track.style.animationDuration = Math.max(15, Math.round(unitW * reps / ANN_PX_PER_SEC)) + 's';
  }

  layout();
  let t;
  window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(layout, 200); });
}

function getCheckedValues(className) {
  const boxes = document.querySelectorAll('.' + className);
  return Array.from(boxes).filter(b => b.checked && b.value !== 'all').map(b => b.value);
}

function applyFilters() {
  const term = (document.getElementById('upSearch')?.value || '').toLowerCase().trim();
  const airlines = getCheckedValues('up-cb-airline');
  const routes   = getCheckedValues('up-cb-route');
  const nightsList = getCheckedValues('up-cb-nights');
  const sortValue = document.getElementById('upSort')?.value || 'dateAsc';

  let filtered = ALL_PACKAGES.filter(p => {
    const cls = airlineClass(p);

    const textMatched = term === '' ||
      p.code.toLowerCase().includes(term) ||
      p.airline.toLowerCase().includes(term) ||
      p.route.toLowerCase().includes(term) ||
      p.makkahHotel.name.toLowerCase().includes(term) ||
      p.madinahHotel.name.toLowerCase().includes(term);

    const airlineMatched = airlines.length === 0 || airlines.includes(cls);
    const routeMatched = routes.length === 0 || routes.includes(p.route);
    const nightsMatched = nightsList.length === 0 || nightsList.includes(String(p.nights));

    return textMatched && airlineMatched && routeMatched && nightsMatched;
  });

  filtered.sort((a, b) => {
    if (sortValue === 'priceAsc')  return a.pricing.sharing - b.pricing.sharing;
    if (sortValue === 'priceDesc') return b.pricing.sharing - a.pricing.sharing;
    if (sortValue === 'dateDesc')  return parsePkgDate(b.outbound.date) - parsePkgDate(a.outbound.date);
    return parsePkgDate(a.outbound.date) - parsePkgDate(b.outbound.date); // dateAsc (default)
  });

  renderPackages(filtered);
}

document.addEventListener('DOMContentLoaded', function () {
  fetch('/data/umrah-packages.json')
    .then(res => res.json())
    .then(data => {
      // Never show packages whose departure date has already passed.
      ALL_PACKAGES = data.filter(isUpcoming);
      if (ALL_PACKAGES.length < data.length) {
        console.info((data.length - ALL_PACKAGES.length) + ' departed package(s) hidden — update data/umrah-packages.json.');
      }
      buildFilterOptions();
      wireAllGroups();
      applyFilters();
      buildAnnouncementBar();
    })
    .catch(err => {
      console.error('Failed to load Umrah packages:', err);
      const grid = document.getElementById('upGrid');
      if (grid) grid.innerHTML = '<div class="up-no-results">Unable to load packages right now — please call or WhatsApp us at +92 300 0041510.</div>';
    });

  function wireCheckboxGroup(className) {
    const boxes = document.querySelectorAll('.' + className);
    boxes.forEach(box => {
      box.addEventListener('change', function () {
        if (this.value === 'all' && this.checked) {
          boxes.forEach(b => { if (b !== this) b.checked = false; });
        } else if (this.checked) {
          const allBox = Array.from(boxes).find(b => b.value === 'all');
          if (allBox) allBox.checked = false;
        }
        const anyChecked = Array.from(boxes).some(b => b.checked);
        if (!anyChecked) {
          const allBox = Array.from(boxes).find(b => b.value === 'all');
          if (allBox) allBox.checked = true;
        }
        applyFilters();
      });
    });
  }

  function wireAllGroups() {
    wireCheckboxGroup('up-cb-airline');
    wireCheckboxGroup('up-cb-route');
    wireCheckboxGroup('up-cb-nights');
  }

  let searchTimer;
  const searchInput = document.getElementById('upSearch');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(applyFilters, 150);
    });
  }

  // "Show more" button (it is re-created on every render, so listen on the grid)
  const gridEl = document.getElementById('upGrid');
  if (gridEl) {
    gridEl.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'upShowMore') {
        SHOWN += PAGE_SIZE;
        renderPackages(CURRENT_LIST, true);
        return;
      }
      const toggle = e.target.closest('[data-up-toggle]');
      if (toggle) { toggleDetails(toggle.closest('.up-card')); return; }
      if (e.target.closest('[data-up-close]')) closeAllDetails();
    });
  }

  // Phone pop-up: tapping the dark background, pressing Esc, or rotating to a wide screen closes it
  const scrimEl = document.getElementById('upScrim');
  if (scrimEl) scrimEl.addEventListener('click', closeAllDetails);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAllDetails(); });
  if (window.matchMedia) window.matchMedia('(max-width: 700px)').addEventListener('change', closeAllDetails);

  const annClose = document.getElementById('announcementClose');
  if (annClose) {
    annClose.addEventListener('click', function () {
      const bar = document.getElementById('announcementBar');
      if (bar) bar.hidden = true;
      try { sessionStorage.setItem('shadmanAnnDismissed', '1'); } catch (e) { /* ignore */ }
    });
  }

  const sortSelect = document.getElementById('upSort');
  if (sortSelect) sortSelect.addEventListener('change', applyFilters);

  const resetBtn = document.getElementById('upReset');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      document.querySelectorAll('.up-cb-airline, .up-cb-route, .up-cb-nights').forEach(b => {
        b.checked = (b.value === 'all');
      });
      if (searchInput) searchInput.value = '';
      if (sortSelect) sortSelect.value = 'dateAsc';
      applyFilters();
    });
  }
});