import type { PresentationHostAPI } from '@lumen-media/module-sdk';
import {
  Button,
  Card,
  Popover,
  ScrollArea,
  Select,
  Separator,
  Tabs,
} from '@lumen-media/module-sdk/ui';
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  Download,
  History,
  Loader2,
  type LucideIcon,
  RefreshCw,
  Repeat2,
  Search,
  Star,
  StarCheck,
  StarPlus,
} from 'lucide-react';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useEventListener } from 'usehooks-ts';
import { BOOKS } from '../data/store.js';
import { type TFunction, type TranslationKey, tForVersion } from '../i18n.js';
import { cn, displayVersion } from '../lib/utils.js';
import { ALL_VERSIONS, staticVersionLanguage, UPDATED_VERSIONS, useBibleStore } from '../store.js';
import { BookGrid } from './BookGrid.js';
import { ChapterPreview } from './ChapterPreview.js';
import { ChapterReader } from './ChapterReader.js';
import { DownloadProgress } from './DownloadProgress.js';
import { FavoritesPanel } from './FavoritesPanel.js';
import { BrazilFlag, PortugalFlag, SpainFlag, UKFlag, USFlag } from './flags.js';
import { HistoryPanel } from './HistoryPanel.js';
import { PreviewPane } from './PreviewPane.js';
import { QuickSearch } from './QuickSearch.js';
import { SearchPanel } from './SearchPanel.js';
import { SettingsPanel } from './SettingsPanel.js';

interface BibleControllerProps {
  close?: () => void;
  onClose?: () => void;
  goToBook?: string;
  goToChapter?: number;
  goToVerse?: number;
}

const VersionTab = memo(function VersionTab({
  id,
  isActive,
  onSelect,
  localDownloaded,
}: {
  id: string;
  isActive: boolean;
  onSelect: (id: string) => void;
  localDownloaded: string[];
}) {
  const displayedTabs = useBibleStore((s) => s.displayedTabs);
  const setDisplayedTabs = useBibleStore((s) => s.setDisplayedTabs);

  const otherDownloaded = localDownloaded.filter((d) => !displayedTabs.includes(d));

  return (
    <div
      className={cn(
        'relative flex-1 flex items-center h-7 rounded-md text-xs font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <button type="button" onClick={() => onSelect(id)} className="flex-1 h-full text-center">
        {displayVersion(id)}
      </button>
      {otherDownloaded.length > 0 && (
        <Popover>
          <Popover.PopoverTrigger className="absolute right-1 flex items-center">
            <ChevronDown className="h-3 w-3" />
          </Popover.PopoverTrigger>
          <Popover.PopoverContent className="w-32 p-0" align="start">
            <div className="p-1">
              {otherDownloaded.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const prev = useBibleStore.getState().displayedTabs;
                    const idx = prev.indexOf(id);
                    if (idx >= 0) {
                      const next = [...prev];
                      next[idx] = d;
                      setDisplayedTabs(next);
                    }
                  }}
                  className="flex w-full items-center rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  {displayVersion(d)}
                </button>
              ))}
            </div>
          </Popover.PopoverContent>
        </Popover>
      )}
    </div>
  );
});

const _LANG_LABELS: Record<string, string> = {
  'pt-br': 'PT-BR',
  'pt-pt': 'PT-PT',
  'en-us': 'EN-US',
  'en-gb': 'EN-GB',
  es: 'ES',
};

const _LANG_ORDER = ['pt-br', 'pt-pt', 'en-us', 'en-gb', 'es'];

const _VERSES_PER_PAGE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function showFlag(lang: string) {
  switch (lang) {
    case 'pt-br':
      return <BrazilFlag className="h-3.5 w-3.5" />;
    case 'pt-pt':
      return <PortugalFlag className="h-3.5 w-3.5" />;
    case 'en-gb':
      return <UKFlag className="h-3.5 w-3.5" />;
    case 'en-us':
      return <USFlag className="h-3.5 w-3.5" />;
    case 'es':
      return <SpainFlag className="h-3.5 w-3.5" />;
    default:
      return null;
  }
}

function resolveUserLang(): string {
  if (navigator.language.startsWith('pt-PT') || navigator.language === 'pt') return 'pt-pt';
  if (navigator.language.startsWith('pt')) return 'pt-br';
  if (navigator.language.startsWith('es')) return 'es';
  if (navigator.language === 'en-GB' || navigator.language === 'en-gb') return 'en-gb';
  return 'en-us';
}

const VersionManagerPopover = memo(function VersionManagerPopover({
  t,
  userLang,
  localDownloaded,
}: {
  t: TFunction;
  userLang: string;
  localDownloaded: string[];
}) {
  const version = useBibleStore((s) => s.version);
  const downloadingVersions = useBibleStore((s) => s.downloadingVersions);
  const displayedTabs = useBibleStore((s) => s.displayedTabs);
  const setDisplayedTabs = useBibleStore((s) => s.setDisplayedTabs);
  const setVersion = useBibleStore((s) => s.setVersion);
  const downloadVersionOnly = useBibleStore((s) => s.downloadVersionOnly);

  const [filterLang, setFilterLang] = useState(userLang);
  const [vmSearch, setVmSearch] = useState('');

  const handleSelectVersion = useCallback(
    (id: string) => {
      if (!displayedTabs.includes(id)) {
        const idx = displayedTabs.indexOf(version);
        if (idx < 0) {
          setDisplayedTabs([id, ...displayedTabs.slice(0, 2)]);
        } else {
          const next = [...displayedTabs];
          next[idx] = id;
          setDisplayedTabs(next);
        }
      }
      setVersion(id);
    },
    [displayedTabs, version, setDisplayedTabs, setVersion]
  );

  const filteredVersions = useMemo(() => {
    let list = ALL_VERSIONS.filter((v) => v.language === filterLang);
    if (vmSearch) {
      const q = vmSearch.toLowerCase();
      list = list.filter((v) => v.name.toLowerCase().includes(q) || v.id.includes(q));
    }
    return list;
  }, [filterLang, vmSearch]);

  return (
    <Popover>
      <Popover.PopoverTrigger
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        title={t('bible.manage-versions')}
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </Popover.PopoverTrigger>
      <Popover.PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            value={vmSearch}
            onChange={(e) => setVmSearch(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 outline-none"
            placeholder={t('bible.search-placeholder')}
          />
          <Select value={filterLang} onValueChange={(v) => setFilterLang(v)}>
            <Select.SelectTrigger className="w-fit h-fit py-1 flex items-center justify-center">
              {showFlag(filterLang)}
            </Select.SelectTrigger>
            <Select.SelectContent className="min-w-(--anchor-width) w-fit">
              {_LANG_ORDER.map((l) => (
                <Select.SelectItem
                  key={l}
                  value={l}
                  className="flex items-center justify-center pl-2 py-1"
                >
                  {showFlag(l)}
                </Select.SelectItem>
              ))}
            </Select.SelectContent>
          </Select>
        </div>
        <ScrollArea className="h-72">
          <div className="p-1">
            {filteredVersions.map((v) => {
              const isDownloaded = localDownloaded.includes(v.id);
              const isCurrent = version === v.id;
              const isDownloading = downloadingVersions.includes(v.id);

              return (
                <div
                  key={v.id}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-xs',
                    isCurrent ? 'bg-accent' : 'hover:bg-accent/50'
                  )}
                >
                  <span className="shrink-0 rounded bg-muted px-1 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {_LANG_LABELS[v.language] || v.language}
                  </span>
                  <span className="flex-1 truncate">{v.name}</span>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{v.id}</span>

                  {isDownloading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  ) : isDownloaded ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectVersion(v.id);
                      }}
                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                    >
                      <Check className={cn('h-3.5 w-3.5', { 'text-primary': isCurrent })} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadVersionOnly(v.id);
                      }}
                      className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </Popover.PopoverContent>
    </Popover>
  );
});

const VPP_OPTIONS = Array.from({ length: 17 }, (_, i) => i + 4);

const ReaderFooter = memo(function ReaderFooter({
  version,
  presentation,
  t,
  projecting,
  onProject,
  onClear,
}: {
  version: string;
  presentation: PresentationHostAPI;
  t: TFunction;
  projecting: boolean;
  onProject: () => void;
  onClear: () => void;
}) {
  const selectedBook = useBibleStore((s) => s.selectedBook);
  const versesPerPage = useBibleStore((s) => s.versesPerPage);
  const setVersesPerPage = useBibleStore((s) => s.setVersesPerPage);
  const verses = useBibleStore((s) => s.verses);
  const versesLoading = useBibleStore((s) => s.versesLoading);
  const chapter = useBibleStore((s) => s.chapter);
  const selectedVerse = useBibleStore((s) => s.selectedVerse);
  const bookmarks = useBibleStore((s) => s.bookmarks);
  const toggleBookmark = useBibleStore((s) => s.toggleBookmark);
  const [_localVpp, setLocalVpp] = useState(String(versesPerPage));

  const bookmarkKey =
    selectedBook && selectedVerse != null
      ? `${version}/${selectedBook.id}/${chapter}:${selectedVerse}`
      : null;
  const isFavorited = bookmarkKey ? bookmarks.has(bookmarkKey) : false;

  function toggleFavorite() {
    if (!selectedBook || selectedVerse == null) return;
    const verseText = verses?.find((v) => v.number === selectedVerse)?.text;
    toggleBookmark(version, selectedBook.id, chapter, selectedVerse, verseText);
  }

  useEffect(() => {
    setLocalVpp(String(versesPerPage));
  }, [versesPerPage]);

  function projectAll() {
    if (!verses || verses.length === 0 || !selectedBook) return;
    const state = useBibleStore.getState();
    const data = {
      version,
      book: selectedBook.id,
      bookName: tForVersion(
        state.versionLanguage ?? staticVersionLanguage(version),
        `book.${selectedBook.id}`
      ),
      chapter: state.chapter,
      verses: verses.map((v) => v.number),
      text: verses.map((v) => `${v.number} ${v.text}`).join('\n'),
      uppercase: state.uppercase,
      showReferenceOnly: state.showReferenceOnly,
      showVersion: state.showVersion,
      abbreviatedBooks: state.abbreviatedBooks,
      fontColor: state.fontColor,
      fontSize: state.fontSize,
      fontFamily: state.fontFamily,
      fontWeight: state.fontWeight,
      fontStyle: state.fontStyle,
      textAlign: state.textAlign,
      lineSpacing: state.lineSpacing,
      referencePosition: state.referencePosition,
      verseNumberStyle: state.verseNumberStyle,
      background: state.background,
      profileBackground: state.profileBackground,
      backgroundOpacity: state.backgroundOpacity,
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
    <>
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1">
          {Array.from({ length: 3 }, (_, i) => i + 1).map((v) => (
            <Button
              key={v}
              variant="outline"
              onClick={() => {
                setLocalVpp(String(v));
                setVersesPerPage(v);
              }}
              className={cn('p-0 min-h-auto aspect-square h-auto w-6 text-[10px] rounded-[6px]', {
                'bg-primary hover:bg-primary/70 text-primary-foreground': versesPerPage === v,
              })}
            >
              {v}
            </Button>
          ))}
        </div>
        <Popover>
          <Popover.PopoverTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  'w-full justify-center gap-1 py-px h-6 text-[10px] rounded-[6px] group relative',
                  {
                    'bg-primary hover:bg-primary/70 text-primary-foreground': versesPerPage >= 4,
                  }
                )}
              >
                {versesPerPage >= 4 ? versesPerPage : 4}
                <ChevronDown className="h-3 w-3 opacity-60 top-1/2 translate-y-[-50%] right-1 absolute group-data-[popup-open=open]:rotate-180" />
              </Button>
            }
          />
          <Popover.PopoverContent className="w-44 p-1" align="center">
            <div className="grid grid-cols-5 gap-1">
              {VPP_OPTIONS.map((v) => (
                <Button
                  key={v}
                  variant="outline"
                  onClick={() => {
                    setLocalVpp(String(v));
                    setVersesPerPage(v);
                  }}
                  className={cn('py-px h-auto text-[10px] rounded-[6px]', {
                    'bg-primary text-primary-foreground': versesPerPage === v,
                  })}
                >
                  {v}
                </Button>
              ))}
            </div>
          </Popover.PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1">
          <SettingsPanel />

          <Button
            className="p-1"
            variant="outline"
            size="icon-xs"
            title={isFavorited ? t('bible.unbookmark') : t('bible.bookmark')}
            disabled={!selectedBook || selectedVerse == null}
            onClick={toggleFavorite}
          >
            {isFavorited ? <StarCheck /> : <StarPlus />}
          </Button>

          <Button
            className="p-1"
            disabled
            variant="outline"
            size="icon-xs"
            title="Automatic presentation"
          >
            <Repeat2 />
          </Button>
        </div>
        <Button
          className="h-6"
          size="sm"
          onClick={projecting ? onClear : projectAll}
          disabled={!projecting && (!verses || verses.length === 0 || versesLoading)}
          variant={projecting ? 'secondary' : 'default'}
        >
          {projecting ? t('bible.clear') : t('bible.project')}
        </Button>
      </div>
    </>
  );
});

const Sidebar = memo(function Sidebar({
  version,
  presentation,
  t,
  projecting,
  onProject,
  onClear,
}: {
  version: string;
  presentation: PresentationHostAPI;
  t: TFunction;
  projecting: boolean;
  onProject: () => void;
  onClear: () => void;
}) {
  const selectedBook = useBibleStore((s) => s.selectedBook);
  const displayedTabs = useBibleStore((s) => s.displayedTabs);
  const _downloadingVersions = useBibleStore((s) => s.downloadingVersions);
  const setVersion = useBibleStore((s) => s.setVersion);
  const localDownloaded = useBibleStore((s) => s.downloadedVersionList);

  return (
    <Card className="flex w-80 gap-0 p-0 shrink-0 flex-col overflow-hidden border-r border-border rounded-none">
      <div className="flex shrink-0 items-center gap-1 px-1 py-2">
        {displayedTabs.map((id) => (
          <VersionTab
            key={id}
            id={id}
            isActive={version === id}
            onSelect={setVersion}
            localDownloaded={localDownloaded}
          />
        ))}
        <VersionManagerPopover
          t={t}
          userLang={resolveUserLang()}
          localDownloaded={localDownloaded}
        />
      </div>

      <Separator />

      {selectedBook ? (
        <ChapterReader
          version={version}
          book={selectedBook}
          presentation={presentation}
          t={t}
          projecting={projecting}
          onProject={onProject}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <BookOpen className="h-8 w-8 opacity-30" />
            <span className="text-sm">{t('bible.go-to')}</span>
          </div>
        </div>
      )}
      <Card.CardFooter className="flex justify-between shrink-0 items-center gap-2 border-t border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <PreviewPane />
        </div>
        <ReaderFooter
          version={version}
          presentation={presentation}
          t={t}
          projecting={projecting}
          onProject={onProject}
          onClear={onClear}
        />
      </Card.CardFooter>
    </Card>
  );
});

const BrowseContent = memo(function BrowseContent() {
  const chapter = useBibleStore((s) => s.chapter);
  const selectedBook = useBibleStore((s) => s.selectedBook);
  const selectBook = useBibleStore((s) => s.selectBook);
  const setChapter = useBibleStore((s) => s.setChapter);
  const tFn = useBibleStore((s) => s.t);

  const chapterNumbers = useMemo(
    () => (selectedBook ? Array.from({ length: selectedBook.chapters }, (_, i) => i + 1) : []),
    [selectedBook]
  );

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="space-y-8">
        <BookGrid books={BOOKS} onSelect={selectBook} />
        {selectedBook && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4 pr-1.5">
              <div className="mb-4 flex items-center gap-4 pr-1.5">
                <h3 className="text-base font-semibold text-foreground">
                  {tFn?.(`book.${selectedBook.id}` as TranslationKey)} {tFn?.('bible.chapter')}s
                </h3>
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">
                  {selectedBook.chapters} {tFn?.('bible.chapter')}s
                </span>
              </div>
              <ScrollArea className="h-72 pr-3">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-1.5">
                  {chapterNumbers.map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setChapter(ch)}
                      className={cn(
                        'flex aspect-square items-center justify-center rounded-md border text-sm font-medium transition-colors',
                        chapter === ch
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-card-foreground hover:border-primary/40 hover:bg-accent/40'
                      )}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="rounded-xl border border-border bg-card p-4 pr-1.5">
              <div className="mb-4 flex items-center gap-4">
                <h3 className="text-base font-semibold text-foreground">
                  {tFn?.('bible.chapter')} {chapter}
                </h3>
                <div className="h-px flex-1 bg-border" />
              </div>
              <ChapterPreview />
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
});

type TabId = 'browse' | 'search' | 'favorites' | 'history';

const TAB_DEFS: { id: TabId; icon: LucideIcon; labelKey: TranslationKey }[] = [
  { id: 'browse', icon: BookOpen, labelKey: 'bible.book' },
  { id: 'search', icon: Search, labelKey: 'bible.search' },
  { id: 'favorites', icon: Star, labelKey: 'bible.favorites' },
  { id: 'history', icon: History, labelKey: 'bible.history' },
];

const TAB_ORDER: TabId[] = ['browse', 'search', 'favorites', 'history'];

const AnimatedTabs = memo(function AnimatedTabs({
  value,
  onValueChange,
  t,
}: {
  value: TabId;
  onValueChange: (v: TabId) => void;
  t: TFunction;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const hasMounted = useRef(false);

  const positionIndicator = useCallback(
    (animated: boolean) => {
      const container = containerRef.current;
      const indicator = indicatorRef.current;
      if (!container || !indicator) return;
      const trigger = container.querySelector<HTMLButtonElement>(`[data-tab-id="${value}"]`);
      if (!trigger) return;
      const toLeft = trigger.offsetLeft;
      const toWidth = trigger.offsetWidth;
      const fromLeft = parseFloat(indicator.style.left) || toLeft;
      const fromWidth = parseFloat(indicator.style.width) || toWidth;
      indicator.style.top = `${trigger.offsetTop}px`;
      indicator.style.height = `${trigger.offsetHeight}px`;
      indicator.style.left = `${toLeft}px`;
      indicator.style.width = `${toWidth}px`;
      if (!animated) {
        indicator.style.transition = 'none';
        indicator.style.transform = '';
        return;
      }
      indicator.style.transition = 'none';
      indicator.style.transform = `translateX(${fromLeft - toLeft}px) scaleX(${toWidth > 0 ? fromWidth / toWidth : 1})`;
      void indicator.offsetWidth;
      indicator.style.transition = 'transform 600ms cubic-bezier(0.16, 1, 0.3, 1)';
      requestAnimationFrame(() => {
        indicator.style.transform = 'translateX(0px) scaleX(1)';
      });
    },
    [value]
  );

  const positionIndicatorRef = useRef(positionIndicator);
  positionIndicatorRef.current = positionIndicator;

  useLayoutEffect(() => {
    positionIndicator(hasMounted.current);
    hasMounted.current = true;
  }, [positionIndicator]);

  useEffect(() => {
    const onResize = () => positionIndicatorRef.current(false);
    window.addEventListener('resize', onResize);
    const raf = requestAnimationFrame(() => positionIndicatorRef.current(false));
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={containerRef}>
      <Tabs value={value} onValueChange={(v) => onValueChange(v as TabId)}>
        <Tabs.TabsList className="relative bg-background/80 gap-1.5">
          <span
            ref={indicatorRef}
            aria-hidden
            className="pointer-events-none border border-input absolute origin-left rounded-md bg-input/30"
          />
          {TAB_DEFS.map(({ id, icon: Icon, labelKey }) => (
            <Tabs.TabsTrigger
              key={id}
              value={id}
              data-tab-id={id}
              className="relative border-none hover:bg-input/30 data-active:bg-transparent dark:data-active:bg-transparent"
            >
              <Icon className="mr-1 h-3.5 w-3.5" />
              {t(labelKey)}
            </Tabs.TabsTrigger>
          ))}
        </Tabs.TabsList>
      </Tabs>
    </div>
  );
});

const Header = memo(function Header({
  close,
  t,
  searchQuery,
  setSearchQuery,
}: {
  close?: () => void;
  t: TFunction;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
}) {
  const tab = useBibleStore((s) => s.tab);
  const setTab = useBibleStore((s) => s.setTab);
  const goTo = useBibleStore((s) => s.goTo);
  const displayedTabs = useBibleStore((s) => s.displayedTabs);
  const syncingVersions = useBibleStore((s) => s.syncingVersions);
  const syncVersion = useBibleStore((s) => s.syncVersion);
  const downloadedIds = useBibleStore((s) => s.downloadedVersionList);
  const syncedMap = useBibleStore((s) => s.syncedVersions);

  const pendingUpdates = displayedTabs.filter(
    (id) => UPDATED_VERSIONS.includes(id) && downloadedIds.includes(id) && !syncedMap[id]
  );
  const hasUpdate = pendingUpdates.length > 0;
  const isSyncing = hasUpdate && syncingVersions.includes(pendingUpdates[0]);

  const vtActiveRef = useRef(false);

  const switchTab = useCallback(
    (next: TabId) => {
      if (next === tab) return;
      const apply = () => setTab(next);
      const doc = document as Document & {
        startViewTransition?: (cb: () => void) => { finished: Promise<void> };
      };
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!doc.startViewTransition || reduced || vtActiveRef.current) {
        apply();
        return;
      }
      const prevIdx = TAB_ORDER.indexOf(tab);
      const nextIdx = TAB_ORDER.indexOf(next);
      document.documentElement.dataset.vtDir = nextIdx > prevIdx ? 'forward' : 'backward';
      vtActiveRef.current = true;
      const vt = doc.startViewTransition(() => {
        flushSync(apply);
      });
      vt.finished
        .catch(() => {})
        .finally(() => {
          vtActiveRef.current = false;
          delete document.documentElement.dataset.vtDir;
        });
    },
    [tab, setTab]
  );

  const handleSync = async () => {
    if (pendingUpdates.length === 0) return;
    const versionId = pendingUpdates[0];
    const versionName = displayVersion(versionId);
    const { ui } = useBibleStore.getState();
    ui?.notify({
      message: t('bible.syncing', { version: versionName }),
      level: 'loading',
    });
    try {
      await syncVersion(versionId);
      ui?.notify({
        message: `${versionName} ${t('bible.synced')}`,
        level: 'success',
      });
    } catch {
      ui?.notify({
        message: t('bible.service-unavailable'),
        level: 'error',
      });
    }
  };

  return (
    <header className="grid grid-cols-3 gap-3 px-4 py-2 bg-card">
      <button
        type="button"
        onClick={() => close?.()}
        className="flex shrink-0 items-center w-fit gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        {t('bible.go-back')}
      </button>

      <div className="flex flex-1 justify-center">
        <QuickSearch
          books={BOOKS}
          onSelect={(book, ch, verse) => goTo(book, ch ?? 1, verse)}
          t={t}
          inputValue={searchQuery}
          onInputValueChange={setSearchQuery}
        />
      </div>

      <div className="ml-auto flex gap-1 items-center">
        {hasUpdate && (
          <button
            type="button"
            onClick={handleSync}
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-amber-500 hover:bg-amber-500/10',
              isSyncing && 'pointer-events-none'
            )}
            title={t('bible.update-available')}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isSyncing && 'animate-spin')} />
          </button>
        )}
        <AnimatedTabs value={tab} onValueChange={switchTab} t={t} />
      </div>
    </header>
  );
});

const ContentArea = memo(function ContentArea({ t }: { t: TFunction }) {
  const tab = useBibleStore((s) => s.tab);

  let content: React.ReactNode;
  if (tab === 'favorites') {
    content = <FavoritesPanel t={t} />;
  } else if (tab === 'history') {
    content = <HistoryPanel t={t} />;
  } else {
    content = (
      <>
        <Separator />
        <div className="flex min-h-0 flex-1 flex-col p-3">
          {tab === 'browse' ? <BrowseContent /> : <SearchPanel t={t} />}
        </div>
      </>
    );
  }

  return <div className="bible-vt flex min-h-0 flex-1 flex-col">{content}</div>;
});

export function BibleController({ close, goToBook, goToChapter, goToVerse }: BibleControllerProps) {
  const ready = useBibleStore((s) => s.ready);
  const downloading = useBibleStore((s) => s.downloading);
  const dlVersion = useBibleStore((s) => s.dlVersion);
  const version = useBibleStore((s) => s.version);
  const presentation = useBibleStore((s) => s.presentation);
  const projectedData = useBibleStore((s) => s.projectedData);
  const goTo = useBibleStore((s) => s.goTo);
  const tFn = useBibleStore((s) => s.t);

  const [searchQuery, setSearchQuery] = useState('');
  const [projecting, setProjecting] = useState(false);
  const projectingRef = useRef(false);

  const bookInitials = useMemo(() => {
    const initials = new Set<string>();
    for (const book of BOOKS) {
      const nameChar = book.name
        .charAt(0)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      initials.add(nameChar);
      const idChar = book.id.charAt(0).toLowerCase();
      initials.add(idChar);
    }
    return initials;
  }, []);

  const clearProjection = useCallback(() => {
    projectingRef.current = false;
    setProjecting(false);
    useBibleStore.getState().clearProjection();
  }, []);

  const handleProject = useCallback(() => {
    setProjecting(true);
    projectingRef.current = true;
  }, []);

  useEffect(() => {
    if (!projectedData) {
      setProjecting(false);
      projectingRef.current = false;
    }
  }, [projectedData]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (projectingRef.current) {
          e.preventDefault();
          clearProjection();
        }
        return;
      }

      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.querySelector<HTMLInputElement>('[data-search-input]');
        input?.focus();
        setSearchQuery('');
        return;
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
        const key = e.key.toLowerCase();
        const normalizedKey = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (bookInitials.has(normalizedKey)) {
          e.preventDefault();
          const input = document.querySelector<HTMLInputElement>('[data-search-input]');
          input?.focus();
          setSearchQuery(key);
        }
      }
    },
    [bookInitials, clearProjection]
  );

  useEventListener('keydown', handleKeyDown);

  useEffect(() => {
    if (!goToBook || !goToChapter) return;
    const book = BOOKS.find((b) => b.id === goToBook);
    if (book) goTo(book, goToChapter, goToVerse);
  }, [goToBook, goToChapter, goToVerse, goTo]);

  if (!tFn || !presentation) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Initializing...
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">
          {downloading
            ? tFn('bible.downloading', {
                version: dlVersion.split(', ').map(displayVersion).join(', '),
              })
            : tFn('bible.preparing')}
        </span>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-background text-foreground">
      <Header close={close} t={tFn} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

      <DownloadProgress />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          version={version}
          presentation={presentation}
          t={tFn}
          projecting={projecting}
          onProject={handleProject}
          onClear={clearProjection}
        />
        <ContentArea t={tFn} />
      </div>
    </div>
  );
}
