import type { FsAPI, NetAPI, SqliteHandle } from '@lumen-media/module-sdk';
import { BOOKS, bookPath } from './store.js';
import type { MidvashVerse } from './types.js';

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
];

export async function initDatabase(db: SqliteHandle): Promise<void> {
  await db.migrate(MIGRATIONS);
  try {
    await db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS verses_fts USING fts5(
      version, book, chapter, verse, text,
      tokenize='porter unicode61'
    )`);
  } catch {
    console.warn('[bible] FTS5 not available, search will be slow');
  }
}

export async function isVersionPopulated(db: SqliteHandle, version: string): Promise<boolean> {
  const rows = await db.query<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM verses WHERE version = ? LIMIT 1',
    [version]
  );
  return rows.length > 0 && rows[0].cnt > 0;
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

export async function insertChapterBatch(
  db: SqliteHandle,
  version: string,
  book: string,
  chapter: number,
  verses: MidvashVerse[]
): Promise<void> {
  if (verses.length === 0) return;

  const placeholders = verses.map(() => '(?, ?, ?, ?, ?)').join(',\n');
  const params: unknown[] = [];
  for (const v of verses) {
    params.push(version, book, chapter, v.number, v.text);
  }

  await db.exec(
    `INSERT OR IGNORE INTO verses (version, book, chapter, verse, text) VALUES\n${placeholders}`,
    params
  );
  await db.exec(
    `INSERT INTO verses_fts (version, book, chapter, verse, text) VALUES\n${placeholders}`,
    params
  );
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
      for (const ch of chapters) {
        if (ch.verses && Array.isArray(ch.verses)) {
          await insertChapterBatch(db, version, book.id, ch.number, ch.verses);
        }
      }
    } catch {
      // skip corrupt file
    }

    completed++;
    onProgress?.(completed, total);
  }

  return true;
}

export async function searchVerses(
  db: SqliteHandle,
  query: string,
  version: string,
  limit = 50
): Promise<{ book: string; chapter: number; verse: number; text: string }[]> {
  if (!query.trim()) return [];

  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => `"${t}"`)
    .join(' AND ');
  if (!terms) return [];

  try {
    return await db.query<{
      book: string;
      chapter: number;
      verse: number;
      text: string;
    }>(
      `SELECT book, chapter, verse, text FROM verses_fts
       WHERE verses_fts MATCH ? AND version = ?
       ORDER BY rank
       LIMIT ?`,
      [terms, version, limit]
    );
  } catch {
    const like = `%${query.trim()}%`;
    return await db.query<{
      book: string;
      chapter: number;
      verse: number;
      text: string;
    }>(
      `SELECT book, chapter, verse, text FROM verses
       WHERE version = ? AND text LIKE ?
       LIMIT ?`,
      [version, like, limit]
    );
  }
}
