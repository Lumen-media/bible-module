import { memo, useRef } from 'react';
import { useFitFontSize } from '../hooks/useFitFontSize.js';
import { tForVersion } from '../i18n.js';
import { cn, displayVersion } from '../lib/utils.js';
import { staticVersionLanguage, useBibleStore } from '../store.js';

const SAMPLE_VERSE =
  'For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.';

export const SlidePreview = memo(function SlidePreview() {
  const fontSize = useBibleStore((s) => s.fontSize);
  const fontFamily = useBibleStore((s) => s.fontFamily);
  const fontWeight = useBibleStore((s) => s.fontWeight);
  const fontStyle = useBibleStore((s) => s.fontStyle);
  const uppercase = useBibleStore((s) => s.uppercase);
  const showReferenceOnly = useBibleStore((s) => s.showReferenceOnly);
  const showVersion = useBibleStore((s) => s.showVersion);
  const abbreviatedBooks = useBibleStore((s) => s.abbreviatedBooks);
  const fontColor = useBibleStore((s) => s.fontColor);
  const backgroundOpacity = useBibleStore((s) => s.backgroundOpacity);
  const textAlign = useBibleStore((s) => s.textAlign);
  const lineSpacing = useBibleStore((s) => s.lineSpacing);
  const referencePosition = useBibleStore((s) => s.referencePosition);
  const verseNumberStyle = useBibleStore((s) => s.verseNumberStyle);
  const selectedBook = useBibleStore((s) => s.selectedBook);
  const chapter = useBibleStore((s) => s.chapter);
  const selectedVerse = useBibleStore((s) => s.selectedVerse);
  const verses = useBibleStore((s) => s.verses);
  const background = useBibleStore((s) => s.background);
  const profileBackground = useBibleStore((s) => s.profileBackground);
  const version = useBibleStore((s) => s.version);

  const previewSize = Math.max(14, Math.min(48, Math.round(fontSize * 0.6)));
  const resolvedBg = background ?? profileBackground;

  const versionLang = useBibleStore.getState().versionLanguage ?? staticVersionLanguage(version);

  const bookName = selectedBook
    ? abbreviatedBooks
      ? tForVersion(versionLang, `bookAbbr.${selectedBook.id}`)
      : tForVersion(versionLang, `book.${selectedBook.id}`)
    : 'John';
  const verseNum = selectedVerse ?? 16;
  const verseText = verses?.find((v) => v.number === verseNum)?.text;
  const previewText = verseText ? `${verseNum} ${verseText}` : `${verseNum} ${SAMPLE_VERSE}`;

  const containerRef = useRef<HTMLDivElement>(null);
  const { effectiveFontSize, effectiveRefSize } = useFitFontSize(
    containerRef,
    previewText,
    previewSize,
    { paddingX: 48, heightFraction: 0.85, referencePosition }
  );

  return (
    <div
      ref={containerRef}
      className="relative aspect-video overflow-hidden rounded-md border border-border bg-black"
    >
      {resolvedBg ? (
        <img src={resolvedBg.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-linear-to-br from-card to-background" />
      )}
      <div className="absolute inset-0 bg-black" style={{ opacity: backgroundOpacity / 100 }} />
      {showReferenceOnly ? (
        <div className="relative z-10 flex h-full items-center justify-center gap-6 scale-150">
          <div className="flex min-w-0 flex-col items-center leading-tight" style={{ fontFamily }}>
            <span
              className={cn('truncate text-4xl font-bold', { uppercase })}
              style={{ color: fontColor }}
            >
              {bookName} {chapter}
            </span>
            {showVersion && (
              <span className="truncate text-xl self-start" style={{ color: `${fontColor}99` }}>
                {displayVersion(version)}
              </span>
            )}
          </div>
          <div className="h-16 w-px shrink-0" style={{ backgroundColor: `${fontColor}40` }} />
          <span className="shrink-0 text-7xl font-bold" style={{ color: fontColor }}>
            {verseNum}
          </span>
        </div>
      ) : (
        <div
          className={cn(
            'relative z-10 flex h-full flex-col items-center p-6',
            referencePosition === 'top' ? 'justify-start' : 'justify-center'
          )}
        >
          <div
            className={cn(
              'font-medium tracking-wide',
              { uppercase },
              referencePosition === 'top' ? 'shrink-0 w-full text-center pt-2 pb-2' : 'mb-3'
            )}
            style={{
              fontFamily,
              fontSize: `${referencePosition === 'top' ? previewSize * 0.9 : effectiveRefSize}px`,
              color: referencePosition === 'top' ? fontColor : `${fontColor}99`,
            }}
          >
            {bookName} {chapter}:{verseNum}
            {showVersion ? ` ${displayVersion(version)}` : ''}
          </div>
          <p
            className={cn(
              { uppercase: uppercase },
              { 'font-light': fontWeight === 'Light' },
              { 'font-normal': fontWeight === 'Regular' },
              { 'font-medium': fontWeight === 'Medium' },
              { 'font-bold': fontWeight === 'Bold' },
              { italic: fontStyle === 'Italic' },
              referencePosition === 'top' ? 'flex-1 flex items-center justify-center' : ''
            )}
            style={{
              fontFamily,
              fontSize: `${effectiveFontSize}px`,
              color: fontColor,
              textAlign,
              lineHeight: lineSpacing,
            }}
          >
            {(() => {
              const match = previewText.match(/^(\d+)\s/);
              return (
                <>
                  {match && verseNumberStyle !== 'hidden' ? (
                    verseNumberStyle === 'superscript' ? (
                      <sup className="mr-0.5" style={{ fontSize: '0.55em' }}>
                        {match[1]}
                      </sup>
                    ) : (
                      <>{match[1]} </>
                    )
                  ) : null}
                  {match ? previewText.slice(match[0].length) : previewText}
                </>
              );
            })()}
          </p>
        </div>
      )}
    </div>
  );
});
