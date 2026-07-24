import { BookOpen } from 'lucide-react';
import { t } from '../i18n.js';
import { useBibleStore } from '../store.js';

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
  const background = useBibleStore((s) => s.background);
  const profileBg = useBibleStore((s) => s.profileBackground);
  const fontSize = useBibleStore((s) => s.fontSize);
  const fontFamily = useBibleStore((s) => s.fontFamily);

  const resolvedBg = background ?? profileBg;

  if (!data) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-black text-white/30">
        {resolvedBg && (
          <img
            src={resolvedBg.src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        )}
        <BookOpen className="mb-4 h-12 w-12" />
        <p className="text-lg">{t('bible.select-verse-to-project')}</p>
      </div>
    );
  }

  const { bookName, chapter, version, text } = data;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-black px-16">
      {resolvedBg && (
        <img
          src={resolvedBg.src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
      )}
      <div
        className="relative z-10 mb-8 text-sm font-medium tracking-wide text-white/50"
        style={{ fontFamily }}
      >
        {bookName} {chapter} — {version.toUpperCase()}
      </div>
      <div
        className="relative z-10 max-w-4xl text-center leading-snug text-white"
        style={{ fontSize: `${fontSize}px`, fontFamily }}
      >
        {text.split('\n').map((line) => (
          <p key={line.slice(0, 40)} className="mb-4 last:mb-0">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
