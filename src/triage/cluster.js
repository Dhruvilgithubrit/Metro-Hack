/**
 * cluster.js — Simple text similarity clustering
 * Groups complaints from same station + dept within 60 min window.
 */

/**
 * Assign cluster IDs to an array of triaged complaints.
 * Two complaints cluster if: same dept AND same station AND |minutesAgo diff| < 60.
 * @param {object[]} complaints - triaged complaint records
 * @returns {object[]} - complaints with clusterId set
 */
export function assignClusters(complaints) {
  const clusters = [];

  for (const c of complaints) {
    // Find an existing cluster this complaint fits into
    const match = clusters.find(cl =>
      cl.dept === c.dept &&
      cl.station === c.station &&
      Math.abs(cl.anchorMinutes - c.minutesAgo) < 60
    );
    if (match) {
      c.clusterId = match.id;
    } else {
      const newId = `CL${String(clusters.length + 1).padStart(3, '0')}`;
      clusters.push({
        id: newId,
        dept: c.dept,
        station: c.station,
        anchorMinutes: c.minutesAgo,
      });
      c.clusterId = newId;
    }
  }
  return complaints;
}
