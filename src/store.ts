import type {
  BusAPI,
  DataAPI,
  FontsAPI,
  FsAPI,
  NetAPI,
  PresentationHostAPI,
  QueueHostAPI,
  SelectedBackground,
  SqliteHandle,
  ThemesHostAPI,
  UIAPI,
} from '@lumen-media/module-sdk';
import { create } from 'zustand';
import {
  clearHistory,
  getChapterFromDb,
  getHistory,
  getPopulatedVersions,
  getSetting,
  getVersionLanguage,
  importVersionFromJson,
  initDatabase,
  insertChapterBatch,
  insertHistory,
  rebuildFts,
  searchVerses,
  setSetting,
  setVersionLanguage,
} from './data/database.js';
import { downloadVersion, hasAnyCache } from './data/downloader.js';
import { persistSettings } from './data/settings-persist.js';
import {
  BOOKS,
  getChapter,
  getDownloadedVersions,
  getLastPosition,
  getSyncedVersions,
  getVersesPerPage,
  setVersesPerPage as persistVersesPerPage,
  setDownloadedVersions,
  setLastPosition,
  setSyncedVersion,
} from './data/store.js';
import type { Book, HistoryEntry } from './data/types.js';
import type { TFunction } from './i18n.js';
import { analyzeBackgroundColor } from './lib/color-analysis.js';

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

export const UPDATED_VERSIONS: string[] = [];

export const BACKGROUND_IMAGE_URL =
  'https://images.unsplash.com/photo-1642022143908-fe7e3160a56e?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

export function staticVersionLanguage(version: string): string {
  return ALL_VERSIONS.find((v) => v.id === version)?.language ?? 'pt-br';
}

let moduleQueue: QueueHostAPI | null = null;

const chapterCache = new Map<string, { number: number; text: string }[] | null>();

export function setModuleQueue(q: QueueHostAPI) {
  moduleQueue = q;
}

export function getModuleQueue(): QueueHostAPI | null {
  return moduleQueue;
}

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
  syncingVersions: string[];
  downloadedVersionList: string[];
  syncedVersions: Record<string, number>;

  version: string;
  testament: 'old' | 'new';
  tab: 'browse' | 'search' | 'favorites' | 'history';
  selectedBook: Book | null;
  versionLanguage: string | null;
  chapter: number;

  verses: { number: number; text: string }[] | null;
  versesLoading: boolean;
  versesPerPage: number;
  selectedVerse: number | null;

  background: SelectedBackground | null;
  profileBackground: { type: string; src: string; name: string; thumb?: string } | null;
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
  autoFontColor: boolean;
  backgroundOpacity: number;
  textAlign: 'left' | 'center' | 'justify';
  lineSpacing: number;
  referencePosition: 'inline' | 'top';
  verseNumberStyle: 'superscript' | 'inline' | 'hidden';

  bookmarks: Set<string>;
  bookmarkTexts: Map<string, string>;
  history: HistoryEntry[];

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
    textAlign: 'left' | 'center' | 'justify';
    lineSpacing: number;
    referencePosition: 'inline' | 'top';
    verseNumberStyle: 'superscript' | 'inline' | 'hidden';
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
  setTab: (t: 'browse' | 'search' | 'favorites' | 'history') => void;
  toggleBookmark: (
    version: string,
    book: string,
    chapter: number,
    verse: number,
    text?: string
  ) => void;
  recordHistory: (
    version: string,
    book: string,
    chapter: number,
    verses: number[],
    text: string
  ) => void;
  clearHistory: () => void;
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
  syncVersion: (versionId: string) => Promise<void>;
  removeVersion: (versionId: string) => Promise<void>;
  downloadedVersions: () => Promise<string[]>;
  getSyncedVersionsState: () => Promise<Record<string, number>>;
  setBackground: (bg: SelectedBackground | null) => void;
  setProfileBackground: (bg: { src: string; type: string; name: string; thumb?: string } | null) => void;
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
  setAutoFontColor: (v: boolean) => void;
  setBackgroundOpacity: (n: number) => void;
  setTextAlign: (a: 'left' | 'center' | 'justify') => void;
  setLineSpacing: (n: number) => void;
  setReferencePosition: (p: 'inline' | 'top') => void;
  setVerseNumberStyle: (s: 'superscript' | 'inline' | 'hidden') => void;
  saveSettings: () => void;
  loadFonts: () => Promise<void>;
  setProjectedData: (
    data: {
      version: string;
      book: string;
      bookName: string;
      chapter: number;
      verses: number[];
      text: string;
      uppercase?: boolean;
      showReferenceOnly?: boolean;
      showVersion?: boolean;
      abbreviatedBooks?: boolean;
      fontColor?: string;
      fontSize?: number;
      fontFamily?: string;
      fontWeight?: string;
      fontStyle?: string;
      textAlign?: 'left' | 'center' | 'justify';
      lineSpacing?: number;
      referencePosition?: 'inline' | 'top';
      background?: SelectedBackground | null;
      profileBackground?: { type: string; src: string; name: string } | null;
      backgroundOpacity?: number;
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

function persistSettingsFromState(state: BibleState) {
  if (!state.json) return;
  persistSettings(state.json, state.sqlite, {
    background: state.background,
    backgroundOpacity: state.backgroundOpacity,
    fontSize: state.fontSize,
    fontFamily: state.fontFamily,
    fontWeight: state.fontWeight,
    fontStyle: state.fontStyle,
    displayedTabs: state.displayedTabs,
    version: state.version,
    uppercase: state.uppercase,
    showReferenceOnly: state.showReferenceOnly,
    showVersion: state.showVersion,
    abbreviatedBooks: state.abbreviatedBooks,
    fontColor: state.fontColor,
    autoFontColor: state.autoFontColor,
    textAlign: state.textAlign,
    lineSpacing: state.lineSpacing,
    referencePosition: state.referencePosition,
    verseNumberStyle: state.verseNumberStyle,
  });
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
  syncingVersions: [],
  downloadedVersionList: [],
  syncedVersions: {},

  version: 'naa',
  testament: 'old',
  tab: 'browse',
  selectedBook: null,
  versionLanguage: null,
  chapter: 1,
  verses: null,
  versesLoading: false,
  versesPerPage: 1,
  selectedVerse: null,
  background: null,
  profileBackground: null,
  fontList: ['Inter', 'Georgia', 'Times New Roman', 'Arial', 'Verdana'],
  fontSize: 70,
  fontFamily: 'Inter',
  fontWeight: 'Medium',
  fontStyle: 'Normal',
  displayedTabs: [],
  uppercase: false,
  showReferenceOnly: false,
  showVersion: true,
  abbreviatedBooks: false,
  fontColor: '#FFFFFF',
  autoFontColor: true,
  backgroundOpacity: 30,
  textAlign: 'center' as const,
  lineSpacing: 1.4,
  referencePosition: 'inline' as const,
  verseNumberStyle: 'superscript' as const,
  bookmarks: new Set<string>(),
  bookmarkTexts: new Map<string, string>(),
  history: [],
  projectedData: null,

  init: async (services) => {
    const { fs, net, json, presentation, themes, ui, fonts, t, events, hostWindow } = services;
    set({
      fs,
      net,
      json,
      presentation,
      themes,
      ui,
      fonts,
      t,
      events,
      hostWindow,
      ready: true,
    });

    const db = await services.sqlite();
    set({ sqlite: db });
    if (hostWindow === 'main') {
      await initDatabase(db);
    }

    const storedHistory = await getHistory(db);

    if (hostWindow === 'main') {
      const [downloadedList, lastPos, vpp, cachedFontsResp, storedBookmarks] = await Promise.all([
        getDownloadedVersions(json),
        getLastPosition(json),
        getVersesPerPage(json),
        json.get<string[]>('bibleFonts').catch(() => [] as string[]),
        json.get<Record<string, string>>('bookmarks').catch(() => ({}) as Record<string, string>),
      ]);

      let settingsResp: {
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
        autoFontColor?: boolean;
        backgroundOpacity?: number;
        textAlign?: 'left' | 'center' | 'justify';
        lineSpacing?: number;
        referencePosition?: 'inline' | 'top';
        verseNumberStyle?: 'superscript' | 'inline' | 'hidden';
      } | null = null;

      const currentDb = get().sqlite;
      if (currentDb) {
        try {
          const raw = await getSetting(currentDb, 'bibleSettings');
          if (raw) settingsResp = JSON.parse(raw);
        } catch {}
      }
      if (!settingsResp) {
        settingsResp = await json.get<typeof settingsResp>('bibleSettings').catch(() => null);
      }

      const s = settingsResp;
      let restoredBg: SelectedBackground | null = null;
      const restoredFontSize = s?.fontSize ?? 70;
      const restoredFontFamily = s?.fontFamily ?? 'Inter';
      const restoredFontWeight = s?.fontWeight ?? 'Medium';
      const restoredFontStyle = s?.fontStyle ?? 'Normal';
      const restoredDisplayedTabs = s?.displayedTabs;
      const restoredVersion = s?.version;
      const restoredUppercase = s?.uppercase;
      const restoredShowReferenceOnly = s?.showReferenceOnly;
      const restoredShowVersion = s?.showVersion;
      const restoredAbbreviatedBooks = s?.abbreviatedBooks;
      const restoredFontColor = s?.fontColor;
      const restoredAutoFontColor = s?.autoFontColor;
      const restoredBackgroundOpacity = s?.backgroundOpacity;
      const restoredTextAlign = s?.textAlign ?? 'center';
      const restoredLineSpacing = s?.lineSpacing ?? 1.4;
      const restoredReferencePosition = s?.referencePosition ?? 'inline';
      const restoredVerseNumberStyle = s?.verseNumberStyle ?? 'superscript';
      if (s?.background) restoredBg = s.background;

      const pending: Partial<BibleState> = {};
      if (downloadedList.length > 0) {
        if (restoredVersion && downloadedList.includes(restoredVersion)) {
          pending.version = restoredVersion;
        } else {
          pending.version = downloadedList[0];
        }
      } else {
        const defaultVersions = getDefaultVersions(navigator.language);
        pending.version = defaultVersions[0];
      }

      if (pending.version) {
        const restoredVersionId = pending.version;
        pending.versionLanguage =
          (await getVersionLanguage(db, restoredVersionId).catch(() => null)) ??
          staticVersionLanguage(restoredVersionId);
      }

      if (restoredDisplayedTabs) {
        const valid = restoredDisplayedTabs.filter((id) => downloadedList.includes(id));
        if (valid.length > 0) {
          pending.displayedTabs = valid;
          if (valid.length < 3) {
            const remaining = downloadedList.filter((id) => !valid.includes(id));
            pending.displayedTabs = [...valid, ...remaining].slice(0, 3);
          }
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
      if (!pending.selectedBook) {
        const firstBook = BOOKS[0];
        pending.selectedBook = firstBook;
        pending.chapter = 1;
        pending.selectedVerse = 1;
        needsChapterLoad = { bookId: firstBook.id, chapter: 1, verse: 1 };
      }

      pending.versesPerPage = vpp;
      pending.downloadedVersionList = downloadedList;
      pending.syncedVersions = getSyncedVersions();
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
      if (restoredAutoFontColor != null) pending.autoFontColor = restoredAutoFontColor;
      if (restoredBackgroundOpacity != null) pending.backgroundOpacity = restoredBackgroundOpacity;
      pending.textAlign = restoredTextAlign;
      pending.lineSpacing = restoredLineSpacing;
      pending.referencePosition = restoredReferencePosition;
      pending.verseNumberStyle = restoredVerseNumberStyle;

      const cachedFonts = cachedFontsResp ?? [];
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

      if (storedBookmarks && Object.keys(storedBookmarks).length > 0) {
        pending.bookmarks = new Set(Object.keys(storedBookmarks));
        pending.bookmarkTexts = new Map(Object.entries(storedBookmarks));
      }

      if (storedHistory.length > 0) {
        pending.history = storedHistory;
      }

      set(pending);

      if (needsChapterLoad) {
        get().loadChapter(needsChapterLoad.bookId, needsChapterLoad.chapter);
      }

      get().loadFonts();
      _backgroundEnsureVersions();
    } else {
      const [downloadedList, lastPos, vpp, storedBookmarks] = await Promise.all([
        getDownloadedVersions(json),
        getLastPosition(json),
        getVersesPerPage(json),
        json.get<Record<string, string>>('bookmarks').catch(() => ({}) as Record<string, string>),
      ]);

      let settingsResp: {
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
        autoFontColor?: boolean;
        backgroundOpacity?: number;
        textAlign?: 'left' | 'center' | 'justify';
        lineSpacing?: number;
        referencePosition?: 'inline' | 'top';
        verseNumberStyle?: 'superscript' | 'inline' | 'hidden';
      } | null = null;

      const currentDb = get().sqlite;
      if (currentDb) {
        try {
          const raw = await getSetting(currentDb, 'bibleSettings');
          if (raw) settingsResp = JSON.parse(raw);
        } catch {}
      }
      if (!settingsResp) {
        settingsResp = await json.get<typeof settingsResp>('bibleSettings').catch(() => null);
      }

      const s = settingsResp;
      let restoredBg: SelectedBackground | null = null;
      const restoredFontSize = s?.fontSize ?? 70;
      const restoredFontFamily = s?.fontFamily ?? 'Inter';
      const restoredFontWeight = s?.fontWeight ?? 'Medium';
      const restoredFontStyle = s?.fontStyle ?? 'Normal';
      const restoredDisplayedTabs = s?.displayedTabs;
      const restoredVersion = s?.version;
      const restoredUppercase = s?.uppercase;
      const restoredShowReferenceOnly = s?.showReferenceOnly;
      const restoredShowVersion = s?.showVersion;
      const restoredAbbreviatedBooks = s?.abbreviatedBooks;
      const restoredFontColor = s?.fontColor;
      const restoredAutoFontColor = s?.autoFontColor;
      const restoredBackgroundOpacity = s?.backgroundOpacity;
      const restoredTextAlign = s?.textAlign ?? 'center';
      const restoredLineSpacing = s?.lineSpacing ?? 1.4;
      const restoredReferencePosition = s?.referencePosition ?? 'inline';
      const restoredVerseNumberStyle = s?.verseNumberStyle ?? 'superscript';
      if (s?.background) restoredBg = s.background;

      let cachedFonts: string[] = [];
      try {
        const f = await json.get<string[]>('bibleFonts');
        if (f && f.length > 0) cachedFonts = f;
      } catch {}

      const pending: Partial<BibleState> = {};

      if (downloadedList.length > 0) {
        if (restoredVersion && downloadedList.includes(restoredVersion)) {
          pending.version = restoredVersion;
        } else {
          pending.version = downloadedList[0];
        }
      } else {
        const defaultVersions = getDefaultVersions(navigator.language);
        pending.version = defaultVersions[0];
      }

      if (pending.version) {
        const restoredVersionId = pending.version;
        pending.versionLanguage =
          (await getVersionLanguage(db, restoredVersionId).catch(() => null)) ??
          staticVersionLanguage(restoredVersionId);
      }

      if (restoredDisplayedTabs) {
        const valid = restoredDisplayedTabs.filter((id) => downloadedList.includes(id));
        if (valid.length > 0) {
          pending.displayedTabs = valid;
          if (valid.length < 3) {
            const remaining = downloadedList.filter((id) => !valid.includes(id));
            pending.displayedTabs = [...valid, ...remaining].slice(0, 3);
          }
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
      if (!pending.selectedBook) {
        const firstBook = BOOKS[0];
        pending.selectedBook = firstBook;
        pending.chapter = 1;
        pending.selectedVerse = 1;
        needsChapterLoad = { bookId: firstBook.id, chapter: 1, verse: 1 };
      }

      pending.versesPerPage = vpp;
      pending.downloadedVersionList = downloadedList;
      pending.syncedVersions = getSyncedVersions();
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
      if (restoredAutoFontColor != null) pending.autoFontColor = restoredAutoFontColor;
      if (restoredBackgroundOpacity != null) pending.backgroundOpacity = restoredBackgroundOpacity;
      pending.textAlign = restoredTextAlign;
      pending.lineSpacing = restoredLineSpacing;
      pending.referencePosition = restoredReferencePosition;
      pending.verseNumberStyle = restoredVerseNumberStyle;

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

      if (storedBookmarks && Object.keys(storedBookmarks).length > 0) {
        pending.bookmarks = new Set(Object.keys(storedBookmarks));
        pending.bookmarkTexts = new Map(Object.entries(storedBookmarks));
      }

      if (storedHistory.length > 0) {
        pending.history = storedHistory;
      }

      set(pending);

      if (needsChapterLoad) {
        get().loadChapter(needsChapterLoad.bookId, needsChapterLoad.chapter);
      }
    }

    const bgImageSaved = await getSetting(db, 'bgImageSaved');
    if (!bgImageSaved) {
      try {
        const added = await themes!.addBackground({
          source: { type: 'url', url: BACKGROUND_IMAGE_URL },
          name: 'Imagem de fundo personalizada',
        });
        await setSetting(db, 'bgImageSaved', 'true');
      } catch (e) {
        console.error('[bible] Failed to save background image:', e);
      }
    }
  },

  setVersion: async (version) => {
    const { selectedBook, chapter, sqlite } = get();
    const language = sqlite
      ? ((await getVersionLanguage(sqlite, version).catch(() => null)) ??
        staticVersionLanguage(version))
      : staticVersionLanguage(version);
    set({ version, verses: null, versionLanguage: language });
    persistSettingsFromState(get());
    if (selectedBook) {
      get().loadChapter(selectedBook.id, chapter);
    }
  },

  setTestament: (testament) => set({ testament }),
  setTab: (tab) => set({ tab }),

  toggleBookmark: (version, book, chapter, verse, text) => {
    const { json, bookmarks, bookmarkTexts } = get();
    const key = `${version}/${book}/${chapter}:${verse}`;
    const next = new Set(bookmarks);
    const nextTexts = new Map(bookmarkTexts);
    if (next.has(key)) {
      next.delete(key);
      nextTexts.delete(key);
    } else {
      next.add(key);
      if (text) nextTexts.set(key, text);
    }
    set({ bookmarks: next, bookmarkTexts: nextTexts });
    if (json) {
      json.set('bookmarks', Object.fromEntries(nextTexts)).catch(() => {});
    }
  },

  recordHistory: (version, book, chapter, verses, text) => {
    const { sqlite, history } = get();
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      version,
      book,
      chapter,
      verses,
      text,
      timestamp: Date.now(),
    };
    const next = [entry, ...history].slice(0, 100);
    set({ history: next });
    if (sqlite) {
      insertHistory(sqlite, entry).catch(() => {});
    }
  },

  clearHistory: () => {
    const { sqlite } = get();
    set({ history: [] });
    if (sqlite) {
      clearHistory(sqlite).catch(() => {});
    }
  },

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
    const { sqlite, version, fs } = get();
    if (!sqlite) return;

    const key = `${version}/${book}/${chapter}`;
    if (chapterCache.has(key)) {
      const cached = chapterCache.get(key)!;
      set({ verses: cached, versesLoading: false });
      return;
    }

    set({ versesLoading: true });
    try {
      let verses = await getChapterFromDb(sqlite, version, book, chapter);
      if (!verses && fs) {
        const chap = await getChapter(fs, version, book, chapter);
        if (chap) {
          verses = chap.verses.filter((v) => v !== null);
        }
      }
      chapterCache.set(key, verses);
      set({ verses, versesLoading: false });
    } catch {
      if (fs) {
        try {
          const chap = await getChapter(fs, version, book, chapter);
          if (chap) {
            const verses = chap.verses.filter((v) => v !== null);
            chapterCache.set(key, verses);
            set({ verses, versesLoading: false });
            return;
          }
        } catch {}
      }
      chapterCache.set(key, null);
      set({ verses: null, versesLoading: false });
    }
  },

  search: async (query) => {
    const { sqlite, json } = get();
    if (!sqlite || !query.trim()) return [];

    const downloaded = await getDownloadedVersions(json!);

    return searchVerses(sqlite, query, downloaded);
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
    set({ downloadingVersions: [...already, versionId], dlVersion: versionId });

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

      await setVersionLanguage(db, versionId, staticVersionLanguage(versionId)).catch(() => {});
      await rebuildFts(db, versionId).catch(() => {});

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

  syncVersion: async (versionId) => {
    const { fs, net, json, sqlite } = get();
    if (!fs || !net || !json || !sqlite) return;

    const already = get().syncingVersions;
    if (already.includes(versionId)) return;
    set({ syncingVersions: [...already, versionId], dlVersion: versionId });

    try {
      for (const book of BOOKS) {
        const p = `cache/${versionId}/${book.id}.json`;
        try {
          await fs.remove(p);
        } catch {}
      }

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

      await setVersionLanguage(db, versionId, staticVersionLanguage(versionId)).catch(() => {});
      await rebuildFts(db, versionId).catch(() => {});

      const downloaded = await getDownloadedVersions(json);
      if (!downloaded.includes(versionId)) {
        await setDownloadedVersions(json, [...downloaded, versionId]);
      }

      setSyncedVersion(versionId);
    } catch (e) {
      console.error('[bible] sync failed:', versionId, e);
    }

    set((s) => ({
      syncingVersions: s.syncingVersions.filter((v) => v !== versionId),
      dlCurrent: 0,
      dlTotal: 0,
    }));
  },

  removeVersion: async (versionId) => {
    const { fs, json } = get();
    if (!fs || !json) return;

    for (const book of BOOKS) {
      const p = `cache/${versionId}/${book.id}.json`;
      try {
        await fs.remove(p);
      } catch {}
    }

    const downloaded = await getDownloadedVersions(json);
    await setDownloadedVersions(
      json,
      downloaded.filter((v) => v !== versionId)
    );

    const currentTabs = get().displayedTabs;
    if (currentTabs.includes(versionId)) {
      const remaining = downloaded.filter((id) => !currentTabs.includes(id) && id !== versionId);
      const replacement = remaining[0];
      if (replacement) {
        set({ displayedTabs: currentTabs.map((id) => (id === versionId ? replacement : id)) });
      } else {
        set({ displayedTabs: currentTabs.filter((id) => id !== versionId) });
      }
    }

    if (get().version === versionId) {
      set({ version: 'naa', verses: null, selectedBook: null, chapter: 1, selectedVerse: null });
    }
  },

  downloadedVersions: async () => {
    const { json } = get();
    if (!json) return [];
    return getDownloadedVersions(json);
  },

  getSyncedVersionsState: async () => {
    return getSyncedVersions();
  },

  setBackground: async (bg) => {
    const { autoFontColor } = get();
    set({ background: bg });

    if (autoFontColor && bg?.src && bg.type !== 'video') {
      const textColor = await analyzeBackgroundColor(bg.src);
      set({ fontColor: textColor });
    }

    persistSettingsFromState(get());
  },

  setProfileBackground: (bg) => {
    set({ profileBackground: bg });
  },

  pickBackground: () => {
    const { ui } = get();
    if (!ui?.openBackgroundPicker) return;
    ui.openBackgroundPicker((selected) => {
      if (selected) get().setBackground(selected);
    });
  },

  setFontSize: (n) => {
    set({ fontSize: n });
    persistSettingsFromState(get());
  },

  setFontFamily: (f) => {
    set({ fontFamily: f });
    persistSettingsFromState(get());
  },

  setFontWeight: (w) => {
    set({ fontWeight: w });
    persistSettingsFromState(get());
  },

  setFontStyle: (s) => {
    set({ fontStyle: s });
    persistSettingsFromState(get());
  },

  setDisplayedTabs: (tabs) => {
    set({ displayedTabs: tabs });
    persistSettingsFromState(get());
  },

  setUppercase: (v) => {
    set({ uppercase: v });
    persistSettingsFromState(get());
  },

  setShowReferenceOnly: (v) => {
    set({ showReferenceOnly: v });
    persistSettingsFromState(get());
  },

  setShowVersion: (v) => {
    set({ showVersion: v });
    persistSettingsFromState(get());
  },

  setAbbreviatedBooks: (v) => {
    set({ abbreviatedBooks: v });
    persistSettingsFromState(get());
  },

  setFontColor: (c) => {
    set({ fontColor: c });
  },

  setAutoFontColor: async (v) => {
    set({ autoFontColor: v });
    persistSettingsFromState(get());
    if (v) {
      const bg = get().background ?? get().profileBackground;
      if (bg?.src && bg.type !== 'video') {
        const textColor = await analyzeBackgroundColor(bg.src);
        set({ fontColor: textColor });
      }
    }
  },

  setBackgroundOpacity: (n) => {
    set({ backgroundOpacity: n });
  },

  setTextAlign: (a) => {
    set({ textAlign: a });
    persistSettingsFromState(get());
  },

  setLineSpacing: (n) => {
    set({ lineSpacing: n });
    persistSettingsFromState(get());
  },

  setReferencePosition: (p) => {
    set({ referencePosition: p });
    persistSettingsFromState(get());
  },

  setVerseNumberStyle: (s) => {
    set({ verseNumberStyle: s });
    persistSettingsFromState(get());
  },

  saveSettings: () => {
    persistSettingsFromState(get());
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

  setProjectedData: (data) => {
    set({ projectedData: data as BibleState['projectedData'] });
    if (data && data.verses.length > 0) {
      get().recordHistory(data.version, data.book, data.chapter, data.verses, data.text);
    }
  },

  clearProjection: () => {
    const { presentation, projectedData } = get();
    if (!projectedData) return;
    const p = presentation;
    set({ projectedData: null });
    p?.clear();
  },
}));

async function _backgroundEnsureVersions() {
  const { fs, net, json, sqlite } = useBibleStore.getState();
  if (!fs || !net || !json || !sqlite) return;

  const downloadedFromJson = await getDownloadedVersions(json);
  const defaults = getDefaultVersions(navigator.language);
  const populated = await getPopulatedVersions(sqlite);

  const needsSqlite: string[] = [];
  const needsDownload: string[] = [];

  for (const v of defaults) {
    if (populated.includes(v)) continue;
    const hasJson = await hasAnyCache(fs, v);
    if (hasJson) needsSqlite.push(v);
    else needsDownload.push(v);
  }

  if (needsSqlite.length === 0 && needsDownload.length === 0) return;

  const totalChaptersPerVersion = 1189;
  const totalAll = (needsSqlite.length + needsDownload.length) * totalChaptersPerVersion;
  let globalCurrent = 0;

  const allVersions = [...new Set([...needsSqlite, ...needsDownload])];
  useBibleStore.setState({
    downloading: true,
    dlCurrent: 0,
    dlTotal: totalAll,
    dlVersion: allVersions.join(', '),
  });

  const newDownloaded = [...downloadedFromJson];

  let lastUpdate = 0;
  const throttledSet = (progress: { dlCurrent: number; dlTotal: number; dlVersion: string }) => {
    const now = Date.now();
    if (now - lastUpdate < 500 && progress.dlCurrent < progress.dlTotal) return;
    lastUpdate = now;
    useBibleStore.setState(progress);
  };

  await Promise.allSettled(
    allVersions.map(async (v) => {
      const needsDl = needsDownload.includes(v);

      if (needsDl) {
        await downloadVersion(
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
              await insertChapterBatch(sqlite, v, book, chapter, verses);
            } catch (e) {
              console.error('[bible] sqlite insert error:', v, book, chapter, e);
            }
          }
        );
        await rebuildFts(sqlite, v).catch(() => {});
        await setVersionLanguage(sqlite, v, staticVersionLanguage(v)).catch(() => {});
      } else {
        await importVersionFromJson(sqlite, fs, v, staticVersionLanguage(v));
      }

      if (!newDownloaded.includes(v)) {
        newDownloaded.push(v);
      }
      globalCurrent += totalChaptersPerVersion;
    })
  );

  await setDownloadedVersions(json, newDownloaded);

  const current = useBibleStore.getState();
  if (current.displayedTabs.length === 0) {
    const defs = getDefaultVersions(navigator.language);
    const tabs = defs.filter((id) => newDownloaded.includes(id)).slice(0, 3);
    if (tabs.length > 0) {
      useBibleStore.setState({ displayedTabs: tabs, version: tabs[0] });
    }
  }

  useBibleStore.setState({ downloading: false, dlCurrent: 0, dlTotal: 0, dlVersion: '' });

  const state = useBibleStore.getState();
  if (state.selectedBook && !state.verses) {
    state.loadChapter(state.selectedBook.id, state.chapter);
  }
}
