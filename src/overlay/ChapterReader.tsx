import type { FsAPI, PresentationHostAPI } from '@lumen-media/module-sdk';
import { ChevronLeft, ChevronRight, Loader2, Projector } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getChapter } from '../data/store.js';
import type { Book, Chapter } from '../data/types.js';
import type { TFunction } from '../i18n.js';

interface ChapterReaderProps {
  fs: FsAPI;
  version: string;
  book: Book;
  presentation: PresentationHostAPI;
  t: TFunction;
}

export function ChapterReader({ fs, version, book, presentation, t }: ChapterReaderProps) {
  const [chapter, setChapter] = useState<number>(1);
  const [data, setData] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const result = await getChapter(fs, version, book.id, chapter);
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [fs, version, book.id, chapter]);

  function project() {
    if (!data) return;
    const verses = data.verses.filter(Boolean);
    presentation.project('bible-slide', {
      version,
      book: book.id,
      bookName: book.name,
      chapter,
      verses: verses.map((v) => v!.number),
      text: verses.map((v) => `${v!.number} ${v!.text}`).join('\n'),
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <h2 className="text-lg font-semibold text-foreground">
          {book.name} {chapter}
        </h2>
        <button
          onClick={project}
          disabled={!data || loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Projector className="h-4 w-4" />
          {t('bible.project')}
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 border-b border-border px-4 py-2">
        <button
          onClick={() => setChapter(Math.max(1, chapter - 1))}
          disabled={chapter <= 1}
          className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-1 text-sm text-foreground transition-colors hover:bg-accent disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
          {chapter - 1}
        </button>
        <span className="min-w-20 text-center text-sm text-muted-foreground">
          {t('bible.chapter')} {chapter}
        </span>
        <button
          onClick={() => setChapter(Math.min(book.chapters, chapter + 1))}
          disabled={chapter >= book.chapters}
          className="inline-flex items-center gap-1 rounded-md border border-input px-2 py-1 text-sm text-foreground transition-colors hover:bg-accent disabled:opacity-30"
        >
          {chapter + 1}
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('bible.search')}...
          </div>
        ) : data ? (
          <div className="space-y-2">
            {data.verses.filter(Boolean).map((v) => (
              <p key={v!.number} className="text-sm leading-relaxed text-foreground">
                <span className="mr-1 text-xs text-muted-foreground">{v!.number}</span>
                {v!.text}
              </p>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            {t('bible.no-results')}
          </div>
        )}
      </div>
    </div>
  );
}
