/**
 * nearest-airport.js
 * Shadman Travels & Tours — Project Shadman Platform
 *
 * Finds the airport nearest to the visitor, using the browser's location feature.
 * The coordinates stay in the browser: nothing is sent or stored.
 * Used by js/search-widget.js. Needs AIRPORTS from js/airports.js.
 */

'use strict';

(function () {

  const MAX_KM = 150;   // farther than this from every airport below: no suggestion

  // Approximate airport coordinates [latitude, longitude]. An airport is only used
  // if its code also exists in AIRPORTS (js/airports.js). Add more airports here if you like.
  const COORDS = {
    KHI: [24.9065, 67.1608],   // Karachi
    LHE: [31.5216, 74.4036],   // Lahore
    ISB: [33.5605, 72.8495],   // Islamabad
    PEW: [33.9939, 71.5146],   // Peshawar
    MUX: [30.2032, 71.4191],   // Multan
    SKT: [32.5356, 74.3636],   // Sialkot
    UET: [30.2514, 66.9378],   // Quetta
    LYP: [31.3650, 72.9948],   // Faisalabad
    GWD: [25.2333, 62.3294],   // Gwadar
    SKZ: [27.7220, 68.7917],   // Sukkur
  };

  function distanceKm(lat1, lng1, lat2, lng2) {
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLng = (lng2 - lng1) * rad;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function nearestTo(lat, lng) {
    let best = null;
    let bestKm = Infinity;
    Object.keys(COORDS).forEach(function (code) {
      const airport = AIRPORTS.find(function (a) { return a.code === code; });
      if (!airport) return;
      const km = distanceKm(lat, lng, COORDS[code][0], COORDS[code][1]);
      if (km < bestKm) { bestKm = km; best = airport; }
    });
    return bestKm <= MAX_KM ? best : null;
  }

  // Resolves to an airport object, or null when no listed airport is within MAX_KM.
  // Rejects if the visitor refuses or the location cannot be found.
  window.ShadmanGeo = {
    nearestAirport: function () {
      return new Promise(function (resolve, reject) {
        if (!navigator.geolocation) { reject(new Error('unsupported')); return; }
        navigator.geolocation.getCurrentPosition(
          function (pos) { resolve(nearestTo(pos.coords.latitude, pos.coords.longitude)); },
          reject,
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
        );
      });
    }
  };

})();