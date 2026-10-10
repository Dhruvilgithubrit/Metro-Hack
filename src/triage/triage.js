/**
 * triage.js — Orchestrator: run full pipeline on a batch of raw complaints
 * Loads lexicon and templates (passed in as args, fetched by caller).
 */

import { detectLanguage } from './detect.js';
import { classifyDept, scoreUrgency } from './classify.js';
import { generateReply } from './reply.js';
import { assignClusters } from './cluster.js';

/**
 * Run full triage on a batch of raw complaint objects.
 * @param {object[]} rawComplaints - from complaints.json (id, channel, station, minutesAgo, text)
 * @param {object} lexicon - parsed lexicon.json
 * @param {object} templates - parsed reply_templates.json
 * @returns {object[]} - fully triaged complaint records
 */
export function triageBatch(rawComplaints, lexicon, templates) {
  const triaged = rawComplaints.map(raw => {
    const lang = detectLanguage(raw.text);
    const { dept, secondary, deptScores } = classifyDept(raw.text, lexicon);
    const { urgency, band, why } = scoreUrgency(
      raw.text, raw.channel, raw.minutesAgo, dept, lexicon
    );

    const record = {
      id: raw.id,
      channel: raw.channel,
      station: raw.station,
      minutesAgo: raw.minutesAgo,
      ts: Date.now() - raw.minutesAgo * 60 * 1000,
      text: raw.text,
      lang,
      dept,
      secondary,
      urgency,
      band,
      why,
      clusterId: null,
      status: 'new',
      reply: null,
      synced: false,
    };

    record.reply = generateReply(record, templates);
    return record;
  });

  // Sort by urgency descending before clustering
  triaged.sort((a, b) => b.urgency - a.urgency);

  return assignClusters(triaged);
}
