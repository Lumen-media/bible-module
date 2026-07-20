import type { FsAPI } from '@lumen-media/module-sdk';
import MiniSearch from 'minisearch';
import { BOOKS } from './data/store.js';
import type { MidvashChapter, SearchResult } from './data/types.js';

interface Doc {
  id: string;
  version: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

let miniSearch: MiniSearch<Doc> | null = null;
let building = false;
let buildQueue: Array<() => void> = [];

function chapterPath(version: string, book: string, chapter: number): string {
  return `cache/${version}/${book}/${chapter}.json`;
}

export async function ensureIndex(fs: FsAPI, version: string): Promise<MiniSearch<Doc>> {
  if (miniSearch) return miniSearch;

  if (building) {
    return new Promise((resolve) => buildQueue.push(() => resolve(miniSearch!)));
  }

  building = true;
  miniSearch = new MiniSearch<Doc>({
    fields: ['text'],
    storeFields: ['version', 'book', 'chapter', 'verse', 'text'],
    searchOptions: {
      boost: { text: 1 },
      fuzzy: 0.15,
      prefix: true,
    },
  });

  const docs: Doc[] = [];

  for (const book of BOOKS) {
    for (let c = 1; c <= book.chapters; c++) {
      const path = chapterPath(version, book.id, c);
      const exists = await fs.exists(path).catch(() => false);
      if (!exists) continue;

      try {
        const bytes = await fs.read(path);
        const raw = new TextDecoder().decode(bytes);
        const data = JSON.parse(raw) as MidvashChapter;

        for (const v of data.chapter.verses) {
          docs.push({
            id: `${version}-${book.id}-${c}-${v.number}`,
            version,
            book: book.id,
            chapter: c,
            verse: v.number,
            text: v.text,
          });
        }
      } catch {
        // skip corrupt file
      }
    }
  }

  if (docs.length > 0) {
    miniSearch.addAll(docs);
  }

  building = false;
  const queue = buildQueue;
  buildQueue = [];
  for (const fn of queue) fn();

  return miniSearch;
}

export function searchIndex(query: string, version?: string): SearchResult[] {
  if (!miniSearch) return [];

  const results = miniSearch.search(query, {
    fuzzy: 0.15,
    prefix: true,
  });

  const filtered = version
    ? results.filter((r) => (r as unknown as Doc).version === version)
    : results;

  return filtered.slice(0, 50).map((r) => ({
    id: r.id,
    version: (r as unknown as Doc).version,
    book: (r as unknown as Doc).book,
    chapter: (r as unknown as Doc).chapter,
    verse: (r as unknown as Doc).verse,
    text: (r as unknown as Doc).text,
  }));
}

export function clearIndex(): void {
  miniSearch = null;
}
