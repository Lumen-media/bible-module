import { Fragment, memo } from 'react';
import { splitVerseNotes } from '../lib/verse-text.js';

interface VerseTextProps {
  text: string;
  className?: string;
  noteClassName?: string;
}

export const VerseText = memo(function VerseText({
  text,
  className,
  noteClassName = 'text-muted-foreground italic',
}: VerseTextProps) {
  const segments = splitVerseNotes(text);
  if (segments.length === 1 && segments[0].type === 'text') {
    return <span className={className}>{text}</span>;
  }
  return (
    <span className={className}>
      {segments.map((seg) =>
        seg.type === 'note' ? (
          <span key={`n-${seg.value}`} className={noteClassName}>
            {seg.value}
          </span>
        ) : (
          <Fragment key={`t-${seg.value}`}>{seg.value}</Fragment>
        )
      )}
    </span>
  );
});