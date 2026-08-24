import type { PresentationHostAPI } from '@lumen-media/module-sdk';
import { ScrollArea } from '@lumen-media/module-sdk/ui';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ListPlus, Loader2, Star } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { Book } from '../data/types.js';
import { type TFunction, tForVersion } from '../i18n.js';
import { getModuleQueue, staticVersionLanguage, useBibleStore } from '../store.js';
import { DownloadingState } from './DownloadingState.js';

interface BibleVerseQueueConfig {
  version: string;
  book: string;
  bookName: string;
  chapter: number;
  verse: number;
  verseText: string;
  versionDisplayName: string;
}

interface ChapterReaderProps {
  version: string;
  book: Book;
  presentation: PresentationHostAPI;
  t: TFunction;
  projecting: boolean;
  onProject: () => void;
}

export const ChapterReader = memo(function ChapterReader({
  version,
  book,
  presentation,
  t,
  projecting,
  onProject,
}: ChapterReaderProps) {
  const versesPerPage = useBibleStore((s) => s.versesPerPage);
  const chapter = useBibleStore((s) => s.chapter);
  const verses = useBibleStore((s) => s.verses);
  const versesLoading = useBibleStore((s) => s.versesLoading);
  const loadChapter = useBibleStore((s) => s.loadChapter);
  const selectedVerse = useBibleStore((s) => s.selectedVerse);
  const setSelectedVerse = useBibleStore((s) => s.setSelectedVerse);
  const projectedData = useBibleStore((s) => s.projectedData);
  const downloading = useBibleStore((s) => s.downloading);
  const downloadingVersions = useBibleStore((s) => s.downloadingVersions);
  const dlCurrent = useBibleStore((s) => s.dlCurrent);
  const dlTotal = useBibleStore((s) => s.dlTotal);
  const dlVersion = useBibleStore((s) => s.dlVersion);
  const downloadedVersionList = useBibleStore((s) => s.downloadedVersionList);

  const internalSelectRef = useRef(false);

  const viewportRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: verses?.length ?? 0,
    getScrollElement: () => viewportRef.current,
    estimateSize: () => 56,
    overscan: 10,
  });

  const scrollToVerse = useCallback(
    (verse: number) => {
      const index = verses?.findIndex((v) => v.number === verse) ?? -1;
      if (index >= 0) virtualizer.scrollToIndex(index, { align: 'center' });
    },
    [verses, virtualizer]
  );

  const projectedVerses =
    projecting &&
    projectedData &&
    projectedData.version === version &&
    projectedData.book === book.id &&
    projectedData.chapter === chapter
      ? projectedData.verses
      : [];
  const [contextMenu, setContextMenu] = useState<{
    verse: { number: number; text: string };
    x: number;
    y: number;
  } | null>(null);
  const bookmarks = useBibleStore((s) => s.bookmarks);
  const toggleBookmark = useBibleStore((s) => s.toggleBookmark);

  useEffect(() => {
    loadChapter(book.id, chapter);
  }, [loadChapter, book.id, chapter]);

  useEffect(() => {
    if (internalSelectRef.current) {
      internalSelectRef.current = false;
      return;
    }
    if (selectedVerse != null) {
      scrollToVerse(selectedVerse);
    }
  }, [selectedVerse, scrollToVerse]);

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
        textAlign,
        lineSpacing,
        referencePosition,
        verseNumberStyle,
        background,
        profileBackground,
        backgroundOpacity,
      } = state;
      const data = {
        version,
        book: book.id,
        bookName: tForVersion(
          state.versionLanguage ?? staticVersionLanguage(version),
          `book.${book.id}`
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
        textAlign,
        lineSpacing,
        referencePosition,
        verseNumberStyle,
        background,
        profileBackground,
        backgroundOpacity,
      };
      try {
        presentation.project('bible-slide', { data });
        useBibleStore.getState().setProjectedData(data);
        onProject();
      } catch {}
      setSelectedVerse(v.number);
    },
    [presentation, version, book.id, chapter, setSelectedVerse, onProject]
  );

  const handleVerseClick = useCallback(
    (v: { number: number; text: string }) => {
      internalSelectRef.current = true;
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

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, v: { number: number; text: string }) => {
      e.preventDefault();
      setContextMenu({ verse: v, x: e.clientX, y: e.clientY });
    },
    []
  );

  const bookmarkKey = useCallback(
    (verseNum: number) => `${version}/${book.id}/${chapter}:${verseNum}`,
    [version, book.id, chapter]
  );
  const handleAddToQueue = useCallback(
    (v: { number: number; text: string }) => {
      const q = getModuleQueue();
      if (!q?.addTrigger) return;
      setContextMenu(null);
      const state = useBibleStore.getState();
      const versionLang = state.versionLanguage ?? staticVersionLanguage(version);
      const versionDisplay = version.toUpperCase();
      const config: BibleVerseQueueConfig = {
        version,
        book: book.id,
        bookName: tForVersion(versionLang, `book.${book.id}` as `book.${string}`),
        chapter,
        verse: v.number,
        verseText: v.text,
        versionDisplayName: versionDisplay,
      };
      q.addTrigger('bible.verse-queue', config);
    },
    [version, book.id, chapter]
  );

  const isDownloading = downloading || downloadingVersions.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ScrollArea className="min-h-0 flex-1 px-2 py-3" viewportProps={{ ref: viewportRef }}>
        {downloading || downloadedVersionList.length === 0 ? (
          <DownloadingState
            t={t}
            isDownloading={isDownloading}
            dlVersion={dlVersion}
            dlCurrent={dlCurrent}
            dlTotal={dlTotal}
          />
        ) : versesLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('bible.loading-verses')}
          </div>
        ) : verses && verses.length > 0 ? (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const v = verses[virtualItem.index];
              return (
                <div
                  key={v.number}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  className="absolute left-0 top-0 w-full"
                  style={{
                    transform: `translateY(${virtualItem.start}px)`,
                    paddingBottom: '2px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleVerseClick(v)}
                    onDoubleClick={() => handleVerseDoubleClick(v)}
                    onContextMenu={(e) => handleContextMenu(e, v)}
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
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            {t('bible.no-results')}
          </div>
        )}
      </ScrollArea>

      {contextMenu && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Fechar menu"
            onClick={() => setContextMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu(null);
            }}
          />
          <div
            className="fixed z-50 min-w-40 overflow-hidden rounded-md border border-border bg-popover p-1 shadow-md"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={(e) => {
                e.stopPropagation();
                toggleBookmark(
                  version,
                  book.id,
                  chapter,
                  contextMenu.verse.number,
                  contextMenu.verse.text
                );
                setContextMenu(null);
              }}
            >
              <Star
                className={`h-4 w-4 ${
                  bookmarks.has(bookmarkKey(contextMenu.verse.number))
                    ? 'fill-yellow-400 text-yellow-400'
                    : ''
                }`}
              />
              {bookmarks.has(bookmarkKey(contextMenu.verse.number))
                ? t('bible.unbookmark')
                : t('bible.bookmark')}
            </button>
            {getModuleQueue() && (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToQueue(contextMenu.verse);
                }}
              >
                <ListPlus className="h-4 w-4" />
                {t('bible.add-to-queue')}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
});
