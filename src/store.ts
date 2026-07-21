import type {
  DataAPI,
  FsAPI,
  NetAPI,
  PresentationHostAPI,
  SqliteHandle,
} from '@lumen-media/module-sdk';
import { create } from 'zustand';
import {
  getChapterFromDb,
  importVersionFromJson,
  initDatabase,
  insertChapterBatch,
  isVersionPopulated,
  searchVerses,
} from './data/database.js';
import { downloadVersion, hasAnyCache } from './data/downloader.js';
import {
  BOOKS,
  getDownloadedVersions,
  getLastPosition,
  getVersesPerPage,
  setDownloadedVersions,
  setLastPosition,
  setVersesPerPage as persistVersesPerPage,
} from './data/store.js';
import type { Book } from './data/types.js';
import type { TFunction } from './i18n.js';

export interface BibleState {
  fs: FsAPI | null;
  net: NetAPI | null;
  json: DataAPI['json'] | null;
  sqlite: SqliteHandle | null;
  presentation: PresentationHostAPI | null;
  t: TFunction | null;

  ready: boolean;
  downloading: boolean;
  dlCurrent: number;
  dlTotal: number;
  dlVersion: string;

  version: string;
  testament: 'old' | 'new';
  tab: 'browse' | 'search';
  selectedBook: Book | null;
  chapter: number;

  verses: { number: number; text: string }[] | null;
  versesLoading: boolean;
  versesPerPage: number;
  selectedVerse: number | null;
}

export interface BibleActions {
  init: (services: {
    fs: FsAPI;
    net: NetAPI;
    json: DataAPI['json'];
    sqlite: () => Promise<SqliteHandle>;
    presentation: PresentationHostAPI;
    t: TFunction;
  }) => Promise<void>;
  setVersion: (v: string) => Promise<void>;
  setTestament: (t: 'old' | 'new') => void;
  setTab: (t: 'browse' | 'search') => void;
  selectBook: (book: Book) => void;
  setChapter: (chapter: number) => void;
  setVersesPerPage: (n: number) => Promise<void>;
  goTo: (book: Book, chapter: number, verse?: number) => void;
  setSelectedVerse: (verse: number | null) => void;
  loadChapter: (book: string, chapter: number) => Promise<void>;
  search: (
    query: string
  ) => Promise<{ book: string; chapter: number; verse: number; text: string }[]>;
}

export type BibleStore = BibleState & BibleActions;

const DEFAULT_VERSIONS = ['naa', 'ara', 'nvi'];

export const useBibleStore = create<BibleStore>((set, get) => ({
  fs: null,
  net: null,
  json: null,
  sqlite: null,
  presentation: null,
  t: null,

  ready: false,
  downloading: false,
  dlCurrent: 0,
  dlTotal: 0,
  dlVersion: '',

  version: 'naa',
  testament: 'old',
  tab: 'browse',
  selectedBook: null,
  chapter: 1,
  verses: null,
  versesLoading: false,
  versesPerPage: 1,
  selectedVerse: null,

  init: async (services) => {
    const { fs, net, json, presentation, t } = services;
    set({ fs, net, json, presentation, t });

    const db = await services.sqlite();
    set({ sqlite: db });
    await initDatabase(db);

    const downloadedFromJson = await getDownloadedVersions(json);

    const needsSqlite: string[] = [];
    const needsDownload: string[] = [];

    await Promise.all(
      DEFAULT_VERSIONS.map(async (v) => {
        if (await isVersionPopulated(db, v)) return;

        const hasJson = await hasAnyCache(fs, v);
        if (hasJson) {
          needsSqlite.push(v);
        } else {
          needsDownload.push(v);
        }
      })
    );

    if (needsSqlite.length > 0 || needsDownload.length > 0) {
      const totalChaptersPerVersion = 1189;
      const totalAll = (needsSqlite.length + needsDownload.length) * totalChaptersPerVersion;
      let globalCurrent = 0;

      const allVersions = [...new Set([...needsSqlite, ...needsDownload])];
      set({
        downloading: true,
        dlCurrent: 0,
        dlTotal: totalAll,
        dlVersion: allVersions.join(', '),
      });

      const newDownloaded = [...downloadedFromJson];

      let lastUpdate = 0;
      const throttledSet = (progress: {
        dlCurrent: number;
        dlTotal: number;
        dlVersion: string;
      }) => {
        const now = Date.now();
        if (now - lastUpdate < 100 && progress.dlCurrent < progress.dlTotal) return;
        lastUpdate = now;
        set(progress);
      };

      await Promise.allSettled(
        allVersions.map(async (v) => {
          const needsDl = needsDownload.includes(v);

          if (needsDl) {
            const ok = await downloadVersion(
              fs,
              net,
              v,
              (current, _total) => {
                throttledSet({
                  dlCurrent: globalCurrent + current,
                  dlTotal: totalAll,
                  dlVersion: v,
                });
              },
              async (book, chapter, verses) => {
                try {
                  await insertChapterBatch(db, v, book, chapter, verses);
                } catch (e) {
                  console.error('[bible] sqlite insert error:', v, book, chapter, e);
                }
              }
            );
            if (!ok) {
              globalCurrent += totalChaptersPerVersion;
              return;
            }
          } else {
            await importVersionFromJson(db, fs, v);
          }

          if (!newDownloaded.includes(v)) {
            newDownloaded.push(v);
          }
          globalCurrent += totalChaptersPerVersion;
        })
      );

      await setDownloadedVersions(json, newDownloaded);
      set({ downloading: false, dlCurrent: 0, dlTotal: 0, dlVersion: '' });
    }

    const lastPos = await getLastPosition(json);
    if (lastPos) {
      const book = BOOKS.find((b) => b.id === lastPos.bookId);
      if (book && lastPos.chapter >= 1 && lastPos.chapter <= book.chapters) {
        set({ selectedBook: book, chapter: lastPos.chapter });
        get().loadChapter(lastPos.bookId, lastPos.chapter);
      }
    }

    const vpp = await getVersesPerPage(json);
    set({ versesPerPage: vpp });

    set({ ready: true });
  },

  setVersion: async (version) => {
    const { selectedBook, chapter } = get();
    set({ version, verses: null });
    if (selectedBook) {
      get().loadChapter(selectedBook.id, chapter);
    }
  },

  setTestament: (testament) => set({ testament }),

  setTab: (tab) => set({ tab }),

  selectBook: (book) => {
    set({ selectedBook: book, chapter: 1, verses: null });
    get().loadChapter(book.id, 1);
  },

  setChapter: (chapter) => {
    const { selectedBook, json } = get();
    if (!selectedBook) return;
    set({ chapter, verses: null });
    get().loadChapter(selectedBook.id, chapter);
    if (json) {
      setLastPosition(json, { bookId: selectedBook.id, chapter });
    }
  },

  setVersesPerPage: async (n) => {
    const { json } = get();
    set({ versesPerPage: n });
    if (json) {
      await persistVersesPerPage(json, n);
    }
  },

  goTo: (book, chapter, verse) => {
    const { json } = get();
    set({ selectedBook: book, chapter, verses: null, selectedVerse: verse ?? null });
    get().loadChapter(book.id, chapter);
    if (json) {
      setLastPosition(json, { bookId: book.id, chapter });
    }
  },

  setSelectedVerse: (verse) => set({ selectedVerse: verse }),

  loadChapter: async (book, chapter) => {
    const { sqlite, version } = get();
    if (!sqlite) return;

    set({ versesLoading: true });
    try {
      const verses = await getChapterFromDb(sqlite, version, book, chapter);
      set({ verses, versesLoading: false });
    } catch {
      set({ verses: null, versesLoading: false });
    }
  },

  search: async (query) => {
    const { sqlite, version } = get();
    if (!sqlite || !query.trim()) return [];

    const results = await searchVerses(sqlite, query, version);
    const bookMap = new Map(BOOKS.map((b) => [b.id, b]));

    return results.map((r) => ({
      ...r,
      book: bookMap.get(r.book)?.name ?? r.book,
    }));
  },
}));
