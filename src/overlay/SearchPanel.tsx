import { Button, Input } from '@lumen-media/module-sdk/ui';
import { Loader2, Search } from 'lucide-react';
import { memo, useRef, useState } from 'react';
import { parseReference } from '../data/ref.js';
import { BOOKS } from '../data/store.js';
import type { TFunction } from '../i18n.js';
import { useBibleStore } from '../store.js';
import { VersesList, type VersesListHandle } from './VersesList.js';

interface SearchPanelProps {
  t: TFunction;
}

export const SearchPanel = memo(function SearchPanel({ t }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    { version: string; book: string; chapter: number; verse: number; text: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const search = useBibleStore((s) => s.search);
  const goTo = useBibleStore((s) => s.goTo);
  const setVersion = useBibleStore((s) => s.setVersion);
  const setDisplayedTabs = useBibleStore((s) => s.setDisplayedTabs);
  const setTab = useBibleStore((s) => s.setTab);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<VersesListHandle>(null);

  const bookById = new Map(BOOKS.map((b) => [b.id, b]));

  async function handleSearch() {
    if (!query.trim()) return;

    const ref = parseReference(query, BOOKS);
    if (ref) {
      setTab('browse');
      goTo(ref.book, ref.chapter, ref.verse);
      return;
    }

    setLoading(true);
    setFocusedIndex(-1);
    const r = await search(query);
    setResults(r);
    setLoading(false);
  }

  function handleSelect(index: number) {
    const r = results[index];
    if (!r) return;
    const book = bookById.get(r.book);
    if (!book) return;

    const tabs = useBibleStore.getState().displayedTabs;
    if (!tabs.includes(r.version) && tabs.length > 0) {
      const next = [...tabs];
      next[next.length - 1] = r.version;
      setDisplayedTabs(next);
    }

    setVersion(r.version);
    goTo(book, r.chapter, r.verse);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    e.stopPropagation();
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev < results.length - 1 ? prev + 1 : 0;
          listRef.current?.scrollToIndex(next, { align: 'auto' });
          return next;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : results.length - 1;
          listRef.current?.scrollToIndex(next, { align: 'auto' });
          return next;
        });
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0) {
          handleSelect(focusedIndex);
        } else {
          handleSearch();
        }
        break;
    }
  }

  const verseItems = results.map((r) => ({
    id: `${r.version}/${r.book}/${r.chapter}:${r.verse}`,
    version: r.version,
    book: r.book,
    chapter: r.chapter,
    verse: r.verse,
    text: r.text,
  }));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex gap-2 px-3 pb-3">
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setFocusedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder={t('bible.search-placeholder')}
          className="flex-1"
          autoComplete="off"
        />
        <Button
          onClick={handleSearch}
          disabled={loading}
          className="outline-none focus:outline-none focus-visible:outline-none"
        >
          {loading ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-1 h-4 w-4" />
          )}
          {t('bible.search')}
        </Button>
      </div>

      {results.length > 0 ? (
        <VersesList
          ref={listRef}
          items={verseItems}
          t={t}
          focusedIndex={focusedIndex}
          onFocusIndex={setFocusedIndex}
          onClick={handleSelect}
        />
      ) : (
        !loading && (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            {t('bible.no-results')}
          </div>
        )
      )}
    </div>
  );
});
