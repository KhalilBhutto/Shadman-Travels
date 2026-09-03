/**
 * umrah-packages.js
 * Shadman Travels & Tours — Project Shadman Platform
 * Fetches data/umrah-packages.json, renders detailed package cards,
 * and drives the filter bar (airline / nights / price range).
 * Depends on: js/notify.js (reuses .notify-btn modal for Enquire Now)
 */

'use strict';

let ALL_PACKAGES = [];

const AIRLINE_INFO = {
  ab:  { logo: '/images/airlines/airblue.png',   colorTop: '#1B2A5B', colorBtn: '#2F3E75' },
  fj:  { logo: '/images/airlines/flyjinnah.png', colorTop: '#E31C3D', colorBtn: '#B4152F' },
  pia: { logo: '/images/airlines/pia.png',       colorTop: '#0B5D2E', colorBtn: '#B98F33' },
};

function airlineClass(airline) {
  if (airline.includes('Pakistan International')) return 'pia';
  if (airline.includes('Fly Jinnah')) return 'fj';
  if (airline.includes('AirBlue')) return 'ab';
  return 'pia';
}

function fmtPrice(n) {
  return 'PKR ' + n.toLocaleString('en-PK');
}

function mapsUrl(hotelName, city) {
  const q = encodeURIComponent(hotelName + ', ' + city + ', Saudi Arabia');
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function packageCardHTML(p) {
  const cls = airlineClass(p.airline);
  const info = AIRLINE_INFO[cls];

  return `
    <div class="up-card ${cls}" data-airline="${cls}" data-nights="${p.nights}" data-price="${p.pricing.sharing}">

      <div class="up-topbar">
        <div class="up-topbar-code">${p.code} &nbsp;|&nbsp; ${p.airlineCode} &nbsp;|&nbsp; ${p.route}</div>
        <div class="up-avail-badge">${p.status}</div>
      </div>

      <div class="up-flightrow">
        <div class="up-flight-cell">
          <div class="fc-title">✈ ${p.outbound.flightNo}</div>
          <div class="fc-route">${p.outbound.from} → ${p.outbound.to}</div>
          <div class="fc-times">${p.outbound.depTime} → ${p.outbound.arrTime}</div>
          <div class="fc-sub">Baggage: ${p.outbound.baggage}</div>
          <div class="fc-label">Departure · ${p.outbound.date}</div>
        </div>
        <div class="up-flight-cell">
          <div class="fc-title">✈ ${p.return.flightNo}</div>
          <div class="fc-route">${p.return.from} → ${p.return.to}</div>
          <div class="fc-times">${p.return.depTime} → ${p.return.arrTime}</div>
          <div class="fc-sub">Baggage: ${p.return.baggage}</div>
          <div class="fc-label">Arrival · ${p.return.date}</div>
        </div>
        <div class="up-flight-cell up-codes">
          <div class="pc-label">Duration</div>
          <div class="pc-val">🌙 ${p.nights} Nights</div>
        </div>
        <div class="up-flight-cell up-codes" style="background:${info.colorTop};color:#fff;">
          <div class="pc-label" style="color:rgba(255,255,255,0.75);">Package Code</div>
          <div class="pc-val" style="color:#fff;">${p.packageCode}</div>
          <div class="pc-label" style="color:rgba(255,255,255,0.75);margin-top:6px;">Group Code</div>
          <div class="pc-val" style="color:#fff;">${p.groupCode}</div>
        </div>
      </div>

      <div class="up-body">

        <div class="up-airline-panel ${cls}">
          <div class="up-airline-logo"><img src="${info.logo}" alt="${p.airline} logo"></div>
          <div class="up-airline-name">${p.airline}</div>
          <div class="up-airline-route">${p.outbound.from} ✈ ${p.outbound.to}</div>
          <div class="up-avail-pill">✓ Available</div>
          <div class="up-traveldate">
            <div class="td-label">Travel Date</div>
            <div class="td-val">${p.travelDate}</div>
          </div>
          <div class="up-seatsleft">
            <span class="sl-num">${p.seatsLeft}</span>
            <span class="sl-label" style="font-size:0.6rem;text-transform:uppercase;opacity:0.8;">Seats Left</span>
          </div>
        </div>

        <div class="up-hotel">
          <div class="up-hotel-label">Makkah Hotel</div>
          <div class="up-hotel-name">${p.makkahHotel.name}</div>
          <div class="up-hotel-nights">🌙 ${p.makkahHotel.nights} Night(s)</div>
          <div class="up-hotel-loc">📍 ${p.makkahHotel.location}</div>
          <div class="up-hotel-imgph">🕋</div>
          <a class="up-hotel-viewloc" href="${mapsUrl(p.makkahHotel.name, 'Makkah')}" target="_blank" rel="noopener">📍 View Location</a>
        </div>

        <div class="up-hotel">
          <div class="up-hotel-label">Madinah Hotel</div>
          <div class="up-hotel-name">${p.madinahHotel.name}</div>
          <div class="up-hotel-nights">🌙 ${p.madinahHotel.nights} Night(s)</div>
          <div class="up-hotel-loc">📍 ${p.madinahHotel.location}</div>
          <div class="up-hotel-imgph">🕌</div>
          <a class="up-hotel-viewloc" href="${mapsUrl(p.madinahHotel.name, 'Madinah')}" target="_blank" rel="noopener">📍 View Location</a>
        </div>

        <div class="up-price-panel" style="background: linear-gradient(160deg, ${info.colorTop}, ${info.colorBtn});">
          <div class="up-price-title">Price Per Person (PKR)</div>
          <div class="up-price-row best"><span class="pr-label">Sharing</span><span class="pr-val">${fmtPrice(p.pricing.sharing)}</span></div>
          <div class="up-price-row"><span class="pr-label">Quad</span><span class="pr-val">${fmtPrice(p.pricing.quad)}</span></div>
          <div class="up-price-row"><span class="pr-label">Triple</span><span class="pr-val">${fmtPrice(p.pricing.triple)}</span></div>
          <div class="up-price-row"><span class="pr-label">Double</span><span class="pr-val">${fmtPrice(p.pricing.double)}</span></div>
          <div class="up-price-row"><span class="pr-label">Infant</span><span class="pr-val">${fmtPrice(p.pricing.infant)}</span></div>

          <div class="up-gifted-box">
            <div class="gb-title">🎁 Complimentary Gifted Services</div>
            <div class="gb-grid">
              <span>🕋 Taif Ziyarat</span>
              <span>🌙 Umrah from Taif</span>
              <span>🕌 Makkah Ziyarat</span>
              <span>🏙 Madina Ziyarat</span>
            </div>
          </div>

          <button class="notify-btn up-enquire-btn" data-service="Umrah Package — ${p.code} (${p.travelDate})">
            Enquire Now
          </button>
        </div>

      </div>

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
    grid.innerHTML = '<div class="up-no-results">No packages match these filters — try widening your search, or WhatsApp us for the full list.</div>';
    if (count) count.innerHTML = '';
    return;
  }

  grid.innerHTML = list.map(packageCardHTML).join('');
  if (count) count.innerHTML = `Showing <strong>${list.length}</strong> of <strong>${ALL_PACKAGES.length}</strong> packages`;
}

function applyFilters() {
  const airline = document.getElementById('upFilterAirline')?.value || 'all';
  const nights  = document.getElementById('upFilterNights')?.value || 'all';
  const price   = document.getElementById('upFilterPrice')?.value || 'all';

  let filtered = ALL_PACKAGES.filter(p => {
    const cls = airlineClass(p.airline);
    if (airline !== 'all' && cls !== airline) return false;
    if (nights !== 'all' && String(p.nights) !== nights) return false;
    if (price !== 'all') {
      const s = p.pricing.sharing;
      if (price === 'under250' && s >= 250000) return false;
      if (price === '250to300' && (s < 250000 || s > 300000)) return false;
      if (price === 'over300' && s <= 300000) return false;
    }
    return true;
  });

  renderPackages(filtered);
}

document.addEventListener('DOMContentLoaded', function () {
  fetch('/data/umrah-packages.json')
    .then(res => res.json())
    .then(data => {
      ALL_PACKAGES = data;
      renderPackages(ALL_PACKAGES);
    })
    .catch(err => {
      console.error('Failed to load Umrah packages:', err);
      const grid = document.getElementById('upGrid');
      if (grid) grid.innerHTML = '<div class="up-no-results">Unable to load packages right now — please call or WhatsApp us at +92 300 0041510.</div>';
    });

  ['upFilterAirline', 'upFilterNights', 'upFilterPrice'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', applyFilters);
  });
});