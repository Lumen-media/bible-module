import { memo } from 'react';
import { t, tForVersion } from '../i18n.js';
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
  const previewText = verseText ?? SAMPLE_VERSE;

  return (
    <div className="relative aspect-video overflow-hidden rounded-md border border-border bg-black">
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
        <div className="relative z-10 flex h-full flex-col items-center justify-center p-6">
          <div
            className={cn('mb-3 font-medium tracking-wide', { uppercase })}
            style={{
              fontFamily,
              fontSize: `${Math.max(14, Math.round(previewSize * 0.4))}px`,
              color: `${fontColor}99`,
            }}
          >
            {bookName} {chapter}:{verseNum}
            {showVersion ? ` ${displayVersion(version)}` : ''}
          </div>
          <p
            className={cn(
              'text-center leading-[1.4]',
              { uppercase: uppercase },
              { 'font-light': fontWeight === 'Light' },
              { 'font-normal': fontWeight === 'Regular' },
              { 'font-medium': fontWeight === 'Medium' },
              { 'font-bold': fontWeight === 'Bold' },
              { italic: fontStyle === 'Italic' }
            )}
            style={{
              fontFamily,
              fontSize: `${previewSize}px`,
              color: fontColor,
            }}
          >
            {previewText}
          </p>
        </div>
      )}
    </div>
  );
});
