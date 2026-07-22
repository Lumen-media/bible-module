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

export const ALL_VERSIONS = [
  { id: 'naa', name: 'Nova Almeida Atualizada', language: 'pt-br' },
  { id: 'ara', name: 'Almeida Revista e Atualizada', language: 'pt-br' },
  { id: 'nvi', name: 'Nova Versão Internacional', language: 'pt-br' },
  { id: 'acf', name: 'Almeida Corrigida e Fiel', language: 'pt-br' },
  { id: 'arc', name: 'Almeida Revista e Corrigida', language: 'pt-br' },
  { id: 'as21', name: 'Almeida Século 21', language: 'pt-br' },
  { id: 'jfaa', name: 'João Ferreira de Almeida Atualizada', language: 'pt-br' },
  { id: 'kja', name: 'King James Atualizada', language: 'pt-br' },
  { id: 'kjf', name: 'King James Fiel', language: 'pt-br' },
  { id: 'mens', name: 'A Mensagem', language: 'pt-br' },
  { id: 'nbv', name: 'Nova Bíblia Viva', language: 'pt-br' },
  { id: 'ntlh', name: 'Nova Tradução na Linguagem de Hoje', language: 'pt-br' },
  { id: 'nvt', name: 'Nova Versão Transformadora', language: 'pt-br' },
  { id: 'ol', name: 'O Livro', language: 'pt-br' },
  { id: 'tb', name: 'Tradução Brasileira', language: 'pt-br' },
  { id: 'vfl', name: 'Versão Fácil de Ler', language: 'pt-br' },
  { id: 'blivre', name: 'Bíblia Livre', language: 'pt-br' },
  { id: 'alm1911', name: 'Almeida 1911', language: 'pt-br' },
  { id: 'bpt', name: 'Bíblia para Todos', language: 'pt-pt' },
  { id: 'en_kjv', name: 'King James Version', language: 'en-gb' },
  { id: 'en_bbe', name: 'Bible in Basic English', language: 'en-gb' },
  { id: 'asv', name: 'American Standard Version', language: 'en-us' },
  { id: 'bbe', name: 'Bible in Basic English', language: 'en-gb' },
  { id: 'dra', name: 'Douay-Rheims', language: 'en-gb' },
  { id: 'esv', name: 'English Standard Version', language: 'en-us' },
  { id: 'geneva1599', name: 'Geneva Bible 1599', language: 'en-gb' },
  { id: 'kjv', name: 'King James Version', language: 'en-gb' },
  { id: 'msg', name: 'The Message', language: 'en-us' },
  { id: 'niv', name: 'New International Version', language: 'en-us' },
  { id: 'nkjv', name: 'New King James Version', language: 'en-us' },
  { id: 'nlt', name: 'New Living Translation', language: 'en-us' },
  { id: 'web', name: 'World English Bible', language: 'en-us' },
  { id: 'ylt', name: "Young's Literal Translation", language: 'en-gb' },
  { id: 'es_rvr', name: 'Reina Valera', language: 'es' },
  { id: 'ntv', name: 'Nueva Traducción Viviente', language: 'es' },
  { id: 'nvies', name: 'Nueva Versión Internacional', language: 'es' },
  { id: 'rvg', name: 'Reina Valera Gómez', language: 'es' },
  { id: 'rvr1909', name: 'Reina Valera 1909', language: 'es' },
  { id: 'rvr1960', name: 'Reina Valera 1960', language: 'es' },
];

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
  downloadingVersion: string | null;

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
  ) => Promise<{ version: string; book: string; chapter: number; verse: number; text: string }[]>;
  downloadAndSetVersion: (versionId: string) => Promise<void>;
  removeVersion: (versionId: string) => Promise<void>;
  downloadedVersions: () => Promise<string[]>;
}

export type BibleStore = BibleState & BibleActions;

const DEFAULT_VERSIONS_BY_LOCALE: Record<string, string[]> = {
  'pt-BR': ['naa', 'ara', 'nvi'],
  'pt-pt': ['bpt', 'naa', 'nvi'],
  'en-us': ['en_kjv', 'niv', 'nlt'],
  'en-gb': ['en_kjv', 'web', 'ylt'],
  'en': ['en_kjv', 'niv', 'nlt'],
  'es': ['es_rvr', 'rvr1960', 'ntv'],
};

function getDefaultVersions(locale?: string): string[] {
  if (!locale) return DEFAULT_VERSIONS_BY_LOCALE['pt-BR'];
  const exact = DEFAULT_VERSIONS_BY_LOCALE[locale];
  if (exact) return exact;
  const lower = locale.toLowerCase();
  const lowerMatch = DEFAULT_VERSIONS_BY_LOCALE[lower];
  if (lowerMatch) return lowerMatch;
  const prefix = lower.startsWith('pt-pt') ? 'pt-pt' : lower.startsWith('pt') ? 'pt-BR' : lower.startsWith('en-gb') ? 'en-gb' : lower.startsWith('en') ? 'en' : lower.startsWith('es') ? 'es' : 'pt-BR';
  return DEFAULT_VERSIONS_BY_LOCALE[prefix] ?? DEFAULT_VERSIONS_BY_LOCALE['pt-BR'];
}

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
  downloadingVersion: null,

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
      getDefaultVersions(navigator.language).map(async (v) => {
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
    set({ selectedBook: book, chapter: 1, verses: null, selectedVerse: null });
    get().loadChapter(book.id, 1);
  },

  setChapter: (chapter) => {
    const { selectedBook, json } = get();
    if (!selectedBook) return;
    set({ chapter, verses: null, selectedVerse: null });
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
    const { sqlite, json } = get();
    if (!sqlite || !query.trim()) return [];

    const downloaded = await getDownloadedVersions(json!);

    const results = await searchVerses(sqlite, query, downloaded);
    const bookMap = new Map(BOOKS.map((b) => [b.id, b]));

    return results.map((r) => ({
      ...r,
      book: bookMap.get(r.book)?.name ?? r.book,
    }));
  },

  downloadAndSetVersion: async (versionId) => {
    const { fs, net, json, sqlite } = get();
    if (!fs || !net || !json || !sqlite || get().downloadingVersion) return;

    set({ downloadingVersion: versionId, version: versionId, verses: null });

    try {
      const db = sqlite;
      await downloadVersion(fs, net, versionId, (current) => {
        set({ dlCurrent: current, dlTotal: 66 });
      }, async (bookId, chapter, verses) => {
        await insertChapterBatch(db, versionId, bookId, chapter, verses).catch(() => {});
      });
    } catch (e) {
      console.error('[bible] download failed:', versionId, e);
    }

    const downloaded = await getDownloadedVersions(json);
    if (!downloaded.includes(versionId)) {
      await setDownloadedVersions(json, [...downloaded, versionId]);
    }

    set({ downloadingVersion: null, dlCurrent: 0, dlTotal: 0 });
  },

  removeVersion: async (versionId) => {
    const { fs, json, sqlite } = get();
    if (!fs || !json) return;

    for (const book of BOOKS) {
      const p = `cache/${versionId}/${book.id}.json`;
      try { await fs.remove(p); } catch {}
    }

    if (sqlite) {
      try {
        const db = sqlite;
        const { default: database } = await import('./data/database.js');
      } catch {}
    }

    const downloaded = await getDownloadedVersions(json);
    await setDownloadedVersions(json, downloaded.filter((v) => v !== versionId));

    if (get().version === versionId) {
      set({ version: 'naa', verses: null, selectedBook: null, chapter: 1, selectedVerse: null });
    }
  },

  downloadedVersions: async () => {
    const { json } = get();
    if (!json) return [];
    return getDownloadedVersions(json);
  },
}));
