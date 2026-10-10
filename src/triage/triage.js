import { detectLang } from './detect.js';
import { classify, calcUrgency } from './classify.js';

export function triage(complaint, lexicon) {
  const lang = detectLang(complaint.text, lexicon);
  const { dept, secondary } = classify(complaint.text, lexicon);
  const { urgency, band, why } = calcUrgency(complaint.text, complaint.channel, dept, complaint.minutesAgo, lexicon);
  
  return {
    ...complaint,
    lang,
    dept,
    secondary,
    urgency,
    band,
    why
  };
}
