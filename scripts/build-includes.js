#!/usr/bin/env node
/**
 * build-includes.js
 * Project Shadman Platform
 *
 * Replaces content between <!-- INCLUDE:name --> ... <!-- /INCLUDE:name -->
 * markers in HTML files with the current contents of components/name.html.
 *
 * Run manually:   node scripts/build-includes.js
 * Run in CI:       triggered by .github/workflows/build-includes.yml
 *
 * Add a new include:
 *   1. Put the fragment in components/<name>.html
 *   2. Wrap the spot you want it injected with:
 *        <!-- INCLUDE:<name> -->
 *        ... old content here, gets replaced ...
 *        <!-- /INCLUDE:<name> -->
 *   3. Add the file path to TARGET_FILES below.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const COMPONENTS_DIR = path.join(ROOT, 'components');

// Every HTML file that may contain <!-- INCLUDE:... --> markers.
const TARGET_FILES = [
  'index.html',
];

const INCLUDE_PATTERN = /<!--\s*INCLUDE:(\w[\w-]*)\s*-->[\s\S]*?<!--\s*\/INCLUDE:\1\s*-->/g;

let totalReplacements = 0;
let filesChanged = 0;

for (const relPath of TARGET_FILES) {
  const fullPath = path.join(ROOT, relPath);

  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠ Skipping ${relPath} — file not found`);
    continue;
  }

  const original = fs.readFileSync(fullPath, 'utf8');
  let fileReplacements = 0;

  const updated = original.replace(INCLUDE_PATTERN, (match, name) => {
    const componentPath = path.join(COMPONENTS_DIR, `${name}.html`);

    if (!fs.existsSync(componentPath)) {
      console.error(`✗ ${relPath}: component "${name}.html" not found in /components — leaving marker untouched`);
      return match; // leave as-is rather than deleting content
    }

    const componentContent = fs.readFileSync(componentPath, 'utf8').replace(/\s+$/, '');
    fileReplacements++;
    return `<!-- INCLUDE:${name} -->\n${componentContent}\n<!-- /INCLUDE:${name} -->`;
  });

  if (fileReplacements > 0) {
    if (updated !== original) {
      fs.writeFileSync(fullPath, updated, 'utf8');
      console.log(`✓ ${relPath}: ${fileReplacements} include(s) updated`);
      filesChanged++;
    } else {
      console.log(`= ${relPath}: ${fileReplacements} include(s) found, already up to date`);
    }
    totalReplacements += fileReplacements;
  }
}

console.log(`\nDone. ${totalReplacements} include marker(s) processed, ${filesChanged} file(s) changed.`);

if (totalReplacements === 0) {
  console.warn('No INCLUDE markers found. Did you add <!-- INCLUDE:name --> ... <!-- /INCLUDE:name --> to index.html?');
}