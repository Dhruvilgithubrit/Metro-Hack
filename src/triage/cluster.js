export function clusterComplaints(complaints) {
  const clusters = {};

  const getLiftAsset = (c) => {
    if (c.asset) return c.asset.toLowerCase();
    const match = (c.text || '').match(/lift\s*(\d+)/i);
    if (match) return `lift-${match[1]}`;
    return '';
  };

  complaints.forEach(c => {
    let key;
    if (c.dept === 'lifts') {
      const asset = getLiftAsset(c);
      key = `lifts_${c.station || 'unknown'}_${asset}`;
    } else {
      key = `${c.dept}_${c.station || 'unknown'}`;
    }
    
    if (!clusters[key]) clusters[key] = [];
    clusters[key].push(c);
  });
  
  const result = [];
  
  for (const [key, group] of Object.entries(clusters)) {
    group.sort((a,b) => a.ts - b.ts);
    
    let currentClusterId = 0;
    let currentSubGroup = [];
    
    const finishSubGroup = () => {
      if (currentSubGroup.length === 0) return;
      const cId = `${key}_${currentClusterId}`;
      const extra = currentSubGroup.length - 1;
      const boost = currentSubGroup.length >= 3 ? Math.min(15, extra * 3) : 0;
      
      currentSubGroup.forEach(c => {
        const out = { ...c, clusterId: cId, clusterSize: currentSubGroup.length };
        if (boost > 0 && !out.why?.find(w => w.id === 'cluster')) {
          out.urgency = Math.min(100, out.urgency + boost);
          out.why = [...(out.why || []), { id: 'cluster', desc: `Cluster of ${currentSubGroup.length} complaints`, points: boost }];
          if (out.urgency >= 80) out.band = 'critical';
          else if (out.urgency >= 60) out.band = 'high';
          else if (out.urgency >= 35) out.band = 'medium';
          else out.band = 'low';
        }
        result.push(out);
      });
    };
    
    for (let i = 0; i < group.length; i++) {
      const c = group[i];
      if (currentSubGroup.length === 0) {
        currentSubGroup.push(c);
      } else {
        if (c.ts - currentSubGroup[currentSubGroup.length - 1].ts <= 72 * 3600 * 1000) {
          currentSubGroup.push(c);
        } else {
          finishSubGroup();
          currentClusterId++;
          currentSubGroup = [c];
        }
      }
    }
    finishSubGroup();
  }
  
  return result;
}
