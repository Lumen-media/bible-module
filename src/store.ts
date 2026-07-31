import type {
  BusAPI,
  DataAPI,
  FontsAPI,
  FsAPI,
  NetAPI,
  PresentationHostAPI,
  SelectedBackground,
  SqliteHandle,
  ThemesHostAPI,
  UIAPI,
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
  setVersesPerPage as persistVersesPerPage,
  setDownloadedVersions,
  setLastPosition,
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
  themes: ThemesHostAPI | null;
  ui: UIAPI | null;
  fonts: FontsAPI | null;
  events: BusAPI | null;
  hostWindow: 'main' | 'presenter' | 'surface' | null;

  ready: boolean;
  downloading: boolean;
  dlCurrent: number;
  dlTotal: number;
  dlVersion: string;
  downloadingVersion: string | null;
  downloadingVersions: string[];

  version: string;
  testament: 'old' | 'new';
  tab: 'browse' | 'search';
  selectedBook: Book | null;
  chapter: number;

  verses: { number: number; text: string }[] | null;
  versesLoading: boolean;
  versesPerPage: number;
  selectedVerse: number | null;

  background: SelectedBackground | null;
  profileBackground: { type: string; src: string; name: string } | null;
  fontList: string[];
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  displayedTabs: string[];

  uppercase: boolean;
  showReferenceOnly: boolean;
  showVersion: boolean;
  abbreviatedBooks: boolean;
  fontColor: string;

  projectedData: {
    version: string;
    book: string;
    bookName: string;
    chapter: number;
    verses: number[];
    text: string;
    uppercase: boolean;
    showReferenceOnly: boolean;
    showVersion: boolean;
    abbreviatedBooks: boolean;
    fontColor: string;
  } | null;
}

export interface BibleActions {
  init: (services: {
    fs: FsAPI;
    net: NetAPI;
    json: DataAPI['json'];
    sqlite: () => Promise<SqliteHandle>;
    presentation: PresentationHostAPI;
    themes: ThemesHostAPI;
    ui: UIAPI;
    fonts: FontsAPI;
    t: TFunction;
    events: BusAPI;
    hostWindow: 'main' | 'presenter' | 'surface';
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
  downloadVersionOnly: (versionId: string) => Promise<void>;
  removeVersion: (versionId: string) => Promise<void>;
  downloadedVersions: () => Promise<string[]>;
  setBackground: (bg: SelectedBackground | null) => void;
  pickBackground: () => void;
  setFontSize: (n: number) => void;
  setFontFamily: (f: string) => void;
  setFontWeight: (w: string) => void;
  setFontStyle: (s: string) => void;
  setDisplayedTabs: (tabs: string[]) => void;
  setUppercase: (v: boolean) => void;
  setShowReferenceOnly: (v: boolean) => void;
  setShowVersion: (v: boolean) => void;
  setAbbreviatedBooks: (v: boolean) => void;
  setFontColor: (c: string) => void;
  loadFonts: () => Promise<void>;
  setProjectedData: (
    data: {
      version: string;
      book: string;
      bookName: string;
      chapter: number;
      verses: number[];
      text: string;
    } | null
  ) => void;
  clearProjection: () => void;
}

export type BibleStore = BibleState & BibleActions;

const DEFAULT_VERSIONS_BY_LOCALE: Record<string, string[]> = {
  'pt-BR': ['naa', 'ara', 'nvi'],
  'pt-pt': ['bpt', 'naa', 'nvi'],
  'en-us': ['en_kjv', 'niv', 'nlt'],
  'en-gb': ['en_kjv', 'web', 'ylt'],
  en: ['en_kjv', 'niv', 'nlt'],
  es: ['es_rvr', 'rvr1960', 'ntv'],
};

function getDefaultVersions(locale?: string): string[] {
  if (!locale) return DEFAULT_VERSIONS_BY_LOCALE['pt-BR'];
  const exact = DEFAULT_VERSIONS_BY_LOCALE[locale];
  if (exact) return exact;
  const lower = locale.toLowerCase();
  const lowerMatch = DEFAULT_VERSIONS_BY_LOCALE[lower];
  if (lowerMatch) return lowerMatch;
  const prefix = lower.startsWith('pt-pt')
    ? 'pt-pt'
    : lower.startsWith('pt')
      ? 'pt-BR'
      : lower.startsWith('en-gb')
        ? 'en-gb'
        : lower.startsWith('en')
          ? 'en'
          : lower.startsWith('es')
            ? 'es'
            : 'pt-BR';
  return DEFAULT_VERSIONS_BY_LOCALE[prefix] ?? DEFAULT_VERSIONS_BY_LOCALE['pt-BR'];
}

export const useBibleStore = create<BibleStore>((set, get) => ({
  fs: null,
  net: null,
  json: null,
  sqlite: null,
  presentation: null,
  t: null,
  themes: null,
  ui: null,
  fonts: null,
  events: null,
  hostWindow: null,

  ready: false,
  downloading: false,
  dlCurrent: 0,
  dlTotal: 0,
  dlVersion: '',
  downloadingVersion: null,
  downloadingVersions: [],

  version: 'naa',
  testament: 'old',
  tab: 'browse',
  selectedBook: null,
  chapter: 1,
  verses: null,
  versesLoading: false,
  versesPerPage: 1,
  selectedVerse: null,
  background: null,
  profileBackground: null,
  fontList: ['Inter', 'Georgia', 'Times New Roman', 'Arial', 'Verdana'],
  fontSize: 36,
  fontFamily: 'Inter',
  fontWeight: 'Medium',
  fontStyle: 'Normal',
  displayedTabs: [],
  uppercase: false,
  showReferenceOnly: false,
  showVersion: true,
  abbreviatedBooks: false,
  fontColor: '#FFFFFF',

  projectedData: null,

  init: async (services) => {
    const { fs, net, json, presentation, themes, ui, fonts, t, events, hostWindow } = services;
    set({ fs, net, json, presentation, themes, ui, fonts, t, events, hostWindow });

    const db = await services.sqlite();
    set({ sqlite: db });
    if (hostWindow === 'main') {
      await initDatabase(db);
    }

    if (hostWindow === 'main') {
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
    }

    const downloadedList = await getDownloadedVersions(json);

    const lastPos = await getLastPosition(json);

    const vpp = await getVersesPerPage(json);

    let restoredBg: SelectedBackground | null = null;
    let restoredFontSize = 36;
    let restoredFontFamily = 'Inter';
    let restoredFontWeight = 'Medium';
    let restoredFontStyle = 'Normal';
    let restoredDisplayedTabs: string[] | undefined;
    let restoredVersion: string | undefined;
    let restoredUppercase: boolean | undefined;
    let restoredShowReferenceOnly: boolean | undefined;
    let restoredShowVersion: boolean | undefined;
    let restoredAbbreviatedBooks: boolean | undefined;
    let restoredFontColor: string | undefined;
    try {
      const s = await json.get<{
        background: SelectedBackground | null;
        fontSize: number;
        fontFamily: string;
        fontWeight: string;
        fontStyle: string;
        displayedTabs?: string[];
        version?: string;
        uppercase?: boolean;
        showReferenceOnly?: boolean;
        showVersion?: boolean;
        abbreviatedBooks?: boolean;
        fontColor?: string;
      }>('bibleSettings');
      if (s?.background) restoredBg = s.background;
      if (s?.fontSize) restoredFontSize = s.fontSize;
      if (s?.fontFamily) restoredFontFamily = s.fontFamily;
      if (s?.fontWeight) restoredFontWeight = s.fontWeight;
      if (s?.fontStyle) restoredFontStyle = s.fontStyle;
      if (s?.displayedTabs) restoredDisplayedTabs = s.displayedTabs;
      if (s?.version) restoredVersion = s.version;
      if (s?.uppercase != null) restoredUppercase = s.uppercase;
      if (s?.showReferenceOnly != null) restoredShowReferenceOnly = s.showReferenceOnly;
      if (s?.showVersion != null) restoredShowVersion = s.showVersion;
      if (s?.abbreviatedBooks != null) restoredAbbreviatedBooks = s.abbreviatedBooks;
      if (s?.fontColor != null) restoredFontColor = s.fontColor;
    } catch {}

    let profileBg: SelectedBackground | { src: string; type: string; name: string } | null =
      themes.defaultBackground();
    if (!profileBg) {
      try {
        profileBg = await json.get<{ src: string; type: string; name: string } | null>(
          'profileBackground'
        );
      } catch {}
    } else {
      json.set('profileBackground', profileBg).catch(() => {});
    }

    let cachedFonts: string[] = [];
    try {
      const f = await json.get<string[]>('bibleFonts');
      if (f && f.length > 0) cachedFonts = f;
    } catch {}

    const pending: Partial<BibleState> = {};

    if (restoredVersion && downloadedList.includes(restoredVersion)) {
      pending.version = restoredVersion;
    } else if (downloadedList.length > 0) {
      pending.version = downloadedList[0];
    }

    if (restoredDisplayedTabs) {
      const valid = restoredDisplayedTabs.filter((id) => downloadedList.includes(id));
      if (valid.length > 0) {
        pending.displayedTabs = valid;
      }
    }

    if (!pending.displayedTabs || pending.displayedTabs.length === 0) {
      const defaults = getDefaultVersions(navigator.language);
      pending.displayedTabs = defaults.filter((id) => downloadedList.includes(id)).slice(0, 3);
      if (pending.displayedTabs.length === 0) {
        pending.displayedTabs = downloadedList.slice(0, 3);
      }
    }

    let needsChapterLoad: { bookId: string; chapter: number; verse?: number } | null = null;
    if (lastPos) {
      const book = BOOKS.find((b) => b.id === lastPos.bookId);
      if (book && lastPos.chapter >= 1 && lastPos.chapter <= book.chapters) {
        pending.selectedBook = book;
        pending.chapter = lastPos.chapter;
        pending.selectedVerse = lastPos.verse ?? 1;
        needsChapterLoad = lastPos;
      }
    }

    pending.versesPerPage = vpp;
    if (restoredBg) pending.background = restoredBg;
    pending.fontSize = restoredFontSize;
    pending.fontFamily = restoredFontFamily;
    pending.fontWeight = restoredFontWeight;
    pending.fontStyle = restoredFontStyle;
    if (restoredUppercase != null) pending.uppercase = restoredUppercase;
    if (restoredShowReferenceOnly != null) pending.showReferenceOnly = restoredShowReferenceOnly;
    if (restoredShowVersion != null) pending.showVersion = restoredShowVersion;
    if (restoredAbbreviatedBooks != null) pending.abbreviatedBooks = restoredAbbreviatedBooks;
    if (restoredFontColor != null) pending.fontColor = restoredFontColor;
    if (profileBg) pending.profileBackground = profileBg as SelectedBackground;

    if (cachedFonts.length > 0) {
      pending.fontList = [
        ...new Set([
          restoredFontFamily,
          ...cachedFonts,
          'Inter',
          'Georgia',
          'Times New Roman',
          'Arial',
        ]),
      ];
    }

    pending.ready = true;

    set(pending);

    if (needsChapterLoad) {
      get().loadChapter(needsChapterLoad.bookId, needsChapterLoad.chapter);
    }

    if (hostWindow === 'main') {
      get().loadFonts();
    }

    const themesExt = themes as ThemesHostAPI & {
      onDefaultBackgroundChange?: (
        handler: (bg: { src: string; type: string; name: string } | null) => void
      ) => { dispose(): void };
    };
    themesExt.onDefaultBackgroundChange?.((bg) => {
      set({ profileBackground: bg });
      if (bg) json.set('profileBackground', bg).catch(() => {});
    });
  },

  setVersion: async (version) => {
    const {
      selectedBook,
      chapter,
      json,
      background,
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      displayedTabs,
      uppercase,
      showReferenceOnly,
      showVersion,
      abbreviatedBooks,
      fontColor,
    } = get();
    set({ version, verses: null });
    if (json) {
      json
        .set('bibleSettings', {
          background,
          fontSize,
          fontFamily,
          fontWeight,
          fontStyle,
          displayedTabs,
          version,
          uppercase,
          showReferenceOnly,
          showVersion,
          abbreviatedBooks,
          fontColor,
        })
        .catch(() => {});
    }
    if (selectedBook) {
      get().loadChapter(selectedBook.id, chapter);
    }
  },

  setTestament: (testament) => set({ testament }),

  setTab: (tab) => set({ tab }),

  selectBook: (book) => {
    const { json } = get();
    set({ selectedBook: book, chapter: 1, verses: null, selectedVerse: 1 });
    get().loadChapter(book.id, 1);
    if (json) {
      setLastPosition(json, { bookId: book.id, chapter: 1, verse: 1 });
    }
  },

  setChapter: (chapter) => {
    const { selectedBook, json } = get();
    if (!selectedBook) return;
    set({ chapter, verses: null, selectedVerse: 1 });
    get().loadChapter(selectedBook.id, chapter);
    if (json) {
      setLastPosition(json, { bookId: selectedBook.id, chapter, verse: 1 });
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
    const v = verse ?? 1;
    set({ selectedBook: book, chapter, verses: null, selectedVerse: v });
    get().loadChapter(book.id, chapter);
    if (json) {
      setLastPosition(json, { bookId: book.id, chapter, verse: v });
    }
  },

  setSelectedVerse: (verse) => {
    const { json, selectedBook, chapter } = get();
    set({ selectedVerse: verse });
    if (json && selectedBook && verse) {
      setLastPosition(json, { bookId: selectedBook.id, chapter, verse });
    }
  },

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
    set({ version: versionId, verses: null });
    get().downloadVersionOnly(versionId);
  },

  downloadVersionOnly: async (versionId) => {
    const { fs, net, json, sqlite } = get();
    if (!fs || !net || !json || !sqlite) return;

    const already = get().downloadingVersions;
    if (already.includes(versionId)) return;
    set({ downloadingVersions: [...already, versionId] });

    try {
      const db = sqlite;
      await downloadVersion(
        fs,
        net,
        versionId,
        (current) => {
          set({ dlCurrent: current, dlTotal: 66 });
        },
        async (bookId, chapter, verses) => {
          await insertChapterBatch(
            db,
            versionId,
            bookId,
            chapter,
            verses as { number: number; text: string; chapter?: number }[]
          ).catch(() => {});
        }
      );

      const downloaded = await getDownloadedVersions(json);
      if (!downloaded.includes(versionId)) {
        await setDownloadedVersions(json, [...downloaded, versionId]);
      }
    } catch (e) {
      console.error('[bible] download failed:', versionId, e);
    }

    set((s) => ({
      downloadingVersions: s.downloadingVersions.filter((v) => v !== versionId),
      dlCurrent: 0,
      dlTotal: 0,
    }));
  },

  removeVersion: async (versionId) => {
    const { fs, json, sqlite } = get();
    if (!fs || !json) return;

    for (const book of BOOKS) {
      const p = `cache/${versionId}/${book.id}.json`;
      try {
        await fs.remove(p);
      } catch {}
    }

    if (sqlite) {
      try {
        const db = sqlite;
        const { default: database } = await import('./data/database.js');
      } catch {}
    }

    const downloaded = await getDownloadedVersions(json);
    await setDownloadedVersions(
      json,
      downloaded.filter((v) => v !== versionId)
    );

    if (get().version === versionId) {
      set({ version: 'naa', verses: null, selectedBook: null, chapter: 1, selectedVerse: null });
    }
  },

  downloadedVersions: async () => {
    const { json } = get();
    if (!json) return [];
    return getDownloadedVersions(json);
  },

  setBackground: (bg) => {
    const {
      json,
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      displayedTabs,
      version,
      uppercase,
      showReferenceOnly,
      showVersion,
      abbreviatedBooks,
      fontColor,
    } = get();
    set({ background: bg });
    if (json) {
      json
        .set('bibleSettings', {
          background: bg,
          fontSize,
          fontFamily,
          fontWeight,
          fontStyle,
          displayedTabs,
          version,
          uppercase,
          showReferenceOnly,
          showVersion,
          abbreviatedBooks,
          fontColor,
        })
        .catch(() => {});
    }
  },

  pickBackground: () => {
    const { ui } = get();
    if (!ui?.openBackgroundPicker) return;
    ui.openBackgroundPicker((selected) => {
      if (selected) get().setBackground(selected);
    });
  },

  setFontSize: (n) => {
    const {
      json,
      background,
      fontFamily,
      fontWeight,
      fontStyle,
      displayedTabs,
      version,
      uppercase,
      showReferenceOnly,
      showVersion,
      abbreviatedBooks,
      fontColor,
    } = get();
    set({ fontSize: n });
    if (json) {
      json
        .set('bibleSettings', {
          background,
          fontSize: n,
          fontFamily,
          fontWeight,
          fontStyle,
          displayedTabs,
          version,
          uppercase,
          showReferenceOnly,
          showVersion,
          abbreviatedBooks,
          fontColor,
        })
        .catch(() => {});
    }
  },

  setFontFamily: (f) => {
    const {
      json,
      background,
      fontSize,
      fontWeight,
      fontStyle,
      displayedTabs,
      version,
      uppercase,
      showReferenceOnly,
      showVersion,
      abbreviatedBooks,
      fontColor,
    } = get();
    set({ fontFamily: f });
    if (json) {
      json
        .set('bibleSettings', {
          background,
          fontSize,
          fontFamily: f,
          fontWeight,
          fontStyle,
          displayedTabs,
          version,
          uppercase,
          showReferenceOnly,
          showVersion,
          abbreviatedBooks,
          fontColor,
        })
        .catch(() => {});
    }
  },

  setFontWeight: (w) => {
    const {
      json,
      background,
      fontSize,
      fontFamily,
      fontStyle,
      displayedTabs,
      version,
      uppercase,
      showReferenceOnly,
      showVersion,
      abbreviatedBooks,
      fontColor,
    } = get();
    set({ fontWeight: w });
    if (json) {
      json
        .set('bibleSettings', {
          background,
          fontSize,
          fontFamily,
          fontWeight: w,
          fontStyle,
          displayedTabs,
          version,
          uppercase,
          showReferenceOnly,
          showVersion,
          abbreviatedBooks,
          fontColor,
        })
        .catch(() => {});
    }
  },

  setFontStyle: (s) => {
    const {
      json,
      background,
      fontSize,
      fontFamily,
      fontWeight,
      displayedTabs,
      version,
      uppercase,
      showReferenceOnly,
      showVersion,
      abbreviatedBooks,
      fontColor,
    } = get();
    set({ fontStyle: s });
    if (json) {
      json
        .set('bibleSettings', {
          background,
          fontSize,
          fontFamily,
          fontWeight,
          fontStyle: s,
          displayedTabs,
          version,
          uppercase,
          showReferenceOnly,
          showVersion,
          abbreviatedBooks,
          fontColor,
        })
        .catch(() => {});
    }
  },

  setDisplayedTabs: (tabs) => {
    const {
      json,
      background,
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      version,
      uppercase,
      showReferenceOnly,
      showVersion,
      abbreviatedBooks,
      fontColor,
    } = get();
    set({ displayedTabs: tabs });
    if (json) {
      json
        .set('bibleSettings', {
          background,
          fontSize,
          fontFamily,
          fontWeight,
          fontStyle,
          displayedTabs: tabs,
          version,
          uppercase,
          showReferenceOnly,
          showVersion,
          abbreviatedBooks,
          fontColor,
        })
        .catch(() => {});
    }
  },

  setUppercase: (v) => {
    const {
      json,
      background,
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      displayedTabs,
      version,
      showReferenceOnly,
      showVersion,
      abbreviatedBooks,
      fontColor,
    } = get();
    set({ uppercase: v });
    if (json) {
      json
        .set('bibleSettings', {
          background,
          fontSize,
          fontFamily,
          fontWeight,
          fontStyle,
          displayedTabs,
          version,
          uppercase: v,
          showReferenceOnly,
          showVersion,
          abbreviatedBooks,
          fontColor,
        })
        .catch(() => {});
    }
  },

  setShowReferenceOnly: (v) => {
    const {
      json,
      background,
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      displayedTabs,
      version,
      uppercase,
      showVersion,
      abbreviatedBooks,
      fontColor,
    } = get();
    set({ showReferenceOnly: v });
    if (json) {
      json
        .set('bibleSettings', {
          background,
          fontSize,
          fontFamily,
          fontWeight,
          fontStyle,
          displayedTabs,
          version,
          uppercase,
          showReferenceOnly: v,
          showVersion,
          abbreviatedBooks,
          fontColor,
        })
        .catch(() => {});
    }
  },

  setShowVersion: (v) => {
    const {
      json,
      background,
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      displayedTabs,
      version,
      uppercase,
      showReferenceOnly,
      abbreviatedBooks,
      fontColor,
    } = get();
    set({ showVersion: v });
    if (json) {
      json
        .set('bibleSettings', {
          background,
          fontSize,
          fontFamily,
          fontWeight,
          fontStyle,
          displayedTabs,
          version,
          uppercase,
          showReferenceOnly,
          showVersion: v,
          abbreviatedBooks,
          fontColor,
        })
        .catch(() => {});
    }
  },

  setAbbreviatedBooks: (v) => {
    const {
      json,
      background,
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      displayedTabs,
      version,
      uppercase,
      showReferenceOnly,
      showVersion,
      fontColor,
    } = get();
    set({ abbreviatedBooks: v });
    if (json) {
      json
        .set('bibleSettings', {
          background,
          fontSize,
          fontFamily,
          fontWeight,
          fontStyle,
          displayedTabs,
          version,
          uppercase,
          showReferenceOnly,
          showVersion,
          abbreviatedBooks: v,
          fontColor,
        })
        .catch(() => {});
    }
  },

  setFontColor: (c) => {
    const {
      json,
      background,
      fontSize,
      fontFamily,
      fontWeight,
      fontStyle,
      displayedTabs,
      version,
      uppercase,
      showReferenceOnly,
      showVersion,
      abbreviatedBooks,
    } = get();
    set({ fontColor: c });
    if (json) {
      json
        .set('bibleSettings', {
          background,
          fontSize,
          fontFamily,
          fontWeight,
          fontStyle,
          displayedTabs,
          version,
          uppercase,
          showReferenceOnly,
          showVersion,
          abbreviatedBooks,
          fontColor: c,
        })
        .catch(() => {});
    }
  },

  loadFonts: async () => {
    const { fonts, json, hostWindow } = get();
    if (!fonts) return;
    try {
      const system = await fonts.list();
      if (system.length > 0) {
        set((s) => ({
          fontList: [
            ...new Set([s.fontFamily, ...system, 'Inter', 'Georgia', 'Times New Roman', 'Arial']),
          ],
        }));
        if (json) json.set('bibleFonts', system).catch(() => {});
        return;
      }
    } catch {}
    if (hostWindow === 'main' || !json) return;
    const startTime = Date.now();
    while (Date.now() - startTime < 3000) {
      try {
        const cached = await json.get<string[]>('bibleFonts');
        if (cached && cached.length > 0) {
          set((s) => ({
            fontList: [
              ...new Set([s.fontFamily, ...cached, 'Inter', 'Georgia', 'Times New Roman', 'Arial']),
            ],
          }));
          return;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
    }
  },

  setProjectedData: (data) => set({ projectedData: data }),

  clearProjection: () => {
    const { presentation, projectedData } = get();
    if (!projectedData) return;
    const p = presentation;
    set({ projectedData: null });
    p?.clear();
  },
}));
