#!/usr/bin/env node
/* Re-extract the MP3s embedded in the original single-file prototype.
 *
 * The source file is treated as data only: this script reads the base64
 * strings with a regular expression and never executes the HTML/JS.
 *
 * Usage:
 *   node tools/extract-audio.mjs
 *   node tools/extract-audio.mjs --source "archive/original-unit1.html"
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '..');

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index !== -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const source = resolve(projectRoot, argValue(
  '--source',
  'archive/original-unit1.html'
));
const outDir = resolve(projectRoot, argValue('--out', 'assets/audio/unit1'));

const html = readFileSync(source, 'utf8');
const mapStart = html.search(/const\s+AU\s*=\s*\{/);
if (mapStart === -1) {
  console.error('Could not find "const AU = {" in', source);
  process.exit(1);
}
const open = html.indexOf('{', mapStart);
const close = html.indexOf('};', open);
if (close === -1) {
  console.error('Could not find the end of the audio map.');
  process.exit(1);
}
const body = html.slice(open + 1, close);
const pair = /"([A-Za-z0-9_]+)"\s*:\s*"([A-Za-z0-9+/=\s]+)"/g;
const entries = [];
let match;
while ((match = pair.exec(body))) {
  const key = match[1];
  const base64 = match[2].replace(/\s+/g, '');
  if (!base64 || base64.length < 100) continue;
  entries.push({ key, base64 });
}

if (!entries.length) {
  console.error('No audio entries found.');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
entries.forEach(({ key, base64 }) => {
  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length) throw new Error('Empty audio for ' + key);
  const target = resolve(outDir, key + '.mp3');
  writeFileSync(target, bytes);
});

console.log('Extracted ' + entries.length + ' audio files to ' + outDir);
console.log(entries.map((e) => e.key).sort().join(', '));
