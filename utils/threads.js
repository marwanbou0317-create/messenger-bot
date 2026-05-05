const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'known_threads.json');

let known = new Set();

function load() {
  try {
    if (fs.existsSync(FILE)) {
      const arr = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
      known = new Set(arr.map(String));
    }
  } catch (_) {}
}

function save() {
  try {
    fs.writeFileSync(FILE, JSON.stringify([...known]));
  } catch (_) {}
}

function isKnown(threadID) {
  return known.has(String(threadID));
}

function markKnown(threadID) {
  known.add(String(threadID));
  save();
}

load();

module.exports = { isKnown, markKnown };
