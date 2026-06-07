/**
 * forms.js
 * Shadman Travels & Tours — Project Shadman Platform
 *
 * Handles:
 *  - Hero search card: trip tabs (one-way / round-trip / multi-city)
 *  - Passenger picker popup (all three panels)
 *  - Hero multi-city dynamic legs
 *  - Contact section quote form (trip type switcher + dynamic multi-city legs)
 *  - Google Sheets / fallback call submission
 *
 * Depends on: config.js (SHEETS_URL, paxState, mcLegCount, rqMcCount)
 *             airports.js (initCombobox)
 */

'use strict';

/* ═══════════════════════════════════════════
   TRIP TABS
═══════════════════════════════════════════ */
function initTripTabs() {
  document.querySelectorAll('.trip-tab').forEach(tab => {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.trip-tab').forEach(t => t.classList.remove('active'));
      this.classList.add('active');

      const panelId = 'panel-' + this.dataset.tab;
      document.querySelectorAll('.tab-panel').forEach(p => (p.style.display = 'none'));
      const panel = document.getElementById(panelId);
      if (panel) panel.style.display = 'block';
    });
  });
}

/* ═══════════════════════════════════════════
   PASSENGER PICKER
═══════════════════════════════════════════ */

/**
 * Increment / decrement a passenger type for a given tab.
 * @param {string} tab   - 'ow' | 'rt' | 'mc'
 * @param {string} type  - 'adults' | 'children' | 'infants'
 * @param {number} delta - +1 or -1
 */
function changePax(tab, type, delta) {
  const s     = paxState[tab];
  const total = s.adults + s.children + s.infants;

  if (delta > 0 && total >= 9) return; // max 9 passengers

  const minVal = type === 'adults' ? 1 : 0;
  s[type] = Math.max(minVal, Math.min(9, s[type] + delta));

  // Re-check combined total doesn't exceed 9
  if (s.adults + s.children + s.infants > 9) {
    s[type] -= delta;
  }

  updatePaxUI(tab);
}

/**
 * Re-renders all passenger-picker UI elements for a given tab.
 * Also shows / hides the "additional passenger names" section.
 * @param {string} tab - 'ow' | 'rt' | 'mc'
 */
function updatePaxUI(tab) {
  const s = paxState[tab];

  // Update counters
  document.getElementById(tab + '-adults-num').textContent   = s.adults;
  document.getElementById(tab + '-children-num').textContent = s.children;
  document.getElementById(tab + '-infants-num').textContent  = s.infants;

  // Build summary string
  const parts = [];
  if (s.adults)   parts.push(s.adults   + (s.adults   === 1 ? ' Adult'   : ' Adults'));
  if (s.children) parts.push(s.children + (s.children === 1 ? ' Child'   : ' Children'));
  if (s.infants)  parts.push(s.infants  + (s.infants  === 1 ? ' Infant'  : ' Infants'));
  const summary = parts.join(', ');

  // Update trigger button label
  const summaryEl = document.getElementById(tab + '-pax-summary');
  if (summaryEl) summaryEl.textContent = summary;

  // Update total badge inside popup
  const totalLabel = document.getElementById(tab + '-pax-total-label');
  if (totalLabel) totalLabel.textContent = summary;

  // Update hidden input (used in form submission)
  const hiddenInput = document.getElementById(tab + '-pax');
  if (hiddenInput) hiddenInput.value = summary;

  // Show / hide extra passenger name fields
  const total          = s.adults + s.children + s.infants;
  const extraSection   = document.getElementById(tab + '-extra-pax');
  const namesContainer = document.getElementById(tab + '-pax-names');

  if (total > 1) {
    extraSection.style.display = 'block';
    namesContainer.innerHTML   = '';
    const extraCount = Math.min(total - 1, 8);
    for (let i = 0; i < extraCount; i++) {
      const div       = document.createElement('div');
      div.className   = 'extra-pax-name';
      div.innerHTML   = `<label>Passenger ${i + 2} Full Name</label>
        <input type="text" placeholder="e.g. Ali Khan" autocomplete="off"/>`;
      namesContainer.appendChild(div);
    }
  } else {
    extraSection.style.display = 'none';
    namesContainer.innerHTML   = '';
  }
}

/**
 * Toggle a passenger picker popup open / closed.
 * Only one popup is open at a time.
 * @param {string} tab - 'ow' | 'rt' | 'mc'
 */
function togglePaxPopup(tab) {
  const popup   = document.getElementById(tab + '-pax-popup');
  const trigger = document.getElementById(tab + '-pax-trigger');
  const isOpen  = popup.classList.contains('open');

  // Close all other popups first
  document.querySelectorAll('.pax-popup.open').forEach(p => p.classList.remove('open'));
  document.querySelectorAll('.pax-trigger.open').forEach(t => t.classList.remove('open'));

  if (!isOpen) {
    popup.classList.add('open');
    trigger.classList.add('open');
  }
}

/* ═══════════════════════════════════════════
   HERO MULTI-CITY LEGS
═══════════════════════════════════════════ */

/**
 * Generates the HTML string for a hero search-card multi-city leg.
 * @param {number} n - Leg number (2, 3, …)
 * @returns {string} HTML string
 */
function mcLegHTML(n) {
  return `
    <div class="mc-leg" id="mc-leg-${n}">
      <button class="mc-remove" title="Remove" onclick="removeMCLeg(${n})">✕</button>
      <div class="mc-leg-label">✈ Flight ${n}</div>
      <div class="sf-row">
        <div class="sf">
          <label>From</label>
          <div class="ap-wrap mc-from-wrap">
            <span class="sf-icon">🛫</span>
            <input class="ap-input mc-from" placeholder="Origin" autocomplete="off"/>
            <span class="ap-chevron">▼</span>
            <div class="ap-dropdown mc-from-dd"></div>
          </div>
        </div>
        <div class="sf">
          <label>To</label>
          <div class="ap-wrap mc-to-wrap">
            <span class="sf-icon">🛬</span>
            <input class="ap-input mc-to" placeholder="Destination" autocomplete="off"/>
            <span class="ap-chevron">▼</span>
            <div class="ap-dropdown mc-to-dd"></div>
          </div>
        </div>
      </div>
      <div class="sf">
        <label>Date</label>
        <div class="sf-wrap">
          <span class="sf-icon">📅</span>
          <input type="date" class="mc-date ap-input" style="padding-left:34px"/>
        </div>
      </div>
    </div>`;
}

/** Add a new leg to the hero search-card multi-city panel. */
function addMCLeg() {
  if (mcLegCount >= 9) return;
  mcLegCount++;

  const tmp      = document.createElement('div');
  tmp.innerHTML  = mcLegHTML(mcLegCount);
  const legEl    = tmp.firstElementChild;

  document.getElementById('mc-extra-legs').appendChild(legEl);

  // Wire up airport comboboxes on the new leg
  legEl.querySelectorAll('.ap-wrap').forEach(w => initCombobox(w));

  if (mcLegCount >= 9) {
    document.getElementById('mcAddBtn').style.display = 'none';
  }
}

/** Remove a dynamic leg from the hero search-card multi-city panel. */
function removeMCLeg(n) {
  const el = document.getElementById('mc-leg-' + n);
  if (el) el.remove();
  mcLegCount = Math.max(1, mcLegCount - 1);
  document.getElementById('mcAddBtn').style.display = 'block';
}

/* ═══════════════════════════════════════════
   CONTACT SECTION — QUOTE FORM
═══════════════════════════════════════════ */

/**
 * Show / hide the correct quote-form fields depending on selected trip type.
 * Called by the rq-trip-type <select> onchange handler.
 */
function updateQuoteForm() {
  const type        = document.getElementById('rq-trip-type').value;
  const simpleFields = document.getElementById('rq-simple-fields');
  const mcFields    = document.getElementById('rq-multicity-fields');
  const retWrap     = document.getElementById('rq-return-date-wrap');
  const paxWrap     = document.getElementById('rq-pax-wrap');

  if (type === 'multicity') {
    simpleFields.style.display = 'none';
    mcFields.style.display     = 'block';
  } else {
    simpleFields.style.display = 'block';
    mcFields.style.display     = 'none';

    if (type === 'return') {
      retWrap.style.display = 'block';
      paxWrap.style.display = 'none';
    } else {
      retWrap.style.display = 'none';
      paxWrap.style.display = 'block';
    }
  }
}

/** Add a new leg row to the contact-section multi-city quote form. */
function addRqMcLeg() {
  rqMcCount++;
  const div     = document.createElement('div');
  div.className = 'rq-mc-leg';
  div.style.cssText =
    'background:#fafaf8;border:1px solid #eaeaea;border-radius:10px;padding:12px;margin-bottom:8px;position:relative';
  div.innerHTML = `
    <div style="font-size:0.65rem;font-weight:800;color:var(--g700);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px">
      Flight ${rqMcCount}
    </div>
    <div class="ff-row">
      <div class="ff"><label>From</label><input type="text" placeholder="Origin"/></div>
      <div class="ff"><label>To</label><input type="text" placeholder="Destination"/></div>
    </div>
    <div class="ff"><label>Date</label><input type="date"/></div>`;
  document.getElementById('rq-mc-extra').appendChild(div);
}

/* ═══════════════════════════════════════════
   FORM SUBMISSION — GOOGLE SHEETS
═══════════════════════════════════════════ */

/** Returns the currently active hero trip-tab key. */
function getActiveTab() {
  const active = document.querySelector('.trip-tab.active');
  return active ? active.dataset.tab : 'oneway';
}

/**
 * Collects form data, validates required fields, then either:
 *  - falls back to tel: if SHEETS_URL is not configured, OR
 *  - submits to Google Sheets via fetch (no-cors).
 */
function submitToSheets() {
  const btn    = document.getElementById('searchSubmitBtn');
  const toast  = document.getElementById('gs-toast');
  const errEl  = document.getElementById('gs-error');
  const valEl  = document.getElementById('gs-validation');

  // Reset feedback messages
  toast.style.display = 'none';
  errEl.style.display = 'none';
  valEl.style.display = 'none';

  // Collect contact info
  const name  = (document.getElementById('cf-name').value  || '').trim();
  const phone = (document.getElementById('cf-phone').value || '').trim();
  const email = (document.getElementById('cf-email').value || '').trim();

  // Validate required fields
  if (!name || !phone) {
    valEl.style.display = 'block';
    document.getElementById(name ? 'cf-phone' : 'cf-name').focus();
    return;
  }

  const tab = getActiveTab();
  const ts  = new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' });

const payload = {
  timestamp: ts,
  name: name,
  phone: phone,
  email: email || '—',
  tripType: '',

  passengerBreakdown: '',
  additionalTravelers: '',

  preferredAirline: '',
  travelPurpose: '',
  enquiryId: ''
};

  if (tab === 'oneway') {
    payload.tripType    = 'One Way';
    payload.from        = document.getElementById('ow-from').value || 'Not selected';
    payload.to          = document.getElementById('ow-to').value   || 'Not selected';
    payload.departure   = document.getElementById('ow-dep').value  || 'Not set';
    payload.returnDate  = '—';
    payload.passengers  = document.getElementById('ow-pax').value;
    payload.travelClass = document.getElementById('ow-class').value;
    payload.preferredAirline =
  document.getElementById('ow-airline').value;

payload.travelPurpose =
  document.getElementById('ow-purpose').value;

    payload.passengerBreakdown =
   `Adults: ${paxState.ow.adults} | ` +
   `Children: ${paxState.ow.children} | ` +
   `Infants: ${paxState.ow.infants}`;

  const extraNames = [];
   document.querySelectorAll('#ow-pax-names input').forEach(input => {
   if (input.value.trim()) extraNames.push(input.value.trim());
});

payload.additionalTravelers =
  extraNames.length ? extraNames.join(' | ') : '—';
    payload.legs        = '—';

  } else if (tab === 'roundtrip') {
    payload.tripType    = 'Round Trip';
    payload.from        = document.getElementById('rt-from').value || 'Not selected';
    payload.to          = document.getElementById('rt-to').value   || 'Not selected';
    payload.departure   = document.getElementById('rt-dep').value  || 'Not set';
    payload.returnDate  = document.getElementById('rt-ret').value  || 'Not set';
    payload.passengers  = document.getElementById('rt-pax').value;
    payload.travelClass = document.getElementById('rt-class').value;
    payload.preferredAirline =
  document.getElementById('rt-airline').value;

payload.travelPurpose =
  document.getElementById('rt-purpose').value;
    payload.passengerBreakdown =
  `Adults: ${paxState.rt.adults} | ` +
  `Children: ${paxState.rt.children} | ` +
  `Infants: ${paxState.rt.infants}`;

const extraNames = [];
document.querySelectorAll('#rt-pax-names input').forEach(input => {
  if (input.value.trim()) extraNames.push(input.value.trim());
});

payload.additionalTravelers =
  extraNames.length ? extraNames.join(' | ') : '—';
    payload.legs        = '—';

  } else {
    // Multi-city
    payload.tripType    = 'Multi City';
    payload.from        = '—';
    payload.to          = '—';
    payload.departure   = '—';
    payload.returnDate  = '—';

    const legs = [];
    document.querySelectorAll('#panel-multicity .mc-leg').forEach((leg, i) => {
      const f = leg.querySelector('.mc-from');
      const t = leg.querySelector('.mc-to');
      const d = leg.querySelector('.mc-date');
      legs.push(`Leg${i + 1}: ${f ? f.value : '?'} → ${t ? t.value : '?'} on ${d ? d.value : '?'}`);
    });
    payload.legs        = legs.join(' | ');
    payload.passengers  = document.getElementById('mc-pax').value;
    payload.travelClass = document.getElementById('mc-class').value;
    payload.preferredAirline =
  document.getElementById('mc-airline').value;

payload.travelPurpose =
  document.getElementById('mc-purpose').value;
    payload.passengerBreakdown =
  `Adults: ${paxState.mc.adults} | ` +
  `Children: ${paxState.mc.children} | ` +
  `Infants: ${paxState.mc.infants}`;

const extraNames = [];
document.querySelectorAll('#mc-pax-names input').forEach(input => {
  if (input.value.trim()) extraNames.push(input.value.trim());
});

payload.additionalTravelers =
  extraNames.length ? extraNames.join(' | ') : '—';
  }

  // Fallback: no sheet configured — just call
  if (SHEETS_URL.includes('YOUR_SCRIPT_ID')) {
    window.location.href = BUSINESS.phoneHref;
    return;
  }

  // Submit to Google Sheets
btn.classList.add('loading');
btn.innerHTML = '⏳ Sending Enquiry...';

// Generate unique Lead ID
payload.enquiryId = 'ENQ-' + Date.now();

  fetch(SHEETS_URL, {
    method:  'POST',
    mode:    'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })
    .then(() => {
      toast.style.display = 'block';
      btn.classList.remove('loading');
      btn.innerHTML = '✈ Get Exclusive Fare — Call Now';

      // Clear contact fields on success
      ['cf-name', 'cf-phone', 'cf-email'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });

      setTimeout(() => { toast.style.display = 'none'; }, 6000);
    })
    .catch(() => {
      errEl.style.display = 'block';
      btn.classList.remove('loading');
      btn.innerHTML = '✈ Get Exclusive Fare — Call Now';
    });
}

/* ═══════════════════════════════════════════
   OUTSIDE-CLICK CLOSE — popups & dropdowns
═══════════════════════════════════════════ */
document.addEventListener('mousedown', function (e) {
  // Close passenger popups
  document.querySelectorAll('.pax-popup-wrap').forEach(wrap => {
    if (!wrap.contains(e.target)) {
      const popup   = wrap.querySelector('.pax-popup');
      const trigger = wrap.querySelector('.pax-trigger');
      if (popup)   popup.classList.remove('open');
      if (trigger) trigger.classList.remove('open');
    }
  });

  // Close airport dropdowns
  document.querySelectorAll('.ap-wrap.open').forEach(w => {
    if (!w.contains(e.target)) w.classList.remove('open');
  });
});

/* ═══════════════════════════════════════════
   EXPOSE GLOBALS for inline HTML onclick attrs
═══════════════════════════════════════════ */
window.changePax       = changePax;
window.togglePaxPopup  = togglePaxPopup;
window.addMCLeg        = addMCLeg;
window.removeMCLeg     = removeMCLeg;
window.updateQuoteForm = updateQuoteForm;
window.addRqMcLeg      = addRqMcLeg;
window.submitToSheets  = submitToSheets;

/* ═══════════════════════════════════════════
   INIT on DOM ready
═══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
  initTripTabs();
});
