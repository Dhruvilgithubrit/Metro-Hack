/**
 * reply.js — Draft reply generator using reply_templates.json
 * Substitutes {ref}, {station}, {helpline} placeholders.
 */

const HELPLINE = '155370';

/**
 * Generate a draft reply for a triaged complaint.
 * @param {object} complaint - triaged complaint record
 * @param {object} templates - parsed reply_templates.json
 * @returns {{ text: string, lang: string, source: 'template' }}
 */
export function generateReply(complaint, templates) {
  const { id, dept, lang, station } = complaint;
  const deptTemplates = templates[dept] || templates.other;
  const template = deptTemplates[lang] || deptTemplates['en'];

  const text = template
    .replace(/\{ref\}/g, id)
    .replace(/\{station\}/g, station || 'your station')
    .replace(/\{helpline\}/g, HELPLINE);

  return { text, lang, source: 'template' };
}
