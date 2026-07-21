import { Input } from '@lumen-media/module-sdk/ui';
import { BookOpen, Search, X } from 'lucide-react';
import { useRef, useState } from 'react';
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

  function close() {
    setOpen(false);
    setQuery('');
  }

  function openSearch() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

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

  return (
    <div className="border-b border-border bg-background">
      <div className="flex items-center gap-2 px-4 py-1.5">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') {
              close();
            } else if (e.key === 'Enter') {
              handleEnter();
            }
          }}
          placeholder={`${t('bible.go-to')} (ex: Mateus 1)`}
          className="h-7 flex-1 border-0 text-sm"
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground outline-none focus:outline-none focus-visible:outline-none"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="max-h-48 overflow-y-auto border-t border-border">
          {filtered.slice(0, 10).map((book) => (
            <button
              key={book.id}
              onClick={(e) => { e.stopPropagation(); handleSelect(book); }}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent outline-none focus:outline-none focus-visible:outline-none"
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
