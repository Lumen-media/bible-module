import { Input } from '@lumen-media/module-sdk/ui';
import { BookOpen, Search } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { parseReference } from '../data/ref.js';
import type { Book } from '../data/types.js';
import type { TFunction } from '../i18n.js';

interface QuickSearchProps {
  books: Book[];
  onSelect: (book: Book, chapter?: number, verse?: number) => void;
  t: TFunction;
}

export function QuickSearch({ books, onSelect, t }: QuickSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey) return;
      if (e.key === 'Escape' && open) {
        close();
        return;
      }
      if (e.key.length === 1 && /[a-zA-Z0-9\u00C0-\u00FF]/.test(e.key) && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        setOpen(true);
        setQuery((prev) => prev + e.key);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  const q = query.toLowerCase();
  const filtered = books.filter((b) => {
    if (!q) return false;
    const name = b.name.toLowerCase();
    const id = b.id.toLowerCase();
    return name.includes(q) || id.includes(q) || name.startsWith(q);
  });

  const ref = q ? parseReference(query, books) : null;

  function handleSelect(book: Book) {
    onSelect(book);
    close();
  }

  function handleEnter() {
    if (ref) {
      onSelect(ref.book, ref.chapter, ref.verse);
      close();
    }
  }

  if (!open) return null;

  return (
    <div className="absolute inset-x-0 top-0 z-50 border-b border-border bg-background shadow-lg">
      <div className="flex items-center gap-2 px-4 py-3">
        <Search className="h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              close();
            } else if (e.key === 'Enter') {
              handleEnter();
            }
          }}
          placeholder={`${t('bible.go-to')} (ex: Mateus 1)`}
          className="flex-1 border-0 text-lg"
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
