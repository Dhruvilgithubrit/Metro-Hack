import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { triage } from '../src/triage/triage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const complaintsPath = path.join(__dirname, '../public/data/complaints.json');
const lexiconPath = path.join(__dirname, '../public/data/lexicon.json');

const complaints = JSON.parse(fs.readFileSync(complaintsPath, 'utf8'));
const lexicon = JSON.parse(fs.readFileSync(lexiconPath, 'utf8'));

let langCorrect = 0;
let deptCorrect = 0;
let bandCorrect = 0;
let total = complaints.length;

let mismatches = [];

for (const complaint of complaints) {
  const result = triage(complaint, lexicon);
  const exp = complaint.expected;

  let matchLang = result.lang === exp.lang;
  let matchDept = result.dept === exp.dept;
  let matchBand = result.band === exp.band;

  if (matchLang) langCorrect++;
  if (matchDept) deptCorrect++;
  if (matchBand) bandCorrect++;

  if (!matchLang || !matchDept || !matchBand) {
    mismatches.push({
      id: complaint.id,
      text: complaint.text,
      expected: exp,
      actual: { lang: result.lang, dept: result.dept, band: result.band, urgency: result.urgency },
      errors: [
        !matchLang && `lang (exp: ${exp.lang}, got: ${result.lang})`,
        !matchDept && `dept (exp: ${exp.dept}, got: ${result.dept})`,
        !matchBand && `band (exp: ${exp.band}, got: ${result.band}, urgency: ${result.urgency})`
      ].filter(Boolean)
    });
  }
}

console.log(`=== Triage Accuracy ===`);
console.log(`Lang: ${Math.round((langCorrect / total) * 100)}% (${langCorrect}/${total})`);
console.log(`Dept: ${Math.round((deptCorrect / total) * 100)}% (${deptCorrect}/${total})`);
console.log(`Band: ${Math.round((bandCorrect / total) * 100)}% (${bandCorrect}/${total})`);

if (mismatches.length > 0) {
  console.log(`\n=== Mismatches (${mismatches.length}) ===`);
  mismatches.forEach(m => {
    console.log(`[${m.id}] ${m.errors.join(' | ')}`);
    console.log(`  Text: ${m.text}`);
  });
} else {
  console.log(`\n✅ All tests passed perfectly!`);
}
