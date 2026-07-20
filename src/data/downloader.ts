import type { FsAPI, NetAPI, SqliteHandle } from '@lumen-media/module-sdk';
import { jsonCachePath } from './store.js';
import type { Book } from './types.js';

const MIDVASH_BASE = 'https://api.midvash.com/v1';
const CONCURRENCY = 20;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 5000];

interface MidvashVerse {
  number: number;
  text: string;
}

interface MidvashChapter {
  book: { name: string };
  chapter: { number: number; verses: MidvashVerse[] };
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchChapter(
  net: NetAPI,
  version: string,
  book: string,
  chapter: number
): Promise<MidvashChapter | null> {
  const url = `${MIDVASH_BASE}/${version}/${book}/${chapter}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await net.request<MidvashChapter>({
        url,
        method: 'GET',
        responseType: 'json',
        timeoutMs: 10000,
      });

      if (response.ok) return response.data;
    } catch {
      // fall through to retry
    }

    if (attempt < MAX_RETRIES - 1) {
      await delay(RETRY_DELAYS[attempt]);
    }
  }

  return null;
}

function encodeText(s: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(s);
  return btoa(String.fromCharCode(...bytes));
}

export async function downloadVersion(
  db: SqliteHandle,
  net: NetAPI,
  fs: FsAPI,
  versionId: string,
  books: Book[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const chapters: { book: string; chapter: number }[] = [];

  for (const book of books) {
    for (let c = 1; c <= book.chapters; c++) {
      chapters.push({ book: book.id, chapter: c });
    }
  }

  const total = chapters.length;
  let completed = 0;

  async function processItem(item: { book: string; chapter: number }): Promise<void> {
    const cacheKey = jsonCachePath(versionId, item.book, item.chapter);

    const exists = await fs.exists(cacheKey).catch(() => false);
    if (exists) {
      await rehydrateChapter(db, fs, versionId, item.book, item.chapter);
      completed++;
      onProgress?.(completed, total);
      return;
    }

    const data = await fetchChapter(net, versionId, item.book, item.chapter);
    if (!data) {
      completed++;
      onProgress?.(completed, total);
      return;
    }

    const jsonStr = JSON.stringify(data);
    const encoded = encodeText(jsonStr);
    const bytes = new Uint8Array(encoded.length);
    for (let i = 0; i < encoded.length; i++) bytes[i] = encoded.charCodeAt(i);

    await fs.write(cacheKey, bytes).catch(() => {});
    await insertChapter(db, versionId, item.book, item.chapter, data);

    completed++;
    onProgress?.(completed, total);
  }

  const queue = [...chapters];
  const workers: Promise<void>[] = [];

  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(
      (async () => {
        while (queue.length > 0) {
          const item = queue.shift()!;
          await processItem(item);
        }
      })()
    );
  }

  await Promise.allSettled(workers);
}

async function insertChapter(
  db: SqliteHandle,
  version: string,
  book: string,
  chapter: number,
  data: MidvashChapter
): Promise<void> {
  const verses = data.chapter.verses;

  for (let i = 0; i < verses.length; i += 100) {
    const batch = verses.slice(i, i + 100);
    const placeholders = batch.map(() => '(?, ?, ?, ?, ?)').join(', ');
    const params: unknown[] = [];

    for (const v of batch) {
      params.push(version, book, chapter, v.number, v.text);
    }

    await db.exec(
      `INSERT OR IGNORE INTO verses (version, book, chapter, verse, text) VALUES ${placeholders}`,
      params
    );
  }
}

async function rehydrateChapter(
  db: SqliteHandle,
  fs: FsAPI,
  version: string,
  book: string,
  chapter: number
): Promise<void> {
  const cacheKey = jsonCachePath(version, book, chapter);

  const exists = await fs.exists(cacheKey).catch(() => false);
  if (!exists) return;

  const count = await db.query<{ c: number }>(
    'SELECT COUNT(*) as c FROM verses WHERE version = ? AND book = ? AND chapter = ?',
    [version, book, chapter]
  );

  if (count[0]?.c > 0) return;

  try {
    const bytes = await fs.read(cacheKey);
    const decoded = new TextDecoder().decode(bytes);
    const data = JSON.parse(decoded) as MidvashChapter;
    await insertChapter(db, version, book, chapter, data);
  } catch {
    // ignore rehydration errors
  }
}

export async function rehydrateFromCache(
  db: SqliteHandle,
  fs: FsAPI,
  versionId: string,
  books: Book[]
): Promise<boolean> {
  const cacheDir = `cache/${versionId}`;
  const cacheExists = await fs.exists(cacheDir).catch(() => false);
  if (!cacheExists) return false;

  const chapters: { book: string; chapter: number }[] = [];
  for (const book of books) {
    for (let c = 1; c <= book.chapters; c++) {
      chapters.push({ book: book.id, chapter: c });
    }
  }

  for (const item of chapters) {
    await rehydrateChapter(db, fs, versionId, item.book, item.chapter);
  }

  return true;
}
