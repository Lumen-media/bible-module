import { Bookmark, StarOff } from 'lucide-react';
import { memo, useMemo } from 'react';
import { BOOKS } from '../data/store.js';
import type { TFunction } from '../i18n.js';
import { useBibleStore } from '../store.js';
import { type VerseCardItem, VersesList } from './VersesList.js';

interface BookmarkEntry {
  key: string;
  version: string;
  book: string;
  chapter: number;
  verse: number;
}

function parseBookmarkKey(key: string): BookmarkEntry | null {
  const parts = key.split('/');
  if (parts.length !== 3) return null;
  const [version, book, rest] = parts;
  const colonIndex = rest.lastIndexOf(':');
  if (colonIndex < 0) return null;
  const chapter = parseInt(rest.slice(0, colonIndex), 10);
  const verse = parseInt(rest.slice(colonIndex + 1), 10);
  if (Number.isNaN(chapter) || Number.isNaN(verse)) return null;
  return { key, version, book, chapter, verse };
}

export const FavoritesPanel = memo(function FavoritesPanel({ t }: { t: TFunction }) {
  const bookmarks = useBibleStore((s) => s.bookmarks);
  const bookmarkTexts = useBibleStore((s) => s.bookmarkTexts);
  const toggleBookmark = useBibleStore((s) => s.toggleBookmark);
  const goTo = useBibleStore((s) => s.goTo);
  const setVersion = useBibleStore((s) => s.setVersion);
  const setDisplayedTabs = useBibleStore((s) => s.setDisplayedTabs);
  const setTab = useBibleStore((s) => s.setTab);

  const bookById = useMemo(() => new Map(BOOKS.map((b) => [b.id, b])), []);

  const entries = useMemo(() => {
    const parsed: BookmarkEntry[] = [];
    for (const key of bookmarks) {
      const entry = parseBookmarkKey(key);
      if (entry) parsed.push(entry);
    }
    parsed.sort((a, b) => {
      if (a.version !== b.version) return a.version.localeCompare(b.version);
      if (a.book !== b.book) return a.book.localeCompare(b.book);
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });
    return parsed;
  }, [bookmarks]);

  const items: VerseCardItem[] = useMemo(
    () =>
      entries.map((e) => ({
        id: e.key,
        version: e.version,
        book: e.book,
        chapter: e.chapter,
        verse: e.verse,
        text: bookmarkTexts.get(e.key),
      })),
    [entries, bookmarkTexts]
  );

  function handleNavigate(index: number) {
    const entry = entries[index];
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
    goTo(book, entry.chapter, entry.verse);
  }

  if (entries.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
        <Bookmark className="h-10 w-10 opacity-20" />
        <span className="text-sm">{t('bible.no-favorites')}</span>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        <Bookmark className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          {entries.length} {t('bible.favorites').toLowerCase()}
        </span>
      </div>
      <VersesList
        items={items}
        t={t}
        onClick={handleNavigate}
        overscan={8}
        suffix={(idx) => {
          const e = entries[idx];
          return (
            <button
              type="button"
              onClick={(ev) => {
                ev.stopPropagation();
                toggleBookmark(e.version, e.book, e.chapter, e.verse);
              }}
              className="rounded p-0.5 text-muted-foreground/50 hover:text-destructive transition-colors"
              title={t('bible.unbookmark')}
            >
              <StarOff className="h-3.5 w-3.5" />
            </button>
          );
        }}
      />
    </div>
  );
});
