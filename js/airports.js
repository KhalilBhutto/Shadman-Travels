/**
 * airports.js
 * Shadman Travels & Tours — Project Shadman Platform
 * Airport dataset and the reusable combobox / dropdown engine.
 * Depends on: nothing (self-contained)
 */

'use strict';

/* ─── AIRPORT DATA ─── */
const AIRPORTS = [
  // Pakistan
  { group: 'Pakistan',     name: 'Karachi',              code: 'KHI' },
  { group: 'Pakistan',     name: 'Lahore',               code: 'LHE' },
  { group: 'Pakistan',     name: 'Islamabad',            code: 'ISB' },
  { group: 'Pakistan',     name: 'Peshawar',             code: 'PEW' },
  { group: 'Pakistan',     name: 'Multan',               code: 'MUX' },
  { group: 'Pakistan',     name: 'Faisalabad',           code: 'LYP' },
  { group: 'Pakistan',     name: 'Sialkot',              code: 'SKT' },
  { group: 'Pakistan',     name: 'Quetta',               code: 'UET' },
  // Middle East
  { group: 'Middle East',  name: 'Dubai',                code: 'DXB' },
  { group: 'Middle East',  name: 'Jeddah',               code: 'JED' },
  { group: 'Middle East',  name: 'Riyadh',               code: 'RUH' },
  { group: 'Middle East',  name: 'Doha',                 code: 'DOH' },
  { group: 'Middle East',  name: 'Abu Dhabi',            code: 'AUH' },
  { group: 'Middle East',  name: 'Muscat',               code: 'MCT' },
  { group: 'Middle East',  name: 'Bahrain',              code: 'BAH' },
  { group: 'Middle East',  name: 'Kuwait',               code: 'KWI' },
  { group: 'Middle East',  name: 'Sharjah',              code: 'SHJ' },
  // Saudi Arabia
  { group: 'Saudi Arabia', name: 'Madinah',              code: 'MED' },
  { group: 'Saudi Arabia', name: 'Dammam',               code: 'DMM' },
  // Europe & UK
  { group: 'Europe & UK',  name: 'London Heathrow',      code: 'LHR' },
  { group: 'Europe & UK',  name: 'Manchester',           code: 'MAN' },
  { group: 'Europe & UK',  name: 'Birmingham',           code: 'BHX' },
  { group: 'Europe & UK',  name: 'Paris',                code: 'CDG' },
  { group: 'Europe & UK',  name: 'Frankfurt',            code: 'FRA' },
  { group: 'Europe & UK',  name: 'Milan',                code: 'MXP' },
  { group: 'Europe & UK',  name: 'Istanbul',             code: 'IST' },
  { group: 'Europe & UK',  name: 'Amsterdam',            code: 'AMS' },
  { group: 'Europe & UK',  name: 'Rome',                 code: 'FCO' },
  { group: 'Europe & UK',  name: 'Barcelona',            code: 'BCN' },
  { group: 'Europe & UK',  name: 'Madrid',               code: 'MAD' },
  { group: 'Europe & UK',  name: 'Vienna',               code: 'VIE' },
  { group: 'Europe & UK',  name: 'Zurich',               code: 'ZRH' },
  // Americas
  { group: 'Americas',     name: 'New York',             code: 'JFK' },
  { group: 'Americas',     name: 'Toronto',              code: 'YYZ' },
  { group: 'Americas',     name: 'Chicago',              code: 'ORD' },
  { group: 'Americas',     name: 'Los Angeles',          code: 'LAX' },
  { group: 'Americas',     name: 'Washington D.C.',      code: 'IAD' },
  { group: 'Americas',     name: 'Houston',              code: 'IAH' },
  // Asia-Pacific
  { group: 'Asia-Pacific', name: 'Bangkok',              code: 'BKK' },
  { group: 'Asia-Pacific', name: 'Kuala Lumpur',         code: 'KUL' },
  { group: 'Asia-Pacific', name: 'Singapore',            code: 'SIN' },
  { group: 'Asia-Pacific', name: 'Sydney',               code: 'SYD' },
  { group: 'Asia-Pacific', name: 'Melbourne',            code: 'MEL' },
  { group: 'Asia-Pacific', name: 'Baku',                 code: 'GYD' },
  { group: 'Asia-Pacific', name: 'Maldives',             code: 'MLE' },
  { group: 'Asia-Pacific', name: 'Bangkok Suvarnabhumi', code: 'BKK' },
  { group: 'Asia-Pacific', name: 'Phuket',               code: 'HKT' },
  // Africa
  { group: 'Africa',       name: 'Cairo',                code: 'CAI' },
  { group: 'Africa',       name: 'Nairobi',              code: 'NBO' },
  { group: 'Africa',       name: 'Casablanca',           code: 'CMN' },
];

/* ═══════════════════════════════════════════
   COMBOBOX / DROPDOWN ENGINE
═══════════════════════════════════════════ */

/**
 * Renders filtered airport options into a list element.
 * @param {HTMLElement} listEl  - The .ap-list container
 * @param {string}      q       - Search query string
 */
function renderOptions(listEl, q) {
  listEl.innerHTML = '';
  const lq       = q.toLowerCase().trim();
  const filtered = lq
    ? AIRPORTS.filter(a =>
        a.name.toLowerCase().includes(lq)  ||
        a.code.toLowerCase().includes(lq)  ||
        a.group.toLowerCase().includes(lq)
      )
    : AIRPORTS;

  if (!filtered.length) {
    const no      = document.createElement('div');
    no.className  = 'ap-option no-match';
    no.textContent = 'No airports found — type your own below';
    listEl.appendChild(no);
    return;
  }

  let lastGroup = '';
  filtered.forEach(a => {
    if (a.group !== lastGroup) {
      lastGroup    = a.group;
      const gl     = document.createElement('div');
      gl.className = 'ap-group-label';
      gl.textContent = a.group;
      listEl.appendChild(gl);
    }
    const opt          = document.createElement('div');
    opt.className      = 'ap-option';
    opt.innerHTML      = `${a.name} <span class="ap-code">${a.code}</span>`;
    opt.dataset.value  = `${a.name} (${a.code})`;
    listEl.appendChild(opt);
  });
}

/**
 * Builds the full dropdown (search box + list) inside the given ap-dropdown element.
 * @param {HTMLElement} dd    - The .ap-dropdown container
 * @param {string}      query - Initial query to pre-populate the search box
 */
function buildDropdown(dd, query) {
  dd.innerHTML = '';

  // Search row
  const searchRow       = document.createElement('div');
  searchRow.className   = 'ap-search-box';
  searchRow.innerHTML   = `<span class="ap-search-icon">🔍</span><input class="ap-search-input" placeholder="Type city or code..." autocomplete="off"/>`;
  dd.appendChild(searchRow);

  // List
  const listEl       = document.createElement('div');
  listEl.className   = 'ap-list';
  dd.appendChild(listEl);
  renderOptions(listEl, query || '');

  const searchInput = searchRow.querySelector('.ap-search-input');
  if (query) searchInput.value = query;

  searchInput.addEventListener('input', function () {
    renderOptions(listEl, this.value);
  });

  // Prevent the dropdown from closing when clicking inside it
  dd.addEventListener('mousedown', function (e) { e.stopPropagation(); });

  // Auto-focus the search input
  setTimeout(() => searchInput.focus(), 50);
}

/**
 * Initialises a single airport combobox wrapper element.
 * @param {HTMLElement} wrapEl - The .ap-wrap element
 */
function initCombobox(wrapEl) {
  const input = wrapEl.querySelector('.ap-input');
  const dd    = wrapEl.querySelector('.ap-dropdown');
  if (!input || !dd) return;

  // Allow free typing
  input.removeAttribute('readonly');

  // Open dropdown on focus
  input.addEventListener('focus', function () {
    wrapEl.classList.add('open');
    buildDropdown(dd, this.value);
  });

  // Live-filter as user types
  input.addEventListener('input', function () {
    const listEl = dd.querySelector('.ap-list');
    if (listEl) renderOptions(listEl, this.value);
    this.classList.toggle('has-value', !!this.value);
  });

  // Select an option
  dd.addEventListener('click', function (e) {
    const opt = e.target.closest('.ap-option');
    if (opt && opt.dataset.value) {
      input.value = opt.dataset.value;
      input.classList.add('has-value');
      wrapEl.classList.remove('open');
    }
  });
}

/**
 * Initialises all static .ap-wrap elements on the page.
 * Called once after DOM is ready (from main.js).
 */
function initAllComboboxes() {
  document.querySelectorAll('.ap-wrap').forEach(w => initCombobox(w));
}
