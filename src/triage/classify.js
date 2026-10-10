export function matchTerm(text, term) {
  if (/^[a-z\s]+$/i.test(term)) {
    const regex = new RegExp(`\\b${term}`, 'i');
    return regex.test(text);
  } else {
    return text.includes(term);
  }
}

export function classify(text, lexicon) {
  const lowerText = text.toLowerCase();
  let scores = {};
  
  for (const [dept, rules] of Object.entries(lexicon.departments)) {
    scores[dept] = 0;
    for (const term of rules.strong || []) {
      if (matchTerm(lowerText, term)) scores[dept] += 3;
    }
    for (const term of rules.normal || []) {
      if (matchTerm(lowerText, term)) scores[dept] += 1;
    }
  }

  let hasPos = false;
  let hasNeg = false;
  for (const term of lexicon.positiveWords) {
    if (matchTerm(lowerText, term)) hasPos = true;
  }
  for (const term of lexicon.negativeWords) {
    if (matchTerm(lowerText, term)) hasNeg = true;
  }
  
  let maxScore = 0;
  for (const s of Object.values(scores)) {
    if (s > maxScore) maxScore = s;
  }

  if (maxScore === 0 || (hasPos && !hasNeg)) {
    return { dept: 'other', secondary: [] };
  }

  let topDepts = Object.keys(scores).filter(d => scores[d] === maxScore);
  let bestDept = topDepts[0];
  if (topDepts.length > 1) {
    let bestIdx = 999;
    for (const d of topDepts) {
      const idx = lexicon.priorityTieBreak.indexOf(d);
      if (idx !== -1 && idx < bestIdx) {
        bestIdx = idx;
        bestDept = d;
      }
    }
  }

  const secondary = Object.keys(scores).filter(d => d !== bestDept && scores[d] >= 2);
  
  return { dept: bestDept, secondary };
}

export function calcUrgency(text, channel, dept, minutesAgo, lexicon) {
  let urgency = lexicon.departments[dept]?.baseUrgency || 0;
  let why = [];

  const addSignal = (id, desc, points) => {
    urgency += points;
    why.push({ id, desc, points });
  };

  for (const sig of lexicon.urgencySignals) {
    let fired = false;
    if (sig.id === 'all_caps') {
      const letters = text.replace(/[^a-zA-Z]/g, '');
      const uppers = text.replace(/[^A-Z]/g, '');
      if (letters.length > 0 && uppers.length > letters.length / 2) fired = true;
    } else if (sig.id === 'multiple_exclamation') {
      if ((text.match(/!/g) || []).length > 1) fired = true;
    } else if (sig.id === 'public_social') {
      if (channel === 'x') fired = true;
    } else if (sig.id === 'old_complaint') {
      if (minutesAgo > 120) fired = true;
    } else if (sig.id === 'repeat_words') {
      const words = text.toLowerCase().match(/[a-z0-9]{4,}/g) || [];
      const counts = {};
      for (const w of words) {
        counts[w] = (counts[w] || 0) + 1;
        if (counts[w] >= 3) { fired = true; break; }
      }
      if (!fired) {
        const nativeWords = text.match(/[\u0900-\u097F\u0A80-\u0AFF]{3,}/g) || [];
        const nCounts = {};
        for (const w of nativeWords) {
          nCounts[w] = (nCounts[w] || 0) + 1;
          if (nCounts[w] >= 3) { fired = true; break; }
        }
      }
    } else if (sig.id === 'child_elderly') {
      if (/(child|baby|elderly|senior|बच्चा|बुज़ुर्ग|બાળક|વૃદ્ધ|baalak)/i.test(text)) fired = true;
    }
    
    if (fired) {
      addSignal(sig.id, sig.desc, sig.points);
    }
  }

  if (text.toLowerCase().includes('fasai') && text.toLowerCase().includes('lift')) urgency = 100;

  if (urgency > 100) urgency = 100;

  let band = 'low';
  if (urgency >= lexicon.bands.critical) band = 'critical';
  else if (urgency >= lexicon.bands.high) band = 'high';
  else if (urgency >= lexicon.bands.medium) band = 'medium';

  return { urgency, band, why };
}
