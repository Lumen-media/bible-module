import type { FsAPI, NetAPI } from '@lumen-media/module-sdk';
import { BOOKS, versionCacheDir } from './store.js';
import type { MidvashChapter } from './types.js';

const MIDVASH_BASE = 'https://api.midvash.com/v1';
const CONCURRENCY = 20;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 5000];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chapterPath(version: string, book: string, chapter: number): string {
  return `cache/${version}/${book}/${chapter}.json`;
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
      // retry
    }

    if (attempt < MAX_RETRIES - 1) {
      await delay(RETRY_DELAYS[attempt]);
    }
  }

  return null;
}

async function ensureDir(fs: FsAPI, version: string, book: string): Promise<void> {
  const dir = `cache/${version}/${book}`;
  const exists = await fs.exists(dir).catch(() => false);
  if (!exists) {
    try {
      await fs.write(`${dir}/.keep`, new Uint8Array());
    } catch {
      // ignore
    }
  }
}

export async function downloadVersion(
  fs: FsAPI,
  net: NetAPI,
  versionId: string,
  onProgress?: (current: number, total: number) => void
): Promise<boolean> {
  const chapters: { book: string; chapter: number }[] = [];
  for (const book of BOOKS) {
    for (let c = 1; c <= book.chapters; c++) {
      chapters.push({ book: book.id, chapter: c });
    }
  }

  const total = chapters.length;
  let completed = 0;
  let anyFailed = false;

  async function processItem(item: { book: string; chapter: number }): Promise<void> {
    const path = chapterPath(versionId, item.book, item.chapter);
    const exists = await fs.exists(path).catch(() => false);
    if (exists) {
      completed++;
      onProgress?.(completed, total);
      return;
    }

    const data = await fetchChapter(net, versionId, item.book, item.chapter);
    if (!data) {
      anyFailed = true;
      completed++;
      onProgress?.(completed, total);
      return;
    }

    await ensureDir(fs, versionId, item.book);
    const jsonStr = JSON.stringify(data);
    const bytes = new TextEncoder().encode(jsonStr);
    await fs.write(path, bytes).catch(() => {});

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
  return !anyFailed;
}

export async function hasAnyCache(fs: FsAPI, versionId: string): Promise<boolean> {
  const dir = versionCacheDir(versionId);
  return fs.exists(dir).catch(() => false);
}

export function getAllChapterRefs(): { book: string; chapter: number }[] {
  const refs: { book: string; chapter: number }[] = [];
  for (const book of BOOKS) {
    for (let c = 1; c <= book.chapters; c++) {
      refs.push({ book: book.id, chapter: c });
    }
  }
  return refs;
}
