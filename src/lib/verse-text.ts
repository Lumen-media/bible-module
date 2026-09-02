export interface VerseSegment {
  type: 'text' | 'note';
  value: string;
}

export function splitVerseNotes(text: string): VerseSegment[] {
  const segments: VerseSegment[] = [];
  const regex = /\{([^}]*)\}/g;
  let last = 0;
  for (const match of text.matchAll(regex)) {
    if (match.index > last) {
      segments.push({ type: 'text', value: text.slice(last, match.index) });
    }
    segments.push({ type: 'note', value: match[1] });
    last = (match.index ?? 0) + match[0].length;
  }
  if (last < text.length) {
    segments.push({ type: 'text', value: text.slice(last) });
  }
  if (segments.length === 0) {
    segments.push({ type: 'text', value: text });
  }
  return segments;
}