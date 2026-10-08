/**
 * umrah-packages.js
 * Shadman Travels & Tours — Project Shadman Platform
 * Fetches data/umrah-packages.json, renders detailed package cards,
 * and drives the filter bar (airline / nights / price range).
 * Structure and per-airline colors matched to the reference site's
 * real CSS values.
 * Depends on: js/notify.js (reuses .notify-btn modal for Enquire Now)
 */

'use strict';

let ALL_PACKAGES = [];

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
};

function airlineClass(airline) {
  if (airline.includes('Pakistan International')) return 'pia';
  if (airline.includes('Fly Jinnah')) return 'fj';
  if (airline.includes('AirBlue')) return 'ab';
  return 'pia';
}

function fmtPrice(n) {
  return n.toLocaleString('en-PK');
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

const MONTHS = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
function parsePkgDate(str) {
  const m = String(str || '').trim().match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})$/);
  if (m && MONTHS[m[2].toLowerCase()] !== undefined) {
    return new Date(Number(m[3]), MONTHS[m[2].toLowerCase()], Number(m[1]));
  }
  return new Date(str);
}

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

function packageCardHTML(p) {
  const cls = airlineClass(p.airline);
  const info = AIRLINE_INFO[cls];

  return `
    <div class="up-card" data-airline="${cls}" data-nights="${p.nights}" data-price="${p.pricing.sharing}">

      <div class="up-avail-badge">${escapeHtml(p.status)}</div>

      <div class="up-topbar">
        <div class="up-topbar-code">${escapeHtml(p.code)} &nbsp;|&nbsp; ${escapeHtml(p.airlineCode)} &nbsp;|&nbsp; ${escapeHtml(p.route)}</div>
      </div>

      <div class="up-flightrow">
        <div class="up-flight-cell">
          <div class="fc-title">✈ ${escapeHtml(p.outbound.flightNo)}</div>
          <div class="fc-route">${escapeHtml(p.outbound.from)} → ${escapeHtml(p.outbound.to)}</div>
          <div class="fc-times">${escapeHtml(p.outbound.depTime)} → ${escapeHtml(p.outbound.arrTime)}</div>
          <div class="fc-sub">Baggage: ${escapeHtml(p.outbound.baggage)}</div>
          <div class="fc-label">Departure · ${escapeHtml(p.outbound.date)}</div>
        </div>
        <div class="up-flight-cell">
          <div class="fc-title">✈ ${escapeHtml(p.return.flightNo)}</div>
          <div class="fc-route">${escapeHtml(p.return.from)} → ${escapeHtml(p.return.to)}</div>
          <div class="fc-times">${escapeHtml(p.return.depTime)} → ${escapeHtml(p.return.arrTime)}</div>
          <div class="fc-sub">Baggage: ${escapeHtml(p.return.baggage)}</div>
          <div class="fc-label">Arrival · ${escapeHtml(p.return.date)}</div>
        </div>
        <div class="up-flight-cell">
          <div class="fc-title">✈ ${escapeHtml(p.outbound.from)} - ${escapeHtml(p.outbound.to)}</div>
          <div class="fc-label">Flight</div>
        </div>
        <div class="up-flight-cell">
          <div class="fc-title">🌙 ${escapeHtml(p.nights)} Nights</div>
          <div class="fc-label">Duration</div>
        </div>
        <div class="up-flight-cell up-codes" style="background:${info.gradient};border-color:${info.border};">
          <div>
            <div class="pc-label">Package Code</div>
            <div class="pc-val">${escapeHtml(p.packageCode)}</div>
          </div>
          <div>
            <div class="pc-label">Group Code</div>
            <div class="pc-val">${escapeHtml(p.groupCode)}</div>
          </div>
        </div>
      </div>

      <div class="up-body">

        <div class="up-airline-panel" style="background:${info.gradient};border-color:${info.border};">
          <div class="up-airline-logo"><img src="${escapeHtml(info.logo)}" alt="${escapeHtml(p.airline)} logo"></div>
          <div class="up-airline-name">${escapeHtml(p.airline)}</div>
          <div class="up-route-mini">
            <span>${escapeHtml(p.outbound.from)}</span><span class="arrow">✈</span><span>${escapeHtml(p.outbound.to)}</span>
          </div>
          <div class="up-airline-status">✓ Available</div>
          <div class="up-traveldate">
            <div class="td-label">📅 Travel Date</div>
            <div class="td-val">${escapeHtml(p.travelDate)}</div>
          </div>
          <div class="up-seatsleft">
            <span class="sl-num">${escapeHtml(p.seatsLeft)}</span>
            <span class="sl-label">Seats Left</span>
          </div>
        </div>

        <div class="up-hotels-wrap">

          <div class="up-hotel">
            <div class="up-hotel-label">Makkah Hotel</div>
            <div class="up-hotel-name">${escapeHtml(p.makkahHotel.name)}</div>
            <div class="up-hotel-nights">🌙 ${escapeHtml(p.makkahHotel.nights)} Night(s)</div>
            <div class="up-hotel-loc">📍 ${escapeHtml(p.makkahHotel.location)}</div>
            <div class="up-hotel-imgph">🕋</div>
            <a class="up-hotel-viewloc" href="${mapsUrl(p.makkahHotel.name, 'Makkah')}" target="_blank" rel="noopener">📍 View Location</a>
          </div>

          <div class="up-hotel">
            <div class="up-hotel-label">Madinah Hotel</div>
            <div class="up-hotel-name">${escapeHtml(p.madinahHotel.name)}</div>
            <div class="up-hotel-nights">🌙 ${escapeHtml(p.madinahHotel.nights)} Night(s)</div>
            <div class="up-hotel-loc">📍 ${escapeHtml(p.madinahHotel.location)}</div>
            <div class="up-hotel-imgph">🕌</div>
            <a class="up-hotel-viewloc" href="${mapsUrl(p.madinahHotel.name, 'Madinah')}" target="_blank" rel="noopener">📍 View Location</a>
          </div>

        </div>

        <div class="up-price-panel">
          <div class="up-price-title">Price Per Person (PKR)</div>
          <div class="up-price-row best"><span class="pr-label">Sharing</span><span class="pr-val">${fmtPrice(p.pricing.sharing)}</span></div>
          <div class="up-price-row"><span class="pr-label">Quad</span><span class="pr-val">${fmtPrice(p.pricing.quad)}</span></div>
          <div class="up-price-row"><span class="pr-label">Triple</span><span class="pr-val">${fmtPrice(p.pricing.triple)}</span></div>
          <div class="up-price-row"><span class="pr-label">Double</span><span class="pr-val">${fmtPrice(p.pricing.double)}</span></div>
          <div class="up-price-row"><span class="pr-label">Infant</span><span class="pr-val">${fmtPrice(p.pricing.infant)}</span></div>

          <div class="up-gifted-box">
            <div class="gb-title">🎁 Complimentary Gifted Services</div>
            <div class="gb-grid">
              <span>⛰ Taif Ziyarat</span>
              <span>🕋 Umrah from Taif</span>
              <span>🕋 Makkah Ziyarat</span>
              <span>🕋 Madina Ziyarat</span>
            </div>
          </div>

          <button class="notify-btn up-enquire-btn" data-service="Umrah Package — ${escapeHtml(p.code)} (${escapeHtml(p.travelDate)})">
            Enquire Now
          </button>
        </div>

      </div>

      <div class="up-included-heading">Included Services</div>
      <div class="up-included-row">
        <div class="ir-item">🏨<span>Accommodation</span></div>
        <div class="ir-item">🚌<span>Transport</span></div>
        <div class="ir-item">📋<span>Visa</span></div>
        <div class="ir-item">🎫<span>Return Ticket</span></div>
        <div class="ir-item">🛎<span>Premium Support</span></div>
      </div>

    </div>
  `;
}

function renderPackages(list) {
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

  grid.innerHTML = list.map(packageCardHTML).join('');
  if (count) count.innerHTML = `Showing <strong>${list.length}</strong> of <strong>${ALL_PACKAGES.length}</strong> packages`;
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
    const cls = airlineClass(p.airline);

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
    return parsePkgDate(a.outbound.date) - parsePkgDate(b.outbound.date);
  });

  renderPackages(filtered);
}

document.addEventListener('DOMContentLoaded', function () {
  fetch('/data/umrah-packages.json')
    .then(res => res.json())
    .then(data => {
    ALL_PACKAGES = data.filter(isUpcoming);
    if (ALL_PACKAGES.length < data.length) {
      console.info((data.length - ALL_PACKAGES.length) + ' departed package(s) hidden — update data/umrah-packages.json.');
    }
    applyFilters();
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

  wireCheckboxGroup('up-cb-airline');
  wireCheckboxGroup('up-cb-route');
  wireCheckboxGroup('up-cb-nights');

  let searchTimer;
  const searchInput = document.getElementById('upSearch');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(applyFilters, 150);
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