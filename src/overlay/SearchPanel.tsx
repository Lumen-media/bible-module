import { Button, Input, ScrollArea } from '@lumen-media/module-sdk/ui';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Loader2, Search } from 'lucide-react';
import { useRef, useState } from 'react';
import { parseReference } from '../data/ref.js';
import { BOOKS } from '../data/store.js';
import type { TFunction } from '../i18n.js';
import { useBibleStore } from '../store.js';

interface SearchPanelProps {
  t: TFunction;
}

export function SearchPanel({ t }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    { version: string; book: string; chapter: number; verse: number; text: string }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const search = useBibleStore((s) => s.search);
  const goTo = useBibleStore((s) => s.goTo);
  const setVersion = useBibleStore((s) => s.setVersion);
  const setTab = useBibleStore((s) => s.setTab);
  const inputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const bookByName = new Map(BOOKS.map((b) => [b.name.toLowerCase(), b]));

  const GAP = 6;
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => 80,
    overscan: 10,
    measureElement: (el) => el.getBoundingClientRect().height + GAP,
  });

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
    const book = bookByName.get(r.book.toLowerCase());
    if (!book) return;
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
          virtualizer.scrollToIndex(next, { align: 'auto' });
          return next;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = prev > 0 ? prev - 1 : results.length - 1;
          virtualizer.scrollToIndex(next, { align: 'auto' });
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

      <ScrollArea className="min-h-0 flex-1 px-3" viewportProps={{ ref: viewportRef }}>
        {results.length > 0 ? (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const r = results[virtualItem.index];
              return (
                <button
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(virtualItem.index);
                  }}
                  onMouseEnter={() => setFocusedIndex(virtualItem.index)}
                  className={`absolute left-0 top-0 w-full rounded-md border px-3 py-2 mb-1.5 text-left text-sm transition-colors outline-none focus:outline-none focus-visible:outline-none ${
                    virtualItem.index === focusedIndex
                      ? 'border-primary bg-accent text-accent-foreground'
                      : 'border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                  style={{
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <span className="font-medium">
                    {r.book} {r.chapter}:{r.verse}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {r.version.toUpperCase()}
                  </span>
                  <p className="mt-0.5 line-clamp-2 text-muted-foreground">{r.text}</p>
                </button>
              );
            })}
          </div>
        ) : (
          !loading && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              {t('bible.no-results')}
            </div>
          )
        )}
      </ScrollArea>
    </div>
  );
}
