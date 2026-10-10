/**
 * classify.js — Department classification and urgency scoring
 * No UI imports. Driven entirely by lexicon.json data.
 */

/**
 * Match a term against text per spec:
 * - Latin terms: word-boundary at start (not inside other words)
 * - Gujarati/Devanagari: substring match
 * @param {string} term
 * @param {string} lowerText
 * @returns {boolean}
 */
function matchTerm(term, lowerText) {
  const firstChar = term.charCodeAt(0);
  const isScript = (firstChar >= 0x0900 && firstChar <= 0x097F) || // Devanagari
                   (firstChar >= 0x0A80 && firstChar <= 0x0AFF);   // Gujarati
  if (isScript) {
    return lowerText.includes(term.toLowerCase());
  }
  // Latin: word-start boundary (not inside another word)
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?<![\\w\\u0900-\\u097F\\u0A80-\\u0AFF])${escaped}`, 'i');
  return re.test(lowerText);
}

/**
 * Score text against one department's term lists.
 * @param {string} lower - lowercased complaint text
 * @param {{strong: string[], normal: string[], baseUrgency: number}} deptData
 * @returns {{ score: number, hits: string[] }}
 */
function scoreDept(lower, deptData) {
  let score = deptData.baseUrgency;
  const hits = [];

  for (const term of deptData.strong) {
    if (matchTerm(term, lower)) {
      score += 3;
      hits.push(term);
    }
  }
  for (const term of deptData.normal) {
    if (matchTerm(term, lower)) {
      score += 1;
      hits.push(term);
    }
  }
  return { score, hits };
}

/**
 * Classify a complaint text into a primary department and secondaries.
 * @param {string} text
 * @param {object} lexicon - parsed lexicon.json
 * @returns {{ dept: string, secondary: string[], deptScores: Record<string, number> }}
 */
export function classifyDept(text, lexicon) {
  const lower = text.toLowerCase();
  const scores = {};
  const allHits = {};

  for (const [dept, data] of Object.entries(lexicon.departments)) {
    if (dept === 'other') continue;
    const { score, hits } = scoreDept(lower, data);
    scores[dept] = score;
    allHits[dept] = hits;
  }

  // Sort by score desc, then by priority tie-break
  const ranked = Object.entries(scores).sort(([a, sa], [b, sb]) => {
    if (sb !== sa) return sb - sa;
    return lexicon.priorityTieBreak.indexOf(a) - lexicon.priorityTieBreak.indexOf(b);
  });

  const topDept = ranked[0][0];
  const topScore = ranked[0][1];

  // Secondary: any dept with score >= 60% of winner's excess over base, if it has hits
  const secondary = ranked
    .slice(1)
    .filter(([d, s]) => s > lexicon.departments[d].baseUrgency && allHits[d].length > 0)
    .map(([d]) => d);

  return {
    dept: topScore > lexicon.departments[topDept].baseUrgency ? topDept : 'other',
    secondary: secondary.slice(0, 2),
    deptScores: scores,
  };
}

/**
 * Compute urgency score (0–100) with signals applied on top of dept score.
 * @param {string} text
 * @param {string} channel - one of app|x|email|paper|coach_qr
 * @param {number} minutesAgo
 * @param {string} dept
 * @param {object} lexicon
 * @returns {{ urgency: number, band: 'critical'|'high'|'medium'|'low', why: string[] }}
 */
export function scoreUrgency(text, channel, minutesAgo, dept, lexicon) {
  const deptData = lexicon.departments[dept] || lexicon.departments.other;
  const lower = text.toLowerCase();

  // Base: re-use dept score but capped
  const { score: deptScore } = scoreDept(lower, deptData);
  let urgency = Math.min(deptScore, 60); // dept can contribute up to 60
  const why = [];

  // Apply signals
  for (const sig of lexicon.urgencySignals) {
    let triggered = false;
    switch (sig.id) {
      case 'all_caps': {
        const letters = text.replace(/[^a-zA-Z]/g, '');
        if (letters.length > 10 && letters === letters.toUpperCase()) triggered = true;
        break;
      }
      case 'multiple_exclamation':
        if ((text.match(/!/g) || []).length >= 2) triggered = true;
        break;
      case 'public_social':
        if (channel === 'x') triggered = true;
        break;
      case 'old_complaint':
        if (minutesAgo > 120) triggered = true;
        break;
      case 'repeat_words': {
        const words = lower.match(/\b\w{4,}\b/g) || [];
        const freq = {};
        words.forEach(w => (freq[w] = (freq[w] || 0) + 1));
        if (Object.values(freq).some(c => c >= 3)) triggered = true;
        break;
      }
      case 'child_elderly': {
        const markers = ['child', 'baby', 'elderly', 'senior', 'बच्चा', 'बुज़ुर्ग', 'બાળક', 'વૃદ્ધ', 'disabled', 'wheelchair', 'apang', 'apangu'];
        if (markers.some(m => lower.includes(m.toLowerCase()))) triggered = true;
        break;
      }
    }
    if (triggered) {
      urgency += sig.points;
      why.push(sig.desc);
    }
  }

  urgency = Math.min(100, Math.round(urgency));

  const band =
    urgency >= lexicon.bands.critical ? 'critical' :
    urgency >= lexicon.bands.high     ? 'high' :
    urgency >= lexicon.bands.medium   ? 'medium' : 'low';

  return { urgency, band, why };
}
