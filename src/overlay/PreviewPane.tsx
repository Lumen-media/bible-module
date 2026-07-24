import { Palette } from 'lucide-react';
import { t } from '../i18n.js';
import { useBibleStore } from '../store.js';

export function PreviewPane() {
  const projectedData = useBibleStore((s) => s.projectedData);
  const version = useBibleStore((s) => s.version);
  const background = useBibleStore((s) => s.background);
  const profileBg = useBibleStore((s) => s.profileBackground);
  const selectedBook = useBibleStore((s) => s.selectedBook);
  const chapter = useBibleStore((s) => s.chapter);
  const selectedVerse = useBibleStore((s) => s.selectedVerse);
  const pickBackground = useBibleStore((s) => s.pickBackground);

  const resolvedBg = background ?? profileBg;
  const data = projectedData;
  const hasData = !!data;

  const bookLabel = hasData
    ? `${data.bookName} ${data.chapter}`
    : selectedBook
      ? `${selectedBook.name} ${chapter}`
      : '—';
  const versionLabel = hasData ? data.version.toUpperCase() : version.toUpperCase();
  const verseNumber: number | null = hasData
    ? (data.verses?.[0] ?? null)
    : selectedVerse;

  return (
    <button
      type="button"
      onClick={pickBackground}
      title={t('bible.background' as never)}
      className="group relative flex aspect-video w-28 shrink-0 items-center overflow-hidden rounded-md border border-border bg-black text-left transition-colors hover:border-primary/50"
    >
      {resolvedBg ? (
        <img
          src={resolvedBg.src}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0.5 }}
        />
      ) : (
        <div className="absolute inset-0 bg-linear-to-br from-card to-background" />
      )}

      <div className="relative z-10 flex h-full w-full items-center gap-1 px-2.5">
        <div className="flex min-w-0 flex-1 flex-col items-start leading-tight">
          <span className="truncate text-[11px] text-white/80">
            {bookLabel}
          </span>
          <span className="truncate text-[10px] text-white/50">
            {versionLabel}
          </span>
        </div>
        <div className="h-7 w-px shrink-0 bg-white/20" />
        <span className="shrink-0 text-lg font-semibold text-white/90">
          {verseNumber ?? '1'}
        </span>
      </div>

      <Palette className="absolute right-1.5 top-1.5 h-2.5 w-2.5 text-white/30 opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}
