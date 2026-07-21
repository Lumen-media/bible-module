import type { PresentationHostAPI } from '@lumen-media/module-sdk';
import { Button, ScrollArea } from '@lumen-media/module-sdk/ui';
import { ChevronLeft, ChevronRight, Loader2, Projector } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useBibleStore } from '../store.js';
import type { Book } from '../data/types.js';
import type { TFunction } from '../i18n.js';

interface ChapterReaderProps {
  version: string;
  book: Book;
  presentation: PresentationHostAPI;
  t: TFunction;
}

export function ChapterReader({ version, book, presentation, t }: ChapterReaderProps) {
  const [chapter, setChapter] = useState<number>(1);
  const verses = useBibleStore((s) => s.verses);
  const versesLoading = useBibleStore((s) => s.versesLoading);
  const loadChapter = useBibleStore((s) => s.loadChapter);

  useEffect(() => {
    loadChapter(book.id, chapter);
  }, [loadChapter, book.id, chapter]);

  function project() {
    if (!verses || verses.length === 0) return;
    presentation.project('bible-slide', {
      version,
      book: book.id,
      bookName: book.name,
      chapter,
      verses: verses.map((v) => v.number),
      text: verses.map((v) => `${v.number} ${v.text}`).join('\n'),
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h2 className="text-lg font-semibold text-foreground">
          {book.name} {chapter}
        </h2>
        <Button
          size="sm"
          onClick={project}
          disabled={!verses || verses.length === 0 || versesLoading}
        >
          <Projector className="mr-1 h-4 w-4" />
          {t('bible.project')}
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 border-b border-border px-4 py-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setChapter(Math.max(1, chapter - 1))}
          disabled={chapter <= 1}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {chapter - 1}
        </Button>
        <span className="min-w-20 text-center text-sm text-muted-foreground">
          {t('bible.chapter')} {chapter}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setChapter(Math.min(book.chapters, chapter + 1))}
          disabled={chapter >= book.chapters}
        >
          {chapter + 1}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        {versesLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('bible.search')}...
          </div>
        ) : verses && verses.length > 0 ? (
          <div className="space-y-2">
            {verses.map((v) => (
              <p key={v.number} className="text-sm leading-relaxed text-foreground">
                <span className="mr-1 text-xs text-muted-foreground">{v.number}</span>
                {v.text}
              </p>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            {t('bible.no-results')}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
