import { BookOpen } from 'lucide-react';
import { type TranslationKey, t } from '../i18n.js';
import { cn, displayVersion } from '../lib/utils.js';
import { useBibleStore } from '../store.js';

interface BibleSlideProps {
  data: {
    version: string;
    book: string;
    bookName: string;
    chapter: number;
    verses: number[];
    text: string;
    uppercase: boolean;
    showReferenceOnly: boolean;
    showVersion: boolean;
    abbreviatedBooks: boolean;
    fontColor: string;
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

  const { book, bookName, chapter, version, verses, text, uppercase, showReferenceOnly, showVersion, abbreviatedBooks, fontColor } = data;
  const label = abbreviatedBooks
    ? t(`bookAbbr.${book}` as TranslationKey)
    : bookName;
  const showVersionLabel = showVersion && !showReferenceOnly;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center bg-black px-16">
      {resolvedBg && (
        <img
          src={resolvedBg.src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
      )}
      {showReferenceOnly ? (
        <div className="relative z-10 flex items-center gap-6 scale-400">
          <div className="flex min-w-0 flex-col items-center leading-tight" style={{ fontFamily }}>
            <span
              className={cn(
                'truncate text-4xl font-bold',
                { uppercase }
              )}
              style={{ color: fontColor }}
            >
              {label} {chapter}
            </span>
            {showVersion && (
              <span className="truncate text-xl self-start" style={{ color: `${fontColor}99` }}>
                {displayVersion(version)}
              </span>
            )}
          </div>
          <div className="h-16 w-px shrink-0" style={{ backgroundColor: `${fontColor}40` }} />
          <span className="shrink-0 text-7xl font-bold" style={{ color: fontColor }}>
            {verses[0]}{verses.length > 1 ? `-${verses[verses.length - 1]}` : ''}
          </span>
        </div>
      ) : (
        <>
          <div
            className="relative z-10 mb-8 text-sm font-medium tracking-wide"
            style={{ fontFamily, color: `${fontColor}99` }}
          >
            {label} {chapter}{showVersionLabel ? ` — ${displayVersion(version)}` : ''}
          </div>
          <div
            className={cn(
              'relative z-10 max-w-4xl text-center leading-snug',
              { 'uppercase': uppercase }
            )}
            style={{ fontSize: `${fontSize}px`, fontFamily, color: fontColor }}
          >
            {text.split('\n').map((line) => (
              <p key={line.slice(0, 40)} className="mb-4 last:mb-0">
                {line}
              </p>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
