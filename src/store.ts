import type { FsAPI, NetAPI, PresentationHostAPI, SqliteHandle } from '@lumen-media/module-sdk';
import { create } from 'zustand';
import { downloadVersion, rehydrateFromCache } from './data/downloader.js';
import { getBookList, getDownloadedVersions, initDB, setDownloadedVersions } from './data/store.js';
import type { Book } from './data/types.js';
import type { TFunction } from './i18n.js';

export interface BibleState {
  db: SqliteHandle | null;
  net: NetAPI | null;
  fs: FsAPI | null;
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
}

export interface BibleActions {
  init: (hostData: {
    db: SqliteHandle;
    net: NetAPI;
    fs: FsAPI;
    presentation: PresentationHostAPI;
    t: TFunction;
  }) => Promise<void>;
  setVersion: (v: string) => void;
  setTestament: (t: 'old' | 'new') => void;
  setTab: (t: 'browse' | 'search') => void;
  selectBook: (book: Book) => void;
}

export type BibleStore = BibleState & BibleActions;

const DEFAULT_VERSIONS = ['naa', 'ara', 'nvi'];

export const useBibleStore = create<BibleStore>((set, _get) => ({
  db: null,
  net: null,
  fs: null,
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

  init: async (hostData) => {
    const { db, net, fs, presentation, t } = hostData;
    set({ db, net, fs, presentation, t });

    await initDB(db);
    const books = getBookList();
    const downloaded = await getDownloadedVersions(db);
    const missing = DEFAULT_VERSIONS.filter((v) => !downloaded.includes(v));

    if (missing.length > 0) {
      for (const v of missing) {
        const cached = await rehydrateFromCache(db, fs, v, books);
        if (cached) {
          downloaded.push(v);
          await setDownloadedVersions(db, downloaded);
        }
      }

      const stillMissing = DEFAULT_VERSIONS.filter((v) => !downloaded.includes(v));

      if (stillMissing.length > 0) {
        set({ downloading: true });
        for (const v of stillMissing) {
          await downloadVersion(db, net, fs, v, books, (current, total) => {
            set({ dlCurrent: current, dlTotal: total, dlVersion: v });
          });
          downloaded.push(v);
          await setDownloadedVersions(db, downloaded);
        }
        set({ downloading: false, dlCurrent: 0, dlTotal: 0, dlVersion: '' });
      }
    }

    set({ ready: true });
  },

  setVersion: (version) => set({ version }),
  setTestament: (testament) => set({ testament }),
  setTab: (tab) => set({ tab }),
  selectBook: (book) => set({ selectedBook: book }),
}));
