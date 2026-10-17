#!/usr/bin/env node
/* scripts/build-hotel-gallery.js
 * Looks inside  images/hotels/<HOTEL NAME>/  and writes  data/hotel-gallery.json
 * (a static site cannot list a folder by itself, so this makes the list).
 * Safe to run on your own PC:   node scripts/build-hotel-gallery.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'images', 'hotels');
const OUT = path.join(ROOT, 'data', 'hotel-gallery.json');
const EXT = /\.(jpe?g|png|webp)$/i;

// Must match keyOf() in js/hotel-gallery.js
const keyOf = (n) => String(n).toUpperCase().replace(/\bOR\s+SIMILAR\b/g, '').replace(/[^A-Z0-9]/g, '');
const urlPath = (...parts) => '/' + parts.map((p) => p.split('/').map(encodeURIComponent).join('/')).join('/');

const hotels = [];
const warnings = [];

if (fs.existsSync(DIR)) {
  const seen = {};
  for (const folder of fs.readdirSync(DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
    const files = fs.readdirSync(path.join(DIR, folder)).filter((f) => EXT.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    if (!files.length) { warnings.push('Empty folder skipped: ' + folder); continue; }
    const key = keyOf(folder);
    if (seen[key]) { warnings.push('"' + folder + '" has the same name as "' + seen[key] + '" – skipped'); continue; }
    seen[key] = folder;
    for (const f of files) {
      const kb = fs.statSync(path.join(DIR, folder, f)).size / 1024;
      if (kb > 1500) warnings.push('Large photo (' + Math.round(kb) + ' KB, slows the page): ' + folder + '/' + f);
    }
    const images = files.map((f) => urlPath('images', 'hotels', folder, f));
    hotels.push({ name: folder, key, cover: images[0], images });
  }
} else {
  warnings.push('Folder images/hotels does not exist yet.');
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ hotels }, null, 2) + '\n');
console.log('Hotels with photos: ' + hotels.length + ', photos: ' + hotels.reduce((n, h) => n + h.images.length, 0));
warnings.forEach((w) => console.log('WARNING: ' + w));