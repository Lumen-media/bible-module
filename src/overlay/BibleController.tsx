import { BookOpen, Check, ChevronDown, Download, Loader2, Search } from 'lucide-react';
import { Popover, ScrollArea, Select, Separator, Tabs } from '@lumen-media/module-sdk/ui';
import { cn } from '../lib/utils.js';
import { ALL_VERSIONS, useBibleStore } from '../store.js';
import { BOOKS } from '../data/store.js';
import { BookGrid } from './BookGrid.js';
import { BrazilFlag, PortugalFlag, SpainFlag, UKFlag, USFlag } from './flags.js';
import { ChapterReader } from './ChapterReader.js';
import { DownloadProgress } from './DownloadProgress.js';
import { QuickSearch } from './QuickSearch.js';
import { SearchPanel } from './SearchPanel.js';
import { useEffect, useState } from 'react';

export function BibleController() {
  const {
    ready, downloading, dlCurrent, dlTotal, dlVersion,
    downloadingVersions, version, tab, selectedBook, chapter,
    presentation, t,
    setVersion, setTab, selectBook, setChapter, goTo,
    downloadAndSetVersion, downloadVersionOnly, downloadedVersions,
  } = useBibleStore();

  const [localDownloaded, setLocalDownloaded] = useState<string[]>([]);
  const [displayedTabs, setDisplayedTabs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    downloadedVersions().then(setLocalDownloaded).catch(() => { });
  }, [downloadedVersions, downloadingVersions]);

  useEffect(() => {
    if (localDownloaded.length > 0 && displayedTabs.length === 0) {
      setDisplayedTabs(localDownloaded.slice(0, 3));
    }
  }, [localDownloaded, displayedTabs]);

  const handleSelectVersion = (id: string) => {
    if (!displayedTabs.includes(id)) {
      setDisplayedTabs((prev) => {
        const idx = prev.indexOf(version);
        if (idx < 0) return [id, ...prev.slice(0, 2)];
        const next = [...prev];
        next[idx] = id;
        return next;
      });
    }
    setVersion(id);
  };
  const raw = navigator.language;
  const userLang = raw.startsWith('pt-PT') || raw === 'pt' ? 'pt-pt' : raw.startsWith('pt') ? 'pt-br' : raw.startsWith('es') ? 'es' : raw === 'en-GB' || raw === 'en-gb' ? 'en-gb' : 'en-us';
  const [filterLang, setFilterLang] = useState(userLang);

  const langLabels: Record<string, string> = { 'pt-br': 'PT-BR', 'pt-pt': 'PT-PT', 'en-us': 'EN-US', 'en-gb': 'EN-GB', es: 'ES' };
  const showFlag = (lang: string) => {
    switch (lang) {
      case 'pt-br': return <BrazilFlag className="h-3.5 w-3.5" />;
      case 'pt-pt': return <PortugalFlag className="h-3.5 w-3.5" />;
      case 'en-gb': return <UKFlag className="h-3.5 w-3.5" />;
      case 'en-us': return <USFlag className="h-3.5 w-3.5" />;
      case 'es': return <SpainFlag className="h-3.5 w-3.5" />;
      default: return null;
    }
  };
  const langOrder = ['pt-br', 'pt-pt', 'en-us', 'en-gb', 'es'];

  if (!t || !presentation) {
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
            ? t('bible.downloading', { version: dlVersion.toUpperCase() })
            : 'Preparing...'}
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
        t={t}
      />

      <QuickSearch books={BOOKS} onSelect={(book, ch, verse) => goTo(book, ch ?? 1, verse)} t={t} />

      <header className="flex items-center gap-3 border-b border-border px-4 py-2">
        <h1 className="text-lg font-bold">{t('bible.title')}</h1>

        <div className="ml-auto flex gap-1">
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'browse' | 'search')}>
            <Tabs.TabsList>
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

      <Separator />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-80 shrink-0 flex-col overflow-hidden border-r border-border">
          <div className="flex shrink-0 items-center gap-1 border-b border-border px-1 py-1">
            {displayedTabs.map((id) => (
              <div
                key={id}
                className={cn(
                  "relative flex-1 flex items-center h-7 rounded-md text-xs font-medium transition-colors",
                  version === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <button
                  type="button"
                  onClick={() => setVersion(id)}
                  className="flex-1 h-full text-center"
                >
                  {id.toUpperCase()}
                </button>
                <Popover>
                  <Popover.PopoverTrigger className="absolute right-1 flex items-center">
                    <ChevronDown className="h-3 w-3" />
                  </Popover.PopoverTrigger>
                <Popover.PopoverContent className="w-32 p-0" align="start">
                  <div className="p-1">
                    {localDownloaded.filter((d) => !displayedTabs.includes(d)).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDisplayedTabs((prev) => {
                            const idx = prev.indexOf(id);
                            if (idx < 0) return prev;
                            const next = [...prev];
                            next[idx] = d;
                            return next;
                          });
                        }}
                        className="flex w-full items-center rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        {d.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </Popover.PopoverContent>
              </Popover>
            </div>
            ))}

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
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/50 outline-none"
                    placeholder={t('bible.search') + '...'}
                  />
                  <Select value={filterLang} onValueChange={(v) => setFilterLang(v)}>
                    <Select.SelectTrigger className="w-fit h-fit py-1 flex items-center justify-center">
                      {showFlag(filterLang)}
                    </Select.SelectTrigger>
                    <Select.SelectContent className="min-w-(--anchor-width) w-fit">
                      {langOrder.map((l) => (
                        <Select.SelectItem key={l} value={l} className="flex items-center justify-center pl-2 py-1">
                          {showFlag(l)}
                        </Select.SelectItem>
                      ))}
                    </Select.SelectContent>
                  </Select>
                </div>
                <ScrollArea className="h-72">
                  <div className="p-1">
                    {ALL_VERSIONS.filter((v) => {
                      if (v.language !== filterLang) return false;
                      if (searchQuery) {
                        const q = searchQuery.toLowerCase();
                        return v.name.toLowerCase().includes(q) || v.id.includes(q);
                      }
                      return true;
                    }).map((v) => {
                      const isDownloaded = localDownloaded.includes(v.id);
                      const isCurrent = version === v.id;
                      const isDownloading = downloadingVersions.includes(v.id);
                      const langLabel = langLabels[v.language] || v.language;

                      return (
                        <div
                          key={v.id}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 text-xs",
                            isCurrent ? "bg-accent" : "hover:bg-accent/50"
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
                              onClick={(e) => { e.stopPropagation(); handleSelectVersion(v.id); }}
                              className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                            >
                              <Check className={cn("h-3.5 w-3.5", isCurrent && "text-primary")} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); downloadVersionOnly(v.id); }}
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
          </div>

          <Separator />

          {selectedBook ? (
            <ChapterReader
              version={version}
              book={selectedBook}
              presentation={presentation}
              t={t}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <BookOpen className="h-8 w-8 opacity-30" />
                <span className="text-sm">{t('bible.go-to')}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col p-3">
            {tab === 'browse' ? (
              <ScrollArea className="min-h-0 flex-1">
                <div className="space-y-6">
                  <BookGrid books={BOOKS} onSelect={selectBook} />
                  {selectedBook && (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {selectedBook.name} — {t('bible.chapter')}s
                      </h3>
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1.5">
                        {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map((ch) => (
                          <button
                            key={ch}
                            type="button"
                            onClick={() => setChapter(ch)}
                            className={cn(
                              "flex items-center justify-center rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                              chapter === ch
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            {ch}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <SearchPanel t={t} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
