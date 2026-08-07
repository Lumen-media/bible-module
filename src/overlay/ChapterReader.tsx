import type { PresentationHostAPI } from '@lumen-media/module-sdk';
import { Button, ScrollArea, Select } from '@lumen-media/module-sdk/ui';
import { Loader2, Projector } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { Book } from '../data/types.js';
import { type TFunction, tForVersion } from '../i18n.js';
import { staticVersionLanguage, useBibleStore } from '../store.js';

interface ChapterReaderProps {
  version: string;
  book: Book;
  presentation: PresentationHostAPI;
  t: TFunction;
  projecting: boolean;
  onProject: () => void;
  onClear: () => void;
}

const VERSES_PER_PAGE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const ChapterReader = memo(function ChapterReader({
  version,
  book,
  presentation,
  t,
  projecting,
  onProject,
  onClear,
}: ChapterReaderProps) {
  const versesPerPage = useBibleStore((s) => s.versesPerPage);
  const setVersesPerPage = useBibleStore((s) => s.setVersesPerPage);
  const [localVpp, setLocalVpp] = useState(String(versesPerPage));
  const chapter = useBibleStore((s) => s.chapter);
  const verses = useBibleStore((s) => s.verses);
  const versesLoading = useBibleStore((s) => s.versesLoading);
  const loadChapter = useBibleStore((s) => s.loadChapter);
  const selectedVerse = useBibleStore((s) => s.selectedVerse);
  const setSelectedVerse = useBibleStore((s) => s.setSelectedVerse);
  const projectedData = useBibleStore((s) => s.projectedData);
  const verseRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const projectedVerses = projecting ? (projectedData?.verses ?? []) : [];

  useEffect(() => {
    loadChapter(book.id, chapter);
  }, [loadChapter, book.id, chapter]);

  useEffect(() => {
    setLocalVpp(String(versesPerPage));
  }, [versesPerPage]);

  useEffect(() => {
    if (selectedVerse != null) {
      const el = verseRefs.current.get(selectedVerse);
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    }
  }, [selectedVerse]);

  const projectVerse = useCallback(
    (v: { number: number; text: string }) => {
      const state = useBibleStore.getState();
      const currentVerses = state.verses;
      const vpp = state.versesPerPage;

      let verseNumbers = [v.number];
      let verseText = `${v.number} ${v.text}`;

      if (currentVerses && vpp > 1) {
        const startIdx = currentVerses.findIndex((vv) => vv.number === v.number);
        if (startIdx >= 0) {
          const count = Math.min(vpp, currentVerses.length - startIdx);
          const group = currentVerses.slice(startIdx, startIdx + count);
          verseNumbers = group.map((vv) => vv.number);
          verseText = group.map((vv) => `${vv.number} ${vv.text}`).join('\n');
        }
      }

      const {
        uppercase,
        showReferenceOnly,
        showVersion,
        abbreviatedBooks,
        fontColor,
        fontSize,
        fontFamily,
        fontWeight,
        fontStyle,
        background,
        profileBackground,
        backgroundOpacity,
      } = state;
      const data = {
        version,
        book: book.id,
        bookName: tForVersion(
          state.versionLanguage ?? staticVersionLanguage(version),
          `book.${book.id}`,
        ),
        chapter,
        verses: verseNumbers,
        text: verseText,
        uppercase,
        showReferenceOnly,
        showVersion,
        abbreviatedBooks,
        fontColor,
        fontSize,
        fontFamily,
        fontWeight,
        fontStyle,
        background,
        profileBackground,
        backgroundOpacity,
      };
      try {
        presentation.project('bible-slide', { data });
        useBibleStore.getState().setProjectedData(data);
        onProject();
      } catch (e) {
        console.error('[bible] project error:', e);
      }
      setSelectedVerse(v.number);
    },
    [presentation, version, book.id, chapter, setSelectedVerse, onProject]
  );

  const handleVerseClick = useCallback(
    (v: { number: number; text: string }) => {
      setSelectedVerse(v.number);
    },
    [setSelectedVerse]
  );

  const handleVerseDoubleClick = useCallback(
    (v: { number: number; text: string }) => {
      projectVerse(v);
    },
    [projectVerse]
  );

  function projectAll() {
    if (!verses || verses.length === 0) return;
    const {
      uppercase,
      showReferenceOnly,
      showVersion,
      abbreviatedBooks,
      fontColor,
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      background,
      profileBackground,
      backgroundOpacity,
    } = useBibleStore.getState();
    const data = {
      version,
      book: book.id,
      bookName: tForVersion(
        useBibleStore.getState().versionLanguage ?? staticVersionLanguage(version),
        `book.${book.id}`
      ),
      chapter,
      verses: verses.map((v) => v.number),
      text: verses.map((v) => `${v.number} ${v.text}`).join('\n'),
      uppercase,
      showReferenceOnly,
      showVersion,
      abbreviatedBooks,
      fontColor,
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      background,
      profileBackground,
      backgroundOpacity,
    };
    try {
      presentation.project('bible-slide', { data });
      useBibleStore.getState().setProjectedData(data);
      onProject();
    } catch (e) {
      console.error('[bible] projectAll error:', e);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1 px-4 py-3">
        {versesLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('bible.loading-verses')}
          </div>
        ) : verses && verses.length > 0 ? (
          <div className="space-y-0.5">
            {verses.map((v) => (
              <button
                key={v.number}
                ref={(el) => {
                  if (el) verseRefs.current.set(v.number, el);
                  else verseRefs.current.delete(v.number);
                }}
                type="button"
                onClick={() => handleVerseClick(v)}
                onDoubleClick={() => handleVerseDoubleClick(v)}
                className={`w-full rounded-md px-3 py-1.5 text-left text-sm leading-relaxed transition-colors ${
                  projectedVerses.includes(v.number)
                    ? 'bg-primary/20 text-foreground'
                    : selectedVerse !== null &&
                        v.number >= selectedVerse &&
                        v.number < selectedVerse + versesPerPage
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

      <div className="flex shrink-0 items-center justify-between border-t border-border px-4 py-2">
        <span className="text-xs text-muted-foreground">{t('bible.verses-per-screen')}</span>
        <div className="flex items-center gap-2">
          <Select value={localVpp} onValueChange={(v) => {
            setLocalVpp(v);
            setVersesPerPage(Number(v));
          }}>
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
          <Button
            size="sm"
            onClick={projecting ? onClear : projectAll}
            disabled={!projecting && (!verses || verses.length === 0 || versesLoading)}
            variant={projecting ? 'secondary' : 'default'}
          >
            <Projector className="mr-1 h-4 w-4" />
            {projecting ? t('bible.clear') : t('bible.project')}
          </Button>
        </div>
      </div>
    </div>
  );
});
