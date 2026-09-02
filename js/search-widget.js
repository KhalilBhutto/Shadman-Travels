/**
 * search-widget.js
 * Shadman Travels & Tours — Project Shadman Platform
 * Redesigned hero: boarding-pass ticket (passenger collector) +
 * horizontal search bar + mini destination carousel.
 * Replaces the old vertical search-card logic previously in forms.js.
 *
 * Depends on: config.js (BUSINESS, SHEETS_URL, FORM_SECRET),
 *             airports.js (AIRPORTS array — reused, not redefined)
 * Load order in index.html:
 *   config.js → airports.js → navbar.js → search-widget.js → notify.js → animations.js → main.js
 */

'use strict';

/* ─── DESTINATIONS DATA (mirrors destinations.json — kept in-file like
   AIRPORTS in airports.js, so it's actually wired up rather than an
   orphaned config/*.json file per the blueprint's Part 10 lesson #2) ─── */
const HERO_DESTINATIONS = [
  { city: 'Dubai',    code: 'DXB', price: '45,000',  img: 'images/destinations/dubai.jpg' },
  { city: 'Jeddah',   code: 'JED', price: '55,000',  img: 'images/destinations/jeddah.jpg' },
  { city: 'London',   code: 'LHR', price: '250,000', img: 'images/destinations/london.jpg' },
  { city: 'Doha',     code: 'DOH', price: '60,000',  img: 'images/destinations/doha.jpg' },
  { city: 'Toronto',  code: 'YYZ', price: '350,000', img: 'images/destinations/toronto.jpg' },
  { city: 'Istanbul', code: 'IST', price: '120,000', img: 'images/destinations/istanbul.jpg' },
  { city: 'Riyadh',   code: 'RUH', price: '52,000',  img: 'images/destinations/riyadh.jpg' },
  { city: 'Baku',     code: 'GYD', price: '95,000',  img: 'images/destinations/baku.jpg' },
];

/* ─── WIDGET STATE ─── */
const wState = {
  trip: 'rt', // rt | ow | mc
  from: '', fromCode: '', to: '', toCode: '',
  pax: { adults: 1, children: 0, infants: 0 },
  cabin: 'Economy',
  guestsConfirmed: false,
  depart: null, ret: null,
  mcLegs: [
    { from: '', fromCode: '', to: '', toCode: '', date: null },
    { from: '', fromCode: '', to: '', toCode: '', date: null },
  ],
  calMonthOffset: 0,
};

const MC_MAX = 9, PAX_TOTAL_MAX = 9, MAX_DAYS_FWD = 361;
const today = new Date(); today.setHours(0, 0, 0, 0);
const maxDate = new Date(today); maxDate.setDate(maxDate.getDate() + MAX_DAYS_FWD);
const RECENT_KEY = 'shadman_recent_search';

function fmtDate(d) { return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }); }
function toLocalISO(d) { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0'); return `${y}-${m}-${day}`; }
function parseLocalISO(iso) { const [y, m, day] = iso.split('-').map(Number); return new Date(y, m - 1, day); }

/* ─── FIELD RENDERING ─── */
function renderField(which) {
  if (which === 'from' || which === 'to') {
    const val = wState[which], code = wState[which + 'Code'];
    const valEl = document.getElementById(which + 'Value');
    const iconEl = document.getElementById(which + 'IconC');
    const clearEl = document.getElementById(which + 'Clear');
    if (val) {
      valEl.textContent = val + ', ' + code;
      valEl.classList.remove('placeholder');
      iconEl.classList.add('filled');
      clearEl.classList.add('show');
    } else {
      valEl.textContent = 'City or airport';
      valEl.classList.add('placeholder');
      iconEl.classList.remove('filled');
      clearEl.classList.remove('show');
    }
    if (which === 'from') updateHeroCarouselHeading();
  }
  if (which === 'guests') {
    const { adults, children, infants } = wState.pax;
    const total = adults + children + infants;
    const labelText = wState.guestsConfirmed ? (total + ' Guest' + (total !== 1 ? 's' : '') + ', ' + wState.cabin) : 'Add';
    [['guestsValue', 'guestsIconC'], ['mcGuestsValue', 'mcGuestsIconC']].forEach(([valId, iconId]) => {
      const valEl = document.getElementById(valId);
      const iconEl = document.getElementById(iconId);
      if (!valEl || !iconEl) return;
      valEl.textContent = labelText;
      valEl.classList.toggle('placeholder', !wState.guestsConfirmed);
      iconEl.classList.toggle('filled', wState.guestsConfirmed);
    });
  }
  if (which === 'date') {
    const valEl = document.getElementById('dateValue'), iconEl = document.getElementById('dateIconC');
    if (wState.trip === 'rt') {
      if (wState.depart && wState.ret) { valEl.textContent = fmtDate(wState.depart) + ' - ' + fmtDate(wState.ret); valEl.classList.remove('placeholder'); iconEl.classList.add('filled'); }
      else if (wState.depart) { valEl.textContent = fmtDate(wState.depart) + ' - return?'; valEl.classList.remove('placeholder'); iconEl.classList.add('filled'); }
      else { valEl.textContent = 'Add dates'; valEl.classList.add('placeholder'); iconEl.classList.remove('filled'); }
    } else if (wState.trip === 'ow') {
      if (wState.depart) { valEl.textContent = fmtDate(wState.depart); valEl.classList.remove('placeholder'); iconEl.classList.add('filled'); }
      else { valEl.textContent = 'Add date'; valEl.classList.add('placeholder'); iconEl.classList.remove('filled'); }
    } else {
      const filled = wState.mcLegs.every(l => l.date);
      valEl.textContent = filled ? wState.mcLegs.length + ' flights dated' : 'Add dates per flight';
      valEl.classList.toggle('placeholder', !filled);
      iconEl.classList.toggle('filled', filled);
    }
  }
  updateSearchBtn();
  updateHeroTicket();
}

function updateSearchBtn() {
  let ready = wState.from && wState.to;
  if (wState.trip === 'rt') ready = ready && wState.depart && wState.ret;
  if (wState.trip === 'ow') ready = ready && wState.depart;
  if (wState.trip === 'mc') ready = wState.mcLegs.every(l => l.from && l.to && l.date);
  document.querySelectorAll('.search-btn2').forEach(btn => { btn.disabled = !ready; });
}

/* ─── AIRPORT PICKER (reuses global AIRPORTS from airports.js) ─── */
function buildAirportList(popupEl, excludeCode, onSelect) {
  popupEl.innerHTML = `<div class="ap-search-box"><span class="ap-search-icon">🔍</span><input placeholder="Type city or code..." autocomplete="off"></div><div class="ap-list"></div>`;
  const listEl = popupEl.querySelector('.ap-list'), inputEl = popupEl.querySelector('input');
  function render(q) {
    listEl.innerHTML = '';
    const lq = q.toLowerCase().trim();
    let lastGroup = '';
    AIRPORTS.filter(a => !lq || a.name.toLowerCase().includes(lq) || a.code.toLowerCase().includes(lq) || a.group.toLowerCase().includes(lq)).forEach(a => {
      if (a.group !== lastGroup) {
        lastGroup = a.group;
        const g = document.createElement('div');
        g.className = 'ap-group';
        g.textContent = a.group;
        listEl.appendChild(g);
      }
      const opt = document.createElement('div');
      const isExcluded = a.code === excludeCode;
      opt.className = 'ap-opt' + (isExcluded ? ' disabled' : '');
      opt.innerHTML = `<span class="ap-opt-icon">✈</span><span class="ap-opt-text"><span class="ap-opt-city">${a.name}</span><span class="ap-opt-sub">${a.group}</span></span><span class="code">${a.code}</span>`;
      if (!isExcluded) opt.addEventListener('click', () => { onSelect(a); closeAllPopups(); });
      listEl.appendChild(opt);
    });
  }
  render('');
  inputEl.addEventListener('input', () => render(inputEl.value));
  setTimeout(() => inputEl.focus(), 30);
}

function openAirportPopup(which) {
  closeAllPopups();
  const popupEl = document.getElementById(which + 'Popup');
  const exclude = which === 'from' ? wState.toCode : wState.fromCode;
  buildAirportList(popupEl, exclude, (airport) => {
    wState[which] = airport.name; wState[which + 'Code'] = airport.code;
    renderField(which);
    if (which === 'from' && !wState.to) {
      setTimeout(() => { openAirportPopup('to'); setActiveStep('toField'); }, 150);
    } else if (which === 'to' && wState.from && wState.to) {
      setTimeout(() => openGuestsPopup(), 150);
    }
  });
  popupEl.classList.add('open');
}

/* ─── GUESTS + CABIN POPUP ─── */
function openGuestsPopup() {
  closeAllPopups();
  const popupEl = document.getElementById('guestsPopup');
  refreshGuestsPopup();
  popupEl.classList.add('open');
}
function refreshGuestsPopup() {
  const popupEl = document.getElementById('guestsPopup');
  const { adults, children, infants } = wState.pax;
  const total = adults + children;
  const cabins = ['Economy', 'Premium Economy', 'Business', 'First'];
  popupEl.innerHTML = `
    <div class="gp-body">
      <div>
        <div class="gp-col-title">Guests</div>
        <div class="gp-row"><div class="gp-label"><b>Adults</b><small>Age 12+</small></div>
          <div class="gp-ctrl"><button class="gp-btn" data-act="adults-" ${adults <= 1 ? 'disabled' : ''}>−</button><span class="gp-num">${adults}</span><button class="gp-btn" data-act="adults+" ${total >= PAX_TOTAL_MAX ? 'disabled' : ''}>+</button></div></div>
        <div class="gp-row"><div class="gp-label"><b>Children</b><small>Age 2–11 years</small></div>
          <div class="gp-ctrl"><button class="gp-btn" data-act="children-" ${children <= 0 ? 'disabled' : ''}>−</button><span class="gp-num">${children}</span><button class="gp-btn" data-act="children+" ${total >= PAX_TOTAL_MAX ? 'disabled' : ''}>+</button></div></div>
        <div class="gp-row"><div class="gp-label"><b>Infants</b><small>Under 2 years</small></div>
          <div class="gp-ctrl"><button class="gp-btn" data-act="infants-" ${infants <= 0 ? 'disabled' : ''}>−</button><span class="gp-num">${infants}</span><button class="gp-btn" data-act="infants+" ${infants >= adults ? 'disabled' : ''}>+</button></div></div>
      </div>
      <div>
        <div class="gp-col-title">Cabin</div>
        ${cabins.map(c => `<div class="gp-cabin-row ${wState.cabin === c ? 'selected' : ''}" data-cabin="${c}"><div class="gp-radio"></div><span>${c}</span></div>`).join('')}
      </div>
    </div>
    <div class="gp-footer">
      <span class="gp-cap-note">Max 9 guests total · Infants limited to number of adults</span>
      <button class="gp-done">Continue</button>
    </div>`;
  popupEl.querySelectorAll('.gp-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const act = btn.dataset.act, type = act.slice(0, -1), dir = act.slice(-1);
      const tot = wState.pax.adults + wState.pax.children;
      if (dir === '+') {
        if (type !== 'infants' && tot >= PAX_TOTAL_MAX) return;
        if (type === 'infants' && wState.pax.infants >= wState.pax.adults) return;
        wState.pax[type]++;
      } else {
        if (type === 'adults' && wState.pax.adults <= 1) return;
        if (type === 'adults' && wState.pax.infants > wState.pax.adults - 1) wState.pax.infants = wState.pax.adults - 1;
        wState.pax[type] = Math.max(0, wState.pax[type] - 1);
      }
      refreshGuestsPopup();
    });
  });
  popupEl.querySelectorAll('.gp-cabin-row').forEach(row => {
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      wState.cabin = row.dataset.cabin;
      refreshGuestsPopup();
    });
  });
  popupEl.querySelector('.gp-done').addEventListener('click', (e) => {
    e.stopPropagation();
    wState.guestsConfirmed = true; renderField('guests'); closeAllPopups(); setTimeout(() => openCalendarPopup(), 150);
  });
}

/* ─── CALENDAR POPUP ─── */
function openCalendarPopup(legIndex) {
  const popupEl = document.getElementById('calPopup');
  closeAllPopups();
  wState.calMonthOffset = 0;
  popupEl.classList.add('open');
  renderCalendar(popupEl, legIndex);
}
function renderCalendar(popupEl, legIndex) {
  const baseMonth = new Date(today.getFullYear(), today.getMonth() + wState.calMonthOffset, 1);
  let monthsHtml = '';
  for (let m = 0; m < 3; m++) monthsHtml += renderMonth(new Date(baseMonth.getFullYear(), baseMonth.getMonth() + m, 1), legIndex);
  const isMC = legIndex !== undefined;
  let selTxt = '';
  if (isMC) { const leg = wState.mcLegs[legIndex]; selTxt = leg.date ? ('Flight ' + (legIndex + 1) + ': ' + fmtDate(leg.date)) : 'Select a date'; }
  else if (wState.trip === 'rt') { selTxt = wState.depart ? (wState.ret ? fmtDate(wState.depart) + ' → ' + fmtDate(wState.ret) : fmtDate(wState.depart) + ' → select return') : 'Select departure date'; }
  else { selTxt = wState.depart ? fmtDate(wState.depart) : 'Select departure date'; }
  const atMin = wState.calMonthOffset <= 0, atMax = wState.calMonthOffset >= 10;
  popupEl.innerHTML = `
    <div class="cal-header">
      <button class="cal-jump-btn" id="calJumpBtn">${baseMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })} <span class="cal-jump-chevron">▾</span></button>
      <div class="cal-nav"><button class="cal-nav-btn" id="calPrev" ${atMin ? 'disabled' : ''}>‹</button><button class="cal-nav-btn" id="calNext" ${atMax ? 'disabled' : ''}>›</button></div></div>
    <div class="cal-months">${monthsHtml}</div>
    <div class="cal-footer"><a href="#" class="cal-reset" id="calResetBtn">Reset</a><span class="cal-selection-txt">${selTxt}</span></div>`;
  popupEl.querySelectorAll('.cal-day:not(.disabled):not(.empty)').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      handleDateClick(parseLocalISO(el.dataset.date), legIndex);
      const selectionComplete = legIndex !== undefined
        ? !!wState.mcLegs[legIndex].date
        : (wState.trip === 'ow' ? !!wState.depart : !!(wState.depart && wState.ret));
      if (legIndex !== undefined) { renderAllMcLegs(); updateSearchBtn(); updateHeroTicket(); }
      else { renderField('date'); }
      if (selectionComplete) closeAllPopups();
      else renderCalendar(popupEl, legIndex);
    });
  });
  const prevBtn = popupEl.querySelector('#calPrev'), nextBtn = popupEl.querySelector('#calNext');
  if (prevBtn) prevBtn.addEventListener('click', (e) => { e.stopPropagation(); wState.calMonthOffset = Math.max(0, wState.calMonthOffset - 1); renderCalendar(popupEl, legIndex); });
  if (nextBtn) nextBtn.addEventListener('click', (e) => { e.stopPropagation(); wState.calMonthOffset = Math.min(10, wState.calMonthOffset + 1); renderCalendar(popupEl, legIndex); });
  popupEl.querySelector('#calResetBtn').addEventListener('click', (e) => {
    e.stopPropagation(); e.preventDefault();
    if (legIndex !== undefined) { wState.mcLegs[legIndex].date = null; updateMcLegDateLabel(legIndex); }
    else { wState.depart = null; wState.ret = null; renderField('date'); }
    updateSearchBtn(); updateHeroTicket();
    renderCalendar(popupEl, legIndex);
  });
  popupEl.querySelector('#calJumpBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    renderMonthJump(popupEl, legIndex);
  });
}
function renderMonthJump(popupEl, legIndex) {
  const months = [];
  for (let i = 0; i <= 11; i++) months.push(new Date(today.getFullYear(), today.getMonth() + i, 1));
  const gridHtml = months.map((d, i) => {
    const disabled = i > 9;
    return `<div class="cal-jump-cell ${disabled ? 'disabled' : ''}" data-offset="${i}">${d.toLocaleDateString('en-GB', { month: 'short' })}<br><small>${d.getFullYear()}</small></div>`;
  }).join('');
  popupEl.innerHTML = `
    <div class="cal-header"><span class="cal-range-note">Jump to a month — dates open up to 361 days ahead</span></div>
    <div class="cal-jump-grid">${gridHtml}</div>
    <div class="cal-footer"><button class="cal-done" id="calBackBtn">‹ Back to calendar</button></div>`;
  popupEl.querySelectorAll('.cal-jump-cell:not(.disabled)').forEach(cell => {
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
      wState.calMonthOffset = parseInt(cell.dataset.offset, 10);
      renderCalendar(popupEl, legIndex);
    });
  });
  popupEl.querySelector('#calBackBtn').addEventListener('click', (e) => { e.stopPropagation(); renderCalendar(popupEl, legIndex); });
}
function renderMonth(monthDate, legIndex) {
  const y = monthDate.getFullYear(), m = monthDate.getMonth();
  const monthName = monthDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const firstDow = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  let cells = '';
  const dows = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const dowRow = dows.map(d => `<div class="cal-dow">${d}</div>`).join('');
  for (let i = 0; i < firstDow; i++) cells += `<div class="cal-day empty"></div>`;

  // Multi-city: each leg must be strictly after the previous leg's date
  let minDate = today;
  if (legIndex !== undefined && legIndex > 0) {
    const prevDate = wState.mcLegs[legIndex - 1].date;
    if (prevDate) {
      const dayAfter = new Date(prevDate);
      dayAfter.setDate(dayAfter.getDate() + 1);
      if (dayAfter > minDate) minDate = dayAfter;
    }
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(y, m, day);
    const iso = toLocalISO(d);
    const disabled = d < minDate || d > maxDate;
    const isToday = d.getTime() === today.getTime();
    let selClass = '';
    if (legIndex !== undefined) {
      const leg = wState.mcLegs[legIndex];
      if (leg.date && d.getTime() === leg.date.getTime()) selClass = 'selected';
    } else if (wState.trip === 'ow') {
      if (wState.depart && d.getTime() === wState.depart.getTime()) selClass = 'selected';
    } else {
      if (wState.depart && d.getTime() === wState.depart.getTime()) selClass = 'selected';
      if (wState.ret && d.getTime() === wState.ret.getTime()) selClass = 'selected';
      if (wState.depart && wState.ret && d > wState.depart && d < wState.ret) selClass = 'in-range';
    }
    cells += `<div class="cal-day ${disabled ? 'disabled' : ''} ${isToday ? 'today' : ''} ${selClass}" data-date="${iso}" ${disabled ? 'title="Not available"' : ''}>${day}</div>`;
  }
  return `<div class="cal-month"><h4>${monthName}</h4><div class="cal-grid">${dowRow}${cells}</div></div>`;
}
function handleDateClick(d, legIndex) {
  if (legIndex !== undefined) {
    wState.mcLegs[legIndex].date = d;
    // Clear any later legs whose date is no longer valid (must be strictly after this one)
    for (let j = legIndex + 1; j < wState.mcLegs.length; j++) {
      if (wState.mcLegs[j].date && wState.mcLegs[j].date <= d) wState.mcLegs[j].date = null;
    }
    return;
  }
  if (wState.trip === 'ow') { wState.depart = d; }
  else {
    if (!wState.depart || (wState.depart && wState.ret) || d < wState.depart) { wState.depart = d; wState.ret = null; }
    else { wState.ret = d; }
  }
}

function closeAllPopups() {
  document.querySelectorAll('.popup, .popup-panel').forEach(p => p.classList.remove('open'));
  document.querySelectorAll('.wf').forEach(w => w.classList.remove('active-step'));
}
function setActiveStep(fieldId) {
  document.querySelectorAll('.wf').forEach(w => w.classList.remove('active-step'));
  const el = document.getElementById(fieldId);
  if (el) el.classList.add('active-step');
}

/* ─── MULTI-CITY LEGS ─── */
function renderAllMcLegs() {
  const wrap = document.getElementById('mcLegs');
  wrap.innerHTML = '';
  wState.mcLegs.forEach((leg, i) => wrap.appendChild(buildMcLegEl(i)));
  updateMcAddState();
}
function buildMcLegEl(i) {
  const leg = wState.mcLegs[i];
  const wrap = document.createElement('div');
  wrap.className = 'mc-leg-wrap';
  const row = document.createElement('div');
  row.className = 'mc-leg-row2';
  row.innerHTML = `
    <div class="wf" data-part="from"><div class="wf-icon-circle ${leg.from ? 'filled' : ''}"><i class="fas fa-plane-departure"></i></div>
      <div class="wf-text"><div class="wf-label2">From</div><div class="wf-val2 ${leg.from ? '' : 'placeholder'}">${leg.from || 'City or airport'}</div></div><div class="wf-clear ${leg.from ? 'show' : ''}" data-clear="from" title="Clear">×</div><div class="popup ap-popup"></div></div>
    <div class="wf-swap2" data-swap="1"><div class="swap-circle"><i class="fas fa-right-left"></i></div></div>
    <div class="wf" data-part="to"><div class="wf-icon-circle ${leg.to ? 'filled' : ''}"><i class="fas fa-plane-arrival"></i></div>
      <div class="wf-text"><div class="wf-label2">To</div><div class="wf-val2 ${leg.to ? '' : 'placeholder'}">${leg.to || 'City or airport'}</div></div><div class="wf-clear ${leg.to ? 'show' : ''}" data-clear="to" title="Clear">×</div><div class="popup ap-popup"></div></div>
    <div class="wf" data-part="date"><div class="wf-icon-circle ${leg.date ? 'filled' : ''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg></div>
      <div class="wf-text"><div class="wf-label2">Date</div><div class="wf-val2 ${leg.date ? '' : 'placeholder'}">${leg.date ? fmtDate(leg.date) : 'Add date'}</div></div></div>
    ${i >= 2 ? `<div class="mc-remove2" data-remove="1">✕</div>` : `<div style="width:10px"></div>`}
    <div class="popup cal-popup"></div>
  `;
  wrap.innerHTML = `<div class="mc-leg-heading">Flight ${i + 1}</div>`;
  wrap.appendChild(row);
  row.querySelector('[data-part="from"]').addEventListener('click', (e) => { if (!e.target.closest('.popup') && !e.target.closest('.wf-clear')) openMcAirport(i, 'from', row); });
  row.querySelector('[data-part="to"]').addEventListener('click', (e) => { if (!e.target.closest('.popup') && !e.target.closest('.wf-clear')) openMcAirport(i, 'to', row); });
  row.querySelector('[data-part="date"]').addEventListener('click', (e) => { if (!e.target.closest('.popup')) openMcCalendar(i, row); });
  const swapEl = row.querySelector('[data-swap]');
  if (swapEl) swapEl.addEventListener('click', (e) => {
    e.stopPropagation();
    [wState.mcLegs[i].from, wState.mcLegs[i].to] = [wState.mcLegs[i].to, wState.mcLegs[i].from];
    [wState.mcLegs[i].fromCode, wState.mcLegs[i].toCode] = [wState.mcLegs[i].toCode, wState.mcLegs[i].fromCode];
    renderMcLeg(i);
  });
  const removeEl = row.querySelector('[data-remove]');
  if (removeEl) removeEl.addEventListener('click', (e) => { e.stopPropagation(); wState.mcLegs.splice(i, 1); renderAllMcLegs(); updateSearchBtn(); updateHeroTicket(); });
  row.querySelectorAll('[data-clear]').forEach(clearBtn => {
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const part = clearBtn.dataset.clear;
      wState.mcLegs[i][part] = ''; wState.mcLegs[i][part + 'Code'] = '';
      renderMcLeg(i);
    });
  });
  return wrap;
}
function updateMcLegDateLabel(i) {
  const row = document.getElementById('mcLegs').children[i];
  if (!row) return;
  const leg = wState.mcLegs[i];
  const dateField = row.querySelector('[data-part="date"]');
  if (!dateField) return;
  const iconEl = dateField.querySelector('.wf-icon-circle');
  const valEl = dateField.querySelector('.wf-val2');
  valEl.textContent = leg.date ? fmtDate(leg.date) : 'Add date';
  valEl.classList.toggle('placeholder', !leg.date);
  iconEl.classList.toggle('filled', !!leg.date);
}

function renderMcLeg(i) {
  const wrap = document.getElementById('mcLegs');
  const newRow = buildMcLegEl(i);
  wrap.replaceChild(newRow, wrap.children[i]);
  updateSearchBtn(); updateHeroTicket();
}
function openMcAirport(i, part, rowEl) {
  closeAllPopups();
  const popupEl = rowEl.querySelector(`[data-part="${part}"] .popup`);
  const exclude = part === 'from' ? wState.mcLegs[i].toCode : wState.mcLegs[i].fromCode;
  buildAirportList(popupEl, exclude, (airport) => {
    wState.mcLegs[i][part] = airport.name; wState.mcLegs[i][part + 'Code'] = airport.code;
    renderMcLeg(i);
    if (part === 'from' && !wState.mcLegs[i].to) {
      setTimeout(() => { const newRow = document.getElementById('mcLegs').children[i]; openMcAirport(i, 'to', newRow); }, 150);
    } else if (part === 'to') {
      setTimeout(() => { const newRow = document.getElementById('mcLegs').children[i]; openMcCalendar(i, newRow); }, 150);
    }
  });
  popupEl.classList.add('open');
}
function openMcCalendar(i, rowEl) {
  closeAllPopups();
  const refDate = wState.mcLegs[i].date || (i > 0 ? wState.mcLegs[i - 1].date : null);
  if (refDate) {
    const monthsAhead = (refDate.getFullYear() - today.getFullYear()) * 12 + (refDate.getMonth() - today.getMonth());
    wState.calMonthOffset = Math.max(0, Math.min(10, monthsAhead));
  } else {
    wState.calMonthOffset = 0;
  }
  const popupEl = rowEl.querySelector('.cal-popup');
  popupEl.classList.add('open');
  renderCalendar(popupEl, i);
}
function updateMcAddState() {
  const btn = document.getElementById('mcAddBtn'), note = document.getElementById('mcCountNote');
  if (!btn || !note) return;
  btn.disabled = wState.mcLegs.length >= MC_MAX;
  note.textContent = wState.mcLegs.length + ' of ' + MC_MAX + ' flights';
}

/* ─── RECENT SEARCH (localStorage) ─── */
function saveRecentSearch() {
  let summary;
  if (wState.trip === 'mc') {
    summary = { trip: 'mc', legs: wState.mcLegs.map(l => ({ from: l.fromCode, fromName: l.from, to: l.toCode, toName: l.to, date: l.date ? l.date.toISOString() : null })), pax: wState.pax, cabin: wState.cabin };
  } else {
    summary = {
      trip: wState.trip, from: wState.fromCode, to: wState.toCode, fromName: wState.from, toName: wState.to,
      depart: wState.depart ? wState.depart.toISOString() : null, ret: wState.ret ? wState.ret.toISOString() : null,
      pax: wState.pax, cabin: wState.cabin,
    };
  }
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(summary)); } catch (e) { /* storage unavailable — non-fatal */ }
  renderRecentChip();
}
function renderRecentChip() {
  const wrap = document.getElementById('recentChipWrap');
  if (!wrap) return;
  let raw;
  try { raw = localStorage.getItem(RECENT_KEY); } catch (e) { raw = null; }
  if (!raw) { wrap.innerHTML = ''; return; }
  let s;
  try { s = JSON.parse(raw); } catch (e) { wrap.innerHTML = ''; return; }
  const totalGuests = s.pax.adults + s.pax.children + s.pax.infants;
  let routeTxt, dateTxt;
  if (s.trip === 'mc') {
    routeTxt = s.legs.map(l => l.from + ' - ' + l.to).join(' · ');
    dateTxt = s.legs.map(l => l.date ? fmtDate(new Date(l.date)) : '?').join(', ');
  } else {
    routeTxt = (s.fromName || s.from) + ' - ' + (s.toName || s.to);
    dateTxt = s.depart ? fmtDate(new Date(s.depart)) + (s.ret ? ' - ' + fmtDate(new Date(s.ret)) : '') : '';
  }
  wrap.innerHTML = `<div class="recent-chip" id="recentChipBtn">
    <div class="rc-icon-circle"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></div>
    <div class="rc-body">
      <div class="rc-route">${routeTxt}</div>
      <div class="rc-meta-row">
        <span class="rc-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>${dateTxt}</span>
        <span class="rc-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>${totalGuests}</span>
        <span class="rc-meta-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12l18-7-7 18-3-8-8-3z"/></svg>${s.cabin}</span>
      </div>
    </div>
    <span class="rc-chevron">›</span>
  </div>`;
  document.getElementById('recentChipBtn').addEventListener('click', () => loadRecentSearch(s));
}
function loadRecentSearch(s) {
  if (s.trip === 'mc') {
    document.querySelector('.pill-tab[data-trip="mc"]').click();
    wState.mcLegs = s.legs.map(l => ({ from: l.fromName || l.from, fromCode: l.from, to: l.toName || l.to, toCode: l.to, date: l.date ? new Date(l.date) : null }));
    wState.pax = s.pax; wState.cabin = s.cabin;
    renderAllMcLegs();
  } else {
    document.querySelector('.pill-tab[data-trip="' + s.trip + '"]').click();
    wState.from = s.fromName; wState.fromCode = s.from; wState.to = s.toName; wState.toCode = s.to;
    wState.depart = s.depart ? new Date(s.depart) : null;
    wState.ret = s.ret ? new Date(s.ret) : null;
    wState.pax = s.pax; wState.cabin = s.cabin; wState.guestsConfirmed = true;
    renderField('from'); renderField('to'); renderField('guests'); renderField('date');
  }
  updateSearchBtn();
}

/* ─── LIVE BOARDING-PASS TICKET ─── */
function updateHeroTicket() {
  const tripLabel = { rt: 'Round Trip', ow: 'One Way', mc: 'Multi-City' }[wState.trip];
  const { adults, children, infants } = wState.pax;
  let guestLabel = adults + ' Adult' + (adults !== 1 ? 's' : '');
  if (children) guestLabel += ', ' + children + ' Child' + (children !== 1 ? 'ren' : '');
  if (infants) guestLabel += ', ' + infants + ' Infant' + (infants !== 1 ? 's' : '');

  let fromCode, toCode, fromCity, toCity, hasRoute;
  if (wState.trip === 'mc') {
    const firstLeg = wState.mcLegs[0];
    fromCode = firstLeg.fromCode || '—';
    toCode = wState.mcLegs[wState.mcLegs.length - 1].toCode || '—';
    fromCity = firstLeg.from || 'Select From';
    toCity = wState.mcLegs[wState.mcLegs.length - 1].to || 'Select To';
    hasRoute = wState.mcLegs.every(l => l.from && l.to);
  } else {
    fromCode = wState.fromCode || '—';
    toCode = wState.toCode || '—';
    fromCity = wState.from || 'Select From';
    toCity = wState.to || 'Select To';
    hasRoute = !!(wState.from && wState.to);
  }
  const els = {
    htFromCode: fromCode, htToCode: toCode, htFromCity: fromCity, htToCity: toCity,
    htClass: wState.cabin,
    htTrip: wState.trip === 'mc' ? 'Multi-City (' + wState.mcLegs.length + ')' : tripLabel,
    htGuests: guestLabel,
  };
  Object.keys(els).forEach(id => { const el = document.getElementById(id); if (el) el.textContent = els[id]; });
  const emptyNote = document.getElementById('htEmptyNote');
  if (emptyNote) emptyNote.style.display = hasRoute ? 'none' : 'block';
}

/* ─── MINI DESTINATION CAROUSEL ─── */
let heroDestIndex = 0;
function renderHeroDestinations() {
  const track = document.getElementById('hcTrack');
  if (!track) return;
  track.innerHTML = HERO_DESTINATIONS.map((d, i) => `
    <div class="hc-card" data-idx="${i}" style="background-image:url('${d.img}')">
      <div class="hc-card-tag">Round trip · Economy</div>
      <div class="hc-card-info">
        <div class="hc-card-city">${d.city}</div>
        <div class="hc-card-price">From <b>PKR ${d.price}*</b></div>
      </div>
    </div>`).join('');
  // Fallback gradient if a destination photo is missing/not yet uploaded
  HERO_DESTINATIONS.forEach((d, i) => {
    const testImg = new Image();
    testImg.onerror = () => {
      const card = track.querySelector(`.hc-card[data-idx="${i}"]`);
      if (card) card.style.backgroundImage = 'linear-gradient(160deg, var(--g600), var(--g800))';
    };
    testImg.src = d.img;
  });
  track.querySelectorAll('.hc-card').forEach(card => {
    card.addEventListener('click', () => {
      const idx = parseInt(card.dataset.idx, 10);
      if (idx === heroDestIndex) return;
      heroDestIndex = idx; updateHeroDestPositions();
    });
  });
  document.getElementById('hcPrev').addEventListener('click', () => {
    heroDestIndex = (heroDestIndex - 1 + HERO_DESTINATIONS.length) % HERO_DESTINATIONS.length;
    updateHeroDestPositions();
  });
  document.getElementById('hcNext').addEventListener('click', () => {
    heroDestIndex = (heroDestIndex + 1) % HERO_DESTINATIONS.length;
    updateHeroDestPositions();
  });
  const dotsWrap = document.getElementById('hcDots');
  dotsWrap.innerHTML = HERO_DESTINATIONS.map((d, i) => `<div class="hc-dot" data-idx="${i}"></div>`).join('');
  dotsWrap.querySelectorAll('.hc-dot').forEach(dot => {
    dot.addEventListener('click', () => { heroDestIndex = parseInt(dot.dataset.idx, 10); updateHeroDestPositions(); });
  });
  updateHeroDestPositions();
}
function updateHeroDestPositions() {
  const n = HERO_DESTINATIONS.length;
  document.querySelectorAll('.hc-card').forEach(card => {
    const idx = parseInt(card.dataset.idx, 10);
    let diff = idx - heroDestIndex;
    if (diff > n / 2) diff -= n;
    if (diff < -n / 2) diff += n;
    let pos = 'hidden';
    if (diff === 0) pos = 'center';
    else if (diff === -1) pos = 'near-left';
    else if (diff === 1) pos = 'near-right';
    else if (diff === -2) pos = 'far-left';
    else if (diff === 2) pos = 'far-right';
    card.dataset.pos = pos;
  });
  document.querySelectorAll('.hc-dot').forEach(dot => {
    dot.classList.toggle('active', parseInt(dot.dataset.idx, 10) === heroDestIndex);
  });
}
function updateHeroCarouselHeading() {
  const el = document.getElementById('hcCityName');
  if (el) el.textContent = wState.from || 'Karachi';
}

/* ─── FIELD VALIDATION HELPERS (same rules as the original site) ─── */
function isValidPhone(phone) {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^(0092|\+92|92|0)?3\d{9}$/.test(cleaned);
  function isValidPhone(phone) {
  const cleaned = phone.replace(/[\s\-()]/g, '');
  return /^(0092|\+92|92|0)?3\d{9}$/.test(cleaned);
}
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
}
function showFieldError(el) { if (el) el.classList.add('input-error'); }
function clearFieldError(el) { if (el) el.classList.remove('input-error'); }

/* ─── SUBMIT — same payload contract as the original submitToSheets() ─── */
function submitTicketEnquiry() {
  document.activeElement.blur();

  const btn = document.getElementById('htSubmit');
  const toastEl = document.getElementById('htToast');
  const errEl = document.getElementById('htError');
  const valEl = document.getElementById('htValidation');
  toastEl.style.display = 'none'; errEl.style.display = 'none'; valEl.style.display = 'none';

  document.querySelectorAll('.input-error').forEach(clearFieldError);

  const nameInput = document.getElementById('htName');
  const phoneInput = document.getElementById('htPhone');
  const emailInput = document.getElementById('htEmail');
  const notesInput = document.getElementById('htNotes');

  const name = (nameInput.value || '').trim();
  const phone = (phoneInput.value || '').trim();
  const email = (emailInput.value || '').trim();
  const notes = (notesInput.value || '').trim();

  if (!name) {
    valEl.textContent = '⚠ Please enter your full name.'; valEl.style.display = 'block';
    showFieldError(nameInput); nameInput.focus(); return;
  }
  if (!phone) {
    valEl.textContent = '⚠ Please enter your WhatsApp / Phone number.'; valEl.style.display = 'block';
    showFieldError(phoneInput); phoneInput.focus(); return;
  }
  if (!isValidPhone(phone)) {
    errEl.textContent = '⚠ Please enter a valid Pakistani mobile number.'; errEl.style.display = 'block';
    showFieldError(phoneInput); phoneInput.focus(); return;
  }
    if (!isValidPhone(phone)) {
    errEl.textContent = '⚠ Please enter a valid Pakistani mobile number.'; errEl.style.display = 'block';
    showFieldError(phoneInput); phoneInput.focus(); return;
  }
  if (email && !isValidEmail(email)) {
    errEl.textContent = '⚠ Please enter a valid email address, or leave it blank.'; errEl.style.display = 'block';
    showFieldError(emailInput); emailInput.focus(); return;
  }

  if (wState.trip === 'mc') {
    for (const leg of wState.mcLegs) {
      if (!leg.from || !leg.to || !leg.date) {
        valEl.textContent = '⚠ Please complete From, To and Date for every flight.'; valEl.style.display = 'block';
        return;
      }
    }
  } else {
    if (!wState.from || !wState.to) {
      valEl.textContent = '⚠ Please select your From and To airports.'; valEl.style.display = 'block';
      return;
    }
    if (!wState.depart || (wState.trip === 'rt' && !wState.ret)) {
      valEl.textContent = '⚠ Please select your travel date' + (wState.trip === 'rt' ? 's' : '') + '.'; valEl.style.display = 'block';
      return;
    }
  }

  const tripLabel = { rt: 'Round Trip', ow: 'One Way', mc: 'Multi City' }[wState.trip];
  const passengerBreakdown = `Adults: ${wState.pax.adults} | Children: ${wState.pax.children} | Infants: ${wState.pax.infants}`;
  const { adults, children, infants } = wState.pax;
  let passengersLabel = adults + ' Adult' + (adults !== 1 ? 's' : '');
  if (children) passengersLabel += ', ' + children + ' Child' + (children !== 1 ? 'ren' : '');
  if (infants) passengersLabel += ', ' + infants + ' Infant' + (infants !== 1 ? 's' : '');

  const ts = new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' });
  const payload = {
    secret: FORM_SECRET,
    timestamp: ts,
    name: name,
    phone: phone,
    email: email || '—',
    notes: notes || '—',
    tripType: tripLabel,
    passengerBreakdown: passengerBreakdown,
    additionalTravelers: '—',
    preferredAirline: '—',
    travelPurpose: '—',
    enquiryId: '',
    passengers: passengersLabel,
    travelClass: wState.cabin,
  };

  if (wState.trip === 'mc') {
    payload.from = '—'; payload.to = '—'; payload.departure = '—'; payload.returnDate = '—';
    payload.legs = wState.mcLegs.map((l, i) => `Leg${i + 1}: ${l.from} (${l.fromCode}) → ${l.to} (${l.toCode}) on ${l.date ? toLocalISO(l.date) : '?'}`).join(' | ');
  } else {
    payload.from = `${wState.from} (${wState.fromCode})`;
    payload.to = `${wState.to} (${wState.toCode})`;
    payload.departure = wState.depart ? toLocalISO(wState.depart) : 'Not set';
    payload.returnDate = wState.trip === 'rt' && wState.ret ? toLocalISO(wState.ret) : '—';
    payload.legs = '—';
  }

  if (typeof SHEETS_URL === 'undefined' || SHEETS_URL.includes('YOUR_SCRIPT_ID')) {
    window.location.href = BUSINESS.phoneHref;
    return;
  }

  btn.classList.add('loading');
  btn.innerHTML = '⏳ Sending Enquiry...';

  fetch(SHEETS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  })
    .then(res => res.json())
    .then(data => {
      if (!data.success) throw new Error(data.error || 'Submission failed on server');

      const idLine = document.getElementById('htToastId');
      if (idLine) idLine.textContent = data.enquiryId ? ('Reference: ' + data.enquiryId) : '';
      toastEl.style.display = 'block';

      if (typeof gtag === 'function') {
        gtag('event', 'flight_inquiry_submit', { trip_type: payload.tripType, travel_class: payload.travelClass });
      }

      btn.classList.remove('loading');
      btn.innerHTML = '✈ Confirm &amp; Get Exclusive Fare';

      saveRecentSearch();
      [nameInput, phoneInput, emailInput, notesInput].forEach(el => { el.value = ''; });

      setTimeout(() => { toastEl.style.display = 'none'; }, 6000);
    })
    .catch(error => {
      console.error(error);
      errEl.textContent = '⚠ Submission failed — please call us directly at +92 300 0041510';
      errEl.style.display = 'block';
      btn.classList.remove('loading');
      btn.innerHTML = '✈ Confirm &amp; Get Exclusive Fare';
    });
}

/* ─── INIT (runs once DOM is ready) ─── */
document.addEventListener('DOMContentLoaded', function () {
  if (!document.getElementById('fromField')) return; // widget not on this page

  document.addEventListener('click', (e) => {
    const path = typeof e.composedPath === 'function' ? e.composedPath() : [e.target];
    const insideWidget = path.some(el => el && el.classList && (el.classList.contains('wf') || el.classList.contains('popup') || el.classList.contains('popup-panel')));
    if (!insideWidget) closeAllPopups();
  });

  document.getElementById('fromField').addEventListener('click', (e) => { if (!e.target.closest('.popup') && !e.target.closest('.wf-clear')) { openAirportPopup('from'); setActiveStep('fromField'); } });
  document.getElementById('toField').addEventListener('click', (e) => { if (!e.target.closest('.popup') && !e.target.closest('.wf-clear')) { openAirportPopup('to'); setActiveStep('toField'); } });
  document.getElementById('guestsField').addEventListener('click', (e) => { if (!e.target.closest('.popup')) { openGuestsPopup(); setActiveStep('guestsField'); } });
  document.getElementById('mcGuestsField').addEventListener('click', (e) => { if (!e.target.closest('.popup')) { openGuestsPopup(); setActiveStep('mcGuestsField'); } });
  document.getElementById('dateField').addEventListener('click', (e) => { if (!e.target.closest('.popup') && wState.trip !== 'mc') { openCalendarPopup(); setActiveStep('dateField'); } });
  document.getElementById('swapBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    [wState.from, wState.to] = [wState.to, wState.from];
    [wState.fromCode, wState.toCode] = [wState.toCode, wState.fromCode];
    renderField('from'); renderField('to');
  });

  ['from', 'to'].forEach(which => {
    document.getElementById(which + 'Clear').addEventListener('click', (e) => {
      e.stopPropagation();
      wState[which] = ''; wState[which + 'Code'] = '';
      renderField(which);
    });
  });

  document.querySelectorAll('.pill-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.pill-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      wState.trip = tab.dataset.trip;
      if (wState.trip !== 'rt') { wState.ret = null; renderField('date'); }
      const mcMode = wState.trip === 'mc';
      document.getElementById('mainRow').style.display = mcMode ? 'none' : 'grid';
      document.getElementById('mcLegs').classList.toggle('show', mcMode);
      document.getElementById('mcAddRow').style.display = mcMode ? 'flex' : 'none';
      document.getElementById('mcGuestsRow').style.display = mcMode ? 'flex' : 'none';
      if (mcMode) renderAllMcLegs();
      updateSearchBtn(); closeAllPopups(); updateHeroTicket();
    });
  });

  document.getElementById('mcAddBtn').addEventListener('click', () => {
    if (wState.mcLegs.length >= MC_MAX) return;
    wState.mcLegs.push({ from: '', fromCode: '', to: '', toCode: '', date: null });
    renderAllMcLegs(); updateSearchBtn(); updateHeroTicket();
  });

  function handleSearchClick() {
    saveRecentSearch();
    updateHeroTicket();
    document.getElementById('htName').scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById('htName').focus();
  }
  document.querySelectorAll('.search-btn2').forEach(btn => btn.addEventListener('click', handleSearchClick));

  document.getElementById('htSubmit').addEventListener('click', submitTicketEnquiry);

  // Default From = Karachi, matches original site's default
  const defaultFrom = AIRPORTS.find(a => a.code === 'KHI');
  if (defaultFrom) { wState.from = defaultFrom.name; wState.fromCode = defaultFrom.code; }

  renderField('from');
  renderField('guests');
  updateMcAddState();
  renderRecentChip();
  renderHeroDestinations();
  updateHeroTicket();
});