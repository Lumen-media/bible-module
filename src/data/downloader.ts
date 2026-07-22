import type { FsAPI, NetAPI } from '@lumen-media/module-sdk';
import { BOOKS, apiSlug } from './store.js';
import type { MidvashVerse } from './types.js';

const MIDVASH_BASE = 'https://api.midvash.com/v1';
const R2_BASE = 'https://pub-fdcd1dc78f82411d8901ea46dabc2d17.r2.dev';
const CONCURRENCY = 5;
const MAX_RETRIES = 3;
const MAX_ITEM_RETRIES = 5;
const RETRY_DELAYS = [1000, 3000, 5000];
const PROGRESS_INTERVAL = 15;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface BookData {
  book: string;
  bookName: string;
  chapters: { number: number; verses: MidvashVerse[] }[];
}

function bookPath(version: string, book: string): string {
  return `cache/${version}/${book}.json`;
}

async function fetchChapter(
  net: NetAPI,
  version: string,
  book: string,
  chapter: number
): Promise<MidvashVerse[] | null> {
  const url = `${MIDVASH_BASE}/${version}/${book}/${chapter}`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await net.request<{
        data: { verses: string[] };
      }>({
        url,
        method: 'GET',
        responseType: 'json',
        timeoutMs: 10000,
      });
      if (response.ok) {
        const raw = response.data.data?.verses;
        if (!Array.isArray(raw)) {
          console.error('[bible] fetch unexpected format:', url, JSON.stringify(response.data).slice(0, 500));
          return null;
        }
        return raw.map((text: string, i: number) => ({ number: i + 1, text }));
      } else {
        console.error('[bible] fetch response not ok:', url, response.status, response.statusText);
      }
    } catch (e) {
      console.error('[bible] fetch error:', url, e);
    }

    if (attempt < MAX_RETRIES - 1) {
      await delay(RETRY_DELAYS[attempt]);
    }
  }

  return null;
}

async function fetchBookFromR2(
  net: NetAPI,
  version: string,
  bookId: string,
): Promise<BookData | null> {
  const url = `${R2_BASE}/${version}/${bookId}.json`;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await net.request<BookData>({ url, method: 'GET', responseType: 'json', timeoutMs: 15000 });
      if (res.ok && res.data?.chapters) return res.data;
    } catch {}
    if (attempt < MAX_RETRIES - 1) await delay(RETRY_DELAYS[attempt]);
  }
  return null;
}

interface BookBuffer {
  bookId: string;
  bookName: string;
  chapters: (MidvashVerse[] | null)[];
  chapterCount: number;
}

export async function downloadVersion(
  fs: FsAPI,
  net: NetAPI,
  versionId: string,
  onProgress?: (current: number, total: number) => void,
  onChapter?: (book: string, chapter: number, verses: MidvashVerse[]) => Promise<void>
): Promise<boolean> {
  const chapters: { book: string; slug: string; chapter: number; bookName: string }[] = [];

  for (const book of BOOKS) {
    const exists = await fs.exists(bookPath(versionId, book.id)).catch(() => false);
    if (exists) continue;
    const slug = apiSlug(book.id);

    const r2Book = await fetchBookFromR2(net, versionId, book.id);
    if (r2Book && r2Book.chapters) {
      const jsonStr = JSON.stringify(r2Book, null, 2);
      const bytes = new TextEncoder().encode(jsonStr);
      await fs.write(bookPath(versionId, book.id), bytes).catch(() => {});
      const allVerses: { number: number; text: string; chapter: number }[] = [];
      for (const ch of r2Book.chapters) {
        for (const v of ch.verses) {
          allVerses.push({ number: v.number, text: v.text, chapter: ch.number });
        }
      }
      if (allVerses.length > 0 && onChapter) {
        await onChapter(book.id, 0, allVerses as MidvashVerse[]).catch(() => {});
      }
      continue;
    }

    for (let c = 1; c <= book.chapters; c++) {
      chapters.push({ book: book.id, slug, chapter: c, bookName: book.name });
    }
  }

  const buffers = new Map<string, BookBuffer>();
  const bookMap = new Map(BOOKS.map((b) => [b.id, b]));

  const total = chapters.length;
  let completed = 0;
  let anyFailed = false;
  let lastReported = -PROGRESS_INTERVAL;

  function reportProgress() {
    if (completed - lastReported >= PROGRESS_INTERVAL || completed >= total) {
      lastReported = completed;
      onProgress?.(completed, total);
    }
  }

  async function flushBook(version: string, buf: BookBuffer): Promise<void> {
    const data: BookData = {
      book: buf.bookId,
      bookName: buf.bookName,
      chapters: [],
    };

    for (let i = 0; i < buf.chapters.length; i++) {
      const verses = buf.chapters[i];
      if (verses) {
        data.chapters.push({ number: i + 1, verses });
      }
    }

    const jsonStr = JSON.stringify(data, null, 2);
    const bytes = new TextEncoder().encode(jsonStr);
    await fs.write(bookPath(version, buf.bookId), bytes).catch((e) => console.error('[bible] write book file error:', bookPath(version, buf.bookId), e));
  }

  const attemptCount = new Map<string, number>();

  async function processItem(item: {
    book: string;
    slug: string;
    chapter: number;
    bookName: string;
  }): Promise<void> {
    const key = `${item.book}/${item.chapter}`;
    const attempts = attemptCount.get(key) ?? 0;

    const verses = await fetchChapter(net, versionId, item.slug, item.chapter);
    if (!verses) {
      if (attempts < MAX_ITEM_RETRIES) {
        attemptCount.set(key, attempts + 1);
        await delay(2000);
        queue.push(item);
      } else {
        console.error('[bible] download failed after retries:', versionId, item.book, item.chapter);
        anyFailed = true;
        completed++;
        reportProgress();
      }
      return;
    }

    let buf = buffers.get(item.book);
    if (!buf) {
      const bookDef = bookMap.get(item.book);
      buf = {
        bookId: item.book,
        bookName: item.bookName,
        chapters: new Array(bookDef?.chapters ?? 150).fill(null),
        chapterCount: 0,
      };
      buffers.set(item.book, buf);
    }

    buf.chapters[item.chapter - 1] = verses;
    buf.chapterCount++;

    if (onChapter) {
      await onChapter(item.book, item.chapter, verses);
    }

    const bookDef = bookMap.get(item.book);
    if (buf.chapterCount === (bookDef?.chapters ?? 0)) {
      await flushBook(versionId, buf);
      buffers.delete(item.book);
    }

    completed++;
    reportProgress();
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

  for (const buf of buffers.values()) {
    await flushBook(versionId, buf);
  }

  onProgress?.(completed, total);
  return !anyFailed;
}

export async function hasAnyCache(fs: FsAPI, versionId: string): Promise<boolean> {
  return fs.exists(bookPath(versionId, BOOKS[0].id)).catch(() => false);
}
