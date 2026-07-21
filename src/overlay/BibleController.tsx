import { BookOpen, Check, Download, Loader2, Search } from 'lucide-react';
import { ScrollArea, Separator, Tabs } from '@lumen-media/module-sdk/ui';
import { BOOKS } from '../data/store.js';
import { useBibleStore } from '../store.js';
import { BookGrid } from './BookGrid.js';
import { ChapterReader } from './ChapterReader.js';
import { DownloadProgress } from './DownloadProgress.js';
import { QuickSearch } from './QuickSearch.js';
import { SearchPanel } from './SearchPanel.js';

const VERSION_OPTIONS = [
  { id: 'naa', name: 'Nova Almeida Atualizada', short: 'NAA' },
  { id: 'ara', name: 'Almeida Revista e Atualizada', short: 'ARA' },
  { id: 'nvi', name: 'Nova Versão Internacional', short: 'NVI' },
];

export function BibleController() {
  const {
    ready,
    downloading,
    dlCurrent,
    dlTotal,
    dlVersion,
    version,
    tab,
    selectedBook,
    presentation,
    t,
    setVersion,
    setTab,
    selectBook,
  } = useBibleStore();

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

      <QuickSearch books={BOOKS} onSelect={(book) => selectBook(book)} t={t} />

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
        <div className="flex w-80 h-dvh shrink-0 flex-col overflow-hidden border-r border-border">
          {/* version tabs */}
          <div className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-2">
            {VERSION_OPTIONS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVersion(v.id)}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${version === v.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
              >
                {v.short}
                {version === v.id && <Check className="h-3 w-3" />}
              </button>
            ))}
            <button
              type="button"
              className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              title={t('bible.manage-versions')}
            >
              <Download className="h-3.5 w-3.5" />
            </button>
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

        <ScrollArea className="flex-1 p-3">
          {tab === 'browse' ? (
            <BookGrid books={BOOKS} onSelect={selectBook} />
          ) : (
            <SearchPanel t={t} />
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
