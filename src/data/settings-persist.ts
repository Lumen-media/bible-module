import type { DataAPI, SqliteHandle } from '@lumen-media/module-sdk';
import { setSetting } from './database.js';

export interface PersistedSettings {
  background: { type: string; src: string; name: string } | null;
  backgroundOpacity: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  fontStyle: string;
  displayedTabs: string[];
  version: string;
  uppercase: boolean;
  showReferenceOnly: boolean;
  showVersion: boolean;
  abbreviatedBooks: boolean;
  fontColor: string;
  autoFontColor?: boolean;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pending: Partial<PersistedSettings> | null = null;
let jsonApi: DataAPI['json'] | null = null;
let sqliteHandle: SqliteHandle | null = null;

function flush() {
  if (!jsonApi || !pending) return;
  const toSave = pending;
  pending = null;
  jsonApi.set('bibleSettings', toSave).catch(() => {});
  if (sqliteHandle) {
    setSetting(sqliteHandle, 'bibleSettings', JSON.stringify(toSave)).catch(() => {});
  }
}

export function persistSettings(
  json: DataAPI['json'],
  sqlite: SqliteHandle | null,
  partial: Partial<PersistedSettings>
) {
  jsonApi = json;
  sqliteHandle = sqlite;
  if (saveTimer) clearTimeout(saveTimer);
  pending = { ...pending, ...partial };
  saveTimer = setTimeout(flush, 500);
}
