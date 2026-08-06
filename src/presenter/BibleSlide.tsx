import { BookOpen } from 'lucide-react';
import { useRef } from 'react';
import { useFitFontSize } from '../hooks/useFitFontSize.js';
import { t, tForVersion } from '../i18n.js';
import { cn, displayVersion } from '../lib/utils.js';
import { staticVersionLanguage, useBibleStore } from '../store.js';

interface BibleSlideProps {
  data?: {
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
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    fontStyle: string;
    background: { type: string; src: string; name: string } | null;
    profileBackground: { type: string; src: string; name: string } | null;
    backgroundOpacity: number;
  } | null;
}

export function BibleSlide({ data }: BibleSlideProps) {
  const storeBg = useBibleStore((s) => s.background);
  const storeProfileBg = useBibleStore((s) => s.profileBackground);
  const storeFontSize = useBibleStore((s) => s.fontSize);
  const storeFontFamily = useBibleStore((s) => s.fontFamily);
  const storeBgOpacity = useBibleStore((s) => s.backgroundOpacity);

  const background = data?.background ?? storeBg;
  const profileBg = data?.profileBackground ?? storeProfileBg;
  const fontSize = data?.fontSize ?? storeFontSize;
  const fontFamily = data?.fontFamily ?? storeFontFamily;
  const backgroundOpacity = data?.backgroundOpacity ?? storeBgOpacity;

  const resolvedBg = background ?? profileBg;

  const containerRef = useRef<HTMLDivElement>(null);
  const { effectiveFontSize, effectiveRefSize } = useFitFontSize(
    containerRef,
    data?.text ?? '',
    fontSize
  );

  if (!data) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-black text-white/30">
        {resolvedBg && (
          <img
            src={resolvedBg.src}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black" style={{ opacity: backgroundOpacity / 100 }} />
        <BookOpen className="relative z-10 mb-4 h-12 w-12" />
        <p className="relative z-10 text-lg">{t('bible.select-verse-to-project')}</p>
      </div>
    );
  }

  const {
    book,
    bookName,
    chapter,
    version,
    verses,
    text,
    uppercase,
    showReferenceOnly,
    showVersion,
    abbreviatedBooks,
    fontColor,
  } = data;
  const label = abbreviatedBooks
    ? tForVersion(
        useBibleStore.getState().versionLanguage ?? staticVersionLanguage(version),
        'bookAbbr.' + book
      )
    : bookName;
  const showVersionLabel = showVersion && !showReferenceOnly;
  const verseStr =
    verses.length === 1 ? String(verses[0]) : `${verses[0]}-${verses[verses.length - 1]}`;

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full flex-col items-center justify-center bg-black px-16"
    >
      {resolvedBg && (
        <img src={resolvedBg.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-black" style={{ opacity: backgroundOpacity / 100 }} />
      {showReferenceOnly ? (
        <div className="relative z-10 flex items-center gap-6 scale-400">
          <div className="flex min-w-0 flex-col items-center leading-tight" style={{ fontFamily }}>
            <span
              className={cn('truncate text-4xl font-bold', { uppercase })}
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
            {verses[0]}
            {verses.length > 1 ? `-${verses[verses.length - 1]}` : ''}
          </span>
        </div>
      ) : (
        <>
          <div
            className={cn('relative z-10 mb-8 font-medium tracking-wide', { uppercase })}
            style={{
              fontSize: `${effectiveRefSize}px`,
              fontFamily,
              color: `${fontColor}99`,
            }}
          >
            {label} {chapter}:{verseStr}
            {showVersionLabel ? ` ${displayVersion(version)}` : ''}
          </div>
          <div
            className={cn('relative z-10 w-full text-center leading-snug', {
              uppercase: uppercase,
            })}
            style={{ fontSize: `${effectiveFontSize}px`, fontFamily, color: fontColor }}
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
