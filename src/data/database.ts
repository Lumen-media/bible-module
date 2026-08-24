import type { FsAPI, SqliteHandle } from '@lumen-media/module-sdk';
import { BOOKS, bookPath } from './store.js';
import type { HistoryEntry, MidvashVerse } from './types.js';

const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 8));

const MIGRATIONS = [
  {
    version: 1,
    up: `CREATE TABLE IF NOT EXISTS verses (
      version TEXT NOT NULL,
      book TEXT NOT NULL,
      chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL,
      text TEXT NOT NULL,
      PRIMARY KEY (version, book, chapter, verse)
    );`,
  },
  {
    version: 2,
    up: `CREATE TABLE IF NOT EXISTS download_state (
      version TEXT PRIMARY KEY,
      total_chapters INTEGER NOT NULL,
      completed_chapters INTEGER NOT NULL DEFAULT 0
    );`,
  },
  {
    version: 4,
    up: `CREATE TABLE IF NOT EXISTS chapter_downloads (
      version TEXT NOT NULL,
      book TEXT NOT NULL,
      chapter INTEGER NOT NULL,
      downloaded INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (version, book, chapter)
    );`,
  },
  {
    version: 5,
    up: `CREATE TABLE IF NOT EXISTS versions (
      version TEXT PRIMARY KEY,
      language TEXT NOT NULL
    );`,
  },
  {
    version: 6,
    up: `CREATE TABLE IF NOT EXISTS versions (
      version TEXT PRIMARY KEY,
      language TEXT NOT NULL
    );
    DROP TABLE IF EXISTS book_names;`,
  },
  {
    version: 7,
    up: `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );`,
  },
  {
    version: 8,
    up: `CREATE TABLE IF NOT EXISTS history (
      id TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      book TEXT NOT NULL,
      chapter INTEGER NOT NULL,
      verses TEXT NOT NULL,
      text TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    );`,
  },
];

export async function initDatabase(db: SqliteHandle): Promise<void> {
  await db.migrate(MIGRATIONS);
  try {
    await db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS verses_fts USING fts5(
      version, book, chapter, verse, text,
      tokenize='porter unicode61'
    )`);
  } catch {}
}

export async function isVersionPopulated(db: SqliteHandle, version: string): Promise<boolean> {
  const rows = await db.query<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM verses WHERE version = ? LIMIT 1',
    [version]
  );
  return rows.length > 0 && rows[0].cnt > 0;
}

export async function getPopulatedVersions(db: SqliteHandle): Promise<string[]> {
  try {
    const rows = await db.query<{ version: string }>('SELECT DISTINCT version FROM verses');
    return rows.map((r) => r.version);
  } catch {
    return [];
  }
}

export async function getChapterFromDb(
  db: SqliteHandle,
  version: string,
  book: string,
  chapter: number
): Promise<{ number: number; text: string }[] | null> {
  const rows = await db.query<{ verse: number; text: string }>(
    'SELECT verse, text FROM verses WHERE version = ? AND book = ? AND chapter = ? ORDER BY verse',
    [version, book, chapter]
  );
  if (rows.length === 0) return null;
  return rows.map((r) => ({ number: r.verse, text: r.text }));
}

export async function getVersionLanguage(
  db: SqliteHandle,
  version: string
): Promise<string | null> {
  const rows = await db.query<{ language: string }>(
    'SELECT language FROM versions WHERE version = ?',
    [version]
  );
  return rows.length > 0 ? rows[0].language : null;
}

export async function setVersionLanguage(
  db: SqliteHandle,
  version: string,
  language: string
): Promise<void> {
  await db.exec('INSERT OR REPLACE INTO versions (version, language) VALUES (?, ?)', [
    version,
    language,
  ]);
}

export async function insertChapterBatch(
  db: SqliteHandle,
  version: string,
  book: string,
  _chapter: number,
  verses: (MidvashVerse & { chapter?: number })[]
): Promise<void> {
  if (verses.length === 0) return;

  const BATCH_SIZE = 500;
  for (let start = 0; start < verses.length; start += BATCH_SIZE) {
    const batch = verses.slice(start, start + BATCH_SIZE);
    const placeholders = batch.map(() => '(?, ?, ?, ?, ?)').join(',\n');
    const params: unknown[] = [];
    for (const v of batch) {
      params.push(version, book, v.chapter ?? _chapter, v.number, v.text);
    }

    await db.exec(
      `INSERT OR IGNORE INTO verses (version, book, chapter, verse, text) VALUES\n${placeholders}`,
      params
    );
    await yieldToMain();
  }
}

export async function rebuildFts(db: SqliteHandle, version: string): Promise<void> {
  try {
    await db.exec(`DELETE FROM verses_fts WHERE version = ?`, [version]);
    const books = await db.query<{ book: string }>(
      'SELECT DISTINCT book FROM verses WHERE version = ?',
      [version]
    );
    for (const { book } of books) {
      await db.exec(
        'INSERT INTO verses_fts (version, book, chapter, verse, text) SELECT version, book, chapter, verse, text FROM verses WHERE version = ? AND book = ?',
        [version, book]
      );
      await yieldToMain();
    }
  } catch {}
}

function decodeBytes(bytes: Uint8Array | number[]): string {
  if (bytes instanceof Uint8Array) {
    return new TextDecoder().decode(bytes);
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

export async function importVersionFromJson(
  db: SqliteHandle,
  fs: FsAPI,
  version: string,
  language?: string,
  onProgress?: (current: number, total: number) => void
): Promise<boolean> {
  let completed = 0;
  const total = BOOKS.length;

  for (const book of BOOKS) {
    const path = bookPath(version, book.id);
    const exists = await fs.exists(path).catch(() => false);
    if (!exists) {
      completed++;
      onProgress?.(completed, total);
      continue;
    }

    try {
      const bytes = await fs.read(path);
      const raw = decodeBytes(bytes);
      const data = JSON.parse(raw);

      const chapters: { number: number; verses: MidvashVerse[] }[] = data.chapters ?? [];

      const allVerses: (MidvashVerse & { chapter: number })[] = [];
      for (const ch of chapters) {
        if (ch.verses && Array.isArray(ch.verses)) {
          for (const v of ch.verses) {
            allVerses.push({ number: v.number, text: v.text, chapter: ch.number });
          }
        }
      }

      if (allVerses.length > 0) {
        await insertChapterBatch(db, version, book.id, 0, allVerses);
      }

      if (language) {
        await setVersionLanguage(db, version, language).catch(() => {});
      }

      await yieldToMain();
    } catch {
      // skip corrupt file
    }

    completed++;
    onProgress?.(completed, total);
  }

  await rebuildFts(db, version);

  return true;
}

export async function getSetting(db: SqliteHandle, key: string): Promise<string | null> {
  try {
    const rows = await db.query<{ value: string }>('SELECT value FROM settings WHERE key = ?', [
      key,
    ]);
    return rows.length > 0 ? rows[0].value : null;
  } catch {
    return null;
  }
}

const HISTORY_LIMIT = 100;

export async function getHistory(db: SqliteHandle): Promise<HistoryEntry[]> {
  try {
    const rows = await db.query<{
      id: string;
      version: string;
      book: string;
      chapter: number;
      verses: string;
      text: string;
      timestamp: number;
    }>(
      'SELECT id, version, book, chapter, verses, text, timestamp FROM history ORDER BY timestamp DESC LIMIT ?',
      [HISTORY_LIMIT]
    );
    return rows.map((r) => ({
      id: r.id,
      version: r.version,
      book: r.book,
      chapter: r.chapter,
      verses: JSON.parse(r.verses || '[]'),
      text: r.text,
      timestamp: r.timestamp,
    }));
  } catch {
    return [];
  }
}

export async function insertHistory(db: SqliteHandle, entry: HistoryEntry): Promise<void> {
  try {
    await db.exec(
      'INSERT INTO history (id, version, book, chapter, verses, text, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        entry.id,
        entry.version,
        entry.book,
        entry.chapter,
        JSON.stringify(entry.verses),
        entry.text,
        entry.timestamp,
      ]
    );
    await db.exec(
      'DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY timestamp DESC LIMIT ?)',
      [HISTORY_LIMIT]
    );
  } catch {}
}

export async function clearHistory(db: SqliteHandle): Promise<void> {
  try {
    await db.exec('DELETE FROM history');
  } catch {}
}

export async function setSetting(db: SqliteHandle, key: string, value: string): Promise<void> {
  await db.exec('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
}

export async function searchVerses(
  db: SqliteHandle,
  query: string,
  versions: string[],
  limit = 50
): Promise<{ version: string; book: string; chapter: number; verse: number; text: string }[]> {
  if (!query.trim() || versions.length === 0) return [];

  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => `"${t}"`)
    .join(' AND ');
  if (!terms) return [];

  const placeholders = versions.map(() => '?').join(',');

  try {
    return await db.query<{
      version: string;
      book: string;
      chapter: number;
      verse: number;
      text: string;
    }>(
      `SELECT version, book, chapter, verse, text FROM verses_fts
       WHERE verses_fts MATCH ? AND version IN (${placeholders})
       ORDER BY rank
       LIMIT ?`,
      [terms, ...versions, limit]
    );
  } catch {
    const like = `%${query.trim()}%`;
    const params: (string | number)[] = [];
    const conditions = versions.map((v) => {
      params.push(v);
      return 'version = ?';
    });
    params.push(like, limit);
    return await db.query<{
      version: string;
      book: string;
      chapter: number;
      verse: number;
      text: string;
    }>(
      `SELECT version, book, chapter, verse, text FROM verses
       WHERE (${conditions.join(' OR ')}) AND text LIKE ?
       LIMIT ?`,
      params
    );
  }
}
