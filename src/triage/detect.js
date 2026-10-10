
export function detectLang(text, lexicon) {
  let guj = 0;
  let dev = 0;
  let lat = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0x0A80 && code <= 0x0AFF) guj++;
    else if (code >= 0x0900 && code <= 0x097F) dev++;
    else if ((code >= 0x0041 && code <= 0x005A) || (code >= 0x0061 && code <= 0x007A)) lat++;
  }
  const total = guj + dev + lat;
  if (total === 0) return 'en';

  if (guj / total > 0.3) return 'gu';
  if (dev / total > 0.3) return 'hi';

  const lowerText = text.toLowerCase();
  const tokens = lowerText.split(/\W+/);
  
  for (const marker of lexicon.gujlishMarkers) {
    if (marker.includes(' ')) {
      if (lowerText.includes(marker)) return 'gujlish';
    } else {
      if (tokens.includes(marker)) return 'gujlish';
    }
  }

  return 'en';
}
