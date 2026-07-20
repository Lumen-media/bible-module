import type { DataAPI, FsAPI, NetAPI, PresentationHostAPI } from '@lumen-media/module-sdk';
import { create } from 'zustand';
import { downloadVersion, hasAnyCache } from './data/downloader.js';
import { getDownloadedVersions, setDownloadedVersions } from './data/store.js';
import type { Book } from './data/types.js';
import type { TFunction } from './i18n.js';
import { clearIndex } from './search.js';

export interface BibleState {
  fs: FsAPI | null;
  net: NetAPI | null;
  json: DataAPI['json'] | null;
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
  init: (services: {
    fs: FsAPI;
    net: NetAPI;
    json: DataAPI['json'];
    presentation: PresentationHostAPI;
    t: TFunction;
  }) => Promise<void>;
  setVersion: (v: string) => Promise<void>;
  setTestament: (t: 'old' | 'new') => void;
  setTab: (t: 'browse' | 'search') => void;
  selectBook: (book: Book) => void;
}

export type BibleStore = BibleState & BibleActions;

const DEFAULT_VERSIONS = ['naa', 'ara', 'nvi'];

export const useBibleStore = create<BibleStore>((set, _get) => ({
  fs: null,
  net: null,
  json: null,
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

  init: async (services) => {
    const { fs, net, json, presentation, t } = services;
    set({ fs, net, json, presentation, t });

    const downloaded = await getDownloadedVersions(json);
    const missing = DEFAULT_VERSIONS.filter((v) => !downloaded.includes(v));

    if (missing.length > 0) {
      for (const v of missing) {
        const cached = await hasAnyCache(fs, v);
        if (cached) {
          downloaded.push(v);
          await setDownloadedVersions(json, downloaded);
        }
      }

      const stillMissing = DEFAULT_VERSIONS.filter((v) => !downloaded.includes(v));

      if (stillMissing.length > 0) {
        set({ downloading: true });
        for (const v of stillMissing) {
          const success = await downloadVersion(fs, net, v, (current, total) => {
            set({ dlCurrent: current, dlTotal: total, dlVersion: v });
          });
          if (success) {
            downloaded.push(v);
            await setDownloadedVersions(json, downloaded);
          }
        }
        set({ downloading: false, dlCurrent: 0, dlTotal: 0, dlVersion: '' });
      }
    }

    set({ ready: true });
  },

  setVersion: async (version) => {
    set({ version });
    clearIndex();
  },

  setTestament: (testament) => set({ testament }),

  setTab: (tab) => set({ tab }),

  selectBook: (book) => set({ selectedBook: book }),
}));
