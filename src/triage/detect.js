/**
 * detect.js — Language detection for en / hi / gu / gujlish
 * No UI imports. Pure deterministic logic.
 */

// Unicode ranges
const GU_RANGE = /[\u0A80-\u0AFF]/;
const HI_RANGE = /[\u0900-\u097F]/;
// Gujlish markers (romanized Gujarati)
const GUJLISH_MARKERS = [
  'che', 'chhe', 'nathi', 'hatu', 'avu', 'karo', 'kari', 'kyu',
  ' thi ', ' ma ', ' nu ', ' ni ', ' no ', ' ane ', 'dhyan',
  'taklif', 'vaas', 'varas', 'tamari', 'amari', 'aave', 'bahu',
  'kyare', 'naikre', 'fire', 'platform par', 'khaali'
];

/**
 * @param {string} text
 * @returns {'en'|'hi'|'gu'|'gujlish'}
 */
export function detectLanguage(text) {
  if (!text) return 'en';

  const guCount = (text.match(new RegExp(`[\\u0A80-\\u0AFF]`, 'g')) || []).length;
  const hiCount = (text.match(new RegExp(`[\\u0900-\\u097F]`, 'g')) || []).length;

  if (guCount > 5) return 'gu';
  if (hiCount > 5) return 'hi';

  const lower = text.toLowerCase();
  // Check gujlish markers
  const gujlishHits = GUJLISH_MARKERS.filter(m => lower.includes(m)).length;
  if (gujlishHits >= 2) return 'gujlish';

  // Hindi common words in latin (fallback): nahi, mujhe, karo
  const hindiRoman = ['nahi', 'mujhe', 'katuoti', 'kijiye', 'mera', 'mere'];
  if (hindiRoman.some(w => lower.includes(w))) return 'hi';

  return 'en';
}
