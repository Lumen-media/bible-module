import type { PresentationHostAPI } from '@lumen-media/module-sdk';
import { Button, ScrollArea, Select } from '@lumen-media/module-sdk/ui';
import { ChevronLeft, ChevronRight, Loader2, Projector } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useBibleStore } from '../store.js';
import type { Book } from '../data/types.js';
import type { TFunction } from '../i18n.js';

interface ChapterReaderProps {
  version: string;
  book: Book;
  presentation: PresentationHostAPI;
  t: TFunction;
}

const VERSES_PER_PAGE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function ChapterReader({ version, book, presentation, t }: ChapterReaderProps) {
  const [activeVerse, setActiveVerse] = useState<number | null>(null);
  const [versesPerPage, setVersesPerPage] = useState<number>(5);
  const chapter = useBibleStore((s) => s.chapter);
  const setChapter = useBibleStore((s) => s.setChapter);
  const verses = useBibleStore((s) => s.verses);
  const versesLoading = useBibleStore((s) => s.versesLoading);
  const loadChapter = useBibleStore((s) => s.loadChapter);

  useEffect(() => {
    loadChapter(book.id, chapter);
    setActiveVerse(null);
  }, [loadChapter, book.id, chapter]);

  const projectVerse = useCallback((v: { number: number; text: string }) => {
    presentation.project('bible-slide', {
      version,
      book: book.id,
      bookName: book.name,
      chapter,
      verses: [v.number],
      text: `${v.number} ${v.text}`,
    });
    setActiveVerse(v.number);
  }, [presentation, version, book.id, book.name, chapter]);

  const handleVerseClick = useCallback((v: { number: number; text: string }) => {
    if (presentation.state() !== 'live') return;
    projectVerse(v);
  }, [presentation, projectVerse]);

  const handleVerseDoubleClick = useCallback((v: { number: number; text: string }) => {
    if (presentation.state() !== 'idle') return;
    projectVerse(v);
  }, [presentation, projectVerse]);

  function projectAll() {
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
          onClick={projectAll}
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
          <div className="space-y-0.5">
            {verses.map((v) => (
              <button
                key={v.number}
                type="button"
                onClick={() => handleVerseClick(v)}
                onDoubleClick={() => handleVerseDoubleClick(v)}
                className={`w-full rounded-md px-3 py-1.5 text-left text-sm leading-relaxed transition-colors ${
                  activeVerse === v.number
                    ? 'bg-accent text-accent-foreground'
                    : 'text-foreground hover:bg-accent/50'
                }`}
              >
                <span className="mr-1.5 text-xs text-muted-foreground">{v.number}</span>
                {v.text}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            {t('bible.no-results')}
          </div>
        )}
      </ScrollArea>

      <div className="flex items-center justify-between border-t border-border px-4 py-2">
        <span className="text-xs text-muted-foreground">{t('bible.verses-per-screen')}</span>
        <Select value={String(versesPerPage)} onValueChange={(v) => setVersesPerPage(Number(v))}>
          <Select.SelectTrigger className="h-7 w-16 text-xs">
            <Select.SelectValue />
          </Select.SelectTrigger>
          <Select.SelectContent>
            {VERSES_PER_PAGE_OPTIONS.map((n) => (
              <Select.SelectItem key={n} value={String(n)}>
                {n}
              </Select.SelectItem>
            ))}
          </Select.SelectContent>
        </Select>
      </div>
    </div>
  );
}
