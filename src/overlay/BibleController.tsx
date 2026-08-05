import { Card, Popover, ScrollArea, Select, Separator, Tabs } from '@lumen-media/module-sdk/ui';
import { BookOpen, Check, ChevronDown, ChevronLeft, Download, Loader2, Search } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BOOKS } from '../data/store.js';

import type { TFunction, TranslationKey } from '../i18n.js';
import { cn, displayVersion } from '../lib/utils.js';
import { ALL_VERSIONS, useBibleStore } from '../store.js';
import { BookGrid } from './BookGrid.js';
import { ChapterPreview } from './ChapterPreview.js';
import { ChapterReader } from './ChapterReader.js';
import { DownloadProgress } from './DownloadProgress.js';
import { BrazilFlag, PortugalFlag, SpainFlag, UKFlag, USFlag } from './flags.js';
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

  const langLabels: Record<string, string> = {
    'pt-br': 'PT-BR',
    'pt-pt': 'PT-PT',
    'en-us': 'EN-US',
    'en-gb': 'EN-GB',
    es: 'ES',
  };

  const showFlag = (lang: string) => {
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
  };

  const langOrder = ['pt-br', 'pt-pt', 'en-us', 'en-gb', 'es'];

  const handleSelectVersion = (id: string) => {
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
  };

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
              {langOrder.map((l) => (
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
                    {langLabels[v.language] || v.language}
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

const Sidebar = memo(function Sidebar({
  version,
  presentation,
  t,
  projecting,
  onProject,
  onClear,
}: {
  version: string;
  presentation: any;
  t: TFunction;
  projecting: boolean;
  onProject: () => void;
  onClear: () => void;
}) {
  const selectedBook = useBibleStore((s) => s.selectedBook);
  const displayedTabs = useBibleStore((s) => s.displayedTabs);
  const setVersion = useBibleStore((s) => s.setVersion);
  const [localDownloaded, setLocalDownloaded] = useState<string[]>([]);

  useEffect(() => {
    useBibleStore.getState().downloadedVersions().then(setLocalDownloaded);
  }, []);

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
          userLang={
            navigator.language.startsWith('pt-PT') || navigator.language === 'pt'
              ? 'pt-pt'
              : navigator.language.startsWith('pt')
                ? 'pt-br'
                : navigator.language.startsWith('es')
                  ? 'es'
                  : navigator.language === 'en-GB' || navigator.language === 'en-gb'
                    ? 'en-gb'
                    : 'en-us'
          }
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
          onClear={onClear}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <BookOpen className="h-8 w-8 opacity-30" />
            <span className="text-sm">{t('bible.go-to')}</span>
          </div>
        </div>
      )}
      <Card.CardFooter className="flex shrink-0 items-center gap-2 border-t border-border px-3 py-2">
        <PreviewPane />
        <SettingsPanel />
      </Card.CardFooter>
    </Card>
  );
});

const BrowseContent = memo(function BrowseContent() {
  const chapter = useBibleStore((s) => s.chapter);
  const selectedBook = useBibleStore((s) => s.selectedBook);
  const selectBook = useBibleStore((s) => s.selectBook);
  const setChapter = useBibleStore((s) => s.setChapter);

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="space-y-8">
        <BookGrid books={BOOKS} onSelect={selectBook} />
        {selectedBook && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4 pr-1.5">
              <div className="mb-4 flex items-center gap-4 pr-1.5">
                <h3 className="text-base font-semibold text-foreground">
                  {useBibleStore.getState().t?.(`book.${selectedBook.id}` as TranslationKey)}{' '}
                  {useBibleStore.getState().t?.('bible.chapter')}s
                </h3>
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">
                  {selectedBook.chapters} {useBibleStore.getState().t?.('bible.chapter')}s
                </span>
              </div>
              <ScrollArea className="h-72 pr-3">
                <div className="grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-1.5">
                  {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => (
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
                  {useBibleStore.getState().t?.('bible.chapter')} {chapter}
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

      <div className="ml-auto flex gap-1">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'browse' | 'search')}>
          <Tabs.TabsList className="bg-background/80 gap-1.5">
            <Tabs.TabsTrigger value="browse">
              <BookOpen className="mr-1 h-3.5 w-3.5" />
              {t('bible.book')}
            </Tabs.TabsTrigger>
            <Tabs.TabsTrigger value="search">
              <Search className="mr-1 h-3.5 w-3.5" />
              {t('bible.search')}
            </Tabs.TabsTrigger>
          </Tabs.TabsList>
        </Tabs>
      </div>
    </header>
  );
});

const ContentArea = memo(function ContentArea({ t }: { t: TFunction }) {
  const tab = useBibleStore((s) => s.tab);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Separator />
      <div className="flex min-h-0 flex-1 flex-col p-3">
        {tab === 'browse' ? <BrowseContent /> : <SearchPanel t={t} />}
      </div>
    </div>
  );
});

export function BibleController({ close, goToBook, goToChapter, goToVerse }: BibleControllerProps) {
  const ready = useBibleStore((s) => s.ready);
  const downloading = useBibleStore((s) => s.downloading);
  const dlCurrent = useBibleStore((s) => s.dlCurrent);
  const dlTotal = useBibleStore((s) => s.dlTotal);
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [bookInitials, clearProjection]);

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
    <div className="flex h-full flex-col bg-background text-foreground">
      <DownloadProgress
        visible={downloading && dlTotal > 0}
        current={dlCurrent}
        total={dlTotal}
        version={dlVersion}
        t={tFn}
      />

      <Header close={close} t={tFn} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

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
