import { BookOpen, Loader2, Search } from 'lucide-react';
import { getBookList } from '../data/store.js';
import { useBibleStore } from '../store.js';
import { BookGrid } from './BookGrid.js';
import { ChapterReader } from './ChapterReader.js';
import { DownloadProgress } from './DownloadProgress.js';
import { QuickSearch } from './QuickSearch.js';
import { SearchPanel } from './SearchPanel.js';
import { VersionSelector } from './VersionSelector.js';

export function BibleController() {
  const store = useBibleStore();
  const {
    ready,
    downloading,
    dlCurrent,
    dlTotal,
    dlVersion,
    version,
    testament,
    tab,
    selectedBook,
    db,
    net,
    fs,
    presentation,
    t,
    setVersion,
    setTestament,
    setTab,
    selectBook,
    init,
  } = store;

  const books = getBookList();

  if (!t || !db || !net || !fs || !presentation) {
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

      <QuickSearch books={books} onSelect={(book) => selectBook(book)} t={t} />

      <header className="flex items-center gap-3 border-b border-border px-4 py-2">
        <h1 className="text-lg font-bold">{t('bible.title')}</h1>
        <VersionSelector current={version} onChange={setVersion} t={t} />

        <div className="flex gap-1">
          <button
            onClick={() => setTestament('old')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              testament === 'old'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            {t('bible.old-testament')}
          </button>
          <button
            onClick={() => setTestament('new')}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              testament === 'new'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            {t('bible.new-testament')}
          </button>
        </div>

        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setTab('browse')}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              tab === 'browse'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            {t('bible.book')}
          </button>
          <button
            onClick={() => setTab('search')}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              tab === 'search'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            {t('bible.search')}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 flex-shrink-0 overflow-y-auto border-r border-border p-3">
          {tab === 'browse' ? (
            <BookGrid books={books} testament={testament} onSelect={selectBook} />
          ) : (
            <SearchPanel db={db} version={version} t={t} />
          )}
        </div>

        <div className="flex-1 overflow-hidden">
          {selectedBook ? (
            <ChapterReader
              db={db}
              version={version}
              book={selectedBook}
              presentation={presentation}
              t={t}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <BookOpen className="h-8 w-8 opacity-30" />
                <span className="text-sm">{t('bible.go-to')}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
