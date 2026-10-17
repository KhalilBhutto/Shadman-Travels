/* js/umrah-home.js
 * Fills the homepage "Umrah & Hajj Packages" cards from data/umrah-packages.json,
 * so the nights, prices and airlines always match the real packages.
 * One card per duration (e.g. 19 Nights, 20 Nights), showing the cheapest sharing price.
 */
(function () {
  var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function parseDate(str) {                     // "04 Nov 2026" -> Date
    var m = String(str || '').match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})$/);
    var i = m ? MON.findIndex(function (x) { return x.toLowerCase() === m[2].toLowerCase(); }) : -1;
    return m && i > -1 ? new Date(Number(m[3]), i, Number(m[1])) : new Date(NaN);
  }
  function upcoming(p) {
    var d = parseDate(p.outbound && p.outbound.date);
    var t = new Date(); t.setHours(0, 0, 0, 0);
    return isNaN(d) || d >= t;
  }
  function money(n) { return Number(n).toLocaleString('en-US'); }
  function joinNames(a) { return a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' & ' + a[a.length - 1]; }

  // Pure function (easy to test): list of packages -> HTML for the cards
  function buildCards(list) {
    var groups = {};
    list.forEach(function (p) {
      var n = Number(p.nights);
      if (!n || !p.pricing || !(Number(p.pricing.sharing) > 0)) return;
      (groups[n] = groups[n] || []).push(p);
    });
    var keys = Object.keys(groups).map(Number).sort(function (a, b) { return a - b; });
    if (keys.length > 3) keys = keys.slice(0, 3);          // the section has room for three cards
    var middle = keys.length === 3 ? 1 : -1;

    return keys.map(function (n, i) {
      var g = groups[n];
      var cheapest = g.reduce(function (a, b) { return Number(b.pricing.sharing) < Number(a.pricing.sharing) ? b : a; });
      var airlines = Array.from(new Set(g.map(function (p) { return p.airline; }))).sort();
      var first = g.map(function (p) { return parseDate(p.outbound.date); }).filter(function (d) { return !isNaN(d); })
                   .sort(function (a, b) { return a - b; })[0];
      var from = first ? first.getDate() + ' ' + MON[first.getMonth()] + ' ' + first.getFullYear() : '';
      var mk = cheapest.makkahHotel.nights, md = cheapest.madinahHotel.nights;
      return '' +
        '<div class="umrah-card' + (i === middle ? ' umrah-featured' : '') + '">' +
          '<div class="umrah-tier">' + (from ? 'Departures from ' + esc(from) : 'Group Package') + '</div>' +
          '<h3 class="umrah-name">' + n + ' Nights</h3>' +
          '<div class="umrah-meta">' + (mk && md ? esc(mk) + ' Makkah + ' + esc(md) + ' Madinah' : 'Makkah + Madinah') + '</div>' +
          '<div class="umrah-divider"></div>' +
          '<div class="umrah-hotel">' + esc(joinNames(airlines)) + ' · Karachi – Jeddah – Karachi</div>' +
          '<ul class="umrah-features">' +
            '<li>Return flights with ' + esc(joinNames(airlines)) + '</li>' +
            '<li>Umrah visa processing</li>' +
            '<li>Hotel stay in Makkah &amp; Madinah</li>' +
            '<li>Complimentary Ziyarat (Taif, Makkah, Madinah)</li>' +
            '<li>' + g.length + ' departure' + (g.length === 1 ? '' : 's') + ' available</li>' +
          '</ul>' +
          '<div class="umrah-price-row">' +
            '<div class="umrah-price">PKR <span>' + money(cheapest.pricing.sharing) + '</span></div>' +
            '<div class="umrah-price-label">Starting From · Per Person (Sharing)</div>' +
          '</div>' +
          '<button class="notify-btn umrah-enquire" data-service="Umrah Package — ' + n + ' Nights (from PKR ' + money(cheapest.pricing.sharing) + ')">Enquire Now</button>' +
        '</div>';
    }).join('');
  }

  if (typeof module !== 'undefined') module.exports = { buildCards: buildCards };   // for testing only
  if (typeof document === 'undefined') return;

  document.addEventListener('DOMContentLoaded', function () {
    var grid = document.getElementById('umrahHomeGrid');
    if (!grid) return;
    fetch('/data/umrah-packages.json')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var list = data.filter(upcoming);
        var html = buildCards(list);
        if (!html) throw new Error('no packages');
        grid.innerHTML = html;
        var pill = document.getElementById('umrahPillCount');
        if (pill) pill.textContent = '🕋 ' + list.length + ' Live Packages';
        var ap = document.getElementById('umrahPillAirlines');
        if (ap) {
          var n = new Set(list.map(function (p) { return p.airline; })).size;
          ap.textContent = '✈ ' + n + ' Airline Partner' + (n === 1 ? '' : 's');
        }
        var all = document.getElementById('umrahAllCount');
        if (all) all.textContent = 'all ' + list.length + ' packages';
      })
      .catch(function () {
        grid.innerHTML = '<p class="umrah-loading" style="grid-column:1/-1;text-align:center;color:#f5f2ea">New Umrah packages are being finalised. ' +
          '<a href="https://wa.me/923000041510" target="_blank" rel="noopener">WhatsApp us</a> for current dates and rates.</p>';
      });
  });
})();