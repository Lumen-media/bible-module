import { Button } from '@lumen-media/module-sdk/ui';
import { History, Trash2 } from 'lucide-react';
import { memo, useMemo } from 'react';
import { BOOKS } from '../data/store.js';
import type { TFunction } from '../i18n.js';
import { useBibleStore } from '../store.js';
import { type VerseCardItem, VersesList } from './VersesList.js';

function formatTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(ts).toLocaleDateString();
}

export const HistoryPanel = memo(function HistoryPanel({ t }: { t: TFunction }) {
  const history = useBibleStore((s) => s.history);
  const clearHistory = useBibleStore((s) => s.clearHistory);
  const goTo = useBibleStore((s) => s.goTo);
  const setVersion = useBibleStore((s) => s.setVersion);
  const setDisplayedTabs = useBibleStore((s) => s.setDisplayedTabs);
  const setTab = useBibleStore((s) => s.setTab);

  const bookById = useMemo(() => new Map(BOOKS.map((b) => [b.id, b])), []);

  const items: VerseCardItem[] = useMemo(
    () =>
      history.map((h) => ({
        id: h.id,
        version: h.version,
        book: h.book,
        chapter: h.chapter,
        verse: h.verses[0] ?? 1,
        verseEnd: h.verses[h.verses.length - 1],
        text: h.text,
      })),
    [history]
  );

  function handleNavigate(index: number) {
    const entry = history[index];
    if (!entry) return;
    const book = bookById.get(entry.book);
    if (!book) return;

    const tabs = useBibleStore.getState().displayedTabs;
    if (!tabs.includes(entry.version)) {
      const next = tabs.length >= 3 ? [...tabs.slice(1), entry.version] : [...tabs, entry.version];
      setDisplayedTabs(next);
    }

    setVersion(entry.version);
    setTab('browse');
    goTo(book, entry.chapter, entry.verses[0] ?? 1);
  }

  if (history.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <History className="h-10 w-10 opacity-20" />
        <span className="text-sm">{t('bible.no-history')}</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        <History className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {history.length} {t('bible.history').toLowerCase()}
        </span>
        <Button
          size="icon-sm"
          variant="ghost"
          type="button"
          onClick={clearHistory}
          className="ml-auto rounded p-1 text-muted-foreground/60 transition-colors hover:text-destructive"
          title={t('bible.clear-history')}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <VersesList
        items={items}
        t={t}
        onClick={handleNavigate}
        overscan={8}
        suffix={(idx) => (
          <span className="shrink-0 text-[10px] text-muted-foreground/70">
            {formatTime(history[idx].timestamp)}
          </span>
        )}
      />
    </div>
  );
});
