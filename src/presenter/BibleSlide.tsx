import { BookOpen } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFitFontSize } from '../hooks/useFitFontSize.js';
import { useLocale } from '../hooks/useLocale.js';
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
    textAlign: 'left' | 'center' | 'justify';
    lineSpacing: number;
    referencePosition: 'inline' | 'top';
    verseNumberStyle: 'superscript' | 'inline' | 'hidden';
    background: { type: string; src: string; name: string } | null;
    profileBackground: { type: string; src: string; name: string } | null;
    backgroundOpacity: number;
  } | null;
}

export function BibleSlide({ data }: BibleSlideProps) {
  useLocale();
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
    fontSize,
    { referencePosition: data?.referencePosition }
  );

  const lastDataRef = useRef(data);
  if (data) lastDataRef.current = data;

  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!data) {
      setExiting(true);
      const t = setTimeout(() => setExiting(false), 300);
      return () => clearTimeout(t);
    }
    setExiting(false);
  }, [data]);

  const renderData = data ?? (exiting ? lastDataRef.current : null);

  const verseKey = useMemo(() => {
    if (!data) return 0;
    return `${data.book}:${data.chapter}:${data.verses.join(',')}`;
  }, [data]);

  if (!renderData) {
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
    textAlign,
    lineSpacing,
    referencePosition,
    verseNumberStyle,
  } = renderData;
  const label = abbreviatedBooks
    ? tForVersion(
        useBibleStore.getState().versionLanguage ?? staticVersionLanguage(version),
        `bookAbbr.${book}`
      )
    : bookName;
  const showVersionLabel = showVersion && !showReferenceOnly;
  const verseStr =
    verses.length === 1 ? String(verses[0]) : `${verses[0]}-${verses[verses.length - 1]}`;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex h-full w-full flex-col items-center bg-black px-16',
        referencePosition === 'top' && !showReferenceOnly ? 'justify-start' : 'justify-center'
      )}
    >
      {resolvedBg && (
        <img src={resolvedBg.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-black" style={{ opacity: backgroundOpacity / 100 }} />
      <div
        key={verseKey}
        className={cn(
          'flex flex-col items-center',
          referencePosition === 'top' && !showReferenceOnly ? 'h-full w-full' : '',
          exiting ? 'verse-exit' : 'verse-enter'
        )}
      >
        {showReferenceOnly ? (
          <div className="relative z-10 flex items-center gap-6 scale-400">
            <div
              className="flex min-w-0 flex-col items-center leading-tight"
              style={{ fontFamily }}
            >
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
              className={cn(
                'relative z-10 font-medium tracking-wide',
                { uppercase },
                referencePosition === 'top' ? 'shrink-0 w-full pt-8 pb-4 text-center' : 'mb-8'
              )}
              style={{
                fontSize: `${referencePosition === 'top' ? fontSize * 0.9 : effectiveRefSize}px`,
                fontFamily,
                color: referencePosition === 'top' ? fontColor : `${fontColor}99`,
              }}
            >
              {label} {chapter}:{verseStr}
              {showVersionLabel ? ` ${displayVersion(version)}` : ''}
            </div>
            <div
              className={cn(
                'relative z-10 w-full',
                { uppercase: uppercase },
                referencePosition === 'top' ? 'flex-1 flex items-center justify-center' : ''
              )}
              style={{
                fontSize: `${effectiveFontSize}px`,
                fontFamily,
                color: fontColor,
                textAlign,
                lineHeight: lineSpacing,
              }}
            >
              <div className="w-full">
                {text.split('\n').map((line) => {
                  const match = line.match(/^(\d+)\s/);
                  return (
                    <p key={line.slice(0, 40)} className="mb-4 last:mb-0">
                      {match && verseNumberStyle !== 'hidden' ? (
                        verseNumberStyle === 'superscript' ? (
                          <sup className="mr-0.5" style={{ fontSize: '0.55em' }}>
                            {match[1]}
                          </sup>
                        ) : (
                          <>{match[1]} </>
                        )
                      ) : null}
                      {match ? line.slice(match[0].length) : line}
                    </p>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
