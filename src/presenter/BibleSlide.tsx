import { BookOpen } from 'lucide-react';
import { t } from '../i18n.js';

interface BibleSlideProps {
  data: {
    version: string;
    book: string;
    bookName: string;
    chapter: number;
    verses: number[];
    text: string;
  } | null;
}

export function BibleSlide({ data }: BibleSlideProps) {
  if (!data) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-black text-white/30">
        <BookOpen className="mb-4 h-12 w-12" />
        <p className="text-lg">{t('bible.select-verse-to-project')}</p>
      </div>
    );
  }

  const { bookName, chapter, version, text } = data;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-black px-16">
      <div className="mb-8 text-sm font-medium tracking-wide text-white/50">
        {bookName} {chapter} — {version.toUpperCase()}
      </div>
      <div className="max-w-4xl text-center text-3xl leading-relaxed text-white">
        {text.split('\n').map((line) => (
          <p key={line.slice(0, 40)} className="mb-4 last:mb-0">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
