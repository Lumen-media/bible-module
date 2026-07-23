import type { Book } from '../data/types.js';
import { type TranslationKey, t as translate } from '../i18n.js';
import { cn } from '../lib/utils.js';
import { useBibleStore } from '../store.js';

interface BookGridProps {
  books: Book[];
  onSelect: (book: Book) => void;
}

function getAbbreviation(book: Book): string {
  const key = `bookAbbr.${book.id}` as TranslationKey;
  const translated = translate(key);
  return translated !== key ? translated : book.id.slice(0, 3);
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-center gap-4">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function BookTile({
  book,
  selected,
  onSelect,
}: {
  book: Book;
  selected: boolean;
  onSelect: (book: Book) => void;
}) {
  const abbr = getAbbreviation(book);
  return (
    <button
      type="button"
      onClick={() => onSelect(book)}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 rounded-lg border px-3 py-3 transition-colors',
        selected
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-card-foreground hover:border-primary/40 hover:bg-accent/40'
      )}
    >
      <span className="text-base font-bold tracking-tight">{abbr}</span>
      <span
        className={cn(
          'line-clamp-1 text-[11px] leading-tight',
          selected ? 'text-primary-foreground/80' : 'text-muted-foreground'
        )}
      >
        {translate(`book.${book.id}` as TranslationKey)}
      </span>
    </button>
  );
}

function renderSection(
  title: string,
  items: Book[],
  selectedBook: Book | null,
  onSelect: (book: Book) => void
) {
  return (
    <div>
      <SectionHeader title={title} />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-2">
        {items.map((book) => (
          <BookTile
            key={book.id}
            book={book}
            selected={selectedBook?.id === book.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

export function BookGrid({ books, onSelect }: BookGridProps) {
  const selectedBook = useBibleStore((s) => s.selectedBook);
  const oldBooks = books.filter((b) => b.testament === 'old');
  const newBooks = books.filter((b) => b.testament === 'new');

  return (
    <div className="space-y-8">
      {renderSection(translate('bible.old-testament'), oldBooks, selectedBook, onSelect)}
      {renderSection(translate('bible.new-testament'), newBooks, selectedBook, onSelect)}
    </div>
  );
}
