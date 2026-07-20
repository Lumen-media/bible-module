import { BookOpen, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Book } from '../data/types.js';
import type { TFunction } from '../i18n.js';

interface QuickSearchProps {
  books: Book[];
  onSelect: (book: Book, chapter?: number) => void;
  t: TFunction;
}

export function QuickSearch({ books, onSelect, t }: QuickSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.target instanceof HTMLInputElement) return;
      if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
        setOpen(true);
        setQuery((prev) => prev + e.key);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
        setQuery('');
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  const match = query.match(/^(\D+)\s*(\d*)?/);
  const bookQuery = match?.[1]?.toLowerCase() ?? '';

  const filtered = books.filter(
    (b) =>
      bookQuery.length > 0 && (b.id.includes(bookQuery) || b.name.toLowerCase().includes(bookQuery))
  );

  function handleSelect(book: Book) {
    onSelect(book);
    setOpen(false);
    setQuery('');
  }

  return (
    <div className="absolute inset-x-0 top-0 z-50 border-b border-border bg-background shadow-lg">
      <div className="flex items-center gap-2 px-4 py-3">
        <Search className="h-5 w-5 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              setQuery('');
            }
          }}
          placeholder={`${t('bible.go-to')} (ex: gn 1)`}
          className="flex-1 border-0 bg-transparent text-lg text-foreground outline-none"
        />
      </div>
      {filtered.length > 0 && (
        <div className="max-h-48 overflow-y-auto border-t border-border">
          {filtered.slice(0, 10).map((book) => (
            <button
              key={book.id}
              onClick={() => handleSelect(book)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
            >
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{book.name}</span>
              <span className="text-xs text-muted-foreground">
                {book.chapters} {t('bible.chapter').toLowerCase()}s
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {book.testament === 'old' ? t('bible.old-testament') : t('bible.new-testament')}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
