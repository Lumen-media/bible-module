import { Combobox } from '@lumen-media/module-sdk/ui';
import { parseReference } from '../data/ref.js';
import type { Book } from '../data/types.js';
import type { TFunction, TranslationKey } from '../i18n.js';

interface QuickSearchProps {
  books: Book[];
  onSelect: (book: Book, chapter?: number, verse?: number) => void;
  t: TFunction;
  inputValue: string;
  onInputValueChange: (value: string) => void;
}

export function QuickSearch({
  books,
  onSelect,
  t,
  inputValue,
  onInputValueChange,
}: QuickSearchProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      onInputValueChange('');
      return;
    }
    if (e.key === 'Enter') {
      const ref = inputValue.trim() ? parseReference(inputValue.trim(), books) : null;
      if (ref) {
        e.preventDefault();
        onSelect(ref.book, ref.chapter, ref.verse);
        onInputValueChange('');
      }
    }
  }

  const filtered = inputValue.trim()
    ? books
      .filter((b) => {
        const q = inputValue.trim().toLowerCase();
        return b.name.toLowerCase().includes(q) || b.id.toLowerCase().includes(q);
      })
      .slice(0, 10)
    : [];

  return (
    <div className="w-full max-w-64">
      <Combobox inputValue={inputValue} onInputValueChange={onInputValueChange}>
        <Combobox.ComboboxInput
          placeholder={t('bible.search-book')}
          onKeyDown={handleKeyDown}
          className="bg-background/80 text-xs"
          data-search-input="true"
        />
        {inputValue.trim() && (
          <Combobox.ComboboxContent>
            <Combobox.ComboboxList>
              {filtered.map((book) => (
                <Combobox.ComboboxItem
                  key={book.id}
                  value={t(`book.${book.id}` as TranslationKey)}
                  onSelect={() => {
                    onSelect(book);
                    onInputValueChange('');
                  }}
                >
                  <span className="text-xs">{t(`book.${book.id}` as TranslationKey)}</span>
                </Combobox.ComboboxItem>
              ))}
              {filtered.length === 0 && (
                <div className="py-3 text-center text-xs text-muted-foreground">
                  {t('bible.no-results')}
                </div>
              )}
            </Combobox.ComboboxList>
          </Combobox.ComboboxContent>
        )}
      </Combobox>
    </div>
  );
}
