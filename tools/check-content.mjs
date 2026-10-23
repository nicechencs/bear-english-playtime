#!/usr/bin/env node
/* Static content + asset checks for Bear's English Playtime.
 *
 * Usage: node tools/check-content.mjs
 * Exit code 0 = all required checks pass (warnings may still print).
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const require = createRequire(import.meta.url);

const errors = [];
const warnings = [];
const EXPECTED_AUDIO_KEYS = 62; // Unit 1 ships 62 clips; update when adding a unit.

require(resolve(root, 'data/audio.js'));
require(resolve(root, 'data/units/unit1.js'));
require(resolve(root, 'data/units/index.js'));
const content = require(resolve(root, 'js/content.js'));
const audio = globalThis.BEAR_AUDIO;

const iconsSource = readFileSync(resolve(root, 'js/icons.js'), 'utf8');
const iconsMatch = iconsSource.match(/(?:var|const) NAMES = Object\.freeze\(\[([\s\S]*?)\]\);/);
const iconNames = new Set(
  iconsMatch ? Array.from(iconsMatch[1].matchAll(/'([^']+)'/g), (m) => m[1]) : []
);
const bearSource = readFileSync(resolve(root, 'js/bear.js'), 'utf8');
const posesMatch = bearSource.match(/(?:var|const) POSES = Object\.freeze\(\[([\s\S]*?)\]\);/);
const facesMatch = bearSource.match(/(?:var|const) FACE_VARIANTS = Object\.freeze\(\[([\s\S]*?)\]\);/);
const toSet = (m) => new Set(m ? Array.from(m[1].matchAll(/'([^']+)'/g), (x) => x[1]) : []);
const poses = toSet(posesMatch);
const faces = toSet(facesMatch);

if (!audio || !Object.keys(audio).length) errors.push('data/audio.js did not define BEAR_AUDIO');
if (!iconNames.size) errors.push('could not read the icon name list from js/icons.js');
if (!poses.size) errors.push('could not read the pose list from js/bear.js');

function fileSize(path) {
  try { return statSync(path).size; } catch (err) { return -1; }
}

function durationOf(path) {
  const probe = spawnSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1', path
  ], { encoding: 'utf8' });
  if (probe.error) return null;
  const value = Number(String(probe.stdout).trim());
  return Number.isFinite(value) ? value : null;
}

/* ---- audio files ---------------------------------------------------- */
const audioKeys = audio ? Object.keys(audio) : [];
const audioFiles = new Set();
audioKeys.forEach((key) => {
  const rel = audio[key];
  const path = resolve(root, rel);
  audioFiles.add(rel);
  if (!existsSync(path)) {
    errors.push('audio ' + key + ': missing file ' + rel);
    return;
  }
  const size = fileSize(path);
  if (size < 500) errors.push('audio ' + key + ': file is suspiciously small (' + size + ' bytes)');
  const duration = durationOf(path);
  if (duration === null) warnings.push('audio ' + key + ': ffprobe unavailable, duration not checked');
  else if (duration <= 0.15) errors.push('audio ' + key + ': duration ' + duration + 's');
});
if (audioKeys.length !== EXPECTED_AUDIO_KEYS) warnings.push('expected ' + EXPECTED_AUDIO_KEYS + ' audio keys, found ' + audioKeys.length);

/* ---- units ---------------------------------------------------------- */
const units = content.listUnits();
if (!units.length) errors.push('no units registered');
const usedAudio = new Set(['lets', 'cheer', 'again']); // played directly by chapter/result/replay UI
const badgeIds = new Set();

units.forEach((unit) => {
  const unitErrors = content.validateUnit(unit, audio);
  unitErrors.forEach((e) => errors.push(unit.id + ': ' + e));

  if (!Array.isArray(unit.chapters) || !unit.chapters.length) errors.push(unit.id + ': no chapters');
  if (!unit.showtime || !unit.showtime.id) errors.push(unit.id + ': showtime missing');

  (unit.chapters || []).forEach((chapter) => {
    if (chapter.badge) {
      if (badgeIds.has(chapter.badge.id)) errors.push(unit.id + ': duplicate badge id ' + chapter.badge.id);
      badgeIds.add(chapter.badge.id);
      if (chapter.badge.icon && !iconNames.has(chapter.badge.icon)) {
        errors.push(unit.id + '/' + chapter.id + ': badge icon "' + chapter.badge.icon + '" not in js/icons.js');
      }
    }
    content.chapterAudioKeys(unit, chapter).forEach((key) => usedAudio.add(key));
  });

  const showtimeKeys = (unit.showtime ? unit.showtime.activities || [] : [])
    .flatMap((activity) => content.activityAudioKeys(unit, activity));
  showtimeKeys.forEach((key) => usedAudio.add(key));

  if (unit.playground) {
    (unit.playground.challenges || []).forEach((activity) => {
      content.activityAudioKeys(unit, activity).forEach((key) => usedAudio.add(key));
    });
    (unit.playground.actions || []).forEach((id) => {
      const item = unit.items[id];
      if (!item) return;
      if (item.audio && item.audio.word) usedAudio.add(item.audio.word);
      const sentence = content.itemAudioKey(item, 'sentence');
      if (sentence) usedAudio.add(sentence);
    });
    (unit.playground.feelings || []).forEach((id) => {
      const item = unit.items[id];
      if (!item) return;
      if (item.audio && item.audio.word) usedAudio.add(item.audio.word);
      const sentence = content.itemAudioKey(item, 'sentence');
      if (sentence) usedAudio.add(sentence);
    });
  }

  Object.keys(unit.items || {}).forEach((id) => {
    const item = unit.items[id];
    if (item.pose && poses.size && !poses.has(item.pose)) {
      errors.push('item ' + id + ': pose "' + item.pose + '" not in js/bear.js');
    }
    if (item.face && faces.size && !faces.has(item.face)) {
      errors.push('item ' + id + ': face "' + item.face + '" not in js/bear.js');
    }
    Object.values(item.audio || {}).forEach((key) => {
      if (key && audio && !audio[key]) errors.push('item ' + id + ': audio key "' + key + '" missing from map');
    });
  });
});

usedAudio.forEach((key) => {
  if (audio && !audio[key]) errors.push('used audio key "' + key + '" is missing from data/audio.js');
});
audioKeys.forEach((key) => {
  if (!usedAudio.has(key)) warnings.push('audio key "' + key + '" is mapped but not referenced by content/UI');
});

/* ---- shell files ---------------------------------------------------- */
const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.webmanifest'), 'utf8'));
(manifest.icons || []).forEach((icon) => {
  if (!existsSync(resolve(root, icon.src))) errors.push('manifest icon missing: ' + icon.src);
});
const indexHtml = readFileSync(resolve(root, 'index.html'), 'utf8');
Array.from(indexHtml.matchAll(/(?:src|href)="([^"]+)"/g), (m) => m[1])
  .filter((p) => !p.startsWith('#') && !p.startsWith('data:') && !/^https?:/.test(p))
  .forEach((p) => {
    if (!existsSync(resolve(root, p))) errors.push('index.html references missing file: ' + p);
  });

/* ---- report --------------------------------------------------------- */
if (warnings.length) {
  console.log('\nWarnings:');
  warnings.forEach((w) => console.log('  ! ' + w));
}
if (errors.length) {
  console.log('\nErrors:');
  errors.forEach((e) => console.log('  x ' + e));
  console.log('\nFAILED: ' + errors.length + ' error(s)');
  process.exit(1);
}
console.log('OK: ' + audioKeys.length + ' audio files, ' + units.length + ' unit(s), ' + badgeIds.size + ' badges');
console.log('Audio used by content/UI: ' + usedAudio.size + ' / ' + audioKeys.length);
